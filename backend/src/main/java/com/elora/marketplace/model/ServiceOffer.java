package com.elora.marketplace.model;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

// Chamado ServiceOffer (e não "Service") para não conflitar com
// a anotação @Service do Spring, usada em outras camadas.
@Entity @Data @Table(name = "services")
public class ServiceOffer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne @JoinColumn(name = "user_id") private AppUser owner;
    private String title;
    @Column(length = 3000) private String description;
    private String category;
    private BigDecimal price;
    private String status = "ATIVO"; // ATIVO, PAUSADO
    private String imageUrl;
    private Integer deliveryDays;
    private String experienceLevel;
    private String location;
    private String serviceMode = "ONLINE";
    @Column(length = 2000) private String portfolioUrls;
    @Column(length = 3000) private String faq;
    @Column(length = 1000) private String tags;
    private LocalDateTime createdAt = LocalDateTime.now();
    @OneToMany(mappedBy = "service", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ServicePackage> packages = new ArrayList<>();

    @Transient private Double providerRating;
    @Transient private Long providerReviewCount;
    @Transient private Long completedWorkCount;
    @Transient private String providerLevel;
}
