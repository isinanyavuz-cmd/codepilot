// Arayüz testi: oyunu telefon, yatay telefon, tablet ve masaüstü boyutlarında açar; Uçur (Tekrar dene)
// düğmesinin görünür olduğunu, uyarı ve sensör balonlarının ekrandan taşmadığını, blokların
// parmakla dokunulacak boyda olduğunu ve kartların kapatılabildiğini denetler (bkz. tools/arayuz.js).
// Playwright yüklü değilse atlanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZES, loadPlaywright, serve, measure } from '../tools/arayuz.js';

const pw = loadPlaywright();

test('arayüz: her ekran boyutunda Uçur görünür, taşan öğe yok', { skip: pw ? false : 'playwright yüklü değil', timeout: 600000 }, async (t) => {
  const srv = await serve(), browser = await pw.chromium.launch();
  try {
    for (const size of SIZES) {
      await t.test(size.name, async () => {
        const r = await measure(browser, srv.url, size);
        assert.deepEqual(r.problems, [], `${size.name}:\n  ${r.problems.join('\n  ')}`);
        assert.ok(r.dockItems <= 4, `alt menüde ${r.dockItems} öğe var`);
      });
    }
  } finally { await browser.close(); await srv.close(); }
});
