// Vault passphrase (KDF) hardening test. Run: NODE_PATH=$(npm root -g) node tests/vault_kdf.test.js
// Tests the pure wrap/unwrap core (no Firebase): round-trip, wrong passphrase, back-compat with a 600k vault,
// and that an old vault can be re-wrapped at the new work factor and still opens.
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const raw = rnd(32), pass = 'correct horse battery staple';
    const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    const out = {};
    // new vaults use the raised count and carry the kdf name
    const c = await svWrapKey(raw, pass, SV_ITER);
    out.newIter = c.iter === SV_ITER && c.kdf === SV_KDF;
    out.roundTrip = eq(await svUnwrapKey(c, pass), raw);
    // wrong passphrase must throw, not return garbage
    try { await svUnwrapKey(c, 'wrong pass'); out.wrongThrows = false; } catch (e) { out.wrongThrows = true; }
    // back-compat: a vault wrapped at the OLD count (600k, no kdf field) still opens
    const old = await svWrapKey(raw, pass, 600000); delete old.kdf;
    out.oldOpens = eq(await svUnwrapKey(old, pass), raw);
    out.oldNeedsUpgrade = (old.iter || 0) < SV_ITER || old.kdf !== SV_KDF;
    // migrating the old vault (re-wrap with the key in hand) keeps the SAME key and opens with the same passphrase
    const migrated = Object.assign({}, old, await svWrapKey(await svUnwrapKey(old, pass), pass, SV_ITER));
    out.migratedIter = migrated.iter === SV_ITER && migrated.kdf === SV_KDF;
    out.migratedOpens = eq(await svUnwrapKey(migrated, pass), raw);
    out.saltChanged = old.salt !== migrated.salt; // fresh salt on re-wrap
    return out;
  });
  const checks = Object.entries(r);
  let bad = 0;
  for (const [k, v] of checks) { if (!v) bad++; console.log((v ? 'PASS ' : 'FAIL ') + k); }
  await b.close(); process.exit(bad ? 1 : 0);
})();
