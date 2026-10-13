import { esc } from '../util.js';
import { makeModule } from './shared.js';

export default makeModule({
  slug: 'ocorrencias', resource: '/ocorrencias', title: 'Ocorrências', subtitle: 'Registro e acompanhamento de ocorrências',
  noun: 'ocorrência', newLabel: 'Registrar ocorrência', listTitle: 'Últimas ocorrências',
  bigKey: 'abertas', bigLabel: 'Ocorrências abertas', bigSub: 'aguardando solução',
  statusColors: { aberta: 'amber', resolvida: 'green' }, statusHint: 'aberta ou resolvida',
  itemTitle: (i) => i.titulo, itemSub: (i) => `Apto ${i.apartamento}`,
  columns: [
    { label: 'Título', cell: (r) => `<b>${esc(r.titulo)}</b>` },
    { label: 'Apto', cell: (r) => esc(r.apartamento) },
  ],
  fields: [
    { name: 'titulo', label: 'Título', type: 'text', full: true },
    { name: 'apartamento', label: 'Apartamento', type: 'text' },
  ],
});
