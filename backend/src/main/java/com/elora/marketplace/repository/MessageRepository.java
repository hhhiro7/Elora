package com.elora.marketplace.repository;

import com.elora.marketplace.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Collection;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId);
    List<Message> findByConversationIdInOrderByCreatedAtDesc(Collection<Long> conversationIds);

    @Query("select m.conversation.id, count(m) from Message m where m.conversation.id in :ids and m.sender.id <> :userId and (m.read = false or m.read is null) group by m.conversation.id")
    List<Object[]> countUnreadByConversation(@Param("ids") Collection<Long> ids, @Param("userId") Long userId);

    @Modifying
    @Query("update Message m set m.read = true where m.conversation.id = :conversationId and m.sender.id <> :userId and (m.read = false or m.read is null)")
    int markIncomingAsRead(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
}
