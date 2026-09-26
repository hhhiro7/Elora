package com.elora.marketplace.controller;

import com.elora.marketplace.dto.PortfolioDTOs.PortfolioRequest;
import com.elora.marketplace.dto.PortfolioDTOs.PortfolioView;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.service.PortfolioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.function.Supplier;

@RestController @RequiredArgsConstructor
public class PortfolioController {
    private final PortfolioService portfolio;
    private AppUser currentUser() { return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal(); }
    @GetMapping("/api/portfolio/mine") public Object mine() { return portfolio.mine(currentUser().getId()); }
    @GetMapping("/api/users/{userId}/portfolio") public Object publicPortfolio(@PathVariable Long userId) { return portfolio.publicItems(userId); }
    @PostMapping("/api/portfolio") public ResponseEntity<?> create(@RequestBody PortfolioRequest request) { return call(() -> portfolio.create(currentUser(), request), 201); }
    @PutMapping("/api/portfolio/{id}") public ResponseEntity<?> update(@PathVariable Long id, @RequestBody PortfolioRequest request) { return call(() -> portfolio.update(id, currentUser().getId(), request), 200); }
    @DeleteMapping("/api/portfolio/{id}") public ResponseEntity<?> delete(@PathVariable Long id) {
        try { portfolio.delete(id, currentUser().getId()); return ResponseEntity.noContent().build(); }
        catch (SecurityException error) { return ResponseEntity.status(403).body(Map.of("message", error.getMessage())); }
        catch (IllegalArgumentException error) { return ResponseEntity.badRequest().body(Map.of("message", error.getMessage())); }
    }
    private ResponseEntity<?> call(Supplier<PortfolioView> action, int status) {
        try { return ResponseEntity.status(status).body(action.get()); }
        catch (SecurityException error) { return ResponseEntity.status(403).body(Map.of("message", error.getMessage())); }
        catch (IllegalArgumentException error) { return ResponseEntity.badRequest().body(Map.of("message", error.getMessage())); }
    }
}
