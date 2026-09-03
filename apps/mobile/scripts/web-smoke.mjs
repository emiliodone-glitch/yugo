#!/usr/bin/env node
/**
 * La app real, en un navegador real, sin simulaciones.
 *
 * Jest monta cada pantalla con los módulos nativos simulados. Esto es lo
 * siguiente más cercano a un teléfono que se puede correr sin uno: el bundle
 * que produce Metro (el mismo que va al APK, compilado para web con React
 * Native Web) se abre en Chromium con viewport de teléfono, se recorren todas
 * las rutas y se hace un flujo completo con toques —entrar, leer el devocional,
 * Descubrir, guardar, afinidad, interés, Conexiones, chat, enviar un mensaje,
 * las cinco pestañas—. Falla si cualquier ruta lanza un error de JavaScript,
 * imprime console.error o queda en blanco.
 *
 * Lo que sí prueba: expo-router de verdad, React Query, los stores, cada
 * pantalla con datos de demo y las interacciones principales.
 * Lo que no prueba: la capa nativa (permisos, cámara, SecureStore, Hermes en
 * ARM). Eso solo lo da el APK en un dispositivo.
 *
 *   Uso:  pnpm --filter @yugo/mobile test:web
 *
 * Necesita Chromium de Playwright (lo instala `pnpm --filter @yugo/web exec
 * playwright install chromium`). Si el binario está en otra ruta, pásala en
 * YUGO_CHROMIUM. Deja capturas de cada paso en .web-smoke/.
 */
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, '..');
const repoRoot = path.resolve(mobileRoot, '..', '..');
const requireFromWeb = createRequire(path.join(repoRoot, 'apps', 'web', 'package.json'));
const { chromium } = requireFromWeb('@playwright/test');
const fx = createRequire(import.meta.url)('@yugo/shared');

const EXPORT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'yugo-web-'));
const SHOTS = path.join(mobileRoot, '.web-smoke');
const PORT = Number(process.env.YUGO_WEB_SMOKE_PORT ?? 3311);

fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

console.log('Exportando la app para web en modo demo…');
execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', EXPORT_DIR], {
  cwd: mobileRoot,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: { ...process.env, CI: '1', EXPO_PUBLIC_DEMO_MODE: 'true' },
});

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.ico': 'image/x-icon',
};

// SPA: cualquier ruta sin archivo devuelve index.html, como lo sirve expo-router.
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(EXPORT_DIR, url);
  if (!file.startsWith(EXPORT_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(EXPORT_DIR, 'index.html');
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(PORT, resolve));

const ROUTES = [
  '/', '/entrar', '/registro', '/recuperar',
  '/inicio', '/descubrir', '/conexiones', '/comunidad', '/eventos',
  `/afinidad/${fx.demoDiscover[0].userId}`,
  `/chat/${fx.demoConnections[0].matchId}`,
  `/comunidad/${fx.demoGroups[0].id}`,
  `/eventos/${fx.demoEvents[0].id}`,
  '/descubrir/guardados', '/descubrir/te-interesa',
  '/devocional', '/oracion', '/historias', '/legal/pacto', '/plus',
  '/perfil', '/perfil/acompanar', '/perfil/destacar', '/perfil/fotos', '/perfil/notificaciones',
  '/perfil/preferencias', '/perfil/privacidad', '/perfil/promo', '/perfil/verificacion', '/perfil/visibilidad',
  '/ruta-que-no-existe',
];

const browser = await chromium.launch(
  process.env.YUGO_CHROMIUM ? { executablePath: process.env.YUGO_CHROMIUM } : {},
);
const page = await browser.newPage({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-DO',
  timezoneId: 'America/Santo_Domingo',
});

const problems = [];
let current = '';
page.on('pageerror', (e) => problems.push({ where: current, kind: 'pageerror', text: String(e.message ?? e).slice(0, 300) }));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push({ where: current, kind: 'console.error', text: m.text().slice(0, 300) });
});

const rows = [];
const bodyText = async () => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
const record = async (label) => {
  const text = await bodyText();
  rows.push({ paso: label, termina_en: new URL(page.url()).pathname, texto: text.length, errores: problems.filter((p) => p.where === label).length });
  const base = path.join(SHOTS, `${String(rows.length).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '_')}`);
  await page.screenshot({ path: `${base}.png` });
  fs.writeFileSync(`${base}.txt`, text);
  return text;
};

for (const route of ROUTES) {
  current = route;
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await record(route);
}

// Un flujo con toques, no solo aterrizajes. Las pestañas visitadas siguen
// montadas detrás de la activa, así que solo se tocan elementos visibles.
const vis = (text, exact = false) => page.getByText(text, { exact }).locator('visible=true');
const step = async (label, fn) => {
  current = `flujo: ${label}`;
  await fn();
  await page.waitForTimeout(1200);
  return record(current);
};
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await step('bienvenida → entrar', () => vis('Ya tengo cuenta').first().click());
await step('entrar con la demo', async () => {
  await page.getByPlaceholder('Correo o teléfono').fill('demo1@yugo.do');
  await page.getByPlaceholder('Contraseña').fill('Yugo.demo1');
  await vis('Continuar', true).first().click();
  await page.waitForTimeout(1500);
});
const afterRead = await step('marcar el devocional como leído', () => vis('Ya lo leí').first().click());
if (afterRead.includes('Ya lo leí')) {
  problems.push({ where: 'flujo', kind: 'estado', text: 'el devocional siguió ofreciendo «Ya lo leí» después de tocarlo' });
}
await step('pestaña Descubrir', () => vis('Descubrir', true).last().click());
await step('guardar para después', () => vis('Guardar para después').first().click());
await step('abrir afinidad de fe', () => vis('Afinidad de fe').first().click());
await step('volver atrás', () => page.goBack());
await step('marcar interés', () => vis('Me interesa').first().click());
await step('pestaña Conexiones', () => vis('Conexiones', true).last().click());
await step('abrir el primer chat', () => vis(fx.demoConnections[0].otherUser.displayName, true).first().click());
await step('enviar un mensaje', async () => {
  await page.getByPlaceholder('Escribe un mensaje…').fill('Hola, ¿cómo estuvo tu semana?');
  await vis('Enviar', true).first().click();
});
await step('pestaña Eventos', async () => {
  await page.goBack();
  await page.waitForTimeout(600);
  await vis('Eventos', true).last().click();
});
await step('pestaña Comunidad', () => vis('Comunidad', true).last().click());
await step('pestaña Inicio', () => vis('Inicio', true).last().click());

await browser.close();
server.close();
fs.rmSync(EXPORT_DIR, { recursive: true, force: true });

console.table(rows);
const blank = rows.filter((r) => r.texto < 20);
if (problems.length || blank.length) {
  console.log('\nPROBLEMAS');
  for (const p of problems) console.log(` ${p.where} [${p.kind}] ${p.text}`);
  for (const b of blank) console.log(` ${b.paso} quedó en blanco`);
  process.exit(1);
}
console.log(`\n${rows.length} pasos en Chromium móvil sin errores de JavaScript ni pantallas en blanco. Capturas en ${path.relative(repoRoot, SHOTS)}/`);
