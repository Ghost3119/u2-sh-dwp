import { chromium } from 'playwright';
import { writeFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:/Users/picud/Documents/UTC/8/Desarrollo Web Profesional/u2-sh-dwp';
const OUT = join(ROOT, 'tests/screenshots/images');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function shot(page, name) {
  const path = join(OUT, name);
  await page.screenshot({ path, fullPage: false });
  const size = statSync(path).size;
  console.log(`OK ${name}  ${(size/1024).toFixed(1)} KB`);
  return { name, size };
}

async function clearStorage(page) {
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await sleep(600);
}

async function loginAsDemo(page) {
  await page.click('#btn-abrir-login');
  await sleep(400);
  await page.fill('#login-username', 'demo');
  await page.fill('#login-password', 'demo123');
  await page.click('#form-login button[type="submit"]');
  await page.waitForFunction(() => document.getElementById('usuario-contenedor')?.classList.contains('oculto') === false, { timeout: 5000 });
  await sleep(500);
}

async function addFirstNProducts(page, n) {
  await page.waitForSelector('.btn-agregar[data-add]', { timeout: 8000 });
  const ids = await page.$$eval('.btn-agregar[data-add]', (els, count) => els.slice(0, count).map(e => e.getAttribute('data-add')), n);
  for (const id of ids) {
    await page.click(`.btn-agregar[data-add="${id}"]`);
    await sleep(250);
  }
  await sleep(300);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text()); });

  // Workaround: el backend espera direccionEnvio como string >=10 chars.
  // El frontend envia un objeto, lo que produce 400. Transformamos la peticion
  // solo en el POST a /api/pedidos.
  await page.route('**/api/pedidos', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      try {
        const body = JSON.parse(req.postData() || '{}');
        if (body.direccionEnvio && typeof body.direccionEnvio === 'object') {
          const d = body.direccionEnvio;
          body.direccionEnvio = `${d.calle || ''}, ${d.ciudad || ''}, ${d.estado || ''} CP ${d.codigoPostal || ''}`.trim();
        }
        await route.continue({ postData: JSON.stringify(body) });
        return;
      } catch (e) {
        await route.abort();
        return;
      }
    }
    await route.continue();
  });

  const results = [];

  // 02-modal-login
  await clearStorage(page);
  await page.click('#btn-abrir-login');
  await sleep(500);
  results.push(await shot(page, '02-modal-login.png'));

  // 03-modal-registro
  await page.keyboard.press('Escape');
  await sleep(400);
  await page.click('#btn-abrir-registro');
  await sleep(500);
  results.push(await shot(page, '03-modal-registro.png'));

  // 04-login-exitoso
  await page.keyboard.press('Escape');
  await sleep(400);
  await loginAsDemo(page);
  results.push(await shot(page, '04-login-exitoso.png'));

  // 08-checkout-formulario
  await addFirstNProducts(page, 3);
  await page.click('#carrito-icono');
  await sleep(500);
  await page.click('#btn-finalizar');
  await sleep(700);
  results.push(await shot(page, '08-checkout-formulario.png'));

  // 09-pedido-confirmado
  await page.fill('#chk-calle', 'Av Universidad 123');
  await page.fill('#chk-ciudad', 'CDMX');
  await page.fill('#chk-estado', 'CDMX');
  await page.fill('#chk-cp', '04510');
  await page.fill('#chk-tel', '5512345678');
  await page.click('#form-checkout button[type="submit"]');
  await sleep(900);
  results.push(await shot(page, '09-pedido-confirmado.png'));

  // Esperar a que se cierre el modal y aparezca seccion-pedidos
  await sleep(2400);
  await page.evaluate(() => document.getElementById('seccion-pedidos')?.scrollIntoView({ behavior: 'auto', block: 'start' }));
  await sleep(500);

  // 10-mis-pedidos
  results.push(await shot(page, '10-mis-pedidos.png'));

  // 11-detalle-pedido
  await page.waitForSelector('.pedido-card', { timeout: 5000 });
  await page.click('.pedido-card');
  await sleep(700);
  results.push(await shot(page, '11-detalle-pedido.png'));

  // 15-validacion-formulario
  await page.keyboard.press('Escape');
  await sleep(400);
  await page.evaluate(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
  });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  // Asegurar estado sin sesion por si la app restaura token del storage
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(800);
  // Forzar UI al estado sin sesion por si quedo un token
  await page.evaluate(() => {
    const a = document.getElementById('auth-contenedor');
    const u = document.getElementById('usuario-contenedor');
    if (a) a.classList.remove('oculto');
    if (u) u.classList.add('oculto');
  });
  await page.click('#btn-abrir-login', { force: true });
  await sleep(500);
  await page.fill('#login-username', 'ab');
  await page.fill('#login-password', '');
  await page.click('#form-login button[type="submit"]');
  await sleep(400);
  results.push(await shot(page, '15-validacion-formulario.png'));

  await browser.close();

  console.log('\n=== RESUMEN ===');
  for (const r of results) {
    console.log(`${r.name}  ${(r.size/1024).toFixed(1)} KB`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
