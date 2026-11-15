/* Server sign-in code: a right code sets the otpAuth claim to this sign-in's auth_time; a wrong or missing one does not. */
const Module = require('module'), assert = require('assert'), crypto = require('crypto');
const store = {}, claims = {}; let mailed = null;
const docs = (p) => ({ get: async () => ({ data: () => store[p] }), set: async (v) => { store[p] = v; }, update: async (v) => { Object.assign(store[p], v); }, delete: async () => { delete store[p]; } });
const fsx = { doc: (p) => docs(p), runTransaction: async (fn) => fn({ get: async (r) => r.get(), update: (r, v) => r.update(v), delete: (r) => r.delete() }) };
const mocks = {
  'firebase-functions/v2/https': { onCall: (o, fn) => fn || o, HttpsError: class extends Error { constructor(c, m) { super(m); this.code = c; } } },
  'firebase-functions/logger': {},
  'firebase-admin': { firestore: () => fsx, auth: () => ({ getUser: async (u) => ({ customClaims: claims[u] || {} }), setCustomUserClaims: async (u, c) => { claims[u] = c; } }) },
  nodemailer: { createTransport: () => ({ sendMail: async (m) => { mailed = m; } }) },
  './config': { OPTS: {}, GMAIL_USER: { value: () => 'a@b.c' }, GMAIL_APP_PASSWORD: { value: () => 'x' } }
};
const orig = Module._load; Module._load = function (r, ...a) { return mocks[r] || orig.call(this, r, ...a); };
const m = require('../functions/loginotp.js');
(async () => {
  const req = (code) => ({ auth: { uid: 'u1', token: { email: 'me@x.co', auth_time: 1000 } }, data: { code } });
  await m.loginOtpSend(req());
  const code = /code is (\d{6})/.exec(mailed.text)[1];
  await assert.rejects(m.loginOtpVerify(req(code === '000000' ? '111111' : '000000')), /not right/);
  assert.strictEqual(claims.u1, undefined, 'wrong code must not set the claim');
  assert.deepStrictEqual(await m.loginOtpVerify(req(code)), { ok: true });
  assert.strictEqual(claims.u1.otpAuth, 1000);
  await assert.rejects(m.loginOtpVerify(req(code)), /expired/);
  await assert.rejects(m.loginOtpVerify({ data: { code } }), /Sign in/);
  console.log('PASS login otp');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
