const COMPARE_STORAGE_KEY = 'elora:comparison:products';
function getComparedProductIds() {
    try { const values = JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) || '[]'); return Array.isArray(values) ? values.map(Number).filter(Number.isFinite).slice(0,4) : []; }
    catch { return []; }
}
function saveComparedProductIds(values) { try { localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify([...new Set(values)].slice(0,4))); } catch { showToast('Não foi possível salvar a comparação neste navegador.', 'error'); } }
function toggleProductComparison(id) {
    const values = getComparedProductIds();
    if (values.includes(id)) saveComparedProductIds(values.filter(item => item !== id));
    else if (values.length >= 4) { showToast('Compare até quatro produtos por vez.', 'error'); return; }
    else saveComparedProductIds([...values,id]);
    refreshProductComparison();
}
function refreshProductComparison() {
    const values = getComparedProductIds();
    document.querySelectorAll('[data-compare-product]').forEach(button => {
        const selected = values.includes(Number(button.dataset.compareProduct)); button.classList.toggle('is-selected', selected); button.setAttribute('aria-pressed', String(selected)); button.textContent = selected ? '✓ Na comparação' : 'Comparar';
    });
    const dock = document.getElementById('product-compare-dock');
    if (dock) { dock.hidden = !values.length; document.getElementById('compare-count').textContent = String(values.length); }
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('clear-comparison')?.addEventListener('click', () => { saveComparedProductIds([]); refreshProductComparison(); });
    const content = document.getElementById('comparison-content');
    if (content) renderProductComparison(content);
    refreshProductComparison();
});
async function renderProductComparison(content) {
    const ids = getComparedProductIds();
    if (ids.length < 2) { content.innerHTML = `<section class="empty-state"><h2>Escolha pelo menos dois produtos</h2><p>Marque “Comparar” nos anúncios para analisar as informações lado a lado.</p><a class="btn" href="produtos.html">Explorar produtos</a></section>`; return; }
    try {
        const products = (await Promise.all(ids.map(id => apiCall(`/products/${id}`).catch(() => null)))).filter(Boolean);
        if (products.length < 2) { content.innerHTML = `<section class="empty-state"><h2>Não foi possível carregar os anúncios selecionados</h2><p>Algum produto pode ter ficado indisponível. Atualize a comparação no catálogo.</p><a class="btn" href="produtos.html">Voltar ao catálogo</a></section>`; return; }
        const fields = [['Preço',p=>formatCurrency(p.price)],['Categoria',p=>p.category || 'Não informada'],['Condição',p=>p.conditionType === 'USADO' ? 'Usado' : p.conditionType === 'NOVO' ? 'Novo' : 'Não informada'],['Vendedor',p=>p.owner?.name || 'Não informado'],['Localização',p=>p.location || 'Não informada'],['Estoque',p=>p.stock == null ? 'Não informado' : `${p.stock} disponível(is)`],['Descrição',p=>p.description || 'Sem descrição']];
        content.innerHTML = `<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th scope="col">Informação</th>${products.map(p=>`<th scope="col"><a href="produto.html?id=${p.id}">${escapeHtml(p.name)}</a><button class="compare-remove" type="button" data-remove-compare="${p.id}" aria-label="Remover ${escapeHtml(p.name)} da comparação">Remover</button></th>`).join('')}</tr></thead><tbody>${fields.map(([label,read])=>`<tr><th scope="row">${label}</th>${products.map(p=>`<td>${escapeHtml(read(p))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="compare-actions"><button class="btn btn-secondary" id="clear-comparison-page" type="button">Limpar comparação</button><a href="produtos.html" class="btn">Adicionar produtos</a></div>`;
        content.querySelectorAll('[data-remove-compare]').forEach(button=>button.addEventListener('click',()=>{saveComparedProductIds(getComparedProductIds().filter(id=>id!==Number(button.dataset.removeCompare)));renderProductComparison(content)}));
        document.getElementById('clear-comparison-page').addEventListener('click',()=>{saveComparedProductIds([]);renderProductComparison(content)});
    } catch (error) { content.innerHTML = `<section class="empty-state"><p>${escapeHtml(error.message || 'Não foi possível montar a comparação.')}</p></section>`; }
}
