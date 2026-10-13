import { esc } from '../util.js';
import { makeModule } from './shared.js';

export default makeModule({
  slug: 'visitantes', resource: '/visitantes', title: 'Visitantes', subtitle: 'Controle de visitantes e acessos',
  noun: 'visitante', newLabel: 'Registrar visitante', listTitle: 'Últimos registros',
  bigKey: 'presentes', bigLabel: 'Visitantes presentes', bigSub: 'visitantes no condomínio agora',
  statusColors: { presente: 'green', saiu: 'slate' }, statusHint: 'presente ou saiu',
  itemTitle: (i) => i.nome, itemSub: (i) => `Apto ${i.apartamento}`,
  columns: [
    { label: 'Nome', cell: (r) => `<b>${esc(r.nome)}</b>` },
    { label: 'Apto', cell: (r) => esc(r.apartamento) },
  ],
  fields: [
    { name: 'nome', label: 'Nome', type: 'text', full: true },
    { name: 'apartamento', label: 'Apartamento', type: 'text' },
  ],
});
