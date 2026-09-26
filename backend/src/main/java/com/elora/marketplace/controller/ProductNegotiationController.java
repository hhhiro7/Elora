package com.elora.marketplace.controller;

import com.elora.marketplace.dto.InteractionDTOs.*;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.service.ProductNegotiationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequiredArgsConstructor
public class ProductNegotiationController {
    private final ProductNegotiationService negotiations;
    private AppUser currentUser() { return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal(); }

    @GetMapping("/api/negotiations/mine") public Object mine() { return negotiations.mine(currentUser().getId()); }
    @PostMapping("/api/products/{productId}/negotiations") public ResponseEntity<?> create(@PathVariable Long productId, @RequestBody NegotiationRequest request) { return call(() -> negotiations.create(productId, currentUser().getId(), request), 201); }
    @PostMapping("/api/negotiations/{id}/counter") public ResponseEntity<?> counter(@PathVariable Long id, @RequestBody CounterOfferRequest request) { return call(() -> negotiations.counter(id, currentUser().getId(), request), 200); }
    @PostMapping("/api/negotiations/{id}/accept") public ResponseEntity<?> accept(@PathVariable Long id) { return call(() -> negotiations.accept(id, currentUser().getId()), 200); }
    @PostMapping("/api/negotiations/{id}/reject") public ResponseEntity<?> reject(@PathVariable Long id) { return call(() -> negotiations.reject(id, currentUser().getId()), 200); }
    @PostMapping("/api/negotiations/{id}/cancel") public ResponseEntity<?> cancel(@PathVariable Long id) { return call(() -> negotiations.cancel(id, currentUser().getId()), 200); }
    private ResponseEntity<?> call(java.util.function.Supplier<?> action, int success) {
        try { return ResponseEntity.status(success).body(action.get()); }
        catch (SecurityException error) { return ResponseEntity.status(403).body(Map.of("message", error.getMessage())); }
        catch (IllegalArgumentException error) { return ResponseEntity.badRequest().body(Map.of("message", error.getMessage())); }
    }
}
