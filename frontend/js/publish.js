document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    const isProduct = document.body.dataset.listingForm === 'product';
    const form = document.getElementById(isProduct ? 'product-form' : 'service-form');
    const endpoint = isProduct ? '/products' : '/services';
    const select = document.getElementById('category');
    const other = document.getElementById('other-category');
    const categories = await apiCall(`/categories?type=${isProduct ? 'PRODUCT' : 'SERVICE'}`).catch(() => []);
    categories.forEach(category => select.add(new Option(category, category)));
    select.add(new Option('Outra categoria', 'OUTRA'));
    select.addEventListener('change', () => { other.hidden = select.value !== 'OUTRA'; other.required = select.value === 'OUTRA'; if (!other.hidden) other.focus(); updatePreview(); });
    form.addEventListener('input', updatePreview);
    document.getElementById('imageUrl').addEventListener('input', updatePreview);
    document.getElementById('description').addEventListener('input', () => {
        const count = document.getElementById('description-count'); if (count) count.textContent = String(document.getElementById('description').value.length);
    });
    document.getElementById('preview-image').onerror = function () { this.hidden = true; document.getElementById('preview-placeholder').hidden = false; };

    if (!isProduct) initServiceWizard();
    else form.addEventListener('submit', async event => {
        event.preventDefault();
        const category = selectedCategory(); const price = Number(document.getElementById('price').value); const msg = document.getElementById('msg');
        if (!category) { setMessage(msg, 'Escolha ou informe uma categoria.'); return; }
        if (!Number.isFinite(price) || price <= 0) { setMessage(msg, 'O preço precisa ser maior que zero.'); return; }
        const payload = { category, description: document.getElementById('description').value.trim(), price, imageUrl: document.getElementById('imageUrl').value.trim() || null,
            location: document.getElementById('location').value.trim() || null, tags: document.getElementById('tags').value.trim() || null,
            name: document.getElementById('name').value.trim(), stock: Number(document.getElementById('stock').value), conditionType: document.getElementById('conditionType').value };
        await publish(payload, endpoint, msg, form, true);
    });
    updatePreview();

    function selectedCategory() { return select.value === 'OUTRA' ? other.value.trim() : select.value; }

    function updatePreview() {
        const title = document.getElementById(isProduct ? 'name' : 'title').value.trim();
        document.getElementById('preview-name').textContent = title || (isProduct ? 'Título do produto' : 'Título do serviço');
        document.getElementById('preview-category').textContent = select.value === 'OUTRA' ? other.value || 'Categoria' : select.selectedOptions[0]?.textContent || 'Categoria';
        document.getElementById('preview-description').textContent = document.getElementById('description').value.trim() || 'A descrição do anúncio aparecerá aqui.';
        if (!isProduct && document.getElementById('basic-price')) {
            const prices = [document.getElementById('basic-price').value, ...(document.getElementById('standard-enabled').checked ? [document.getElementById('standard-price').value] : []), ...(document.getElementById('premium-enabled').checked ? [document.getElementById('premium-price').value] : [])].map(Number).filter(value => value > 0);
            document.getElementById('price').value = prices.length ? Math.min(...prices) : '';
            const days = [document.getElementById('basic-days').value, ...(document.getElementById('standard-enabled').checked ? [document.getElementById('standard-days').value] : []), ...(document.getElementById('premium-enabled').checked ? [document.getElementById('premium-days').value] : [])].map(Number).filter(value => value > 0);
            document.getElementById('deliveryDays').value = days.length ? Math.min(...days) : '';
        }
        const priceValue = document.getElementById('price').value;
        document.getElementById('preview-price').textContent = formatCurrency(priceValue);
        const location = document.getElementById('location').value.trim();
        document.getElementById('preview-location').textContent = location || (isProduct ? 'Sua região' : document.getElementById('serviceMode')?.selectedOptions[0]?.textContent || 'Online');
        document.getElementById('preview-condition').textContent = isProduct
            ? (document.getElementById('conditionType').value === 'USADO' ? 'Usado' : 'Novo')
            : (document.getElementById('deliveryDays').value ? `${document.getElementById('deliveryDays').value} dias` : 'Prazo a combinar');
        const image = document.getElementById('preview-image'); const imageField = document.getElementById('imageUrl');
        if (imageField.value && imageField.validity.valid) { image.src = imageField.value; image.hidden = false; document.getElementById('preview-placeholder').hidden = true; }
        else { image.hidden = true; document.getElementById('preview-placeholder').hidden = false; }
        renderFinalPreview();
    }

    function initServiceWizard() {
        const steps = [...form.querySelectorAll('[data-publish-step]')];
        const progress = [...document.querySelectorAll('#service-publish-progress li')];
        let currentStep = 0;
        const packageInputs = { standard: ['standard-name','standard-price','standard-days','standard-revisions','standard-description','standard-deliverables'], premium: ['premium-name','premium-price','premium-days','premium-revisions','premium-description','premium-deliverables'] };
        Object.entries(packageInputs).forEach(([tier, ids]) => {
            const toggle = document.getElementById(`${tier}-enabled`);
            toggle.addEventListener('change', () => ids.forEach(id => { const input = document.getElementById(id); input.disabled = !toggle.checked; input.required = toggle.checked && ['price','days','description'].some(key => id.endsWith(key)); }));
        });
        form.querySelectorAll('[data-step-next]').forEach(button => button.addEventListener('click', () => {
            if (!validateStep(steps[currentStep])) return;
            currentStep = Math.min(currentStep + 1, steps.length - 1); showStep();
        }));
        form.querySelectorAll('[data-step-back]').forEach(button => button.addEventListener('click', () => { currentStep = Math.max(0, currentStep - 1); showStep(); }));
        form.addEventListener('submit', async event => {
            event.preventDefault(); if (!validateStep(steps[currentStep])) return;
            const msg = document.getElementById('msg'); const category = selectedCategory();
            if (!category) { setMessage(msg, 'Escolha ou informe uma categoria.'); currentStep = 0; showStep(); return; }
            const packages = [packageFrom('basic', 'BASICO', 0), ...(document.getElementById('standard-enabled').checked ? [packageFrom('standard', 'PADRAO', 1)] : []), ...(document.getElementById('premium-enabled').checked ? [packageFrom('premium', 'PREMIUM', 2)] : [])];
            const portfolioUrls = document.getElementById('portfolioUrls').value.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
            if (portfolioUrls.length > 6 || portfolioUrls.some(value => !validPublicUrl(value))) { setMessage(msg, 'Use até 6 links de imagem públicos válidos no portfólio.'); return; }
            const imageUrl = document.getElementById('imageUrl').value.trim();
            if (imageUrl && !validPublicUrl(imageUrl)) { setMessage(msg, 'Informe uma URL pública começando com http:// ou https://.'); return; }
            const payload = { title: document.getElementById('title').value.trim(), category, description: document.getElementById('description').value.trim(),
                price: Math.min(...packages.map(item => item.price)), deliveryDays: Math.min(...packages.map(item => item.deliveryDays)), packages,
                experienceLevel: document.getElementById('experienceLevel').value || null, location: document.getElementById('location').value.trim() || null,
                serviceMode: document.getElementById('serviceMode').value, tags: document.getElementById('tags').value.trim() || null,
                imageUrl: imageUrl || null, portfolioUrls: portfolioUrls.join('\n') || null, faq: document.getElementById('faq').value.trim() || null };
            await publish(payload, endpoint, msg, form, false);
        });
        showStep();

        function showStep() {
            steps.forEach((step, index) => { step.hidden = index !== currentStep; step.classList.toggle('is-active', index === currentStep); });
            progress.forEach((item, index) => { item.classList.toggle('is-current', index === currentStep); item.classList.toggle('is-complete', index < currentStep); });
            const error = document.getElementById('msg'); error.textContent = ''; error.className = 'alert';
            if (currentStep === 3) renderFinalPreview();
            document.getElementById('service-publish-progress').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        function validateStep(step) {
            const fields = [...step.querySelectorAll('input,select,textarea')].filter(input => !input.disabled && input.type !== 'hidden');
            const invalid = fields.find(input => !input.checkValidity());
            if (invalid) { invalid.reportValidity(); return false; }
            if (currentStep === 0 && !selectedCategory()) { select.setCustomValidity('Escolha uma especialidade.'); select.reportValidity(); select.setCustomValidity(''); return false; }
            return true;
        }
        function packageFrom(prefix, tier, order) {
            return { tier, name: document.getElementById(`${prefix}-name`).value.trim(), price: Number(document.getElementById(`${prefix}-price`).value),
                deliveryDays: Number(document.getElementById(`${prefix}-days`).value), revisions: Number(document.getElementById(`${prefix}-revisions`).value),
                description: document.getElementById(`${prefix}-description`).value.trim(), deliverables: document.getElementById(`${prefix}-deliverables`).value.trim() || null, sortOrder: order };
        }
        function renderFinalPreview() {
            const root = document.getElementById('service-final-preview'); if (!root) return;
            const packages = [packageFrom('basic','BASICO',0), ...(document.getElementById('standard-enabled').checked ? [packageFrom('standard','PADRAO',1)] : []), ...(document.getElementById('premium-enabled').checked ? [packageFrom('premium','PREMIUM',2)] : [])];
            root.innerHTML = `<div class="service-final-summary"><div><span class="badge badge-status">${escapeHtml(selectedCategory() || 'Especialidade')}</span><h3>${escapeHtml(document.getElementById('title').value || 'Título do serviço')}</h3><p>${escapeHtml(document.getElementById('description').value || '')}</p></div><div class="service-final-gallery">${[document.getElementById('imageUrl').value.trim(), ...document.getElementById('portfolioUrls').value.split(/\r?\n/).map(v => v.trim())].filter(Boolean).slice(0,4).map(url => `<img src="${escapeHtml(url)}" alt="Imagem do portfólio" onerror="this.hidden=true">`).join('') || '<span>Sem imagens de portfólio</span>'}</div></div><div class="service-final-package-list">${packages.map(item => `<article><span>${escapeHtml(packageTierLabel(item.tier))}</span><strong>${escapeHtml(item.name)}</strong><b>${formatCurrency(item.price)}</b><small>${item.deliveryDays} dias · ${item.revisions} revisões</small><p>${escapeHtml(item.description)}</p></article>`).join('')}</div><p class="service-final-mode">${escapeHtml(document.getElementById('serviceMode').selectedOptions[0].textContent)}${document.getElementById('location').value ? ` · ${escapeHtml(document.getElementById('location').value)}` : ''}</p>`;
        }
    }

    function packageTierLabel(tier) { return ({ BASICO: 'Básico', PADRAO: 'Padrão', PREMIUM: 'Premium' })[tier] || tier; }
    function validPublicUrl(value) { try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol); } catch { return false; } }
});

async function publish(payload, endpoint, msg, form, isProduct) {
    const button = form.querySelector('button[type="submit"]'); setButtonLoading(button, true, 'Publicando…');
    try {
        await apiCall(endpoint, 'POST', payload);
        msg.className = 'alert success'; msg.textContent = isProduct ? 'Produto publicado com sucesso.' : 'Serviço publicado com sucesso.';
        showToast('Seu anúncio já está publicado.');
        setTimeout(() => { location.href = isProduct ? 'meus-produtos.html' : 'servicos.html'; }, 650);
    } catch (error) { setMessage(msg, error.message || 'Não foi possível publicar o anúncio.'); setButtonLoading(button, false); }
}

function setMessage(box, message) { box.className = 'alert error'; box.textContent = message; }
