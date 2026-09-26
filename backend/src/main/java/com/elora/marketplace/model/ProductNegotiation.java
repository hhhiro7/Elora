package com.elora.marketplace.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter
@Entity @Table(name = "product_negotiations", indexes = {
        @Index(name = "idx_negotiation_buyer_updated", columnList = "buyer_id,updated_at"),
        @Index(name = "idx_negotiation_seller_updated", columnList = "seller_id,updated_at")
})
public class ProductNegotiation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @JsonIgnore @ManyToOne(optional = false) @JoinColumn(name = "product_id", nullable = false) private Product product;
    @JsonIgnore @ManyToOne(optional = false) @JoinColumn(name = "buyer_id", nullable = false) private AppUser buyer;
    @JsonIgnore @ManyToOne(optional = false) @JoinColumn(name = "seller_id", nullable = false) private AppUser seller;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal buyerOffer;
    @Column(precision = 12, scale = 2) private BigDecimal sellerCounteroffer;
    @Column(nullable = false, length = 24) private String status = "PENDENTE";
    @Column(nullable = false, length = 600) private String buyerMessage;
    @Column(length = 600) private String sellerMessage;
    @Column(nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column(nullable = false) private LocalDateTime updatedAt = LocalDateTime.now();
}
