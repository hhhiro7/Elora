package com.elora.marketplace.dto;

import java.time.LocalDateTime;
import java.math.BigDecimal;

public final class MarketplaceDTOs {
    private MarketplaceDTOs() {}
    public record PageResult<T>(java.util.List<T> content, int page, int size, long totalElements, int totalPages, boolean hasNext) {}
    public record ProfileUpdate(String name, String city, String bio, String avatarUrl, String phone) {}
    public record PasswordUpdate(String currentPassword, String newPassword) {}
    public record PublicProfile(Long id, String name, String city, String bio, String avatarUrl,
                                LocalDateTime joinedAt, long productCount, long serviceCount,
                                Double rating, long reviewCount, long salesCount) {}
    public record MyProfile(Long id, String name, String email, String city, String bio,
                            String avatarUrl, String phone, LocalDateTime joinedAt,
                            long productCount, long serviceCount, Double rating, long reviewCount) {}
    public record FavoriteRequest(String type, Long itemId) {}
    public record FavoriteView(Long id, String type, Long itemId, String title, String imageUrl,
                               BigDecimal price, String link, LocalDateTime createdAt) {}
    public record StartConversation(String type, Long itemId, String message) {}
    public record SendMessage(String content) {}
    public record ConversationView(Long id, Long otherUserId, String otherUserName, String otherUserAvatar,
                                   String targetType, Long targetId, String targetTitle, String lastMessage,
                                   LocalDateTime updatedAt, long unreadCount, String targetImageUrl, BigDecimal targetPrice) {}
    public record MessageView(Long id, Long senderId, String senderName, String content, LocalDateTime createdAt, boolean read) {}
    public record ServiceOrderRequest(Long serviceId, String description) {}
    public record StatusUpdate(String status) {}
    public record ReviewRequest(String type, Long orderId, Long serviceOrderId, Long reviewedUserId,
                                Integer rating, String comment) {}
    public record ReviewView(Long id, Long reviewerId, String reviewerName, Integer rating,
                             String comment, LocalDateTime createdAt) {}
    public record ReviewSummary(Double average, long total, java.util.Map<Integer, Long> distribution) {}
    public record Dashboard(long activeProducts, long totalProducts, long activeServices,
                            long buyerOrders, long sellerOrders, long providerOrders, long lowStockProducts,
                            BigDecimal simulatedRevenue) {}
}
