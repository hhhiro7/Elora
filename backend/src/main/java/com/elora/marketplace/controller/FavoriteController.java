package com.elora.marketplace.controller;

import com.elora.marketplace.dto.MarketplaceDTOs.FavoriteRequest;
import com.elora.marketplace.dto.MarketplaceDTOs.FavoriteView;
import com.elora.marketplace.model.*;
import com.elora.marketplace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/favorites") @RequiredArgsConstructor
public class FavoriteController {
    private final FavoriteRepository favorites;
    private final ProductRepository products;
    private final ServiceRepository services;
    private final UserRepository users;

    private AppUser currentUser() { return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal(); }

    @GetMapping
    public List<FavoriteView> list() {
        return favorites.findByUserIdOrderByCreatedAtDesc(currentUser().getId()).stream().map(this::view).filter(v -> v != null).toList();
    }

    @PostMapping
    public ResponseEntity<?> add(@RequestBody FavoriteRequest request) {
        if (request.itemId() == null || request.type() == null) return ResponseEntity.badRequest().body(Map.of("message", "Selecione um anúncio para favoritar."));
        String type = request.type().toUpperCase();
        if (!type.equals("PRODUCT") && !type.equals("SERVICE")) return ResponseEntity.badRequest().body(Map.of("message", "Tipo de anúncio inválido."));
        boolean exists = type.equals("PRODUCT") ? products.existsById(request.itemId()) : services.existsById(request.itemId());
        if (!exists) return ResponseEntity.notFound().build();
        AppUser user = currentUser();
        Favorite favorite = favorites.findByUserIdAndTargetTypeAndTargetId(user.getId(), type, request.itemId()).orElseGet(Favorite::new);
        favorite.setUser(user); favorite.setTargetType(type); favorite.setTargetId(request.itemId());
        return ResponseEntity.status(201).body(view(favorites.save(favorite)));
    }

    @DeleteMapping("/{type}/{itemId}")
    public ResponseEntity<?> remove(@PathVariable String type, @PathVariable Long itemId) {
        favorites.findByUserIdAndTargetTypeAndTargetId(currentUser().getId(), type.toUpperCase(), itemId).ifPresent(favorites::delete);
        return ResponseEntity.noContent().build();
    }

    private FavoriteView view(Favorite favorite) {
        if ("PRODUCT".equals(favorite.getTargetType())) {
            return products.findById(favorite.getTargetId()).map(p -> new FavoriteView(favorite.getId(), "PRODUCT", p.getId(), p.getName(), p.getImageUrl(), p.getPrice(), "produto.html?id=" + p.getId(), favorite.getCreatedAt())).orElse(null);
        }
        return services.findById(favorite.getTargetId()).map(s -> new FavoriteView(favorite.getId(), "SERVICE", s.getId(), s.getTitle(), s.getImageUrl(), s.getPrice(), "servico.html?id=" + s.getId(), favorite.getCreatedAt())).orElse(null);
    }
}
