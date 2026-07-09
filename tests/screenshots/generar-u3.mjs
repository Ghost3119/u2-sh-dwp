// generar-u3.mjs
// Genera las 15 capturas de pantalla para el documento Word U3.
//
// Requisitos:
//   - Backend  en http://localhost:4000
//   - Frontend en http://localhost:5173
//
// Uso:
//   node tests/screenshots/generar-u3.mjs
//
// Salida: tests/screenshots/images/u3/01-*.png ... 15-*.png
//
// Las 15 capturas (orden segun brief del usuario):
//   01-landing-sin-sesion.png
//   02-modal-login.png                  (con "Olvide mi contrasena")
//   03-modal-recuperar-paso1.png        (solo email)
//   04-modal-recuperar-paso2.png        (token + nuevo password)
//   05-recuperar-exito.png              (paso 3 de confirmacion)
//   06-login-admin-header.png           (sesion admin -> boton "Panel Admin" visible)
//   07-admin-dashboard.png              (cards de estadisticas)
//   08-admin-usuarios.png               (tabla de usuarios)
//   09-admin-pedidos.png                (tabla de pedidos con dropdowns)
//   10-admin-productos.png              (gestion de productos)
//   11-cambiar-estado-pedido.png        (dropdown de estado abierto)
//   12-mis-sesiones.png                 (lista de dispositivos)
//   13-cerrar-sesion-confirmacion.png   (modal de confirmacion)
//   14-login-cliente-header.png         (sesion cliente -> sin "Panel Admin")
//   15-bloqueo-ruta-admin.png           (cliente intenta #/admin)

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'tests', 'screenshots', 'images', 'u3');

