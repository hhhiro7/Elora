package com.elora.marketplace.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter
@Entity @Table(name = "portfolio_items", indexes = @Index(name = "idx_portfolio_owner_created", columnList = "owner_id,created_at"))
public class PortfolioItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "owner_id", nullable = false) private AppUser owner;
    @Column(nullable = false, length = 140) private String title;
    @Column(nullable = false, length = 1200) private String description;
    @Column(nullable = false, length = 80) private String category;
    @Column(length = 500) private String technologies;
    @Column(length = 500) private String imageUrl;
    @Column(length = 500) private String projectUrl;
    @Column(nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column(nullable = false) private LocalDateTime updatedAt = LocalDateTime.now();
}
