'use strict';
/**
 * Servidor do CondoVida: serve o frontend estatico e guarda, de forma
 * compartilhada, a URL base de cada uma das seis APIs.
 * Sem dependencias externas (apenas Node.js 18+).
 *
 *   GET    /api/config            lista os seis servicos: url (desenvolvimento) e prod_url (producao)
 *   PUT    /api/config/:id        { "url": "http://..." } salva a URL de desenvolvimento de UM servico
 *   DELETE /api/config/:id        volta ao endereco padrao
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 8000;
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');
const DATA_DIR = path.resolve(process.env.CONFIG_DIR || path.join(__dirname, 'data'));
const DATA_FILE = path.join(DATA_DIR, 'config.json');
const PROD_BASE_PORT = Number(process.env.PROD_BASE_PORT) || 5001;   // producao (fixa)
const DEV_BASE_PORT = Number(process.env.DEV_BASE_PORT) || 6001;     // desenvolvimento (configuravel em /config)

const SERVICES = [
  { id: 1, slug: 'visitantes', name: 'Visitantes' },
  { id: 2, slug: 'encomendas', name: 'Encomendas' },
  { id: 3, slug: 'reservas', name: 'Reservas' },
  { id: 4, slug: 'ocorrencias', name: 'Ocorrências' },
  { id: 5, slug: 'comunicados', name: 'Comunicados' },
  { id: 6, slug: 'estacionamento', name: 'Estacionamento' },
];

const PAGES = new Set(['/', '/config', '/dev', ...SERVICES.map((s) => `/${s.slug}`), ...SERVICES.map((s) => `/dev/${s.slug}`)]);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

// Os enderecos padrao usam o host pelo qual a UI foi aberta (localhost ou o IP do professor na rede),
// para que os alunos, abrindo a UI pelo IP, alcancem as APIs do computador do professor.
const hostOf = (req) => (req.headers.host || 'localhost').replace(/:\d+$/, '') || 'localhost';
const defaultUrl = (id, host) => `http://${host}:${DEV_BASE_PORT + id - 1}`;
const prodUrl = (id, host) => `http://${host}:${PROD_BASE_PORT + id - 1}`;

function readOverrides() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Grava de forma atomica: arquivo temporario + rename. */
function writeOverrides(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

function publicConfig(host) {
  const overrides = readOverrides();
  return SERVICES.map((s) => ({
    id: s.id, slug: s.slug, name: s.name,
    url: overrides[s.id] || defaultUrl(s.id, host),           // desenvolvimento
    prod_url: prodUrl(s.id, host),                            // producao (nao editavel)
    default_url: defaultUrl(s.id, host),
    customized: Boolean(overrides[s.id]),
  }));
}

function normalizeUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'O campo "url" é obrigatório.' };
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return { error: 'URL inválida. Exemplo: http://192.168.0.10:8080' };
  }
  if (!['http:', 'https:'].includes(url.protocol)) return { error: 'A URL deve começar com http:// ou https://.' };
  if (url.username || url.password) return { error: 'A URL não pode conter usuário ou senha.' };
  if (url.search || url.hash || !['', '/'].includes(url.pathname)) {
    return { error: 'Informe apenas a URL base (sem caminho como /health, /visitantes ou parâmetros).' };
  }
  return { url: url.origin };
}

function sendJson(res, status, payload) {
  const body = status === 204 ? '' : JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 10_000) req.destroy();
      else chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/config' && req.method === 'GET') return sendJson(res, 200, publicConfig(hostOf(req)));
  const match = pathname.match(/^\/api\/config\/(\d+)$/);
  if (!match) return sendJson(res, 404, { error: 'Rota não encontrada.' });
  const id = Number(match[1]);
  if (!SERVICES.some((s) => s.id === id)) return sendJson(res, 404, { error: 'Serviço não encontrado.' });

  if (req.method === 'PUT') {
    const payload = await readBody(req);
    if (payload === null || typeof payload !== 'object') return sendJson(res, 400, { error: 'JSON inválido.' });
    const { url, error } = normalizeUrl(payload.url);
    if (error) return sendJson(res, 400, { error });
    // Leitura + escrita sincronas: nenhuma outra requisicao intercala, e so a chave deste servico muda.
    const overrides = readOverrides();
    overrides[id] = url;
    writeOverrides(overrides);
    return sendJson(res, 200, publicConfig(hostOf(req)).find((s) => s.id === id));
  }
  if (req.method === 'DELETE') {
    const overrides = readOverrides();
    delete overrides[id];
    writeOverrides(overrides);
    return sendJson(res, 200, publicConfig(hostOf(req)).find((s) => s.id === id));
  }
  return sendJson(res, 405, { error: 'Método não permitido.' });
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Não encontrado');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end();
  }
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PAGES.has(clean)) return serveFile(res, path.join(FRONTEND_DIR, 'index.html'));
  const file = path.resolve(FRONTEND_DIR, '.' + decodeURIComponent(clean));
  if (!file.startsWith(FRONTEND_DIR + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  return serveFile(res, file);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CondoVida em http://localhost:${PORT}  (config: http://localhost:${PORT}/config)`);
});
