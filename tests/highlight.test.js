// Colour highlights: whole type or one item, in the breakdown, the full script and Write. Run: NODE_PATH=$(npm root -g) node tests/highlight.test.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    const nHl = () => HL_COLS.reduce((a, _, i) => { const h = CSS.highlights.get('sdhl-' + i); return a + (h ? h.size : 0) }, 0);
    const txt = i => { const h = CSS.highlights.get('sdhl-' + i); return h ? [...h].map(r => r.toString().toUpperCase()) : [] };
    P = sampleProject(); go('script'); await wait(500);
    document.getElementById('bHl').click(); await wait(100);
    out.panelOpen = !document.getElementById('hlPanel').hidden;
    out.none = nHl();
    // all characters, yellow
    document.querySelector('[data-hl-cat="cast"]').click(); await wait(500);
    out.allCast = nHl(); out.castSample = [...new Set(txt(0))].slice(0, 5);
    // locations in orange
    document.querySelector('[data-hl-cat="loc"]').click(); await wait(100);
    document.querySelector('[data-hl-catcol="loc"][data-c="1"]').click(); await wait(500);
    out.orange = txt(1).length;
    // switch to one character only
    document.querySelector('[data-hl-cat="cast"]').click(); document.querySelector('[data-hl-cat="loc"]').click(); await wait(100);
    const sel = document.querySelector('[data-hl-addcat]'); sel.value = 'cast'; sel.dispatchEvent(new Event('change', { bubbles: true })); await wait(50);
    const inp = document.querySelector('[data-hl-addname]'); inp.value = 'SANTOS'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-hl-addcol="5"]').click(); await wait(50);
    document.querySelector('[data-hl="add"]').click(); await wait(500);
    out.onlySantos = [...new Set(txt(5))]; out.otherColours = nHl() - txt(5).length;
    out.saved = JSON.stringify(P.hl.items);
    // same highlight in the breakdown
    go('breakdown'); await wait(600); out.breakdown = nHl();
    // Write
    P.draft = Object.assign(P.draft || {}, { els: [{ t: 'h', x: 'INT. HOUSE - DAY' }, { t: 'a', x: 'Santos enters, then Nina follows.' }, { t: 'c', x: 'SANTOS' }, { t: 'd', x: 'Hello.' }], tplAsked: true, fmt: 'film' });
    go('write'); await wait(700); out.write = nHl(); out.writeTxt = txt(5);
    // typing keeps the highlight
    const d = document.getElementById('wrDoc'); const blk = d.children[1]; blk.textContent = 'Santos waits. Santos leaves.'; blk.dispatchEvent(new Event('input', { bubbles: true })); await wait(600);
    out.afterTyping = txt(5).length;
    // switch off
    document.getElementById('bHl').click(); await wait(50); document.querySelector('[data-hl="onoff"]').click(); await wait(500); out.off = nHl();
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); if (errs.length) console.log('ERRORS', errs);
  const ok = r.panelOpen && r.none === 0 && r.allCast > 3 && r.orange > 0 && r.onlySantos.length && r.onlySantos.every(x => /SANTOS/.test(x)) && r.otherColours === 0 && r.breakdown > 0 && r.write > 0 && r.afterTyping === 3 && r.off === 0 && !errs.length;
  console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
