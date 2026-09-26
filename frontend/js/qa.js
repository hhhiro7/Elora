async function setupListingQuestions(type, listingId, ownerId) {
    const root = document.getElementById('listing-questions');
    const form = document.getElementById('listing-question-form');
    const feedback = document.getElementById('listing-question-feedback');
    let viewer = null;
    if (getToken()) { try { viewer = await apiCall('/users/me'); } catch { /* A sessão será verificada no envio. */ } }
    const isOwner = Number(viewer?.id) === Number(ownerId);
    if (isOwner) form.hidden = true;
    async function load() {
        root.innerHTML = '<p class="loading-state">Carregando perguntas…</p>';
        try {
            const items = await apiCall(`/${type === 'PRODUCT' ? 'products' : 'services'}/${listingId}/questions`);
            if (!items.length) { root.innerHTML = '<p class="muted-copy">Ainda não há perguntas. Seja a primeira pessoa a perguntar.</p>'; return; }
            root.innerHTML = items.map(item => `<article class="listing-question-item"><div class="question-person"><span class="question-avatar">${escapeHtml((item.askerName || '?').charAt(0).toUpperCase())}</span><strong>${escapeHtml(item.askerName)}</strong><time>${new Date(item.createdAt).toLocaleDateString('pt-BR')}</time></div><p class="listing-question-text">${escapeHtml(item.question)}</p>${item.answer ? `<div class="listing-answer"><strong>Resposta de ${escapeHtml(item.responderName || 'anunciante')}</strong><p>${escapeHtml(item.answer)}</p><time>${new Date(item.answeredAt).toLocaleDateString('pt-BR')}</time></div>` : isOwner ? `<form class="listing-answer-form" data-answer-form="${item.id}"><label for="answer-${item.id}">Sua resposta</label><textarea id="answer-${item.id}" maxlength="1000" rows="2" required></textarea><button class="btn btn-secondary" type="submit">Responder</button></form>` : '<span class="question-pending">Aguardando resposta do anunciante</span>'}</article>`).join('');
            root.querySelectorAll('[data-answer-form]').forEach(answerForm => answerForm.addEventListener('submit', async event => {
                event.preventDefault(); const button = answerForm.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Enviando…');
                try { await apiCall(`/questions/${answerForm.dataset.answerForm}/answer`, 'POST', {answer:answerForm.querySelector('textarea').value.trim()}); showToast('Resposta publicada.'); await load(); }
                catch (error) { showToast(error.message || 'Não foi possível responder.', 'error'); setButtonLoading(button, false); }
            }));
        } catch (error) { root.innerHTML = `<p class="muted-copy">${escapeHtml(error.message || 'As perguntas não estão disponíveis agora.')}</p><button class="btn btn-secondary" id="retry-questions" type="button">Tentar novamente</button>`; document.getElementById('retry-questions').addEventListener('click', load); }
    }
    form.addEventListener('submit', async event => {
        event.preventDefault(); if (!requireAuth()) return;
        const button = form.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Enviando…'); feedback.className = 'alert'; feedback.textContent = '';
        try { await apiCall(`/${type === 'PRODUCT' ? 'products' : 'services'}/${listingId}/questions`, 'POST', {question:document.getElementById('listing-question-input').value.trim()}); form.reset(); showToast('Pergunta enviada ao anunciante.'); await load(); }
        catch (error) { feedback.className = 'alert error'; feedback.textContent = error.message || 'Não foi possível enviar a pergunta.'; }
        finally { setButtonLoading(button, false); }
    });
    await load();
}
