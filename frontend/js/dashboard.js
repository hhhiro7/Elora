document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    const box = document.getElementById('dashboard-stats');
    try {
        const stats = await apiCall('/dashboard');
        const cards = [
            ['Produtos ativos', stats.activeProducts, 'meus-produtos.html'],
            ['Total de anúncios', stats.totalProducts, 'meus-produtos.html'],
            ['Serviços ativos', stats.activeServices, 'servicos-contratados.html'],
            ['Pedidos como cliente', stats.buyerOrders, 'meus-pedidos.html'],
            ['Pedidos como vendedor', stats.sellerOrders, 'minhas-vendas.html'],
            ['Serviços recebidos', stats.providerOrders, 'servicos-contratados.html'],
            ['Estoque baixo', stats.lowStockProducts, 'meus-produtos.html'],
            ['Receita concluída', formatCurrency(stats.simulatedRevenue), 'meus-pedidos.html'],
            ['Pedidos de serviço', stats.clientServiceOrders, 'servicos-contratados.html'],
            ['Trabalhos de serviço concluídos', stats.completedProviderServices, 'servicos-contratados.html'],
            ['Solicitações pendentes', stats.pendingServiceRequests, 'servicos-contratados.html'],
            ['Projetos abertos', stats.projectCount, 'meus-projetos.html'],
            ['Propostas enviadas', stats.proposalsSent, 'propostas.html'],
            ['Propostas recebidas', stats.proposalsReceived, 'meus-projetos.html'],
            ['Propostas aguardando', stats.pendingProposals, 'meus-projetos.html'],
            ['Avaliação dos serviços', stats.serviceRating == null ? '—' : Number(stats.serviceRating).toFixed(1), 'perfil.html']
        ];
        box.innerHTML = cards.map(([label, value, link]) => `<a class="dashboard-stat card" href="${link}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><i aria-hidden="true">→</i></a>`).join('');
    } catch (error) { box.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar o painel.')}</p>`; }
});