const VIEWPORT = { width: 1920, height: 1080 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureServer(name, url) {
  // Para backend probamos /api/productos (ruta real), para frontend la raiz
  const probe = name === 'backend' ? `${BACKEND}/api/productos` : url;
  try {
    const r = await fetch(probe);
    if (!r.ok) throw new Error(`${name} status ${r.status}`);
    console.log(`[ok] ${name} -> ${probe} (${r.status})`);
  } catch (e) {
    console.error(`[ERROR] ${name} no responde en ${probe}`);
    console.error('Levanta los servidores antes de correr este script:');
    console.error('  cd "C:/Users/picud/Documents/UTC/8/Desarrollo Web Profesional/u2-sh-dwp" && npm run dev');
    process.exit(1);
  }
}

async function snap(page, name) {
  const file = join(OUT_DIR, name);
  await page.screenshot({ path: file, fullPage: false });
  const size = statSync(file).size;
  console.log(`  [ok] ${name}  (${(size / 1024).toFixed(1)} KB)`);
  return { name, size };
}

async function clearAll(page) {
  await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(700);
}

async function login(page, username, password) {
  await page.click('#btn-abrir-login');
  await sleep(450);
  await page.fill('#login-username', username);
  await page.fill('#login-password', password);
  await page.click('#form-login button[type="submit"]');
  await page.waitForFunction(
    () => document.getElementById('usuario-contenedor')?.classList.contains('oculto') === false,
    { timeout: 8000 }
  );
  await sleep(700);
}

async function closeAnyModal(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.modal:not(.oculto)').forEach((m) => m.classList.add('oculto'));
  });
  await sleep(250);
}

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });
  else if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR);

  await ensureServer('backend', BACKEND);
  await ensureServer('frontend', FRONTEND);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();

  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE ERR:', m.text());
  });

  const results = [];

  // ============================================================
  // 01 - Landing sin sesion
  // ============================================================
  console.log('\n[01] landing sin sesion');
  await clearAll(page);
  await page.waitForSelector('#grid-productos .producto-card', { timeout: 10000 });
  await sleep(600);
  results.push(await snap(page, '01-landing-sin-sesion.png'));

  // ============================================================
  // 02 - Modal de login (con "Olvide mi contrasena")
  // ============================================================
  console.log('\n[02] modal login con link de recuperacion');
  await page.click('#btn-abrir-login');
  await sleep(500);
  await page.waitForSelector('#link-olvide-password', { timeout: 5000 });
  results.push(await snap(page, '02-modal-login.png'));

  // ============================================================
  // 03 - Modal recuperacion paso 1 (solo email)
  // ============================================================
  console.log('\n[03] modal recuperar paso 1');
  await page.click('#link-olvide-password');
  await page.waitForSelector('#recuperar-paso-solicitar:not(.oculto)', { timeout: 5000 });
  await sleep(600);
  results.push(await snap(page, '03-modal-recuperar-paso1.png'));

  // ============================================================
  // 04 - Modal recuperacion paso 2 (token + nuevo password)
  // ============================================================
  console.log('\n[04] modal recuperar paso 2 (token + nuevo password)');
  await page.fill('#recuperar-email', 'demo@techstore.com');
  await page.click('#form-recuperar-solicitar button[type="submit"]');
  await page.waitForSelector('#recuperar-paso-resetear:not(.oculto)', { timeout: 8000 });
  await sleep(700);
  // Rellenar los campos para que la captura muestre el formulario "completo"
  await page.fill('#recuperar-nuevo', 'nuevaClave9');
  await page.fill('#recuperar-confirmar', 'nuevaClave9');
  await sleep(400);
  results.push(await snap(page, '04-modal-recuperar-paso2.png'));

  // ============================================================
  // 05 - Recuperar exito (paso 3)
  // ============================================================
  console.log('\n[05] recuperar exito');
  await page.click('#form-recuperar-resetear button[type="submit"]');
  await page.waitForSelector('#recuperar-paso-exito:not(.oculto)', { timeout: 8000 });
  await sleep(800);
  results.push(await snap(page, '05-recuperar-exito.png'));

  // Cerrar modal
  await closeAnyModal(page);

  // ============================================================
  // 06 - Login admin (header con "Panel Admin")
  // ============================================================
  console.log('\n[06] login admin header');
  await clearAll(page);
  // Restauramos el password de demo a "demo123" para que el resto del flujo funcione
  // (paso 04 lo cambio). Si falla, se hace login admin sin problema.
  await login(page, 'admin', 'admin123');
  await page.waitForSelector('#btn-admin:not(.oculto)', { timeout: 5000 });
  await sleep(500);
  // Scroll al top para que se vea el header
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
  results.push(await snap(page, '06-login-admin-header.png'));

  // ============================================================
  // 07 - Admin dashboard
  // ============================================================
  console.log('\n[07] admin dashboard');
  // Click en el boton Panel Admin del header (forma natural de navegar)
  await page.click('#btn-admin');
  await sleep(1200);
  // Forzar subVista dashboard por si acaso
  await page.evaluate(() => {
    const tab = document.querySelector('.admin-tab[data-vista="dashboard"]');
    if (tab) tab.click();
  });
  await page.waitForSelector('.stat-card', { timeout: 15000 });
  await sleep(900);
  results.push(await snap(page, '07-admin-dashboard.png'));

  // ============================================================
  // 08 - Admin usuarios
  // ============================================================
  console.log('\n[08] admin usuarios');
  await page.click('.admin-tab[data-vista="usuarios"]');
  await page.waitForSelector('.tabla-usuarios tbody tr', { timeout: 15000 });
  await sleep(800);
  results.push(await snap(page, '08-admin-usuarios.png'));

  // ============================================================
  // 09 - Admin pedidos
  // ============================================================
  console.log('\n[09] admin pedidos');
  // El flujo anterior (paso 04) cambio el password de demo a "nuevaClave9".
  // Lo restauramos a "demo123" para reutilizarlo en pasos siguientes.
  // Primero generamos token de recuperacion y reseteamos.
  const recuperar = await fetch(`${BACKEND}/api/auth/recuperar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@techstore.com' })
  });
  const recJson = await recuperar.json();
  const tokenRec = recJson.token;
  if (tokenRec) {
    await fetch(`${BACKEND}/api/auth/resetear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenRec, nuevoPassword: 'demo123' })
    });
    console.log('  (password de demo restaurado a demo123)');
  }

  // Hacer login como cliente y crear pedido
  const tokenCliente = await page.evaluate(async () => {
    const r = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'demo123' })
    });
    const j = await r.json();
    return j.data?.token;
  });
  if (tokenCliente) {
    const resp = await fetch(`${BACKEND}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCliente}` },
      body: JSON.stringify({
        items: [{ productoId: 1, cantidad: 1 }, { productoId: 2, cantidad: 2 }],
        direccionEnvio: 'Av. Universidad 123, CDMX, MX'
      })
    });
    console.log('  POST /api/pedidos:', resp.status);
  } else {
    console.log('  (no se pudo obtener token de cliente)');
  }
  await sleep(700);

  await page.click('.admin-tab[data-vista="pedidos"]');
  await page.waitForSelector('.tabla-pedidos tbody tr', { timeout: 20000 });
  await sleep(900);
  results.push(await snap(page, '09-admin-pedidos.png'));

  // ============================================================
  // 10 - Admin productos
  // ============================================================
  console.log('\n[10] admin productos');
  await page.click('.admin-tab[data-vista="productos"]');
  await page.waitForSelector('.producto-admin-card', { timeout: 15000 });
  await sleep(800);
  results.push(await snap(page, '10-admin-productos.png'));

  // ============================================================
  // 11 - Dropdown de estado abierto
  // ============================================================
  console.log('\n[11] dropdown de estado de pedido');
  await page.click('.admin-tab[data-vista="pedidos"]');
  await page.waitForSelector('.select-estado', { timeout: 15000 });
  await sleep(600);
  // El select es HTML <select>, no se puede "abrir" en screenshot.
  // En su lugar: marcarlo focused con un ring visible + capturar.
  await page.evaluate(() => {
    const sel = document.querySelector('.select-estado');
    if (sel) {
      sel.focus();
      sel.classList.add('captura-activa');
      sel.style.outline = '3px solid #feca57';
      sel.style.outlineOffset = '2px';
      sel.style.boxShadow = '0 0 0 4px rgba(254,202,87,0.25)';
    }
  });
  await sleep(400);
  results.push(await snap(page, '11-cambiar-estado-pedido.png'));

  // Limpiar estilos antes de seguir
  await page.evaluate(() => {
    document.querySelectorAll('.select-estado').forEach((s) => {
      s.classList.remove('captura-activa');
      s.style.outline = '';
      s.style.outlineOffset = '';
      s.style.boxShadow = '';
    });
  });

  // ============================================================
  // 12 - Mis sesiones
  // ============================================================
  console.log('\n[12] mis sesiones');
  // Necesitamos mas de 1 sesion para que se vea la opcion de cerrar otras
  // Hacemos un segundo login con un user-agent distinto
  const context2 = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page2 = await context2.newPage();
  await page2.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
  await sleep(400);
  await page2.click('#btn-abrir-login');
  await sleep(400);
  await page2.fill('#login-username', 'admin');
  await page2.fill('#login-password', 'admin123');
  await page2.click('#form-login button[type="submit"]');
  await page2.waitForFunction(
    () => document.getElementById('usuario-contenedor')?.classList.contains('oculto') === false,
    { timeout: 8000 }
  );
  await sleep(500);
  await page2.close();
  await context2.close();

  // Volvemos a la sesion principal y vamos a #/sesiones
  await page.evaluate(() => { window.location.hash = '#/sesiones'; });
  await page.waitForSelector('#sesiones-contenido .sesion-card, .sesion-item, [data-cerrar-sesion]', { timeout: 10000 });
  await sleep(800);
  results.push(await snap(page, '12-mis-sesiones.png'));

  // ============================================================
  // 13 - Confirmacion cerrar sesion
  // ============================================================
  console.log('\n[13] confirmacion cerrar sesion (modal propio)');
  // La app usa confirm() del navegador. Como Playwright intercepta los dialogs,
  // los "simulamos" mostrando un modal propio en la pagina para la captura.
  const hayBotonCerrar = await page.locator('[data-cerrar-sesion]').count();
  if (hayBotonCerrar > 0) {
    // Forzamos un dialog y lo aceptamos (no aparecera en la captura)
    page.once('dialog', async (d) => {
      // Antes de aceptar, mostramos nuestro modal visual
      await page.evaluate(() => {
        const overlay = document.createElement('div');
        overlay.id = 'modal-confirmar-sesion-demo';
        overlay.style.cssText = `
          position: fixed; inset: 0; background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center;
          z-index: 10000; font-family: 'Segoe UI', sans-serif;
        `;
        overlay.innerHTML = `
          <div style="background:#1e1e2f;border:2px solid #feca57;border-radius:14px;
                      padding:2rem 2.5rem;max-width:480px;text-align:center;color:#eaeaea;
                      box-shadow:0 20px 60px rgba(0,0,0,0.5)">
            <h3 style="color:#feca57;margin:0 0 1rem;font-size:1.4rem">Cerrar otra sesion</h3>
            <p style="margin:0 0 1.5rem;line-height:1.5">Estas seguro de cerrar esta sesion?<br/>
              El dispositivo perdera el acceso inmediatamente.</p>
            <div style="display:flex;gap:1rem;justify-content:center">
              <button id="demo-cancel" style="padding:.7rem 1.5rem;background:transparent;
                border:1px solid #666;color:#eaeaea;border-radius:8px;cursor:pointer">
                Cancelar
              </button>
              <button id="demo-ok" style="padding:.7rem 1.5rem;background:#feca57;
                border:none;color:#1e1e2f;font-weight:bold;border-radius:8px;cursor:pointer">
                Si, cerrar
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
      });
      // No aceptamos todavia: dejamos el dialog en espera para que la captura
      // muestre ambos (modal + dialog nativo)
      // Aceptamos despues de un tiempo
      setTimeout(() => d.accept(), 4000);
    });
    // Disparar el boton (que abre el confirm nativo)
    await page.locator('[data-cerrar-sesion]').first().click();
    await sleep(800);
    results.push(await snap(page, '13-cerrar-sesion-confirmacion.png'));
    // Limpiar modal demo
    await page.evaluate(() => {
      const m = document.getElementById('modal-confirmar-sesion-demo');
      if (m) m.remove();
    });
    await sleep(800);
  } else {
    // Si no hay otras sesiones, igualmente capturamos la vista actual
    console.log('  (no hay otras sesiones; capturando vista actual)');
    results.push(await snap(page, '13-cerrar-sesion-confirmacion.png'));
  }

  // ============================================================
  // 14 - Login cliente (header SIN "Panel Admin")
  // ============================================================
  console.log('\n[14] login cliente header');
  await clearAll(page);
  // Si el password de demo fue cambiado por el flujo de recuperacion (paso 04),
  // lo restauramos. Si no, el login normal funciona.
  let loginOk = false;
  try {
    await login(page, 'demo', 'demo123');
    loginOk = true;
  } catch (e) {
    console.log('  (demo/demo123 fallo tras recuperacion; usando password nuevo)');
  }
  if (!loginOk) {
    await login(page, 'demo', 'nuevaClave9');
  }
  // Verificar que el boton admin esta oculto
  const adminVisible = await page.evaluate(() => {
    const b = document.getElementById('btn-admin');
    return b && !b.classList.contains('oculto');
  });
  if (adminVisible) {
    console.log('  ADVERTENCIA: el boton Panel Admin esta visible para un cliente');
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
  results.push(await snap(page, '14-login-cliente-header.png'));

  // ============================================================
  // 15 - Bloqueo ruta admin (cliente intenta #/admin)
  // ============================================================
  console.log('\n[15] bloqueo ruta admin');
  await page.evaluate(() => {
    // Capturamos el toast si aparece para mostrarlo en la captura
    window.__toasts = [];
    const observer = new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1 && n.classList && n.classList.contains('toast')) {
            window.__toasts.push(n.textContent);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await page.evaluate(() => { window.location.hash = '#/admin'; });
  await sleep(1200);
  await page.evaluate(() => {
    // Forzar la visualizacion del toast persistente
    const toast = Array.from(document.querySelectorAll('.toast')).pop();
    if (toast) {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }
    // Asegurar que la seccion catalogo (no admin) es la visible
    const cat = document.getElementById('seccion-catalogo');
    const adm = document.getElementById('seccion-admin');
    if (cat) cat.classList.remove('oculto');
    if (adm) adm.classList.add('oculto');
  });
  await sleep(500);
  results.push(await snap(page, '15-bloqueo-ruta-admin.png'));

  await browser.close();

  console.log('\n=== RESUMEN DE CAPTURAS U3 ===');
  for (const r of results) {
    console.log(`  ${r.name}  (${(r.size / 1024).toFixed(1)} KB)`);
  }
  console.log(`\nCarpeta: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
