package com.elora.marketplace.repository;

import com.elora.marketplace.model.ServiceOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceOrderRepository extends JpaRepository<ServiceOrder, Long> {
    List<ServiceOrder> findByClientIdOrProviderIdOrderByCreatedAtDesc(Long clientId, Long providerId);
}
