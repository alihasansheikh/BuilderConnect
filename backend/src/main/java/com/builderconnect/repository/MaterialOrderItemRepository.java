package com.builderconnect.repository;

import com.builderconnect.entity.MaterialOrder;
import com.builderconnect.entity.MaterialOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface MaterialOrderItemRepository extends JpaRepository<MaterialOrderItem, Long> {

    List<MaterialOrderItem> findByOrderId(Long orderId);

    boolean existsByOrder_OrderedBy_IdAndMaterial_IdAndOrder_StatusIn(
            Long buyerId, Long materialId, Collection<MaterialOrder.OrderStatus> statuses);
}
