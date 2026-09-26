document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(location.search).get('id');
    const listings = document.getElementById('public-listings');
    const reviewsBox = document.getElementById('public-reviews');
    if (!id || !/^\d+$/.test(id)) { listings.innerHTML = '<p class="empty-state">Não encontramos este perfil.</p>'; return; }
    try {
        const [profile, products, services, reviews, reviewSummary] = await Promise.all([
            apiCall(`/users/${id}`), apiCall(`/users/${id}/products`), apiCall(`/users/${id}/services`), apiCall(`/reviews/user/${id}`), apiCall(`/reviews/user/${id}/summary`)
        ]);
        document.title = `${profile.name} — Elora`;
        document.getElementById('public-name').textContent = profile.name;
        document.getElementById('public-bio').textContent = profile.bio || 'Este membro ainda não adicionou uma apresentação.';
        document.getElementById('public-location').textContent = profile.city || 'Localização não informada';
        const avatar = document.getElementById('public-avatar');
        if (profile.avatarUrl) avatar.innerHTML = `<img src="${escapeHtml(profile.avatarUrl)}" alt="Foto de ${escapeHtml(profile.name)}">`;
        else avatar.textContent = (profile.name || 'E').charAt(0).toUpperCase();
        document.getElementById('public-stats').innerHTML = `<span><b>${profile.productCount}</b> produtos</span><span><b>${profile.serviceCount}</b> serviços</span><span><b>${profile.salesCount}</b> vendas concluídas</span><span><b>${Number(profile.rating || 0).toFixed(1)}</b> (${profile.reviewCount} avaliações)</span>`;
        document.getElementById('public-message').addEventListener('click', async () => {
            if (!requireAuth()) return;
            try {
                const result = await apiCall('/conversations', 'POST', { type: 'USER', itemId: Number(id), message: `Olá ${profile.name}, encontrei seu perfil na Elora e gostaria de conversar.` });
                location.href = `mensagens.html?id=${result.conversationId}`;
            } catch (error) { showToast(error.message || 'Não foi possível iniciar a conversa.', 'error'); }
        });
        const cards = [
            ...products.map(p => `<article class="card listing-card"><a class="listing-image" href="produto.html?id=${p.id}"><img src="${escapeHtml(p.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"></a>${favoriteButton('PRODUCT', p.id)}<div class="listing-card-copy"><span class="badge badge-status">${escapeHtml(p.category || 'Produto')}</span><h3><a href="produto.html?id=${p.id}">${escapeHtml(p.name)}</a></h3><strong class="price">${formatCurrency(p.price)}</strong></div></article>`),
            ...services.map(s => `<article class="card listing-card service-listing-card"><a class="listing-image" href="servico.html?id=${s.id}"><img src="${escapeHtml(s.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(s.title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"></a>${favoriteButton('SERVICE', s.id)}<div class="listing-card-copy"><span class="badge badge-status">${escapeHtml(s.category || 'Serviço')}</span><h3><a href="servico.html?id=${s.id}">${escapeHtml(s.title)}</a></h3><strong class="price">A partir de ${formatCurrency(s.price)}</strong></div></article>`)
        ];
        listings.innerHTML = cards.length ? cards.join('') : '<p class="empty-state">Este perfil ainda não tem anúncios ativos.</p>';
        document.getElementById('review-summary').innerHTML = `<strong>${Number(reviewSummary.average || 0).toFixed(1)}</strong><span class="review-stars" aria-label="${Number(reviewSummary.average || 0).toFixed(1)} de 5">${'★'.repeat(Math.round(reviewSummary.average || 0))}${'☆'.repeat(5 - Math.round(reviewSummary.average || 0))}</span><span>${reviewSummary.total} ${reviewSummary.total === 1 ? 'avaliação' : 'avaliações'}</span>`;
        document.getElementById('review-breakdown').innerHTML = [5, 4, 3, 2, 1].map(stars => { const count = Number(reviewSummary.distribution?.[stars] || 0); const ratio = reviewSummary.total ? count / reviewSummary.total * 100 : 0; return `<div class="review-breakdown-row"><span>${stars} <span aria-hidden="true">★</span></span><span class="review-breakdown-track"><span style="width:${ratio}%"></span></span><span>${count}</span></div>`; }).join('');
        reviewsBox.innerHTML = reviews.length ? reviews.map(review => `<article class="review-card"><div class="review-card-heading"><span class="review-reviewer-avatar" aria-hidden="true">${escapeHtml((review.reviewerName || '?').charAt(0).toUpperCase())}</span><div><strong>${escapeHtml(review.reviewerName)}</strong><span class="review-stars" aria-label="${review.rating} de 5">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></div><time>${new Date(review.createdAt).toLocaleDateString('pt-BR')}</time></div><p>${escapeHtml(review.comment)}</p></article>`).join('') : '<p class="empty-state">Ainda não há avaliações.</p>';
        syncFavoriteButtons();
    } catch (error) {
        listings.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar este perfil.')}</p>`;
    }
});
