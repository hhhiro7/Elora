package com.elora.marketplace.model;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity @Data @Table(name = "orders")
public class AppOrder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne @JoinColumn(name = "buyer_id") private AppUser buyer;
    private BigDecimal totalAmount;
    private String paymentMethod; // PIX, CREDIT_CARD
    private String status = "PAGAMENTO_CONFIRMADO";
    @Column(length = 1000) private String deliveryAddress;
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();
}
