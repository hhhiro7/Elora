let detailProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(location.search).get('id');
    const detail = document.getElementById('product-detail'); const message = document.getElementById('detail-message');
    if (!id || !/^\d+$/.test(id)) { message.textContent = 'Não encontramos esse anúncio. Volte ao catálogo para explorar os produtos.'; message.classList.add('is-error'); return; }
    document.querySelectorAll('[data-dialog-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
    try {
        detailProduct = await apiCall(`/products/${encodeURIComponent(id)}`);
        document.title = `${detailProduct.name} — Elora`;
        const image = document.getElementById('detail-image'); image.src = detailProduct.imageUrl || FALLBACK_IMG; image.alt = `Foto de ${detailProduct.name}`;
        image.onerror = function () { this.onerror = null; this.src = FALLBACK_IMG; };
        document.getElementById('detail-category').textContent = detailProduct.category || 'Produto da comunidade';
        document.getElementById('detail-name').textContent = detailProduct.name || 'Produto sem nome';
        document.getElementById('detail-price').textContent = formatCurrency(detailProduct.price);
        document.getElementById('detail-condition').textContent = detailProduct.conditionType === 'USADO' ? 'Usado' : 'Novo';
        document.getElementById('detail-stock').textContent = detailProduct.stock > 0 ? `${detailProduct.stock} disponível(is)` : 'Sem estoque';
        document.getElementById('detail-location').textContent = detailProduct.location || 'Localização não informada';
        document.getElementById('detail-description').textContent = detailProduct.description || 'O anunciante ainda não adicionou uma descrição.';
        const owner = detailProduct.owner || {};
        document.getElementById('seller-title').textContent = owner.name || 'Vendedor da comunidade';
        document.getElementById('seller-profile-link').href = `usuario.html?id=${owner.id}`;
        const avatar = document.getElementById('seller-avatar');
        if (owner.avatarUrl) avatar.innerHTML = `<img src="${escapeHtml(owner.avatarUrl)}" alt="">`;
        else avatar.textContent = (owner.name || 'E').charAt(0).toUpperCase();
        const sellerRating = await apiCall(`/users/${owner.id}`).catch(() => null);
        document.getElementById('seller-rating').textContent = sellerRating ? `${Number(sellerRating.rating || 0).toFixed(1)} / 5 · ${sellerRating.reviewCount} avaliações` : 'Veja o perfil do vendedor';
        const quantity = document.getElementById('detail-quantity');
        for (let n = 1; n <= Math.min(Number(detailProduct.stock) || 0, 20); n++) quantity.add(new Option(String(n), String(n)));
        const actions = ['add-to-cart', 'buy-now', 'detail-quantity', 'contact-seller'];
        if (!detailProduct.stock || detailProduct.stock <= 0) actions.forEach(action => { const element = document.getElementById(action); element.disabled = true; });
        document.getElementById('detail-favorite').dataset.favoriteType = 'PRODUCT';
        document.getElementById('detail-favorite').dataset.favoriteId = String(detailProduct.id);
        document.getElementById('add-to-cart').addEventListener('click', () => addProductToCart(false));
        document.getElementById('buy-now').addEventListener('click', () => addProductToCart(true));
        document.getElementById('contact-seller').addEventListener('click', () => {
            if (!requireAuth()) return;
            document.getElementById('product-message-content').value = `Olá, vi seu anúncio “${detailProduct.name}” na Elora e gostaria de saber mais.`;
            document.getElementById('product-message-dialog').showModal();
        });
        document.getElementById('product-message-form').addEventListener('submit', sendProductMessage);
        document.getElementById('share-product').addEventListener('click', shareProduct);
        if (getToken()) {
            const profile = await apiCall('/users/me');
            if (profile.id === owner.id) {
                actions.forEach(action => document.getElementById(action).hidden = true);
                document.getElementById('detail-favorite').hidden = true;
                document.getElementById('contact-seller').hidden = true;
            }
        }
        loadRelatedProducts(detailProduct);
        message.hidden = true; detail.hidden = false; syncFavoriteButtons();
    } catch { message.textContent = 'Não foi possível carregar este anúncio agora. Volte ao catálogo e tente novamente.'; message.classList.add('is-error'); }
});

async function addProductToCart(buyNow) {
    if (!requireAuth()) return;
    try {
        const latest = await apiCall(`/products/${detailProduct.id}`);
        const added = addToCart(latest, Number(document.getElementById('detail-quantity').value) || 1);
        if (added && buyNow) location.href = 'checkout.html';
    } catch (error) { showToast(error.message || 'Não foi possível adicionar este produto.', 'error'); }
}

async function sendProductMessage(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Enviando…');
    try {
        const result = await apiCall('/conversations', 'POST', { type: 'PRODUCT', itemId: detailProduct.id, message: document.getElementById('product-message-content').value });
        location.href = `mensagens.html?id=${result.conversationId}`;
    } catch (error) { const feedback = document.getElementById('product-message-feedback'); feedback.className = 'alert error'; feedback.textContent = error.message; }
    finally { setButtonLoading(button, false); }
}

async function shareProduct() {
    const data = { title: detailProduct.name, text: `Confira “${detailProduct.name}” na Elora`, url: location.href };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); showToast('Link copiado.'); } }
    catch (error) { if (error.name !== 'AbortError') showToast('Não foi possível compartilhar o anúncio.', 'error'); }
}

async function loadRelatedProducts(product) {
    try {
        const params = new URLSearchParams({ page: '0', size: '4', sort: 'recent' }); if (product.category) params.set('category', product.category);
        const page = await apiCall(`/products/search?${params}`);
        const related = page.content.filter(item => item.id !== product.id);
        if (!related.length) return;
        document.getElementById('related-products').innerHTML = related.map(p => `<article class="card listing-card"><a class="listing-image" href="produto.html?id=${p.id}"><img src="${escapeHtml(p.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"></a>${favoriteButton('PRODUCT', p.id)}<div class="listing-card-copy"><h3><a href="produto.html?id=${p.id}">${escapeHtml(p.name)}</a></h3><strong class="price">${formatCurrency(p.price)}</strong></div></article>`).join('');
        document.getElementById('related-section').hidden = false; syncFavoriteButtons();
    } catch { /* A página de detalhes continua completa sem recomendações. */ }
}
