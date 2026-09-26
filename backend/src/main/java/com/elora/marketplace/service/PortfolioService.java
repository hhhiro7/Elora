package com.elora.marketplace.service;

import com.elora.marketplace.dto.PortfolioDTOs.*;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.model.PortfolioItem;
import com.elora.marketplace.repository.PortfolioItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

@Service @RequiredArgsConstructor
public class PortfolioService {
    private final PortfolioItemRepository items;

    public List<PortfolioView> mine(Long ownerId) { return items.findByOwnerIdOrderByCreatedAtDesc(ownerId).stream().map(this::view).toList(); }
    public List<PortfolioView> publicItems(Long ownerId) { return mine(ownerId); }

    @Transactional public PortfolioView create(AppUser owner, PortfolioRequest request) {
        validate(request);
        PortfolioItem item = new PortfolioItem(); item.setOwner(owner); apply(item, request);
        return view(items.save(item));
    }

    @Transactional public PortfolioView update(Long id, Long ownerId, PortfolioRequest request) {
        validate(request);
        PortfolioItem item = items.findById(id).orElseThrow(() -> new IllegalArgumentException("Item de portfólio não encontrado."));
        if (!item.getOwner().getId().equals(ownerId)) throw new SecurityException("Você só pode editar seu próprio portfólio.");
        apply(item, request); item.setUpdatedAt(LocalDateTime.now());
        return view(items.save(item));
    }

    @Transactional public void delete(Long id, Long ownerId) {
        PortfolioItem item = items.findById(id).orElseThrow(() -> new IllegalArgumentException("Item de portfólio não encontrado."));
        if (!item.getOwner().getId().equals(ownerId)) throw new SecurityException("Você só pode remover itens do seu próprio portfólio.");
        items.delete(item);
    }

    private void validate(PortfolioRequest request) {
        if (request == null || blank(request.title()) || request.title().trim().length() > 140 || blank(request.description()) || request.description().trim().length() > 1200 || blank(request.category()) || request.category().trim().length() > 80)
            throw new IllegalArgumentException("Informe título, descrição e categoria nos limites indicados.");
        if (length(request.technologies()) > 500) throw new IllegalArgumentException("Tecnologias: máximo de 500 caracteres.");
        if (length(request.imageUrl()) > 500 || length(request.projectUrl()) > 500 || !validUrl(request.imageUrl()) || !validUrl(request.projectUrl())) throw new IllegalArgumentException("Use URLs HTTP ou HTTPS válidas com até 500 caracteres.");
    }
    private boolean validUrl(String value) {
        if (blank(value)) return true;
        try { String scheme = URI.create(value.trim()).getScheme(); return "https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme); }
        catch (IllegalArgumentException ignored) { return false; }
    }
    private void apply(PortfolioItem item, PortfolioRequest request) {
        item.setTitle(request.title().trim()); item.setDescription(request.description().trim()); item.setCategory(request.category().trim());
        item.setTechnologies(clean(request.technologies())); item.setImageUrl(clean(request.imageUrl())); item.setProjectUrl(clean(request.projectUrl()));
    }
    private PortfolioView view(PortfolioItem item) { return new PortfolioView(item.getId(), item.getOwner().getId(), item.getTitle(), item.getDescription(), item.getCategory(), item.getTechnologies(), item.getImageUrl(), item.getProjectUrl(), item.getCreatedAt(), item.getUpdatedAt()); }
    private String clean(String value) { return blank(value) ? null : value.trim(); }
    private int length(String value) { return value == null ? 0 : value.length(); }
    private boolean blank(String value) { return value == null || value.isBlank(); }
}
