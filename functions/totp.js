'use strict';
// Authenticator app (TOTP, RFC 6238) as another way to pass the sign-in code, with one-time backup codes.
// The secret lives only in a database area that the rules close to every app. A right code marks the sign-in exactly
// like the email and SMS codes do (markOtp), so the rules and the app need no other change.
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const crypto = require('crypto');
const { OPTS } = require('./config');
const { db, signedIn, log, markOtp } = require('./common');

const STEP = 30;                  // seconds per code
const WINDOW = 1;                 // accept one step either side (clock drift)
const MAX_FAILS = 5;              // wrong codes in FAIL_MINUTES pause the check
const FAIL_MINUTES = 15;
const PENDING_MINUTES = 10;
const BACKUPS = 8;
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const live = (uid) => db().doc(`totp/${uid}`);
const pending = (uid) => db().doc(`totpPending/${uid}`);

const b32encode = (buf) => { let bits = '', out = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0'); for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)]; return out; };
const b32decode = (s) => { let bits = ''; for (const c of s) bits += B32.indexOf(c).toString(2).padStart(5, '0'); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
function hotp(secret, counter) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, '0');
}
const stepNow = () => Math.floor(Date.now() / 1000 / STEP);
// the step whose code matches (within the window) and is newer than the last one used, or -1
function matchStep(secret, code, lastStep) {
  const now = stepNow();
  for (let s = now - WINDOW; s <= now + WINDOW; s++) {
    const ok = crypto.timingSafeEqual(Buffer.from(hotp(secret, s)), Buffer.from(code));
    if (ok && s > (lastStep || 0)) return s;
  }
  return -1;
}
const bhash = (salt, code) => crypto.createHash('sha256').update(salt + code).digest('hex');
function newBackups() {
  const codes = [], salt = crypto.randomBytes(16).toString('hex');
  for (let i = 0; i < BACKUPS; i++) { const raw = b32encode(crypto.randomBytes(7)).slice(0, 10).toLowerCase(); codes.push(raw.slice(0, 5) + '-' + raw.slice(5)); }
  return { codes, salt, hashes: codes.map((c) => bhash(salt, c.replace('-', ''))) };
}
// "123456" (app code) or "abcde-fghij" (backup code), as typed
function parseCode(v) {
  const s = String(v || '').toLowerCase().replace(/[\s-]/g, '');
  if (/^\d{6}$/.test(s)) return { kind: 'app', v: s };
  if (/^[a-z2-7]{10}$/.test(s)) return { kind: 'backup', v: s };
  return null;
}
const mustHave = (d) => { if (!d) throw new HttpsError('failed-precondition', 'The authenticator app is not set up.'); };

// Check an app or backup code against the saved secret, all inside one transaction so many tries at once still only get five.
async function check(uid, input) {
  const p = parseCode(input);
  const verdict = await db().runTransaction(async (tx) => {
    const ref = live(uid);
    const d = (await tx.get(ref)).data();
    if (!d) return 'off';
    const now = Date.now();
    const fails = (d.fails || []).filter((t) => now - t < FAIL_MINUTES * 60000);
    if (fails.length >= MAX_FAILS) return 'locked';
    let ok = false, patch = {};
    if (p && p.kind === 'app') { const s = matchStep(d.secret, p.v, d.lastStep); if (s >= 0) { ok = true; patch = { lastStep: s }; } }
    if (p && p.kind === 'backup') {
      const h = bhash(d.salt, p.v);
      const i = (d.backups || []).findIndex((x) => crypto.timingSafeEqual(Buffer.from(x, 'hex'), Buffer.from(h, 'hex')));
      if (i >= 0) { ok = true; patch = { backups: d.backups.filter((_, j) => j !== i) }; }
    }
    tx.update(ref, ok ? { ...patch, fails: [] } : { fails: [...fails, now] });
    return ok ? (p.kind === 'backup' ? 'backup' : 'ok') : 'wrong';
  });
  if (verdict === 'off') throw new HttpsError('failed-precondition', 'The authenticator app is not set up.');
  if (verdict === 'locked') { await log(uid, 'totplock'); throw new HttpsError('resource-exhausted', 'Too many wrong codes. Try again in 15 minutes, or use the email code.'); }
  if (verdict === 'wrong') { await log(uid, 'totpfail'); throw new HttpsError('permission-denied', 'That code is not right.'); }
  return verdict;
}

