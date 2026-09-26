package com.elora.marketplace.repository;

import com.elora.marketplace.model.ListingQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ListingQuestionRepository extends JpaRepository<ListingQuestion, Long> {
    List<ListingQuestion> findByProductIdOrderByCreatedAtDesc(Long productId);
    List<ListingQuestion> findByServiceIdOrderByCreatedAtDesc(Long serviceId);
}
