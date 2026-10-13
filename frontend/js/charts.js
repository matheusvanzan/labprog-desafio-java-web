// Graficos em SVG/HTML puro (sem bibliotecas), alimentados apenas pelos dados das APIs.
import { esc } from './util.js';

export const COLORS = {
  blue: '#2f6df6', amber: '#e59a12', violet: '#7054e8', red: '#dc3b45', teal: '#0e9aa7',
  green: '#12a15a', slate: '#8a97ad', track: '#e9edf5',
};

/** Barras verticais. data: [{label, value, tip?}] */
export function barChart(data, { color = COLORS.blue, labelEvery = 2, height = 118, highlight = null } = {}) {
  const n = data.length;
  const slot = Math.max(22, Math.round(340 / n));
  const width = n * slot;
  const top = 8;
  const base = height - 20;
  const max = Math.max(1, ...data.map((d) => d.value));
  const scaleMax = Math.max(max, 3);
  const bars = data.map((d, i) => {
    const h = Math.round(((base - top) * d.value) / scaleMax);
    const bw = Math.min(slot - 8, 34);
    const x = i * slot + (slot - bw) / 2;
    const fill = d.color || (highlight !== null && d.key === highlight ? COLORS.green : color);
    const rect = d.value > 0
      ? `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="4" fill="${fill}"><title>${esc(d.tip || `${d.label}: ${d.value}`)}</title></rect>
         <text x="${x + bw / 2}" y="${base - h - 3}" text-anchor="middle" font-size="9" font-weight="700" fill="#3c4a63">${d.value}</text>`
      : `<rect x="${x}" y="${base - 2}" width="${bw}" height="2" rx="1" fill="${COLORS.track}"><title>${esc(d.tip || `${d.label}: 0`)}</title></rect>`;
    const label = i % labelEvery === 0
      ? `<text x="${x + bw / 2}" y="${height - 5}" text-anchor="middle" font-size="9" fill="#6b7890">${esc(d.label)}</text>` : '';
    return rect + label;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" style="display:block;overflow:visible">
    <line x1="0" x2="${width}" y1="${base}" y2="${base}" stroke="${COLORS.track}"/>
    <line x1="0" x2="${width}" y1="${top + (base - top) / 2}" y2="${top + (base - top) / 2}" stroke="#f1f4f9" stroke-dasharray="3 3"/>
    ${bars}</svg>`;
}

/** Rosca. segments: [{label, value, color}] */
export function donut(segments, { size = 124, thickness = 15, center = '', sub = '' } = {}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  const arcs = total === 0 ? '' : segments.filter((s) => s.value > 0).map((s) => {
    const len = (s.value / total) * c;
    const gap = segments.filter((x) => x.value > 0).length > 1 ? 2 : 0;
    const arc = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${thickness}"
      stroke-dasharray="${Math.max(len - gap, 0.1)} ${c}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="butt"><title>${esc(s.label)}: ${s.value}</title></circle>`;
    offset += len;
    return arc;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${COLORS.track}" stroke-width="${thickness}"/>
    ${arcs}
    <text x="50%" y="${sub ? '48%' : '52%'}" text-anchor="middle" dominant-baseline="middle" font-size="22" font-weight="800" fill="#152033">${esc(center)}</text>
    ${sub ? `<text x="50%" y="66%" text-anchor="middle" font-size="10" fill="#6b7890">${esc(sub)}</text>` : ''}
  </svg>`;
}

export function legend(segments) {
  return `<div class="legend">${segments.map((s) => `<div><i style="background:${s.color}"></i>${esc(s.label)}<b>${esc(s.display ?? s.value)}</b></div>`).join('')}</div>`;
}

/** Barras horizontais. items: [{label, value, max, color, display}] */
export function hbars(items) {
  return `<div class="bars-h">${items.map((i) => {
    const pct = i.max > 0 ? Math.min(100, (i.value / i.max) * 100) : 0;
    return `<div class="bar-h"><span>${esc(i.label)}</span><div class="track"><div class="fill" style="width:${pct}%;background:${i.color}"></div></div><b>${esc(i.display ?? i.value)}</b></div>`;
  }).join('')}</div>`;
}
