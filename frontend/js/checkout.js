document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    if (!getCart().length) { location.href = 'carrinho.html'; return; }

    renderCheckout();
    renderDeliveryEstimates();
    document.getElementById('checkout-form').addEventListener('submit', submitOrder);
    document.getElementById('address-zip').addEventListener('input', formatPostalCode);
    setupCheckoutSteps();
    document.querySelectorAll('[name="payment"]').forEach(input => input.addEventListener('change', updatePaymentDisclosure));
    updatePaymentDisclosure();
    prefillBuyerDetails();
});

let checkoutStep = 0;
function setupCheckoutSteps() {
    const form = document.getElementById('checkout-form');
    const sections = [...form.querySelectorAll('.checkout-section')];
    const progress = [...document.querySelectorAll('.checkout-steps li')];
    const review = document.createElement('section');
    review.className = 'card checkout-section checkout-review-step'; review.hidden = true; review.id = 'checkout-review-step';
    review.innerHTML = '<div class="checkout-section-heading"><div><h2>Revise sua compra</h2><p>Confira os dados antes de registrar o pedido.</p></div></div><div id="checkout-review-content" class="checkout-review-content"><p class="loading-state">Carregando anúncios atuais…</p></div>';
    const actions = document.createElement('div'); actions.className = 'checkout-step-actions';
    actions.innerHTML = '<button type="button" class="btn btn-secondary" id="checkout-step-back" hidden>Voltar</button><button type="button" class="btn" id="checkout-step-next">Continuar</button>';
    form.insertBefore(review, form.querySelector('#place-order')); form.insertBefore(actions, form.querySelector('#place-order'));
    document.getElementById('checkout-step-back').addEventListener('click', () => showCheckoutStep(Math.max(0, checkoutStep - 1)));
    document.getElementById('checkout-step-next').addEventListener('click', async () => {
        if (checkoutStep === 0 && !validateCheckoutFields([...sections[0].querySelectorAll('input'), ...sections[1].querySelectorAll('input')])) return;
        if (checkoutStep === 2) { await renderCheckoutReview(); }
        showCheckoutStep(Math.min(3, checkoutStep + 1));
    });
    showCheckoutStep(0);
}

function showCheckoutStep(index) {
    checkoutStep = index;
    const form = document.getElementById('checkout-form');
    const sections = [...form.querySelectorAll('.checkout-section:not(.checkout-review-step)')];
    const review = document.getElementById('checkout-review-step');
    sections.forEach(section => { section.hidden = true; });
    if (index === 0) { sections[0].hidden = false; sections[1].hidden = false; }
    if (index === 1) sections[2].hidden = false;
    if (index === 2) sections[3].hidden = false;
    review.hidden = index !== 3;
    document.querySelectorAll('.checkout-steps li').forEach((step, i) => { step.classList.toggle('is-current', i === index); step.classList.toggle('is-complete', i < index); if (i === index) step.setAttribute('aria-current','step'); else step.removeAttribute('aria-current'); });
    document.getElementById('checkout-step-back').hidden = index === 0;
    document.getElementById('checkout-step-next').hidden = index === 3;
    document.getElementById('place-order').hidden = index !== 3;
    document.getElementById('checkout-step-next').textContent = index === 2 ? 'Revisar pedido' : 'Continuar';
}

function validateCheckoutFields(fields) {
    const visible = fields.filter(field => !field.disabled && field.required);
    const invalid = visible.find(field => !field.checkValidity());
    if (invalid) { invalid.reportValidity(); invalid.focus(); return false; }
    const postalCode = document.getElementById('address-zip').value.replace(/\D/g, '');
    if (postalCode.length !== 8) { document.getElementById('address-zip').setCustomValidity('Informe um CEP com 8 números.'); document.getElementById('address-zip').reportValidity(); document.getElementById('address-zip').setCustomValidity(''); return false; }
    const phone = document.getElementById('buyer-phone').value.replace(/\D/g, '');
    if (phone.length < 10) { document.getElementById('buyer-phone').setCustomValidity('Informe um celular com DDD.'); document.getElementById('buyer-phone').reportValidity(); document.getElementById('buyer-phone').setCustomValidity(''); return false; }
    return true;
}

async function renderCheckoutReview() {
    const cart = getCart(); const content = document.getElementById('checkout-review-content');
    content.innerHTML = '<p class="loading-state">Conferindo anúncios e vendedores…</p>';
    try {
        const products = await Promise.all(cart.map(item => apiCall(`/products/${item.productId}`)));
        const verifiedSubtotal = cart.reduce((sum,item,index)=>sum + Number(products[index].price) * Number(item.quantity),0);
        const delivery = document.querySelector('[name="delivery"]:checked').value === 'EXPRESS' ? 'Rápida' : 'Econômica';
        const estimateId = delivery === 'Rápida' ? 'express-estimate' : 'standard-estimate';
        const paymentValue = document.querySelector('[name="payment"]:checked').value;
        const payment = paymentValue === 'PIX' ? 'Pix (simulado)' : paymentValue === 'CREDIT_CARD' ? 'Cartão de crédito (simulado)' : 'Cartão de débito (simulado)';
        content.innerHTML = `<div class="checkout-review-grid"><section><h3>Dados do comprador</h3><p>${escapeHtml(document.getElementById('buyer-name').value)}</p><p>${escapeHtml(document.getElementById('buyer-email').value)}</p><p>${escapeHtml(document.getElementById('buyer-phone').value)}</p></section><section><h3>Endereço</h3><p>${escapeHtml(buildDeliveryAddress())}</p></section><section><h3>Entrega</h3><p>${delivery} · ${escapeHtml(document.getElementById(estimateId).textContent.replace('Previsão: ',''))}</p><p>Frete: grátis na simulação</p></section><section><h3>Pagamento</h3><p>${payment}</p><p class="checkout-inline-note">Nenhum pagamento real será processado.</p></section></div><h3 class="checkout-review-products-title">Produtos e vendedores</h3><div class="checkout-review-products">${cart.map((item,index)=>`<article class="checkout-review-product"><img src="${escapeHtml(products[index].imageUrl || item.imageUrl || FALLBACK_IMG)}" alt="" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"><div><strong>${escapeHtml(products[index].name)}</strong><span>Vendido por ${escapeHtml(products[index].owner?.name || 'anunciante')} · ${item.quantity} × ${formatCurrency(products[index].price)}</span></div><b>${formatCurrency(Number(products[index].price) * Number(item.quantity))}</b></article>`).join('')}</div><div class="checkout-review-total"><span>Subtotal</span><strong>${formatCurrency(verifiedSubtotal)}</strong><span>Frete</span><strong>Grátis</strong><span>Total da compra</span><strong>${formatCurrency(verifiedSubtotal)}</strong></div>`;
    } catch (error) { content.innerHTML = `<div class="alert error">${escapeHtml(error.message || 'Não foi possível verificar os anúncios. Tente novamente.')}</div>`; }
}

function updatePaymentDisclosure() {
    const selected = document.querySelector('[name="payment"]:checked')?.value;
    let note = document.getElementById('checkout-card-demo-note');
    if (selected === 'PIX') { note?.remove(); return; }
    if (!note) { note = document.createElement('p'); note.id = 'checkout-card-demo-note'; note.className = 'checkout-demo-disclaimer'; document.querySelector('.checkout-payment-list')?.after(note); }
    note.textContent = 'Cartão em modo de demonstração. Não informe número, validade ou código de segurança reais. Nenhum dado de cartão é enviado ou armazenado.';
}

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
