// Scene finder regression test. Run: NODE_PATH=$(npm root -g) node tests/scene_formats.test.js
// Uses short made-up samples of the heading styles seen in real scripts (no real script text is kept here).
const path = require('path');
const { chromium } = require('playwright');
const CASES = [
  ['number on both sides, spaced', '1 1 EXT. HOTEL - NIGHT\nText.\n\n2 2 INT. ROOM - NIGHT\nText.\n\n3 3 INT. CAR - DAY\nText.\n', ['1', '2', '3']],
  ['number glued to heading', '12.INT. ROOM - EVENING\nText.\n\n13.INT. KITCHEN - NIGHT\nText.\n\n13A.EXT. STREET - DAY\nText.\n', ['12', '13', '13A']],
  ['single digits merged (11, 22 ...) then normal', '11   EXT. A - NIGHT\nx\n\n22   INT. B - NIGHT\nx\n\n33   INT. C - DAY\nx\n\n44   INT. D - DAY\nx\n\n66   INT. E - DAY\nx\n\n10   INT. F - DAY\nx\n\n11   INT. G - DAY\nx\n\n12   INT. H - DAY\nx\n', ['1', '2', '3', '4', '6', '10', '11', '12']],
  ['E/I and I.E. variants', '5 E/I. SHOWROOM - NIGHT\nx\n\n6 I.E. HOUSE/ROADS - NIGHT\nx\n', ['5', '6']],
  ['numbered heading without INT/EXT', '26   GROCERY MARKET, CITY - DAY/ NIGHT\nx\n\n27   INT. HOUSE - DAY\nx\n', ['26', '27']],
];
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  let bad = 0;
  for (const [name, text, want] of CASES) {
    const got = await pg.evaluate(t => detectScenes(t).scenes.map(s => s.no), text);
    const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  got ' + JSON.stringify(got)));
  }
  // a scene number used twice is flagged: "comes back" when the place is the same, "used twice" otherwise
  const dup = await pg.evaluate(() => detectScenes('25 EXT. ROADS - NIGHT\nx\n\n26 INT. HOUSE - NIGHT\nx\n\n25. EXT. ROADS - NIGHT\nx\n\n26 EXT. SHOP - DAY\nx\n').scenes.map(s => (s.flags || []).join(' ')));
  const dupOk = dup.length === 4 && !dup[0] && !dup[1] && /comes back to scene 25/.test(dup[2]) && /used twice/.test(dup[3]);
  if (!dupOk) bad++; console.log((dupOk ? 'PASS ' : 'FAIL ') + 'repeated scene numbers are flagged' + (dupOk ? '' : '  got ' + JSON.stringify(dup)));
  // edits are remembered and applied to later AI results
  const learned = await pg.evaluate(() => { P = newProject(); learn('props', 'gun', 'Revolver'); learn('props', 'chair', ''); learn('art', 'gun', 'Toy gun');
    return [applyLessons('props', ['Gun', 'Chair', 'Rope']), applyLessons('art', ['gun']), applyLessons('vehicles', ['gun']), lessonsText()]; });
  const learnOk = JSON.stringify(learned.slice(0, 3)) === JSON.stringify([['Revolver', 'Rope'], ['Toy gun'], ['gun']]) && /Revolver/.test(learned[3]) && /chair/.test(learned[3]);
  if (!learnOk) bad++; console.log((learnOk ? 'PASS ' : 'FAIL ') + 'lessons from edits are applied' + (learnOk ? '' : '  got ' + JSON.stringify(learned)));
  const undone = await pg.evaluate(() => { P = newProject(); learn('props', 'gun', 'Revolver'); learn('props', 'Revolver', 'gun'); return (P.lessons || []).length; });
  if (undone !== 0) bad++; console.log((undone === 0 ? 'PASS ' : 'FAIL ') + 'renaming back forgets the lesson');
  await b.close(); process.exit(bad ? 1 : 0);
})();
