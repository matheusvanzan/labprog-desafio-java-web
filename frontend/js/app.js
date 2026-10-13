import { SERVICES, DEV, loadConfig, onConfigChange, onHealth, getHealth } from './http.js';
import { icon } from './icons.js';
import { $, $$, esc, todayLong } from './util.js';
import { renderDashboard } from './dashboard.js';
import { renderCrud } from './crud.js';
import { renderConfig } from './config-page.js';
import visitantes from './modules/visitantes.js';
import encomendas from './modules/encomendas.js';
import reservas from './modules/reservas.js';
import ocorrencias from './modules/ocorrencias.js';
import comunicados from './modules/comunicados.js';
import estacionamento from './modules/estacionamento.js';

const MODULES = [visitantes, encomendas, reservas, ocorrencias, comunicados, estacionamento];
const moduleBySlug = (slug) => MODULES.find((m) => m.slug === slug);

let current = { type: null, controller: null, slug: null };
let dashboardTimer = null;

// Duas telas na mesma interface: producao (em "/") e desenvolvimento (em "/dev" e "/config").
const BASE = DEV ? '/dev' : '';
const ENV_LABEL = DEV ? 'Desenvolvimento' : 'Produção';

function drawSidebar() {
  const first = { href: BASE || '/', label: 'Dashboard', icon: 'dashboard' };
  const modules = SERVICES.map((s) => ({ href: `${BASE}/${s.slug}`, label: s.name, icon: s.icon, slug: s.slug }));
  const other = DEV
    ? { href: '/', label: 'Ir para Produção', icon: 'building', plain: true }
    : { href: '/dev', label: 'Ir para Desenvolvimento', icon: 'terminal', plain: true };
  $('#sidebar').innerHTML = `
    <div class="brand"><div class="brand-mark">${icon('building', 20)}</div><div><div class="brand-name">CondoVida</div><div class="brand-sub">Administração de condomínios</div></div></div>
    <div class="env-badge ${DEV ? 'dev' : 'prod'}">${ENV_LABEL}</div>
    <nav class="nav" aria-label="Menu">
      ${navItem(first)}
      <div class="nav-label">Módulos</div>
      ${modules.map(navItem).join('')}
      <div class="nav-label">Sistema</div>
      ${navItem({ href: '/config', label: 'Configurações', icon: 'settings', plain: !DEV })}
      <div class="nav-label">Ambiente</div>
      ${navItem(other)}
    </nav>`;
}

const navItem = (i) => `<a href="${i.href}" ${i.plain ? '' : 'data-nav'} data-path="${i.href}">${icon(i.icon, 19)}<span>${esc(i.label)}</span>${i.slug ? `<span class="dot" data-dot="${i.slug}"></span>` : ''}</a>`;

function updateDots() {
  $$('[data-dot]').forEach((dot) => {
    const state = getHealth(dot.dataset.dot);
    dot.className = `dot ${state === 'ok' ? 'ok' : state === 'err' ? 'err' : ''}`;
  });
}

function routeInfo(pathname) {
  let path = pathname.replace(/\/+$/, '') || '/';
  const home = { type: 'dashboard', path: BASE || '/', title: `Dashboard · ${ENV_LABEL}`, subtitle: todayLong() };
  if (DEV && path === '/config') return { type: 'config', path, title: 'Configurações', subtitle: 'URLs das APIs de desenvolvimento' };
  if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length) || '/';
  const mod = moduleBySlug(path.slice(1));
  if (mod) return { type: 'module', path: `${BASE}/${mod.slug}`, slug: mod.slug, title: mod.page.title, subtitle: `${mod.page.subtitle} · ${ENV_LABEL}` };
  return home;
}

function drawTopbar(route) {
  $('#topbar').innerHTML = `
    <button class="btn icon menu-btn" data-menu aria-label="Abrir menu">${icon('menu', 18)}</button>
    <div class="top-title"><h1>${esc(route.title)}</h1><p>${esc(route.subtitle)}</p></div>
    <div class="top-spacer"></div>
    ${route.type === 'dashboard' ? `<button class="btn" data-refresh-all>${icon('refresh', 15)} Atualizar tudo</button>` : ''}`;
}

function navigate(pathname, push = true) {
  const route = routeInfo(pathname);
  if (push && location.pathname !== route.path) history.pushState({}, '', route.path);
  clearInterval(dashboardTimer);
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.path === route.path));
  $('#sidebar').classList.remove('open');
  $('#sidebar-backdrop').classList.remove('show');
  drawTopbar(route);
  document.title = `${route.title} · CondoVida`;
  const view = $('#view');
  const fresh = view.cloneNode(false); // descarta listeners da tela anterior
  view.replaceWith(fresh);
  current = { type: route.type, controller: null, slug: route.slug };
  if (route.type === 'dashboard') {
    current.controller = renderDashboard(fresh, MODULES);
    dashboardTimer = setInterval(() => current.controller?.refresh(), 30000);
  } else if (route.type === 'module') {
    current.controller = renderCrud(fresh, moduleBySlug(route.slug));
  } else {
    renderConfig(fresh);
  }
  window.scrollTo(0, 0);
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-nav], a[data-link]');
  if (link && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    navigate(link.getAttribute('href'));
    return;
  }
  if (event.target.closest('[data-menu]')) {
    $('#sidebar').classList.add('open');
    $('#sidebar-backdrop').classList.add('show');
  }
  if (event.target.closest('#sidebar-backdrop')) {
    $('#sidebar').classList.remove('open');
    $('#sidebar-backdrop').classList.remove('show');
  }
  if (event.target.closest('[data-refresh-all]')) current.controller?.refresh();
});
window.addEventListener('popstate', () => navigate(location.pathname, false));

// Quando alguem salva uma URL nova em /config, o painel reage sozinho.
onConfigChange((slugs) => {
  if (current.type === 'dashboard') current.controller?.refresh(slugs);
  else if (current.type === 'module' && slugs.includes(current.slug)) current.controller?.reload();
});
onHealth(updateDots);

async function boot() {
  drawSidebar();
  try { await loadConfig(); } catch { /* o aviso aparece em cada modulo */ }
  navigate(location.pathname, false);
  setInterval(() => loadConfig().catch(() => {}), 4000);
}

boot();
