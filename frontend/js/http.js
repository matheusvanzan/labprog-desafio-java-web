// Cliente HTTP unico do frontend: toda chamada as APIs passa por aqui.
// Nenhuma informacao sobre as requisicoes e exibida na interface: para descobrir
// como a API funciona, o aluno deve usar a aba Network do navegador.

export const SERVICES = [
  { id: 1, slug: 'visitantes', name: 'Visitantes', icon: 'users', color: 'blue' },
  { id: 2, slug: 'encomendas', name: 'Encomendas', icon: 'package', color: 'amber' },
  { id: 3, slug: 'reservas', name: 'Reservas', icon: 'calendar', color: 'violet' },
  { id: 4, slug: 'ocorrencias', name: 'Ocorrências', icon: 'alert', color: 'red' },
  { id: 5, slug: 'comunicados', name: 'Comunicados', icon: 'megaphone', color: 'teal' },
  { id: 6, slug: 'estacionamento', name: 'Estacionamento', icon: 'car', color: 'green' },
];
export const serviceBySlug = (slug) => SERVICES.find((s) => s.slug === slug);

// Ambiente da tela: desenvolvimento em "/dev" e "/config"; producao no restante.
export const DEV = location.pathname === '/config' || location.pathname.startsWith('/dev');

const TIMEOUT_MS = 8000;
const devUrls = {};
const prodUrls = {};
const health = {};
const configListeners = new Set();
const healthListeners = new Set();

export class ApiError extends Error {
  constructor(message, { status = 0, network = false } = {}) {
    super(message);
    this.status = status;
    this.network = network;
  }
}

export const getUrl = (slug) => (DEV ? devUrls[slug] : prodUrls[slug]) || '';
export const getHealth = (slug) => health[slug] || 'unknown';
export const onConfigChange = (fn) => (configListeners.add(fn), () => configListeners.delete(fn));
export const onHealth = (fn) => (healthListeners.add(fn), () => healthListeners.delete(fn));

/** Le a configuracao do servidor. Avisa os ouvintes quando a URL de algum servico mudou. */
let attempted = false;
export async function loadConfig() {
  const first = !attempted;
  attempted = true;
  const response = await fetch('/api/config', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const list = await response.json();
  const changed = [];
  for (const item of list) {
    if (DEV && !first && devUrls[item.slug] !== item.url) changed.push(item.slug);
    devUrls[item.slug] = item.url;
    prodUrls[item.slug] = item.prod_url;
  }
  if (changed.length) configListeners.forEach((fn) => fn(changed));
  return list;
}

export async function api(slug, method, path, payload) {
  const base = getUrl(slug);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const options = { method, signal: controller.signal, headers: {} };
    if (payload !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }
    const response = await fetch(`${base}${path}`, options);
    const raw = await response.text();
    let parsed = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch { parsed = raw; }
    }
    health[slug] = 'ok';
    if (!response.ok) {
      throw new ApiError(`A API respondeu com erro ${response.status}`, { status: response.status });
    }
    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    health[slug] = 'err';
    const message = error.name === 'AbortError'
      ? 'A API demorou demais para responder'
      : 'Sem conexão com a API (fora do ar, URL incorreta ou bloqueio de CORS)';
    throw new ApiError(message, { network: true });
  } finally {
    clearTimeout(timer);
    healthListeners.forEach((fn) => fn());
  }
}

/** Teste de conexao da pagina /config. */
export async function probe(baseUrl) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { ok: true, ms: Math.round(performance.now() - started) };
  } catch (error) {
    return { ok: false, error: error.name === 'AbortError' ? 'Tempo esgotado' : 'sem resposta' };
  } finally {
    clearTimeout(timer);
  }
}
