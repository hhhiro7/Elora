let projectPage = 0;
let projectLoading = false;
let projectSearchTimer;
let projectCategoryOptions = [];

document.addEventListener('DOMContentLoaded', async () => {
    const select = document.getElementById('project-category');
    projectCategoryOptions = await apiCall('/categories?type=SERVICE').catch(() => []);
    projectCategoryOptions.forEach(value => select.add(new Option(value, value)));
    document.querySelectorAll('#project-search,#project-budget,#project-location').forEach(input => input.addEventListener('input', () => { clearTimeout(projectSearchTimer); projectSearchTimer = setTimeout(() => loadProjects(true), 280); }));
    document.querySelectorAll('#project-category,#project-mode').forEach(input => input.addEventListener('change', () => loadProjects(true)));
    document.getElementById('clear-project-filters').addEventListener('click', () => {
        ['project-search','project-budget','project-location','project-category','project-mode'].forEach(id => document.getElementById(id).value = '');
        history.replaceState(null, '', 'projetos.html'); loadProjects(true);
    });
    document.getElementById('load-more-projects').addEventListener('click', () => loadProjects(false));
    loadProjects(true);
});

async function loadProjects(reset) {
    if (projectLoading) return;
    projectLoading = true;
    const root = document.getElementById('project-list'); const more = document.getElementById('load-more-projects');
    if (reset) { projectPage = 0; root.innerHTML = '<div class="skeleton-card"><span></span><span></span><span></span></div><div class="skeleton-card"><span></span><span></span><span></span></div><div class="skeleton-card"><span></span><span></span><span></span></div>'; }
    const params = new URLSearchParams({ page: String(projectPage), size: '12' });
    const filters = { q: document.getElementById('project-search').value.trim(), category: document.getElementById('project-category').value,
        maxBudget: document.getElementById('project-budget').value, location: document.getElementById('project-location').value.trim(), mode: document.getElementById('project-mode').value };
    Object.entries(filters).forEach(([key,value]) => { if (value) params.set(key,value); });
    try {
        const page = await apiCall(`/projects?${params}`);
        const cards = page.content.map(projectCard).join('');
        if (reset) root.innerHTML = cards || '<div class="empty-state card-empty"><h2>Nenhum projeto encontrado</h2><p>Altere os filtros ou volte mais tarde para novas oportunidades.</p><a href="publicar-projeto.html" class="btn btn-secondary">Publicar um projeto</a></div>';
        else if (cards) root.insertAdjacentHTML('beforeend', cards);
        projectPage = page.page + 1; more.hidden = !page.hasNext; more.disabled = false;
        document.getElementById('project-results').textContent = `${page.totalElements} ${page.totalElements === 1 ? 'projeto disponível' : 'projetos disponíveis'}`;
        syncProjectUrl(filters);
    } catch (error) {
        if (reset) root.innerHTML = `<div class="empty-state card-empty"><h2>Não foi possível carregar os projetos</h2><p>${escapeHtml(error.message || 'Confira sua conexão com a API e tente novamente.')}</p><button class="btn btn-secondary" type="button" onclick="loadProjects(true)">Tentar novamente</button></div>`;
        more.hidden = true; document.getElementById('project-results').textContent = 'Lista indisponível';
    } finally { projectLoading = false; }
}

function projectCard(project) {
    const modes = { ONLINE:'Online', PRESENCIAL:'Presencial', AMBOS:'Online ou presencial' };
    return `<article class="project-opportunity-card"><div class="project-opportunity-main"><div class="project-card-meta"><span class="badge badge-status">${escapeHtml(project.category)}</span><span>${escapeHtml(modes[project.serviceMode] || 'Formato a combinar')}</span><time>${project.createdAt ? new Date(project.createdAt).toLocaleDateString('pt-BR') : ''}</time></div><h3><a href="projeto.html?id=${encodeURIComponent(project.id)}">${escapeHtml(project.title)}</a></h3><p>${escapeHtml(project.description)}</p><div class="project-card-client"><span class="project-client-avatar">${project.clientAvatar ? `<img src="${escapeHtml(project.clientAvatar)}" alt="" onerror="this.remove()">` : escapeHtml((project.clientName || '?').charAt(0).toUpperCase())}</span><span>Publicado por <strong>${escapeHtml(project.clientName)}</strong></span>${project.location ? `<span>${escapeHtml(project.location)}</span>` : ''}</div></div><aside class="project-opportunity-side"><span class="project-budget-label">Orçamento</span><strong>${project.budget == null ? 'A combinar' : formatCurrency(project.budget)}</strong><span>${project.deadlineDays ? `Prazo ${project.deadlineDays} dias` : 'Prazo a combinar'}</span><a class="btn" href="projeto.html?id=${encodeURIComponent(project.id)}">Ver projeto <span aria-hidden="true">→</span></a><small>${Number(project.proposalCount || 0)} propostas</small></aside></article>`;
}

function syncProjectUrl(filters) {
    const url = new URL(location.href);
    ['q','category','location','mode'].forEach(key => filters[key] ? url.searchParams.set(key,filters[key]) : url.searchParams.delete(key));
    history.replaceState(null, '', url.pathname + url.search);
}
