document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    if (!getCart().length) { location.href = 'carrinho.html'; return; }

    renderCheckout();
    renderDeliveryEstimates();
    document.getElementById('checkout-form').addEventListener('submit', submitOrder);
    document.getElementById('address-zip').addEventListener('input', formatPostalCode);
    prefillBuyerDetails();
});

function renderCheckout() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    document.getElementById('checkout-item-count').textContent = `${count} ${count === 1 ? 'item' : 'itens'} na sacola`;
    document.getElementById('checkout-items').innerHTML = cart.map(item => `<div class="checkout-item"><img src="${escapeHtml(item.imageUrl || FALLBACK_IMG)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"><div class="checkout-item-info"><strong>${escapeHtml(item.name)}</strong><span>${Number(item.quantity)} × ${formatCurrency(item.price)}</span></div><b>${formatCurrency(Number(item.quantity) * Number(item.price))}</b></div>`).join('');
    document.getElementById('checkout-total').innerHTML = `<div class="checkout-total-row"><span>Produtos</span><strong>${formatCurrency(cartTotal(cart))}</strong></div><div class="checkout-total-row"><span>Frete <small>simulado</small></span><strong>Grátis</strong></div><div class="checkout-total-row checkout-grand-total"><span>Total</span><strong>${formatCurrency(cartTotal(cart))}</strong></div>`;
}

async function prefillBuyerDetails() {
    const status = document.getElementById('checkout-profile-status');
    try {
        const profile = await apiCall('/users/me');
        fillWhenEmpty('buyer-name', profile.name);
        fillWhenEmpty('buyer-email', profile.email);
        fillWhenEmpty('buyer-phone', profile.phone);
        fillWhenEmpty('address-city', profile.city);
        status.textContent = 'Dados preenchidos com as informações da sua conta. Você pode ajustá-los para este pedido.';
    } catch {
        status.textContent = 'Preencha seus dados para identificar e entregar o pedido.';
    }
}

function fillWhenEmpty(id, value) {
    const field = document.getElementById(id);
    if (field && !field.value && value) field.value = value;
}

function formatPostalCode(event) {
    const input = event.currentTarget;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    input.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function addBusinessDays(start, days) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    let remaining = days;
    while (remaining > 0) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() !== 0 && date.getDay() !== 6) remaining--;
    }
    return date;
}

function formatEstimate(startDays, endDays) {
    const now = new Date();
    const first = addBusinessDays(now, startDays);
    const last = addBusinessDays(now, endDays);
    const format = date => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(date).replace('.', '');
    return `Previsão: ${format(first)} a ${format(last)} · dias úteis`;
}

function renderDeliveryEstimates() {
    document.getElementById('standard-estimate').textContent = formatEstimate(5, 7);
    document.getElementById('express-estimate').textContent = formatEstimate(2, 3);
}

function buildDeliveryAddress() {
    const value = id => document.getElementById(id).value.trim();
    const line = [value('address-street'), value('address-number')].filter(Boolean).join(', ');
    const parts = [line, value('address-complement'), value('address-district'), `${value('address-zip')} · ${value('address-city')} - ${value('address-state')}`];
    return parts.filter(Boolean).join(' · ');
}

async function submitOrder(event) {
    event.preventDefault();
    const cart = getCart();
    if (!cart.length) { location.href = 'carrinho.html'; return; }

    const form = event.currentTarget;
    const button = document.getElementById('place-order');
    const message = document.getElementById('checkout-message');
    const postalCode = document.getElementById('address-zip').value.replace(/\D/g, '');
    const phoneDigits = document.getElementById('buyer-phone').value.replace(/\D/g, '');
    if (postalCode.length !== 8) {
        document.getElementById('address-zip').setCustomValidity('Informe um CEP com 8 números.');
        document.getElementById('address-zip').reportValidity();
        document.getElementById('address-zip').setCustomValidity('');
        return;
    }
    if (phoneDigits.length < 10) {
        document.getElementById('buyer-phone').setCustomValidity('Informe um celular com DDD.');
        document.getElementById('buyer-phone').reportValidity();
        document.getElementById('buyer-phone').setCustomValidity('');
        return;
    }

    const deliveryAddress = buildDeliveryAddress();
    if (deliveryAddress.length > 1000) {
        message.className = 'alert error';
        message.textContent = 'O endereço ficou muito longo. Revise e reduza os detalhes.';
        return;
    }

    setButtonLoading(button, true, 'Confirmando…');
    message.className = 'alert';
    message.textContent = '';
    try {
        const order = await apiCall('/orders', 'POST', {
            paymentMethod: form.elements.payment.value,
            deliveryAddress,
            items: cart.map(item => ({ productId: Number(item.productId), quantity: Number(item.quantity) }))
        });
        saveCart([]);
        const selectedDelivery = form.elements.delivery.value;
        const deliveryEstimate = selectedDelivery === 'EXPRESS'
            ? document.getElementById('express-estimate').textContent.replace('Previsão: ', '')
            : document.getElementById('standard-estimate').textContent.replace('Previsão: ', '');
        document.querySelector('.checkout-layout').innerHTML = `<section class="card checkout-success"><span class="checkout-success-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><p class="catalog-eyebrow">Pedido registrado</p><h2>Está tudo certo, ${escapeHtml(document.getElementById('buyer-name').value.trim().split(/\s+/)[0])}.</h2><p>O pedido <strong>#${escapeHtml(order.id)}</strong> foi salvo na sua conta. Esta compra é uma demonstração e nenhuma cobrança foi feita.</p><div class="checkout-success-delivery"><span>Entrega ${selectedDelivery === 'EXPRESS' ? 'rápida' : 'econômica'}</span><strong>${escapeHtml(deliveryEstimate)}</strong><span>Frete demonstrativo</span><strong>Grátis</strong><span>Total validado no servidor</span><strong>${formatCurrency(order.totalAmount)}</strong></div><div class="checkout-success-actions"><a class="btn" href="pedido.html?id=${encodeURIComponent(order.id)}">Acompanhar pedido</a><a class="seller-view-link" href="meus-pedidos.html">Ver todos os pedidos</a></div></section>`;
        message.className = 'alert success';
        message.textContent = 'Pedido criado e associado à sua conta.';
    } catch (error) {
        message.className = 'alert error';
        message.textContent = error.message || 'Não foi possível confirmar o pedido. Revise o estoque e tente novamente.';
        setButtonLoading(button, false);
    }
}
