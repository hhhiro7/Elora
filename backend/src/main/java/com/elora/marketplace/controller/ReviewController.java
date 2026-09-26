package com.elora.marketplace.controller;

import com.elora.marketplace.dto.MarketplaceDTOs.ReviewRequest;
import com.elora.marketplace.dto.MarketplaceDTOs.ReviewView;
import com.elora.marketplace.dto.MarketplaceDTOs.ReviewSummary;
import com.elora.marketplace.dto.MarketplaceDTOs.ServiceReviewView;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.model.Review;
import com.elora.marketplace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@RestController @RequestMapping("/api/reviews") @RequiredArgsConstructor
public class ReviewController {
    private final ReviewRepository reviews;
    private final OrderRepository orders;
    private final ServiceOrderRepository serviceOrders;
    private final ProductRepository products;
    private final UserRepository users;

    private AppUser currentUser() { return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal(); }

    @GetMapping("/user/{userId}")
    public List<ReviewView> list(@PathVariable Long userId) {
        return reviews.findByReviewedUserIdOrderByCreatedAtDesc(userId).stream()
                .map(r -> new ReviewView(r.getId(), r.getReviewer().getId(), r.getReviewer().getName(), r.getRating(), r.getComment(), r.getCreatedAt())).toList();
    }

    @GetMapping("/user/{userId}/services")
    public List<ServiceReviewView> serviceReviews(@PathVariable Long userId) {
        return reviews.findByReviewedUserIdAndServiceOrderIsNotNullOrderByCreatedAtDesc(userId).stream()
                .map(r -> new ServiceReviewView(r.getId(), r.getReviewer().getId(), r.getReviewer().getName(),
                        r.getRating(), r.getComment(), r.getServiceOrder().getService().getTitle(), r.getCreatedAt())).toList();
    }

    @GetMapping("/user/{userId}/summary")
    public ReviewSummary summary(@PathVariable Long userId) {
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int stars = 5; stars >= 1; stars--) distribution.put(stars, 0L);
        reviews.distributionForUser(userId).forEach(row -> distribution.put((Integer) row[0], (Long) row[1]));
        return new ReviewSummary(reviews.averageForUser(userId), reviews.countForUser(userId), distribution);
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<?> orderReviewStatus(@PathVariable Long orderId) {
        AppUser buyer = currentUser();
        var order = orders.findById(orderId);
        if (order.isEmpty()) return ResponseEntity.notFound().build();
        if (!order.get().getBuyer().getId().equals(buyer.getId())) return ResponseEntity.status(403).body(Map.of("message", "Este pedido não pertence à sua conta."));
        if (!"CONCLUIDO".equals(order.get().getStatus())) return ResponseEntity.status(403).body(Map.of("message", "As avaliações ficam disponíveis após a conclusão do pedido."));
        var sellers = order.get().getItems().stream().map(item -> item.getProduct().getOwner()).filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toMap(AppUser::getId, user -> user, (first, ignored) -> first, LinkedHashMap::new));
        var result = sellers.values().stream().map(seller -> {
            var review = reviews.findByReviewerIdAndProductOrderIdAndReviewedUserId(buyer.getId(), orderId, seller.getId());
            return Map.of("sellerId", seller.getId(), "sellerName", seller.getName(), "reviewed", review.isPresent(),
                    "rating", review.map(Review::getRating).orElse(0), "comment", review.map(Review::getComment).orElse(""));
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ReviewRequest request) {
        AppUser reviewer = currentUser();
        if (request.rating() == null || request.rating() < 1 || request.rating() > 5 || request.comment() == null || request.comment().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Informe uma nota de 1 a 5 e um comentário."));
        var target = users.findById(request.reviewedUserId());
        if (target.isEmpty()) return ResponseEntity.notFound().build();
        if (reviewer.getId().equals(target.get().getId())) return ResponseEntity.badRequest().body(Map.of("message", "Você não pode avaliar a si mesmo."));

        Review review = new Review();
        review.setReviewer(reviewer); review.setReviewedUser(target.get());
        review.setRating(request.rating()); review.setComment(request.comment().trim().substring(0, Math.min(2000, request.comment().trim().length())));
        if ("PRODUCT".equalsIgnoreCase(request.type())) {
            var order = orders.findById(request.orderId());
            if (order.isEmpty() || !order.get().getBuyer().getId().equals(reviewer.getId()) || !"CONCLUIDO".equals(order.get().getStatus()))
                return ResponseEntity.status(403).body(Map.of("message", "A avaliação fica disponível depois da conclusão do pedido."));
            boolean sellerMatches = order.get().getItems().stream().anyMatch(i -> i.getProduct().getOwner().getId().equals(target.get().getId()));
            if (!sellerMatches) return ResponseEntity.badRequest().body(Map.of("message", "Este vendedor não participou do pedido."));
            if (reviews.existsByReviewerIdAndProductOrderIdAndReviewedUserId(reviewer.getId(), order.get().getId(), target.get().getId()))
                return ResponseEntity.badRequest().body(Map.of("message", "Você já avaliou este vendedor neste pedido."));
            review.setProductOrder(order.get());
        } else if ("SERVICE".equalsIgnoreCase(request.type())) {
            var serviceOrder = serviceOrders.findById(request.serviceOrderId());
            if (serviceOrder.isEmpty() || !serviceOrder.get().getClient().getId().equals(reviewer.getId())
                    || !serviceOrder.get().getProvider().getId().equals(target.get().getId())
                    || !"CONCLUIDO".equals(serviceOrder.get().getStatus()))
                return ResponseEntity.status(403).body(Map.of("message", "Só é possível avaliar um serviço concluído por você."));
            if (reviews.existsByReviewerIdAndServiceOrderId(reviewer.getId(), serviceOrder.get().getId()))
                return ResponseEntity.badRequest().body(Map.of("message", "Você já avaliou este serviço."));
            review.setServiceOrder(serviceOrder.get());
        } else return ResponseEntity.badRequest().body(Map.of("message", "Tipo de avaliação inválido."));
        try {
            Review saved = reviews.saveAndFlush(review);
            return ResponseEntity.status(201).body(new ReviewView(saved.getId(), reviewer.getId(), reviewer.getName(), saved.getRating(), saved.getComment(), saved.getCreatedAt()));
        } catch (org.springframework.dao.DataIntegrityViolationException duplicate) {
            return ResponseEntity.badRequest().body(Map.of("message", "Esta compra já possui uma avaliação sua para este vendedor."));
        }
    }
}
