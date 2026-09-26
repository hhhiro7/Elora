package com.elora.marketplace.controller;

import com.elora.marketplace.dto.QuestionDTOs.*;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.service.ListingQuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.function.Supplier;

@RestController @RequiredArgsConstructor
public class ListingQuestionController {
    private final ListingQuestionService questions;
    private AppUser currentUser() { return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal(); }
    @GetMapping("/api/products/{id}/questions") public Object products(@PathVariable Long id) { return questions.list("PRODUCT", id); }
    @GetMapping("/api/services/{id}/questions") public Object services(@PathVariable Long id) { return questions.list("SERVICE", id); }
    @PostMapping("/api/products/{id}/questions") public ResponseEntity<?> askProduct(@PathVariable Long id, @RequestBody QuestionRequest request) { return call(() -> questions.ask("PRODUCT", id, currentUser().getId(), request), 201); }
    @PostMapping("/api/services/{id}/questions") public ResponseEntity<?> askService(@PathVariable Long id, @RequestBody QuestionRequest request) { return call(() -> questions.ask("SERVICE", id, currentUser().getId(), request), 201); }
    @PostMapping("/api/questions/{id}/answer") public ResponseEntity<?> answer(@PathVariable Long id, @RequestBody AnswerRequest request) { return call(() -> questions.answer(id, currentUser().getId(), request), 200); }
    private ResponseEntity<?> call(Supplier<QuestionView> action, int status) {
        try { return ResponseEntity.status(status).body(action.get()); }
        catch (SecurityException error) { return ResponseEntity.status(403).body(Map.of("message", error.getMessage())); }
        catch (IllegalArgumentException error) { return ResponseEntity.badRequest().body(Map.of("message", error.getMessage())); }
    }
}
