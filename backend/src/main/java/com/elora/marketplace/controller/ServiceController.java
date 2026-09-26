package com.elora.marketplace.controller;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.model.ServiceOffer;
import com.elora.marketplace.repository.ServiceRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;
import com.elora.marketplace.dto.MarketplaceDTOs.PageResult;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@RestController @RequestMapping("/api/services") @RequiredArgsConstructor
public class ServiceController {
    private final ServiceRepository serviceRepo;

    private AppUser currentUser() {
        return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping
    public List<ServiceOffer> listAll() {
        return serviceRepo.findByStatus("ATIVO");
    }

    @GetMapping("/search")
    public PageResult<ServiceOffer> search(@RequestParam(required = false) String q, @RequestParam(required = false) String category,
            @RequestParam(required = false) BigDecimal minPrice, @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String location, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size, @RequestParam(defaultValue = "recent") String sort) {
        Sort order = switch (sort.toLowerCase()) {
            case "asc" -> Sort.by("price").ascending();
            case "desc" -> Sort.by("price").descending();
            default -> Sort.by("id").descending();
        };
        var result = serviceRepo.searchActive(blankToEmpty(q), blankToEmpty(category), minPrice, maxPrice, blankToEmpty(location),
                PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 48)), order));
        return new PageResult<>(result.getContent(), result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages(), result.hasNext());
    }

    @GetMapping("/mine")
    public List<ServiceOffer> myServices() {
        return serviceRepo.findByOwnerId(currentUser().getId());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ServiceOffer s) {
        if (s.getTitle() == null || s.getTitle().isBlank() || s.getPrice() == null || s.getPrice().signum() <= 0)
            return ResponseEntity.badRequest().body("Informe um título e um preço válido para o serviço.");
        s.setId(null);
        s.setOwner(currentUser());
        s.setStatus("ATIVO");
        return ResponseEntity.ok(serviceRepo.save(s));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return serviceRepo.findById(id).filter(s -> "ATIVO".equals(s.getStatus()))
                .<ResponseEntity<?>>map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ServiceOffer updated) {
        Optional<ServiceOffer> existing = serviceRepo.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        if (!existing.get().getOwner().getId().equals(currentUser().getId())) return ResponseEntity.status(403).body("Você não pode editar o serviço de outra pessoa.");
        if (updated.getTitle() == null || updated.getTitle().isBlank() || updated.getPrice() == null || updated.getPrice().signum() <= 0)
            return ResponseEntity.badRequest().body("Informe um título e um preço válido para o serviço.");
        ServiceOffer service = existing.get();
        service.setTitle(updated.getTitle()); service.setCategory(updated.getCategory()); service.setDescription(updated.getDescription());
        service.setPrice(updated.getPrice()); service.setDeliveryDays(updated.getDeliveryDays()); service.setExperienceLevel(updated.getExperienceLevel());
        service.setLocation(updated.getLocation()); service.setImageUrl(updated.getImageUrl()); service.setTags(updated.getTags());
        return ResponseEntity.ok(serviceRepo.save(service));
    }

    @PutMapping("/{id}/pause") public ResponseEntity<?> pause(@PathVariable Long id) { return changeStatus(id, "PAUSADO"); }
    @PutMapping("/{id}/activate") public ResponseEntity<?> activate(@PathVariable Long id) { return changeStatus(id, "ATIVO"); }
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Optional<ServiceOffer> service = serviceRepo.findById(id);
        if (service.isEmpty()) return ResponseEntity.notFound().build();
        if (!service.get().getOwner().getId().equals(currentUser().getId())) return ResponseEntity.status(403).body("Você não pode remover o serviço de outra pessoa.");
        service.get().setStatus("REMOVIDO"); serviceRepo.save(service.get());
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<?> changeStatus(Long id, String status) {
        Optional<ServiceOffer> service = serviceRepo.findById(id);
        if (service.isEmpty()) return ResponseEntity.notFound().build();
        if (!service.get().getOwner().getId().equals(currentUser().getId())) return ResponseEntity.status(403).body("Você não pode alterar o serviço de outra pessoa.");
        service.get().setStatus(status);
        return ResponseEntity.ok(serviceRepo.save(service.get()));
    }
    private String blankToEmpty(String value) { return value == null || value.isBlank() ? "" : value.trim(); }
}
