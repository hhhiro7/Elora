document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    const id = new URLSearchParams(location.search).get('id');
    const box = document.getElementById('order-detail'); const message = document.getElementById('order-detail-message');
    if (!id || !/^\d+$/.test(id)) { message.textContent = 'Pedido não encontrado.'; return; }
    try {
        const [order, profile] = await Promise.all([apiCall(`/orders/${id}`), apiCall('/users/me')]);
        const buyer = order.buyer?.id === profile.id;
        const ownsListing = order.items?.some(item => item.product?.owner?.id === profile.id);
        const items = order.items || [];
        box.innerHTML = `<div class="order-detail-heading"><div><span class="badge badge-status">${escapeHtml(order.status.replaceAll('_', ' '))}</span><h1>Pedido #${order.id}</h1><p>${new Date(order.createdAt).toLocaleString('pt-BR')}</p></div><strong>${formatCurrency(order.totalAmount)}</strong></div><div class="order-detail-items">${items.map(item => `<article class="order-detail-item"><img src="${escapeHtml(item.product?.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(item.product?.name)}" loading="lazy"><div><h2>${escapeHtml(item.product?.name)}</h2><p>Vendido por ${escapeHtml(item.product?.owner?.name || 'anunciante')} · ${item.quantity} unidade(s)</p><a href="usuario.html?id=${item.product?.owner?.id}">Ver perfil do vendedor</a></div><strong>${formatCurrency(item.subtotal)}</strong></article>`).join('')}</div><div class="order-detail-summary"><span>Forma de pagamento</span><b>${order.paymentMethod === 'PIX' ? 'PIX (simulado)' : 'Cartão (simulado)'}</b>${order.deliveryAddress ? `<span>Endereço</span><b>${escapeHtml(order.deliveryAddress)}</b>` : ''}<span>Total</span><b>${formatCurrency(order.totalAmount)}</b></div><div class="order-detail-actions">${buyer && order.status === 'ENVIADO' ? `<button class="btn" data-next-status="CONCLUIDO">Confirmar recebimento</button>` : ''}${ownsListing && ['PAGAMENTO_CONFIRMADO', 'ENVIADO'].includes(order.status) ? `<button class="btn" data-next-status="ENVIADO">Marcar como enviado</button>` : ''}${buyer && order.status === 'CONCLUIDO' ? [...new Map(items.map(item => [item.product?.owner?.id, item.product?.owner])).values()].map(owner => `<button class="btn btn-secondary" data-product-review="${owner.id}">Avaliar ${escapeHtml(owner.name)}</button>`).join('') : ''}</div>`;
        message.hidden = true; box.hidden = false;
        box.querySelectorAll('[data-next-status]').forEach(button => button.addEventListener('click', async () => {
            setButtonLoading(button, true, 'Atualizando…');
            try { await apiCall(`/orders/${order.id}/status`, 'PATCH', { status: button.dataset.nextStatus }); showToast('Pedido atualizado.'); location.reload(); }
            catch (error) { showToast(error.message || 'Não foi possível atualizar o pedido.', 'error'); setButtonLoading(button, false); }
        }));
        box.querySelectorAll('[data-product-review]').forEach(button => button.addEventListener('click', () => productReviewDialog(order.id, Number(button.dataset.productReview))));
    } catch (error) { message.className = 'alert error'; message.textContent = error.message || 'Não foi possível carregar este pedido.'; }
});

function productReviewDialog(orderId, sellerId) {
    const dialog = document.createElement('dialog'); dialog.className = 'elora-dialog';
    dialog.innerHTML = `<form><button type="button" class="dialog-close" aria-label="Fechar">×</button><h2>Avaliar vendedor</h2><label>Nota<select name="rating" required><option value="5">5 — Excelente</option><option value="4">4 — Muito bom</option><option value="3">3 — Bom</option><option value="2">2 — Regular</option><option value="1">1 — Precisa melhorar</option></select></label><label>Comentário<textarea name="comment" rows="4" required maxlength="2000"></textarea></label><div class="alert" role="status"></div><button class="btn" type="submit">Publicar avaliação</button></form>`;
    document.body.append(dialog); dialog.showModal(); dialog.querySelector('.dialog-close').onclick = () => dialog.close(); dialog.addEventListener('close', () => dialog.remove());
    dialog.querySelector('form').onsubmit = async event => {
        event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Publicando…');
        try { await apiCall('/reviews', 'POST', { type: 'PRODUCT', orderId, reviewedUserId: sellerId, rating: Number(form.elements.rating.value), comment: form.elements.comment.value }); dialog.close(); showToast('Avaliação publicada.'); }
        catch (error) { const feedback = form.querySelector('.alert'); feedback.className = 'alert error'; feedback.textContent = error.message; }
        finally { setButtonLoading(button, false); }
    };
}
