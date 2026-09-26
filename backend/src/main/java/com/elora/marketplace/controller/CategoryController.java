package com.elora.marketplace.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController @RequestMapping("/api/categories")
public class CategoryController {
    private static final List<String> PRODUCTS = List.of("Eletrônicos", "Moda", "Casa", "Esportes", "Games", "Livros", "Acessórios", "Outros");
    private static final List<String> SERVICES = List.of("Programação", "Design", "Marketing", "Social Media", "Edição de vídeo", "Fotografia", "Redação", "Tradução", "Música", "Aulas", "Consultoria", "Arquitetura", "3D", "Finanças", "Outros");
    @GetMapping public List<String> list(@RequestParam(defaultValue = "PRODUCT") String type) {
        return "SERVICE".equalsIgnoreCase(type) ? SERVICES : PRODUCTS;
    }
}
