package com.elora.marketplace.service;

import com.elora.marketplace.dto.QuestionDTOs.*;
import com.elora.marketplace.model.*;
import com.elora.marketplace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service @RequiredArgsConstructor
public class ListingQuestionService {
    private final ListingQuestionRepository questions;
    private final ProductRepository products;
    private final ServiceRepository services;
    private final UserRepository users;
    private final MarketplaceNotificationService notifications;

    public List<QuestionView> list(String type, Long listingId) {
        List<ListingQuestion> values = "PRODUCT".equals(type) ? questions.findByProductIdOrderByCreatedAtDesc(listingId) : questions.findByServiceIdOrderByCreatedAtDesc(listingId);
        return values.stream().map(item -> view(item, type)).toList();
    }

    @Transactional public QuestionView ask(String type, Long listingId, Long askerId, QuestionRequest request) {
        if (request == null || request.question() == null || request.question().isBlank() || request.question().trim().length() > 1000) throw new IllegalArgumentException("A pergunta é obrigatória e deve ter até 1.000 caracteres.");
        AppUser asker = users.findById(askerId).orElseThrow(); ListingQuestion item = new ListingQuestion(); AppUser owner; String title;
        if ("PRODUCT".equals(type)) {
            Product product = products.findById(listingId).filter(p -> "ATIVO".equals(p.getStatus())).orElseThrow(() -> new IllegalArgumentException("Este anúncio não está disponível."));
            owner = product.getOwner(); title = product.getName(); item.setProduct(product);
        } else {
            ServiceOffer service = services.findById(listingId).filter(s -> "ATIVO".equals(s.getStatus())).orElseThrow(() -> new IllegalArgumentException("Este serviço não está disponível."));
            owner = service.getOwner(); title = service.getTitle(); item.setService(service);
        }
        if (owner.getId().equals(askerId)) throw new IllegalArgumentException("Você não pode perguntar no próprio anúncio.");
        item.setAsker(asker); item.setQuestion(request.question().trim()); item = questions.save(item);
        notifications.notify(owner, "PERGUNTA_ANUNCIO", "Nova pergunta no seu anúncio", asker.getName() + " fez uma pergunta sobre " + title + ".", "notificacoes.html");
        return view(item, type);
    }

    @Transactional public QuestionView answer(Long id, Long ownerId, AnswerRequest request) {
        if (request == null || request.answer() == null || request.answer().isBlank() || request.answer().trim().length() > 1000) throw new IllegalArgumentException("A resposta é obrigatória e deve ter até 1.000 caracteres.");
        ListingQuestion item = questions.findById(id).orElseThrow(() -> new IllegalArgumentException("Pergunta não encontrada."));
        AppUser owner = item.getProduct() != null ? item.getProduct().getOwner() : item.getService().getOwner();
        if (!owner.getId().equals(ownerId)) throw new SecurityException("Somente o anunciante pode responder esta pergunta.");
        if (item.getAnswer() != null) throw new IllegalArgumentException("Esta pergunta já foi respondida.");
        item.setAnswer(request.answer().trim()); item.setResponder(owner); item.setAnsweredAt(LocalDateTime.now()); item = questions.save(item);
        String type = item.getProduct() != null ? "PRODUCT" : "SERVICE";
        String title = item.getProduct() != null ? item.getProduct().getName() : item.getService().getTitle();
        notifications.notify(item.getAsker(), "RESPOSTA_PERGUNTA", "Sua pergunta foi respondida", owner.getName() + " respondeu sua pergunta sobre " + title + ".", "notificacoes.html");
        return view(item, type);
    }

    private QuestionView view(ListingQuestion item, String type) {
        Long listingId = item.getProduct() != null ? item.getProduct().getId() : item.getService().getId();
        return new QuestionView(item.getId(), listingId, type, item.getAsker().getId(), item.getAsker().getName(), item.getQuestion(), item.getAnswer(), item.getResponder() == null ? null : item.getResponder().getName(), item.getCreatedAt(), item.getAnsweredAt());
    }
}
