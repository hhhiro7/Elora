document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(location.search).get('id');
    const listings = document.getElementById('public-listings');
    const reviewsBox = document.getElementById('public-reviews');
    if (!id || !/^\d+$/.test(id)) { showPublicProfileError('Não encontramos este perfil.'); return; }
    try {
        const results = await Promise.allSettled([
            apiCall(`/users/${id}`), apiCall(`/users/${id}/products`), apiCall(`/users/${id}/services`),
            apiCall(`/reviews/user/${id}`), apiCall(`/reviews/user/${id}/summary`), apiCall(`/users/${id}/portfolio`)
        ]);
        const [profileResult, productsResult, servicesResult, reviewsResult, summaryResult, portfolioResult] = results;
        if (profileResult.status === 'rejected') {
            const error = profileResult.reason;
            showPublicProfileError(error.status === 404 ? 'Este perfil não existe ou não está mais disponível.' : error.message || 'Confira a conexão com a API e tente novamente.');
            return;
        }
        const profile = profileResult.value;
        const products = productsResult.status === 'fulfilled' && Array.isArray(productsResult.value) ? productsResult.value : [];
        const services = servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value) ? servicesResult.value : [];
        const reviews = reviewsResult.status === 'fulfilled' && Array.isArray(reviewsResult.value) ? reviewsResult.value : [];
        const reviewSummary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
        const portfolioItems = portfolioResult.status === 'fulfilled' && Array.isArray(portfolioResult.value) ? portfolioResult.value : [];
        document.title = `${profile.name} — Elora`;
        document.getElementById('public-name').textContent = profile.name;
        document.getElementById('public-bio').textContent = profile.bio || 'Este membro ainda não adicionou uma apresentação.';
        document.getElementById('public-location').textContent = profile.city || 'Localização não informada';
        const avatar = document.getElementById('public-avatar');
        if (profile.avatarUrl) avatar.innerHTML = `<img src="${escapeHtml(profile.avatarUrl)}" alt="Foto de ${escapeHtml(profile.name)}">`;
        else avatar.textContent = (profile.name || 'E').charAt(0).toUpperCase();
        document.getElementById('public-stats').innerHTML = `<span><b>${Number(profile.productCount || 0)}</b> produtos</span><span><b>${Number(profile.serviceCount || 0)}</b> serviços</span><span><b>${Number(profile.completedServiceCount || 0)}</b> trabalhos de serviço concluídos</span>${profile.serviceRating != null && Number(profile.serviceReviewCount || 0) > 0 ? `<span><b>${Number(profile.serviceRating).toFixed(1)} ★</b> média em ${Number(profile.serviceReviewCount)} avaliações de serviços</span>` : ''}<span><b>${Number(profile.reviewCount || 0)}</b> avaliações</span>`;
        const level = document.getElementById('provider-level');
        if (profile.providerLevel) { level.hidden = false; level.textContent = `Profissional ${profile.providerLevel}`; }
        const experience = [...new Set(services.map(item => item.experienceLevel).filter(Boolean))];
        if (experience.length) { const output = document.getElementById('provider-experience'); output.hidden = false; output.textContent = `Experiência informada: ${experience.join(' · ')}`; }
        renderProviderProfileExtras(services, portfolioItems);
        document.getElementById('public-profile-hero').hidden = false;
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
        const listingErrors = [productsResult, servicesResult].filter(result => result.status === 'rejected');
        const partialListingNotice = listingErrors.length && cards.length
            ? `<p class="empty-state">Parte dos anúncios não pôde ser carregada: ${escapeHtml(listingErrors[0].reason.message || 'erro de conexão')} <button class="btn btn-secondary" type="button" onclick="location.reload()">Tentar novamente</button></p>` : '';
        listings.innerHTML = cards.length ? `${partialListingNotice}${cards.join('')}` : listingErrors.length
            ? `<div class="empty-state card-empty"><h3>Não foi possível carregar os anúncios</h3><p>${escapeHtml(listingErrors[0].reason.message || 'Verifique a conexão com a API e tente novamente.')}</p><button class="btn" type="button" onclick="location.reload()">Tentar novamente</button></div>`
            : '<p class="empty-state">Este perfil ainda não tem anúncios ativos.</p>';
        document.getElementById('public-listings-section').hidden = false;
        if (reviewSummary) {
            document.getElementById('review-summary').innerHTML = `<strong>${Number(reviewSummary.average || 0).toFixed(1)}</strong><span class="review-stars" aria-label="${Number(reviewSummary.average || 0).toFixed(1)} de 5">${'★'.repeat(Math.round(reviewSummary.average || 0))}${'☆'.repeat(5 - Math.round(reviewSummary.average || 0))}</span><span>${reviewSummary.total} ${reviewSummary.total === 1 ? 'avaliação' : 'avaliações'}</span>`;
            document.getElementById('review-breakdown').innerHTML = [5, 4, 3, 2, 1].map(stars => { const count = Number(reviewSummary.distribution?.[stars] || 0); const ratio = reviewSummary.total ? count / reviewSummary.total * 100 : 0; return `<div class="review-breakdown-row"><span>${stars} <span aria-hidden="true">★</span></span><span class="review-breakdown-track"><span style="width:${ratio}%"></span></span><span>${count}</span></div>`; }).join('');
        } else {
            document.getElementById('review-summary').textContent = 'Resumo de avaliações indisponível';
            document.getElementById('review-breakdown').replaceChildren();
        }
        reviewsBox.innerHTML = reviewsResult.status === 'rejected'
            ? `<p class="empty-state">${escapeHtml(reviewsResult.reason.message || 'Não foi possível carregar as avaliações.')}</p>`
            : reviews.length ? reviews.map(review => `<article class="review-card"><div class="review-card-heading"><span class="review-reviewer-avatar" aria-hidden="true">${escapeHtml((review.reviewerName || '?').charAt(0).toUpperCase())}</span><div><strong>${escapeHtml(review.reviewerName)}</strong><span class="review-stars" aria-label="${review.rating} de 5">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></div><time>${new Date(review.createdAt).toLocaleDateString('pt-BR')}</time></div><p>${escapeHtml(review.comment)}</p></article>`).join('') : '<p class="empty-state">Ainda não há avaliações.</p>';
        document.getElementById('public-reviews-section').hidden = false;
        syncFavoriteButtons();
    } catch (error) {
        showPublicProfileError(error.message || 'Confira a conexão com a API e tente novamente.');
    }
});

