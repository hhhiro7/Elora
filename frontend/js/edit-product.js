document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    const id = new URLSearchParams(location.search).get('id'); const form = document.getElementById('product-form'); const msg = document.getElementById('msg');
    if (!id || !/^\d+$/.test(id)) { location.href = 'meus-produtos.html'; return; }
    const category = document.getElementById('category'); const other = document.getElementById('other-category');
    try {
        const [items, categories] = await Promise.all([apiCall('/products/mine'), apiCall('/categories?type=PRODUCT')]);
        const product = items.find(item => String(item.id) === id);
        if (!product) { msg.className = 'alert error'; msg.textContent = 'Este produto não pertence à sua conta.'; return; }
        categories.forEach(value => category.add(new Option(value, value)));
        category.add(new Option('Outra categoria', 'OUTRA'));
        ['name', 'description', 'price', 'stock', 'conditionType', 'imageUrl', 'location', 'tags'].forEach(key => document.getElementById(key).value = product[key] ?? '');
        if (categories.includes(product.category)) category.value = product.category;
        else { category.value = 'OUTRA'; other.value = product.category || ''; other.hidden = false; }
        category.addEventListener('change', () => { other.hidden = category.value !== 'OUTRA'; other.required = !other.hidden; });
        form.addEventListener('submit', async event => {
            event.preventDefault(); const button = form.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Salvando…');
            try {
                await apiCall(`/products/${id}`, 'PUT', {
                    name: form.elements.name.value.trim(), category: category.value === 'OUTRA' ? other.value.trim() : category.value,
                    description: form.elements.description.value.trim(), price: Number(form.elements.price.value), stock: Number(form.elements.stock.value),
                    conditionType: form.elements.conditionType.value, imageUrl: form.elements.imageUrl.value.trim() || null,
                    location: form.elements.location.value.trim() || null, tags: form.elements.tags.value.trim() || null
                });
                msg.className = 'alert success'; msg.textContent = 'Anúncio atualizado.'; showToast('Alterações salvas.');
                setTimeout(() => location.href = 'meus-produtos.html', 500);
            } catch (error) { msg.className = 'alert error'; msg.textContent = error.message; setButtonLoading(button, false); }
        });
    } catch (error) { msg.className = 'alert error'; msg.textContent = error.message || 'Não foi possível carregar o produto.'; }
});
