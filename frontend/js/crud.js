// Tela administrativa generica: cada modulo descreve colunas, filtros, campos e acoes.
// Nenhuma regra de negocio ou validacao vive aqui: tudo e decidido pela API
// (por isso todas as acoes aparecem em todas as linhas e os formularios enviam o que foi digitado).
import { api, ApiError, serviceBySlug } from './http.js';
import { icon } from './icons.js';
import { esc, debounce } from './util.js';
import { openModal, toast, confirmDialog } from './ui.js';

function fieldHtml(field, value) {
  const id = `f-${field.name}`;
  const val = value ?? '';
  let control;
  if (field.type === 'select') {
    control = `<select id="${id}" name="${field.name}">${field.options.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (field.type === 'textarea') {
    control = `<textarea id="${id}" name="${field.name}" placeholder="${esc(field.placeholder || '')}">${esc(val)}</textarea>`;
  } else {
    control = `<input id="${id}" name="${field.name}" type="${field.type}" value="${esc(val)}" placeholder="${esc(field.placeholder || '')}" autocomplete="off">`;
  }
  return `<div class="field ${field.full ? 'full' : ''}"><label for="${id}">${esc(field.label)}${field.optional ? ' <span class="muted">(opcional)</span>' : ''}</label>${control}</div>`;
}

function collect(form, fields) {
  const body = {};
  for (const field of fields) {
    const value = form.elements[field.name].value;
    if (field.optional && value === '') continue;
    body[field.name] = value;
  }
  return body;
}

export function renderCrud(root, mod) {
  const p = mod.page;
  const slug = mod.slug;
  const service = serviceBySlug(slug);
  const params = {};
  let rows = [];

  root.innerHTML = `
    <div class="page-head">
      <div class="ico-box c-${service.color}">${icon(service.icon, 18)}</div>
      <div><h2 style="font-size:18px">${esc(p.title)}</h2><p class="muted">${esc(p.subtitle)}</p></div>
      <div style="margin-left:auto" class="row">
        <button class="btn" data-refresh>${icon('refresh', 15)} Atualizar</button>
        <button class="btn primary" data-new>${icon('plus', 15)} ${esc(p.newLabel)}</button>
      </div>
    </div>
    <div class="filters" id="filters">${p.filters.map((f) => {
      if (f.search) return `<input class="input" type="search" data-param="${f.param}" placeholder="${esc(f.placeholder)}">`;
      if (f.date) return `<input class="input" style="width:auto" type="date" data-param="${f.param}" title="Filtrar por data">`;
      return `<select class="input" data-param="${f.param}"><option value="">${esc(f.label)}</option>${f.options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`;
    }).join('')}</div>
    <div id="offline"></div>
    <div class="card table-card"><div class="table-wrap" id="table"></div><div class="table-foot" id="foot"></div></div>`;

  const tableEl = root.querySelector('#table');
  const footEl = root.querySelector('#foot');
  const offlineEl = root.querySelector('#offline');

  function drawTable() {
    const head = p.columns.map((c) => `<th>${esc(c.label)}</th>`).join('');
    const body = rows.map((row) => `<tr data-id="${row.id}">
      <td class="muted">#${row.id}</td>
      ${p.columns.map((c) => `<td>${c.cell(row)}</td>`).join('')}
      <td class="actions">
        <button class="btn sm icon" data-act="edit" title="Editar" aria-label="Editar">${icon('edit', 15)}</button>
        ${p.rowActions.map((a, i) => `<button class="btn sm icon ${a.cls}" data-act="action" data-i="${i}" title="${esc(a.title)}" aria-label="${esc(a.title)}">${icon(a.icon, 15)}</button>`).join('')}
        <button class="btn sm icon danger" data-act="delete" title="Excluir" aria-label="Excluir">${icon('trash', 15)}</button>
      </td></tr>`).join('');
    tableEl.innerHTML = `<table><thead><tr><th>ID</th>${head}<th class="num">Ações</th></tr></thead><tbody>${body || `<tr><td colspan="${p.columns.length + 2}" class="muted" style="text-align:center;padding:30px">Nenhum registro encontrado.</td></tr>`}</tbody></table>`;
    footEl.textContent = `${rows.length} registro(s)`;
  }

  async function load() {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    try {
      rows = await api(slug, 'GET', p.resource + (query ? `?${query}` : ''));
      offlineEl.innerHTML = '';
      drawTable();
    } catch (error) {
      if (error.network) {
        rows = [];
        drawTable();
        offlineEl.innerHTML = `<div class="offline">${icon('alert', 22)}<div><b>API de ${esc(p.title)} indisponível</b>${esc(error.message)}. Os demais módulos continuam funcionando.
          <div style="margin-top:8px"><button class="btn sm" data-refresh>${icon('refresh', 14)} Tentar novamente</button></div></div></div>`;
      } else {
        toast(`Erro ${error.status}`, { type: 'error', detail: error.message });
      }
    }
  }

  function openForm({ title, fields, values = {}, buttons, submit }) {
    const modal = openModal({
      title,
      body: `<form id="crud-form" novalidate><div class="form-grid">${fields.map((f) => fieldHtml(f, values[f.name])).join('')}</div></form>`,
      footer: `<button class="btn" data-cancel>Cancelar</button>${buttons.map((b, i) => `<button class="btn ${b.cls || 'primary'}" data-submit="${i}">${esc(b.label)}</button>`).join('')}`,
    });
    const form = modal.el.querySelector('#crud-form');
    const run = async (button) => {
      modal.setError();
      const all = [...modal.el.querySelectorAll('[data-submit]')];
      all.forEach((b) => { b.disabled = true; });
      try {
        await submit({ ...collect(form, fields), ...(button.extra || {}) });
        modal.close();
        await load();
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        modal.setError(error.status, error.message);
        toast(error.network ? 'Sem conexão' : `Erro ${error.status}`, { type: 'error', detail: error.message });
      } finally {
        all.forEach((b) => { b.disabled = false; });
      }
    };
    modal.el.querySelector('[data-cancel]').addEventListener('click', modal.close);
    modal.el.querySelectorAll('[data-submit]').forEach((el, i) => el.addEventListener('click', () => run(buttons[i])));
    form.addEventListener('submit', (event) => { event.preventDefault(); run(buttons[0]); });
  }

  const byId = (id) => rows.find((r) => r.id === id);

  async function onAction(act, row, index) {
    if (act === 'edit') {
      openForm({
        title: `Editar ${p.noun}`, fields: p.fields, values: row,
        buttons: [{ label: 'Salvar alterações', cls: 'primary' }],
        submit: async (body) => { await api(slug, 'PUT', `${p.resource}/${row.id}`, body); toast('Alterações salvas'); },
      });
      return;
    }
    if (act === 'delete') {
      const ok = await confirmDialog({ title: `Excluir ${p.noun}`, message: `Deseja excluir o registro #${row.id}?`, confirmLabel: 'Excluir', danger: true });
      if (!ok) return;
      try { await api(slug, 'DELETE', `${p.resource}/${row.id}`); toast(`Registro #${row.id} excluído`); await load(); } catch (error) {
        toast(error.network ? 'Sem conexão' : `Erro ${error.status}`, { type: 'error', detail: error.message });
      }
      return;
    }
    const action = p.rowActions[index];
    if (action.form) {
      openForm({
        title: `${action.form.title}: ${row.codigo ?? '#' + row.id}`, fields: action.form.fields,
        buttons: [{ label: action.title, cls: 'primary' }],
        submit: async (body) => { await api(slug, action.method, action.path(row), body); toast(action.title); },
      });
      return;
    }
    try { await api(slug, action.method, action.path(row)); toast(action.title, { detail: `Registro #${row.id}` }); await load(); } catch (error) {
      toast(error.network ? 'Sem conexão' : `Erro ${error.status}`, { type: 'error', detail: error.message });
    }
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-refresh')) return void load();
    if (button.hasAttribute('data-new')) {
      return openForm({
        title: p.newLabel, fields: p.fields,
        buttons: p.createButtons || [{ label: 'Salvar', cls: 'primary' }],
        submit: async (body) => { await api(slug, 'POST', p.resource, body); toast(`${p.title}: registro criado`); },
      });
    }
    const act = button.getAttribute('data-act');
    if (!act) return;
    const row = byId(Number(button.closest('tr').dataset.id));
    if (row) onAction(act, row, Number(button.dataset.i));
  });

  const reload = debounce(load, 300);
  root.querySelectorAll('[data-param]').forEach((el) => {
    el.addEventListener(el.type === 'search' ? 'input' : 'change', () => { params[el.dataset.param] = el.value.trim(); reload(); });
  });

  load();
  return { reload: load };
}
