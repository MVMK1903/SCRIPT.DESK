# ScriptDesk security

How ScriptDesk protects scripts and accounts. Last reviewed 7 Nov 2026 (sign-in protection added the same day).

## Accounts (Firebase)

When the build has a Firebase project (the `FIREBASE_CONFIG` setting), the installed apps and the web app open on a
sign-in screen: **Sign in** or **Create account** with email and password, **Forgot password?**, or **Continue with Google**.

- Passwords are handled by Firebase Authentication, never by ScriptDesk, and never stored on the device.
  New passwords need at least 8 characters with letters and numbers. Firebase slows down repeated wrong passwords.
- **Forgot password** sends Google's reset email. The screen gives the same answer whether or not the email has an
  account, so it cannot be used to find out who uses ScriptDesk.
- **Email verification** is sent when an account is created. Teams need a verified email.
- **Google:** a Google pop-up on the web; on the desktop, the browser sign-in described below, which only passes an
  identity token to Firebase (no Drive access, nothing stored).
- Sessions stay signed in until **Sign out** or **auto sign-out** (below).

## Sign-in protection (server)

Password sign-in and sign-up go through ScriptDesk's server functions (`functions/auth.js`) first.

- **Checked on the server, whatever the app does:** every field is validated with Zod (`functions/validate.js`). Emails are
  checked and lower-cased, never altered; passwords are only length-checked (8 to 128, letters and a number for new ones)
  and never changed, trimmed or logged; names have script blocks, HTML tags and special characters stripped. Anything
  invalid gets the same general answer, and the server log records which kind of input failed (never the value).
- **Same words for every sign-in failure:** "Incorrect email or password". A wrong password, an unknown email, a turned-off
  account, too many tries and a paused account all say exactly this.
- **Rate limit:** at most 10 sign-in tries per network address per minute.
- **Lockout:** 5 wrong passwords in a row pause the account for 15 minutes. While paused, even the right password gets
  the same words, and the app never says "locked". Each wrong try also waits longer (0.5, 1, 2, 4, then 5 seconds).
  The count is taken before the password is checked, so sending many tries at once still only gets five.
  Unknown emails are counted the same way, so the behaviour looks the same for them.
- **Lockout email:** when the account is paused, an email with a password-reset link goes to the address, only if it
  has an account.
- **Password reset** says "If that email is registered, you'll receive a reset link", whatever the address.
- **Sign-up never confirms an email:** a new address gets a "confirm your email" message; an address that already has an
  account gets an "you already have an account" message with a reset link. The app shows the same screen both times.
- **Passwords stay with Firebase.** ScriptDesk does not store or hash passwords (Firebase Authentication uses a salted,
  memory-hard scrypt hash). The server only passes a password to Firebase to check it, and it is never written to a log
  (`scripts/check_logs.py` fails the build if a log call names a password, token, code or link).
- **Verified email:** making an OTP lock, asking for a code, and teams need a verified email.
- **Profile:** when an account is created the server writes `profiles/{uid}` (plan and preferences only, never a password or
  token). The owner can read it and change preferences, but not the plan. When an account is deleted the server removes
  its data, public key and OTP keys (teams the person owns are left for their members).
- **Limits you should know about:** Firebase's own sign-in address is public, so a determined attacker can still call it
  directly (Firebase slows repeated wrong passwords there). The lockout protects sign-in through the app. If the server
  part is not deployed (or cannot be reached), the app falls back to signing in with Firebase directly.
- Anyone can make five wrong tries on a known email and pause that account for 15 minutes. That is the cost of any
  lockout; the lockout email tells the owner, and the pause ends by itself.
- An account made by the sign-up form with someone else's email stays unverified, and the real owner still gets the
  "you already have an account" email with a reset link. Teams and OTP locks need a verified email, and finishing a
  password reset verifies the address.

## End-to-end encrypted vault

