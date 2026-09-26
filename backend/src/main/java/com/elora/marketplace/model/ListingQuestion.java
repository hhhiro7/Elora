package com.elora.marketplace.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter
@Entity @Table(name = "listing_questions", indexes = @Index(name = "idx_question_product_service", columnList = "product_id,service_id,created_at"))
public class ListingQuestion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @JsonIgnore @ManyToOne @JoinColumn(name = "product_id") private Product product;
    @JsonIgnore @ManyToOne @JoinColumn(name = "service_id") private ServiceOffer service;
    @ManyToOne(optional = false) @JoinColumn(name = "asker_id", nullable = false) private AppUser asker;
    @ManyToOne @JoinColumn(name = "responder_id") private AppUser responder;
    @Column(nullable = false, length = 1000) private String question;
    @Column(length = 1000) private String answer;
    @Column(nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime answeredAt;
}
