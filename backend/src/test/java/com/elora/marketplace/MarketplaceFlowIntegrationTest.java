package com.elora.marketplace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class MarketplaceFlowIntegrationTest {
    @Autowired TestRestTemplate http;
    @Autowired ObjectMapper json;
    @LocalServerPort int port;

    @Test
    void cadastroCatalogoFavoritosCompraEEstoqueFuncionamDePontaAPonta() throws Exception {
        register("Vendedora", "seller@example.test", "52998224725");
        String sellerToken = login("seller@example.test");
        long sellerId = json.readTree(http.exchange("/api/users/me", HttpMethod.GET, request(sellerToken, null), String.class).getBody()).get("id").asLong();

        ResponseEntity<String> created = http.exchange("/api/products", HttpMethod.POST,
                request(sellerToken, "{\"name\":\"Teclado mecânico\",\"category\":\"Eletrônicos\",\"description\":\"Teclado em ótimo estado\",\"price\":125.50,\"stock\":3,\"conditionType\":\"USADO\",\"imageUrl\":\"https://example.test/keyboard.jpg\",\"location\":\"São Paulo\"}"), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.OK);
        long productId = json.readTree(created.getBody()).get("id").asLong();

        ResponseEntity<String> search = http.getForEntity("/api/products/search?q=teclado&inStock=true", String.class);
        assertThat(search.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(json.readTree(search.getBody()).get("content")).hasSize(1);
        assertThat(http.getForEntity("/api/products/" + productId, String.class).getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> createdService = http.exchange("/api/services", HttpMethod.POST,
                request(sellerToken, "{\"title\":\"Aulas de programação\",\"category\":\"Aulas\",\"description\":\"Aulas individuais de lógica e Java\",\"price\":80,\"deliveryDays\":1,\"location\":\"São Paulo\"}"), String.class);
        assertThat(createdService.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode publicProfile = json.readTree(http.getForEntity("/api/users/" + sellerId, String.class).getBody());
        assertThat(publicProfile.get("productCount").asLong()).isEqualTo(1);
        assertThat(publicProfile.has("email")).isFalse();
        JsonNode publicProducts = json.readTree(http.getForEntity("/api/users/" + sellerId + "/products", String.class).getBody());
        assertThat(publicProducts).hasSize(1);
        assertThat(publicProducts.get(0).get("name").asText()).isEqualTo("Teclado mecânico");
        assertThat(publicProducts.get(0).has("owner")).isFalse();
        assertThat(publicProducts.get(0).has("email")).isFalse();
        JsonNode publicServices = json.readTree(http.getForEntity("/api/users/" + sellerId + "/services", String.class).getBody());
        assertThat(publicServices).hasSize(1);
        assertThat(publicServices.get(0).get("title").asText()).isEqualTo("Aulas de programação");
        ResponseEntity<String> serviceSearch = http.getForEntity("/api/services/search?page=0&size=4&sort=recent", String.class);
        assertThat(serviceSearch.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(json.readTree(serviceSearch.getBody()).get("content").toString()).contains("Aulas de programação");

        register("Comprador", "buyer@example.test", "11144477735");
        String buyerToken = login("buyer@example.test");
        long buyerId = json.readTree(http.exchange("/api/users/me", HttpMethod.GET, request(buyerToken, null), String.class).getBody()).get("id").asLong();
        JsonNode buyerProducts = json.readTree(http.getForEntity("/api/users/" + buyerId + "/products", String.class).getBody());
        assertThat(buyerProducts).isEmpty();
        JsonNode emptyReviewSummary = json.readTree(http.getForEntity("/api/reviews/user/" + buyerId + "/summary", String.class).getBody());
        assertThat(emptyReviewSummary.get("total").asLong()).isZero();
        ResponseEntity<String> favorite = http.exchange("/api/favorites", HttpMethod.POST,
                request(buyerToken, "{\"type\":\"PRODUCT\",\"itemId\":" + productId + "}"), String.class);
        assertThat(favorite.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(json.readTree(http.exchange("/api/favorites", HttpMethod.GET, request(buyerToken, null), String.class).getBody())).hasSize(1);

        ResponseEntity<String> order = http.exchange("/api/orders", HttpMethod.POST,
                request(buyerToken, "{\"paymentMethod\":\"PIX\",\"deliveryAddress\":\"Rua A, 10\",\"items\":[{\"productId\":" + productId + ",\"quantity\":2}]}"), String.class);
        assertThat(order.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode orderJson = json.readTree(order.getBody());
        assertThat(orderJson.get("totalAmount").decimalValue().compareTo(new java.math.BigDecimal("251.00"))).isZero();
        ResponseEntity<String> remaining = http.getForEntity("/api/products/" + productId, String.class);
        assertThat(json.readTree(remaining.getBody()).get("stock").asInt()).isEqualTo(1);

        ResponseEntity<String> unauthorized = http.exchange("/api/orders/mine", HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), String.class);
        assertThat(unauthorized.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        ResponseEntity<String> buyerOrders = http.exchange("/api/orders/mine", HttpMethod.GET, request(buyerToken, null), String.class);
        assertThat(json.readTree(buyerOrders.getBody())).hasSize(1);
        ResponseEntity<String> debitOrder = http.exchange("/api/orders", HttpMethod.POST,
                request(buyerToken, "{\"paymentMethod\":\"DEBIT_CARD\",\"deliveryAddress\":\"Rua A, 10\",\"items\":[{\"productId\":" + productId + ",\"quantity\":1}]}"), String.class);
        assertThat(debitOrder.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(json.readTree(debitOrder.getBody()).get("paymentMethod").asText()).isEqualTo("DEBIT_CARD");
    }

    @Test
    void mensagensContextoNaoLidasLeituraEReviewsDeCompraConcluidaFuncionam() throws Exception {
        register("Anunciante", "chat-seller@example.test", "93541134780");
        String sellerToken = login("chat-seller@example.test");
        JsonNode seller = json.readTree(http.exchange("/api/users/me", HttpMethod.GET, request(sellerToken, null), String.class).getBody());
        ResponseEntity<String> created = http.exchange("/api/products", HttpMethod.POST,
                request(sellerToken, "{\"name\":\"Câmera de teste\",\"category\":\"Eletrônicos\",\"description\":\"Câmera usada\",\"price\":250,\"stock\":2,\"conditionType\":\"USADO\",\"imageUrl\":\"https://example.test/camera.jpg\",\"location\":\"São Paulo\"}"), String.class);
        long productId = json.readTree(created.getBody()).get("id").asLong();

        register("Compradora", "chat-buyer@example.test", "16899535009");
        String buyerToken = login("chat-buyer@example.test");
        ResponseEntity<String> started = http.exchange("/api/conversations", HttpMethod.POST,
                request(buyerToken, "{\"type\":\"PRODUCT\",\"itemId\":" + productId + ",\"message\":\"Olá, ainda está disponível?\"}"), String.class);
        assertThat(started.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        long conversationId = json.readTree(started.getBody()).get("conversationId").asLong();
        JsonNode sellerInbox = json.readTree(http.exchange("/api/conversations", HttpMethod.GET, request(sellerToken, null), String.class).getBody());
        assertThat(sellerInbox.get(0).get("unreadCount").asLong()).isEqualTo(1);
        assertThat(sellerInbox.get(0).get("targetTitle").asText()).isEqualTo("Câmera de teste");
        assertThat(sellerInbox.get(0).get("targetPrice").decimalValue().compareTo(new java.math.BigDecimal("250.00"))).isZero();

        ResponseEntity<String> createdService = http.exchange("/api/services", HttpMethod.POST,
                request(sellerToken, "{\"title\":\"Aula particular\",\"category\":\"Aulas\",\"description\":\"Aulas individuais\",\"price\":90,\"deliveryDays\":1,\"location\":\"São Paulo\"}"), String.class);
        long serviceId = json.readTree(createdService.getBody()).get("id").asLong();
        ResponseEntity<String> serviceChat = http.exchange("/api/conversations", HttpMethod.POST,
                request(buyerToken, "{\"type\":\"SERVICE\",\"itemId\":" + serviceId + ",\"message\":\"Quero saber mais sobre as aulas.\"}"), String.class);
        long serviceConversationId = json.readTree(serviceChat.getBody()).get("conversationId").asLong();
        JsonNode withServiceContext = json.readTree(http.exchange("/api/conversations", HttpMethod.GET, request(sellerToken, null), String.class).getBody());
        assertThat(withServiceContext.get(0).get("targetType").asText()).isEqualTo("SERVICE");
        assertThat(withServiceContext.get(0).get("targetTitle").asText()).isEqualTo("Aula particular");
        assertThat(http.exchange("/api/conversations/" + serviceConversationId + "/messages", HttpMethod.GET, request(sellerToken, null), String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(http.exchange("/api/conversations/" + conversationId + "/messages", HttpMethod.GET, request(sellerToken, null), String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode clearedInbox = json.readTree(http.exchange("/api/conversations", HttpMethod.GET, request(sellerToken, null), String.class).getBody());
        assertThat(clearedInbox.get(0).get("unreadCount").asLong()).isZero();
        register("Outra pessoa", "outsider@example.test", "01234567890");
        String outsiderToken = login("outsider@example.test");
        ResponseEntity<String> outsider = http.exchange("/api/conversations/" + conversationId + "/messages", HttpMethod.GET, request(outsiderToken, null), String.class);
        assertThat(outsider.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<String> orderResponse = http.exchange("/api/orders", HttpMethod.POST,
                request(buyerToken, "{\"paymentMethod\":\"PIX\",\"deliveryAddress\":\"Rua A, 1\",\"items\":[{\"productId\":" + productId + ",\"quantity\":1}]}"), String.class);
        long orderId = json.readTree(orderResponse.getBody()).get("id").asLong();
        assertThat(patch(sellerToken, "/api/orders/" + orderId + "/status", "{\"status\":\"ENVIADO\"}")).isEqualTo(200);
        assertThat(patch(buyerToken, "/api/orders/" + orderId + "/status", "{\"status\":\"CONCLUIDO\"}")).isEqualTo(200);
        ResponseEntity<String> review = http.exchange("/api/reviews", HttpMethod.POST,
                request(buyerToken, "{\"type\":\"PRODUCT\",\"orderId\":" + orderId + ",\"reviewedUserId\":" + seller.get("id").asLong() + ",\"rating\":5,\"comment\":\"Ótimo atendimento.\"}"), String.class);
        assertThat(review.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ResponseEntity<String> duplicate = http.exchange("/api/reviews", HttpMethod.POST,
                request(buyerToken, "{\"type\":\"PRODUCT\",\"orderId\":" + orderId + ",\"reviewedUserId\":" + seller.get("id").asLong() + ",\"rating\":5,\"comment\":\"Outra avaliação.\"}"), String.class);
        assertThat(duplicate.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        JsonNode summary = json.readTree(http.getForEntity("/api/reviews/user/" + seller.get("id").asLong() + "/summary", String.class).getBody());
        assertThat(summary.get("total").asLong()).isEqualTo(1);
        assertThat(summary.get("distribution").get("5").asLong()).isEqualTo(1);
    }

    @Test
    void pacotesDeServicoEFluxoDeProjetoComPropostaFuncionam() throws Exception {
        register("Cliente de projeto", "project-client@example.test", "12345678909");
        String clientToken = login("project-client@example.test");
        register("Prestador de projeto", "project-provider@example.test", "98765432100");
        String providerToken = login("project-provider@example.test");

        ResponseEntity<String> serviceResponse = http.exchange("/api/services", HttpMethod.POST, request(providerToken,
                "{\"title\":\"Criação de identidade\",\"category\":\"Design\",\"description\":\"Identidade visual para pequenos negócios\",\"price\":100,\"deliveryDays\":3,\"packages\":[{" +
                "\"tier\":\"BASICO\",\"name\":\"Essencial\",\"price\":100,\"deliveryDays\":3,\"revisions\":1,\"description\":\"Logo principal\"},{" +
                "\"tier\":\"PADRAO\",\"name\":\"Completo\",\"price\":250,\"deliveryDays\":5,\"revisions\":3,\"description\":\"Logo e variações\"}] }"), String.class);
        assertThat(serviceResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        long serviceId = json.readTree(serviceResponse.getBody()).get("id").asLong();
        JsonNode serviceDetail = json.readTree(http.getForEntity("/api/services/" + serviceId, String.class).getBody());
        assertThat(serviceDetail.get("packages")).hasSize(2);
        assertThat(serviceDetail.get("packages").get(1).get("price").decimalValue().compareTo(new java.math.BigDecimal("250.00"))).isZero();
        JsonNode filteredServices = json.readTree(http.getForEntity("/api/services/search?category=Design&maxDays=5&mode=ONLINE", String.class).getBody());
        assertThat(filteredServices.get("content").toString()).contains("Criação de identidade");

        ResponseEntity<String> projectResponse = http.exchange("/api/projects", HttpMethod.POST, request(clientToken,
                "{\"title\":\"Site para minha loja\",\"description\":\"Preciso de uma página simples para apresentar a loja.\",\"category\":\"Programação\",\"budget\":1200,\"deadlineDays\":20,\"serviceMode\":\"ONLINE\"}"), String.class);
        assertThat(projectResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        long projectId = json.readTree(projectResponse.getBody()).get("id").asLong();
        JsonNode available = json.readTree(http.getForEntity("/api/projects?q=loja&category=Programação", String.class).getBody());
        assertThat(available.get("content").toString()).contains("Site para minha loja");
        ResponseEntity<String> proposalResponse = http.exchange("/api/projects/" + projectId + "/proposals", HttpMethod.POST,
                request(providerToken, "{\"amount\":1100,\"deadlineDays\":18,\"message\":\"Posso criar o site responsivo.\",\"experience\":\"Trabalho com sites\"}"), String.class);
        assertThat(proposalResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        long proposalId = json.readTree(proposalResponse.getBody()).get("id").asLong();
        assertThat(http.exchange("/api/projects/" + projectId + "/proposals", HttpMethod.POST,
                request(providerToken, "{\"amount\":1000,\"deadlineDays\":15,\"message\":\"Outra proposta\"}"), String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(http.exchange("/api/projects/" + projectId + "/proposals", HttpMethod.GET, request(providerToken, null), String.class).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(http.exchange("/api/proposals/mine", HttpMethod.GET, request(providerToken, null), String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(http.exchange("/api/proposals/" + proposalId + "/accept", HttpMethod.POST, request(clientToken, "{}"), String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(json.readTree(http.exchange("/api/projects/mine", HttpMethod.GET, request(clientToken, null), String.class).getBody()).get(0).get("status").asText()).isEqualTo("EM_ANDAMENTO");
    }

    private void register(String name, String email, String cpf) {
        ResponseEntity<String> result = http.postForEntity("/api/auth/register", Map.of(
                "name", name, "email", email, "cpf", cpf, "password", "senha-segura-123"), String.class);
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    private String login(String email) throws Exception {
        ResponseEntity<String> result = http.postForEntity("/api/auth/login", Map.of("email", email, "password", "senha-segura-123"), String.class);
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        return json.readTree(result.getBody()).get("token").asText();
    }

    private HttpEntity<String> request(String token, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    private int patch(String token, String path, String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)).build();
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString()).statusCode();
    }
}
