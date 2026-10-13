import { esc } from '../util.js';
import { makeModule } from './shared.js';

export default makeModule({
  slug: 'reservas', resource: '/reservas', title: 'Reservas', subtitle: 'Reservas de espaços comuns',
  noun: 'reserva', newLabel: 'Nova reserva', listTitle: 'Últimas reservas',
  bigKey: 'confirmadas', bigLabel: 'Reservas confirmadas', bigSub: 'espaços reservados',
  statusColors: { confirmada: 'green', cancelada: 'slate' }, statusHint: 'confirmada ou cancelada',
  itemTitle: (i) => `${i.espaco} · Apto ${i.apartamento}`, itemSub: (i) => i.data,
  columns: [
    { label: 'Espaço', cell: (r) => `<b>${esc(r.espaco)}</b>` },
    { label: 'Apto', cell: (r) => esc(r.apartamento) },
    { label: 'Data', cell: (r) => esc(r.data) },
  ],
  fields: [
    { name: 'espaco', label: 'Espaço', type: 'text', full: true, placeholder: 'Ex.: Churrasqueira' },
    { name: 'apartamento', label: 'Apartamento', type: 'text' },
    { name: 'data', label: 'Data', type: 'text', placeholder: 'AAAA-MM-DD' },
  ],
});
