document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    setupPortfolioEditor();
    const form = document.getElementById('profile-form');
    const message = document.getElementById('profile-message');
    document.getElementById('password-form').addEventListener('submit', async event => {
        event.preventDefault();
        const passwordForm = event.currentTarget; const button = passwordForm.querySelector('[type="submit"]'); const feedback = document.getElementById('password-message');
        if (passwordForm.elements.newPassword.value !== passwordForm.elements.confirmNewPassword.value) { feedback.className = 'alert error'; feedback.textContent = 'As novas senhas não conferem.'; return; }
        setButtonLoading(button, true, 'Atualizando…');
        try {
            const result = await apiCall('/users/me/password', 'PUT', { currentPassword: passwordForm.elements.currentPassword.value, newPassword: passwordForm.elements.newPassword.value });
            feedback.className = 'alert success'; feedback.textContent = result.message; passwordForm.reset();
        } catch (error) { feedback.className = 'alert error'; feedback.textContent = error.message; }
        finally { setButtonLoading(button, false); }
    });
    try {
        const profile = await apiCall('/users/me');
        for (const key of ['name', 'email', 'city', 'phone', 'bio']) {
            const field = document.getElementById(`profile-${key}`);
            if (field) field.value = profile[key] || '';
        }
        document.getElementById('profile-avatar-url').value = profile.avatarUrl || '';
        document.getElementById('profile-name-preview').textContent = profile.name || 'Seu perfil';
        document.getElementById('profile-city-preview').textContent = profile.city || 'Adicione sua cidade';
        const avatar = document.getElementById('profile-avatar');
        if (profile.avatarUrl) avatar.innerHTML = `<img src="${escapeHtml(profile.avatarUrl)}" alt="Foto de ${escapeHtml(profile.name)}">`;
        else avatar.textContent = (profile.name || 'E').charAt(0).toUpperCase();
        document.getElementById('profile-stats').innerHTML = `<span><b>${profile.productCount}</b> produtos</span><span><b>${profile.serviceCount}</b> serviços</span><span><b>${Number(profile.rating || 0).toFixed(1)}</b> avaliação</span>`;
        document.getElementById('joined-at').textContent = profile.joinedAt ? `Na Elora desde ${new Date(profile.joinedAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}` : '';
        document.getElementById('public-profile-link').href = `usuario.html?id=${profile.id}`;
        form.addEventListener('input', () => {
            document.getElementById('profile-name-preview').textContent = form.elements.name.value || 'Seu perfil';
            document.getElementById('profile-city-preview').textContent = form.elements.city.value || 'Adicione sua cidade';
        });
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const button = form.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Salvando…');
            try {
                const result = await apiCall('/users/me', 'PUT', {
                    name: form.elements.name.value, city: form.elements.city.value,
                    phone: form.elements.phone.value, bio: form.elements.bio.value,
                    avatarUrl: form.elements.avatarUrl.value
                });
                localStorage.setItem('userName', result.name);
                message.className = 'alert success'; message.textContent = 'Seu perfil foi atualizado.';
                document.getElementById('profile-name-preview').textContent = result.name;
                showToast('Perfil salvo com sucesso.');
            } catch (error) { message.className = 'alert error'; message.textContent = error.message; }
            finally { setButtonLoading(button, false); }
        });
    } catch (error) { message.className = 'alert error'; message.textContent = error.message || 'Não foi possível carregar seu perfil.'; }
});

function setupPortfolioEditor() {
    const form = document.getElementById('portfolio-form');
    const list = document.getElementById('portfolio-items');
    const feedback = document.getElementById('portfolio-message');
    if (!form || !list) return;
    const cancel = document.getElementById('portfolio-cancel');
    const submit = document.getElementById('portfolio-submit');
    let items = [];
    async function load() {
        list.innerHTML = '<p class="loading-state">Carregando portfólio…</p>';
        try {
            items = await apiCall('/portfolio/mine');
            list.innerHTML = items.length ? items.map(item => `<article class="portfolio-manage-item"><div class="portfolio-manage-image">${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-empty');this.remove()">` : '<span>Sem imagem</span>'}</div><div class="portfolio-manage-copy"><span class="badge badge-status">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>${item.technologies ? `<small>${escapeHtml(item.technologies)}</small>` : ''}</div><div class="portfolio-manage-actions"><button class="btn btn-secondary" type="button" data-portfolio-edit="${item.id}">Editar</button><button class="notification-read" type="button" data-portfolio-delete="${item.id}">Excluir</button></div></article>`).join('') : '<section class="empty-state"><h3>Seu portfólio começa aqui</h3><p>Adicione projetos para mostrar sua experiência com informações que você forneceu.</p></section>';
            list.querySelectorAll('[data-portfolio-edit]').forEach(button => button.addEventListener('click', () => edit(items.find(item => item.id === Number(button.dataset.portfolioEdit)))));
            list.querySelectorAll('[data-portfolio-delete]').forEach(button => button.addEventListener('click', () => remove(Number(button.dataset.portfolioDelete), button)));
        } catch (error) { list.innerHTML = `<section class="empty-state"><p>${escapeHtml(error.message || 'Não foi possível carregar seu portfólio.')}</p><button class="btn btn-secondary" id="portfolio-retry" type="button">Tentar novamente</button></section>`; document.getElementById('portfolio-retry').addEventListener('click', load); }
    }
    function edit(item) {
        if (!item) return;
        for (const key of ['title','category','description','technologies','imageUrl','projectUrl']) form.elements[key].value = item[key] || '';
        form.elements.itemId.value = item.id; submit.textContent = 'Salvar alterações'; cancel.hidden = false;
        form.scrollIntoView({behavior:'smooth',block:'center'}); form.elements.title.focus();
    }
    function reset() { form.reset(); form.elements.itemId.value = ''; submit.textContent = 'Adicionar ao portfólio'; cancel.hidden = true; feedback.className = 'alert'; feedback.textContent = ''; }
    async function remove(id, button) {
        setButtonLoading(button, true, 'Removendo…');
        try { await apiCall(`/portfolio/${id}`, 'DELETE'); showToast('Projeto removido do portfólio.'); await load(); }
        catch (error) { showToast(error.message || 'Não foi possível remover o projeto.', 'error'); setButtonLoading(button, false); }
    }
    cancel.addEventListener('click', reset);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const button = submit; setButtonLoading(button, true, 'Salvando…'); feedback.className = 'alert'; feedback.textContent = '';
        const body = Object.fromEntries(['title','description','category','technologies','imageUrl','projectUrl'].map(key => [key, form.elements[key].value.trim() || null]));
        const id = form.elements.itemId.value;
        try { await apiCall(id ? `/portfolio/${id}` : '/portfolio', id ? 'PUT' : 'POST', body); reset(); await load(); showToast(id ? 'Projeto atualizado.' : 'Projeto adicionado ao portfólio.'); }
        catch (error) { feedback.className = 'alert error'; feedback.textContent = error.message || 'Não foi possível salvar o projeto.'; }
        finally { setButtonLoading(button, false); if (!form.elements.itemId.value) submit.textContent = 'Adicionar ao portfólio'; }
    });
    load();
}
