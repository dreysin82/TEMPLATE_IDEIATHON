const TOTAL_STEPS = 6;
let currentStep = 1;
let tempImages = [];
let currentProject = null;

const el = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const viewId = params.get('view');

const screens = {
  welcome: el('welcome-screen'),
  wizard: el('wizard-screen'),
  layout: el('layout-screen'),
  project: el('project-screen')
};

function show(screen) {
  Object.values(screens).forEach((s) => s.classList.add('hidden'));
  screens[screen].classList.remove('hidden');
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

function saveProject(project) {
  localStorage.setItem(`ideiathon:${project.id}`, JSON.stringify(project));
}

function loadProject(id) {
  const raw = localStorage.getItem(`ideiathon:${id}`);
  return raw ? JSON.parse(raw) : null;
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
      (d, i) => `<article class="layout-card"><h4>Layout ${i + 1}</h4><p>${d}</p>
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

  const url = `${window.location.origin}${window.location.pathname}?view=${project.id}`;
  const anchor = el('project-link');
  anchor.href = url;
  anchor.textContent = url;
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
      <h2>${project.teamName}</h2>
      <p><strong>Entregue para:</strong> ${project.audience}</p>
    </div>

    <div class="two-cols">
      <div class="block">
        <h3>Integrantes</h3>
        <ul class="members">${project.members.map((m) => `<li>${m}</li>`).join('')}</ul>
      </div>
      <div class="block">
        <h3>Impacto</h3>
        <p class="metric">${project.metricValue}</p>
        <p><strong>${project.metricName}</strong></p>
        <p>${project.impact}</p>
      </div>
    </div>

    <div class="block"><h3>Problema</h3><p>${project.problem}</p></div>
    <div class="block"><h3>Solução</h3><p>${project.solution}</p></div>
    ${images}
  </div>`;
}

function goToProject(id) {
  const project = loadProject(id);
  if (!project) {
    show('welcome');
    return;
  }

  currentProject = project;
  history.replaceState({}, '', `?view=${id}`);
  show('project');
  el('new-project-btn').classList.remove('hidden');

  screens.project.innerHTML = `
    <div class="project-toolbar">
      <span class="muted">Layout atual: ${project.layout}</span>
      ${[1, 2, 3, 4]
        .map((n) => `<button type="button" class="ghost" data-swap="${n}">Trocar para ${n}</button>`)
        .join('')}
    </div>
    ${template(project)}
  `;

  screens.project.querySelectorAll('[data-swap]').forEach((btn) => {
    btn.addEventListener('click', () => {
      project.layout = Number(btn.dataset.swap);
      saveProject(project);
      goToProject(project.id);
    });
  });
}

function init() {
  el('start-btn').addEventListener('click', () => {
    show('wizard');
    updateWizardUI();
  });

  el('new-project-btn').addEventListener('click', () => {
    history.replaceState({}, '', window.location.pathname);
    show('welcome');
    el('new-project-btn').classList.add('hidden');
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
    currentProject = project;
    drawLayoutPicker(project);
    show('layout');
  });

  if (viewId) {
    goToProject(viewId);
  } else {
    show('welcome');
  }
}

init();
