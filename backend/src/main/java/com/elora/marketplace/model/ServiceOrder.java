package com.elora.marketplace.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter
@Entity @Table(name = "service_orders")
public class ServiceOrder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "client_id", nullable = false) private AppUser client;
    @ManyToOne(optional = false) @JoinColumn(name = "provider_id", nullable = false) private AppUser provider;
    @ManyToOne(optional = false) @JoinColumn(name = "service_id", nullable = false) private ServiceOffer service;
    @Column(nullable = false, length = 2000) private String requestDescription;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal agreedPrice;
    @Column(nullable = false, length = 24) private String status = "SOLICITADO";
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}
