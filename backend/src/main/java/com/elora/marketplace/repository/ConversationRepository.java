package com.elora.marketplace.repository;

import com.elora.marketplace.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByParticipantAIdOrParticipantBIdOrderByUpdatedAtDesc(Long participantAId, Long participantBId);
}
