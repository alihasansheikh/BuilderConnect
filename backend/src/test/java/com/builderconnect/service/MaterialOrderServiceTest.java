package com.builderconnect.service;

import com.builderconnect.dto.request.DeliveryCreateRequest;
import com.builderconnect.dto.response.MaterialOrderResponse;
import com.builderconnect.entity.Delivery;
import com.builderconnect.entity.Delivery.DeliveryStatus;
import com.builderconnect.entity.Material;
import com.builderconnect.entity.MaterialOrder;
import com.builderconnect.entity.MaterialOrder.OrderStatus;
import com.builderconnect.entity.MaterialOrder.PaymentStatus;
import com.builderconnect.entity.MaterialOrderItem;
import com.builderconnect.entity.User;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.repository.DeliveryRepository;
import com.builderconnect.repository.MaterialOrderItemRepository;
import com.builderconnect.repository.MaterialOrderRepository;
import com.builderconnect.repository.MaterialRepository;
import com.builderconnect.repository.ProjectRepository;
import com.builderconnect.repository.SupplierProfileRepository;
import com.builderconnect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MaterialOrderServiceTest {

    private static final long ORDER_ID = 100L;
    private static final long MATERIAL_ID = 50L;

    @Mock
    private MaterialOrderRepository materialOrderRepository;

    @Mock
    private MaterialOrderItemRepository materialOrderItemRepository;

    @Mock
    private MaterialRepository materialRepository;

    @Mock
    private DeliveryRepository deliveryRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SupplierProfileRepository supplierProfileRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private MaterialOrderService materialOrderService;

    private User supplier;
    private User buyer;
    private User admin;
    private Material material;

    @BeforeEach
    void setUp() {
        supplier = user(1L, "supplier@example.com", UserRole.SUPPLIER);
        buyer = user(2L, "buyer@example.com", UserRole.CLIENT);
        admin = user(3L, "admin@example.com", UserRole.ADMIN);
        material = Material.builder()
                .supplier(supplier)
                .name("Portland Cement")
                .stockQuantity(5)
                .totalOrders(3)
                .build();
        material.setId(MATERIAL_ID);
    }

    @Test
    @DisplayName("CONFIRMED -> READY_FOR_DELIVERY is a legal supplier transition")
    void updateOrderStatus_confirmedToReadyForDelivery_succeeds() {
        MaterialOrder order = order(OrderStatus.CONFIRMED);
        when(materialOrderRepository.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        MaterialOrderResponse response = materialOrderService.updateOrderStatus(
                supplier, ORDER_ID, "READY_FOR_DELIVERY");

        assertThat(response.getStatus()).isEqualTo("READY_FOR_DELIVERY");
        verify(notificationService).notifyOrderStatusChanged(order, "CONFIRMED");
        verify(emailService, never()).sendOrderStatusEmail(any(), anyString(), anyString());
    }

    @Test
    @DisplayName("Supplier cannot cancel OUT_FOR_DELIVERY while a delivery is still in flight")
    void declineOrder_outForDeliveryWithActiveDelivery_rejected() {
        MaterialOrder order = order(OrderStatus.OUT_FOR_DELIVERY);
        when(materialOrderRepository.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));
        when(deliveryRepository.findByOrderIdOrderByCreatedAtDesc(ORDER_ID))
                .thenReturn(List.of(delivery(order, DeliveryStatus.IN_TRANSIT)));

        assertThatThrownBy(() -> materialOrderService.declineOrder(supplier, ORDER_ID, "Cannot deliver"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("every delivery has failed");

        verify(materialOrderRepository, never()).save(any(MaterialOrder.class));
        verify(materialRepository, never()).findByIdInForUpdate(anyList());
    }

    @Test
    @DisplayName("Supplier can cancel OUT_FOR_DELIVERY once every delivery failed/returned; stock is restored")
    void declineOrder_outForDeliveryAllFailed_cancelsAndRestoresStock() {
        MaterialOrder order = order(OrderStatus.OUT_FOR_DELIVERY);
        attachItem(order, 10);
        when(materialOrderRepository.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));
        when(deliveryRepository.findByOrderIdOrderByCreatedAtDesc(ORDER_ID)).thenReturn(List.of(
                delivery(order, DeliveryStatus.FAILED_DELIVERY),
                delivery(order, DeliveryStatus.RETURNED)));
        when(materialRepository.findByIdInForUpdate(List.of(MATERIAL_ID))).thenReturn(List.of(material));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        MaterialOrderResponse response = materialOrderService.declineOrder(supplier, ORDER_ID, "Address unreachable");

        assertThat(response.getStatus()).isEqualTo("CANCELLED");
        assertThat(response.getCancellationReason()).isEqualTo("Address unreachable");
        assertThat(material.getStockQuantity()).isEqualTo(15);
        assertThat(material.getTotalOrders()).isEqualTo(2);
        verify(notificationService).notifyOrderCancelled(order, supplier);
    }

    @Test
    @DisplayName("Admin DELIVERED -> RETURNED restores stock and flips PAID to REFUNDED")
    void updateOrderStatus_deliveredToReturned_restoresStockAndRefunds() {
        MaterialOrder order = order(OrderStatus.DELIVERED);
        order.setPaymentStatus(PaymentStatus.PAID);
        attachItem(order, 10);
        when(materialOrderRepository.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));
        when(materialRepository.findByIdInForUpdate(List.of(MATERIAL_ID))).thenReturn(List.of(material));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        MaterialOrderResponse response = materialOrderService.updateOrderStatus(admin, ORDER_ID, "RETURNED");

        assertThat(response.getStatus()).isEqualTo("RETURNED");
        assertThat(response.getPaymentStatus()).isEqualTo("REFUNDED");
        assertThat(material.getStockQuantity()).isEqualTo(15);
        verify(notificationService).notifyOrderStatusChanged(order, "DELIVERED");
        verify(emailService, never()).sendOrderStatusEmail(any(), anyString(), anyString());
    }

    @Test
    @DisplayName("Manual DELIVERED auto-completes in-flight deliveries and emails the buyer")
    void updateOrderStatus_delivered_completesOpenDeliveries() {
        MaterialOrder order = order(OrderStatus.OUT_FOR_DELIVERY);
        Delivery inFlight = delivery(order, DeliveryStatus.IN_TRANSIT);
        Delivery failed = delivery(order, DeliveryStatus.FAILED_DELIVERY);
        when(materialOrderRepository.findByIdForUpdate(ORDER_ID)).thenReturn(Optional.of(order));
        when(deliveryRepository.findByOrderIdOrderByCreatedAtDesc(ORDER_ID)).thenReturn(List.of(inFlight, failed));
        when(materialOrderRepository.save(any(MaterialOrder.class))).thenAnswer(inv -> inv.getArgument(0));
        when(supplierProfileRepository.findByUserId(supplier.getId())).thenReturn(Optional.empty());

        MaterialOrderResponse response = materialOrderService.updateOrderStatus(supplier, ORDER_ID, "DELIVERED");

        assertThat(response.getStatus()).isEqualTo("DELIVERED");
        assertThat(inFlight.getStatus()).isEqualTo(DeliveryStatus.DELIVERED);
        assertThat(inFlight.getActualDelivery()).isNotNull();
        assertThat(failed.getStatus()).isEqualTo(DeliveryStatus.FAILED_DELIVERY);
        verify(deliveryRepository).saveAll(List.of(inFlight));
        verify(notificationService).notifyOrderDelivered(order);
        verify(emailService).sendOrderStatusEmail(buyer, order.getOrderNumber(), "DELIVERED");
    }

    @Test
    @DisplayName("createDelivery rejects an estimated delivery date in the past")
    void createDelivery_pastEstimatedDelivery_rejected() {
        MaterialOrder order = order(OrderStatus.CONFIRMED);
        when(materialOrderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        DeliveryCreateRequest request = DeliveryCreateRequest.builder()
                .estimatedDelivery(LocalDateTime.now().minusDays(1))
                .build();

        assertThatThrownBy(() -> materialOrderService.createDelivery(supplier, ORDER_ID, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("past");

        verify(deliveryRepository, never()).save(any(Delivery.class));
    }

    private MaterialOrder order(OrderStatus status) {
        MaterialOrder order = MaterialOrder.builder()
                .orderNumber("MO-2026-00042")
                .supplier(supplier)
                .orderedBy(buyer)
                .status(status)
                .totalAmount(new BigDecimal("50000"))
                .build();
        order.setId(ORDER_ID);
        return order;
    }

    private void attachItem(MaterialOrder order, int quantity) {
        MaterialOrderItem item = MaterialOrderItem.builder()
                .order(order)
                .material(material)
                .materialName(material.getName())
                .materialSku("CEM-01")
                .unitOfMeasure("bag")
                .quantity(quantity)
                .unitPrice(new BigDecimal("5000"))
                .build();
        item.calculateTotal();
        order.getItems().add(item);
    }

    private Delivery delivery(MaterialOrder order, DeliveryStatus status) {
        return Delivery.builder()
                .order(order)
                .supplier(supplier)
                .deliveryNumber("DEL-2026-" + status.name())
                .status(status)
                .build();
    }

    private User user(Long id, String email, UserRole role) {
        User user = User.builder()
                .email(email)
                .password("hashed")
                .name(email)
                .role(role)
                .build();
        user.setId(id);
        return user;
    }
}
