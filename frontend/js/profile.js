document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
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
