'use strict';
// Helpers shared by the sign-in code functions (email/SMS code and authenticator app).
const { HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const db = () => getFirestore();
const signedIn = (req) => { if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.'); return req.auth; };
async function log(uid, t, why) {
  await db().doc(`users/${uid}/activity/${Date.now()}_server_${t}`).set({ t, at: Date.now(), dev: 'server', dn: 'ScriptDesk server', ...(why ? { why } : {}) });
}
// Mark this sign-in as code-checked. The claim holds the sign-in time (auth_time) of the token that passed, so a later
// sign-in with only a password has a different auth_time and does not match until its own code is entered.
async function markOtp(tok) {
  const u = await getAuth().getUser(tok.uid);
  await getAuth().setCustomUserClaims(tok.uid, { ...(u.customClaims || {}), otpAuth: Number(tok.token.auth_time) });
}
module.exports = { db, signedIn, log, markOtp };
