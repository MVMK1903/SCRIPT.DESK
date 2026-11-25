// Script reading on layouts found in real scripts (all text below is invented). Run: NODE_PATH=$(npm root -g) node tests/script_reading.test.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1200);
  const r = await pg.evaluate(() => {
    const out = {};
    // 1. "Name: dialogue" on one line, mixed case, wrapped lines
    const inl = ['INT. SHOP. DAY.', 'A small shop.'];
    const names = ['Asha', 'Ravi', 'Meera'];
    for (let i = 0; i < 8; i++) { names.forEach(n => inl.push('', n + ': Come on, we are late for the train today and nobody', 'has packed anything yet.')); }
    inl.push('', 'ASHA WALKS OUT.');
    const a = detectScenes(inl.join('\n')).scenes[0];
    out.inlineCues = a.cues;
    out.inlineKinds = classify(a.text.split('\n')).filter(x => x[0] !== 'b').slice(0, 4).map(x => x[0]);
    // 2. no capital letters at all (Devanagari names), name line then dialogue line
    const dv = ['INT. घर. DAY'];
    ['रवि', 'आशा'].forEach(n => { for (let i = 0; i < 6; i++) dv.push('', n, 'चलो जल्दी करो।'); });
    out.devaCues = detectScenes(dv.join('\n')).scenes[0].cues;
    // 3. things in capitals that are not people stay out
    const junk = ['INT. HOUSE. DAY.', '', 'RAVI', 'Hello.', '', 'CARTONS- DAY', 'Boxes.', '', 'CLOSE ON HENRY\'S FACE', 'He smiles.', '', 'X1. INT. CLASSROOM', 'Desks.', '', 'TIME LAPSE', 'Clouds.', '', 'DOORWAY', 'Empty.', '', 'MOTHER’S FRIEND', 'Hi.'];
    out.junkCues = detectScenes(junk.join('\n')).scenes[0].cues;
    // 4. text in a private-use range (old Telugu / Hindi fonts) is flagged as unreadable
    out.garbled = garbledRatio('  ab');
    out.normal = garbledRatio('INT. HOUSE - DAY\nరవి: హలో');
    // 5. invented text: objects with possessives / endings are not people, CONSTABLE is, stray dot is cleaned
    const t5 = ['INT. STATION. DAY.', '', 'CONSTABLE', 'Sit.', '', 'CONSTABLE', 'Quiet.', '', "ASHA'S HAND", 'Shakes.', '', 'HOT PLATE', 'Steam.', '', 'REGISTRATIONDESK', 'Busy.', '', '. RAVI', 'Hi.', '', 'RAVI', 'Hello.'];
    out.t5 = detectScenes(t5.join('\n')).scenes[0].cues;
    // 6. text after THE END is left out when a long tail follows
    const tail = ['INT. HALL. DAY.', 'Action.', '', 'THE END', ''];
    for (let i = 0; i < 60; i++) tail.push('Credits line ' + i);
    const d6 = detectScenes(tail.join('\n'));
    out.tail = d6.scenes[d6.scenes.length - 1].text.split('\n').length;
    return out;
  });
  console.log(JSON.stringify(r), errs);
  const ok = !errs.length
    && ['ASHA', 'RAVI', 'MEERA'].every(n => r.inlineCues.includes(n))
    && r.inlineKinds.join() === 'act,chr,dia,dia'
    && r.devaCues.includes('रवि') && r.devaCues.includes('आशा')
    && r.junkCues.includes('RAVI') && r.junkCues.includes('MOTHER’S FRIEND') && r.junkCues.length === 2
    && r.t5.includes('CONSTABLE') && r.t5.includes('RAVI') && r.t5.length === 2
    && r.tail < 20
    && r.garbled > 0.5 && r.normal === 0;
  console.log(ok ? 'PASS script reading' : 'FAIL script reading'); await b.close(); process.exit(ok ? 0 : 1);
})();
