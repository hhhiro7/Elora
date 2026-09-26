let servicePage = 0;
let serviceLoading = false;
let serviceSearchTimer;

document.addEventListener('DOMContentLoaded', async () => {
    const query = new URLSearchParams(location.search);
    document.getElementById('service-search').value = query.get('q') || '';
    const categories = await apiCall('/categories?type=SERVICE').catch(() => []);
    const category = document.getElementById('service-category');
    categories.forEach(item => category.add(new Option(item, item)));
    category.value = query.get('category') || '';
    document.querySelectorAll('#service-search, #service-location, #service-min-price, #service-max-price').forEach(input => input.addEventListener('input', scheduleServiceSearch));
    document.querySelectorAll('#service-category, #service-sort').forEach(input => input.addEventListener('change', () => loadServices(true)));
    document.getElementById('clear-service-filters').addEventListener('click', () => {
        document.getElementById('service-search').value = ''; category.value = '';
        document.getElementById('service-min-price').value = ''; document.getElementById('service-max-price').value = '';
        document.getElementById('service-location').value = ''; document.getElementById('service-sort').value = 'recent';
        history.replaceState(null, '', 'servicos.html'); loadServices(true);
    });
    document.getElementById('load-more-services').addEventListener('click', () => loadServices(false));
    loadServices(true);
});

function scheduleServiceSearch() { clearTimeout(serviceSearchTimer); serviceSearchTimer = setTimeout(() => loadServices(true), 240); }

async function loadServices(reset) {
    if (serviceLoading) return;
    serviceLoading = true;
    const list = document.getElementById('service-list'); const button = document.getElementById('load-more-services');
    if (reset) { servicePage = 0; list.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>'; }
    button.disabled = true;
    const params = new URLSearchParams({ page: String(servicePage), size: '24', sort: document.getElementById('service-sort').value });
    const filters = { q: document.getElementById('service-search').value.trim(), category: document.getElementById('service-category').value,
        minPrice: document.getElementById('service-min-price').value, maxPrice: document.getElementById('service-max-price').value,
        location: document.getElementById('service-location').value.trim() };
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    try {
        const page = await apiCall(`/services/search?${params}`);
        const cards = page.content.map(serviceCard).join('');
        if (reset) list.innerHTML = cards || '<div class="empty-state card-empty"><h2>Nenhum serviço encontrado</h2><p>Tente remover um filtro ou buscar por outra habilidade.</p><button class="btn btn-secondary" type="button" onclick="document.getElementById(\'clear-service-filters\').click()">Limpar filtros</button></div>';
        else if (cards) list.insertAdjacentHTML('beforeend', cards);
        servicePage = page.page + 1; button.hidden = !page.hasNext; button.disabled = false;
        document.getElementById('service-results').textContent = `${page.totalElements} ${page.totalElements === 1 ? 'serviço encontrado' : 'serviços encontrados'}`;
        syncFavoriteButtons();
    } catch (error) {
        if (reset) list.innerHTML = `<div class="empty-state card-empty"><h2>Não foi possível carregar os serviços</h2><p>${escapeHtml(error.message || 'Verifique sua conexão e tente novamente.')}</p><button class="btn btn-secondary" type="button" onclick="loadServices(true)">Tentar novamente</button></div>`;
        button.hidden = true; document.getElementById('service-results').textContent = 'Catálogo indisponível';
    } finally { serviceLoading = false; }
}

function serviceCard(service) {
    const details = `servico.html?id=${encodeURIComponent(service.id)}`;
    return `<article class="card listing-card service-listing-card"><a class="listing-image service-listing-image" href="${details}"><img src="${escapeHtml(service.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(service.title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"></a>${favoriteButton('SERVICE', service.id)}<div class="listing-card-copy"><div class="listing-meta"><span class="badge badge-status">${escapeHtml(service.category || 'Serviço')}</span>${service.deliveryDays ? `<span class="listing-condition">${service.deliveryDays} dias</span>` : ''}</div><h2><a href="${details}">${escapeHtml(service.title)}</a></h2><p class="listing-description">${escapeHtml(service.description || 'Converse com o prestador para saber mais.')}</p><div class="service-provider-row"><a class="service-provider-avatar" href="usuario.html?id=${service.owner?.id || ''}">${escapeHtml((service.owner?.name || 'E').charAt(0).toUpperCase())}</a><span>por <a href="usuario.html?id=${service.owner?.id || ''}">${escapeHtml(service.owner?.name || 'Prestador da comunidade')}</a></span>${service.location ? `<span class="provider-location">${escapeHtml(service.location)}</span>` : ''}</div><div class="service-price-row"><strong class="price">${formatCurrency(service.price)}</strong><span>preço anunciado</span></div><a class="btn service-card-cta" href="${details}">Ver serviço</a></div></article>`;
}
