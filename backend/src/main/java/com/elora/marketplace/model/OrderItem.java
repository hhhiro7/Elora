package com.elora.marketplace.model;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Entity @Data @Table(name = "order_items")
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @JsonIgnore // evita loop infinito (order -> items -> order -> ...)
    @ManyToOne @JoinColumn(name = "order_id") private AppOrder order;

    @ManyToOne @JoinColumn(name = "product_id") private Product product;

    private Integer quantity;

    // preço do produto no momento da compra (não muda se o preço do produto mudar depois)
    private BigDecimal unitPrice;

    private BigDecimal subtotal;
}
