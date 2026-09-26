package com.elora.marketplace.model;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Data @Table(name = "products")
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne @JoinColumn(name = "user_id") private AppUser owner;
    private String name;
    private String category;
    @Column(length = 1000) private String description;
    private BigDecimal price;
    private Integer stock;
    private String conditionType; // NOVO, USADO
    private String status = "ATIVO"; // ATIVO, PAUSADO
    private String imageUrl;
    private String location;
    @Column(length = 1000) private String tags;
    private LocalDateTime createdAt = LocalDateTime.now();
}
