package com.elora.marketplace.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Getter @Setter
@Entity @Table(name = "service_packages", uniqueConstraints =
        @UniqueConstraint(name = "uk_service_package_tier", columnNames = {"service_id", "tier"}))
public class ServicePackage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @JsonIgnore @ManyToOne(optional = false) @JoinColumn(name = "service_id", nullable = false) private ServiceOffer service;
    @Column(nullable = false, length = 16) private String tier;
    @Column(nullable = false, length = 80) private String name;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal price;
    @Column(nullable = false) private Integer deliveryDays;
    @Column(nullable = false) private Integer revisions = 0;
    @Column(length = 600) private String description;
    @Column(length = 1200) private String deliverables;
    @Column(nullable = false) private Integer sortOrder = 0;
}
