const localFrontendPorts = new Set(['3000', '5173', '5174', '5500', '5501']);
const isLocalStaticFrontend = ['localhost', '127.0.0.1'].includes(location.hostname)
    && localFrontendPorts.has(location.port);
const defaultApiUrl = location.protocol === 'file:' || isLocalStaticFrontend
    ? 'http://localhost:8080/api'
    : '/api';
const API_URL = `${window.ELORA_API_URL?.trim() || defaultApiUrl}`.replace(/\/$/, '');
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    let res;
    try {
        res = await fetch(`${API_URL}${endpoint}`, config);
    } catch {
        throw new Error(`Não foi possível conectar à API em ${API_URL}. Inicie o backend Spring Boot ou configure ELORA_API_URL para o endereço público da API.`);
    }
    const text = await res.text();

    if (!res.ok) {
        let message = text || 'Erro na requisição.';
        try {
            const parsed = JSON.parse(text);
            message = parsed.message || parsed.error || parsed.detail || text;
        } catch { /* mensagens textuais da API permanecem legíveis */ }
        if (res.status === 401 && token) {
            localStorage.removeItem('token');
            window.dispatchEvent(new CustomEvent('elora:auth-expired'));
        }
        if (res.status === 404 && /^\s*<!doctype html|^\s*<html/i.test(text)) {
            throw new Error(`A solicitação foi enviada a ${API_URL}, que respondeu com uma página HTML em vez da API. Confira a URL do backend e o proxy do servidor.`);
        }
        throw new Error(message);
    }

    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const requireAuth = () => {
    if (getToken()) return true;
    window.location.href = `login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}`;
    return false;
};

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'app-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle('is-error', type === 'error');
    toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function setButtonLoading(button, loading, loadingLabel = 'Aguarde…') {
    if (!button) return;
    if (loading) {
        button.dataset.label = button.textContent;
        button.textContent = loadingLabel;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
    } else {
        button.textContent = button.dataset.label || button.textContent;
        button.disabled = false;
        button.removeAttribute('aria-busy');
    }
}

window.addEventListener('elora:auth-expired', () => {
    if (!['login.html', 'cadastro.html'].includes(location.pathname.split('/').pop())) {
        showToast('Sua sessão terminou. Entre novamente para continuar.', 'error');
        setTimeout(() => { location.href = `login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}`; }, 900);
    }
});

// Imagem simples usada quando o produto não tem imageUrl ou a URL não carrega.
const FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">' +
    '<rect width="100%" height="100%" fill="#171923"/>' +
    '<text x="50%" y="50%" font-family="Segoe UI, sans-serif" font-size="16" fill="#A1A1B5" text-anchor="middle" dy=".3em">Sem imagem</text>' +
    '</svg>'
);
