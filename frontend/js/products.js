let productPage = 0;
let productHasNext = false;
let productSearchTimer;
let productLoading = false;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(location.search);
    document.getElementById('product-search').value = params.get('q') || '';
    ['category', 'product-category'].forEach(() => {});
    const categories = await apiCall('/categories?type=PRODUCT').catch(() => []);
    const select = document.getElementById('product-category');
    categories.forEach(category => select.add(new Option(category, category)));
    select.value = params.get('category') || '';
    document.querySelectorAll('#product-search, #product-location, #product-min-price, #product-max-price').forEach(input => input.addEventListener('input', scheduleProductSearch));
    document.querySelectorAll('#product-category, #product-condition, #product-sort, #product-in-stock').forEach(input => input.addEventListener('change', () => loadProducts(true)));
    document.getElementById('clear-product-filters').addEventListener('click', () => {
        document.getElementById('product-search').value = ''; select.value = '';
        document.getElementById('product-condition').value = ''; document.getElementById('product-min-price').value = '';
        document.getElementById('product-max-price').value = ''; document.getElementById('product-location').value = '';
        document.getElementById('product-sort').value = 'recent'; document.getElementById('product-in-stock').checked = false;
        history.replaceState(null, '', 'produtos.html'); loadProducts(true);
    });
    document.getElementById('load-more-products').addEventListener('click', () => loadProducts(false));
    document.getElementById('product-list').addEventListener('click', async event => {
        const button = event.target.closest('[data-add-product]'); if (!button) return;
        if (!requireAuth()) return;
        setButtonLoading(button, true, 'Adicionando…');
        try { const product = await apiCall(`/products/${button.dataset.addProduct}`); addToCart(product, 1); }
        catch (error) { showToast(error.message || 'Não foi possível adicionar este produto.', 'error'); }
        finally { setButtonLoading(button, false); }
    });
    loadProducts(true);
});

function scheduleProductSearch() { clearTimeout(productSearchTimer); productSearchTimer = setTimeout(() => loadProducts(true), 240); }

async function loadProducts(reset) {
    if (productLoading) return;
    productLoading = true;
    const list = document.getElementById('product-list');
    const button = document.getElementById('load-more-products');
    const results = document.getElementById('product-results');
    if (reset) { productPage = 0; list.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>'; }
    button.disabled = true;
    const params = new URLSearchParams({ page: String(productPage), size: '24', sort: document.getElementById('product-sort').value });
    const values = {
        q: document.getElementById('product-search').value.trim(), category: document.getElementById('product-category').value,
        condition: document.getElementById('product-condition').value, minPrice: document.getElementById('product-min-price').value,
        maxPrice: document.getElementById('product-max-price').value, location: document.getElementById('product-location').value.trim()
    };
    Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
    if (document.getElementById('product-in-stock').checked) params.set('inStock', 'true');
    try {
        const page = await apiCall(`/products/search?${params}`);
        const cards = page.content.map(productCard).join('');
        if (reset) list.innerHTML = cards || '<div class="empty-state card-empty"><h2>Nenhum produto encontrado</h2><p>Tente mudar a busca ou remover algum filtro.</p><button class="btn btn-secondary" type="button" onclick="clearProductFilters()">Limpar filtros</button></div>';
        else if (cards) list.insertAdjacentHTML('beforeend', cards);
        productHasNext = page.hasNext;
        button.hidden = !productHasNext; button.disabled = false;
        results.textContent = `${page.totalElements} ${page.totalElements === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
        syncFavoriteButtons();
    } catch (error) {
        if (reset) list.innerHTML = `<div class="empty-state card-empty"><h2>Não foi possível carregar os anúncios</h2><p>${escapeHtml(error.message || 'Verifique sua conexão e tente de novo.')}</p><button class="btn btn-secondary" type="button" onclick="loadProducts(true)">Tentar novamente</button></div>`;
        button.hidden = true; results.textContent = 'Catálogo indisponível';
    } finally { productLoading = false; }
}

function productCard(p) {
    const details = `produto.html?id=${encodeURIComponent(p.id)}`;
    const stock = Number(p.stock) || 0;
    return `<article class="card listing-card product-listing-card"><a class="listing-image" href="${details}"><img src="${escapeHtml(p.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"></a>${favoriteButton('PRODUCT', p.id)}<div class="listing-card-copy"><div class="listing-meta"><span class="badge badge-status">${escapeHtml(p.category || 'Produto')}</span><span class="listing-condition">${p.conditionType === 'USADO' ? 'Usado' : 'Novo'}</span></div><h2><a href="${details}">${escapeHtml(p.name)}</a></h2><p class="listing-description">${escapeHtml(p.description || 'Consulte os detalhes do anúncio.')}</p><strong class="price">${formatCurrency(p.price)}</strong><div class="listing-seller-row"><a href="usuario.html?id=${p.owner?.id || ''}">${escapeHtml(p.owner?.name || 'Comunidade Elora')}</a><span>${escapeHtml(p.location || '')}</span></div><div class="listing-card-actions"><a class="btn btn-secondary" href="${details}">Ver detalhes</a><button class="btn" type="button" data-add-product="${p.id}" ${stock <= 0 ? 'disabled' : ''}>${stock > 0 ? 'Adicionar' : 'Sem estoque'}</button></div></div></article>`;
}

function clearProductFilters() {
    document.getElementById('clear-product-filters').click();
}
