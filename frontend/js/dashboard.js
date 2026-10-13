// Dashboard: seis indicadores no topo e seis paineis (2 linhas x 3 colunas).
// Cada modulo carrega de forma independente: a falha de uma API afeta apenas o seu bloco.
import { serviceBySlug, getUrl, DEV } from './http.js';
import { icon } from './icons.js';
import { esc } from './util.js';
import { stateBlock, skeleton } from './ui.js';

function kpiShell(mod) {
  const s = serviceBySlug(mod.slug);
  return `<div class="card kpi" id="kpi-${mod.slug}">
    <div class="kpi-head"><div class="ico-box c-${s.color}">${icon(s.icon, 17)}</div><span class="kpi-label">${esc(s.name)}</span></div>
    <div class="skeleton" style="height:30px;width:60%"></div><div class="skeleton" style="height:14px;width:80%"></div></div>`;
}

function panelShell(mod) {
  const s = serviceBySlug(mod.slug);
  return `<section class="card panel" id="panel-${mod.slug}">
    <div class="panel-head"><div class="ico-box c-${s.color}">${icon(s.icon, 17)}</div><h2>${esc(s.name)}</h2></div>
    <div class="panel-body" style="display:flex;flex-direction:column;gap:14px;flex:1">${skeleton(5)}</div><a class="more" href="${DEV ? '/dev' : ''}/${mod.slug}" data-link>Ver mais →</a></section>`;
}

function errorMessage(error) {
  if (error.network) return { title: 'API indisponível', detail: `Não foi possível conectar em <code>${esc(error.url || '')}</code>.` };
  if (error.status) return { title: `A API respondeu com erro ${error.status}`, detail: esc(error.message) };
  return { title: 'Resposta inesperada da API', detail: `O formato dos dados não é o esperado (${esc(error.message)}).` };
}

export function renderDashboard(root, mods) {
  root.innerHTML = `<div class="kpi-row">${mods.map(kpiShell).join('')}</div><div class="panel-grid">${mods.map(panelShell).join('')}</div>`;
  const tokens = {};

  async function loadModule(mod) {
    const token = (tokens[mod.slug] = (tokens[mod.slug] || 0) + 1);
    const kpiEl = root.querySelector(`#kpi-${mod.slug}`);
    const bodyEl = root.querySelector(`#panel-${mod.slug} .panel-body`);
    if (!kpiEl || !bodyEl) return;
    const s = serviceBySlug(mod.slug);
    try {
      const data = await mod.load();
      if (token !== tokens[mod.slug] || !root.contains(kpiEl)) return;
      const k = mod.kpi(data);
      kpiEl.innerHTML = `<div class="kpi-head"><div class="ico-box c-${s.color}">${icon(s.icon, 17)}</div><span class="kpi-label">${esc(k.label)}</span></div>
        <div class="kpi-value">${esc(k.value)}${k.unit ? `<small>${esc(k.unit)}</small>` : ''}</div><div class="kpi-sub">${k.sub}</div>`;
      bodyEl.innerHTML = mod.panel(data);
    } catch (error) {
      if (token !== tokens[mod.slug] || !root.contains(kpiEl)) return;
      error.url = error.url || getUrl(mod.slug);
      const { title, detail } = errorMessage(error);
      kpiEl.innerHTML = `<div class="kpi-head"><div class="ico-box c-red">${icon('alert', 17)}</div><span class="kpi-label">${esc(s.name)}</span></div>
        <div class="kpi-value" style="font-size:18px;color:var(--red)">Indisponível</div><div class="kpi-sub">${esc(title)}</div>`;
      bodyEl.innerHTML = stateBlock('error', title, detail,
        `<button class="btn sm" data-retry="${mod.slug}">${icon('refresh', 14)} Tentar novamente</button>`);
    }
  }

  root.addEventListener('click', (event) => {
    const retry = event.target.closest('[data-retry]');
    if (retry) loadModule(mods.find((m) => m.slug === retry.dataset.retry));
  });

  const refresh = (slugs) => Promise.all(mods.filter((m) => !slugs || slugs.includes(m.slug)).map(loadModule));
  refresh();
  return { refresh };
}
