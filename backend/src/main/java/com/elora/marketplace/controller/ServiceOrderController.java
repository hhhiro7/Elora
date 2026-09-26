package com.elora.marketplace.controller;

import com.elora.marketplace.dto.MarketplaceDTOs.ServiceOrderRequest;
import com.elora.marketplace.dto.MarketplaceDTOs.StatusUpdate;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.model.ServiceOrder;
import com.elora.marketplace.repository.ServiceOrderRepository;
import com.elora.marketplace.repository.ServiceRepository;
import com.elora.marketplace.model.ServicePackage;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;

@RestController @RequestMapping("/api/service-orders") @RequiredArgsConstructor
public class ServiceOrderController {
    private final ServiceOrderRepository orders;
    private final ServiceRepository services;

    private AppUser currentUser() { return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal(); }

    @GetMapping
    public java.util.List<ServiceOrder> mine() {
        Long id = currentUser().getId();
        return orders.findByClientIdOrProviderIdOrderByCreatedAtDesc(id, id);
    }

    @PostMapping @Transactional
    public ResponseEntity<?> create(@RequestBody ServiceOrderRequest request) {
        if (request.serviceId() == null || request.description() == null || request.description().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Escolha o serviço e descreva o que precisa."));
        var service = services.findById(request.serviceId()).filter(s -> "ATIVO".equals(s.getStatus())).orElse(null);
        if (service == null) return ResponseEntity.notFound().build();
        AppUser client = currentUser();
        if (service.getOwner().getId().equals(client.getId())) return ResponseEntity.badRequest().body(Map.of("message", "Você não pode contratar seu próprio serviço."));
        ServicePackage selectedPackage = null;
        if (request.packageId() != null) {
            selectedPackage = service.getPackages().stream().filter(p -> p.getId().equals(request.packageId())).findFirst().orElse(null);
            if (selectedPackage == null) return ResponseEntity.badRequest().body(Map.of("message", "O pacote escolhido não pertence a este serviço."));
        }
        ServiceOrder order = new ServiceOrder();
        order.setClient(client); order.setProvider(service.getOwner()); order.setService(service);
        order.setSelectedPackage(selectedPackage);
        order.setAgreedPackageName(selectedPackage == null ? "Serviço" : selectedPackage.getName());
        order.setDeliveryDays(selectedPackage == null ? service.getDeliveryDays() : selectedPackage.getDeliveryDays());
        order.setAgreedPrice(selectedPackage == null ? service.getPrice() : selectedPackage.getPrice());
        String description = request.description().trim();
        order.setRequestDescription(description.substring(0, Math.min(description.length(), 2000)));
        return ResponseEntity.status(201).body(orders.save(order));
    }

    @PatchMapping("/{id}/status") @Transactional
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody StatusUpdate request) {
        ServiceOrder order = orders.findById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        AppUser user = currentUser();
        boolean client = order.getClient().getId().equals(user.getId());
        boolean provider = order.getProvider().getId().equals(user.getId());
        String current = order.getStatus();
        String next = request.status() == null ? "" : request.status().toUpperCase();
        boolean allowed = (provider && "SOLICITADO".equals(current) && ListStatus.PROVIDER_FIRST.contains(next))
                || (provider && "ACEITO".equals(current) && "EM_ANDAMENTO".equals(next))
                || (provider && "EM_ANDAMENTO".equals(current) && "AGUARDANDO_APROVACAO".equals(next))
                || (client && "SOLICITADO".equals(current) && "CANCELADO".equals(next))
                || (client && "AGUARDANDO_APROVACAO".equals(current) && "CONCLUIDO".equals(next));
        if (!allowed) return ResponseEntity.status(403).body(Map.of("message", "Essa mudança de status não está disponível."));
        order.setStatus(next); order.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(orders.save(order));
    }

    private static final class ListStatus { static final java.util.Set<String> PROVIDER_FIRST = java.util.Set.of("ACEITO", "RECUSADO"); }
}
