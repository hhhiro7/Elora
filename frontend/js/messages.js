let activeConversationId = null;
let currentUserId = null;
let conversationItems = [];
let messageRefreshTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    document.getElementById('conversation-search')?.addEventListener('input', renderConversationList);
    try {
        const [profile, conversations] = await Promise.all([apiCall('/users/me'), apiCall('/conversations')]);
        currentUserId = profile.id;
        conversationItems = conversations;
        renderConversationList();
        const requested = Number(new URLSearchParams(location.search).get('id'));
        const selected = conversations.find(item => item.id === requested) || conversations[0];
        if (selected) await openConversation(selected.id, selected);
    } catch (error) {
        document.getElementById('conversation-list').innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar suas conversas.')}</p>`;
    }
});

function renderConversationList() {
    const list = document.getElementById('conversation-list');
    const query = (document.getElementById('conversation-search')?.value || '').trim().toLocaleLowerCase('pt-BR');
    const filtered = conversationItems.filter(item => `${item.otherUserName} ${item.targetTitle} ${item.lastMessage}`.toLocaleLowerCase('pt-BR').includes(query));
    if (!conversationItems.length) {
        list.innerHTML = '<div class="conversation-empty"><span class="conversation-empty-icon" aria-hidden="true">↗</span><h2>Nenhuma conversa ainda</h2><p>Abra um anúncio e escolha “Enviar mensagem” para falar com a outra pessoa.</p><a href="produtos.html">Explorar produtos</a><a href="servicos.html">Encontrar serviços</a></div>';
        return;
    }
    if (!filtered.length) { list.innerHTML = '<p class="conversation-no-results">Nenhuma conversa encontrada.</p>'; return; }
    list.innerHTML = filtered.map(item => `<button class="conversation-row ${item.id === activeConversationId ? 'is-active' : ''}" type="button" data-conversation-id="${item.id}" aria-current="${item.id === activeConversationId ? 'true' : 'false'}"><span class="conversation-avatar">${item.otherUserAvatar ? `<img src="${escapeHtml(item.otherUserAvatar)}" alt="" onerror="this.remove()">` : escapeHtml((item.otherUserName || '?').charAt(0).toUpperCase())}</span><span class="conversation-row-copy"><span class="conversation-row-heading"><strong>${escapeHtml(item.otherUserName)}</strong>${item.unreadCount ? `<span class="conversation-unread" aria-label="${item.unreadCount} mensagens não lidas">${item.unreadCount > 99 ? '99+' : item.unreadCount}</span>` : ''}</span><span class="conversation-context-title">${escapeHtml(item.targetTitle || 'Conversa')}</span><small>${escapeHtml(item.lastMessage || 'Inicie a conversa')}</small></span><time>${formatConversationDate(item.updatedAt)}</time></button>`).join('');
    list.querySelectorAll('[data-conversation-id]').forEach(button => button.addEventListener('click', () => {
        const item = conversationItems.find(entry => entry.id === Number(button.dataset.conversationId));
        openConversation(Number(button.dataset.conversationId), item);
    }));
}

