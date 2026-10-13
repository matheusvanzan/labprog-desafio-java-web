import { esc } from '../util.js';
import { makeModule } from './shared.js';

export default makeModule({
  slug: 'comunicados', resource: '/comunicados', title: 'Comunicados', subtitle: 'Publicação de avisos do condomínio',
  noun: 'comunicado', newLabel: 'Publicar comunicado', listTitle: 'Últimos comunicados',
  bigKey: 'ativos', bigLabel: 'Comunicados ativos', bigSub: 'avisos em vigor',
  statusColors: { ativo: 'green', arquivado: 'slate' }, statusHint: 'ativo ou arquivado',
  itemTitle: (i) => i.titulo, itemSub: (i) => i.categoria,
  columns: [
    { label: 'Título', cell: (r) => `<b>${esc(r.titulo)}</b>` },
    { label: 'Categoria', cell: (r) => esc(r.categoria) },
  ],
  fields: [
    { name: 'titulo', label: 'Título', type: 'text', full: true },
    { name: 'categoria', label: 'Categoria', type: 'text', placeholder: 'Ex.: manutencao' },
  ],
});
