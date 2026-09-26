package com.elora.marketplace.controller;

import com.elora.marketplace.dto.InteractionDTOs.NotificationView;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.repository.MarketplaceNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/notifications") @RequiredArgsConstructor
public class NotificationController {
    private final MarketplaceNotificationRepository notifications;
    private AppUser currentUser() { return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal(); }

    @GetMapping public List<NotificationView> list() {
        return notifications.findTop100ByUserIdOrderByCreatedAtDesc(currentUser().getId()).stream()
                .map(n -> new NotificationView(n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.getLink(), n.getReadAt(), n.getCreatedAt())).toList();
    }
    @GetMapping("/unread-count") public Map<String, Long> unreadCount() {
        return Map.of("count", notifications.countByUserIdAndReadAtIsNull(currentUser().getId()));
    }
    @PostMapping("/{id}/read") @Transactional public ResponseEntity<?> markRead(@PathVariable Long id) {
        var item = notifications.findById(id).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        if (!item.getUser().getId().equals(currentUser().getId())) return ResponseEntity.status(403).body(Map.of("message", "Esta notificação pertence a outra conta."));
        if (item.getReadAt() == null) item.setReadAt(LocalDateTime.now());
        return ResponseEntity.ok(Map.of("readAt", item.getReadAt()));
    }
    @PostMapping("/read-all") @Transactional public Map<String, Long> markAllRead() {
        int updated = notifications.markAllRead(currentUser().getId(), LocalDateTime.now());
        return Map.of("updated", (long) updated);
    }
}
