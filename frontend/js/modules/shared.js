// Monta um módulo a partir de uma descrição simples. Cada serviço expõe apenas:
//   GET /recurso, POST /recurso, PUT /recurso/{id}, DELETE /recurso/{id} e GET /recurso/resumo.
import { api } from '../http.js';
import { badge } from '../ui.js';
import { esc } from '../util.js';

export function recentList(items, empty = 'Nenhum registro.') {
  if (!items.length) return `<p class="muted" style="padding:10px 0">${esc(empty)}</p>`;
  return `<ul class="recent">${items.map((i) => `
    <li>
      <div class="who"><b title="${esc(i.title)}">${esc(i.title)}</b><span>${esc(i.sub || '')}</span></div>
      <div class="when">${i.badge || ''}</div>
    </li>`).join('')}</ul>`;
}

export function bigNumber(value, unit, caption) {
  return `<div class="bignum"><div class="bignum-value">${esc(value)}<small>${esc(unit)}</small></div><div class="bignum-caption">${esc(caption)}</div></div>`;
}

export function chartBlock(title, html) {
  return `<div><div class="chart-title">${esc(title)}</div>${html}</div>`;
}

/** Últimos registros da listagem (maiores ids primeiro): apenas apresentação. */
export const latest = (lista, count = 5) => [...lista].reverse().slice(0, count);

export function makeModule(cfg) {
  const statusBadge = (s) => badge(s || '-', cfg.statusColors[s] || 'slate');
  const unit = cfg.bigUnit || '';
  return {
    slug: cfg.slug,

    async load() {
      const [resumo, lista] = await Promise.all([
        api(cfg.slug, 'GET', `${cfg.resource}/resumo`),
        api(cfg.slug, 'GET', cfg.resource),
      ]);
      return { resumo, lista };
    },

    kpi: ({ resumo }) => ({ label: cfg.bigLabel, value: resumo[cfg.bigKey], unit, sub: esc(cfg.bigSub) }),

    panel: ({ lista }) => recentList(latest(lista).map((i) => ({
      title: cfg.itemTitle(i), sub: cfg.itemSub(i), badge: statusBadge(i.status),
    }))),

    page: {
      title: cfg.title, subtitle: cfg.subtitle, resource: cfg.resource, noun: cfg.noun, newLabel: cfg.newLabel,
      columns: [...cfg.columns, { label: 'Status', cell: (r) => statusBadge(r.status) }],
      filters: [],
      fields: [...cfg.fields, { name: 'status', label: 'Status', type: 'text', placeholder: cfg.statusHint }],
      rowActions: [],
    },
  };
}
