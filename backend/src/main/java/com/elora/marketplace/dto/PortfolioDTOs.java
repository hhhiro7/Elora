package com.elora.marketplace.dto;

import java.time.LocalDateTime;

public final class PortfolioDTOs {
    private PortfolioDTOs() {}
    public record PortfolioRequest(String title, String description, String category, String technologies, String imageUrl, String projectUrl) {}
    public record PortfolioView(Long id, Long ownerId, String title, String description, String category,
                                String technologies, String imageUrl, String projectUrl, LocalDateTime createdAt, LocalDateTime updatedAt) {}
}
