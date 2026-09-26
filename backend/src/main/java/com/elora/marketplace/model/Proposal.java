package com.elora.marketplace.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter
@Entity @Table(name = "service_proposals", uniqueConstraints =
        @UniqueConstraint(name = "uk_project_provider_proposal", columnNames = {"project_id", "provider_id"}))
public class Proposal {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "project_id", nullable = false) private Project project;
    @ManyToOne(optional = false) @JoinColumn(name = "provider_id", nullable = false) private AppUser provider;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(nullable = false) private Integer deadlineDays;
    @Column(nullable = false, length = 1600) private String message;
    @Column(length = 800) private String experience;
    @Column(nullable = false, length = 24) private String status = "ENVIADA";
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}
