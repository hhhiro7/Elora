package com.elora.marketplace.controller;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.model.Product;
import com.elora.marketplace.repository.ProductRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;
import java.util.Comparator;
import com.elora.marketplace.repository.OrderItemRepository;
import com.elora.marketplace.dto.MarketplaceDTOs.PageResult;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@RestController @RequestMapping("/api/products") @RequiredArgsConstructor
public class ProductController {
    private final ProductRepository productRepo;
    private final OrderItemRepository orderItems;

    // O usuário autenticado fica disponível aqui porque o JwtAuthenticationFilter
    // já validou o token e colocou o AppUser correspondente no SecurityContext.
    private AppUser currentUser() {
        return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public List<Product> listAll(@RequestParam(required = false) String q, @RequestParam(required = false) String category,
                                 @RequestParam(required = false) String condition, @RequestParam(required = false) BigDecimal minPrice,
                                 @RequestParam(required = false) BigDecimal maxPrice, @RequestParam(required = false) String location,
                                 @RequestParam(required = false) String sort) {
        var result = productRepo.findByStatus("ATIVO").stream()
            .filter(p -> q == null || q.isBlank() || (safe(p.getName()) + " " + safe(p.getDescription()) + " " + safe(p.getCategory())).toLowerCase().contains(q.toLowerCase()))
            .filter(p -> category == null || category.isBlank() || category.equalsIgnoreCase(p.getCategory()))
            .filter(p -> condition == null || condition.isBlank() || condition.equalsIgnoreCase(p.getConditionType()))
            .filter(p -> minPrice == null || (p.getPrice() != null && p.getPrice().compareTo(minPrice) >= 0))
            .filter(p -> maxPrice == null || (p.getPrice() != null && p.getPrice().compareTo(maxPrice) <= 0))
            .filter(p -> location == null || location.isBlank() || safe(p.getLocation()).toLowerCase().contains(location.toLowerCase()))
            .toList();
        if ("asc".equalsIgnoreCase(sort)) return result.stream().sorted(Comparator.comparing(Product::getPrice, Comparator.nullsLast(Comparator.naturalOrder()))).toList();
        if ("desc".equalsIgnoreCase(sort)) return result.stream().sorted(Comparator.comparing(Product::getPrice, Comparator.nullsLast(Comparator.reverseOrder()))).toList();
        if ("recent".equalsIgnoreCase(sort)) return result.reversed();
        return result;
    }

    @GetMapping("/search")
    public PageResult<Product> search(@RequestParam(required = false) String q, @RequestParam(required = false) String category,
            @RequestParam(required = false) String condition, @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice, @RequestParam(required = false) String location,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "24") int size,
            @RequestParam(defaultValue = "recent") String sort) {
        Sort order = switch (sort.toLowerCase()) {
            case "asc" -> Sort.by("price").ascending();
            case "desc" -> Sort.by("price").descending();
            default -> Sort.by("id").descending();
        };
        var result = productRepo.searchActive(blankToEmpty(q), blankToEmpty(category), blankToEmpty(condition), minPrice, maxPrice,
                blankToEmpty(location), inStock, PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 48)), order));
        return new PageResult<>(result.getContent(), result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages(), result.hasNext());
    }

    @GetMapping("/mine")
    public List<Product> myProducts() {
        return productRepo.findByOwnerId(currentUser().getId()).stream().filter(p -> !"REMOVIDO".equals(p.getStatus())).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        Optional<Product> product = productRepo.findById(id).filter(p -> "ATIVO".equals(p.getStatus()));
        if (product.isEmpty()) return ResponseEntity.status(404).body("Produto não encontrado.");
        return ResponseEntity.ok(product.get());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Product p) {
        // Nunca confiar no owner/status enviados pelo cliente.
        p.setId(null);
        p.setOwner(currentUser());
        p.setStatus("ATIVO");
        p.setId(null);
        if (p.getName() == null || p.getName().isBlank() || p.getPrice() == null || p.getPrice().signum() <= 0 || p.getStock() == null || p.getStock() < 0)
            return ResponseEntity.badRequest().body("Revise título, preço e estoque do produto.");
        return ResponseEntity.ok(productRepo.save(p));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Product updated) {
        Optional<Product> existingOpt = productRepo.findById(id);
        if (existingOpt.isEmpty()) return ResponseEntity.status(404).body("Produto não encontrado.");

        Product existing = existingOpt.get();
        if (!existing.getOwner().getId().equals(currentUser().getId())) {
            return ResponseEntity.status(403).body("Você não pode editar um produto de outro usuário.");
        }

        // Só os campos do formulário podem ser alterados; id, owner e status não mudam por aqui.
        existing.setName(updated.getName());
        existing.setCategory(updated.getCategory());
        existing.setDescription(updated.getDescription());
        existing.setPrice(updated.getPrice());
        existing.setStock(updated.getStock());
        existing.setConditionType(updated.getConditionType());
        existing.setImageUrl(updated.getImageUrl());
        existing.setLocation(updated.getLocation());
        existing.setTags(updated.getTags());

        return ResponseEntity.ok(productRepo.save(existing));
    }

    @PutMapping("/{id}/pause")
    public ResponseEntity<?> pause(@PathVariable Long id) {
        return changeStatus(id, "PAUSADO");
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<?> activate(@PathVariable Long id) {
        return changeStatus(id, "ATIVO");
    }

    private ResponseEntity<?> changeStatus(Long id, String status) {
        Optional<Product> existingOpt = productRepo.findById(id);
        if (existingOpt.isEmpty()) return ResponseEntity.status(404).body("Produto não encontrado.");

        Product existing = existingOpt.get();
        if (!existing.getOwner().getId().equals(currentUser().getId())) {
            return ResponseEntity.status(403).body("Você não pode alterar um produto de outro usuário.");
        }

        existing.setStatus(status);
        return ResponseEntity.ok(productRepo.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Optional<Product> found = productRepo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();
        Product product = found.get();
        if (product.getOwner() == null || !product.getOwner().getId().equals(currentUser().getId())) return ResponseEntity.status(403).body("Você não pode remover o produto de outra pessoa.");
        if (orderItems.existsByProductId(id)) {
            product.setStatus("REMOVIDO");
            productRepo.save(product);
        } else productRepo.delete(product);
        return ResponseEntity.noContent().build();
    }

    private String safe(String value) { return value == null ? "" : value; }
    private String blankToEmpty(String value) { return value == null || value.isBlank() ? "" : value.trim(); }
}
