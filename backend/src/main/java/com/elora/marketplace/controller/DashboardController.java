package com.elora.marketplace.controller;

import com.elora.marketplace.dto.MarketplaceDTOs.Dashboard;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;

@RestController @RequestMapping("/api/dashboard") @RequiredArgsConstructor
public class DashboardController {
    private final ProductRepository products;
    private final ServiceRepository services;
    private final OrderRepository orders;
    private final ServiceOrderRepository serviceOrders;
    private final OrderItemRepository orderItems;

    @GetMapping
    public Dashboard summary() {
        AppUser user = (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        var myProducts = products.findByOwnerId(user.getId());
        BigDecimal revenue = orderItems.completedRevenueByOwner(user.getId());
        return new Dashboard(products.countByOwnerIdAndStatus(user.getId(), "ATIVO"), products.countByOwnerId(user.getId()),
                services.countByOwnerIdAndStatus(user.getId(), "ATIVO"), orders.findByBuyerId(user.getId()).size(),
                orders.findSalesBySeller(user.getId()).size(),
                serviceOrders.findByClientIdOrProviderIdOrderByCreatedAtDesc(user.getId(), user.getId()).stream()
                        .filter(o -> o.getProvider().getId().equals(user.getId())).count(),
                myProducts.stream().filter(p -> "ATIVO".equals(p.getStatus()) && p.getStock() != null && p.getStock() <= 3).count(),
                revenue == null ? BigDecimal.ZERO : revenue);
    }
}
