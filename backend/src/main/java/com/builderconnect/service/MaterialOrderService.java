package com.builderconnect.service;

import com.builderconnect.dto.request.DeliveryCreateRequest;
import com.builderconnect.dto.request.MaterialOrderCreateRequest;
import com.builderconnect.dto.response.DeliveryResponse;
import com.builderconnect.dto.response.MaterialOrderResponse;
import com.builderconnect.entity.*;
import com.builderconnect.entity.Delivery.DeliveryMethod;
import com.builderconnect.entity.Delivery.DeliveryStatus;
import com.builderconnect.entity.MaterialOrder.OrderStatus;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service for material order and delivery management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MaterialOrderService {

    /**
     * Legal forward-only delivery status transitions.
     * DELIVERED and RETURNED are terminal; FAILED_DELIVERY can be retried or returned.
     */
    private static final Map<DeliveryStatus, Set<DeliveryStatus>> DELIVERY_TRANSITIONS = Map.of(
            DeliveryStatus.PREPARING, Set.of(DeliveryStatus.DISPATCHED, DeliveryStatus.FAILED_DELIVERY),
            DeliveryStatus.DISPATCHED, Set.of(DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED_DELIVERY),
            DeliveryStatus.IN_TRANSIT, Set.of(DeliveryStatus.OUT_FOR_DELIVERY, DeliveryStatus.FAILED_DELIVERY),
            DeliveryStatus.OUT_FOR_DELIVERY, Set.of(DeliveryStatus.DELIVERED, DeliveryStatus.FAILED_DELIVERY),
            DeliveryStatus.FAILED_DELIVERY, Set.of(DeliveryStatus.DISPATCHED, DeliveryStatus.RETURNED)
    );

    private final MaterialOrderRepository materialOrderRepository;
    private final MaterialOrderItemRepository materialOrderItemRepository;
    private final MaterialRepository materialRepository;
    private final DeliveryRepository deliveryRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final SupplierProfileRepository supplierProfileRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditService auditService;

    /**
     * Create a new material order. Project is optional (standalone COD orders);
     * when present, the caller must be the project's client or awarded builder.
     */
    @Transactional
    public MaterialOrderResponse createOrder(User user, MaterialOrderCreateRequest request) {
        if (user.getRole() != UserRole.CLIENT && user.getRole() != UserRole.BUILDER && !isAdmin(user)) {
            throw new BadRequestException("Only clients and builders can place material orders");
        }

        // Optional project link — verify membership when provided
        Project project = null;
        if (request.getProjectId() != null) {
            project = projectRepository.findByIdAndDeletedFalse(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + request.getProjectId()));

            boolean isProjectClient = project.getClient().getId().equals(user.getId());
            boolean isAwardedBuilder = project.getAwardedBuilder() != null
                    && project.getAwardedBuilder().getId().equals(user.getId());
            if (!isProjectClient && !isAwardedBuilder && !isAdmin(user)) {
                throw new UnauthorizedException("You can only attach orders to your own projects");
            }
        }

        // Validate supplier exists and is a SUPPLIER
        User supplier = userRepository.findByIdAndDeletedFalse(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + request.getSupplierId()));

        if (supplier.getRole() != UserRole.SUPPLIER) {
            throw new BadRequestException("Specified user is not a supplier");
        }

        // Load materials with a pessimistic lock for the stock check + decrement
        List<Long> materialIds = request.getItems().stream()
                .map(MaterialOrderCreateRequest.OrderItemRequest::getMaterialId)
                .distinct()
                .toList();

        List<Material> materials = materialRepository.findByIdInForUpdate(materialIds);
        Map<Long, Material> materialMap = materials.stream()
                .collect(Collectors.toMap(Material::getId, Function.identity()));

        // Validate all materials and reserve stock
        for (MaterialOrderCreateRequest.OrderItemRequest itemReq : request.getItems()) {
            Material mat = materialMap.get(itemReq.getMaterialId());
            if (mat == null) {
                throw new ResourceNotFoundException("Material not found: " + itemReq.getMaterialId());
            }
            if (!mat.getSupplier().getId().equals(supplier.getId())) {
                throw new BadRequestException("Material '" + mat.getName() + "' does not belong to the selected supplier");
            }
            if (!Boolean.TRUE.equals(mat.getIsAvailable())) {
                throw new BadRequestException("Material '" + mat.getName() + "' is not available");
            }
            if (mat.getMinOrderQuantity() != null && itemReq.getQuantity() < mat.getMinOrderQuantity()) {
                throw new BadRequestException("Minimum order quantity for '" + mat.getName() + "' is " + mat.getMinOrderQuantity());
            }
            int available = mat.getStockQuantity() != null ? mat.getStockQuantity() : 0;
            if (itemReq.getQuantity() > available) {
                throw new BadRequestException("Insufficient stock for '" + mat.getName() + "': " + available + " available");
            }
            mat.setStockQuantity(available - itemReq.getQuantity());
            mat.setTotalOrders((mat.getTotalOrders() != null ? mat.getTotalOrders() : 0) + 1);
        }

        MaterialOrder order = MaterialOrder.builder()
                .orderNumber("TMP-" + UUID.randomUUID().toString().substring(0, 13))
                .project(project)
                .supplier(supplier)
                .orderedBy(user)
                .status(OrderStatus.PENDING_CONFIRMATION)
                .deliveryAddress(request.getDeliveryAddress())
                .deliveryCity(request.getDeliveryCity())
                .deliveryContactName(request.getDeliveryContactName())
                .deliveryContactPhone(request.getDeliveryContactPhone())
                .deliveryInstructions(request.getDeliveryInstructions())
                .deliveryDate(request.getDeliveryDate())
                .paymentMethod("CASH_ON_DELIVERY")
                .notes(request.getNotes())
                .build();

        order = materialOrderRepository.save(order);
        order.setOrderNumber(String.format("MO-%d-%05d", Year.now().getValue(), order.getId()));

        // Create line items with product snapshots
        List<MaterialOrderItem> items = new ArrayList<>();
        for (MaterialOrderCreateRequest.OrderItemRequest itemReq : request.getItems()) {
            Material mat = materialMap.get(itemReq.getMaterialId());
            MaterialOrderItem item = MaterialOrderItem.builder()
                    .order(order)
                    .material(mat)
                    .materialName(mat.getName())
                    .materialSku(mat.getSku())
                    .unitOfMeasure(mat.getUnit())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(mat.getUnitPrice())
                    .notes(itemReq.getNotes())
                    .build();
            item.calculateTotal();
            items.add(item);
        }

        materialOrderItemRepository.saveAll(items);
        order.setItems(items);

        // Calculate totals
        order.recalculateTotals();
        order = materialOrderRepository.save(order);

        materialRepository.saveAll(materials);

        notificationService.notifyOrderPlaced(order);
        emailService.sendOrderPlacedEmail(supplier, order.getOrderNumber(), user.getName(),
                String.valueOf(items.size()), String.format("%,.0f", order.getTotalAmount()));

        auditService.logAction(user, "MATERIAL_ORDER_CREATED", "MATERIAL_ORDER", order.getId(),
                "Created material order " + order.getOrderNumber()
                        + (project != null ? " for project " + project.getProjectNumber() : " (standalone)"));

        log.info("Material order {} created by user {} (project: {})",
                order.getOrderNumber(), user.getId(), project != null ? project.getId() : "none");

        return MaterialOrderResponse.fromEntity(order);
    }

    /**
     * Get a single order by ID.
     */
    @Transactional(readOnly = true)
    public MaterialOrderResponse getOrder(User user, Long orderId) {
        MaterialOrder order = materialOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Material order not found: " + orderId));

        validateOrderAccess(user, order);

        return MaterialOrderResponse.fromEntity(order);
    }

    /**
     * Get the current buyer's orders (CLIENT/BUILDER "My Orders").
     * Optional filters: status, search (order number / supplier name).
     */
    @Transactional(readOnly = true)
    public Page<MaterialOrderResponse> getMyOrders(User buyer, String status, String search, Pageable pageable) {
        OrderStatus orderStatus = parseOrderStatus(status);
        String searchTerm = normalizeSearch(search);
        return materialOrderRepository.findByBuyerWithFilter(buyer.getId(), orderStatus, searchTerm, pageable)
                .map(order -> MaterialOrderResponse.fromEntity(order, false));
    }

    /**
     * Get orders for a project. Restricted to the project's client, awarded builder, or admins.
     */
    @Transactional(readOnly = true)
    public Page<MaterialOrderResponse> getProjectOrders(User user, Long projectId, Pageable pageable) {
        Project project = projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));

        boolean isProjectClient = project.getClient().getId().equals(user.getId());
        boolean isAwardedBuilder = project.getAwardedBuilder() != null
                && project.getAwardedBuilder().getId().equals(user.getId());
        if (!isProjectClient && !isAwardedBuilder && !isAdmin(user)) {
            throw new UnauthorizedException("You do not have permission to view this project's orders");
        }

        return materialOrderRepository.findByProjectIdOrderByCreatedAtDesc(projectId, pageable)
                .map(order -> MaterialOrderResponse.fromEntity(order, false));
    }

    /**
     * Get orders for the supplier (supplier's incoming orders).
     * Optional filters: status, paymentStatus, search (order number / buyer name),
     * dateFrom/dateTo (ISO yyyy-MM-dd).
     */
    @Transactional(readOnly = true)
    public Page<MaterialOrderResponse> getSupplierOrders(User supplier, String status, String paymentStatus,
                                                         String search, String dateFrom, String dateTo,
                                                         Pageable pageable) {
        OrderStatus orderStatus = parseOrderStatus(status);
        MaterialOrder.PaymentStatus orderPaymentStatus = parsePaymentStatus(paymentStatus);
        String searchTerm = normalizeSearch(search);
        LocalDateTime from = parseFilterDate(dateFrom, false);
        LocalDateTime to = parseFilterDate(dateTo, true);
        return materialOrderRepository.findBySupplierWithFilter(
                        supplier.getId(), orderStatus, orderPaymentStatus, searchTerm, from, to, pageable)
                .map(order -> MaterialOrderResponse.fromEntity(order, false));
    }

    /**
     * Confirm an order (supplier action).
     */
    @Transactional
    public MaterialOrderResponse confirmOrder(User supplier, Long orderId) {
        MaterialOrder order = materialOrderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Material order not found: " + orderId));

        if (!order.getSupplier().getId().equals(supplier.getId())) {
            throw new UnauthorizedException("You can only confirm your own orders");
        }

        if (order.getStatus() != OrderStatus.PENDING_CONFIRMATION) {
            throw new BadRequestException("Order can only be confirmed when in PENDING_CONFIRMATION status. Current status: " + order.getStatus());
        }

        order.confirm();
        order = materialOrderRepository.save(order);

        notificationService.notifyOrderConfirmed(order);
        emailService.sendOrderStatusEmail(order.getOrderedBy(), order.getOrderNumber(), OrderStatus.CONFIRMED.name());

        auditService.logAction(supplier, "MATERIAL_ORDER_CONFIRMED", "MATERIAL_ORDER", order.getId(),
                "Confirmed material order " + order.getOrderNumber());

        log.info("Material order {} confirmed by supplier {}", order.getOrderNumber(), supplier.getId());

        return MaterialOrderResponse.fromEntity(order);
    }

    /**
     * Cancel an order (buyer action; also allowed for admins).
     * Only DRAFT/PENDING_CONFIRMATION orders can be cancelled; stock is restored.
     */
    @Transactional
    public MaterialOrderResponse cancelOrder(User user, Long orderId, String reason) {
        MaterialOrder order = materialOrderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Material order not found: " + orderId));

        if (!order.getOrderedBy().getId().equals(user.getId()) && !isAdmin(user)) {
            throw new UnauthorizedException("You can only cancel your own orders");
        }

        if (!order.isCancellable()) {
            throw new IllegalStateException("Order can no longer be cancelled. Current status: " + order.getStatus()
                    + ". Contact the supplier to decline it.");
        }

        restoreStock(order);
        order.cancel(user.getId(), reason);
        order = materialOrderRepository.save(order);

        notificationService.notifyOrderCancelled(order, user);

        auditService.logAction(user, "MATERIAL_ORDER_CANCELLED", "MATERIAL_ORDER", order.getId(),
                "Cancelled material order " + order.getOrderNumber() + ": " + reason);

        log.info("Material order {} cancelled by user {}", order.getOrderNumber(), user.getId());

        return MaterialOrderResponse.fromEntity(order);
    }

    /**
     * Decline an order (supplier action). Allowed before it goes out for delivery,
     * or afterwards only when every delivery has failed or been returned
     * (the failed-delivery escape hatch); stock is restored.
     */
    @Transactional
    public MaterialOrderResponse declineOrder(User supplier, Long orderId, String reason) {
        MaterialOrder order = materialOrderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Material order not found: " + orderId));

        if (!order.getSupplier().getId().equals(supplier.getId()) && !isAdmin(supplier)) {
            throw new UnauthorizedException("You can only decline your own orders");
        }

        if (order.getStatus() == OrderStatus.OUT_FOR_DELIVERY ||
            order.getStatus() == OrderStatus.PARTIALLY_DELIVERED) {
            if (!allDeliveriesFailedOrReturned(order)) {
                throw new IllegalStateException(
                        "Order can only be cancelled once every delivery has failed or been returned");
            }
        } else if (order.getStatus() != OrderStatus.PENDING_CONFIRMATION &&
            order.getStatus() != OrderStatus.CONFIRMED &&
            order.getStatus() != OrderStatus.PROCESSING &&
            order.getStatus() != OrderStatus.READY_FOR_DELIVERY) {
            throw new IllegalStateException("Order can no longer be declined. Current status: " + order.getStatus());
        }

        restoreStock(order);
        order.cancel(supplier.getId(), reason);
        order.setSupplierNotes(reason);
        order = materialOrderRepository.save(order);

        notificationService.notifyOrderCancelled(order, supplier);

        auditService.logAction(supplier, "MATERIAL_ORDER_DECLINED", "MATERIAL_ORDER", order.getId(),
                "Declined material order " + order.getOrderNumber() + ": " + reason);

        log.info("Material order {} declined by supplier {}", order.getOrderNumber(), supplier.getId());

        return MaterialOrderResponse.fromEntity(order);
    }

    /**
     * Mark cash-on-delivery payment as received (supplier action, after delivery).
     */
    @Transactional
    public MaterialOrderResponse markPaymentReceived(User supplier, Long orderId) {
        MaterialOrder order = materialOrderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Material order not found: " + orderId));

        if (!order.getSupplier().getId().equals(supplier.getId()) && !isAdmin(supplier)) {
            throw new UnauthorizedException("You can only mark payment on your own orders");
        }

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new IllegalStateException("Payment can only be marked received after delivery. Current status: " + order.getStatus());
        }

        if (order.getPaymentStatus() != MaterialOrder.PaymentStatus.PENDING) {
            throw new IllegalStateException("Payment is already " + order.getPaymentStatus());
        }

        order.setPaymentStatus(MaterialOrder.PaymentStatus.PAID);
        order.setPaidAt(LocalDateTime.now());
        order = materialOrderRepository.save(order);

        notificationService.notifyOrderPaymentReceived(order);

        auditService.logAction(supplier, "MATERIAL_ORDER_PAYMENT_RECEIVED", "MATERIAL_ORDER", order.getId(),
                "Marked payment received for order " + order.getOrderNumber());

        log.info("Payment marked received for material order {} by supplier {}", order.getOrderNumber(), supplier.getId());

        return MaterialOrderResponse.fromEntity(order);
    }

    /**
     * Update order status (supplier/admin only; validated against the legal transition map).
     */
    @Transactional
    public MaterialOrderResponse updateOrderStatus(User user, Long orderId, String newStatus) {
        MaterialOrder order = materialOrderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Material order not found: " + orderId));

        if (!order.getSupplier().getId().equals(user.getId()) && !isAdmin(user)) {
            throw new UnauthorizedException("Only the supplier or an admin can update the order status");
        }

        OrderStatus status;
        try {
            status = OrderStatus.valueOf(newStatus);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid order status: " + newStatus);
        }

        if (status == OrderStatus.CANCELLED) {
            if (!isAdmin(user)) {
                throw new BadRequestException("Suppliers must use the decline endpoint to cancel an order");
            }
            // Admin cancellation routes through the shared cancel logic (stock restore + reason)
            if (!order.canTransitionTo(OrderStatus.CANCELLED)) {
                throw new IllegalStateException("Cannot cancel order in status " + order.getStatus());
            }
            restoreStock(order);
            order.cancel(user.getId(), "Cancelled by admin");
            order = materialOrderRepository.save(order);

            notificationService.notifyOrderCancelled(order, user);

            auditService.logAction(user, "MATERIAL_ORDER_CANCELLED", "MATERIAL_ORDER", order.getId(),
                    "Cancelled material order " + order.getOrderNumber() + " (admin)");

            return MaterialOrderResponse.fromEntity(order);
        }

        if (status == OrderStatus.RETURNED && !isAdmin(user)) {
            throw new BadRequestException("Only an admin can mark an order as returned");
        }

        if (!order.canTransitionTo(status)) {
            throw new IllegalStateException("Cannot change order status from " + order.getStatus() + " to " + status);
        }

        if (status == OrderStatus.RETURNED) {
            // A returned order puts the goods back in stock; a paid one is refunded.
            restoreStock(order);
            if (order.getPaymentStatus() == MaterialOrder.PaymentStatus.PAID) {
                order.setPaymentStatus(MaterialOrder.PaymentStatus.REFUNDED);
            }
        }

        String oldStatus = order.getStatus().name();
        order.setStatus(status);
        order = materialOrderRepository.save(order);

        if (status == OrderStatus.DELIVERED) {
            completeOpenDeliveries(order);
            supplierProfileRepository.findByUserId(order.getSupplier().getId())
                    .ifPresent(SupplierProfile::incrementOrdersCompleted);
            notificationService.notifyOrderDelivered(order);
            emailService.sendOrderStatusEmail(order.getOrderedBy(), order.getOrderNumber(), status.name());
        } else {
            notificationService.notifyOrderStatusChanged(order, oldStatus);
            if (status == OrderStatus.CONFIRMED) {
                emailService.sendOrderStatusEmail(order.getOrderedBy(), order.getOrderNumber(), status.name());
            }
        }

        auditService.logAction(user, "MATERIAL_ORDER_STATUS_UPDATED", "MATERIAL_ORDER", order.getId(),
                "Updated order " + order.getOrderNumber() + " status from " + oldStatus + " to " + newStatus);

        log.info("Material order {} status updated from {} to {} by user {}",
                order.getOrderNumber(), oldStatus, newStatus, user.getId());

        return MaterialOrderResponse.fromEntity(order);
    }

    /**
     * Create a delivery for an order (supplier action).
     */
    @Transactional
    public DeliveryResponse createDelivery(User supplier, Long orderId, DeliveryCreateRequest request) {
        MaterialOrder order = materialOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Material order not found: " + orderId));

        if (!order.getSupplier().getId().equals(supplier.getId())) {
            throw new UnauthorizedException("You can only create deliveries for your own orders");
        }

        if (order.getStatus() != OrderStatus.CONFIRMED &&
            order.getStatus() != OrderStatus.PROCESSING &&
            order.getStatus() != OrderStatus.READY_FOR_DELIVERY) {
            throw new BadRequestException("Deliveries can only be created for confirmed/processing/ready orders. Current status: " + order.getStatus());
        }

        if (request.getEstimatedDelivery() != null && request.getEstimatedDelivery().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Estimated delivery date cannot be in the past");
        }

        DeliveryMethod method = DeliveryMethod.SUPPLIER_DELIVERY;
        if (request.getDeliveryMethod() != null) {
            try {
                method = DeliveryMethod.valueOf(request.getDeliveryMethod());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid delivery method: " + request.getDeliveryMethod());
            }
        }

        Delivery delivery = Delivery.builder()
                .order(order)
                .supplier(order.getSupplier())
                .deliveryNumber("TMP-" + UUID.randomUUID().toString().substring(0, 13))
                .deliveryMethod(method)
                .trackingNumber(request.getTrackingNumber())
                .driverName(request.getDriverName())
                .driverPhone(request.getDriverPhone())
                .estimatedDelivery(request.getEstimatedDelivery())
                .notes(request.getNotes())
                .build();

        delivery = deliveryRepository.save(delivery);
        delivery.setDeliveryNumber(String.format("DEL-%d-%05d", Year.now().getValue(), delivery.getId()));

        // Move the order out for delivery (legal from CONFIRMED/PROCESSING/READY_FOR_DELIVERY)
        String oldStatus = order.getStatus().name();
        order.setStatus(OrderStatus.OUT_FOR_DELIVERY);
        materialOrderRepository.save(order);

        notificationService.notifyOrderStatusChanged(order, oldStatus);

        auditService.logAction(supplier, "DELIVERY_CREATED", "DELIVERY", delivery.getId(),
                "Created delivery " + delivery.getDeliveryNumber() + " for order " + order.getOrderNumber());

        log.info("Delivery {} created for order {} by supplier {}",
                delivery.getDeliveryNumber(), order.getOrderNumber(), supplier.getId());

        return DeliveryResponse.fromEntity(delivery);
    }

    /**
     * Update delivery status (forward-only transitions).
     */
    @Transactional
    public DeliveryResponse updateDeliveryStatus(User user, Long deliveryId, String newStatus) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery not found: " + deliveryId));

        // Only the order's supplier or admin can update delivery status
        MaterialOrder order = delivery.getOrder();
        if (!order.getSupplier().getId().equals(user.getId()) && !isAdmin(user)) {
            throw new UnauthorizedException("You do not have permission to update this delivery");
        }

        DeliveryStatus status;
        try {
            status = DeliveryStatus.valueOf(newStatus);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid delivery status: " + newStatus);
        }

        if (!DELIVERY_TRANSITIONS.getOrDefault(delivery.getStatus(), Set.of()).contains(status)) {
            throw new IllegalStateException("Cannot change delivery status from " + delivery.getStatus() + " to " + status);
        }

        String oldStatus = delivery.getStatus().name();
        delivery.setStatus(status);

        if (status == DeliveryStatus.DELIVERED) {
            delivery.markDelivered();
        }

        delivery = deliveryRepository.save(delivery);

        // If delivered, check whether the order should be marked DELIVERED
        if (status == DeliveryStatus.DELIVERED) {
            List<Delivery> allDeliveries = deliveryRepository.findByOrderIdOrderByCreatedAtDesc(order.getId());
            boolean allDelivered = allDeliveries.stream()
                    .allMatch(d -> d.getStatus() == DeliveryStatus.DELIVERED);
            if (allDelivered && order.getStatus() != OrderStatus.DELIVERED) {
                order.setStatus(OrderStatus.DELIVERED);
                materialOrderRepository.save(order);
                supplierProfileRepository.findByUserId(order.getSupplier().getId())
                        .ifPresent(SupplierProfile::incrementOrdersCompleted);
                notificationService.notifyOrderDelivered(order);
                emailService.sendOrderStatusEmail(order.getOrderedBy(), order.getOrderNumber(),
                        OrderStatus.DELIVERED.name());
            }
        }

        auditService.logAction(user, "DELIVERY_STATUS_UPDATED", "DELIVERY", delivery.getId(),
                "Updated delivery " + delivery.getDeliveryNumber() + " status from " + oldStatus + " to " + newStatus);

        log.info("Delivery {} status updated from {} to {} by user {}",
                delivery.getDeliveryNumber(), oldStatus, newStatus, user.getId());

        return DeliveryResponse.fromEntity(delivery);
    }

    // --- Stock helpers ---

    /**
     * Restores stock for every item of a cancelled/declined order and rolls back
     * the per-material order counter. Materials are locked in ascending id order.
     */
    private void restoreStock(MaterialOrder order) {
        List<Long> materialIds = order.getItems().stream()
                .map(item -> item.getMaterial().getId())
                .distinct()
                .toList();
        if (materialIds.isEmpty()) {
            return;
        }

        Map<Long, Material> materialMap = materialRepository.findByIdInForUpdate(materialIds).stream()
                .collect(Collectors.toMap(Material::getId, Function.identity()));

        for (MaterialOrderItem item : order.getItems()) {
            Material mat = materialMap.get(item.getMaterial().getId());
            if (mat == null) {
                continue;
            }
            mat.setStockQuantity((mat.getStockQuantity() != null ? mat.getStockQuantity() : 0) + item.getQuantity());
            if (mat.getTotalOrders() != null && mat.getTotalOrders() > 0) {
                mat.setTotalOrders(mat.getTotalOrders() - 1);
            }
        }

        materialRepository.saveAll(materialMap.values());
    }

    // --- Delivery helpers ---

    /** True when the order has no delivery still in flight (empty counts as true). */
    private boolean allDeliveriesFailedOrReturned(MaterialOrder order) {
        return deliveryRepository.findByOrderIdOrderByCreatedAtDesc(order.getId()).stream()
                .allMatch(d -> d.getStatus() == DeliveryStatus.FAILED_DELIVERY
                        || d.getStatus() == DeliveryStatus.RETURNED);
    }

    /**
     * A manual order-level DELIVERED closes out any delivery rows still in flight,
     * keeping order and delivery statuses consistent. Failed/returned rows are left as-is.
     */
    private void completeOpenDeliveries(MaterialOrder order) {
        List<Delivery> openDeliveries = deliveryRepository.findByOrderIdOrderByCreatedAtDesc(order.getId()).stream()
                .filter(d -> d.getStatus() != DeliveryStatus.DELIVERED
                        && d.getStatus() != DeliveryStatus.FAILED_DELIVERY
                        && d.getStatus() != DeliveryStatus.RETURNED)
                .toList();
        if (openDeliveries.isEmpty()) {
            return;
        }
        openDeliveries.forEach(Delivery::markDelivered);
        deliveryRepository.saveAll(openDeliveries);
    }

    // --- Access helpers ---

    /** Parses an ISO yyyy-MM-dd filter date to the start or end of that day. */
    private LocalDateTime parseFilterDate(String value, boolean endOfDay) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            LocalDate date = LocalDate.parse(value);
            return endOfDay ? date.atTime(23, 59, 59) : date.atStartOfDay();
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Invalid date format (expected yyyy-MM-dd): " + value);
        }
    }

    private OrderStatus parseOrderStatus(String status) {
        if (status == null || status.isEmpty()) {
            return null;
        }
        try {
            return OrderStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid order status: " + status);
        }
    }

    private MaterialOrder.PaymentStatus parsePaymentStatus(String paymentStatus) {
        if (paymentStatus == null || paymentStatus.isEmpty()) {
            return null;
        }
        try {
            return MaterialOrder.PaymentStatus.valueOf(paymentStatus);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid payment status: " + paymentStatus);
        }
    }

    private String normalizeSearch(String search) {
        return (search == null || search.isBlank()) ? null : search.trim();
    }

    private void validateOrderAccess(User user, MaterialOrder order) {
        boolean isOrderOwner = order.getOrderedBy().getId().equals(user.getId());
        boolean isSupplier = order.getSupplier().getId().equals(user.getId());
        boolean isProjectClient = order.getProject() != null
                && order.getProject().getClient().getId().equals(user.getId());

        if (!isOrderOwner && !isSupplier && !isProjectClient && !isAdmin(user)) {
            throw new UnauthorizedException("You do not have permission to access this order");
        }
    }

    private boolean isAdmin(User user) {
        return user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN;
    }
}
