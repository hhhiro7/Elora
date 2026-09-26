package com.elora.marketplace.controller;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.model.ServiceOffer;
import com.elora.marketplace.repository.ServiceRepository;
import com.elora.marketplace.repository.ReviewRepository;
import com.elora.marketplace.repository.ServiceOrderRepository;
import com.elora.marketplace.model.ServicePackage;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.math.BigDecimal;
import com.elora.marketplace.dto.MarketplaceDTOs.PageResult;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import com.elora.marketplace.service.SearchSynonyms;

@RestController @RequestMapping("/api/services") @RequiredArgsConstructor
public class ServiceController {
    private final ServiceRepository serviceRepo;
    private final ReviewRepository reviews;
    private final ServiceOrderRepository serviceOrders;
    private final SearchSynonyms searchSynonyms;

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
            @RequestParam(required = false) String location, @RequestParam(required = false) Integer maxDays,
            @RequestParam(required = false) Double minRating, @RequestParam(required = false) String experience,
            @RequestParam(required = false) String mode, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size, @RequestParam(defaultValue = "recent") String sort) {
        Sort order = switch (sort.toLowerCase()) {
            case "asc" -> Sort.by("price").ascending();
            case "desc" -> Sort.by("price").descending();
            default -> Sort.by("id").descending();
        };
        var terms = searchSynonyms.expand(q);
        var result = serviceRepo.searchActive(terms.primary(), blankToEmpty(category), minPrice, maxPrice, blankToEmpty(location),
                maxDays, blankToEmpty(experience), cleanMode(mode), minRating != null && minRating > 0 ? Math.min(5, minRating) : null,
                terms.alternativeOne(), terms.alternativeTwo(),
                PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 48)), order));
        List<ServiceOffer> services = new ArrayList<>(result.getContent());
        enrich(services);
        if ("rating".equalsIgnoreCase(sort)) services.sort(java.util.Comparator.comparing(ServiceOffer::getProviderRating, java.util.Comparator.nullsLast(Double::compareTo)).reversed());
        else if ("sales".equalsIgnoreCase(sort)) services.sort(java.util.Comparator.comparing(ServiceOffer::getCompletedWorkCount, java.util.Comparator.nullsLast(Long::compareTo)).reversed());
        else if ("relevance".equalsIgnoreCase(sort) && q != null && !q.isBlank()) services.sort(java.util.Comparator.comparing((ServiceOffer s) -> s.getTitle().toLowerCase().contains(q.toLowerCase())).reversed());
        return new PageResult<>(services, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages(), result.hasNext());
    }

    @GetMapping("/mine")
    public List<ServiceOffer> myServices() {
        List<ServiceOffer> services = serviceRepo.findByOwnerId(currentUser().getId()); enrich(services); return services;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ServiceOffer s) {
        if (s.getTitle() == null || s.getTitle().isBlank() || s.getPrice() == null || s.getPrice().signum() <= 0)
            return ResponseEntity.badRequest().body("Informe um título e um preço válido para o serviço.");
        String packageError = validatePackages(s.getPackages());
        if (packageError != null) return ResponseEntity.badRequest().body(packageError);
        s.setId(null);
        s.setOwner(currentUser());
        s.setStatus("ATIVO");
        s.setServiceMode(cleanMode(s.getServiceMode()));
        if (s.getPackages() != null) s.getPackages().forEach(p -> { p.setId(null); p.setService(s); });
        return ResponseEntity.ok(serviceRepo.save(s));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        ServiceOffer service = serviceRepo.findById(id).filter(s -> "ATIVO".equals(s.getStatus())).orElse(null);
        if (service == null) return ResponseEntity.notFound().build();
        enrich(List.of(service));
        return ResponseEntity.ok(service);
    }

    @PutMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ServiceOffer updated) {
        Optional<ServiceOffer> existing = serviceRepo.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        if (!existing.get().getOwner().getId().equals(currentUser().getId())) return ResponseEntity.status(403).body("Você não pode editar o serviço de outra pessoa.");
        if (updated.getTitle() == null || updated.getTitle().isBlank() || updated.getPrice() == null || updated.getPrice().signum() <= 0)
            return ResponseEntity.badRequest().body("Informe um título e um preço válido para o serviço.");
        String packageError = validatePackages(updated.getPackages());
        if (packageError != null) return ResponseEntity.badRequest().body(packageError);
        ServiceOffer service = existing.get();
        service.setTitle(updated.getTitle()); service.setCategory(updated.getCategory()); service.setDescription(updated.getDescription());
        service.setPrice(updated.getPrice()); service.setDeliveryDays(updated.getDeliveryDays()); service.setExperienceLevel(updated.getExperienceLevel());
        service.setLocation(updated.getLocation()); service.setImageUrl(updated.getImageUrl()); service.setTags(updated.getTags());
        service.setServiceMode(cleanMode(updated.getServiceMode())); service.setPortfolioUrls(updated.getPortfolioUrls()); service.setFaq(updated.getFaq());
        if (updated.getPackages() != null) {
            Map<String, ServicePackage> existingByTier = new HashMap<>();
            service.getPackages().forEach(p -> existingByTier.put(p.getTier(), p));
            service.getPackages().clear();
            updated.getPackages().forEach(incoming -> {
                ServicePackage target = existingByTier.getOrDefault(incoming.getTier(), new ServicePackage());
                target.setTier(incoming.getTier()); target.setName(incoming.getName()); target.setPrice(incoming.getPrice());
                target.setDeliveryDays(incoming.getDeliveryDays()); target.setDescription(incoming.getDescription());
                target.setRevisions(incoming.getRevisions()); target.setDeliverables(incoming.getDeliverables());
                target.setSortOrder(incoming.getSortOrder()); target.setService(service); service.getPackages().add(target);
            });
        }
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
    private String cleanMode(String value) { return Set.of("ONLINE", "PRESENCIAL", "AMBOS").contains(value == null ? "" : value.toUpperCase()) ? value.toUpperCase() : "ONLINE"; }

    private String validatePackages(List<ServicePackage> packages) {
        if (packages == null) return null;
        if (packages.size() > 3) return "Um serviço pode ter no máximo três pacotes.";
        Set<String> tiers = new java.util.HashSet<>();
        for (ServicePackage item : packages) {
            String tier = item.getTier() == null ? "" : item.getTier().toUpperCase();
            if (!Set.of("BASICO", "PADRAO", "PREMIUM").contains(tier) || !tiers.add(tier)) return "Os pacotes devem ter níveis Básico, Padrão ou Premium, sem duplicidade.";
            if (item.getName() == null || item.getName().isBlank() || item.getPrice() == null || item.getPrice().signum() <= 0
                    || item.getDeliveryDays() == null || item.getDeliveryDays() < 1 || item.getDeliveryDays() > 365)
                return "Cada pacote precisa de nome, preço positivo e prazo entre 1 e 365 dias.";
            if (item.getRevisions() == null || item.getRevisions() < 0 || item.getRevisions() > 99) return "Informe uma quantidade válida de revisões.";
            item.setTier(tier); item.setName(item.getName().trim());
        }
        return null;
    }

    private void enrich(List<ServiceOffer> services) {
        List<Long> ownerIds = services.stream().map(s -> s.getOwner().getId()).distinct().toList();
        if (ownerIds.isEmpty()) return;
        Map<Long, Double> averages = new HashMap<>(); Map<Long, Long> reviewCounts = new HashMap<>(); Map<Long, Long> jobs = new HashMap<>();
        reviews.statsForUsers(ownerIds).forEach(row -> { averages.put(((Number) row[0]).longValue(), ((Number) row[1]).doubleValue()); reviewCounts.put(((Number) row[0]).longValue(), ((Number) row[2]).longValue()); });
        serviceOrders.completedByProviderIds(ownerIds).forEach(row -> jobs.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue()));
        for (ServiceOffer service : services) {
            Long ownerId = service.getOwner().getId(); long count = reviewCounts.getOrDefault(ownerId, 0L); long completed = jobs.getOrDefault(ownerId, 0L);
            Double rating = averages.getOrDefault(ownerId, 0.0);
            service.setProviderRating(rating); service.setProviderReviewCount(count); service.setCompletedWorkCount(completed);
            service.setProviderLevel(providerLevel(completed, count, rating));
        }
    }

    private String providerLevel(long completed, long reviews, double rating) {
        if (reviews < 3) return null;
        if (completed >= 25 && rating >= 4.8) return "Destaque";
        if (completed >= 10 && rating >= 4.5) return "Experiente";
        if (completed >= 3 && rating >= 4.0) return "Ativo";
        return "Novo";
    }
}
