document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    if (!getCart().length) { location.href = 'carrinho.html'; return; }
    renderCheckout();
    document.getElementById('checkout-form').addEventListener('submit', submitOrder);
});

function renderCheckout() {
    const cart = getCart();
    document.getElementById('checkout-items').innerHTML = cart.map(item => `<div class="checkout-item"><img src="${escapeHtml(item.imageUrl || FALLBACK_IMG)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"><div><strong>${escapeHtml(item.name)}</strong><span>${item.quantity} × ${formatCurrency(item.price)}</span></div><b>${formatCurrency(Number(item.quantity) * Number(item.price))}</b></div>`).join('');
    document.getElementById('checkout-total').innerHTML = `<span>Total</span><strong>${formatCurrency(cartTotal(cart))}</strong>`;
}

async function submitOrder(event) {
    event.preventDefault();
    const cart = getCart(); if (!cart.length) { location.href = 'carrinho.html'; return; }
    const form = event.currentTarget; const button = document.getElementById('place-order'); setButtonLoading(button, true, 'Confirmando…');
    const message = document.getElementById('checkout-message');
    try {
        const order = await apiCall('/orders', 'POST', {
            paymentMethod: form.elements.payment.value,
            deliveryAddress: document.getElementById('delivery-address').value.trim(),
            items: cart.map(item => ({ productId: Number(item.productId), quantity: Number(item.quantity) }))
        });
        saveCart([]);
        document.querySelector('.checkout-layout').innerHTML = `<section class="card checkout-success"><span class="success-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><h2>Pedido confirmado</h2><p>Seu pedido <strong>#${order.id}</strong> foi criado. A compra é simulada e não houve cobrança.</p><a class="btn" href="pedido.html?id=${order.id}">Acompanhar pedido</a><a class="seller-view-link" href="meus-pedidos.html">Ver todos os pedidos</a></section>`;
        message.className = 'alert success'; message.textContent = 'Estoque atualizado e pedido salvo.';
    } catch (error) {
        message.className = 'alert error'; message.textContent = error.message || 'Não foi possível confirmar o pedido.';
        setButtonLoading(button, false);
    }
}
