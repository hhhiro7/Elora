package com.elora.marketplace.repository;

import com.elora.marketplace.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    boolean existsByProductId(Long productId);
    @Query("select count(i) from OrderItem i where i.product.owner.id = :ownerId and i.order.status = 'CONCLUIDO'")
    long countCompletedSalesByOwner(@Param("ownerId") Long ownerId);
    @Query("select coalesce(sum(i.subtotal), 0) from OrderItem i where i.product.owner.id = :ownerId and i.order.status = 'CONCLUIDO'")
    java.math.BigDecimal completedRevenueByOwner(@Param("ownerId") Long ownerId);
}
