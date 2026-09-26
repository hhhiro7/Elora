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
        const reviewStatuses = buyer && order.status === 'CONCLUIDO' ? await apiCall(`/reviews/order/${order.id}`) : [];
        box.innerHTML = `<div class="order-detail-heading"><div><span class="badge badge-status">${escapeHtml(order.status.replaceAll('_', ' '))}</span><h1>Pedido #${order.id}</h1><p>${new Date(order.createdAt).toLocaleString('pt-BR')}</p></div><strong>${formatCurrency(order.totalAmount)}</strong></div><div class="order-detail-items">${items.map(item => `<article class="order-detail-item"><img src="${escapeHtml(item.product?.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(item.product?.name)}" loading="lazy"><div><h2>${escapeHtml(item.product?.name)}</h2><p>Vendido por ${escapeHtml(item.product?.owner?.name || 'anunciante')} · ${item.quantity} unidade(s)</p><a href="usuario.html?id=${item.product?.owner?.id}">Ver perfil do vendedor</a></div><strong>${formatCurrency(item.subtotal)}</strong></article>`).join('')}</div><div class="order-detail-summary"><span>Forma de pagamento</span><b>${order.paymentMethod === 'PIX' ? 'PIX (simulado)' : 'Cartão (simulado)'}</b>${order.deliveryAddress ? `<span>Endereço</span><b>${escapeHtml(order.deliveryAddress)}</b>` : ''}<span>Total</span><b>${formatCurrency(order.totalAmount)}</b></div><div class="order-detail-actions">${buyer && order.status === 'ENVIADO' ? `<button class="btn" data-next-status="CONCLUIDO">Confirmar recebimento</button>` : ''}${ownsListing && ['PAGAMENTO_CONFIRMADO', 'ENVIADO'].includes(order.status) ? `<button class="btn" data-next-status="ENVIADO">Marcar como enviado</button>` : ''}${buyer && order.status === 'CONCLUIDO' ? reviewStatuses.map(status => status.reviewed ? `<span class="review-complete" aria-label="Avaliação enviada">✓ Avaliação enviada · ${escapeHtml(status.sellerName)}</span>` : `<button class="btn btn-secondary" data-product-review="${status.sellerId}" data-seller-name="${escapeHtml(status.sellerName)}">Avaliar ${escapeHtml(status.sellerName)}</button>`).join('') : ''}</div>`;
        message.hidden = true; box.hidden = false;
        box.querySelectorAll('[data-next-status]').forEach(button => button.addEventListener('click', async () => {
            setButtonLoading(button, true, 'Atualizando…');
            try { await apiCall(`/orders/${order.id}/status`, 'PATCH', { status: button.dataset.nextStatus }); showToast('Pedido atualizado.'); location.reload(); }
            catch (error) { showToast(error.message || 'Não foi possível atualizar o pedido.', 'error'); setButtonLoading(button, false); }
        }));
        box.querySelectorAll('[data-product-review]').forEach(button => button.addEventListener('click', () => productReviewDialog(order.id, Number(button.dataset.productReview), button.dataset.sellerName)));
    } catch (error) { message.className = 'alert error'; message.textContent = error.message || 'Não foi possível carregar este pedido.'; }
});

function productReviewDialog(orderId, sellerId, sellerName) {
    const dialog = document.createElement('dialog'); dialog.className = 'elora-dialog';
    dialog.innerHTML = `<form class="review-dialog-form"><button type="button" class="dialog-close" aria-label="Fechar">×</button><p class="catalog-eyebrow">Sua compra · vendedor</p><h2>Como foi sua experiência com ${escapeHtml(sellerName)}?</h2><fieldset class="review-star-picker"><legend>Como você avalia este vendedor?</legend><div role="radiogroup" aria-label="Nota de 1 a 5">${[1,2,3,4,5].map(value => `<button type="button" role="radio" aria-checked="false" aria-label="${value} ${value === 1 ? 'estrela' : 'estrelas'}" data-rating="${value}">★</button>`).join('')}</div><input type="hidden" name="rating" value="0"></fieldset><label>Conte como foi sua experiência com este vendedor<textarea name="comment" rows="4" required maxlength="2000" placeholder="Seu comentário ajuda outras pessoas a comprar com confiança."></textarea></label><div class="alert" role="status"></div><div class="review-dialog-actions"><button class="review-later" type="button">Deixar para depois</button><button class="btn" type="submit">Enviar avaliação</button></div></form>`;
    document.body.append(dialog); dialog.showModal(); dialog.querySelector('.dialog-close').onclick = () => dialog.close(); dialog.addEventListener('close', () => dialog.remove());
    dialog.querySelector('.review-later').onclick = () => dialog.close();
    const picker = dialog.querySelector('.review-star-picker');
    const chooseRating = rating => { picker.querySelector('input').value = String(rating); picker.querySelectorAll('[data-rating]').forEach(star => { const selected = Number(star.dataset.rating) <= rating; star.classList.toggle('is-selected', selected); star.setAttribute('aria-checked', String(Number(star.dataset.rating) === rating)); }); };
    picker.querySelectorAll('[data-rating]').forEach(star => { star.addEventListener('click', () => chooseRating(Number(star.dataset.rating))); star.addEventListener('mouseenter', () => picker.querySelectorAll('[data-rating]').forEach(item => item.classList.toggle('is-preview', Number(item.dataset.rating) <= Number(star.dataset.rating)))); });
    picker.addEventListener('mouseleave', () => picker.querySelectorAll('[data-rating]').forEach(item => item.classList.remove('is-preview')));
    dialog.querySelector('form').onsubmit = async event => {
        event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Publicando…');
        try { await apiCall('/reviews', 'POST', { type: 'PRODUCT', orderId, reviewedUserId: sellerId, rating: Number(form.elements.rating.value), comment: form.elements.comment.value }); dialog.close(); const reviewButton = document.querySelector(`[data-product-review="${sellerId}"]`); if (reviewButton) { reviewButton.className = 'review-complete'; reviewButton.removeAttribute('data-product-review'); reviewButton.textContent = `✓ Avaliação enviada · ${sellerName}`; } showToast('Avaliação publicada.'); }
        catch (error) { const feedback = form.querySelector('.alert'); feedback.className = 'alert error'; feedback.textContent = error.message; }
        finally { setButtonLoading(button, false); }
    };
}
