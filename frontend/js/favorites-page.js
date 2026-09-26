let favoriteItems = [];
let favoriteFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    document.querySelectorAll('[data-favorite-filter]').forEach(button => button.addEventListener('click', () => {
        favoriteFilter = button.dataset.favoriteFilter;
        document.querySelectorAll('[data-favorite-filter]').forEach(item => item.classList.toggle('is-active', item === button));
        renderFavorites();
    }));
    window.addEventListener('elora:favorites-updated', loadFavorites);
    loadFavorites();
});

async function loadFavorites() {
    const list = document.getElementById('favorites-list');
    try { favoriteItems = await apiCall('/favorites'); renderFavorites(); }
    catch (error) { list.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar os favoritos.')}</p>`; }
}

function renderFavorites() {
    const list = document.getElementById('favorites-list');
    const items = favoriteItems.filter(item => favoriteFilter === 'ALL' || item.type === favoriteFilter);
    if (!items.length) {
        list.innerHTML = `<div class="empty-state card-empty"><h2>${favoriteFilter === 'ALL' ? 'Sua lista ainda está vazia' : 'Nenhum favorito por aqui'}</h2><p>Salve anúncios que chamarem sua atenção para voltar a eles depois.</p><a class="btn" href="produtos.html">Explorar anúncios</a></div>`;
        return;
    }
    list.innerHTML = items.map(item => `<article class="card listing-card ${item.type === 'SERVICE' ? 'service-listing-card' : ''}"><a class="listing-image" href="${escapeHtml(item.link)}"><img src="${escapeHtml(item.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"></a>${favoriteButton(item.type, item.itemId, true)}<div class="listing-card-copy"><span class="badge badge-status">${item.type === 'SERVICE' ? 'Serviço' : 'Produto'}</span><h3><a href="${escapeHtml(item.link)}">${escapeHtml(item.title)}</a></h3><strong class="price">${item.type === 'SERVICE' ? 'A partir de ' : ''}${formatCurrency(item.price)}</strong></div></article>`).join('');
}
