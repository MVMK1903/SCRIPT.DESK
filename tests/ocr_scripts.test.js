// Indian-language script detection for scanned-page reading (invented text). Run: NODE_PATH=$(npm root -g) node tests/ocr_scripts.test.js
const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1200);
  const r = await pg.evaluate(() => {
    const rep = (s, n) => (s + ' ').repeat(n);
    return { te: scriptsOf(rep('రవి ఇంటికి వచ్చాడు', 5)), ta: scriptsOf(rep('ரவி வீட்டுக்கு வந்தான்', 5)), hi: scriptsOf(rep('रवि घर आया', 8)),
      ml: scriptsOf(rep('രവി വീട്ടിൽ വന്നു', 5)), kn: scriptsOf(rep('ರವಿ ಮನೆಗೆ ಬಂದ', 5)), en: scriptsOf(rep('INT. HOUSE - DAY', 10)),
      mix: scriptsOf(rep('రవి ఇంటికి వచ్చాడు', 6) + rep('रवि घर आया', 6)) };
  });
  console.log(JSON.stringify(r), errs);
  const ok = !errs.length && r.te[0] === 'tel' && r.ta[0] === 'tam' && r.hi[0] === 'hin' && r.ml[0] === 'mal' && r.kn[0] === 'kan' && r.en.length === 0 && r.mix.includes('tel') && r.mix.includes('hin');
  console.log(ok ? 'PASS ocr scripts' : 'FAIL ocr scripts'); await b.close(); process.exit(ok ? 0 : 1);
})();
