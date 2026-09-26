document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    const list = document.getElementById('service-orders');
    try {
        const [profile, orders] = await Promise.all([apiCall('/users/me'), apiCall('/service-orders')]);
        if (!orders.length) { list.innerHTML = '<div class="empty-state card-empty"><h2>Nenhuma solicitação por enquanto</h2><p>Quando contratar um serviço ou alguém solicitar o seu, ele aparecerá nesta página.</p><a class="btn" href="servicos.html">Explorar serviços</a></div>'; return; }
        list.innerHTML = orders.map(order => renderServiceOrder(order, profile.id)).join('');
        list.querySelectorAll('[data-order-status]').forEach(button => button.addEventListener('click', async () => {
            const [orderId, status] = button.dataset.orderStatus.split(':'); setButtonLoading(button, true, 'Atualizando…');
            try { await apiCall(`/service-orders/${orderId}/status`, 'PATCH', { status }); showToast('Solicitação atualizada.'); location.reload(); }
            catch (error) { showToast(error.message || 'Não foi possível atualizar a solicitação.', 'error'); setButtonLoading(button, false); }
        }));
        list.querySelectorAll('[data-review-order]').forEach(button => button.addEventListener('click', () => openServiceReview(Number(button.dataset.reviewOrder), Number(button.dataset-providerId))));
    } catch (error) { list.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar as solicitações.')}</p>`; }
});

function renderServiceOrder(order, userId) {
    const client = order.client?.id === userId;
    let action = '';
    if (!client && order.status === 'SOLICITADO') action = `<button class="btn" data-order-status="${order.id}:ACEITO">Aceitar</button><button class="btn btn-secondary" data-order-status="${order.id}:RECUSADO">Recusar</button>`;
    else if (!client && order.status === 'ACEITO') action = `<button class="btn" data-order-status="${order.id}:EM_ANDAMENTO">Iniciar trabalho</button>`;
    else if (!client && order.status === 'EM_ANDAMENTO') action = `<button class="btn" data-order-status="${order.id}:AGUARDANDO_APROVACAO">Solicitar aprovação</button>`;
    else if (client && order.status === 'AGUARDANDO_APROVACAO') action = `<button class="btn" data-order-status="${order.id}:CONCLUIDO">Confirmar conclusão</button>`;
    else if (client && order.status === 'CONCLUIDO') action = `<button class="btn btn-secondary" data-review-order="${order.id}" data-provider-id="${order.provider.id}">Avaliar prestador</button>`;
    else if (client && order.status === 'SOLICITADO') action = `<button class="btn btn-secondary" data-order-status="${order.id}:CANCELADO">Cancelar solicitação</button>`;
    const labels = { SOLICITADO:'Solicitado', ACEITO:'Aceito', EM_ANDAMENTO:'Em andamento', AGUARDANDO_APROVACAO:'Aguardando aprovação', CONCLUIDO:'Concluído', CANCELADO:'Cancelado', RECUSADO:'Recusado' };
    return `<article class="service-order-card card"><div class="service-order-heading"><div><span class="badge badge-status">${escapeHtml(labels[order.status] || order.status)}</span><h2>${escapeHtml(order.service?.title || 'Serviço')}</h2><span class="service-order-package">${escapeHtml(order.agreedPackageName || order.selectedPackage?.name || 'Oferta personalizada')}${order.deliveryDays ? ` · ${order.deliveryDays} dias` : ''}</span></div><strong>${formatCurrency(order.agreedPrice)}</strong></div><p>${escapeHtml(order.requestDescription)}</p><div class="service-order-meta"><span>${client ? `Profissional: ${escapeHtml(order.provider?.name)}` : `Cliente: ${escapeHtml(order.client?.name)}`}</span><time>${new Date(order.createdAt).toLocaleDateString('pt-BR')}</time></div><div class="service-order-actions">${action}<a class="btn btn-secondary" href="servico.html?id=${order.service?.id}">Ver oferta</a></div></article>`;
}

function openServiceReview(orderId, providerId) {
    const dialog = document.createElement('dialog'); dialog.className = 'elora-dialog';
    dialog.innerHTML = `<form id="service-review-form"><button type="button" class="dialog-close" aria-label="Fechar">×</button><span class="review-form-kicker">SERVIÇO CONCLUÍDO</span><h2>Avalie o serviço</h2><p>Sua avaliação ajuda a comunidade a escolher profissionais com confiança.</p><fieldset class="review-star-picker"><legend>Sua nota</legend>${[5,4,3,2,1].map((rating, index) => `<input type="radio" name="reviewRating" id="service-review-star-${rating}-${orderId}" value="${rating}" ${index === 0 ? 'checked' : ''}><label for="service-review-star-${rating}-${orderId}" aria-label="${rating} ${rating === 1 ? 'estrela' : 'estrelas'}">★</label>`).join('')}</fieldset><label for="review-comment">Comentário</label><textarea id="review-comment" required maxlength="2000" rows="4" placeholder="Conte como foi sua experiência"></textarea><div class="alert" role="status"></div><button class="btn" type="submit">Publicar avaliação</button></form>`;
    document.body.appendChild(dialog); dialog.showModal();
    dialog.querySelector('.dialog-close').onclick = () => dialog.close();
    dialog.addEventListener('close', () => dialog.remove());
    dialog.querySelector('form').onsubmit = async event => {
        event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Publicando…');
        try { await apiCall('/reviews', 'POST', { type: 'SERVICE', serviceOrderId: orderId, reviewedUserId: providerId, rating: Number(form.querySelector('[name="reviewRating"]:checked').value), comment: form.querySelector('#review-comment').value }); dialog.close(); showToast('Avaliação publicada.'); }
        catch (error) { const box = form.querySelector('.alert'); box.className = 'alert error'; box.textContent = error.message; }
        finally { setButtonLoading(button, false); }
    };
}
