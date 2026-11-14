// Import with no scene headings. Run: NODE_PATH=$(npm root -g) node tests/import_noheadings.test.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const o = {}; openImport();
    document.getElementById('iText').value = 'A liquor truck unloads crates outside the local bar.\n\nChurch volunteers tie white festival flags across the streets.';
    document.getElementById('iGo').click(); await new Promise(r => setTimeout(r, 800));
    o.note1 = document.getElementById('iNote').textContent;
    document.getElementById('iGo').click(); await new Promise(r => setTimeout(r, 1500));
    o.scenes = P && P.scenes ? P.scenes.length : -1; return o;
  });
  console.log(r, errs);
  const ok = /No scene headings/.test(r.note1) && r.scenes === 1 && !errs.length;
  console.log(ok ? 'PASS import' : 'FAIL import'); await b.close(); process.exit(ok ? 0 : 1);
})();
