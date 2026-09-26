document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    const root = document.getElementById('proposals-list');
    try {
        const proposals = await apiCall('/proposals/mine');
        if (!proposals.length) { root.innerHTML = '<div class="empty-state card-empty"><h2>Você ainda não enviou propostas</h2><p>Encontre um projeto alinhado à sua experiência e apresente sua ideia ao cliente.</p><a href="projetos.html" class="btn">Explorar projetos</a></div>'; return; }
        const statuses = { ENVIADA:'Aguardando retorno', ACEITA:'Proposta aceita', NAO_SELECIONADA:'Não selecionada' };
        root.innerHTML = proposals.map(item => `<article class="sent-proposal-card"><div><span class="badge badge-status">${escapeHtml(statuses[item.status] || item.status)}</span><h2><a href="projeto.html?id=${encodeURIComponent(item.projectId)}">${escapeHtml(item.projectTitle)}</a></h2><p>${escapeHtml(item.message)}</p>${item.experience ? `<small>${escapeHtml(item.experience)}</small>` : ''}</div><aside><strong>${formatCurrency(item.amount)}</strong><span>${item.deadlineDays} dias</span><a href="projeto.html?id=${encodeURIComponent(item.projectId)}">Ver projeto →</a></aside></article>`).join('');
    } catch (error) { root.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar suas propostas.')}</p>`; }
});
