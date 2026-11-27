// Arayüz ölçümü: oyunu birkaç ekran boyutunda tarayıcıda açar ve telefon düzeninin
// bozulup bozulmadığını denetler (Uçur görünür mü, taşan öğe var mı, kartlar kapatılabilir mi).
// tests/arayuz.test.js bunu kullanır; doğrudan çalıştırınca sonuçları yazar ve
// istenirse ekran görüntüsü alır:  node tools/arayuz.js [görüntü-klasörü]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

/** Ölçülen ekran boyutları: küçük telefonlar, Safari araç çubuğu açık, yatay telefon, tablet, masaüstü. */
export const SIZES = [
  { name: 'telefon-375x667', width: 375, height: 667, phone: true },
  { name: 'telefon-360x640', width: 360, height: 640, phone: true },
  { name: 'safari-375x560', width: 375, height: 560, phone: true },
  { name: 'telefon-390x844', width: 390, height: 844, phone: true },
  { name: 'yatay-667x375', width: 667, height: 375, phone: true },
  { name: 'yatay-844x390', width: 844, height: 390, phone: true },
  { name: 'tablet-820x1180', width: 820, height: 1180 },
  { name: 'masaustu-1280x800', width: 1280, height: 800 },
];

/** Playwright yüklü değilse null (CI'da test atlanır). */
export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch (e) { return null; }
}

/** Depo kökünü sunan küçük bir sunucu; { url, close }. */
export async function serve() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    try {
      const body = await readFile(join(ROOT, path || 'index.html'));
      res.writeHead(200, { 'content-type': TYPES[extname(path || 'index.html')] || 'application/octet-stream' });
      res.end(body);
    } catch (e) { res.writeHead(404); res.end(); }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((ok) => server.close(ok)) };
}

/** Sayfada çalışır: öğenin görünür kutusu ve ekran dışına taşan pikseller. */
function boxesInPage(selectors) {
  const W = innerWidth, H = innerHeight, out = {};
  for (const sel of selectors) {
    out[sel] = [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map((e) => {
      const r = e.getBoundingClientRect();
      return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), height: Math.round(r.height), out: Math.max(0, -r.left, r.right - W, -r.top, r.bottom - H) };
    });
  }
  return out;
}

/** Düğmenin ortasında en üstte kendisi mi var (başka bir şey üstünü örtmüyor mu)? */
function onTopInPage(sel) {
  const e = document.querySelector(sel); if (!e) return false;
  const r = e.getBoundingClientRect(), hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
  return !!hit && (hit === e || e.contains(hit));
}

/** Görevi açar; giriş kartları önceden "görüldü" sayılır. */
async function openLevel(page, url, id) {
  await page.goto(`${url}?hepsi#${id}`);
  await page.waitForFunction(() => window.__kp?.game?.level);
  await page.evaluate(() => {
    const { store, game } = window.__kp;
    for (let s = 1; s <= 12; s++) { store.markIntro(s); store.markSeen(`story:${s}`); }
    game.hideOverlay(); game.layout();
  });
}

/**
 * Bir ekran boyutunu ölçer. Döndürdüğü sorunlar listesi boşsa düzen sağlamdır.
 * @param shots  ekran görüntüsü klasörü (verilmezse görüntü alınmaz)
 */
