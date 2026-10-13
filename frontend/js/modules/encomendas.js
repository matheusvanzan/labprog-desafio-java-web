import { esc } from '../util.js';
import { makeModule } from './shared.js';

export default makeModule({
  slug: 'encomendas', resource: '/encomendas', title: 'Encomendas', subtitle: 'Recebimento e retirada de encomendas',
  noun: 'encomenda', newLabel: 'Receber encomenda', listTitle: 'Últimas encomendas',
  bigKey: 'aguardando', bigLabel: 'Aguardando retirada', bigSub: 'encomendas na portaria',
  statusColors: { aguardando: 'amber', retirada: 'green' }, statusHint: 'aguardando ou retirada',
  itemTitle: (i) => i.destinatario, itemSub: (i) => `Apto ${i.apartamento}`,
  columns: [
    { label: 'Destinatário', cell: (r) => `<b>${esc(r.destinatario)}</b>` },
    { label: 'Apto', cell: (r) => esc(r.apartamento) },
  ],
  fields: [
    { name: 'destinatario', label: 'Destinatário', type: 'text', full: true },
    { name: 'apartamento', label: 'Apartamento', type: 'text' },
  ],
});
