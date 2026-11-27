const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  if (!process.env.F) {
    throw new Error('Provide an isolated test build using F');
  }

  const b = await chromium.launch();

  try {
    const pg = await b.newPage();
    const errs = [];

    pg.on('pageerror', e => errs.push(e.message));

    await pg.addInitScript(() => {
      window.__FB_FAKE = {
        waitUser: async () => null,
        reload: async () => ({}),
        signOut: async () => {},
        call: async (name, data) => {
          if (name !== 'otpCreate') {
            throw new Error('Unexpected test function: ' + name);
          }

          window.testOtpCreates =
            (window.testOtpCreates || 0) + 1;

          const bytes = crypto.getRandomValues(
            new Uint8Array(32)
          );

          return {
            key: btoa(String.fromCharCode(...bytes))
          };
        }
      };
    });

    await pg.goto('file://' + process.env.F);
    await pg.waitForTimeout(1500);

    const result = await pg.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));

      document.querySelectorAll('#galock')
        .forEach(e => e.remove());

      GA.user = null;
      openImport();

      const text =
        'A liquor truck unloads crates outside the local bar.\n\n' +
        'Church volunteers tie white festival flags across the streets.';

      document.getElementById('iText').value = text;
      document.getElementById('iGo').click();

      await wait(800);

      const denied = document.getElementById('iNote').textContent;

      closeModal();

      // Simulated authenticated account, for this test only.
      GA.fb = true;
      GA.user = {
        sub: 'test-director',
        email: 'director@example.invalid',
        name: 'Test Director',
        verified: true,
        phone: ''
      };

      // Disable cloud synchronization in this unit test.
      csSoon = () => {};

      openImport();

      document.getElementById('iText').value = text;
      document.getElementById('iSpace').value = 'o';

      document.getElementById('iGo').click();
      await wait(800);

      const note = document.getElementById('iNote').textContent;

      document.getElementById('iGo').click();
      await wait(1500);

      const stored = P ? await IDB.get('p.' + P.id) : null;

      return {
        denied,
        note,
        scenes: P ? P.scenes.length : -1,
        space: P ? P.space : null,
        otpCreates: window.testOtpCreates || 0,
        encrypted: !!(stored && stored.__sd && stored.ct)
      };
    });

    console.log(result);

    assert.match(result.denied, /Sign in/);
    assert.match(result.note, /No scene headings/);
    assert.equal(result.scenes, 1);
    assert.equal(result.space, 'o');
    assert.equal(result.otpCreates, 1);
    assert.equal(result.encrypted, true);
    assert.deepEqual(errs, []);

    console.log('PASS authenticated OTP-protected import');
  } finally {
    await b.close();
  }
})().catch(e => {
  console.error('FAIL:', e.message);
  process.exitCode = 1;
});
