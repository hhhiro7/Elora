package com.elora.marketplace.repository;
import com.elora.marketplace.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByStatus(String status);
    List<Product> findByOwnerId(Long ownerId);
    long countByOwnerId(Long ownerId);
    long countByOwnerIdAndStatus(Long ownerId, String status);
    List<Product> findByOwnerIdAndStatus(Long ownerId, String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    java.util.Optional<Product> findByIdForUpdate(@Param("id") Long id);
    @Query("select p from Product p where p.status = 'ATIVO' " +
           "and (:q = '' or lower(concat(coalesce(p.name,''),' ',coalesce(p.description,''),' ',coalesce(p.category,''),' ',coalesce(p.tags,''))) like lower(concat('%',:q,'%'))) " +
           "and (:category = '' or lower(coalesce(p.category,'')) = lower(:category)) " +
           "and (:condition = '' or p.conditionType = :condition) " +
           "and (:minPrice is null or p.price >= :minPrice) and (:maxPrice is null or p.price <= :maxPrice) " +
           "and (:location = '' or lower(coalesce(p.location,'')) like lower(concat('%',:location,'%'))) " +
           "and (:inStock is null or :inStock = false or p.stock > 0)" )
    Page<Product> searchActive(@Param("q") String q, @Param("category") String category,
            @Param("condition") String condition, @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice, @Param("location") String location,
            @Param("inStock") Boolean inStock, Pageable pageable);
}
