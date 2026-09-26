package com.elora.marketplace.repository;

import com.elora.marketplace.model.ServiceOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceOrderRepository extends JpaRepository<ServiceOrder, Long> {
    List<ServiceOrder> findByClientIdOrProviderIdOrderByCreatedAtDesc(Long clientId, Long providerId);
    long countByServiceIdAndStatus(Long serviceId, String status);
    long countByProviderIdAndStatus(Long providerId, String status);
    long countByProviderId(Long providerId);
    @org.springframework.data.jpa.repository.Query("select o.provider.id, count(o) from ServiceOrder o where o.provider.id in :providerIds and o.status = 'CONCLUIDO' group by o.provider.id")
    List<Object[]> completedByProviderIds(@org.springframework.data.repository.query.Param("providerIds") List<Long> providerIds);
}
