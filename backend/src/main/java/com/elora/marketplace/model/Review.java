package com.elora.marketplace.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter
@Entity @Table(name = "reviews")
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "reviewer_id", nullable = false) private AppUser reviewer;
    @ManyToOne(optional = false) @JoinColumn(name = "reviewed_user_id", nullable = false) private AppUser reviewedUser;
    @ManyToOne @JoinColumn(name = "product_order_id") private AppOrder productOrder;
    @ManyToOne @JoinColumn(name = "service_order_id") private ServiceOrder serviceOrder;
    @Column(nullable = false) private Integer rating;
    @Column(nullable = false, length = 2000) private String comment;
    private LocalDateTime createdAt = LocalDateTime.now();
}
