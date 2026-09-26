document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-password-toggle]').forEach(button => button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        const visible = input.type === 'password'; input.type = visible ? 'text' : 'password';
        button.textContent = visible ? 'Ocultar' : 'Mostrar'; button.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
    }));
    const cpf = document.getElementById('cpf');
    cpf?.addEventListener('input', () => {
        const digits = cpf.value.replace(/\D/g, '').slice(0, 11);
        cpf.value = digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    });
    document.getElementById('password')?.addEventListener('input', updatePasswordStrength);
    document.getElementById('login-form')?.addEventListener('submit', login);
    document.getElementById('register-form')?.addEventListener('submit', register);
});

async function login(event) {
    event.preventDefault(); const form = event.currentTarget; const button = document.getElementById('login-submit'); const message = document.getElementById('msg');
    setButtonLoading(button, true, 'Entrando…');
    try {
        const result = await apiCall('/auth/login', 'POST', { email: form.elements.email.value.trim(), password: form.elements.password.value });
        localStorage.removeItem('token'); sessionStorage.removeItem('token');
        (document.getElementById('remember-me').checked ? localStorage : sessionStorage).setItem('token', result.token);
        localStorage.setItem('userName', result.name || '');
        const next = new URLSearchParams(location.search).get('next');
        const safeNext = next && !next.includes('://') && !next.startsWith('//') && !next.startsWith('/') ? next : 'index.html';
        location.href = safeNext;
    } catch (error) { message.className = 'alert error'; message.textContent = error.message || 'Confira seu e-mail e sua senha.'; setButtonLoading(button, false); }
}

async function register(event) {
    event.preventDefault(); const form = event.currentTarget; const button = document.getElementById('register-submit'); const message = document.getElementById('msg');
    const password = document.getElementById('password').value;
    if (password !== document.getElementById('confirm-password').value) { message.className = 'alert error'; message.textContent = 'As senhas não conferem.'; return; }
    if (!validCpf(document.getElementById('cpf').value)) { message.className = 'alert error'; message.textContent = 'Informe um CPF válido.'; return; }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { message.className = 'alert error'; message.textContent = 'A senha precisa ter ao menos 8 caracteres, incluindo letras e números.'; return; }
    setButtonLoading(button, true, 'Criando conta…');
    try {
        await apiCall('/auth/register', 'POST', {
            name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), cpf: form.elements.cpf.value.replace(/\D/g, ''),
            password, city: form.elements.city.value.trim() || null, phone: form.elements.phone.value.trim() || null
        });
        message.className = 'alert success'; message.textContent = 'Conta criada. Agora você já pode entrar.';
        showToast('Sua conta Elora está pronta.'); setTimeout(() => location.href = 'login.html', 700);
    } catch (error) { message.className = 'alert error'; message.textContent = error.message || 'Não foi possível criar sua conta.'; setButtonLoading(button, false); }
}

function validCpf(value) {
    const cpf = value.replace(/\D/g, '');
    if (!/^\d{11}$/.test(cpf) || /^([0-9])\1{10}$/.test(cpf)) return false;
    let sum = 0; for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
    let digit = 11 - sum % 11; if (digit >= 10) digit = 0; if (digit !== Number(cpf[9])) return false;
    sum = 0; for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
    digit = 11 - sum % 11; if (digit >= 10) digit = 0; return digit === Number(cpf[10]);
}

function updatePasswordStrength(event) {
    const password = event.target.value; const bar = document.getElementById('password-strength-bar'); const label = document.getElementById('password-strength-label');
    const checks = [password.length >= 8, /[A-Za-z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)];
    const score = checks.filter(Boolean).length; bar.style.width = `${score * 25}%`; bar.dataset.strength = score >= 4 ? 'strong' : score >= 3 ? 'medium' : 'weak';
    label.textContent = !password ? 'Use pelo menos 8 caracteres, com letras e números.' : score >= 4 ? 'Senha forte.' : score >= 3 ? 'Senha razoável; adicione um símbolo para reforçar.' : 'Inclua mais caracteres, letras e números.';
}
