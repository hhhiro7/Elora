let currentService = null;
let serviceViewerId = null;
let selectedPackage = null;

document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(location.search).get('id');
    const message = document.getElementById('service-detail-message');
    if (!id || !/^\d+$/.test(id)) { message.textContent = 'Não encontramos este serviço.'; return; }
    document.querySelectorAll('[data-dialog-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
    document.getElementById('service-contact-cta').addEventListener('click', () => document.getElementById('service-message').click());
    try {
        currentService = await apiCall(`/services/${id}`);
        document.title = `${currentService.title} — Elora`;
        const owner = currentService.owner || {};
        const mainImage = document.getElementById('service-image');
        mainImage.src = currentService.imageUrl || FALLBACK_IMG;
        mainImage.alt = `Imagem de ${currentService.title}`;
        mainImage.onerror = function () { this.onerror = null; this.src = FALLBACK_IMG; };
        document.getElementById('service-category').textContent = currentService.category || 'Serviço';
        document.getElementById('service-title').textContent = currentService.title;
        document.getElementById('service-description').textContent = currentService.description || 'Converse com o profissional para alinhar as entregas.';
        document.getElementById('service-long-description').textContent = currentService.description || 'Este profissional ainda não adicionou mais detalhes.';
        document.getElementById('service-seller-name').textContent = owner.name || 'Profissional da comunidade';
        document.getElementById('service-seller-link').href = `usuario.html?id=${encodeURIComponent(owner.id || '')}`;
        document.getElementById('service-related-link').href = `servicos.html?category=${encodeURIComponent(currentService.category || '')}`;
        document.getElementById('service-seller-meta').textContent = [owner.city || currentService.location, currentService.experienceLevel].filter(Boolean).join(' · ') || 'Perfil profissional';
        const avatar = document.getElementById('service-seller-avatar');
        if (owner.avatarUrl) avatar.innerHTML = `<img src="${escapeHtml(owner.avatarUrl)}" alt="" onerror="this.remove()">`;
        else avatar.textContent = (owner.name || 'E').charAt(0).toUpperCase();
        document.getElementById('service-provider-stats').innerHTML = renderProviderStats(currentService);
        renderServicePackages(currentService);
        renderServiceMeta(currentService);
        renderServiceTags(currentService.tags);
        renderServiceGallery(currentService);
        renderServiceFaq(currentService.faq);

        const favorite = document.getElementById('service-favorite');
        favorite.dataset.favoriteType = 'SERVICE'; favorite.dataset.favoriteId = String(currentService.id);
        favorite.setAttribute('aria-pressed', 'false'); favorite.addEventListener('click', () => toggleFavorite(favorite));
        document.getElementById('service-request').addEventListener('click', openRequestDialog);
        document.getElementById('service-message').addEventListener('click', openMessageDialog);
        document.getElementById('service-request-form').addEventListener('submit', submitServiceRequest);
        document.getElementById('service-message-form').addEventListener('submit', submitServiceMessage);
        if (getToken()) {
            try { serviceViewerId = (await apiCall('/users/me')).id; }
            catch { /* Sessão expirada será tratada pela chamada autenticada seguinte. */ }
            if (serviceViewerId === owner.id) {
                document.getElementById('service-request').hidden = true;
                document.getElementById('service-message').hidden = true;
                document.getElementById('service-contact-cta').hidden = true;
            }
        }
        await Promise.allSettled([loadServiceReviews(owner.id), loadRelatedServices(currentService)]);
        setupListingQuestions('SERVICE', currentService.id, owner.id);
        document.getElementById('service-about-section').hidden = false;
        document.getElementById('service-qa-section').hidden = false;
        message.hidden = true; document.getElementById('service-detail').hidden = false;
        syncFavoriteButtons();
    } catch (error) {
        message.textContent = error.message || 'Não foi possível carregar este serviço. Volte ao catálogo e tente novamente.';
        message.classList.add('is-error');
    }
});

function renderProviderStats(service) {
    const rating = Number(service.providerRating || 0);
    const reviews = Number(service.providerReviewCount || 0);
    const jobs = Number(service.completedWorkCount || 0);
    const stars = rating ? `<span class="service-rating"><span aria-hidden="true">★</span> ${rating.toFixed(1)} <small>${reviews} ${reviews === 1 ? 'avaliação' : 'avaliações'}</small></span>` : '<span class="service-new-review">Sem avaliações</span>';
    const level = service.providerLevel ? `<span class="provider-level">${escapeHtml(service.providerLevel)}</span>` : '';
    return `${stars}<span>${jobs} ${jobs === 1 ? 'trabalho concluído' : 'trabalhos concluídos'}</span>${level}`;
}

