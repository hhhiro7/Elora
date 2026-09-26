let orders = [];
let orderFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    document.querySelectorAll('[data-order-filter]').forEach(button => button.addEventListener('click', () => {
        orderFilter = button.dataset.orderFilter;
        document.querySelectorAll('[data-order-filter]').forEach(item => item.classList.toggle('is-active', item === button));
        renderOrders();
    }));
    loadOrders();
});

async function loadOrders() {
    const list = document.getElementById('orders-list');
    try { orders = await apiCall('/orders/mine'); orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); renderOrders(); }
    catch (error) { list.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Não foi possível carregar seus pedidos.')}</p>`; }
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    const shown = orderFilter === 'ALL' ? orders : orders.filter(order => order.status === orderFilter);
    if (!shown.length) { list.innerHTML = '<div class="empty-state card-empty"><h2>Nenhum pedido nesta lista</h2><p>Seus pedidos e atualizações aparecerão aqui.</p><a href="produtos.html" class="btn">Explorar produtos</a></div>'; return; }
    list.innerHTML = shown.map(order => { const sellers = [...new Map((order.items || []).map(item => item.product?.owner).filter(owner => owner?.id).map(owner => [owner.id, owner])).values()]; const reviewActions = order.status === 'CONCLUIDO' ? sellers.map(seller => `<button class="btn btn-secondary" type="button" data-product-review="${order.id}" data-reviewed-user="${seller.id}" data-reviewed-name="${escapeHtml(seller.name)}">Avaliar ${escapeHtml(seller.name)}</button>`).join('') : ''; return `<article class="order-card card"><div class="order-head"><div><span class="muted-copy">PEDIDO #${order.id}</span><h2>${new Date(order.createdAt).toLocaleDateString('pt-BR', { dateStyle: 'long' })}</h2></div><span class="badge ${order.status === 'CONCLUIDO' ? 'badge-ativo' : 'badge-pausado'}">${escapeHtml(order.status.replaceAll('_', ' '))}</span></div><div class="order-preview-items">${(order.items || []).slice(0, 3).map(item => `<span>${item.quantity} × ${escapeHtml(item.product?.name || 'Produto')}</span>`).join('')}${order.items?.length > 3 ? `<span>+ ${order.items.length - 3} itens</span>` : ''}</div><div class="order-card-footer"><strong>${formatCurrency(order.totalAmount)}</strong><div class="order-actions"><a class="btn btn-secondary" href="pedido.html?id=${order.id}">Ver detalhes</a>${reviewActions}</div></div></article>`; }).join('');
    list.querySelectorAll('[data-product-review]').forEach(button => button.addEventListener('click', () => openProductReview(Number(button.dataset.productReview), Number(button.dataset.reviewedUser), button.dataset.reviewedName)));
}

function openProductReview(orderId, reviewedUserId, reviewedName) {
    const dialog = document.createElement('dialog'); dialog.className = 'elora-dialog review-dialog';
    dialog.innerHTML = `<form id="product-review-form"><button type="button" class="dialog-close" aria-label="Fechar">×</button><span class="review-form-kicker">PEDIDO CONCLUÍDO</span><h2>Avalie sua compra</h2><p>Sua experiência com ${escapeHtml(reviewedName)} ajuda outras pessoas a comprar com confiança.</p><fieldset class="review-star-picker"><legend>Sua nota</legend>${[5,4,3,2,1].map((rating, index) => `<input type="radio" name="reviewRating" id="review-star-${rating}-${orderId}" value="${rating}" ${index === 0 ? 'checked' : ''}><label for="review-star-${rating}-${orderId}" aria-label="${rating} ${rating === 1 ? 'estrela' : 'estrelas'}">★</label>`).join('')}</fieldset><label for="product-review-comment">Conte como foi</label><textarea id="product-review-comment" required maxlength="2000" rows="4" placeholder="O que você achou do produto e da experiência?" ></textarea><div class="alert" role="status"></div><button class="btn" type="submit">Publicar avaliação</button></form>`;
    document.body.appendChild(dialog); dialog.showModal(); dialog.querySelector('.dialog-close').onclick = () => dialog.close(); dialog.addEventListener('close', () => dialog.remove());
    dialog.querySelector('form').onsubmit = async event => { event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('[type="submit"]'); setButtonLoading(button, true, 'Publicando…'); try { await apiCall('/reviews', 'POST', { type: 'PRODUCT', orderId, reviewedUserId, rating: Number(form.querySelector('[name="reviewRating"]:checked').value), comment: form.querySelector('#product-review-comment').value }); dialog.close(); showToast('Avaliação publicada.'); } catch (error) { const box = form.querySelector('.alert'); box.className = 'alert error'; box.textContent = error.message || 'Não foi possível publicar a avaliação.'; } finally { setButtonLoading(button, false); } };
}