- Every new screenplay asks **Where should this live?**: *Just me · private & encrypted*, a *team* (encrypted for the team),
  or *My account · not encrypted*. Existing scripts can be moved from the Projects page.
- Private scripts, team scripts and notepad notes are encrypted **on the device** (AES-256-GCM) before they are saved to
  the device or sent to Firebase. The database only holds unreadable data; the title of a private script is not sent either.
- The vault key is protected by a **vault passphrase** that only the user knows (PBKDF2-SHA-256, 600,000 rounds). ScriptDesk
  can generate a strong one. **If the passphrase is lost, the private scripts and notes cannot be recovered**, by the
  user or by ScriptDesk. The passphrase can be changed while the vault is unlocked.
- The vault unlocks once per session and locks at sign-out. Five wrong passphrases in a row add a growing wait, and
  wrong passphrases appear in the activity log.
- Private and team scripts are never written to the Documents folder as readable files, and their backups are
  passphrase-encrypted `.scriptdesk` files.
- The AI breakdown, translation and other AI features still send scene text to the AI service chosen in Settings.

## Scripts locked with OTP

- **Locked with OTP** is the first choice for a new screenplay (and in Move on the Projects page). The script is
  encrypted on the device (AES-256-GCM) with its own random key. No vault passphrase is involved.
- The key is kept only by ScriptDesk's server functions (`functions/index.js`), in a database area the rules close to every
  app. **Every time the script is opened**, the app asks for a one-time code:
  - **Email:** a 6-digit code to the account's own email, sent from your Gmail. It works for 5 minutes and only once.
    Five wrong codes end it, and at most 5 codes can be asked for in 15 minutes.
  - **SMS:** a code to the mobile number registered in Account & security (Firebase phone verification). SMS works in the
    web app; the desktop app offers the email code (Firebase's SMS check needs a web address).
- After the right code, the server hands the key to the app, which keeps it in memory only while the script is open. Opening
  another script, signing out or closing the app forgets it. After a restart a locked script stays closed until a new code.
- The database and the cloud copy only hold encrypted data, with no title. Opening a locked script needs the internet.
- Codes sent, scripts opened and wrong codes appear in the sign-in activity list.
- If someone has the account password, they could ask for a code, but it goes to your email or phone. If you get a code you
  did not ask for, change the password.

## Teams

- A verified account creates a team and invites people by email. The invited person signs in with that email, unlocks or
  sets up their vault and presses **Join**. The owner's ScriptDesk adds them the next time it is online.
- Each team has its own key. It is handed to each member wrapped with that member's public key (ECDH P-256), so only
  members can open team scripts. The database rules also stop anyone else from reading them.
- **Removing a member changes the team key and re-encrypts the team's scripts**, so the old key no longer opens new
  versions. Copies already on the removed person's devices cannot be taken back.
- Two people editing the same team script between syncs both keep their work: one becomes a "(copy from another
  device)". Editing is not live, character by character.

## Database rules

`firestore.rules` (deploy it, see setup) limits each account to its own data, lets only members read team scripts, only
owners change teams or hand out keys, and only invited, verified emails ask to join.

## Google sign-in without Firebase (Google Drive sync)

- **Required in the installed apps and the web app** once the build has Google sign-in set up (see "Setting up Google sign-in").
  The Claude version uses the Claude account instead. The phone apps do not have Google sign-in yet.
- **Desktop (Windows, Mac):** Google's sign-in for installed apps. The sign-in page opens in the normal browser, and Google
  sends the result to a one-time address on this computer (`127.0.0.1`, random port). PKCE and a random `state` value make
  sure only this app can use the answer. The long-lived refresh token stays in the app's main process, encrypted with the
  system key store (Windows DPAPI, macOS Keychain) through Electron `safeStorage`. The page only gets access tokens that
  expire after about an hour. If the computer has no key store, the app does not save the session and asks again next time.
