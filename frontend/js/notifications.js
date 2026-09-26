document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    const list = document.getElementById('notifications-list');
    document.getElementById('mark-all-read').addEventListener('click', async event => {
        const button = event.currentTarget;
        setButtonLoading(button, true, 'Atualizando…');
        try { await apiCall('/notifications/read-all', 'POST'); await loadNotifications(); }
        catch (error) { showToast(error.message || 'Não foi possível atualizar as notificações.', 'error'); }
        finally { setButtonLoading(button, false); }
    });
    async function loadNotifications() {
        list.innerHTML = '<p class="loading-state">Carregando notificações…</p>';
        try {
            const notifications = await apiCall('/notifications');
            if (!notifications.length) { list.innerHTML = '<section class="empty-state"><h2>Você está em dia</h2><p>Quando houver novidades sobre suas propostas ou mensagens, elas aparecerão aqui.</p></section>'; return; }
            list.innerHTML = notifications.map(item => `<article class="notification-item ${item.readAt ? '' : 'is-unread'}"><span class="notification-mark" aria-hidden="true"></span><div class="notification-copy"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.message)}</p><time datetime="${escapeHtml(item.createdAt)}">${new Date(item.createdAt).toLocaleString('pt-BR')}</time></div><div class="notification-actions">${item.link ? `<a class="btn btn-secondary" href="${escapeHtml(item.link)}" data-notification-link="${item.id}">Abrir</a>` : ''}${!item.readAt ? `<button class="notification-read" type="button" data-notification-read="${item.id}">Marcar como lida</button>` : '<span class="notification-read-label">Lida</span>'}</div></article>`).join('');
            list.querySelectorAll('[data-notification-read]').forEach(button => button.addEventListener('click', async () => { try { await apiCall(`/notifications/${button.dataset.notificationRead}/read`, 'POST'); await loadNotifications(); } catch (error) { showToast(error.message || 'Não foi possível atualizar.', 'error'); } }));
            list.querySelectorAll('[data-notification-link]').forEach(link => link.addEventListener('click', async () => { try { await apiCall(`/notifications/${link.dataset.notificationLink}/read`, 'POST'); } catch { /* A navegação ao destino continua. */ } }));
        } catch (error) { list.innerHTML = `<section class="empty-state"><h2>Não foi possível carregar as notificações</h2><p>${escapeHtml(error.message || 'Verifique sua conexão e tente novamente.')}</p><button class="btn btn-secondary" id="retry-notifications" type="button">Tentar novamente</button></section>`; document.getElementById('retry-notifications').addEventListener('click', loadNotifications); }
    }
    loadNotifications();
});
