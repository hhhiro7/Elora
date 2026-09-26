package com.elora.marketplace.repository;

import com.elora.marketplace.model.MarketplaceNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.time.LocalDateTime;

public interface MarketplaceNotificationRepository extends JpaRepository<MarketplaceNotification, Long> {
    List<MarketplaceNotification> findTop100ByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndReadAtIsNull(Long userId);
    @Modifying @Query("update MarketplaceNotification n set n.readAt = :now where n.user.id = :userId and n.readAt is null")
    int markAllRead(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
