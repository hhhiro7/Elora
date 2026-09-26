package com.elora.marketplace.repository;
import com.elora.marketplace.model.AppOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<AppOrder, Long> {
    List<AppOrder> findByBuyerId(Long buyerId);
    @Query("select distinct o from AppOrder o join o.items i where i.product.owner.id = :sellerId order by o.createdAt desc")
    List<AppOrder> findSalesBySeller(@Param("sellerId") Long sellerId);
}