function formatConversationDate(value) {
    if (!value) return '';
    const date = new Date(value);
    const today = new Date();
    return date.toDateString() === today.toDateString()
        ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function listingHref(summary) {
    return summary.targetType === 'SERVICE' ? `servico.html?id=${summary.targetId}`
        : summary.targetType === 'PRODUCT' ? `produto.html?id=${summary.targetId}`
            : `usuario.html?id=${summary.otherUserId}`;
}

async function openConversation(id, summary) {
    if (!summary) return;
    activeConversationId = id;
    renderConversationList();
    document.getElementById('messages-layout').classList.add('has-active-conversation');
    const panel = document.getElementById('conversation-panel');
    const link = listingHref(summary);
    const itemType = summary.targetType === 'SERVICE' ? 'Serviço anunciado' : summary.targetType === 'PRODUCT' ? 'Produto anunciado' : 'Perfil';
    panel.innerHTML = `<div class="conversation-thread"><header class="conversation-thread-header"><button type="button" class="conversation-back" aria-label="Voltar à lista de conversas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg><span>Conversas</span></button><span class="conversation-avatar conversation-header-avatar">${summary.otherUserAvatar ? `<img src="${escapeHtml(summary.otherUserAvatar)}" alt="">` : escapeHtml((summary.otherUserName || '?').charAt(0).toUpperCase())}</span><div class="conversation-header-copy"><h2>${escapeHtml(summary.otherUserName)}</h2><span>Conversa segura pela Elora</span></div><a class="conversation-profile-link" href="usuario.html?id=${summary.otherUserId}">Ver perfil</a></header><a class="conversation-listing-context" href="${link}">${summary.targetImageUrl ? `<img src="${escapeHtml(summary.targetImageUrl)}" alt="" loading="lazy">` : '<span class="conversation-listing-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"></path><path d="m4 7.5 8 4.5 8-4.5M12 12v9"></path></svg></span>'}<span><small>${itemType}</small><strong>${escapeHtml(summary.targetTitle || 'Ver perfil')}</strong>${summary.targetPrice != null ? `<span class="conversation-listing-price">${formatCurrency(summary.targetPrice)}</span>` : ''}</span><svg class="context-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></a><div id="message-thread" class="message-thread" aria-live="polite" aria-relevant="additions text"><p class="empty-state">Carregando mensagens…</p></div><form id="message-form" class="message-composer"><label class="sr-only" for="message-content">Escreva uma mensagem</label><textarea id="message-content" rows="1" maxlength="4000" required placeholder="Escreva sua mensagem…"></textarea><button class="btn" type="submit" aria-label="Enviar mensagem"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 8-16 8 3-8-3-8Zm3 8h13"></path></svg></button><span class="composer-hint">Enter envia · Shift + Enter quebra a linha</span></form></div>`;
    panel.querySelector('.conversation-back').addEventListener('click', () => {
        document.getElementById('messages-layout').classList.remove('has-active-conversation');
        activeConversationId = null;
        if (messageRefreshTimer) clearInterval(messageRefreshTimer);
        renderConversationList();
    });
    const field = document.getElementById('message-content');
    field.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); document.getElementById('message-form').requestSubmit(); }
    });
    await refreshMessages(id);
    document.getElementById('message-form').addEventListener('submit', async event => {
        event.preventDefault();
        const input = document.getElementById('message-content');
        const content = input.value.trim();
        if (!content) return;
        const button = event.currentTarget.querySelector('button');
        const buttonMarkup = button.innerHTML;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.innerHTML = '<span class="message-send-loading" aria-hidden="true">…</span>';
        try {
            await apiCall(`/conversations/${id}/messages`, 'POST', { content });
            input.value = '';
            await refreshMessages(id);
            await refreshConversationSummaries();
            input.focus();
        } catch (error) { showToast(error.message || 'Não foi possível enviar a mensagem.', 'error'); }
        finally { button.disabled = false; button.removeAttribute('aria-busy'); button.innerHTML = buttonMarkup; }
    });
    if (messageRefreshTimer) clearInterval(messageRefreshTimer);
    messageRefreshTimer = setInterval(() => { if (activeConversationId === id && !document.hidden) refreshMessages(id); }, 8000);
}

async function refreshMessages(id) {
    if (activeConversationId !== id) return;
    try {
        const messages = await apiCall(`/conversations/${id}/messages`);
        if (activeConversationId !== id) return;
        renderMessages(messages);
        await refreshConversationSummaries();
    } catch (error) {
        const thread = document.getElementById('message-thread');
        if (thread && !thread.dataset.hasMessages) thread.innerHTML = `<div class="conversation-load-error"><p>${escapeHtml(error.message || 'Não foi possível carregar as mensagens.')}</p><button class="btn btn-secondary" type="button" onclick="refreshMessages(${id})">Tentar novamente</button></div>`;
    }
}

async function refreshConversationSummaries() {
    try {
        conversationItems = await apiCall('/conversations');
        renderConversationList();
    } catch { /* Preserve the visible conversation if a background refresh fails. */ }
}

function renderMessages(messages) {
    const thread = document.getElementById('message-thread');
    if (!thread) return;
    thread.dataset.hasMessages = 'true';
    if (!messages.length) { thread.innerHTML = '<div class="message-empty"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.7-3.4A7.5 7.5 0 1 1 20 11.5Z"></path></svg></span><strong>Comece a conversa</strong><p>Envie uma mensagem para combinar os próximos passos.</p></div>'; return; }
    thread.innerHTML = messages.map(message => `<article class="message-bubble ${message.senderId === currentUserId ? 'is-mine' : ''}"><p>${escapeHtml(message.content).replaceAll('\n', '<br>')}</p><time>${new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${message.senderId === currentUserId ? `<span class="message-read-state" aria-label="${message.read ? 'Lida' : 'Enviada'}">${message.read ? ' · Lida' : ''}</span>` : ''}</time></article>`).join('');
    thread.scrollTop = thread.scrollHeight;
}
