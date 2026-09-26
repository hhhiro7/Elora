document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    const form = document.getElementById('project-form'); const category = document.getElementById('project-category');
    const categories = await apiCall('/categories?type=SERVICE').catch(() => []);
    categories.forEach(value => category.add(new Option(value, value)));
    const count = document.getElementById('project-description-count');
    document.getElementById('project-description').addEventListener('input', event => count.textContent = String(event.currentTarget.value.length));
    document.getElementById('project-mode').addEventListener('change', updateLocationRequirement);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const message = document.getElementById('project-form-message'); const button = form.querySelector('[type="submit"]');
        const mode = document.getElementById('project-mode').value;
        const locationText = document.getElementById('project-location').value.trim();
        if (mode === 'PRESENCIAL' && !locationText) {
            const field = document.getElementById('project-location'); field.setCustomValidity('Informe a cidade ou região para um projeto presencial.'); field.reportValidity(); field.setCustomValidity(''); return;
        }
        const budget = document.getElementById('project-budget').value;
        setButtonLoading(button, true, 'Publicando…');
        try {
            const project = await apiCall('/projects','POST',{ title:document.getElementById('project-title').value.trim(), description:document.getElementById('project-description').value.trim(),
                category:category.value, budget:budget ? Number(budget) : null, deadlineDays:document.getElementById('project-deadline').value ? Number(document.getElementById('project-deadline').value) : null,
                location:locationText || null, serviceMode:mode });
            message.className = 'alert success'; message.textContent = 'Projeto publicado. Você já pode acompanhar as propostas.';
            location.href = `projeto.html?id=${encodeURIComponent(project.id)}`;
        } catch (error) { message.className = 'alert error'; message.textContent = error.message || 'Não foi possível publicar o projeto.'; setButtonLoading(button,false); }
    });
    function updateLocationRequirement() { document.getElementById('project-location').required = document.getElementById('project-mode').value === 'PRESENCIAL'; }
});