function renderServicePackages(service) {
    const packages = Array.isArray(service.packages) ? service.packages : [];
    const root = document.getElementById('service-packages');
    if (!packages.length) {
        selectedPackage = null;
        root.innerHTML = `<article class="service-package-card is-selected"><span class="service-package-tier">Serviço</span><h3>Solicitação personalizada</h3><strong>${formatCurrency(service.price)}</strong><p>Combine as entregas diretamente com o profissional.</p><span class="service-package-delivery">${service.deliveryDays ? `Prazo informado: ${service.deliveryDays} dias` : 'Prazo a combinar'}</span></article>`;
        return;
    }
    selectedPackage = packages[0];
    root.innerHTML = packages.map((item, index) => `<button class="service-package-card ${index === 0 ? 'is-selected' : ''}" type="button" data-package-id="${Number(item.id)}" aria-pressed="${index === 0}"><span class="service-package-tier">${escapeHtml(packageTierLabel(item.tier))}</span><h3>${escapeHtml(item.name)}</h3><strong>${formatCurrency(item.price)}</strong><p>${escapeHtml(item.description || '')}</p><span class="service-package-delivery">${Number(item.deliveryDays)} ${Number(item.deliveryDays) === 1 ? 'dia' : 'dias'} · ${Number(item.revisions || 0)} revisões</span>${item.deliverables ? `<span class="service-package-deliverables">${escapeHtml(item.deliverables)}</span>` : ''}</button>`).join('');
    root.querySelectorAll('[data-package-id]').forEach(button => button.addEventListener('click', () => {
        selectedPackage = packages.find(item => Number(item.id) === Number(button.dataset.packageId));
        root.querySelectorAll('[data-package-id]').forEach(card => { const active = card === button; card.classList.toggle('is-selected', active); card.setAttribute('aria-pressed', String(active)); });
    }));
}

function packageTierLabel(tier) { return ({ BASICO: 'Básico', PADRAO: 'Padrão', PREMIUM: 'Premium' })[tier] || 'Pacote'; }

function renderServiceMeta(service) {
    const mode = ({ ONLINE: 'Atendimento online', PRESENCIAL: 'Atendimento presencial', AMBOS: 'Online e presencial' })[service.serviceMode] || 'Formato a combinar';
    document.getElementById('service-detail-meta').innerHTML = `<span>${escapeHtml(mode)}</span>${service.location ? `<span>${escapeHtml(service.location)}</span>` : ''}${service.experienceLevel ? `<span>Experiência: ${escapeHtml(service.experienceLevel)}</span>` : ''}`;
}

function renderServiceTags(tags) {
    const root = document.getElementById('service-tags');
    const values = String(tags || '').split(/[,;\n]/).map(value => value.trim()).filter(Boolean).slice(0, 12);
    root.innerHTML = values.map(value => `<span>${escapeHtml(value)}</span>`).join('');
    root.hidden = !values.length;
}

function renderServiceGallery(service) {
    const urls = [service.imageUrl, ...String(service.portfolioUrls || '').split(/[\n,;]/)].map(value => String(value || '').trim()).filter((value, index, array) => value && array.indexOf(value) === index).slice(0, 7);
    const root = document.getElementById('service-gallery');
    if (urls.length < 2) { root.hidden = true; return; }
    root.innerHTML = urls.map((url, index) => `<button type="button" class="service-gallery-thumb ${index === 0 ? 'is-active' : ''}" data-gallery-index="${index}" aria-label="Ver imagem ${index + 1}"><img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.parentElement.hidden=true"></button>`).join('');
    root.querySelectorAll('[data-gallery-index]').forEach(button => button.addEventListener('click', () => {
        document.getElementById('service-image').src = urls[Number(button.dataset.galleryIndex)];
        root.querySelectorAll('.service-gallery-thumb').forEach(item => item.classList.toggle('is-active', item === button));
    }));
}

