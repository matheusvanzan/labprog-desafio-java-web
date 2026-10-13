// Pagina /config: uma URL base por microservico, persistida no servidor (server/data/config.json).
import { SERVICES, loadConfig, probe } from './http.js';
import { icon } from './icons.js';
import { esc } from './util.js';
import { toast } from './ui.js';

const DEFAULT_HINT = (id) => `http://127.0.0.1:${6000 + id}`;

export async function renderConfig(root) {
  root.innerHTML = `<p class="muted" style="margin-bottom:16px;max-width:760px">Cada grupo substitui apenas a URL do <b>seu</b> microserviço.
    Informe a URL base da API (por exemplo <code>http://192.168.0.20:8080</code>), sem caminhos como <code>/health</code>.
    A alteração vale para todos que estiverem usando o painel.</p><div class="cfg-list" id="cfg-list"></div>`;
  const list = root.querySelector('#cfg-list');
  let configs;
  try {
    configs = await loadConfig();
  } catch (error) {
    list.innerHTML = `<div class="offline">${icon('alert', 22)}<div><b>Servidor de configuração indisponível</b>${esc(error.message)}</div></div>`;
    return;
  }

  list.innerHTML = configs.map((c) => {
    const s = SERVICES.find((x) => x.id === c.id);
    return `<div class="card cfg" data-id="${c.id}">
      <div class="cfg-head"><div class="ico-box c-${s.color}">${icon(s.icon, 17)}</div>
        <h3>Grupo ${c.id} · ${esc(c.name)}</h3>
        <span class="conn" data-conn><i></i><span>Não testada</span></span></div>
      <div class="cfg-row">
        <input class="input" data-url value="${esc(c.url)}" placeholder="${esc(DEFAULT_HINT(c.id))}" spellcheck="false" aria-label="URL base do grupo ${c.id}">
        <button class="btn" data-test>${icon('wifi', 15)} Testar</button>
        <button class="btn primary" data-save>${icon('save', 15)} Salvar</button>
        <button class="btn" data-reset title="Voltar para o endereço padrão (${esc(c.default_url)})">${icon('undo', 15)} Padrão</button>
      </div>
      <div class="cfg-msg" data-msg>${c.customized ? 'URL personalizada.' : `Usando o endereço padrão (${esc(c.default_url)}).`}</div>
    </div>`;
  }).join('');

  const card = (el) => el.closest('.cfg');
  const setConn = (cardEl, state, text) => {
    const conn = cardEl.querySelector('[data-conn]');
    conn.className = `conn ${state}`;
    conn.querySelector('span').textContent = text;
  };
  const setMsg = (cardEl, text, kind = '') => {
    const msg = cardEl.querySelector('[data-msg]');
    msg.textContent = text;
    msg.className = `cfg-msg ${kind}`;
  };

  async function test(cardEl) {
    const url = cardEl.querySelector('[data-url]').value.trim().replace(/\/+$/, '');
    setConn(cardEl, 'wait', 'Testando...');
    const result = await probe(url);
    if (result.ok) setConn(cardEl, 'ok', `Conectado · ${result.ms} ms`);
    else setConn(cardEl, 'err', 'Sem conexão');
    return result;
  }

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const cardEl = card(button);
    const id = Number(cardEl.dataset.id);
    if (button.hasAttribute('data-test')) {
      const result = await test(cardEl);
      setMsg(cardEl, result.ok ? 'A API respondeu em /health.' : `Falha no teste: ${result.error}`, result.ok ? 'ok' : 'err');
    }
    if (button.hasAttribute('data-save') || button.hasAttribute('data-reset')) {
      const reset = button.hasAttribute('data-reset');
      const input = cardEl.querySelector('[data-url]');
      const response = await fetch(`/api/config/${id}`, reset
        ? { method: 'DELETE' }
        : { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: input.value }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMsg(cardEl, data.error || `Erro HTTP ${response.status}`, 'err');
        return;
      }
      input.value = data.url;
      setMsg(cardEl, reset ? 'URL restaurada para o endereço padrão.' : 'URL salva no servidor.', 'ok');
      toast(reset ? 'URL restaurada' : 'URL salva', { detail: `Grupo ${id} · ${data.url}` });
      await loadConfig();
      test(cardEl);
    }
  });
  list.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('[data-url]')) card(event.target).querySelector('[data-save]').click();
  });

  list.querySelectorAll('.cfg').forEach((c) => test(c));
}
