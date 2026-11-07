'use strict';
// Server-side input checks (Zod). The app checks the same things for the user's convenience, but nothing here trusts it.
//
// Rules:
//  - Emails are checked and lower-cased, never "cleaned": a changed address would be a different account.
//  - Passwords are checked for length only and are never altered, trimmed or logged.
//  - Names are cleaned: script/style blocks, HTML tags and special characters are stripped.
const { z } = require('zod');

const email = z.string().trim().toLowerCase().min(3).max(254).email();

// Sign-in: any existing password is allowed (older accounts may predate today's rules).
const loginPassword = z.string().min(1).max(128);

// Sign-up: at least 8 characters with a letter and a number (Firebase's own limit is 4 KB, we stop at 128).
const newPassword = z.string().min(8).max(128).regex(/[A-Za-z]/).regex(/\d/);

const cleanName = (s) =>
  s
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{M}\p{N} .'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const displayName = z.string().max(200).transform(cleanName).pipe(z.string().max(60));

const scriptId = z.string().regex(/^[\w-]{1,60}$/);

const loginInput = z.object({ email, password: loginPassword }).strict();
const signupInput = z.object({ email, password: newPassword, name: displayName.optional() }).strict();
const otpInput = z.object({ pid: scriptId, code: z.string().max(32).optional() }).passthrough();

module.exports = { loginInput, signupInput, otpInput, cleanName };
