package com.elora.marketplace.controller;

import com.elora.marketplace.dto.MarketplaceDTOs.*;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;
import com.elora.marketplace.model.Product;
import com.elora.marketplace.model.ServiceOffer;
import org.springframework.security.crypto.password.PasswordEncoder;

@RestController @RequestMapping("/api/users") @RequiredArgsConstructor
public class ProfileController {
    private final UserRepository users;
    private final ProductRepository products;
    private final ServiceRepository services;
    private final ReviewRepository reviews;
    private final OrderItemRepository orderItems;
    private final PasswordEncoder passwordEncoder;

    private AppUser currentUser() {
        return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping("/me")
    public MyProfile me() {
        AppUser user = currentUser();
        Long id = user.getId();
        return new MyProfile(id, user.getName(), user.getEmail(), user.getCity(), user.getBio(), user.getAvatarUrl(),
                user.getPhone(), user.getCreatedAt(), products.countByOwnerId(id), services.countByOwnerId(id),
                reviews.averageForUser(id), reviews.countForUser(id));
    }

    @PutMapping("/me")
    public ResponseEntity<?> update(@RequestBody ProfileUpdate request) {
        if (request.name() == null || request.name().isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Informe seu nome."));
        AppUser user = currentUser();
        user.setName(request.name().trim());
        user.setCity(clean(request.city(), 120));
        user.setBio(clean(request.bio(), 500));
        user.setAvatarUrl(clean(request.avatarUrl(), 500));
        user.setPhone(clean(request.phone(), 32));
        users.save(user);
        return ResponseEntity.ok(me());
    }

    @PutMapping("/me/password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordUpdate request) {
        AppUser user = currentUser();
        if (request.currentPassword() == null || !passwordEncoder.matches(request.currentPassword(), user.getPassword()))
            return ResponseEntity.badRequest().body(Map.of("message", "A senha atual não confere."));
        if (request.newPassword() == null || request.newPassword().length() < 8
                || !request.newPassword().matches("(?s).*[A-Za-z].*") || !request.newPassword().matches("(?s).*\\d.*"))
            return ResponseEntity.badRequest().body(Map.of("message", "A nova senha precisa ter ao menos 8 caracteres, incluindo letras e números."));
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        users.save(user);
        return ResponseEntity.ok(Map.of("message", "Senha alterada."));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> publicProfile(@PathVariable Long id) {
        return users.findById(id).<ResponseEntity<?>>map(user -> ResponseEntity.ok(new PublicProfile(
                user.getId(), user.getName(), user.getCity(), user.getBio(), user.getAvatarUrl(), user.getCreatedAt(),
                products.countByOwnerIdAndStatus(id, "ATIVO"), services.countByOwnerIdAndStatus(id, "ATIVO"),
                reviews.averageForUser(id), reviews.countForUser(id), orderItems.countCompletedSalesByOwner(id))))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/products")
    public List<Product> publicProducts(@PathVariable Long id) { return products.findByOwnerIdAndStatus(id, "ATIVO"); }

    @GetMapping("/{id}/services")
    public List<ServiceOffer> publicServices(@PathVariable Long id) { return services.findByOwnerIdAndStatus(id, "ATIVO"); }

    private String clean(String value, int maxLength) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        return trimmed.substring(0, Math.min(trimmed.length(), maxLength));
    }
}
