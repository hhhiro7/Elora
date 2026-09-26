package com.elora.marketplace.controller;
import com.elora.marketplace.dto.OrderDTOs.*;
import com.elora.marketplace.model.AppOrder;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.model.OrderItem;
import com.elora.marketplace.model.Product;
import com.elora.marketplace.repository.OrderRepository;
import com.elora.marketplace.repository.ProductRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import com.elora.marketplace.dto.MarketplaceDTOs.StatusUpdate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import com.elora.marketplace.service.MarketplaceNotificationService;

@RestController @RequestMapping("/api/orders") @RequiredArgsConstructor
public class OrderController {
    private final OrderRepository orderRepo;
    private final ProductRepository productRepo;
    private final MarketplaceNotificationService notifications;

    private AppUser currentUser() {
        return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @GetMapping("/mine")
    public List<AppOrder> myOrders() {
        return orderRepo.findByBuyerId(currentUser().getId());
    }

    @GetMapping("/sales")
    public List<AppOrder> sales() { return orderRepo.findSalesBySeller(currentUser().getId()); }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(@PathVariable Long id) {
        var order = orderRepo.findById(id);
        if (order.isEmpty()) return ResponseEntity.notFound().build();
        AppUser user = currentUser();
        boolean buyer = order.get().getBuyer().getId().equals(user.getId());
        boolean seller = order.get().getItems().stream().anyMatch(i -> i.getProduct().getOwner().getId().equals(user.getId()));
        if (!buyer && !seller) return ResponseEntity.status(403).body("Este pedido não pertence à sua conta.");
        return ResponseEntity.ok(order.get());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createOrder(@RequestBody OrderReq req) {
        if (req.items() == null || req.items().isEmpty()) {
            return ResponseEntity.badRequest().body("O pedido precisa ter pelo menos um item.");
        }
        if (req.paymentMethod() == null || !List.of("PIX", "CREDIT_CARD", "DEBIT_CARD").contains(req.paymentMethod())) return ResponseEntity.badRequest().body("Forma de pagamento inválida.");
        if (req.deliveryAddress() != null && req.deliveryAddress().length() > 1000) return ResponseEntity.badRequest().body("O endereço é muito longo.");

        java.util.Map<Long, Integer> requested = new java.util.LinkedHashMap<>();
        for (OrderItemReq item : req.items()) {
            if (item.productId() == null || item.quantity() == null || item.quantity() <= 0)
                return ResponseEntity.badRequest().body("Produto ou quantidade inválidos.");
            requested.merge(item.productId(), item.quantity(), Integer::sum);
        }
        java.util.Map<Long, Product> products = new java.util.LinkedHashMap<>();
        for (var entry : requested.entrySet()) {
            Product product = productRepo.findByIdForUpdate(entry.getKey()).orElse(null);
            if (product == null || !"ATIVO".equals(product.getStatus())) return ResponseEntity.badRequest().body("Um dos produtos não está mais disponível.");
            if (product.getOwner() != null && product.getOwner().getId().equals(currentUser().getId())) return ResponseEntity.badRequest().body("Você não pode comprar seu próprio anúncio.");
            if (product.getPrice() == null || product.getPrice().signum() <= 0) return ResponseEntity.badRequest().body("Um dos anúncios tem preço inválido.");
            if (product.getStock() == null || product.getStock() < entry.getValue()) return ResponseEntity.badRequest().body("Estoque insuficiente para " + product.getName() + ".");
            products.put(entry.getKey(), product);
        }

        // 2) Montar o pedido. O preço usado é sempre o preço atual do produto no banco,
        // nunca um valor vindo do frontend (evita que o cliente "escolha" o preço).
        AppOrder order = new AppOrder();
        order.setBuyer(currentUser());
        order.setPaymentMethod(req.paymentMethod());
        order.setDeliveryAddress(req.deliveryAddress());
        order.setStatus("PAGAMENTO_CONFIRMADO"); // Simulação de PIX/Cartão

        BigDecimal total = BigDecimal.ZERO;

        for (var entry : requested.entrySet()) {
            Product product = products.get(entry.getKey());
            int quantity = entry.getValue();

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(quantity);
            item.setUnitPrice(product.getPrice());
            BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(quantity));
            item.setSubtotal(subtotal);

            order.getItems().add(item);
            total = total.add(subtotal);

            // 3) Descontar o estoque.
            product.setStock(product.getStock() - quantity);
            productRepo.save(product);
        }

        order.setTotalAmount(total);
        AppOrder saved = orderRepo.save(order);
        products.values().stream().map(Product::getOwner).distinct().forEach(owner -> notifications.notify(owner, "PEDIDO_CONFIRMADO", "Novo pedido", "Um produto do seu anúncio foi comprado.", "minhas-vendas.html"));
        return ResponseEntity.status(201).body(saved);
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody StatusUpdate request) {
        AppOrder order = orderRepo.findById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        AppUser user = currentUser();
        boolean buyer = order.getBuyer().getId().equals(user.getId());
        boolean seller = order.getItems().stream().anyMatch(i -> i.getProduct().getOwner().getId().equals(user.getId()));
        String next = request.status() == null ? "" : request.status().toUpperCase();
        boolean allowed = (seller && List.of("PAGAMENTO_CONFIRMADO", "ENVIADO").contains(order.getStatus()) && "ENVIADO".equals(next))
                || (buyer && "ENVIADO".equals(order.getStatus()) && "CONCLUIDO".equals(next))
                || (buyer && "PAGAMENTO_CONFIRMADO".equals(order.getStatus()) && "CANCELADO".equals(next));
        if (!allowed) return ResponseEntity.status(403).body("Essa mudança de status não está disponível para sua conta.");
        if (buyer && "CANCELADO".equals(next)) order.getItems().forEach(item -> {
            Product product = item.getProduct(); product.setStock((product.getStock() == null ? 0 : product.getStock()) + item.getQuantity()); productRepo.save(product);
        });
        order.setStatus(next);
        return ResponseEntity.ok(orderRepo.save(order));
    }
}
