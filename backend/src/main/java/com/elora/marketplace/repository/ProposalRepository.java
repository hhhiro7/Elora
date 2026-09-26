package com.elora.marketplace.repository;

import com.elora.marketplace.model.Proposal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProposalRepository extends JpaRepository<Proposal, Long> {
    boolean existsByProjectIdAndProviderId(Long projectId, Long providerId);
    List<Proposal> findByProviderIdOrderByCreatedAtDesc(Long providerId);
    List<Proposal> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    long countByProviderId(Long providerId);
    long countByProjectClientId(Long clientId);
    long countByProjectClientIdAndStatus(Long clientId, String status);
    long countByProjectId(Long projectId);
}
