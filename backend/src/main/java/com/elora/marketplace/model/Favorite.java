package com.elora.marketplace.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter
@Entity
@Table(name = "favorites", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "target_type", "target_id"}))
public class Favorite {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "user_id", nullable = false) private AppUser user;
    @Column(name = "target_type", nullable = false, length = 16) private String targetType;
    @Column(name = "target_id", nullable = false) private Long targetId;
    private LocalDateTime createdAt = LocalDateTime.now();
}
