const TOTAL_STEPS = 6;
const STORAGE_PREFIX = 'ideiathon:';
let currentStep = 1;
let tempImages = [];

const el = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const viewId = params.get('view');

const screens = {
  welcome: el('welcome-screen'),
  wizard: el('wizard-screen'),
  layout: el('layout-screen'),
  list: el('list-screen'),
  project: el('project-screen')
};

function safe(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function show(screen) {
  Object.values(screens).forEach((s) => s.classList.add('hidden'));
  screens[screen].classList.remove('hidden');
}

function updateTopButtons(screen) {
  const showContextButtons = screen === 'project' || screen === 'list';
  el('new-project-btn').classList.toggle('hidden', !showContextButtons);
  el('list-projects-btn').classList.toggle('hidden', !showContextButtons);
}

function getProjectUrl(id) {
  return `${window.location.origin}${window.location.pathname}?view=${id}`;
}

function updateWizardUI() {
  document.querySelectorAll('.step').forEach((step) => {
    step.classList.toggle('hidden', Number(step.dataset.step) !== currentStep);
  });

  el('step-label').textContent = `Etapa ${currentStep} de ${TOTAL_STEPS}`;
  el('progress-bar').style.width = `${(currentStep / TOTAL_STEPS) * 100}%`;
  el('prev-btn').classList.toggle('hidden', currentStep === 1);
  el('next-btn').classList.toggle('hidden', currentStep === TOTAL_STEPS);
  el('finish-btn').classList.toggle('hidden', currentStep !== TOTAL_STEPS);
}

function readImages(files) {
  const limited = [...files].slice(0, 3);
  return Promise.all(
    limited.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        })
    )
  );
}

function previewImages(images) {
  const container = el('image-preview');
  container.innerHTML = images.map((src) => `<img src="${src}" alt="Imagem do projeto">`).join('');
}

function projectFromForm(formData) {
  return {
    id: crypto.randomUUID().slice(0, 8),
    teamName: formData.get('teamName').trim(),
    members: formData.get('members').split('\n').map((n) => n.trim()).filter(Boolean),
    problem: formData.get('problem').trim(),
    audience: formData.get('audience').trim(),
    metricName: formData.get('metricName').trim(),
    metricValue: formData.get('metricValue').trim(),
    impact: formData.get('impact').trim(),
    solution: formData.get('solution').trim(),
    images: tempImages,
    layout: 1,
    createdAt: new Date().toISOString()
  };
}

function storageKey(id) {
  return `${STORAGE_PREFIX}${id}`;
}

function saveProject(project) {
  localStorage.setItem(storageKey(project.id), JSON.stringify(project));
}

function deleteProject(id) {
  localStorage.removeItem(storageKey(id));
}

function loadProject(id) {
  const raw = localStorage.getItem(storageKey(id));
  return raw ? JSON.parse(raw) : null;
}

function allProjects() {
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .map((k) => JSON.parse(localStorage.getItem(k)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR');
}

function exportProject(project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${project.teamName.replace(/\s+/g, '_').toLowerCase() || 'projeto'}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function drawLayoutPicker(project) {
  const grid = el('layout-grid');
  const descriptions = [
    'Pitch clássico com blocos',
    'Visual escuro e moderno',
    'Storytelling com destaque verde',
    'Canvas com destaque roxo'
  ];

  grid.innerHTML = descriptions
    .map(
      (d, i) => `<article class="layout-card"><h4>Layout ${i + 1}</h4><p>${safe(d)}</p>
      <button type="button" class="primary" data-layout="${i + 1}">Usar layout ${i + 1}</button></article>`
    )
    .join('');

  grid.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      project.layout = Number(btn.dataset.layout);
      saveProject(project);
      goToProject(project.id);
    });
  });

  const url = getProjectUrl(project.id);
  const anchor = el('project-link');
  anchor.href = url;
  anchor.textContent = url;
  el('copy-link-btn').onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      el('copy-link-btn').textContent = 'Link copiado!';
      setTimeout(() => (el('copy-link-btn').textContent = 'Copiar link'), 1200);
    } catch (_err) {
      alert('Não foi possível copiar automaticamente. Copie o link manualmente.');
    }
  };
}

function template(project) {
  const images = project.images?.length
    ? `<div class="block"><h3>Imagens</h3><div class="gallery">${project.images
        .map((src) => `<img src="${src}" alt="Imagem do projeto"/>`)
        .join('')}</div></div>`
    : '';

  return `
  <div class="project-layout layout-${project.layout}">
    <div class="hero-box">
      <p class="tag">Projeto da equipe</p>
      <h2>${safe(project.teamName)}</h2>
      <p><strong>Entregue para:</strong> ${safe(project.audience)}</p>
    </div>

    <div class="two-cols">
      <div class="block">
        <h3>Integrantes</h3>
        <ul class="members">${project.members.map((m) => `<li>${safe(m)}</li>`).join('')}</ul>
      </div>
      <div class="block">
        <h3>Impacto</h3>
        <p class="metric">${safe(project.metricValue)}</p>
        <p><strong>${safe(project.metricName)}</strong></p>
        <p>${safe(project.impact)}</p>
      </div>
    </div>

    <div class="block"><h3>Problema</h3><p>${safe(project.problem)}</p></div>
    <div class="block"><h3>Solução</h3><p>${safe(project.solution)}</p></div>
    ${images}
  </div>`;
}

