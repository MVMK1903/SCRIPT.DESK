# ScriptDesk

AI film script breakdown for film and web-series production teams. Import a screenplay in any language or format (English, Telugu, Tinglish, Hindi; Word, PDF, Final Draft, Fountain, text, scanned pages) and get every production report as Excel-style sheets you can edit and download as formatted Excel and PDF.

**Reports:** Full script · Story structure · Character profiles · Single line order · Location-wise and artist-wise single line orders · Stunt / fight single line order · No. of locations · No. of artists · Location-wise and artist-wise scene lists · Script breakdown · Special identification · Costume continuity · Art / props. Every edit updates all sheets and is logged with sheet, date and time.

## Apps

| Device | How to get it | Offline |
|---|---|---|
| **Any device (recommended)** | Open the web app link, then **Install** (Windows/Mac/Android Chrome or Edge) or **Share → Add to Home Screen** (iPhone/iPad Safari) | Yes, after first open |
| **Windows** | `ScriptDesk-Setup-x.y.z.exe` from Actions / Releases | Yes |
| **Mac** | `ScriptDesk-x.y.z-mac.dmg` from Actions / Releases | Yes |
| **Android** | `ScriptDesk-android.apk` from Actions / Releases | Yes |
| **iPhone / iPad** | `ScriptDesk-iphone-unsigned.ipa` from Releases, installed with **xtool** from Windows, Linux or Mac (below); or the web app (above) | Yes |
| **Using your Claude subscription (no API key)** | Open the ScriptDesk link inside Claude (claude.ai or the Claude app). Separate apps can only use Claude through an API key. | No (needs internet) |

## AI: free options

Only the AI steps (finding scenes, breakdown, character profiles, story structure, reading scanned pages) use an AI service. Choose one in **Settings → AI service**:

| Service | Cost | Internet | Best for |
|---|---|---|---|
| **Ollama** (on your computer) | Free | Not needed | Confidential scripts; fully private and offline. Needs a decent laptop (16 GB RAM recommended). |
| **Google Gemini** | Free tier (daily limits) | Needed | Best free quality, good with Telugu and Tinglish. Free-tier data may be used by Google, so avoid for confidential scripts. |
| **Groq** | Free tier | Needed | Very fast; small per-minute limits, so long scripts take longer. |
| **OpenRouter** (`:free` models) | Free models (~50 requests/day) | Needed | Trying different open models. |
| **Claude** (Anthropic) | Paid per use | Needed | Highest quality. |
| **Other** (LM Studio, vLLM…) | Free if self-hosted | Depends | Any OpenAI-compatible server. |

**Quick start (free):**
- **Gemini:** get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Settings → Google Gemini → paste key → **Load models** → pick a Flash model → **Save** → **Test**.
- **Ollama:** install from [ollama.com](https://ollama.com/download), run `ollama pull qwen3:8b` (or another model your computer can handle) → Settings → Ollama → **Load models** → pick it → **Save** → **Test**. Works in the desktop app directly; for the web app set `OLLAMA_ORIGINS=*` once and restart Ollama.

ScriptDesk sends smaller pieces and waits automatically when a free tier's limit is reached. Keys are stored only on your device. Projects are saved on the device; use **Projects → Backup** to move a project to another device (open it with **Import script**).

## What it costs (everything else is free and open source)

| Part | Cost |
|---|---|
| App, Excel/PDF/Word/PDF-import libraries (SheetJS, jsPDF, pdf.js, Mammoth), Electron, Capacitor | Free, open source |
| GitHub repo, Actions builds, Pages hosting (public repo) | Free |
| Windows .exe, Mac .dmg, Android APK from Releases | Free (unsigned: install warnings, see below) |
| iPhone / iPad | Free via the web app (Add to Home Screen). A native App Store app needs an Apple Developer account ($99/yr). |
| Optional: Play Store listing $25 once · Windows code-signing certificate · Apple notarization | Paid, only if you want store listings or no warnings |

## One-time GitHub setup

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.** The web app is then published at `https://mvmk1903.github.io/SCRIPT.DESK/` on every push.
2. Push to `main`. The **Build ScriptDesk apps** workflow (Actions tab) builds the web app, Windows installer, Mac app and Android APK. Download them from the run's **Artifacts**.
3. To publish a release with the installers attached: `git tag v1.0.0 && git push origin v1.0.0`.

### Notes on installers
- **Windows:** unsigned, so SmartScreen may show "Windows protected your PC" → **More info → Run anyway**. A code-signing certificate removes this.
- **Mac:** unsigned, so the first time **right-click the app → Open → Open**. An Apple Developer ID ($99/yr) with notarization removes this.
- **Android APK:** allow "Install unknown apps" for your browser or Files app. For the Play Store, create a signed release bundle (`./gradlew bundleRelease`) with your upload key and a Google Play developer account ($25 once).
- **iPhone / iPad with xtool (no Mac, no Xcode download needed):** every release includes `ScriptDesk-iphone-unsigned.ipa`, built by GitHub. [xtool](https://github.com/xtool-org/xtool) signs it with your Apple ID and installs it over USB.
  1. Install xtool: Windows → install WSL and USBIPD first (see xtool's Linux/Windows guide); Linux → `usbmuxd`; Mac → see xtool's macOS guide. Then download `xtool` from its releases page.
  2. `xtool auth login` — choose **Password** for a free Apple ID (a spare Apple ID is safer, as this uses Apple's private sign-in), or **API Key** if you have a paid developer account.
  3. Connect the iPhone by USB, unlock it and tap **Trust**. Check with `xtool devices`.
  4. `xtool install ScriptDesk-iphone-unsigned.ipa`
  5. On the iPhone: Settings → General → VPN & Device Management → trust your Apple ID; turn on Settings → Privacy & Security → Developer Mode if asked.
  With a free Apple ID the app stops opening after 7 days: run step 4 again (your projects stay on the phone). A paid account lasts a year.
- **iPhone / iPad app in Xcode (Mac):**
  ```
  python3 scripts/build.py --vendor
  cd mobile && npm install && npm run prepare-web
  npx cap add ios && npm run icons -- --ios && npx cap sync ios
  npx cap open ios
  ```
  In Xcode choose your team (a free Apple ID installs on your own iPhone for 7 days; the App Store needs an Apple Developer account), then Run.

## Project layout

```
src/app.html          the app (same source as the ScriptDesk link inside Claude)
scripts/build.py      builds www/index.html; --vendor bundles libraries for full offline use
www/                  installable web app (manifest, service worker, icons)
desktop/              Windows and Mac app (Electron)
mobile/               Android and iOS app (Capacitor)
.github/workflows/    automatic builds
docs/requirements.md  agreed requirements
```

## Local development

```
python3 scripts/build.py --vendor
cd www && python3 -m http.server 8000      # web app at http://localhost:8000
cd desktop && npm install && npm start     # desktop app
```