export async function measure(browser, url, size, { shots = null, scale = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: scale, hasTouch: !!size.phone, isMobile: !!size.phone });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  const problems = [], report = { size: size.name };
  const snap = async (tag) => { if (shots) await page.screenshot({ path: join(shots, `${size.name}-${tag}.png`) }); };
  const W = size.width, H = size.height;

  // 1. Başarısız uçuştan sonra: Bip'in uyarısı açık, "Tekrar dene" görünmeli.
  await openLevel(page, url, '3-2');
  await page.evaluate(() => { const { game } = window.__kp; game.setSpeed(2); game.onRun(); });
  await page.waitForFunction(() => window.__kp.game.status === 'failed', null, { timeout: 20000 });
  await page.waitForTimeout(400);
  let b = await page.evaluate(boxesInPage, ['#runBtn', '#toast', '.top', '.hud', '.telemetry', '#panel', '.ctrl .sq', '#scrub', '.call']);
  const run = b['#runBtn'][0];
  report.runBtn = run;
  if (!run || run.out > 0) problems.push(`Tekrar dene düğmesi ekranın dışında (${run ? `${run.out}px taşıyor` : 'görünmüyor'})`);
  if (!(await page.evaluate(onTopInPage, '#runBtn'))) problems.push('Tekrar dene düğmesinin üstünü başka bir öğe örtüyor');
  for (const [sel, list] of Object.entries(b)) for (const r of list) if (r.out > 1) problems.push(`${sel} ekrandan ${r.out}px taşıyor`);
  // Panelin içindeki satırlar (blok sayacı, düğmeler) panelin kenarını aşmamalı.
  const inner = await page.evaluate(() => { const p = document.getElementById('panel').getBoundingClientRect();
    return [...document.querySelectorAll('#panel .tabrow > *, #panel .ctrl > *, #panel .brief .row > *')].filter((e) => e.getClientRects().length)
      .map((e) => Math.round(e.getBoundingClientRect().right - p.right + 4)).filter((d) => d > 1); });
  if (inner.length) problems.push(`Paneldeki ${inner.length} öğe panelin sağ kenarını ${Math.max(...inner)}px aşıyor`);
  await snap('uyari');

  // 2. Sensör balonu: gemi en sağ şeritteyken sağa bakan sensör ve ön sensör birlikte.
  await page.evaluate(() => {
    const { game } = window.__kp, f = game.fields[0], lane = f.lanes - 1;
    game.hideToast(); game.view.place?.({ lane, y: 0 });
    game.showCalls([
      { cond: 'ahead', lane, y: 0, result: true, cell: { lane, y: 1 } },
      { cond: 'rightFree', lane, y: 0, result: false, cell: { lane: lane + 1, y: 0 } },
    ]);
  });
  b = await page.evaluate(boxesInPage, ['.call', '#panel']);
  const side = b['#panel'][0]?.left > W / 2 ? b['#panel'][0] : null;   // yatayda panel sağda durur
  for (const r of b['.call']) {
    if (r.out > 1) problems.push(`Sensör balonu ekrandan ${r.out}px taşıyor`);
    if (side && r.right > side.left + 1) problems.push(`Sensör balonu panelin altına ${r.right - side.left}px giriyor`);
  }
  await page.evaluate(() => window.__kp.game.hideCall());

  // 3. Program alanı ve dokunma hedefleri (telefonda bloklar en az 40 piksel).
  await openLevel(page, url, '8-1');
  await page.evaluate(() => { const { game, store } = window.__kp; const l = game.level; if (l.solution) game.editor.load(l, l.solution(), [], false); game.layout(); });
  b = await page.evaluate(boxesInPage, ['#ws', '.ws .blk', '.palrow .blk', '#runBtn']);
  report.programArea = b['#ws'][0]?.height ?? 0;
  if (b['#runBtn'][0]?.out > 0) problems.push('Uzun programda Uçur düğmesi ekran dışında');
  if (size.phone) {
    const small = [...b['.ws .blk'], ...b['.palrow .blk']].filter((r) => r.height < 40);
    if (small.length) problems.push(`${small.length} blok 40 pikselden alçak (en alçağı ${Math.min(...small.map((r) => r.height))}px)`);
  }
  await snap('program');
  // Çekmece: telefonda yukarı çekilince program alanı büyür.
  const drawer = await page.$('#drawerBtn');
  if (size.phone && drawer && await drawer.isVisible()) {
    await drawer.click(); await page.waitForTimeout(400);
    b = await page.evaluate(boxesInPage, ['#ws', '#runBtn']);
    report.programAreaOpen = b['#ws'][0]?.height ?? 0;
    if (b['#runBtn'][0]?.out > 0) problems.push('Çekmece açıkken Uçur düğmesi ekran dışında');
    await snap('cekmece');
  }

  // 4. Rota ekranı: alt menü, Devam et ve en alttaki sektör etiketi menünün arkasında kalmamalı.
  await page.goto(`${url}?hepsi`);
  await page.waitForFunction(() => window.__kp?.map);
  await page.evaluate(() => { const m = document.getElementById('map'); m.scrollTop = m.scrollHeight; });
  await page.waitForTimeout(150);
  b = await page.evaluate(boxesInPage, ['#dock', '#dock button', '.slabel', '#continueBtn', '.maphead']);
  report.dockItems = b['#dock button'].length;
  const dock = b['#dock'][0], label = b['.slabel'][0];
  if (dock && label && label.bottom > dock.top && label.top < dock.bottom) problems.push('Sektör 1 etiketi alt menünün arkasında kalıyor');
  for (const sel of ['#dock', '.maphead']) for (const r of b[sel]) if (r.out > 1) problems.push(`${sel} ekrandan ${r.out}px taşıyor`);
  await snap('rota');

  // 5. Kartlar: Hangar kartı yatay telefonda da kapatılabilmeli (üstte kapatma düğmesi).
  await page.evaluate(() => window.__kp.hangar.open());
  await page.waitForTimeout(350);
  b = await page.evaluate(boxesInPage, ['.card', '.card .cardx', '.card .btn.primary']);
  const close = [...b['.card .cardx'], ...b['.card .btn.primary']].find((r) => r.out === 0);
  if (!close) problems.push('Hangar kartında görünür bir kapatma düğmesi yok');
  await snap('hangar');

  if (errors.length) problems.push(...errors.map((e) => `Sayfa hatası: ${e}`));
  report.problems = problems;
  await ctx.close();
  return report;
}

/** Bütün boyutları ölçer. */
export async function measureAll({ shots = null, scale = 1, sizes = SIZES } = {}) {
  const pw = loadPlaywright();
  if (!pw) throw new Error('playwright yüklü değil');
  const srv = await serve(), browser = await pw.chromium.launch();
  try {
    const out = [];
    for (const size of sizes) out.push(await measure(browser, srv.url, size, { shots, scale }));
    return out;
  } finally { await browser.close(); await srv.close(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const shots = process.argv[2] || null;
  const reports = await measureAll({ shots, scale: shots ? 2 : 1 });
  for (const r of reports) {
    console.log(`${r.problems.length ? '✗' : '✓'} ${r.size}  program alanı ${r.programArea}px${r.programAreaOpen ? ` (çekmece açık ${r.programAreaOpen}px)` : ''}, alt menü ${r.dockItems} öğe`);
    for (const p of r.problems) console.log(`    - ${p}`);
  }
  process.exitCode = reports.some((r) => r.problems.length) ? 1 : 0;
}