function renderSavedList() {
  const list = el('saved-list');
  const projects = allProjects();

  if (!projects.length) {
    list.innerHTML = '<p class="muted">Nenhum projeto salvo neste navegador ainda.</p>';
    return;
  }

  list.innerHTML = projects
    .map(
      (p) => `<article class="saved-card">
        <h3>${safe(p.teamName)}</h3>
        <p class="muted">Criado em ${formatDate(p.createdAt)} • Layout ${p.layout}</p>
        <div class="saved-actions">
          <button class="ghost" type="button" data-open="${p.id}">Abrir</button>
          <button class="ghost" type="button" data-export="${p.id}">Exportar JSON</button>
          <button class="ghost danger" type="button" data-delete="${p.id}">Excluir</button>
        </div>
      </article>`
    )
    .join('');

  list.querySelectorAll('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => goToProject(btn.dataset.open));
  });

  list.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const project = loadProject(btn.dataset.export);
      if (project) exportProject(project);
    });
  });

  list.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ok = confirm('Tem certeza que deseja excluir este projeto?');
      if (!ok) return;
      deleteProject(btn.dataset.delete);
      renderSavedList();
    });
  });
}

function goToList() {
  history.replaceState({}, '', window.location.pathname);
  show('list');
  updateTopButtons('list');
  renderSavedList();
}

function goToProject(id) {
  const project = loadProject(id);
  if (!project) {
    alert('Projeto não encontrado neste navegador. Use Importar JSON se necessário.');
    show('welcome');
    updateTopButtons('welcome');
    return;
  }

  history.replaceState({}, '', `?view=${id}`);
  show('project');
  updateTopButtons('project');

  screens.project.innerHTML = `
    <div class="project-toolbar">
      <span class="muted">Layout atual: ${project.layout}</span>
      <button type="button" class="ghost" data-copy-link>Copiar link</button>
      <button type="button" class="ghost" data-export>Exportar JSON</button>
      ${[1, 2, 3, 4]
        .map((n) => `<button type="button" class="ghost" data-swap="${n}">Trocar para ${n}</button>`)
        .join('')}
    </div>
    ${template(project)}
  `;

  screens.project.querySelector('[data-copy-link]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getProjectUrl(project.id));
      alert('Link copiado!');
    } catch (_err) {
      alert('Falha ao copiar. Copie manualmente da barra do navegador.');
    }
  });

  screens.project.querySelector('[data-export]').addEventListener('click', () => exportProject(project));

  screens.project.querySelectorAll('[data-swap]').forEach((btn) => {
    btn.addEventListener('click', () => {
      project.layout = Number(btn.dataset.swap);
      saveProject(project);
      goToProject(project.id);
    });
  });
}

function resetWizard() {
  currentStep = 1;
  tempImages = [];
  el('project-form').reset();
  el('image-preview').innerHTML = '';
  updateWizardUI();
}

function init() {
  el('start-btn').addEventListener('click', () => {
    resetWizard();
    show('wizard');
    updateTopButtons('wizard');
  });

  el('open-list-btn').addEventListener('click', goToList);
  el('list-projects-btn').addEventListener('click', goToList);

  el('new-project-btn').addEventListener('click', () => {
    history.replaceState({}, '', window.location.pathname);
    show('welcome');
    updateTopButtons('welcome');
  });

  el('import-btn').addEventListener('click', () => el('import-input').click());

  el('import-input').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      const content = await file.text();
      const project = JSON.parse(content);
      if (!project.id || !project.teamName) throw new Error('json inválido');
      saveProject(project);
      alert('Projeto importado com sucesso!');
      goToList();
    } catch (_err) {
      alert('Arquivo inválido. Use um JSON exportado pela plataforma.');
    } finally {
      ev.target.value = '';
    }
  });

  el('prev-btn').addEventListener('click', () => {
    currentStep = Math.max(1, currentStep - 1);
    updateWizardUI();
  });

  el('next-btn').addEventListener('click', () => {
    const activeStep = document.querySelector(`.step[data-step="${currentStep}"]`);
    const requiredFields = [...activeStep.querySelectorAll('[required]')];
    const valid = requiredFields.every((input) => input.reportValidity());
    if (!valid) return;

    currentStep = Math.min(TOTAL_STEPS, currentStep + 1);
    updateWizardUI();
  });

  el('images').addEventListener('change', async (ev) => {
    tempImages = await readImages(ev.target.files);
    previewImages(tempImages);
  });

  el('project-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const formData = new FormData(ev.target);
    const project = projectFromForm(formData);
    saveProject(project);
    drawLayoutPicker(project);
    show('layout');
    updateTopButtons('layout');
  });

  if (viewId) {
    goToProject(viewId);
  } else {
    show('welcome');
    updateTopButtons('welcome');
  }
}

init();
