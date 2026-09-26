document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    const kind = document.body.dataset.listingForm;
    const isProduct = kind === 'product';
    const form = document.getElementById(isProduct ? 'product-form' : 'service-form');
    const endpoint = isProduct ? '/products' : '/services';
    const select = document.getElementById('category');
    const other = document.getElementById('other-category');
    const description = document.getElementById('description');
    const imageField = document.getElementById('imageUrl');

    apiCall(`/categories?type=${isProduct ? 'PRODUCT' : 'SERVICE'}`).then(categories => {
        categories.forEach(category => select.add(new Option(category, category)));
        select.add(new Option('Outra categoria', 'OUTRA'));
    }).catch(() => {});
    select.addEventListener('change', () => { other.hidden = select.value !== 'OUTRA'; other.required = select.value === 'OUTRA'; if (!other.hidden) other.focus(); updatePreview(); });
    form.addEventListener('input', updatePreview);
    imageField.addEventListener('input', updatePreview);
    description.addEventListener('input', () => { document.getElementById('description-count').textContent = String(description.value.length); });
    document.getElementById('preview-image').onerror = function () { this.hidden = true; document.getElementById('preview-placeholder').hidden = false; };
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const category = select.value === 'OUTRA' ? other.value.trim() : select.value;
        const price = Number(document.getElementById('price').value);
        const msg = document.getElementById('msg');
        if (!category) { msg.className = 'alert error'; msg.textContent = 'Escolha ou informe uma categoria.'; return; }
        if (!Number.isFinite(price) || price <= 0) { msg.className = 'alert error'; msg.textContent = 'O preço precisa ser maior que zero.'; return; }
        const payload = {
            category, description: description.value.trim(), price,
            imageUrl: imageField.value.trim() || null,
            location: document.getElementById('location').value.trim() || null,
            tags: document.getElementById('tags').value.trim() || null
        };
        if (isProduct) Object.assign(payload, {
            name: document.getElementById('name').value.trim(),
            stock: Number(document.getElementById('stock').value),
            conditionType: document.getElementById('conditionType').value
        });
        else Object.assign(payload, {
            title: document.getElementById('title').value.trim(),
            experienceLevel: document.getElementById('experienceLevel').value || null,
            deliveryDays: document.getElementById('deliveryDays').value ? Number(document.getElementById('deliveryDays').value) : null
        });
        const button = form.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Publicando…');
        try {
            await apiCall(endpoint, 'POST', payload);
            msg.className = 'alert success'; msg.textContent = isProduct ? 'Produto publicado com sucesso.' : 'Serviço publicado com sucesso.';
            showToast('Seu anúncio já está publicado.');
            setTimeout(() => { location.href = isProduct ? 'meus-produtos.html' : 'servicos.html'; }, 650);
        } catch (error) { msg.className = 'alert error'; msg.textContent = error.message || 'Não foi possível publicar o anúncio.'; setButtonLoading(button, false); }
    });
    updatePreview();

    function updatePreview() {
        const title = document.getElementById(isProduct ? 'name' : 'title').value.trim();
        document.getElementById('preview-name').textContent = title || (isProduct ? 'Título do produto' : 'Título do serviço');
        document.getElementById('preview-category').textContent = select.value === 'OUTRA' ? other.value || 'Categoria' : select.selectedOptions[0]?.textContent || 'Categoria';
        document.getElementById('preview-description').textContent = description.value.trim() || (isProduct ? 'A descrição do anúncio aparecerá aqui.' : 'A descrição do serviço aparecerá aqui.');
        document.getElementById('preview-price').textContent = formatCurrency(document.getElementById('price').value);
        document.getElementById('preview-location').textContent = document.getElementById('location').value.trim() || (isProduct ? 'Sua região' : 'Online ou região');
        document.getElementById('preview-condition').textContent = isProduct
            ? (document.getElementById('conditionType').value === 'USADO' ? 'Usado' : 'Novo')
            : (document.getElementById('deliveryDays').value ? `${document.getElementById('deliveryDays').value} dias` : 'Prazo a combinar');
        const image = document.getElementById('preview-image');
        if (imageField.value && imageField.validity.valid) { image.src = imageField.value; image.hidden = false; document.getElementById('preview-placeholder').hidden = true; }
        else { image.hidden = true; document.getElementById('preview-placeholder').hidden = false; }
    }
});
