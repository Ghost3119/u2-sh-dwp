// Script de capturas automatizadas con Playwright
// Requisito: backend corriendo en http://localhost:4000 y frontend en http://localhost:5173
//
// Ejecucion:
//   1) Levantar backend:  cd backend && npm run dev
//   2) Levantar frontend: cd frontend && npm run dev
//   3) Ejecutar:          node tests/screenshots/run-screenshots.mjs
//
// Las capturas se guardan en tests/screenshots/images/

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, 'images');

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

const VIEWPORT = { width: 1920, height: 1080 };
const SETTLE_MS = 500;

async function ensureServers() {
  console.log(`[check] backend  -> ${BACKEND}`);
  console.log(`[check] frontend -> ${FRONTEND}`);
  try {
    const r = await fetch(`${BACKEND}/`);
    if (!r.ok) throw new Error('backend no responde OK');
  } catch (e) {
    console.error(`\n[ERROR] El backend no responde en ${BACKEND}.`);
    console.error('Levanta el backend primero:  cd backend && npm run dev\n');
    process.exit(1);
  }
  try {
    const r = await fetch(FRONTEND);
    if (!r.ok) throw new Error('frontend no responde OK');
  } catch (e) {
    console.error(`\n[ERROR] El frontend no responde en ${FRONTEND}.`);
    console.error('Levanta el frontend primero:  cd frontend && npm run dev\n');
    process.exit(1);
  }
}

async function snap(page, name) {
  const file = path.join(OUT_DIR, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  [ok] ${name}`);
}

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });
  await ensureServers();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const log = [];
  page.on('console', (m) => log.push(`[${m.type()}] ${m.text()}`));

  console.log('\n=== Capturas del frontend (lo que SÍ existe) ===\n');

  // 01 - Landing publica
  await page.goto(FRONTEND, { waitUntil: 'networkidle' });
  await page.waitForSelector('#grid-productos .producto-card', { timeout: 10000 });
  await page.waitForTimeout(SETTLE_MS);
  await snap(page, '01-landing-publica.png');

  // 05 - Grid de productos (catalogo)
  await page.waitForSelector('.producto-card', { timeout: 5000 });
  await page.waitForTimeout(SETTLE_MS);
  await snap(page, '05-grid-productos.png');

  // 06 - Detalle de producto (panel lateral)
  await page.locator('.producto-card').first().click({ position: { x: 100, y: 50 } });
  await page.waitForSelector('#panel-detalle.visible', { timeout: 5000 });
  await page.waitForTimeout(600);
  await snap(page, '06-detalle-producto.png');

  // Cerrar panel detalle via JS (evita intercepts de clicks)
  await page.evaluate(() => {
    const btn = document.getElementById('btn-cerrar-detalle');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);

  // 07 - Carrito con items (agregar 2 productos via JS para evitar intercepts)
  await page.evaluate(() => {
    const cards = document.querySelectorAll('.producto-card [data-add]');
    if (cards.length >= 2) {
      cards[0].click();
    }
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const cards = document.querySelectorAll('.producto-card [data-add]');
    if (cards.length >= 2) {
      cards[1].click();
      cards[1].click();
    }
  });
  await page.waitForTimeout(500);

  // Abrir carrito
  await page.evaluate(() => {
    const c = document.getElementById('carrito-icono');
    if (c) c.click();
  });
  await page.waitForSelector('#panel-carrito.visible', { timeout: 5000 });
  await page.waitForTimeout(600);
  await snap(page, '07-carrito-con-items.png');

  // 12 - Validacion frontend (intentar submitir form invalido)
  // El frontend real no tiene form de login, pero podemos demostrar validacion
  // con el input del buscador vacio + filtrar
  await page.evaluate(() => {
    const btn = document.getElementById('btn-cerrar-carrito');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  await page.fill('#buscador', 'laptop');
  await page.waitForTimeout(700);
  await snap(page, '12-busqueda-filtrada.png');

  // 13 - DevTools Network / Headers
  // Captura de los headers de respuesta haciendo una peticion directa via page.request
  const response = await page.request.get(`${BACKEND}/api/productos`);
  const headersObj = response.headers();
  const headersText = Object.entries(headersObj)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  await page.setContent(`
    <html>
      <head><title>Headers de seguridad (helmet / CORS)</title>
      <style>
        body { background:#1e1e2f; color:#eaeaea; font-family: 'Segoe UI', monospace; padding: 2rem; }
        h1 { color:#feca57; }
        pre { background:#111; padding:1.5rem; border-radius:10px; border: 1px solid #333; white-space: pre-wrap; word-break: break-all; font-size: 14px; }
        .ok { color:#4ade80; }
        .warn { color:#feca57; }
      </style></head>
      <body>
        <h1>Cabeceras de seguridad observadas</h1>
        <p class="ok">GET ${BACKEND}/api/productos  &rarr;  ${response.status()} ${response.statusText()}</p>
        <pre>${headersText.replace(/</g, '&lt;')}</pre>
        <p class="warn">Helmet agrega X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.</p>
      </body>
    </html>
  `);
  await page.waitForTimeout(SETTLE_MS);
  await snap(page, '13-headers-seguridad.png');

  // 14 - Estructura POO (codigo fuente)
  await page.goto(`file:///${path.join(__dirname, '..', '..', 'frontend', 'src', 'clases', 'Producto.ts').replace(/\\/g, '/')}`);
  await page.waitForTimeout(SETTLE_MS);
  await snap(page, '14-estructura-poo.png');

  await browser.close();
  console.log('\n=== Capturas generadas ===');
  console.log(`Carpeta: ${OUT_DIR}`);
  console.log('\n=== Capturas NO automatizables (requieren UI no implementada) ===');
  console.log('02-modal-login.png         -> El frontend NO tiene modal de login');
  console.log('03-modal-registro.png      -> El frontend NO tiene modal de registro');
  console.log('04-login-exitoso.png       -> Sin login no hay sesion visible');
  console.log('08-checkout-formulario.png -> El frontend NO tiene modal de checkout');
  console.log('09-checkout-confirmado.png -> El frontend NO tiene confirmacion de pedido en UI');
  console.log('10-mis-pedidos.png         -> El frontend NO tiene seccion de pedidos');
  console.log('11-detalle-pedido.png      -> El frontend NO tiene vista de detalle de pedido');
  console.log('Para estas capturas consulta: tests/screenshots/instrucciones-manuales.md\n');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
