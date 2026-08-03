package com.builderconnect.controller;

import com.builderconnect.dto.request.CancelOrderRequest;
import com.builderconnect.dto.request.DeliveryCreateRequest;
import com.builderconnect.dto.request.MaterialOrderCreateRequest;
import com.builderconnect.dto.response.DeliveryResponse;
import com.builderconnect.dto.response.MaterialOrderResponse;
import com.builderconnect.entity.User;
import com.builderconnect.service.MaterialOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for material order and delivery management.
 */
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@Tag(name = "Material Orders", description = "Material order and delivery endpoints")
public class MaterialOrderController {

    private final MaterialOrderService materialOrderService;

    @PostMapping("/material-orders")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a new material order")
    public ResponseEntity<MaterialOrderResponse> createOrder(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody MaterialOrderCreateRequest request) {

        MaterialOrderResponse response = materialOrderService.createOrder(user, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/material-orders/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get the current buyer's material orders")
    public ResponseEntity<Page<MaterialOrderResponse>> getMyOrders(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<MaterialOrderResponse> orders = materialOrderService.getMyOrders(user, status, search, pageable);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/material-orders/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get material order detail")
    public ResponseEntity<MaterialOrderResponse> getOrder(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        MaterialOrderResponse response = materialOrderService.getOrder(user, id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/projects/{projectId}/material-orders")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get material orders for a project")
    public ResponseEntity<Page<MaterialOrderResponse>> getProjectOrders(
            @AuthenticationPrincipal User user,
            @PathVariable Long projectId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<MaterialOrderResponse> orders = materialOrderService.getProjectOrders(user, projectId, pageable);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/supplier/orders")
    @PreAuthorize("hasRole('SUPPLIER')")
    @Operation(summary = "Get supplier's incoming material orders")
    public ResponseEntity<Page<MaterialOrderResponse>> getSupplierOrders(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<MaterialOrderResponse> orders = materialOrderService.getSupplierOrders(
                user, status, paymentStatus, search, dateFrom, dateTo, pageable);
        return ResponseEntity.ok(orders);
    }

    @PostMapping("/material-orders/{id}/confirm")
    @PreAuthorize("hasRole('SUPPLIER')")
    @Operation(summary = "Confirm a material order (supplier)")
    public ResponseEntity<MaterialOrderResponse> confirmOrder(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        MaterialOrderResponse response = materialOrderService.confirmOrder(user, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/material-orders/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cancel a material order (buyer)")
    public ResponseEntity<MaterialOrderResponse> cancelOrder(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody CancelOrderRequest request) {

        MaterialOrderResponse response = materialOrderService.cancelOrder(user, id, request.getReason());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/material-orders/{id}/decline")
    @PreAuthorize("hasRole('SUPPLIER')")
    @Operation(summary = "Decline a material order (supplier)")
    public ResponseEntity<MaterialOrderResponse> declineOrder(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody CancelOrderRequest request) {

        MaterialOrderResponse response = materialOrderService.declineOrder(user, id, request.getReason());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/material-orders/{id}/mark-paid")
    @PreAuthorize("hasRole('SUPPLIER')")
    @Operation(summary = "Mark cash-on-delivery payment received (supplier)")
    public ResponseEntity<MaterialOrderResponse> markPaymentReceived(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        MaterialOrderResponse response = materialOrderService.markPaymentReceived(user, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/material-orders/{id}/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update material order status")
    public ResponseEntity<MaterialOrderResponse> updateOrderStatus(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        MaterialOrderResponse response = materialOrderService.updateOrderStatus(user, id, newStatus);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/material-orders/{id}/deliveries")
    @PreAuthorize("hasRole('SUPPLIER')")
    @Operation(summary = "Create a delivery for a material order (supplier)")
    public ResponseEntity<DeliveryResponse> createDelivery(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody DeliveryCreateRequest request) {

        DeliveryResponse response = materialOrderService.createDelivery(user, id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/deliveries/{id}/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update delivery status")
    public ResponseEntity<DeliveryResponse> updateDeliveryStatus(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        DeliveryResponse response = materialOrderService.updateDeliveryStatus(user, id, newStatus);
        return ResponseEntity.ok(response);
    }
}
