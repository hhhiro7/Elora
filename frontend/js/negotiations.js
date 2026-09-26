document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    const list = document.getElementById('negotiations-list');
    let currentUser; let counterId;
    async function load() {
        list.innerHTML = '<p class="loading-state">Carregando negociações…</p>';
        try {
            [currentUser] = await Promise.all([apiCall('/users/me')]);
            const items = await apiCall('/negotiations/mine');
            const wantedId = new URLSearchParams(location.search).get('id');
            if (!items.length) { list.innerHTML = '<section class="empty-state"><h2>Nenhuma negociação ainda</h2><p>Quando você fizer ou receber uma proposta, poderá acompanhar a conversa por aqui.</p><a class="btn" href="produtos.html">Ver produtos</a></section>'; return; }
            const sorted = wantedId ? [...items].sort((a,b) => Number(b.id === wantedId) - Number(a.id === wantedId)) : items;
            list.innerHTML = sorted.map(item => render(item)).join('');
            list.querySelectorAll('[data-negotiation-action]').forEach(button => button.addEventListener('click', () => act(button.dataset.id, button.dataset.negotiationAction)));
            list.querySelectorAll('[data-negotiation-chat]').forEach(button => button.addEventListener('click', () => startChat(Number(button.dataset.negotiationChat))));
        } catch (error) { list.innerHTML = `<section class="empty-state"><h2>Não foi possível carregar suas negociações</h2><p>${escapeHtml(error.message || 'Verifique a conexão e tente novamente.')}</p><button class="btn btn-secondary" id="retry-negotiations" type="button">Tentar novamente</button></section>`; document.getElementById('retry-negotiations').addEventListener('click', load); }
    }
    function render(item) {
        const buyer = Number(item.buyerId) === Number(currentUser.id); const statusNames = {PENDENTE:'Aguardando o vendedor',CONTRAPROPOSTA:'Contraproposta recebida',ACEITA:'Proposta aceita',RECUSADA:'Recusada',CANCELADA:'Cancelada'};
        const currentAmount = item.status === 'CONTRAPROPOSTA' ? item.sellerCounteroffer : item.buyerOffer;
        const actions = item.status === 'PENDENTE' && !buyer ? `<button class="btn" data-negotiation-action="accept" data-id="${item.id}">Aceitar proposta</button><button class="btn btn-secondary" data-negotiation-action="counter" data-id="${item.id}">Fazer contraproposta</button><button class="notification-read" data-negotiation-action="reject" data-id="${item.id}">Recusar</button>`
            : item.status === 'CONTRAPROPOSTA' && buyer ? `<button class="btn" data-negotiation-action="accept" data-id="${item.id}">Aceitar contraproposta</button><button class="btn btn-secondary" data-negotiation-action="reject" data-id="${item.id}">Recusar contraproposta</button>`
            : item.status === 'PENDENTE' && buyer ? `<button class="btn btn-secondary" data-negotiation-action="cancel" data-id="${item.id}">Cancelar proposta</button>` : '';
        return `<article class="negotiation-item card"><a class="negotiation-image" href="produto.html?id=${item.productId}"><img src="${escapeHtml(item.productImage || FALLBACK_IMG)}" alt="${escapeHtml(item.productName)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"></a><div class="negotiation-body"><div class="negotiation-heading"><div><span class="badge badge-status">${escapeHtml(statusNames[item.status] || item.status)}</span><h2><a href="produto.html?id=${item.productId}">${escapeHtml(item.productName)}</a></h2></div><span>Preço anunciado ${formatCurrency(item.listedPrice)}</span></div><div class="negotiation-offers"><p>Proposta de ${escapeHtml(item.buyerName)} <strong>${formatCurrency(item.buyerOffer)}</strong></p>${item.sellerCounteroffer != null ? `<p>Contraproposta de ${escapeHtml(item.sellerName)} <strong>${formatCurrency(item.sellerCounteroffer)}</strong>${item.sellerMessage ? `<span>${escapeHtml(item.sellerMessage)}</span>` : ''}</p>` : ''}${item.buyerMessage ? `<p class="negotiation-message">“${escapeHtml(item.buyerMessage)}”</p>` : ''}</div><footer class="negotiation-footer"><time>${new Date(item.updatedAt).toLocaleString('pt-BR')}</time><div>${actions}${item.status === 'ACEITA' ? `<button class="btn btn-secondary" data-negotiation-chat="${buyer ? item.sellerId : item.buyerId}" data-product-id="${item.productId}">Conversar para combinar</button>` : ''}</div></footer></div></article>`;
    }
    async function act(id, action) {
        if (action === 'counter') { counterId = id; document.getElementById('counter-amount').value = ''; document.getElementById('counter-feedback').textContent = ''; document.getElementById('counter-dialog').showModal(); return; }
        try { await apiCall(`/negotiations/${id}/${action}`, 'POST', {}); showToast(action === 'accept' ? 'Negociação aceita.' : action === 'reject' ? 'Proposta recusada.' : 'Proposta cancelada.'); await load(); }
        catch (error) { showToast(error.message || 'Não foi possível atualizar a negociação.', 'error'); }
    }
    document.querySelector('[data-dialog-close]')?.addEventListener('click', () => document.getElementById('counter-dialog').close());
    document.getElementById('counter-form').addEventListener('submit', async event => {
        event.preventDefault(); const form = event.currentTarget; const feedback = document.getElementById('counter-feedback'); const button = form.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Enviando…');
        try { await apiCall(`/negotiations/${counterId}/counter`, 'POST', {amount:Number(form.elements.amount.value),message:form.elements.message.value.trim()}); document.getElementById('counter-dialog').close(); await load(); showToast('Contraproposta enviada.'); }
        catch (error) { feedback.className = 'alert error'; feedback.textContent = error.message || 'Não foi possível enviar a contraproposta.'; }
        finally { setButtonLoading(button, false); }
    });
    async function startChat(recipientId) {
        const item = await apiCall('/negotiations/mine').then(items => items.find(item => Number(item.buyerId) === Number(currentUser.id) ? item.sellerId === recipientId : item.buyerId === recipientId));
        if (!item) return;
        try { const result = await apiCall('/conversations', 'POST', {type:'PRODUCT',itemId:item.productId,message:`Olá, sobre a proposta para “${item.productName}”.`}); location.href = `mensagens.html?id=${result.conversationId}`; }
        catch (error) { showToast(error.message || 'Não foi possível iniciar a conversa.', 'error'); }
    }
    load();
});
