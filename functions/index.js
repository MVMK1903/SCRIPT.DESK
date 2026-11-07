// ScriptDesk server functions: the OTP lock for scripts.
//
// A script set to "Locked with OTP" is encrypted on the device with its own random key. That key lives only here, in
// the otpKeys collection, which the database rules close to every app (only these functions can read it). The app gets
// the key back only after the right one-time code: a 6-digit code sent to the account's email by Gmail, or an SMS
// code checked by Firebase phone sign-in. The app keeps the key in memory while the script is open and forgets it when
// the script is closed, so every opening needs a new code.
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();
const { OPTS, GMAIL_USER, GMAIL_APP_PASSWORD } = require('./config');
const { otpInput } = require('./validate');
Object.assign(exports, require('./auth')); // sign-in gate, safe sign-up, account triggers

const CODE_MINUTES = 5;
const MAX_TRIES = 5;
const MAX_SENDS = 5;            // codes per script per 15 minutes
const SMS_FRESH_SECONDS = 300;  // the SMS check must be this recent

// verified: making a lock or asking for a code needs a verified email (a password account must confirm its address)
function need(req, { verified = false } = {}) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const p = otpInput.safeParse(req.data || {});
  if (!p.success) {
    logger.warn('otp: invalid input', { fields: p.error.issues.map((i) => i.path.join('.')), uid: req.auth.uid });
    throw new HttpsError('invalid-argument', 'That request is not valid.');
  }
  if (verified && req.auth.token.email_verified !== true) throw new HttpsError('failed-precondition', 'Verify your email first. Check your inbox for the link.');
  return { uid: req.auth.uid, pid: p.data.pid, code: p.data.code || '', tok: req.auth.token };
}
const keyRef = (uid, pid) => db.doc(`otpKeys/${uid}_${pid}`);
const codeRef = (uid, pid) => db.doc(`otpCodes/${uid}_${pid}`);
const hash = (salt, code) => crypto.createHash('sha256').update(salt + code).digest();
const mask = (email) => String(email).replace(/^(.)[^@]*(@.*)$/, '$1•••$2');
async function log(uid, t, why) {
  // shows in the app's sign-in activity list
  await db.doc(`users/${uid}/activity/${Date.now()}_server_${t}`).set({ t, at: Date.now(), dev: 'server', dn: 'ScriptDesk server', ...(why ? { why } : {}) });
}
async function keyFor(uid, pid) {
  const k = await keyRef(uid, pid).get();
  if (!k.exists || k.data().owner !== uid) throw new HttpsError('not-found', 'This script has no OTP lock on this account.');
  return k.data().key;
}

// A new lock: makes the script's key. Only once per script, so the key can never be fetched again without a code.
exports.otpCreate = onCall(OPTS, async (req) => {
  const { uid, pid } = need(req, { verified: true });
  const key = crypto.randomBytes(32).toString('base64');
  await db.runTransaction(async (tx) => {
    const s = await tx.get(keyRef(uid, pid));
    if (s.exists) throw new HttpsError('already-exists', 'This script already has an OTP lock.');
    tx.set(keyRef(uid, pid), { owner: uid, pid, key, at: Date.now() });
  });
  await log(uid, 'otplock');
  return { key };
});

// Email: a 6-digit code to the account's own email (never an address sent by the app).
exports.otpSend = onCall({ ...OPTS, secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (req) => {
  const { uid, pid, tok } = need(req, { verified: true });
  await keyFor(uid, pid);
  const email = tok.email;
  if (!email) throw new HttpsError('failed-precondition', 'This account has no email address.');
  const ref = codeRef(uid, pid);
  const prev = (await ref.get()).data() || {};
  const now = Date.now();
  const sends = (prev.sends || []).filter((t) => now - t < 15 * 60000);
  if (sends.length >= MAX_SENDS) throw new HttpsError('resource-exhausted', 'Too many codes asked for. Wait 15 minutes.');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const salt = crypto.randomBytes(16).toString('hex');
  await ref.set({ h: hash(salt, code).toString('hex'), salt, exp: now + CODE_MINUTES * 60000, tries: 0, sends: [...sends, now] });
  const mail = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() } });
  await mail.sendMail({
    from: `ScriptDesk <${GMAIL_USER.value()}>`,
    to: email,
    subject: `ScriptDesk code: ${code}`,
    text: `Your code to open a locked ScriptDesk script is ${code}\n\nIt works for ${CODE_MINUTES} minutes and only once.\n\nIf you did not just try to open a script, someone may know your password: change it in ScriptDesk now.`
  });
  await log(uid, 'otpsend', 'email');
  return { to: mask(email), minutes: CODE_MINUTES };
});

// Email: check the code and hand over the key. Five wrong tries end the code.
exports.otpVerify = onCall(OPTS, async (req) => {
  const { uid, pid, code: raw } = need(req);
  const code = raw.replace(/\D/g, '');
  const ref = codeRef(uid, pid);
  const d = (await ref.get()).data();
  if (!d || Date.now() > d.exp) throw new HttpsError('deadline-exceeded', 'The code has expired. Send a new one.');
  if ((d.tries || 0) >= MAX_TRIES) throw new HttpsError('resource-exhausted', 'Too many wrong codes. Send a new one.');
  const ok = code.length === 6 && crypto.timingSafeEqual(hash(d.salt, code), Buffer.from(d.h, 'hex'));
  if (!ok) {
    await ref.update({ tries: (d.tries || 0) + 1 });
    await log(uid, 'otpfail', 'email');
    throw new HttpsError('permission-denied', 'That code is not right.');
  }
  await ref.delete();
  const key = await keyFor(uid, pid);
  await log(uid, 'otpok', 'email');
  return { key };
});

// SMS: the app has just confirmed an SMS code with Firebase phone sign-in (re-authentication with the registered
// mobile). The fresh sign-in token proves it; then the key is handed over.
exports.otpSms = onCall(OPTS, async (req) => {
  const { uid, pid, tok } = need(req);
  const user = await admin.auth().getUser(uid);
  const fresh = Date.now() / 1000 - Number(tok.auth_time || 0) <= SMS_FRESH_SECONDS;
  if (!user.phoneNumber || tok.phone_number !== user.phoneNumber || tok.firebase.sign_in_provider !== 'phone' || !fresh) {
    await log(uid, 'otpfail', 'sms');
    throw new HttpsError('permission-denied', 'Confirm the SMS code first.');
  }
  const key = await keyFor(uid, pid);
  await log(uid, 'otpok', 'sms');
  return { key };
});