- **Web app:** Google Identity Services. The access token is kept in memory only and never written to storage. When it
  expires, Drive sync pauses until the user reconnects from the Account window.
- **What Google shares:** name, email, profile photo and ScriptDesk's own hidden folder in Drive
  (`drive.appdata`, a non-sensitive scope). ScriptDesk cannot see any other Drive file or the Google password.
- **Sign out** revokes the token with Google, saves and syncs the work first, and closes the session.
- **Offline:** an account that signed in online within the last 7 days and did not sign out can keep working offline.
  This is written to the sign-in activity log.

## Data on the device

- Each Google account has its own projects on the device (separate storage keys). The projects that were on a device
  before sign-in existed move into the first account that signs in.
- Private and team scripts and notes are stored on the device encrypted with the vault key. Scripts set to
  *My account · not encrypted* are only guarded by the sign-in screen, which is **not encryption**: someone with access to
  the Windows user account or browser profile could read them on disk. Protect the computer itself with a password.
  (The old whole-app passphrase was removed on 4 Nov 2026; the per-script vault replaced it on 7 Nov 2026.)
- AI service keys are stored on the device, per account, and are never sent to Google Drive.

## Google Drive sync

- Every project is one JSON file in the account's hidden app folder. Changes upload a few seconds after saving; Drive is
  checked at start, when the app comes back into view, and every few minutes.
- If a project changed on two devices between syncs, both versions are kept: this device keeps its own, and Drive's
  version is saved as "(copy from another device, date)". Nothing is overwritten silently.
- A project deleted on one device is deleted on the others, unless it was edited there after the last sync.
- Files from Drive are checked for the expected shape before they are used.

## Auto sign-out and activity

- After 30 minutes with no activity (adjustable: 15 minutes to 4 hours, or never) ScriptDesk saves, syncs and signs out.
  It compares real clock time, so a laptop that slept is signed out on wake. A running AI job keeps the session open.
- Sign-ins, sign-outs, automatic sign-outs, offline openings and failed sign-ins are logged with time and device. The log is
  shared through Drive, so sign-ins on other devices show up too. If one is not yours: sign out, remove ScriptDesk at
  https://myaccount.google.com/permissions, and sign in again.

## App hardening

- **Content Security Policy** in the installed apps and the web app: only the page's own scripts (pinned by hash), the
  two library CDNs and Google sign-in can run code. Text in an imported script, PDF, Word file or synced project cannot run
  as code, `eval` is blocked, and plugins (`object`) are off.
- **PDF import** runs pdf.js with `isEvalSupported:false` (the fix for CVE-2024-4367) on top of the policy above.
- **Desktop app (Electron):** upgraded from Electron 31 (no security fixes since early 2025) to Electron 45, which is
  supported. Context isolation, sandbox and web security are on and Node is off in the page. The page can only reach
  three narrow functions (save into Documents/ScriptDesk with a path check, and the Google sign-in calls above). The
  window can never leave the bundled app: web links open in the browser, other link types (`file:`, `smb:`, program
  handlers) are refused, embedded browsers are blocked, and camera, microphone, location and notification requests are
  refused without asking.
- **Spreadsheets** are only written, never read, so the known SheetJS read-side issues do not apply.
- **Cross-origin access (desktop):** the app only grants cross-origin access to its own page (`file://`), never to any other
  origin, for the AI, Firebase and Drive calls it makes.
- **Security headers:** every build writes `www/_headers` (same policy as the page, plus `frame-ancestors 'none'`, HSTS,
  `nosniff`, a referrer policy and a permissions policy). Cloudflare Pages and Netlify apply it; GitHub Pages ignores it
  and cannot set headers, so there only the page's own policy applies and other sites could still frame the page. Put the web
  app behind one of those hosts for the full set.
- **Phone apps:** built with Capacitor 8 (the supported release; 6 had reached end of support) on Node 22, Java 21 and the
  latest Xcode. This update has not been built yet: run the Android build first and check the status bar and keyboard
  spacing before releasing.

