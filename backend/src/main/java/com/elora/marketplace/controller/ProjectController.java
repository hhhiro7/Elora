package com.elora.marketplace.controller;

import com.elora.marketplace.dto.MarketplaceDTOs.*;
import com.elora.marketplace.model.*;
import com.elora.marketplace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import com.elora.marketplace.service.MarketplaceNotificationService;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController @RequiredArgsConstructor
public class ProjectController {
    private final ProjectRepository projects;
    private final ProposalRepository proposals;
    private final UserRepository users;
    private final MarketplaceNotificationService notifications;

    private AppUser currentUser() { return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal(); }

    @GetMapping("/api/projects")
    public PageResult<ProjectView> browse(@RequestParam(required = false) String q,
            @RequestParam(required = false) String category, @RequestParam(required = false) BigDecimal maxBudget,
            @RequestParam(required = false) String location, @RequestParam(required = false) String mode,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size) {
        var result = projects.searchOpen(clean(q), clean(category), maxBudget, clean(location), cleanMode(mode),
                PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 48)), Sort.by("createdAt").descending()));
        return new PageResult<>(result.getContent().stream().map(this::view).toList(), result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages(), result.hasNext());
    }

    @GetMapping("/api/projects/mine")
    public List<ProjectView> mine() { return projects.findByClientIdOrderByCreatedAtDesc(currentUser().getId()).stream().map(this::view).toList(); }

    @GetMapping("/api/projects/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        return projects.findById(id).filter(p -> "ABERTO".equals(p.getStatus())).<ResponseEntity<?>>map(p -> ResponseEntity.ok(view(p)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/api/projects")
    public ResponseEntity<?> create(@RequestBody ProjectRequest request) {
        String error = validate(request);
        if (error != null) return ResponseEntity.badRequest().body(Map.of("message", error));
        Project project = new Project();
        project.setClient(currentUser()); project.setTitle(request.title().trim());
        project.setDescription(request.description().trim()); project.setCategory(request.category().trim());
        project.setBudget(request.budget()); project.setDeadlineDays(request.deadlineDays());
        project.setLocation(clean(request.location())); project.setServiceMode(cleanMode(request.serviceMode()));
        project.setStatus("ABERTO");
        return ResponseEntity.status(201).body(view(projects.save(project)));
    }

    @GetMapping("/api/projects/{id}/proposals")
    public ResponseEntity<?> received(@PathVariable Long id) {
        Project project = projects.findById(id).orElse(null);
        if (project == null) return ResponseEntity.notFound().build();
        if (!project.getClient().getId().equals(currentUser().getId())) return ResponseEntity.status(403).body(Map.of("message", "Somente quem publicou o projeto pode ver as propostas recebidas."));
        return ResponseEntity.ok(proposals.findByProjectIdOrderByCreatedAtDesc(id).stream().map(this::view).toList());
    }

    @PostMapping("/api/projects/{id}/proposals")
    public ResponseEntity<?> propose(@PathVariable Long id, @RequestBody ProposalRequest request) {
        Project project = projects.findById(id).orElse(null);
        if (project == null || !"ABERTO".equals(project.getStatus())) return ResponseEntity.notFound().build();
        AppUser provider = currentUser();
        if (project.getClient().getId().equals(provider.getId())) return ResponseEntity.badRequest().body(Map.of("message", "Você não pode enviar proposta ao próprio projeto."));
        if (request.amount() == null || request.amount().signum() <= 0 || request.amount().precision() > 12 || request.amount().scale() > 2
                || request.deadlineDays() == null || request.deadlineDays() < 1 || request.deadlineDays() > 365
                || request.message() == null || request.message().isBlank() || request.message().trim().length() > 1600
                || request.experience() != null && request.experience().length() > 800)
            return ResponseEntity.badRequest().body(Map.of("message", "Informe um valor válido, prazo de 1 a 365 dias e uma mensagem de até 1.600 caracteres."));
        if (proposals.existsByProjectIdAndProviderId(id, provider.getId())) return ResponseEntity.badRequest().body(Map.of("message", "Você já enviou uma proposta para este projeto."));
        Proposal proposal = new Proposal(); proposal.setProject(project); proposal.setProvider(provider);
        proposal.setAmount(request.amount()); proposal.setDeadlineDays(request.deadlineDays());
        proposal.setMessage(request.message().trim()); proposal.setExperience(clean(request.experience()));
        Proposal saved = proposals.save(proposal);
        notifications.notify(project.getClient(), "NOVA_PROPOSTA", "Nova proposta para seu projeto", provider.getName() + " enviou uma proposta para " + project.getTitle() + ".", "meus-projetos.html");
        return ResponseEntity.status(201).body(view(saved));
    }

    @PostMapping("/api/proposals/{id}/accept") @Transactional
    public ResponseEntity<?> accept(@PathVariable Long id) {
        Proposal proposal = proposals.findById(id).orElse(null);
        if (proposal == null) return ResponseEntity.notFound().build();
        Project project = projects.findByIdForUpdate(proposal.getProject().getId()).orElse(null);
        if (project == null) return ResponseEntity.notFound().build();
        if (!project.getClient().getId().equals(currentUser().getId())) return ResponseEntity.status(403).body(Map.of("message", "Somente quem publicou o projeto pode aceitar uma proposta."));
        if (!"ABERTO".equals(project.getStatus()) || !"ENVIADA".equals(proposal.getStatus())) return ResponseEntity.badRequest().body(Map.of("message", "Este projeto não está mais recebendo propostas."));
        proposal.setStatus("ACEITA"); proposal.setUpdatedAt(LocalDateTime.now());
        proposals.findByProjectIdOrderByCreatedAtDesc(project.getId()).stream().filter(other -> !other.getId().equals(id) && "ENVIADA".equals(other.getStatus())).forEach(other -> { other.setStatus("NAO_SELECIONADA"); other.setUpdatedAt(LocalDateTime.now()); });
        project.setStatus("EM_ANDAMENTO"); project.setUpdatedAt(LocalDateTime.now());
        proposals.saveAll(proposals.findByProjectIdOrderByCreatedAtDesc(project.getId()));
        projects.save(project);
        notifications.notify(proposal.getProvider(), "PROPOSTA_ACEITA", "Sua proposta foi aceita", "Sua proposta para " + project.getTitle() + " foi aceita.", "propostas.html");
        return ResponseEntity.ok(view(proposal));
    }

    @PatchMapping("/api/projects/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody StatusUpdate request) {
        Project project = projects.findById(id).orElse(null);
        if (project == null) return ResponseEntity.notFound().build();
        if (!project.getClient().getId().equals(currentUser().getId())) return ResponseEntity.status(403).body(Map.of("message", "Você só pode atualizar seus próprios projetos."));
        String next = request.status() == null ? "" : request.status().toUpperCase();
        boolean allowed = "ABERTO".equals(project.getStatus()) && "CANCELADO".equals(next)
                || "EM_ANDAMENTO".equals(project.getStatus()) && Set.of("CONCLUIDO", "CANCELADO").contains(next);
        if (!allowed) return ResponseEntity.badRequest().body(Map.of("message", "Essa mudança de status não está disponível."));
        project.setStatus(next); project.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(view(projects.save(project)));
    }

    @GetMapping("/api/proposals/mine")
    public List<ProposalView> sent() { return proposals.findByProviderIdOrderByCreatedAtDesc(currentUser().getId()).stream().map(this::view).toList(); }

    private ProjectView view(Project project) {
        return new ProjectView(project.getId(), project.getClient().getId(), project.getClient().getName(), project.getClient().getAvatarUrl(),
                project.getTitle(), project.getDescription(), project.getCategory(), project.getBudget(), project.getDeadlineDays(),
                project.getLocation(), project.getServiceMode(), project.getStatus(), proposals.countByProjectId(project.getId()), project.getCreatedAt(), project.getUpdatedAt());
    }

    private ProposalView view(Proposal proposal) {
        return new ProposalView(proposal.getId(), proposal.getProject().getId(), proposal.getProject().getTitle(),
                proposal.getProvider().getId(), proposal.getProvider().getName(), proposal.getProvider().getAvatarUrl(),
                proposal.getAmount(), proposal.getDeadlineDays(), proposal.getMessage(), proposal.getExperience(),
                proposal.getStatus(), proposal.getCreatedAt());
    }

    private String validate(ProjectRequest request) {
        if (request.title() == null || request.title().isBlank() || request.title().trim().length() > 160
                || request.description() == null || request.description().isBlank() || request.description().trim().length() > 3000
                || request.category() == null || request.category().isBlank() || request.category().trim().length() > 80)
            return "Informe título, descrição (até 3.000 caracteres) e categoria.";
        if (request.budget() != null && (request.budget().signum() <= 0 || request.budget().precision() > 12 || request.budget().scale() > 2)) return "O orçamento precisa ser um valor positivo válido.";
        if (request.deadlineDays() != null && (request.deadlineDays() < 1 || request.deadlineDays() > 365)) return "O prazo deve ficar entre 1 e 365 dias.";
        if (request.location() != null && request.location().length() > 120) return "A localização pode ter no máximo 120 caracteres.";
        return null;
    }
    private String clean(String value) { return value == null ? "" : value.trim(); }
    private String cleanMode(String value) { return value != null && Set.of("ONLINE", "PRESENCIAL", "AMBOS").contains(value.toUpperCase()) ? value.toUpperCase() : "ONLINE"; }
}
