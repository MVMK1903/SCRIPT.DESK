// ScriptDesk server functions: the OTP lock for scripts.
//
// A script set to "Locked with OTP" is encrypted on the device with its own random key. That key lives only here, in
// the otpKeys collection, which the database rules close to every app (only these functions can read it). The app gets
// the key back only after the right one-time code: a 6-digit code sent to the account's email by Gmail, or an SMS
// code checked by Firebase phone sign-in. The app keeps the key in memory while the script is open and forgets it when
// the script is closed, so every opening needs a new code.
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

initializeApp();
const db = getFirestore();
const { OPTS, GMAIL_USER, GMAIL_APP_PASSWORD } = require('./config');
const { otpInput } = require('./validate');
Object.assign(exports, require('./auth')); // sign-in gate, safe sign-up, account triggers
Object.assign(exports, require('./loginotp')); // one-time code on every sign-in
Object.assign(exports, require('./totp')); // authenticator app + backup codes for the sign-in code

const CODE_MINUTES = 5;
const MAX_TRIES = 5;
const MAX_ACCOUNT_SENDS = 60;
const MAX_SENDS = 5;            // codes per script per 15 minutes

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

async function issueScriptCode(uid, pid, channel = 'email') {
  const ref = codeRef(uid, pid);
  const accountRef = db.doc(`otpSendLimits/${uid}`);
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const salt = crypto.randomBytes(16).toString('hex');

  await db.runTransaction(async (tx) => {
    const prev = (await tx.get(ref)).data() || {};
    const account = (await tx.get(accountRef)).data() || {};
    const now = Date.now();

    const sends = (prev.exp === 0 && prev.h === ''
      ? [] : (prev.sends || [])).filter(
      (t) => now - t < 15 * 60000
    );

    const accountSends = (account.sends || []).filter(
      (t) => now - t < 60 * 60000
    );

    if (accountSends.length >= MAX_ACCOUNT_SENDS) {
      throw new HttpsError(
        'resource-exhausted',
        'Account security limit reached. Please try again later.'
      );
    }

    if (sends.length >= MAX_SENDS) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many codes asked for. Wait 15 minutes.'
      );
    }

    tx.set(ref, {
      h: hash(salt, code).toString('hex'),
      salt,
      exp: now + CODE_MINUTES * 60000,
      tries: 0,
      channel,
      sends: [...sends, now]
    });

    tx.set(accountRef, {
      sends: [...accountSends, now]
    });
  });
  return code;
}

// Email: a 6-digit code to the account's own email (never an address sent by the app).
exports.otpSend = onCall({ ...OPTS, secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (req) => {
  const { uid, pid, tok } = need(req, { verified: true });
  await keyFor(uid, pid);
  const email = tok.email;
  if (!email) throw new HttpsError('failed-precondition', 'This account has no email address.');
  const code = await issueScriptCode(uid, pid);
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    if (
      process.env.GCLOUD_PROJECT !== 'demo-scriptdesk' ||
      !email.endsWith('@example.invalid')
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Only dummy accounts are allowed in this OTP test.'
      );
    }

    const fs = require('node:fs/promises');
    const path = require('node:path');

    await fs.writeFile(
      path.join(__dirname, '.otp-test-outbox.json'),
      JSON.stringify({ pid, to: email, code }),
      { mode: 0o600 }
    );
  } else {
  const mail = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() } });
  await mail.sendMail({
    from: `ScriptDesk <${GMAIL_USER.value()}>`,
    to: email,
    subject: `ScriptDesk code: ${code}`,
    text: `Your code to open a locked ScriptDesk script is ${code}\n\nIt works for ${CODE_MINUTES} minutes and only once.\n\nIf you did not just try to open a script, someone may know your password: change it in ScriptDesk now.`
  });
  }
  await log(uid, 'otpsend', 'email');
  return { to: mask(email), minutes: CODE_MINUTES };
});

// Email: check the code and hand over the key. Five wrong tries end the code.
exports.otpVerify = onCall(OPTS, async (req) => {
  const { uid, pid, code: raw } = need(req, { verified: true });
  const code = raw.replace(/\D/g, '');
  const ref = codeRef(uid, pid);
  // The try is counted and the code checked in one transaction, so many requests at once still only get MAX_TRIES.
  const verdict = await db.runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data();
    if (!d || Date.now() > d.exp) return 'expired';
    if ((d.tries || 0) >= MAX_TRIES) return 'tries';
    const ok = code.length === 6 && crypto.timingSafeEqual(hash(d.salt, code), Buffer.from(d.h, 'hex'));
    if (ok) tx.update(ref, {
      h: '',
      salt: '',
      exp: 0,
      tries: 0,
      sends: []
    });
    else tx.update(ref, { tries: (d.tries || 0) + 1 });
    return (ok ? 'ok' : 'wrong') +
      (d.channel === 'sms' ? '-sms' : '');
  });
  if (verdict === 'expired') throw new HttpsError('deadline-exceeded', 'The code has expired. Send a new one.');
  if (verdict === 'tries') throw new HttpsError('resource-exhausted', 'Too many wrong codes. Send a new one.');
  if (verdict === 'wrong' || verdict === 'wrong-sms') {
    await log(uid, 'otpfail', verdict === 'wrong-sms' ? 'sms' : 'email');
    throw new HttpsError('permission-denied', 'That code is not right.');
  }
  const key = await keyFor(uid, pid);
  await log(uid, 'otpok', verdict === 'ok-sms' ? 'sms' : 'email');
  return { key };
});


// SMS: generate a screenplay-specific one-time code.
// Local simulation only until a real provider is configured.
exports.otpSendSms = onCall(OPTS, async (req) => {
  const { uid, pid, tok } = need(req, { verified: true });

  if (
    process.env.FUNCTIONS_EMULATOR !== 'true' ||
    process.env.GCLOUD_PROJECT !== 'demo-scriptdesk' ||
    !String(tok.email || '').endsWith('@example.invalid')
  ) {
    throw new HttpsError(
      'failed-precondition',
      'SMS delivery is not configured yet.'
    );
  }

  const user = await getAuth().getUser(uid);
  const phone = user.phoneNumber;

  if (!phone || !/^\+165055501\d{2}$/.test(phone)) {
    throw new HttpsError(
      'failed-precondition',
      'Register a dummy test phone number first.'
    );
  }

  await keyFor(uid, pid);

  const code = await issueScriptCode(uid, pid, 'sms');

  const fs = require('node:fs/promises');
  const path = require('node:path');

  await fs.writeFile(
    path.join(__dirname, '.otp-test-outbox.json'),
    JSON.stringify({
      pid,
      to: phone,
      channel: 'sms',
      code
    }),
    { mode: 0o600 }
  );

  await log(uid, 'otpsend', 'sms');

  return {
    to: phone.slice(0, 3) + '*****' + phone.slice(-4),
    minutes: CODE_MINUTES
  };
});

// Disable the old reusable phone-token unlock endpoint.
exports.otpSms = onCall(OPTS, async (req) => {
  need(req);

  throw new HttpsError(
    'failed-precondition',
    'Request a fresh screenplay SMS code instead.'
  );
});
