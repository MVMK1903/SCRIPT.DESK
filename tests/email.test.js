// Email-a-report test. Run: NODE_PATH=$(npm root -g) node tests/email.test.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const o = {};
    o.btn = !!document.getElementById('bMail');
    P = { title: 'Demo', scenes: [], artists: [], changes: [] }; page = 'slo';
    lastExp = { sheets: [{ name: 'S', cols: [{ h: 'A', w: 10 }], rows: [['x']] }] };
    openMail();
    o.modal = !!document.getElementById('mTo');
    window.XLSX = { utils: { book_new() { return {}; } }, write() { return new Uint8Array(3); } }; addSheet = () => {};
    const saved = []; saveFile = async (f, d) => { saved.push(f); };
    let href = ''; const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { href = this.href; };
    document.getElementById('mTo').value = 'bad';
    await sendMail(); o.rejectsBad = saved.length === 0 && href === '';
    document.getElementById('mTo').value = 'a@b.com, c@d.in'; document.getElementById('mFmt').value = 'xlsx';
    await sendMail();
    o.saved = saved[0] || ''; o.mailto = decodeURIComponent(href).startsWith('mailto:a@b.com,c@d.in?subject=Demo - ');
    // PDF with watermark: stub pdf builder, check the watermark is applied with the typed text
    let wm = null; buildPdf = async () => ({ output: () => new Uint8Array(2) }); wmApply = (d, w) => { wm = w; };
    openMail(); o.pdfDefault = document.getElementById('mFmt').value === 'pdf';
    document.getElementById('mTo').value = 'a@b.com'; document.getElementById('mWmOn').checked = true;
    document.getElementById('mWmT').value = 'FOR RAAHUL'; document.getElementById('mWmP').value = 'diag';
    await sendMail(); o.wm = !!wm && wm.text === 'FOR RAAHUL' && wm.pos === 'diag'; o.pdfSaved = /\.pdf$/.test(saved[saved.length - 1] || '');
    HTMLAnchorElement.prototype.click = oc; return o;
  });
  console.log(r, errs);
  const ok = r.btn && r.modal && r.rejectsBad && /\.xlsx$/.test(r.saved) && r.mailto && r.pdfDefault && r.wm && r.pdfSaved && !errs.length;
  console.log(ok ? 'PASS email' : 'FAIL email'); await b.close(); process.exit(ok ? 0 : 1);
})();
