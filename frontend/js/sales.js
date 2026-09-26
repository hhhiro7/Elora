document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    const list = document.getElementById('sales-list');
    try {
        const [profile, sales] = await Promise.all([apiCall('/users/me'), apiCall('/orders/sales')]);
        if (!sales.length) { list.innerHTML = '<div class="empty-state card-empty"><h2>Suas vendas aparecerão aqui</h2><p>Quando alguém comprar um dos seus produtos, você poderá acompanhar o pedido nesta página.</p><a class="btn" href="meus-produtos.html">Ver meus anúncios</a></div>'; return; }
        list.innerHTML = sales.map(order => {
            const ownItems = (order.items || []).filter(item => item.product?.owner?.id === profile.id);
            const canShip = ['PAGAMENTO_CONFIRMADO', 'ENVIADO'].includes(order.status);
            return `<article class="order-card card"><div class="order-head"><div><span class="muted-copy">PEDIDO #${order.id}</span><h2>${new Date(order.createdAt).toLocaleDateString('pt-BR', { dateStyle: 'long' })}</h2></div><span class="badge ${order.status === 'CONCLUIDO' ? 'badge-ativo' : 'badge-pausado'}">${escapeHtml(order.status.replaceAll('_', ' '))}</span></div><div class="order-preview-items">${ownItems.map(item => `<span>${item.quantity} × ${escapeHtml(item.product?.name || 'Produto')}</span>`).join('')}</div><div class="order-card-footer"><a href="usuario.html?id=${order.buyer?.id}">Comprador: ${escapeHtml(order.buyer?.name || 'Cliente')}</a>${canShip ? `<button class="btn" data-ship-order="${order.id}">Marcar como enviado</button>` : ''}<a class="btn btn-secondary" href="pedido.html?id=${order.id}">Ver detalhes</a></div></article>`;
        }).join('');
        list.querySelectorAll('[data-ship-order]').forEach(button => button.addEventListener('click', async () => {
            setButtonLoading(button, true, 'Atualizando…');
            try { await apiCall(`/orders/${button.dataset.shipOrder}/status`, 'PATCH', { status: 'ENVIADO' }); showToast('Pedido marcado como enviado.'); location.reload(); }
            catch (error) { showToast(error.message || 'Não foi possível atualizar o pedido.', 'error'); setButtonLoading(button, false); }
        }));
    } catch (error) { list.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar as vendas.')}</p>`; }
});
