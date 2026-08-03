package com.builderconnect.repository;

import com.builderconnect.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    List<Delivery> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    Optional<Delivery> findByDeliveryNumber(String deliveryNumber);
}
