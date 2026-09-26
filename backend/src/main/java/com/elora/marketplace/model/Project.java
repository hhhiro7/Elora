package com.elora.marketplace.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter
@Entity @Table(name = "service_projects")
public class Project {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "client_id", nullable = false) private AppUser client;
    @Column(nullable = false, length = 160) private String title;
    @Column(nullable = false, length = 3000) private String description;
    @Column(nullable = false, length = 80) private String category;
    @Column(precision = 12, scale = 2) private BigDecimal budget;
    private Integer deadlineDays;
    @Column(length = 120) private String location;
    @Column(nullable = false, length = 16) private String serviceMode = "ONLINE";
    @Column(nullable = false, length = 24) private String status = "ABERTO";
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
    @Transient private Long proposalCount;
}