function renderProviderProfileExtras(services, portfolioItems = []) {
    const section = document.getElementById('provider-profile-sections');
    const specialties = [...new Set(services.flatMap(service => String(service.tags || '').split(/[,;\n]/).map(value => value.trim()).filter(Boolean)))].slice(0, 16);
    const specialtySection = document.getElementById('provider-specialties-section');
    if (specialties.length) {
        specialtySection.hidden = false;
        document.getElementById('provider-specialties').innerHTML = specialties.map(value => `<span>${escapeHtml(value)}</span>`).join('');
    }
    const portfolio = [...new Set(services.flatMap(service => String(service.portfolioUrls || '').split(/[\n,;]/).map(value => value.trim()).filter(isPublicImageUrl)))].slice(0, 12);
    const portfolioSection = document.getElementById('provider-portfolio-section');
    if (portfolio.length) {
        portfolioSection.hidden = false;
        document.getElementById('provider-portfolio').innerHTML = portfolio.map((url,index) => `<img src="${escapeHtml(url)}" alt="Trabalho do portfólio ${index + 1}" loading="lazy" onerror="this.hidden=true">`).join('');
    }
    const workSection = document.getElementById('public-work-section');
    if (portfolioItems.length) {
        workSection.hidden = false;
        document.getElementById('public-portfolio-items').innerHTML = portfolioItems.map(item => `<article class="portfolio-public-item">${item.imageUrl ? `<a href="${escapeHtml(item.projectUrl || item.imageUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(item.imageUrl)}" alt="Projeto: ${escapeHtml(item.title)}" loading="lazy" onerror="this.parentElement.classList.add('is-empty');this.remove()"></a>` : '<div class="portfolio-public-image is-empty"><span>Sem imagem</span></div>'}<div><span class="badge badge-status">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>${item.technologies ? `<small>${escapeHtml(item.technologies)}</small>` : ''}${item.projectUrl ? `<a class="portfolio-project-link" href="${escapeHtml(item.projectUrl)}" target="_blank" rel="noopener noreferrer">Visitar projeto ↗</a>` : ''}</div></article>`).join('');
    }
    section.hidden = !specialties.length && !portfolio.length && !portfolioItems.length;
}

function isPublicImageUrl(value) {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); }
    catch { return false; }
}

function showPublicProfileError(message) {
    const listingsSection = document.getElementById('public-listings-section');
    document.getElementById('public-message').hidden = true;
    document.getElementById('public-name').textContent = 'Perfil indisponível';
    document.getElementById('public-bio').textContent = '';
    document.getElementById('public-location').textContent = '';
    document.getElementById('public-stats').replaceChildren();
    document.getElementById('public-reviews-section').hidden = true;
    listingsSection.hidden = false;
    document.getElementById('public-listings').innerHTML = `<div class="empty-state card-empty"><h2>Não foi possível abrir este perfil</h2><p>${escapeHtml(message)}</p><div class="checkout-success-actions"><button class="btn btn-secondary" type="button" onclick="location.reload()">Tentar novamente</button><a class="btn" href="produtos.html">Explorar anúncios</a></div></div>`;
}
