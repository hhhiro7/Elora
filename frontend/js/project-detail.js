let currentProject = null;
let currentProjectUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(location.search).get('id');
    const info = document.getElementById('project-detail-message');
    if (!id || !/^\d+$/.test(id)) { info.textContent = 'Não encontramos este projeto.'; return; }
    try {
        const [project, userResult] = await Promise.all([apiCall(`/projects/${id}`), getToken() ? apiCall('/users/me').then(value => ({ value })).catch(error => ({ error })) : Promise.resolve({ value:null })]);
        currentProject = project; currentProjectUser = userResult.value;
        document.title = `${project.title} — Projeto Elora`;
        document.getElementById('project-category').textContent = project.category;
        document.getElementById('project-status').textContent = 'Aberto para propostas';
        document.getElementById('project-title').textContent = project.title;
        document.getElementById('project-description').textContent = project.description;
        document.getElementById('project-meta').innerHTML = `<span>Orçamento: <strong>${project.budget == null ? 'A combinar' : formatCurrency(project.budget)}</strong></span><span>Prazo desejado: <strong>${project.deadlineDays ? `${project.deadlineDays} dias` : 'A combinar'}</strong></span><span>${escapeHtml(project.serviceMode === 'PRESENCIAL' ? `Presencial · ${project.location || ''}` : project.serviceMode === 'AMBOS' ? `Online ou presencial${project.location ? ` · ${project.location}` : ''}` : 'Online')}</span><span>${Number(project.proposalCount || 0)} propostas</span>`;
        document.getElementById('project-owner').innerHTML = `<span class="project-client-avatar">${project.clientAvatar ? `<img src="${escapeHtml(project.clientAvatar)}" alt="" onerror="this.remove()">` : escapeHtml((project.clientName || '?').charAt(0).toUpperCase())}</span><span><small>CLIENTE</small><strong>${escapeHtml(project.clientName)}</strong></span><a href="usuario.html?id=${encodeURIComponent(project.clientId)}">Ver perfil</a>`;
        info.hidden = true; document.getElementById('project-detail-layout').hidden = false;

        if (currentProjectUser && Number(currentProjectUser.id) === Number(project.clientId)) await renderOwnerControls(project);
        else await renderProviderControls(project);
    } catch (error) { info.textContent = error.message || 'Não foi possível carregar este projeto agora.'; info.classList.add('is-error'); }
});

