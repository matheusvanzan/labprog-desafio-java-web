import { $, esc } from './util.js';
import { icon } from './icons.js';

export function badge(text, color = 'slate') {
  return `<span class="badge b-${color}">${esc(text)}</span>`;
}

export function toast(title, { type = 'ok', detail = '' } = {}) {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : ''}`;
  el.innerHTML = `<div><b>${esc(title)}</b>${detail ? `<span>${esc(detail)}</span>` : ''}</div>`;
  $('#toast-root').append(el);
  setTimeout(() => el.remove(), type === 'error' ? 7000 : 3500);
}

/**
 * Abre um modal. Retorna { el, close, setError }.
 * footer: HTML dos botoes; o chamador liga os eventos em `el`.
 */
export function openModal({ title, body, footer = '', onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h2>${esc(title)}</h2><button class="btn icon sm" data-close aria-label="Fechar">${icon('x', 16)}</button></div>
    <div class="modal-body">${body}</div>
    ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
  </div>`;
  $('#modal-root').append(backdrop);
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (event) => { if (event.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('mousedown', (event) => { if (event.target === backdrop) close(); });
  backdrop.querySelector('[data-close]').addEventListener('click', close);
  const first = backdrop.querySelector('input, select, textarea');
  first?.focus();
  const setError = (status, message) => {
    let box = backdrop.querySelector('.form-error');
    if (!message) { box?.remove(); return; }
    if (!box) {
      box = document.createElement('div');
      box.className = 'form-error';
      backdrop.querySelector('.modal-body').prepend(box);
    }
    box.innerHTML = `${icon('alert', 16)}<div>${status ? `<code>HTTP ${status}</code> · ` : ''}${esc(message)}</div>`;
  };
  return { el: backdrop, close, setError };
}

export function confirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    const modal = openModal({
      title, body: `<p>${esc(message)}</p>`,
      footer: `<button class="btn" data-no>Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(confirmLabel)}</button>`,
      onClose: () => resolve(false),
    });
    modal.el.querySelector('[data-no]').addEventListener('click', () => modal.close());
    modal.el.querySelector('[data-yes]').addEventListener('click', () => {
      modal.el.remove();
      resolve(true);
    });
  });
}

export function stateBlock(kind, title, detail = '', action = '') {
  const ico = kind === 'error' ? 'alert' : 'inbox';
  return `<div class="state ${kind}"><div class="ico-box c-slate">${icon(ico, 20)}</div><b>${esc(title)}</b><span>${detail}</span>${action}</div>`;
}

export function skeleton(lines = 4) {
  return `<div style="display:grid;gap:10px">${Array.from({ length: lines }, (_, i) => `<div class="skeleton" style="height:${i === 0 ? 52 : 18}px"></div>`).join('')}</div>`;
}
