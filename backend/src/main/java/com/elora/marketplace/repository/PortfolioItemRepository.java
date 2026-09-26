package com.elora.marketplace.repository;

import com.elora.marketplace.model.PortfolioItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, Long> {
    List<PortfolioItem> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);
}
