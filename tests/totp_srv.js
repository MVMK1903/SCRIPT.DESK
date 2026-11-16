'use strict';
// Runs the real server functions (functions/totp.js, loginotp.js) with stand-in Firebase, for the browser test.
// Reads one JSON request per line on stdin, answers one JSON line on stdout.
const h = require('../functions/test/helpers');
const t = require('../functions/totp');
const l = require('../functions/loginotp');
const fns = { ...t, ...l };
const AUTH = { uid: 'u1', token: { email: 'film@maker.com', email_verified: true, auth_time: 7000, firebase: { sign_in_provider: 'password' } } };
require('readline').createInterface({ input: process.stdin }).on('line', async (line) => {
  const m = JSON.parse(line);
  const out = { id: m.id };
  try {
    if (m.name === '__tick') { h.state.now += m.data.ms; out.v = true; }
    else if (m.name === '__claims') out.v = h.claims.get('u1') || null;
    else if (m.name === '__mails') out.v = h.mails.length;
    else out.v = await fns[m.name]({ data: m.data || {}, auth: AUTH, rawRequest: { ip: '1.2.3.4' } });
  } catch (e) { out.err = e.code || 'internal'; out.msg = e.message; }
  process.stdout.write(JSON.stringify(out) + '\n');
});
