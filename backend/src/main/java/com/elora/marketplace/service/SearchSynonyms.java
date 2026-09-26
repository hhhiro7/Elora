package com.elora.marketplace.service;

import org.springframework.stereotype.Service;
import java.text.Normalizer;
import java.util.Locale;

@Service
public class SearchSynonyms {
    public record Terms(String primary, String alternativeOne, String alternativeTwo) {}
    public Terms expand(String query) {
        String primary = query == null ? "" : query.trim();
        String normalized = Normalizer.normalize(primary.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        if (containsAny(normalized, "logo", "logotipo", "branding", "identidade visual")) return new Terms(primary, "identidade visual", "branding");
        if (containsAny(normalized, "site", "website", "landing page", "pagina web", "pagina online")) return new Terms(primary, "desenvolvimento web", "landing page");
        if (containsAny(normalized, "instagram", "rede social", "redes sociais")) return new Terms(primary, "social media", "marketing digital");
        if (containsAny(normalized, "video", "filmar", "filmagem", "editar video")) return new Terms(primary, "edição de vídeo", "videomaker");
        if (containsAny(normalized, "foto", "fotografia", "fotografo")) return new Terms(primary, "fotografia", "ensaio fotografico");
        if (containsAny(normalized, "traduzir", "traducao", "tradutor")) return new Terms(primary, "tradução", "revisão de texto");
        if (containsAny(normalized, "aula", "professor", "ensinar")) return new Terms(primary, "aulas particulares", "tutoria");
        return new Terms(primary, "", "");
    }
    private boolean containsAny(String value, String... terms) { for (String term : terms) if (value.contains(term)) return true; return false; }
}
