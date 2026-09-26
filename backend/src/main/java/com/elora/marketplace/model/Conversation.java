package com.elora.marketplace.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter
@Entity @Table(name = "conversations")
public class Conversation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "participant_a_id", nullable = false) private AppUser participantA;
    @ManyToOne(optional = false) @JoinColumn(name = "participant_b_id", nullable = false) private AppUser participantB;
    @ManyToOne @JoinColumn(name = "product_id") private Product product;
    @ManyToOne @JoinColumn(name = "service_id") private ServiceOffer service;
    @ManyToOne @JoinColumn(name = "project_id") private Project project;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}