exports.totpStatus = onCall(OPTS, async (req) => {
  const uid = signedIn(req).uid;
  const d = (await live(uid).get()).data();
  return { on: !!d, backups: d ? (d.backups || []).length : 0 };
});

exports.totpSetup = onCall(OPTS, async (req) => {
  const tok = signedIn(req); const uid = tok.uid;
  if (!tok.token.email_verified) throw new HttpsError('failed-precondition', 'Verify your email address first.');
  if ((await live(uid).get()).data()) throw new HttpsError('already-exists', 'The authenticator app is already on.');
  const secret = b32encode(crypto.randomBytes(20));
  await pending(uid).set({ secret, exp: Date.now() + PENDING_MINUTES * 60000, tries: 0 });
  const label = encodeURIComponent('ScriptDesk:' + (tok.token.email || uid));
  return { secret, uri: `otpauth://totp/${label}?secret=${secret}&issuer=ScriptDesk&algorithm=SHA1&digits=6&period=${STEP}` };
});

exports.totpConfirm = onCall(OPTS, async (req) => {
  const uid = signedIn(req).uid;
  const p = parseCode(req.data && req.data.code);
  const out = await db().runTransaction(async (tx) => {
    const d = (await tx.get(pending(uid))).data();
    if (!d || Date.now() > d.exp) return { v: 'expired' };
    if (d.tries >= 10) return { v: 'tries' };
    const s = p && p.kind === 'app' ? matchStep(d.secret, p.v, 0) : -1;
    if (s < 0) { tx.update(pending(uid), { tries: d.tries + 1 }); return { v: 'wrong' }; }
    const b = newBackups();
    tx.set(live(uid), { secret: d.secret, salt: b.salt, backups: b.hashes, lastStep: s, fails: [], at: Date.now() });
    tx.delete(pending(uid));
    return { v: 'ok', codes: b.codes };
  });
  if (out.v === 'expired') throw new HttpsError('deadline-exceeded', 'Start the setup again.');
  if (out.v === 'tries') throw new HttpsError('resource-exhausted', 'Too many wrong codes. Start the setup again.');
  if (out.v === 'wrong') throw new HttpsError('permission-denied', 'That code is not right. Check the time on your phone.');
  await log(uid, 'totpon');
  return { codes: out.codes };
});

exports.totpVerify = onCall(OPTS, async (req) => {
  const tok = signedIn(req); const uid = tok.uid;
  const kind = await check(uid, req.data && req.data.code);
  await markOtp(tok);
  await log(uid, 'loginok', kind === 'backup' ? 'backup code' : 'authenticator');
  const left = ((await live(uid).get()).data() || {}).backups || [];
  return { ok: true, backups: left.length };
});

exports.totpDisable = onCall(OPTS, async (req) => {
  const uid = signedIn(req).uid;
  mustHave((await live(uid).get()).data());
  await check(uid, req.data && req.data.code);   // needs a right code to turn it off
  await live(uid).delete();
  await log(uid, 'totpoff');
  return { ok: true };
});

exports.totpNewBackups = onCall(OPTS, async (req) => {
  const uid = signedIn(req).uid;
  await check(uid, req.data && req.data.code);   // an app code only counts as proof; a backup code is spent
  const b = newBackups();
  await live(uid).update({ salt: b.salt, backups: b.hashes });
  await log(uid, 'totpbackups');
  return { codes: b.codes };
});

