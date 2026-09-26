package com.elora.marketplace.controller;

import com.elora.marketplace.dto.MarketplaceDTOs.*;
import com.elora.marketplace.model.*;
import com.elora.marketplace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import org.springframework.transaction.annotation.Transactional;

@RestController @RequestMapping("/api/conversations") @RequiredArgsConstructor
public class ConversationController {
    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final ProductRepository products;
    private final ServiceRepository services;
    private final UserRepository users;

    private AppUser currentUser() { return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal(); }

    @GetMapping
    public List<ConversationView> list() {
        AppUser user = currentUser();
        List<Conversation> items = conversations.findByParticipantAIdOrParticipantBIdOrderByUpdatedAtDesc(user.getId(), user.getId());
        if (items.isEmpty()) return List.of();
        List<Long> ids = items.stream().map(Conversation::getId).toList();
        Map<Long, Long> unread = new HashMap<>();
        messages.countUnreadByConversation(ids, user.getId()).forEach(row -> unread.put((Long) row[0], (Long) row[1]));
        Map<Long, Message> latest = new HashMap<>();
        messages.findByConversationIdInOrderByCreatedAtDesc(ids).forEach(m -> latest.putIfAbsent(m.getConversation().getId(), m));
        return items.stream().map(c -> summary(c, user, latest.get(c.getId()), unread.getOrDefault(c.getId(), 0L))).toList();
    }

    @PostMapping
    public ResponseEntity<?> start(@RequestBody StartConversation request) {
        if (request.itemId() == null || request.type() == null || request.message() == null || request.message().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Escreva uma mensagem para iniciar a conversa."));
        String type = request.type().toUpperCase();
        AppUser user = currentUser();
        AppUser recipient;
        Product product = null;
        ServiceOffer service = null;
        String title;
        if (type.equals("PRODUCT")) {
            product = products.findById(request.itemId()).orElse(null);
            if (product == null || !"ATIVO".equals(product.getStatus())) return ResponseEntity.notFound().build();
            recipient = product.getOwner(); title = product.getName();
        } else if (type.equals("SERVICE")) {
            service = services.findById(request.itemId()).orElse(null);
            if (service == null || !"ATIVO".equals(service.getStatus())) return ResponseEntity.notFound().build();
            recipient = service.getOwner(); title = service.getTitle();
        } else if (type.equals("USER")) {
            recipient = users.findById(request.itemId()).orElse(null);
            if (recipient == null) return ResponseEntity.notFound().build();
            title = "Conversa pelo perfil";
        } else return ResponseEntity.badRequest().body(Map.of("message", "Tipo de anúncio inválido."));
        if (recipient == null) return ResponseEntity.badRequest().body(Map.of("message", "Este anúncio não tem anunciante associado."));
        if (recipient.getId().equals(user.getId())) return ResponseEntity.badRequest().body(Map.of("message", "Você não pode iniciar uma conversa consigo mesmo."));

        Long a = Math.min(user.getId(), recipient.getId()), b = Math.max(user.getId(), recipient.getId());
        final Product contextProduct = product;
        final ServiceOffer contextService = service;
        Conversation conversation = conversations.findByParticipantAIdOrParticipantBIdOrderByUpdatedAtDesc(a, a).stream()
                .filter(c -> c.getParticipantA().getId().equals(a) && c.getParticipantB().getId().equals(b))
                .filter(c -> type.equals("PRODUCT") ? c.getProduct() != null && c.getProduct().getId().equals(request.itemId())
                        : type.equals("SERVICE") ? c.getService() != null && c.getService().getId().equals(request.itemId())
                        : c.getProduct() == null && c.getService() == null)
                .findFirst().orElseGet(() -> {
                    Conversation created = new Conversation();
                    created.setParticipantA(user.getId().equals(a) ? user : recipient);
                    created.setParticipantB(user.getId().equals(a) ? recipient : user);
                    created.setProduct(contextProduct); created.setService(contextService);
                    return conversations.save(created);
                });
        Message message = send(conversation, user, request.message());
        return ResponseEntity.status(201).body(Map.of("conversationId", conversation.getId(), "message", message.getContent(), "targetTitle", title));
    }

    @GetMapping("/{id}/messages")
    @Transactional
    public ResponseEntity<?> getMessages(@PathVariable Long id) {
        Conversation conversation = conversations.findById(id).orElse(null);
        if (conversation == null) return ResponseEntity.notFound().build();
        if (!isParticipant(conversation)) return ResponseEntity.status(403).body(Map.of("message", "Esta conversa não pertence à sua conta."));
        messages.markIncomingAsRead(id, currentUser().getId());
        return ResponseEntity.ok(messages.findByConversationIdOrderByCreatedAtAsc(id).stream().map(this::view).toList());
    }

    @PostMapping("/{id}/read")
    @Transactional
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        Conversation conversation = conversations.findById(id).orElse(null);
        if (conversation == null) return ResponseEntity.notFound().build();
        if (!isParticipant(conversation)) return ResponseEntity.status(403).body(Map.of("message", "Esta conversa não pertence à sua conta."));
        return ResponseEntity.ok(Map.of("updated", messages.markIncomingAsRead(id, currentUser().getId())));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<?> sendMessage(@PathVariable Long id, @RequestBody SendMessage request) {
        Conversation conversation = conversations.findById(id).orElse(null);
        if (conversation == null) return ResponseEntity.notFound().build();
        if (!isParticipant(conversation)) return ResponseEntity.status(403).body(Map.of("message", "Esta conversa não pertence à sua conta."));
        if (request.content() == null || request.content().isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "A mensagem não pode ficar vazia."));
        Message message = send(conversation, currentUser(), request.content());
        return ResponseEntity.status(201).body(view(message));
    }

    private Message send(Conversation conversation, AppUser sender, String content) {
        Message message = new Message();
        message.setConversation(conversation); message.setSender(sender);
        String cleaned = content.trim(); message.setContent(cleaned.substring(0, Math.min(cleaned.length(), 4000)));
        conversation.setUpdatedAt(LocalDateTime.now()); conversations.save(conversation);
        return messages.save(message);
    }

    private boolean isParticipant(Conversation conversation) {
        Long id = currentUser().getId();
        return conversation.getParticipantA().getId().equals(id) || conversation.getParticipantB().getId().equals(id);
    }

    private MessageView view(Message m) {
        return new MessageView(m.getId(), m.getSender().getId(), m.getSender().getName(), m.getContent(), m.getCreatedAt(), Boolean.TRUE.equals(m.getRead()));
    }

    private ConversationView summary(Conversation c, AppUser user, Message latest, long unreadCount) {
        AppUser other = c.getParticipantA().getId().equals(user.getId()) ? c.getParticipantB() : c.getParticipantA();
        String type = c.getProduct() != null ? "PRODUCT" : c.getService() != null ? "SERVICE" : null;
        Long targetId = c.getProduct() != null ? c.getProduct().getId() : c.getService() != null ? c.getService().getId() : null;
        String title = c.getProduct() != null ? c.getProduct().getName() : c.getService() != null ? c.getService().getTitle() : "Conversa";
        String image = c.getProduct() != null ? c.getProduct().getImageUrl() : c.getService() != null ? c.getService().getImageUrl() : other.getAvatarUrl();
        java.math.BigDecimal price = c.getProduct() != null ? c.getProduct().getPrice() : c.getService() != null ? c.getService().getPrice() : null;
        return new ConversationView(c.getId(), other.getId(), other.getName(), other.getAvatarUrl(), type, targetId, title,
                latest == null ? "" : latest.getContent(), c.getUpdatedAt(), unreadCount, image, price);
    }
}
