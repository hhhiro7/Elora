function renderNav() {
    const nav = document.getElementById('nav-menu');
    if (!nav) return;
    const header = nav.closest('header');
    header?.classList.add('site-header');
    nav.classList.add('site-nav');

    if (!document.getElementById('nav-toggle') && header) {
        const toggle = document.createElement('button');
        toggle.id = 'nav-toggle';
        toggle.className = 'nav-toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-controls', 'nav-menu');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menu');
        toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
        header.insertBefore(toggle, nav);
        toggle.addEventListener('click', () => {
            const open = header.classList.toggle('nav-open');
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                header.classList.remove('nav-open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    const authenticated = Boolean(getToken());
    const name = escapeHtml(localStorage.getItem('userName') || 'Minha conta');
    const account = authenticated ? `
        <details class="nav-account">
            <summary><span class="nav-avatar" aria-hidden="true">${name.charAt(0).toUpperCase()}</span><span>${name}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary>
            <div class="nav-account-menu">
                <a href="perfil.html">Meu perfil</a><a href="dashboard.html">Painel</a>
                <a href="meus-produtos.html">Meus anúncios</a><a href="meus-pedidos.html">Meus pedidos</a><a href="minhas-vendas.html">Vendas</a>
                <a href="oferecer-servico.html">Publicar serviço</a><a href="servicos-contratados.html">Solicitações de serviço</a>
                <a href="meus-projetos.html">Meus projetos</a><a href="propostas.html">Minhas propostas</a><a href="negociacoes.html">Negociações</a><a href="notificacoes.html">Notificações</a><a href="favoritos.html">Favoritos</a><a href="comparar.html">Comparar produtos</a><a href="mensagens.html">Mensagens</a>
                <button id="nav-logout" type="button">Sair da conta</button>
            </div>
        </details>` : `<a href="login.html">Entrar</a><a href="cadastro.html" class="btn nav-signup">Criar conta</a>`;

    nav.innerHTML = `
        <a href="produtos.html">Produtos</a>
        <a href="servicos.html">Serviços</a>
        <a href="projetos.html">Projetos</a>
        ${authenticated ? `<a href="vender.html">Anunciar</a><a href="mensagens.html">Mensagens</a><a class="nav-notifications-link" href="notificacoes.html" aria-label="Notificações">Avisos<span class="nav-notification-count" id="nav-notification-count" hidden>0</span></a>` : ''}
        <a class="nav-favorites-link" href="favoritos.html">Favoritos</a>
        ${account}
        ${typeof cartControl === 'function' ? cartControl() : ''}
    `;

    const currentFile = location.pathname.split('/').pop() || 'index.html';
    const activePage = currentFile === 'editar-produto.html' ? 'vender.html'
        : currentFile === 'oferecer-servico.html' ? 'servicos.html'
        : currentFile;
    nav.querySelectorAll('a[href]').forEach(link => {
        if (link.getAttribute('href') === activePage) {
            link.classList.add('is-current');
            link.setAttribute('aria-current', 'page');
        }
    });

    document.getElementById('nav-logout')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        localStorage.removeItem('userName');
        location.href = 'index.html';
    });
    if (authenticated) apiCall('/notifications/unread-count').then(result => {
        const badge = document.getElementById('nav-notification-count');
        if (badge && Number(result.count) > 0) { badge.hidden = false; badge.textContent = Number(result.count) > 99 ? '99+' : String(result.count); }
    }).catch(() => {});
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
        header?.classList.remove('nav-open');
        document.getElementById('nav-toggle')?.setAttribute('aria-expanded', 'false');
    }));

    const accountMenu = nav.querySelector('.nav-account');
    document.addEventListener('click', event => {
        if (accountMenu?.open && !accountMenu.contains(event.target)) accountMenu.open = false;
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && accountMenu?.open) accountMenu.open = false;
    });
}

function cartControl() {
    return `<button class="nav-cart-toggle" id="nav-cart-toggle" type="button" aria-label="Abrir carrinho, 0 itens" aria-controls="cart-drawer" aria-expanded="false">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
        <span class="nav-cart-label">Carrinho</span><span class="nav-cart-count" id="nav-cart-count">0</span>
    </button>`;
}

document.addEventListener('DOMContentLoaded', renderNav);
