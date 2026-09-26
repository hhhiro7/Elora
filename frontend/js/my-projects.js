document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    const root = document.getElementById('my-projects-list');
    try {
        const projects = await apiCall('/projects/mine');
        if (!projects.length) { root.innerHTML = '<div class="empty-state card-empty"><h2>Você ainda não publicou projetos</h2><p>Conte o que precisa para que profissionais possam enviar propostas.</p><a href="publicar-projeto.html" class="btn">Publicar projeto</a></div>'; return; }
        const status = { ABERTO:'Recebendo propostas', EM_ANDAMENTO:'Em andamento', CONCLUIDO:'Concluído', CANCELADO:'Cancelado' };
        root.innerHTML = projects.map(project => `<article class="project-opportunity-card"><div class="project-opportunity-main"><div class="project-card-meta"><span class="badge badge-status">${escapeHtml(project.category)}</span><span>${escapeHtml(status[project.status] || project.status)}</span><time>${new Date(project.createdAt).toLocaleDateString('pt-BR')}</time></div><h3><a href="projeto.html?id=${encodeURIComponent(project.id)}">${escapeHtml(project.title)}</a></h3><p>${escapeHtml(project.description)}</p></div><aside class="project-opportunity-side"><span class="project-budget-label">Orçamento</span><strong>${project.budget == null ? 'A combinar' : formatCurrency(project.budget)}</strong><span>${Number(project.proposalCount)} ${Number(project.proposalCount) === 1 ? 'proposta' : 'propostas'}</span><a class="btn" href="projeto.html?id=${encodeURIComponent(project.id)}">Ver detalhes <span aria-hidden="true">→</span></a></aside></article>`).join('');
    } catch (error) { root.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar seus projetos.')}</p>`; }
});