function renderServiceFaq(faq) {
    const values = String(faq || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
        const separator = line.indexOf('|'); return separator < 0 ? { question: line, answer: '' } : { question: line.slice(0, separator).trim(), answer: line.slice(separator + 1).trim() };
    }).filter(row => row.question);
    if (!values.length) return;
    document.getElementById('service-faq').innerHTML = values.slice(0, 8).map(row => `<details class="service-faq-item"><summary>${escapeHtml(row.question)}</summary><p>${escapeHtml(row.answer)}</p></details>`).join('');
    document.getElementById('service-faq-section').hidden = false;
}

async function loadServiceReviews(ownerId) {
    const root = document.getElementById('service-reviews');
    try {
        const reviews = await apiCall(`/reviews/user/${ownerId}/services`);
        root.innerHTML = reviews.length ? reviews.slice(0, 8).map(review => `<article class="review-card"><div class="review-card-heading"><strong>${escapeHtml(review.reviewerName)}</strong><span class="review-stars" aria-label="${review.rating} de 5">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span><time>${new Date(review.createdAt).toLocaleDateString('pt-BR')}</time></div>${review.serviceTitle ? `<span class="service-review-context">Serviço: ${escapeHtml(review.serviceTitle)}</span>` : ''}<p>${escapeHtml(review.comment)}</p></article>`).join('') : '<p class="muted-copy">Ainda não há avaliações de serviços para este profissional.</p>';
    } catch { root.innerHTML = '<p class="muted-copy">As avaliações não estão disponíveis neste momento.</p>'; }
}

async function loadRelatedServices(service) {
    const root = document.getElementById('service-related');
    try {
        const page = await apiCall(`/services/search?category=${encodeURIComponent(service.category || '')}&size=5`);
        const items = page.content.filter(item => Number(item.id) !== Number(service.id)).slice(0, 4);
        root.innerHTML = items.length ? items.map(item => `<a class="service-related-card" href="servico.html?id=${encodeURIComponent(item.id)}"><img src="${escapeHtml(item.imageUrl || FALLBACK_IMG)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"><span><strong>${escapeHtml(item.title)}</strong><small>${formatCurrency(item.packages?.length ? Math.min(...item.packages.map(p => Number(p.price))) : item.price)}</small></span></a>`).join('') : '<p class="muted-copy">Ainda não há outros serviços nesta especialidade.</p>';
    } catch { root.innerHTML = '<p class="muted-copy">Serviços relacionados indisponíveis.</p>'; }
}

async function openRequestDialog() {
    if (!requireAuth()) return;
    try {
        if (!serviceViewerId) serviceViewerId = (await apiCall('/users/me')).id;
        if (Number(serviceViewerId) === Number(currentService.owner?.id)) { showToast('Você não pode solicitar seu próprio serviço.', 'error'); return; }
        const summary = document.getElementById('request-package-summary');
        const price = selectedPackage?.price ?? currentService.price;
        const due = selectedPackage?.deliveryDays ?? currentService.deliveryDays;
        summary.innerHTML = `<strong>${escapeHtml(selectedPackage?.name || currentService.title)}</strong><span>${formatCurrency(price)}${due ? ` · até ${due} dias` : ''}</span>`;
        document.getElementById('service-request-dialog').showModal();
    } catch (error) { showToast(error.message || 'Entre novamente para solicitar este serviço.', 'error'); }
}

function openMessageDialog() {
    if (!requireAuth()) return;
    document.getElementById('service-message-dialog').showModal();
}

async function submitServiceRequest(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Enviando…');
    try {
        const result = await apiCall('/service-orders', 'POST', { serviceId: currentService.id, packageId: selectedPackage?.id || null, description: document.getElementById('service-request-description').value.trim() });
        document.getElementById('service-request-dialog').close();
        showToast('Solicitação enviada ao profissional.');
        location.href = `servicos-contratados.html?id=${encodeURIComponent(result.id)}`;
    } catch (error) { const box = document.getElementById('service-request-message'); box.className = 'alert error'; box.textContent = error.message; }
    finally { setButtonLoading(button, false); }
}

async function submitServiceMessage(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Enviando…');
    try {
        const result = await apiCall('/conversations', 'POST', { type: 'SERVICE', itemId: currentService.id, message: document.getElementById('service-message-content').value.trim() });
        location.href = `mensagens.html?id=${encodeURIComponent(result.conversationId)}`;
    } catch (error) { const box = document.getElementById('service-message-feedback'); box.className = 'alert error'; box.textContent = error.message; }
    finally { setButtonLoading(button, false); }
}
