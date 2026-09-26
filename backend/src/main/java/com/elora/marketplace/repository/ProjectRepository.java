package com.elora.marketplace.repository;

import com.elora.marketplace.model.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByClientIdOrderByCreatedAtDesc(Long clientId);
    long countByClientId(Long clientId);
    long countByClientIdAndStatus(Long clientId, String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Project p where p.id = :id")
    java.util.Optional<Project> findByIdForUpdate(@Param("id") Long id);

    @Query("select p from Project p where p.status = 'ABERTO' " +
            "and (:q = '' or lower(concat(coalesce(p.title,''),' ',coalesce(p.description,''),' ',coalesce(p.category,''))) like lower(concat('%',:q,'%'))) " +
            "and (:category = '' or lower(p.category) = lower(:category)) " +
            "and (:maxBudget is null or p.budget is null or p.budget <= :maxBudget) " +
            "and (:location = '' or lower(coalesce(p.location,'')) like lower(concat('%',:location,'%'))) " +
            "and (:mode = '' or p.serviceMode = :mode)")
    Page<Project> searchOpen(@Param("q") String q, @Param("category") String category,
            @Param("maxBudget") BigDecimal maxBudget, @Param("location") String location,
            @Param("mode") String mode, Pageable pageable);
}
