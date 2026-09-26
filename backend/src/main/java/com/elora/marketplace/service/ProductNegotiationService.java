package com.elora.marketplace.service;

import com.elora.marketplace.dto.InteractionDTOs.*;
import com.elora.marketplace.model.*;
import com.elora.marketplace.repository.ProductNegotiationRepository;
import com.elora.marketplace.repository.ProductRepository;
import com.elora.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service @RequiredArgsConstructor
public class ProductNegotiationService {
    private static final List<String> ACTIVE = List.of("PENDENTE", "CONTRAPROPOSTA");
    private final ProductNegotiationRepository negotiations;
    private final ProductRepository products;
    private final UserRepository users;
    private final MarketplaceNotificationService notifications;

    @Transactional public NegotiationView create(Long productId, Long buyerId, NegotiationRequest request) {
        Product product = products.findByIdForUpdate(productId).orElseThrow(() -> new IllegalArgumentException("Este anúncio não está disponível."));
        AppUser buyer = users.findById(buyerId).orElseThrow();
        if (!"ATIVO".equals(product.getStatus()) || product.getStock() == null || product.getStock() < 1) throw new IllegalArgumentException("Este anúncio está indisponível para negociação.");
        if (product.getOwner().getId().equals(buyerId)) throw new IllegalArgumentException("Você não pode negociar seu próprio anúncio.");
        validateAmount(request == null ? null : request.amount(), product.getPrice(), "A proposta precisa ser positiva e não pode ultrapassar o preço anunciado.");
        String message = clean(request.message()); if (message.isBlank() || message.length() > 600) throw new IllegalArgumentException("Explique sua proposta em até 600 caracteres.");
        if (negotiations.existsByProductIdAndBuyerIdAndStatusIn(productId, buyerId, ACTIVE)) throw new IllegalArgumentException("Você já tem uma negociação aberta para este anúncio.");
        ProductNegotiation item = new ProductNegotiation(); item.setProduct(product); item.setBuyer(buyer); item.setSeller(product.getOwner());
        item.setBuyerOffer(request.amount()); item.setBuyerMessage(message);
        item = negotiations.save(item);
        notifications.notify(product.getOwner(), "PROPOSTA_PRODUTO", "Nova proposta de compra", buyer.getName() + " enviou uma proposta para " + product.getName() + ".", "negociacoes.html?id=" + item.getId());
        return view(item);
    }

    @Transactional public NegotiationView counter(Long id, Long userId, CounterOfferRequest request) {
        ProductNegotiation item = owned(id, userId, "seller");
        if (!"PENDENTE".equals(item.getStatus())) throw new IllegalArgumentException("Esta proposta não aceita contraproposta agora.");
        validateAmount(request == null ? null : request.amount(), item.getProduct().getPrice(), "A contraproposta precisa ser positiva e não pode ultrapassar o preço anunciado.");
        String message = clean(request.message()); if (message.length() > 600) throw new IllegalArgumentException("A mensagem pode ter até 600 caracteres.");
        item.setSellerCounteroffer(request.amount()); item.setSellerMessage(message); item.setStatus("CONTRAPROPOSTA"); item.setUpdatedAt(LocalDateTime.now());
        item = negotiations.save(item);
        notifications.notify(item.getBuyer(), "CONTRAPROPOSTA", "O vendedor enviou uma contraproposta", item.getProduct().getName() + " · " + request.amount(), "negociacoes.html?id=" + id);
        return view(item);
    }

