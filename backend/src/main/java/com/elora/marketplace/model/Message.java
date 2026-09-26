package com.elora.marketplace.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter @Setter
@Entity @Table(name = "messages")
public class Message {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "conversation_id", nullable = false) private Conversation conversation;
    @ManyToOne(optional = false) @JoinColumn(name = "sender_id", nullable = false) private AppUser sender;
    @Column(nullable = false, length = 4000) private String content;
    private LocalDateTime createdAt = LocalDateTime.now();
    // Nullable to preserve existing Neon rows; null is treated as unread.
    @Column(name = "is_read") private Boolean read = false;
}
