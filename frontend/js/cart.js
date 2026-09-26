// Cart state is shared between pages through localStorage.
// Each item: { productId, name, price, imageUrl, stock, quantity }

function getCart() {
    try {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        return Array.isArray(cart) ? cart : [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('elora:cart-updated'));
}

function addToCart(product, quantity = 1) {
    const cart = getCart();
    const existing = cart.find(item => String(item.productId) === String(product.id));
    const stock = Math.max(0, Number(product.stock) || 0);
    const requested = Math.max(1, Number(quantity) || 1);

    if (stock < 1) {
        showCartToast('Este produto está sem estoque.', 'error');
        return false;
    }

    const currentQuantity = existing ? Number(existing.quantity) || 0 : 0;
    const nextQuantity = Math.min(currentQuantity + requested, stock);
    if (nextQuantity === currentQuantity) {
        showCartToast(`Você já adicionou todo o estoque disponível (${stock}).`, 'error');
        return false;
    }

    if (existing) {
        existing.quantity = nextQuantity;
        existing.stock = stock;
        existing.name = product.name;
        existing.price = product.price;
        existing.imageUrl = product.imageUrl;
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            stock,
            quantity: nextQuantity
        });
    }

    saveCart(cart);
    showCartToast(`${product.name} adicionado ao carrinho.`);
    return true;
}

function removeFromCart(productId) {
    saveCart(getCart().filter(item => String(item.productId) !== String(productId)));
}

function updateCartQty(productId, quantity) {
    const cart = getCart();
    const item = cart.find(entry => String(entry.productId) === String(productId));
    if (!item) return;
    item.quantity = Math.max(1, Math.min(Number(quantity) || 1, Number(item.stock) || 1));
    saveCart(cart);
}

function cartTotal(cart = getCart()) {
    return cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
}

