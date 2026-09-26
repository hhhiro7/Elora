package com.elora.marketplace.dto;

import java.time.LocalDateTime;

public final class QuestionDTOs {
    private QuestionDTOs() {}
    public record QuestionRequest(String question) {}
    public record AnswerRequest(String answer) {}
    public record QuestionView(Long id, Long listingId, String listingType, Long askerId, String askerName,
                               String question, String answer, String responderName,
                               LocalDateTime createdAt, LocalDateTime answeredAt) {}
}
