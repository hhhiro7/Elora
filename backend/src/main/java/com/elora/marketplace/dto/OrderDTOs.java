package com.elora.marketplace.dto;
import java.util.List;

public class OrderDTOs {
    public record OrderItemReq(Long productId, Integer quantity) {}
    public record OrderReq(String paymentMethod, String deliveryAddress, List<OrderItemReq> items) {}
}
