package com.elora.marketplace.repository;
import com.elora.marketplace.model.ServiceOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ServiceRepository extends JpaRepository<ServiceOffer, Long> {
    List<ServiceOffer> findByStatus(String status);
    List<ServiceOffer> findByOwnerId(Long ownerId);
    long countByOwnerId(Long ownerId);
    long countByOwnerIdAndStatus(Long ownerId, String status);
    List<ServiceOffer> findByOwnerIdAndStatus(Long ownerId, String status);
    @Query("select s from ServiceOffer s where s.status = 'ATIVO' " +
           "and (:q = '' or lower(concat(coalesce(s.title,''),' ',coalesce(s.description,''),' ',coalesce(s.category,''),' ',coalesce(s.tags,''))) like lower(concat('%',:q,'%'))) " +
           "and (:category = '' or lower(coalesce(s.category,'')) = lower(:category)) " +
           "and (:minPrice is null or s.price >= :minPrice) and (:maxPrice is null or s.price <= :maxPrice) " +
           "and (:location = '' or lower(coalesce(s.location,'')) like lower(concat('%',:location,'%')))" )
    Page<ServiceOffer> searchActive(@Param("q") String q, @Param("category") String category,
            @Param("minPrice") BigDecimal minPrice, @Param("maxPrice") BigDecimal maxPrice,
            @Param("location") String location, Pageable pageable);
}
