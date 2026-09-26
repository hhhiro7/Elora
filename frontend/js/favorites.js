function favoriteButton(type, id, active = false) {
    const label = active ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    return `<button class="favorite-toggle ${active ? 'is-active' : ''}" type="button" data-favorite-type="${escapeHtml(type)}" data-favorite-id="${escapeHtml(id)}" aria-label="${label}" aria-pressed="${active}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z"/></svg>
    </button>`;
}

async function toggleFavorite(button) {
    if (!requireAuth()) return;
    const type = button.dataset.favoriteType;
    const itemId = button.dataset.favoriteId;
    const active = button.getAttribute('aria-pressed') === 'true';
    try {
        if (active) await apiCall(`/favorites/${encodeURIComponent(type)}/${encodeURIComponent(itemId)}`, 'DELETE');
        else await apiCall('/favorites', 'POST', { type, itemId: Number(itemId) });
        button.setAttribute('aria-pressed', String(!active));
        button.setAttribute('aria-label', active ? 'Adicionar aos favoritos' : 'Remover dos favoritos');
        button.classList.toggle('is-active', !active);
        showToast(active ? 'Removido dos favoritos.' : 'Salvo nos seus favoritos.');
        window.dispatchEvent(new CustomEvent('elora:favorites-updated'));
    } catch (error) {
        showToast(error.message || 'Não foi possível atualizar os favoritos.', 'error');
    }
}

async function syncFavoriteButtons() {
    if (!getToken()) return;
    try {
        const favorites = await apiCall('/favorites');
        const keys = new Set(favorites.map(item => `${item.type}:${item.itemId}`));
        document.querySelectorAll('[data-favorite-type][data-favorite-id]').forEach(button => {
            const active = keys.has(`${button.dataset.favoriteType}:${button.dataset.favoriteId}`);
            button.setAttribute('aria-pressed', String(active));
            button.setAttribute('aria-label', active ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
            button.classList.toggle('is-active', active);
        });
    } catch { /* Uma falha de sessão não impede a navegação pública. */ }
}

document.addEventListener('click', event => {
    const button = event.target.closest('[data-favorite-type][data-favorite-id]');
    if (button) toggleFavorite(button);
});
document.addEventListener('DOMContentLoaded', syncFavoriteButtons);
