package com.elora.marketplace.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter
@Entity @Table(name = "marketplace_notifications", indexes = @Index(name = "idx_notification_user_created", columnList = "user_id,created_at"))
public class MarketplaceNotification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id", nullable = false) private AppUser user;
    @Column(nullable = false, length = 80) private String type;
    @Column(nullable = false, length = 160) private String title;
    @Column(nullable = false, length = 500) private String message;
    @Column(length = 320) private String link;
    private LocalDateTime readAt;
    @Column(nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
}