## Setting up accounts (Firebase)

1. https://console.firebase.google.com → **Add project** (Google Analytics not needed).
2. **Build → Authentication → Get started.** Turn on **Email/Password** and **Google**. Under *Settings → Authorized
   domains* add `mvmk1903.github.io` for the web app.
3. **Build → Firestore Database → Create database** (production mode, a region near you, for example `asia-south1`).
   Open the **Rules** tab, paste the contents of `firestore.rules`, and **Publish**. Under **Indexes → Single field**, add
   an exemption for collection group `invites`, field `email`, with collection-group scope (or run
   `firebase deploy --only firestore` in this folder).
4. **Project settings → Your apps → Web app (</>)**, register "ScriptDesk", and copy the `firebaseConfig` block.
5. GitHub → repository → Settings → Secrets and variables → Actions → new secret **`FIREBASE_CONFIG`** with that block.
6. For Google sign-in in the **desktop app**, also do the Google Cloud steps below in the same project (Firebase creates
   it in Google Cloud), add the Desktop client ID in Firebase *Authentication → Sign-in method → Google → Safelist client IDs*.

Firebase's free Spark plan covers accounts, the vault, teams and the notepad (50,000 reads and 20,000 writes a day, 1 GB).

### OTP lock (server functions)

The OTP lock needs Firebase's pay-as-you-go **Blaze** plan, because server functions and SMS are not on the free plan.
Normal use stays within Blaze's monthly free allowance (2 million function calls). SMS: the first 10 a day are free, then
about $0.07 each in India. Email codes cost nothing.

1. Firebase console → ⚙ **Usage and billing → Modify plan → Blaze** (add a card; set a budget alert, for example ₹500).
2. **Authentication → Sign-in method → Phone → Enable** (for SMS codes).
3. Gmail that sends the codes: turn on 2-Step Verification for it, then create an **app password** at
   https://myaccount.google.com/apppasswords (16 letters).
4. Google Cloud console (same project) → IAM & Admin → **Service accounts** → create "scriptdesk-deploy" with the roles
   *Firebase Admin*, *Cloud Functions Admin*, *Service Account User*, *Secret Manager Admin*, *Cloud Build Editor* and
   *Artifact Registry Administrator* → Keys → **Add key → JSON**.
5. GitHub → Settings → Secrets and variables → Actions → add `FIREBASE_SERVICE_ACCOUNT` (the whole JSON file),
   `GMAIL_USER` (the Gmail address) and `GMAIL_APP_PASSWORD` (the app password).
6. Actions → **Deploy ScriptDesk server (Firebase)** → Run workflow. It stores the Gmail secrets on the server, gives the
   server the project's web API key (from the `FIREBASE_CONFIG` secret, so that secret must exist first), runs the server
   tests, and deploys the database rules and the functions. The same functions also protect password sign-in and sign-up.

## Setting up Google sign-in without Firebase

1. Google Cloud console → create a project → APIs & Services → enable **Google Drive API**.
2. OAuth consent screen: app name ScriptDesk, user type External, add your email. Scopes: `openid`, `email`, `profile`,
   `.../auth/drive.appdata`. While the app is in "Testing", add each user's Gmail as a test user (up to 100).
3. Credentials → Create OAuth client ID:
   - **Desktop app** → copy the client ID and client secret (Google treats a desktop app's secret as not confidential).
   - **Web application** (only for the web app) → Authorized JavaScript origin: the GitHub Pages address, for example
     `https://mvmk1903.github.io`.
4. GitHub → repository → Settings → Secrets and variables → Actions → add `GOOGLE_DESKTOP_CLIENT_ID`,
   `GOOGLE_DESKTOP_CLIENT_SECRET` and `GOOGLE_WEB_CLIENT_ID`. The next build includes them.

Without these, a build works as before with no sign-in.

## Reporting a problem

Open a private security advisory on the GitHub repository.
