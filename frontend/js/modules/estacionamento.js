import { esc } from '../util.js';
import { makeModule } from './shared.js';

export default makeModule({
  slug: 'estacionamento', resource: '/vagas', title: 'Estacionamento', subtitle: 'Gestão de vagas e ocupação',
  noun: 'vaga', newLabel: 'Nova vaga', listTitle: 'Últimas vagas',
  bigKey: 'percentual', bigUnit: '%', bigLabel: 'Ocupação do estacionamento', bigSub: 'das vagas estão ocupadas',
  statusColors: { livre: 'green', ocupada: 'red' }, statusHint: 'livre ou ocupada',
  itemTitle: (i) => `Vaga ${i.codigo}`, itemSub: (i) => (i.apartamento ? `Apto ${i.apartamento}` : 'Disponível'),
  columns: [
    { label: 'Vaga', cell: (r) => `<b>${esc(r.codigo)}</b>` },
    { label: 'Apto', cell: (r) => esc(r.apartamento || '-') },
  ],
  fields: [
    { name: 'codigo', label: 'Identificação da vaga', type: 'text', placeholder: 'Ex.: A-01' },
    { name: 'apartamento', label: 'Apartamento', type: 'text' },
  ],
});
