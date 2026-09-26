package com.elora.marketplace.repository;

import com.elora.marketplace.model.ProductNegotiation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;

public interface ProductNegotiationRepository extends JpaRepository<ProductNegotiation, Long> {
    boolean existsByProductIdAndBuyerIdAndStatusIn(Long productId, Long buyerId, Collection<String> statuses);
    List<ProductNegotiation> findByBuyerIdOrSellerIdOrderByUpdatedAtDesc(Long buyerId, Long sellerId);
}
