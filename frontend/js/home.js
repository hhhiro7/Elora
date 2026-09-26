let homeKind = 'PRODUCT';

document.addEventListener('DOMContentLoaded', () => {
    const year = document.getElementById('footer-year');
    if (year) year.textContent = String(new Date().getFullYear());

    document.querySelectorAll('[data-home-kind]').forEach(button => button.addEventListener('click', () => {
        homeKind = button.dataset.homeKind;
        document.querySelectorAll('[data-home-kind]').forEach(item => {
            const active = item === button;
            item.classList.toggle('is-active', active);
            item.setAttribute('aria-pressed', String(active));
        });
        const field = document.getElementById('home-query');
        field.placeholder = homeKind === 'PRODUCT' ? 'O que você está procurando?' : 'Qual talento você precisa?';
        field.setAttribute('aria-label', homeKind === 'PRODUCT' ? 'Buscar produtos' : 'Buscar serviços e profissionais');
        field.focus();
    }));

    document.getElementById('home-search').addEventListener('submit', event => {
        event.preventDefault();
        const query = document.getElementById('home-query').value.trim();
        const destination = homeKind === 'PRODUCT' ? 'produtos.html' : 'servicos.html';
        location.href = `${destination}${query ? `?q=${encodeURIComponent(query)}` : ''}`;
    });

    loadHomeCategories();
});

async function loadHomeCategories() {
    const productBox = document.getElementById('home-product-categories');
    const serviceBox = document.getElementById('home-service-categories');
    const [products, services] = await Promise.allSettled([
        apiCall('/categories?type=PRODUCT'),
        apiCall('/categories?type=SERVICE')
    ]);
    renderCategoryLinks(productBox, products, 'produtos.html', 'Não há categorias de produtos para mostrar ainda.');
    renderCategoryLinks(serviceBox, services, 'servicos.html', 'Não há categorias de serviços para mostrar ainda.');
}

function renderCategoryLinks(container, result, path, emptyMessage) {
    if (!container) return;
    if (result.status !== 'fulfilled') {
        container.innerHTML = '<span class="category-empty">Não foi possível carregar as categorias agora.</span>';
        return;
    }
    if (!result.value.length) {
        container.innerHTML = `<span class="category-empty">${escapeHtml(emptyMessage)}</span>`;
        return;
    }
    container.innerHTML = result.value.slice(0, 6).map(category =>
        `<a class="category-chip" href="${path}?category=${encodeURIComponent(category)}">${escapeHtml(category)}<span aria-hidden="true">↗</span></a>`
    ).join('');
}
