document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cart-items').addEventListener('click', event => {
        const button = event.target.closest('[data-cart-page-action]'); if (!button) return;
        const id = button.dataset.productId; const item = getCart().find(row => String(row.productId) === id); if (!item) return;
        if (button.dataset.cartPageAction === 'increase') updateCartQty(id, item.quantity + 1);
        if (button.dataset.cartPageAction === 'decrease') updateCartQty(id, item.quantity - 1);
        if (button.dataset.cartPageAction === 'remove') removeFromCart(id);
    });
    window.addEventListener('elora:cart-updated', renderCartPage);
    renderCartPage();
});

function renderCartPage() {
    const cart = getCart(); const list = document.getElementById('cart-items'); const summary = document.getElementById('cart-summary');
    document.querySelector('.cart-page-layout')?.classList.toggle('is-empty', !cart.length);
    if (!cart.length) {
        list.innerHTML = '<div class="empty-state card-empty"><h2>Sua sacola está vazia</h2><p>Explore os produtos anunciados para encontrar algo que goste.</p><a href="produtos.html" class="btn">Explorar produtos</a></div>';
        summary.replaceChildren(); summary.hidden = true; return;
    }
    summary.hidden = false;
    list.innerHTML = cart.map(item => `<article class="cart-page-item card"><img src="${escapeHtml(item.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"><div class="cart-page-item-info"><a href="produto.html?id=${encodeURIComponent(item.productId)}"><h2>${escapeHtml(item.name)}</h2></a><span>${formatCurrency(item.price)} cada</span><div class="cart-drawer-quantity"><button type="button" data-cart-page-action="decrease" data-product-id="${item.productId}" aria-label="Diminuir quantidade">−</button><span>${item.quantity}</span><button type="button" data-cart-page-action="increase" data-product-id="${item.productId}" aria-label="Aumentar quantidade" ${item.quantity >= item.stock ? 'disabled' : ''}>+</button></div></div><div class="cart-page-line-total"><strong>${formatCurrency(Number(item.price) * Number(item.quantity))}</strong><button type="button" class="cart-remove-button" data-cart-page-action="remove" data-product-id="${item.productId}">Remover</button></div></article>`).join('');
    const total = cartTotal(cart);
    summary.innerHTML = `<h2>Resumo</h2><div class="cart-total-row"><span>${cartItemCount(cart)} itens</span><span>${formatCurrency(total)}</span></div><div class="cart-total-row cart-total-final"><span>Total</span><span>${formatCurrency(total)}</span></div><p class="muted-copy">O pagamento é simulado para esta versão da Elora.</p><a class="btn cart-checkout-button" href="checkout.html">Continuar para o checkout <span aria-hidden="true">→</span></a>`;
}
