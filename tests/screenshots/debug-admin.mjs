import { chromium } from 'playwright';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
  page.on('console', (m) => console.log(`[${m.type()}]`, m.text()));

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await page.click('#btn-abrir-login');
  await sleep(500);
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', 'admin123');
  await page.click('#form-login button[type="submit"]');
  await page.waitForFunction(
    () => document.getElementById('usuario-contenedor')?.classList.contains('oculto') === false,
    { timeout: 8000 }
  );
  await sleep(500);

  console.log('--- click #btn-admin ---');
  await page.click('#btn-admin');
  await sleep(2000);

  const html = await page.evaluate(() => {
    const s = document.getElementById('seccion-admin');
    const c = document.getElementById('admin-contenido');
    return {
      adminHidden: s ? s.classList.contains('oculto') : 'NO EXISTE',
      adminContenidoHTML: c ? c.innerHTML.substring(0, 500) : 'NO EXISTE',
      hash: window.location.hash,
    };
  });
  console.log(JSON.stringify(html, null, 2));

  await browser.close();
}
main().catch(console.error);
