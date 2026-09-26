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
            ['Receita concluída', formatCurrency(stats.simulatedRevenue), 'meus-pedidos.html']
        ];
        box.innerHTML = cards.map(([label, value, link]) => `<a class="dashboard-stat card" href="${link}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><i aria-hidden="true">→</i></a>`).join('');
    } catch (error) { box.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar o painel.')}</p>`; }
});
