package com.elora.marketplace.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class InteractionDTOs {
    private InteractionDTOs() {}
    public record NotificationView(Long id, String type, String title, String message, String link,
                                   LocalDateTime readAt, LocalDateTime createdAt) {}
    public record NegotiationRequest(BigDecimal amount, String message) {}
    public record CounterOfferRequest(BigDecimal amount, String message) {}
    public record NegotiationView(Long id, Long productId, String productName, String productImage,
                                  BigDecimal listedPrice, Long buyerId, String buyerName, Long sellerId, String sellerName,
                                  BigDecimal buyerOffer, BigDecimal sellerCounteroffer, String status,
                                  String buyerMessage, String sellerMessage,
                                  LocalDateTime createdAt, LocalDateTime updatedAt) {}
}