    @Transactional public NegotiationView accept(Long id, Long userId) {
        ProductNegotiation item = negotiations.findById(id).orElseThrow(() -> new IllegalArgumentException("Negociação não encontrada."));
        if ("PENDENTE".equals(item.getStatus()) && item.getSeller().getId().equals(userId)) { item.setStatus("ACEITA"); }
        else if ("CONTRAPROPOSTA".equals(item.getStatus()) && item.getBuyer().getId().equals(userId)) { item.setStatus("ACEITA"); }
        else throw new IllegalArgumentException("Você não pode aceitar esta etapa da negociação.");
        item.setUpdatedAt(LocalDateTime.now()); item = negotiations.save(item);
        AppUser other = item.getBuyer().getId().equals(userId) ? item.getSeller() : item.getBuyer();
        notifications.notify(other, "PROPOSTA_ACEITA", "Proposta aceita", "A negociação de " + item.getProduct().getName() + " foi aceita. Combine os próximos passos por mensagem.", "produto.html?id=" + item.getProduct().getId());
        return view(item);
    }

    @Transactional public NegotiationView reject(Long id, Long userId) {
        ProductNegotiation item = negotiations.findById(id).orElseThrow(() -> new IllegalArgumentException("Negociação não encontrada."));
        boolean sellerCan = "PENDENTE".equals(item.getStatus()) && item.getSeller().getId().equals(userId);
        boolean buyerCan = "CONTRAPROPOSTA".equals(item.getStatus()) && item.getBuyer().getId().equals(userId);
        if (!sellerCan && !buyerCan) throw new IllegalArgumentException("Você não pode recusar esta etapa da negociação.");
        item.setStatus("RECUSADA"); item.setUpdatedAt(LocalDateTime.now()); item = negotiations.save(item);
        AppUser other = item.getBuyer().getId().equals(userId) ? item.getSeller() : item.getBuyer();
        notifications.notify(other, "PROPOSTA_RECUSADA", "Negociação encerrada", "A proposta para " + item.getProduct().getName() + " foi recusada.", "negociacoes.html?id=" + id);
        return view(item);
    }

    @Transactional public NegotiationView cancel(Long id, Long userId) {
        ProductNegotiation item = owned(id, userId, "buyer");
        if (!"PENDENTE".equals(item.getStatus())) throw new IllegalArgumentException("Somente uma proposta aguardando resposta pode ser cancelada.");
        item.setStatus("CANCELADA"); item.setUpdatedAt(LocalDateTime.now()); item = negotiations.save(item);
        notifications.notify(item.getSeller(), "PROPOSTA_CANCELADA", "Proposta cancelada", "O comprador cancelou a proposta para " + item.getProduct().getName() + ".", "negociacoes.html?id=" + id);
        return view(item);
    }

    public List<NegotiationView> mine(Long userId) { return negotiations.findByBuyerIdOrSellerIdOrderByUpdatedAtDesc(userId, userId).stream().map(this::view).toList(); }

    private ProductNegotiation owned(Long id, Long userId, String side) {
        ProductNegotiation item = negotiations.findById(id).orElseThrow(() -> new IllegalArgumentException("Negociação não encontrada."));
        boolean allowed = "buyer".equals(side) ? item.getBuyer().getId().equals(userId) : item.getSeller().getId().equals(userId);
        if (!allowed) throw new SecurityException("Esta negociação pertence a outra conta.");
        return item;
    }
    private void validateAmount(BigDecimal amount, BigDecimal limit, String message) {
        if (amount == null || amount.signum() <= 0 || amount.scale() > 2 || amount.precision() > 12 || limit == null || amount.compareTo(limit) > 0) throw new IllegalArgumentException(message);
    }
    private String clean(String value) { return value == null ? "" : value.trim(); }
    private NegotiationView view(ProductNegotiation n) { return new NegotiationView(n.getId(), n.getProduct().getId(), n.getProduct().getName(), n.getProduct().getImageUrl(), n.getProduct().getPrice(), n.getBuyer().getId(), n.getBuyer().getName(), n.getSeller().getId(), n.getSeller().getName(), n.getBuyerOffer(), n.getSellerCounteroffer(), n.getStatus(), n.getBuyerMessage(), n.getSellerMessage(), n.getCreatedAt(), n.getUpdatedAt()); }
}