function cartItemCount(cart = getCart()) {
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

let cartToastTimer;
let cartDrawerReturnFocus = null;
let cartDrawerInertState = [];
let lastCartCount = null;

function showCartToast(message, type = 'success') {
    const toast = document.getElementById('cart-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle('is-error', type === 'error');
    toast.classList.add('is-visible');
    window.clearTimeout(cartToastTimer);
    cartToastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function createCartDrawer() {
    if (document.getElementById('cart-drawer-root')) return;

    const root = document.createElement('div');
    root.id = 'cart-drawer-root';
    root.className = 'cart-drawer-root';
    root.innerHTML = `
        <div class="cart-drawer-backdrop" data-cart-close aria-hidden="true"></div>
        <aside class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" aria-hidden="true" inert>
            <header class="cart-drawer-header">
                <div><p class="cart-drawer-kicker">ELORA / SUA SACOLA</p><h2 id="cart-drawer-title">Seu carrinho <span id="cart-drawer-count"></span></h2></div>
                <button class="cart-close-button" type="button" data-cart-close aria-label="Fechar carrinho"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
            </header>
            <div class="cart-drawer-items" id="cart-drawer-items"></div>
            <div class="cart-drawer-footer" id="cart-drawer-footer"></div>
        </aside>
        <div class="cart-toast" id="cart-toast" role="status" aria-live="polite" aria-atomic="true"></div>
    `;
    document.body.appendChild(root);

    root.addEventListener('click', event => {
        if (event.target.closest('[data-cart-close]')) closeCartDrawer();
        const actionButton = event.target.closest('[data-cart-action]');
        if (!actionButton) return;
        const { cartAction, productId } = actionButton.dataset;
        const item = getCart().find(entry => String(entry.productId) === String(productId));
        if (!item) return;
        if (cartAction === 'increase') updateCartQty(productId, item.quantity + 1);
        if (cartAction === 'decrease') updateCartQty(productId, item.quantity - 1);
        if (cartAction === 'remove') removeFromCart(productId);
    });

    document.getElementById('nav-cart-toggle')?.addEventListener('click', openCartDrawer);
    document.addEventListener('keydown', handleCartKeydown);
    window.addEventListener('elora:cart-updated', renderCartDrawer);
    window.addEventListener('storage', event => {
        if (event.key === 'cart') renderCartDrawer();
    });
    renderCartDrawer();
    initEntranceReveals();
}

function renderCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const itemsContainer = document.getElementById('cart-drawer-items');
    const footer = document.getElementById('cart-drawer-footer');
    if (!drawer || !itemsContainer || !footer) return;

    const cart = getCart();
    const count = cartItemCount(cart);
    const countLabel = count === 1 ? '1 item' : `${count} itens`;
    const navCount = document.getElementById('nav-cart-count');
    const navToggle = document.getElementById('nav-cart-toggle');
    if (navCount) navCount.textContent = String(count);
    if (navCount) {
        if (lastCartCount !== null && lastCartCount !== count) {
            navCount.classList.remove('is-bumped');
            void navCount.offsetWidth;
            navCount.classList.add('is-bumped');
        }
    }
    lastCartCount = count;
    if (navToggle) navToggle.setAttribute('aria-label', `Abrir carrinho, ${countLabel}`);
    const headerCount = document.getElementById('cart-drawer-count');
    if (headerCount) headerCount.textContent = `(${count})`;

    itemsContainer.replaceChildren();
    if (cart.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'cart-drawer-empty';
        empty.innerHTML = '<span class="cart-empty-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6"/></svg></span><h3>Sua sacola está vazia</h3><p>Quando encontrar algo legal, ele aparece aqui.</p><a class="btn cart-continue-button" href="produtos.html">Explorar produtos <span aria-hidden="true">→</span></a>';
        itemsContainer.appendChild(empty);
        footer.replaceChildren();
        return;
    }

    cart.forEach(item => itemsContainer.appendChild(createCartItem(item)));

    const total = cartTotal(cart);
    footer.innerHTML = `
        <div class="cart-total-row"><span>Subtotal</span><span>${formatCartCurrency(total)}</span></div>
        <div class="cart-total-row cart-total-final"><span>Total</span><span>${formatCartCurrency(total)}</span></div>
        <p class="cart-shipping-note">Confira seus itens antes de finalizar a compra.</p>
        <a class="btn cart-checkout-button" href="checkout.html">Finalizar compra <span aria-hidden="true">→</span></a>
        <a class="cart-full-page-link" href="carrinho.html">Ver carrinho completo</a>
    `;
}

function createCartItem(item) {
    const row = document.createElement('article');
    row.className = 'cart-drawer-item';
    row.dataset.productId = item.productId;

    const image = document.createElement('img');
    image.className = 'cart-drawer-image';
    image.src = item.imageUrl || (typeof FALLBACK_IMG !== 'undefined' ? FALLBACK_IMG : '');
    image.alt = item.name ? `Imagem de ${item.name}` : 'Imagem do produto';
    image.loading = 'lazy';
    image.onerror = () => {
        image.onerror = null;
        if (typeof FALLBACK_IMG !== 'undefined') image.src = FALLBACK_IMG;
    };

    const content = document.createElement('div');
    content.className = 'cart-drawer-item-content';
    const top = document.createElement('div');
    top.className = 'cart-drawer-item-top';
    const name = document.createElement('h3');
    name.textContent = item.name || 'Produto';
    const price = document.createElement('span');
    price.className = 'cart-drawer-item-price';
    price.textContent = formatCartCurrency(item.price);
    top.append(name, price);

    const bottom = document.createElement('div');
    bottom.className = 'cart-drawer-item-bottom';
    const quantity = document.createElement('div');
    quantity.className = 'cart-drawer-quantity';
    quantity.setAttribute('aria-label', 'Quantidade');
    quantity.append(
        cartActionButton('decrease', item, 'Diminuir quantidade', '−', Number(item.quantity) <= 1),
        Object.assign(document.createElement('span'), { textContent: String(item.quantity) }),
        cartActionButton('increase', item, 'Aumentar quantidade', '+', Number(item.quantity) >= Number(item.stock))
    );
    const lineTotal = document.createElement('span');
    lineTotal.className = 'cart-drawer-line-total';
    lineTotal.textContent = formatCartCurrency(Number(item.price) * Number(item.quantity));
    bottom.append(quantity, lineTotal);

    const remove = cartActionButton('remove', item, `Remover ${item.name || 'produto'}`, 'Remover', false);
    remove.classList.add('cart-remove-button');
    content.append(top, bottom, remove);
    row.append(image, content);
    return row;
}

function cartActionButton(action, item, label, text, disabled) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.cartAction = action;
    button.dataset.productId = String(item.productId);
    button.setAttribute('aria-label', label);
    button.textContent = text;
    button.disabled = disabled;
    return button;
}

function formatCartCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function openCartDrawer() {
    const root = document.getElementById('cart-drawer-root');
    const drawer = document.getElementById('cart-drawer');
    if (!root || !drawer || root.classList.contains('is-open')) return;

    cartDrawerReturnFocus = document.activeElement;
    cartDrawerInertState = Array.from(document.body.children)
        .filter(element => element !== root)
        .map(element => ({ element, inert: element.inert }));
    cartDrawerInertState.forEach(({ element }) => { element.inert = true; });
    document.body.classList.add('cart-drawer-open');
    drawer.inert = false;
    drawer.setAttribute('aria-hidden', 'false');
    root.classList.add('is-open');
    document.getElementById('nav-cart-toggle')?.setAttribute('aria-expanded', 'true');
    window.requestAnimationFrame(() => drawer.querySelector('.cart-close-button')?.focus());
}

function closeCartDrawer() {
    const root = document.getElementById('cart-drawer-root');
    const drawer = document.getElementById('cart-drawer');
    if (!root || !drawer || !root.classList.contains('is-open')) return;

    root.classList.remove('is-open');
    drawer.inert = true;
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-open');
    cartDrawerInertState.forEach(({ element, inert }) => { element.inert = inert; });
    cartDrawerInertState = [];
    document.getElementById('nav-cart-toggle')?.setAttribute('aria-expanded', 'false');
    if (cartDrawerReturnFocus?.isConnected) cartDrawerReturnFocus.focus();
    cartDrawerReturnFocus = null;
}

function handleCartKeydown(event) {
    const root = document.getElementById('cart-drawer-root');
    if (!root?.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeCartDrawer();
        return;
    }
    if (event.key !== 'Tab') return;
    const drawer = document.getElementById('cart-drawer');
    const focusable = Array.from(drawer.querySelectorAll('a[href], button:not(:disabled)'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function initEntranceReveals() {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.remove('reveal-pending');
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    targets.forEach(target => {
        target.classList.add('reveal-pending');
        observer.observe(target);
    });
}

document.addEventListener('DOMContentLoaded', createCartDrawer);
