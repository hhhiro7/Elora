let homeKind = 'PRODUCT';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('footer-year').textContent = String(new Date().getFullYear());
    document.querySelectorAll('[data-home-kind]').forEach(button => button.addEventListener('click', () => {
        homeKind = button.dataset.homeKind;
        document.querySelectorAll('[data-home-kind]').forEach(item => item.classList.toggle('is-active', item === button));
        document.getElementById('home-query').placeholder = homeKind === 'PRODUCT' ? 'O que você está procurando?' : 'Qual talento você precisa?';
    }));
    document.getElementById('home-search').addEventListener('submit', event => {
        event.preventDefault(); const q = document.getElementById('home-query').value.trim();
        location.href = `${homeKind === 'PRODUCT' ? 'produtos.html' : 'servicos.html'}${q ? `?q=${encodeURIComponent(q)}` : ''}`;
    });
    loadHome();
});

async function loadHome() {
    const productBox = document.getElementById('home-products');
    const serviceBox = document.getElementById('home-services');
    const categories = document.getElementById('home-categories');
    const results = await Promise.allSettled([
        apiCall('/products/search?page=0&size=4&sort=recent'),
        apiCall('/services/search?page=0&size=4&sort=recent'),
        apiCall('/categories?type=PRODUCT'), apiCall('/categories?type=SERVICE')
    ]);
    const [products, services, productCats, serviceCats] = results;
    productBox.innerHTML = products.status === 'fulfilled' && products.value.content.length
        ? products.value.content.map(homeProductCard).join('')
        : '<div class="empty-state card-empty"><h3>Ainda não há produtos anunciados</h3><p>Os anúncios publicados pela comunidade aparecem aqui.</p><a href="vender.html" class="btn btn-secondary">Publicar um produto</a></div>';
    serviceBox.innerHTML = services.status === 'fulfilled' && services.value.content.length
        ? services.value.content.map(homeServiceCard).join('')
        : '<div class="empty-state card-empty"><h3>Ainda não há serviços publicados</h3><p>Quando os prestadores criarem anúncios, eles estarão disponíveis aqui.</p><a href="oferecer-servico.html" class="btn btn-secondary">Oferecer um serviço</a></div>';
    const chips = [];
    if (productCats.status === 'fulfilled') productCats.value.forEach(category => chips.push(`<a class="category-chip" href="produtos.html?category=${encodeURIComponent(category)}"><span class="category-chip-mark" aria-hidden="true">P</span>${escapeHtml(category)}</a>`));
    if (serviceCats.status === 'fulfilled') chips.push(...serviceCats.value.slice(0, 5).map(category => `<a class="category-chip category-chip-service" href="servicos.html?category=${encodeURIComponent(category)}"><span class="category-chip-mark" aria-hidden="true">S</span>${escapeHtml(category)}</a>`));
    categories.innerHTML = chips.join('') || '<p class="empty-state">As categorias estarão disponíveis quando a API responder.</p>';
    syncFavoriteButtons();
}

function homeProductCard(p) {
    return `<article class="card listing-card"><a class="listing-image" href="produto.html?id=${encodeURIComponent(p.id)}"><img src="${escapeHtml(p.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"></a>${favoriteButton('PRODUCT', p.id)}<div class="listing-card-copy"><div class="listing-meta"><span class="badge badge-status">${escapeHtml(p.category || 'Produto')}</span><span class="listing-condition">${escapeHtml(p.conditionType === 'USADO' ? 'Usado' : 'Novo')}</span></div><h3><a href="produto.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a></h3><strong class="price">${formatCurrency(p.price)}</strong><p class="listing-seller">${escapeHtml(p.owner?.name || 'Comunidade Elora')}${p.location ? ` · ${escapeHtml(p.location)}` : ''}</p></div></article>`;
}

function homeServiceCard(s) {
    return `<article class="card listing-card service-listing-card"><a class="listing-image" href="servico.html?id=${encodeURIComponent(s.id)}"><img src="${escapeHtml(s.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(s.title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"></a>${favoriteButton('SERVICE', s.id)}<div class="listing-card-copy"><div class="listing-meta"><span class="badge badge-status">${escapeHtml(s.category || 'Serviço')}</span></div><h3><a href="servico.html?id=${encodeURIComponent(s.id)}">${escapeHtml(s.title)}</a></h3><strong class="price">A partir de ${formatCurrency(s.price)}</strong><p class="listing-seller">${escapeHtml(s.owner?.name || 'Prestador da comunidade')}${s.location ? ` · ${escapeHtml(s.location)}` : ''}</p></div></article>`;
}