async function renderOwnerControls(project) {
    const section = document.getElementById('received-proposals-section'); section.hidden = false;
    const list = document.getElementById('received-proposals');
    try {
        const proposals = await apiCall(`/projects/${project.id}/proposals`);
        document.getElementById('proposal-count').textContent = `${proposals.length} ${proposals.length === 1 ? 'proposta' : 'propostas'}`;
        list.innerHTML = proposals.length ? proposals.map(proposalCard).join('') : '<div class="empty-state"><p>As propostas para este projeto aparecerão aqui.</p></div>';
        list.querySelectorAll('[data-accept-proposal]').forEach(button => button.addEventListener('click', async () => {
            setButtonLoading(button,true,'Aceitando…');
            try { await apiCall(`/proposals/${button.dataset.acceptProposal}/accept`,'POST',{}); showToast('Proposta aceita. O projeto está em andamento.'); location.reload(); }
            catch (error) { showToast(error.message || 'Não foi possível aceitar a proposta.','error'); setButtonLoading(button,false); }
        }));
        list.querySelectorAll('[data-project-chat]').forEach(button => button.addEventListener('click', () => startProjectChat(project.id, Number(button.dataset.projectChat), `Olá, ${button.dataset.providerName}. Gostaria de conversar sobre sua proposta para “${project.title}”.`)));
    } catch (error) { list.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar as propostas.')}</p>`; }

    const actions = document.getElementById('project-owner-actions'); actions.hidden = false;
    actions.innerHTML = `<span>Seu projeto</span>${project.status === 'EM_ANDAMENTO' ? '<button class="btn" data-project-status="CONCLUIDO">Marcar como concluído</button>' : ''}${['ABERTO','EM_ANDAMENTO'].includes(project.status) ? '<button class="btn btn-secondary" data-project-status="CANCELADO">Cancelar projeto</button>' : ''}<a href="meus-projetos.html" class="project-owner-link">Abrir meus projetos →</a>`;
    actions.querySelectorAll('[data-project-status]').forEach(button => button.addEventListener('click', async () => {
        setButtonLoading(button,true,'Atualizando…');
        try { await apiCall(`/projects/${project.id}/status`,'PATCH',{status:button.dataset.projectStatus}); showToast('Status do projeto atualizado.'); location.reload(); }
        catch (error) { showToast(error.message || 'Não foi possível atualizar o projeto.','error'); setButtonLoading(button,false); }
    }));
}

function proposalCard(proposal) {
    const statusLabels = { ENVIADA:'Recebida', ACEITA:'Aceita', NAO_SELECIONADA:'Não selecionada' };
    const actions = proposal.status === 'ENVIADA' && currentProject.status === 'ABERTO'
        ? `<button class="btn" type="button" data-accept-proposal="${proposal.id}">Aceitar proposta</button>` : '';
    return `<article class="proposal-card"><div class="proposal-card-person"><span class="project-client-avatar">${proposal.providerAvatar ? `<img src="${escapeHtml(proposal.providerAvatar)}" alt="" onerror="this.remove()">` : escapeHtml((proposal.providerName || '?').charAt(0).toUpperCase())}</span><span><strong>${escapeHtml(proposal.providerName)}</strong><a href="usuario.html?id=${encodeURIComponent(proposal.providerId)}">Ver perfil</a></span><span class="badge badge-status">${escapeHtml(statusLabels[proposal.status] || proposal.status)}</span></div><p>${escapeHtml(proposal.message)}</p>${proposal.experience ? `<p class="proposal-experience">${escapeHtml(proposal.experience)}</p>` : ''}<div class="proposal-card-meta"><span>${formatCurrency(proposal.amount)}</span><span>${proposal.deadlineDays} dias</span><time>${new Date(proposal.createdAt).toLocaleDateString('pt-BR')}</time></div><div class="proposal-card-actions">${actions}<button class="btn btn-secondary" type="button" data-project-chat="${proposal.providerId}" data-provider-name="${escapeHtml(proposal.providerName)}">Conversar</button></div></article>`;
}

async function renderProviderControls(project) {
    const aside = document.getElementById('proposal-aside'); aside.hidden = false;
    if (!currentProjectUser) {
        aside.innerHTML = `<p class="catalog-eyebrow">Entre na Elora</p><h2>Quer apresentar uma proposta?</h2><p>Faça login para enviar uma proposta e acompanhar a conversa com o cliente.</p><a class="btn" href="login.html?next=${encodeURIComponent(`projeto.html?id=${project.id}`)}">Entrar para propor</a>`; return;
    }
    if (project.status !== 'ABERTO') { aside.innerHTML = `<p class="catalog-eyebrow">Projeto em andamento</p><h2>Propostas encerradas</h2><p>Este projeto já não está recebendo novas propostas.</p>`; return; }
    const mine = await apiCall('/proposals/mine').catch(() => []);
    const existing = mine.find(item => Number(item.projectId) === Number(project.id));
    if (existing) {
        aside.innerHTML = `<p class="catalog-eyebrow">Sua proposta</p><h2>${escapeHtml(existing.status === 'ENVIADA' ? 'Proposta enviada' : existing.status === 'ACEITA' ? 'Proposta aceita' : 'Proposta encerrada')}</h2><p>${formatCurrency(existing.amount)} · ${existing.deadlineDays} dias</p><p>${escapeHtml(existing.message)}</p><a class="btn" href="propostas.html">Acompanhar proposta</a>`; return;
    }
    const form = document.getElementById('proposal-form');
    form.addEventListener('submit', async event => {
        event.preventDefault(); const button = form.querySelector('[type="submit"]'); setButtonLoading(button,true,'Enviando…');
        const message = document.getElementById('proposal-form-message');
        try {
            const proposalMessage = document.getElementById('proposal-message').value.trim();
            await apiCall(`/projects/${project.id}/proposals`,'POST',{ amount:Number(document.getElementById('proposal-amount').value), deadlineDays:Number(document.getElementById('proposal-days').value), message:proposalMessage, experience:document.getElementById('proposal-experience').value.trim() || null });
            try {
                const conversation = await apiCall('/conversations','POST',{ type:'PROJECT', itemId:Number(project.id), message:`Enviei uma proposta de ${formatCurrency(document.getElementById('proposal-amount').value)} com prazo de ${document.getElementById('proposal-days').value} dias. ${proposalMessage}` });
                location.href = `mensagens.html?id=${encodeURIComponent(conversation.conversationId)}`;
            } catch {
                message.className = 'alert success'; message.textContent = 'Proposta enviada. O cliente poderá responder pelo projeto.';
                form.innerHTML = '<a class="btn" href="propostas.html">Acompanhar minhas propostas</a>';
            }
        } catch (error) { message.className = 'alert error'; message.textContent = error.message || 'Não foi possível enviar a proposta.'; setButtonLoading(button,false); }
    });
}

async function startProjectChat(projectId, providerId, message) {
    try { const result = await apiCall('/conversations','POST',{ type:'PROJECT', itemId:Number(projectId), recipientId:Number(providerId), message }); location.href = `mensagens.html?id=${encodeURIComponent(result.conversationId)}`; }
    catch (error) { showToast(error.message || 'Não foi possível iniciar a conversa.','error'); }
}
