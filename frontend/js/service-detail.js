let currentService = null;
let serviceViewerId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(location.search).get('id');
    const message = document.getElementById('service-detail-message');
    if (!id || !/^\d+$/.test(id)) { message.textContent = 'Não encontramos este serviço.'; return; }
    document.querySelectorAll('[data-dialog-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
    try {
        currentService = await apiCall(`/services/${id}`);
        document.title = `${currentService.title} — Elora`;
        const owner = currentService.owner || {};
        document.getElementById('service-image').src = currentService.imageUrl || FALLBACK_IMG;
        document.getElementById('service-image').alt = currentService.title;
        document.getElementById('service-image').onerror = function () { this.onerror = null; this.src = FALLBACK_IMG; };
        document.getElementById('service-category').textContent = currentService.category || 'Serviço';
        document.getElementById('service-title').textContent = currentService.title;
        document.getElementById('service-description').textContent = currentService.description || 'Consulte os detalhes com o prestador.';
        document.getElementById('service-long-description').textContent = currentService.description || 'Este prestador ainda não adicionou mais detalhes.';
        document.getElementById('service-seller-name').textContent = owner.name || 'Prestador da comunidade';
        document.getElementById('service-seller-link').href = `usuario.html?id=${owner.id}`;
        const avatar = document.getElementById('service-seller-avatar');
        if (owner.avatarUrl) avatar.innerHTML = `<img src="${escapeHtml(owner.avatarUrl)}" alt="">`;
        else avatar.textContent = (owner.name || 'E').charAt(0).toUpperCase();
        document.getElementById('service-meta').innerHTML = `<strong>${formatCurrency(currentService.price)} <small>preço anunciado</small></strong>${currentService.deliveryDays ? `<span>Prazo estimado: ${currentService.deliveryDays} dias</span>` : ''}${currentService.experienceLevel ? `<span>Experiência: ${escapeHtml(currentService.experienceLevel)}</span>` : ''}${currentService.location ? `<span>${escapeHtml(currentService.location)}</span>` : ''}`;
        const favorite = document.getElementById('service-favorite');
        favorite.dataset.favoriteType = 'SERVICE'; favorite.dataset.favoriteId = String(currentService.id);
        favorite.setAttribute('aria-pressed', 'false');
        document.getElementById('service-request').addEventListener('click', async () => {
            if (!requireAuth()) return;
            if (!serviceViewerId) serviceViewerId = (await apiCall('/users/me')).id;
            if (serviceViewerId === owner.id) { showToast('Você não pode solicitar seu próprio serviço.', 'error'); return; }
            document.getElementById('service-request-dialog').showModal();
        });
        document.getElementById('service-message').addEventListener('click', () => {
            if (!requireAuth()) return;
            document.getElementById('service-message-dialog').showModal();
        });
        document.getElementById('service-request-form').addEventListener('submit', submitServiceRequest);
        document.getElementById('service-message-form').addEventListener('submit', submitServiceMessage);
        if (getToken()) {
            const profile = await apiCall('/users/me'); serviceViewerId = profile.id;
            if (serviceViewerId === owner.id) { document.getElementById('service-request').hidden = true; document.getElementById('service-message').hidden = true; }
        }
        const reviews = await apiCall(`/reviews/user/${owner.id}`);
        document.getElementById('service-reviews').innerHTML = reviews.length ? reviews.slice(0, 5).map(review => `<article class="review-card"><div class="review-card-heading"><strong>${escapeHtml(review.reviewerName)}</strong><span>${review.rating}/5</span></div><p>${escapeHtml(review.comment)}</p></article>`).join('') : '<p class="muted-copy">Ainda não há avaliações para este prestador.</p>';
        message.hidden = true; document.getElementById('service-detail').hidden = false;
        syncFavoriteButtons();
    } catch (error) { message.textContent = error.message || 'Não foi possível carregar este serviço.'; message.classList.add('is-error'); }
});

async function submitServiceRequest(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Enviando…');
    try {
        const result = await apiCall('/service-orders', 'POST', { serviceId: currentService.id, description: document.getElementById('service-request-description').value });
        document.getElementById('service-request-dialog').close();
        showToast('Solicitação enviada ao prestador.');
        location.href = `servicos-contratados.html?id=${result.id}`;
    } catch (error) { const box = document.getElementById('service-request-message'); box.className = 'alert error'; box.textContent = error.message; }
    finally { setButtonLoading(button, false); }
}

async function submitServiceMessage(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Enviando…');
    try {
        const result = await apiCall('/conversations', 'POST', { type: 'SERVICE', itemId: currentService.id, message: document.getElementById('service-message-content').value });
        location.href = `mensagens.html?id=${result.conversationId}`;
    } catch (error) { const box = document.getElementById('service-message-feedback'); box.className = 'alert error'; box.textContent = error.message; }
    finally { setButtonLoading(button, false); }
}
