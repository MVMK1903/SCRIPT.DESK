# ScriptDesk

AI film script breakdown for film and web-series production teams. Works with any AI: open-source models on your own computer (Ollama, LM Studio, Jan, llama.cpp, vLLM), free online services (Ollama Cloud, NVIDIA, Gemini, Groq, OpenRouter, Cloudflare), paid ones (Claude, OpenAI, DeepSeek, Mistral and more), or none at all. Import a screenplay in any language or format (English, Telugu, Tinglish, Hindi; Word, PDF, Final Draft, Fountain, text, scanned pages) and get every production report as Excel-style sheets you can edit and download as formatted Excel and PDF.

**Reports:** Full script · Story structure · Character profiles · Single line order · Location-wise and artist-wise single line orders · Stunt / fight single line order · No. of locations · No. of artists · Location-wise and artist-wise scene lists · Script breakdown · Special identification · Costume continuity · Art / props. Every edit updates all sheets and is logged with sheet, date and time.

## Write scripts (Celtx-style)

**Write script** is a screenplay editor in the standard industry layout: US Letter, Courier 12 pt, scene numbers in the left margin, headings and action at 1.5", character names at 3.5", dialogue in a 3.5"-wide column, transitions on the right. It is the same layout as a Celtx or Final Draft shooting script.

- **Enter** moves to the next element: Scene heading → Action → Character → Dialogue → Action. **Tab** changes the element, and on a filled character or dialogue line it adds a parenthetical. **Ctrl+1…7** picks an element. On phones, tap the element buttons.
- Auto-complete for INT./EXT., locations, DAY/NIGHT and character names.
- Scene list, page count and page breaks.
- Title page, undo and redo.
- Saves on the device as you type. Inside Claude it also syncs to your account.
- Download as **PDF**, **Final Draft (.fdx)** (opens in Celtx, Final Draft, WriterDuet, Fade In), **Fountain** or **text**. Open .fdx, .fountain, .txt, .docx or .pdf scripts to revise them.
- **Update breakdown** sends the script to every report: changed scenes are marked, new scenes added, and artists picked up from the dialogue. Scene numbers then lock, so a new scene between 5 and 6 becomes 5A.

## Apps

| Device | How to get it | Offline |
|---|---|---|
| **Any device (recommended)** | Open the web app link, then **Install** (Windows/Mac/Android Chrome or Edge) or **Share → Add to Home Screen** (iPhone/iPad Safari) | Yes, after first open |
| **Windows** | `ScriptDesk-Setup-x.y.z.exe` from Actions / Releases | Yes |
| **Mac** | `ScriptDesk-x.y.z-mac.dmg` from Actions / Releases | Yes |
| **Android** | `ScriptDesk-android.apk` from Actions / Releases | Yes |
| **iPhone / iPad** | `ScriptDesk-iphone-unsigned.ipa` from Releases, installed with **xtool** from Windows, Linux or Mac (below); or the web app (above) | Yes |
| **Using your Claude subscription (no API key)** | Open the ScriptDesk link inside Claude (claude.ai or the Claude app). Separate apps can only use Claude through an API key. | No (needs internet) |

## Shooting: shot division, schedule, shoot order, day out of days, call sheet

A **Shooting** section in the menu (new in v1.7.0). Nothing in the other reports changes.

- **Shot division:** AI suggests a shot list for every scene (size, angle, movement, lens, what we see, cast, notes). Scene numbers stay exactly as in the script; shots are numbered from them (14B-1, 14B-2). Add, edit, reorder or delete any shot.
- **Shooting schedule:** "Plan with AI" groups scenes by location, day/night, cast and length, following your notes (actor dates, location availability). "Quick plan (no AI)" works offline. Drag scenes between days, add days off and travel days, fix dates; weekly day off and pages-per-day target in Plan settings.
- **Shoot order:** each day's scenes in order with times. "Fill times (no AI)" spreads the day by page length around lunch; AI can suggest order and times using sunrise and sunset.
- **Day out of days:** each artist's SW / W / WF / H / T days, built from the schedule. Click a cell to change it.
- **Call sheet:** one per shoot day, filled from the schedule and breakdown: scenes, cast, crowd, requirements, department call times, crew list, advance schedule, and sunrise and sunset worked out on the device for your shoot city. Type over anything.

Every page exports to Excel and PDF and is included in "Download all".

- **Camera & equipment** (v1.8.0): researched suggestions of cameras, lenses and lights used on recent Indian and international films (RRR, Baahubali, Kalki 2898 AD, Pushpa 2, Mission: Impossible 7, Civil War and 2025–26 festival surveys), grouped by need: day exteriors, night and low light, action and stunts, slow motion, aerial, handheld and tight spaces, VFX, songs, lower budget. Each item has its source. "For each scene" suggests camera, lenses and lights per scene (rules without AI, or "Suggest with AI"), and "Our equipment list" holds your own kit, starting from a standard kit.
- **For this script** (v1.9.0): the camera package this script needs (main, second and high-speed cameras, drone, lenses, lights, camera support and grip), worked out from its scenes, or "Recommend with AI". Choose the release: theatrical, Netflix original, Amazon Prime Video original or other OTT. For Netflix the main cameras come from the 2026 Netflix approved list (shown in full, with the 90% rule); for Prime Video it explains the native 4K delivery rule. Grip and support now include gimbal, Steadicam, track and trolley, slider, Jimmy Jib, Technocrane, Russian Arm, rope camera (cable cam), car rigs and hi-hat.
- **Equipment list updated** (v1.9.1): 22 more items from the Film Camera Support & Movement Equipment list: Easyrig, shoulder rig, camera crane, camera jib, remote head, cable dolly, curved track, low-mode dolly, camera car, hood/roof/side mounts, heavy-lift and FPV drones, motion-control rig, robotic arm, motorised pan-tilt head, motion-control turntable, underwater housing, helmet rig, SnorriCam, periscope/probe lens, tripod and fluid head, suction/magnetic mount. New **By camera movement** tab (which gear gives which move, with the rigging safety note). The standard kit also gains Easyrig, remote head, low-mode dolly, camera car and vehicle mounts.
- **Scene view** (v1.10.0): Camera & equipment now opens on an editorial, one-scene-at-a-time page: the scene, a large headline for what it needs, the recommended camera, the optics/light/protection/control that go with it, alternatives you can switch to in one tap, plain-language technical checks (lens coverage, platform approval, slow motion, low light), source links, and a downloadable equipment list (Excel or PDF) or one-tap add to your list. Pictures are original illustrations, not photographs, so the app stays offline and licence-free. The earlier tabs are all still there.
- **Budget & rate card** (v1.11.0): a budget template you fill in yourself (14 heads, standard lines, planned = days × qty × rate, actual spend, difference, GST 18% and TDS 2% per head, contingency), a "Where the money goes" tracker, the Telugu union rate card (93 rates from 13 unions with the PDF page for each, all editable, add your own unions to cover all 24 crafts) and the union rules. Rates in the card are from the printed agreements and may have expired; check the current agreement.
- **Edit any table** (v1.11.0, always visible in v1.12.0): every report sheet, including single line orders, costume continuity, artists, locations, art/props, shot division, schedule and day out of days, has *+ Add a row*, *+ Add a column* and *Delete rows or columns*. The script breakdown cards can take extra fields and hide any field. Rows and columns that come from the script are hidden rather than removed, and *Show hidden* brings them back. Excel and PDF exports include the changes.
- **Suggestions by need** (v1.12.0): redesigned as a tap-through page. Pick what the shot needs (day, night, action, slow motion, aerial, tight spaces, VFX, songs, budget, Netflix approved); the best first choice is shown large, then other cameras, lenses and lights in swipeable rows, with specs and sources one tap away.
- **Scenic order** (v1.13.0): new page under Single line order. AI writes every scene as one paragraph (3 to 6 sentences, English, present tense) from the script text; rewrite one scene or all, a no-AI quick draft, every paragraph editable, Excel and PDF export.
- **Illustration pack** (v1.14.0): the Camera & equipment screens now use the local SVG pack in `src/illustrations/` (gimbal, crane, dolly, drone, tripod, vehicle rig, underwater housing, lens set, matte box, monitor/focus, rain cover) plus three matching drawings added for the camera, light panel and motion-control arm. `scripts/build.py` inlines them, so there are no image files or web links. Every picture has descriptive alt text and is described as a conceptual illustration, never as an exact model. Mobile spacing, tap sizes and hierarchy were tightened.
- **Equipment illustration library** (v1.15.0): 72 local SVG drawings now live in `src/illustrations/` in 12 folders (cameras, lenses, filters, camera-movement, support-rigs, monitors, focus-systems, power, media, weather-protection, underwater, lighting), all listed in one `manifest.json` (id, category, file, name, alt text, match rule, source). `scripts/build.py` validates every path and file and fails the build on any missing or unmapped item, then inlines them, so there are no image files or web links. Camera & equipment has a new **Equipment types** tab to browse by category and add a type to your list; the equipment list and movement tabs show a Picture column. Pictures are conceptual drawings of the type of equipment, never an exact brand or model.
- **Camera-movement pictures from your reference sheet** (v1.15.1): the 11 camera-movement types and the support rigs (tripod, shoulder, helmet, body, underwater) now use pictures cropped from the supplied *Camera Movement & Support* sheet, plus two new types (Cage rig, Handheld rig). They are stored inside each file in `src/illustrations/` as small embedded WebP images (no web links, works offline); `scripts/build.py` accepts only that embedded form.
- **Scene pictures on Suggestions by need** (v1.15.2): the need tiles (Day exteriors, Night / low light, Action & stunts, Slow motion, Aerial, Handheld & tight spaces, VFX & green screen, Songs & dance) now show scene pictures cropped from the supplied equipment-library sheet. They live in `src/illustrations/scenes/`, are listed under `scenes` in `manifest.json`, and are embedded at build time (no web links, works offline).
- **Camera and lens pictures from the library sheet** (v1.15.3): 15 camera and lens types (digital, large-format, modular, compact, mirrorless, high-speed, action camera, cage rig; prime, zoom, anamorphic, wide, telephoto, macro and lens set) now use pictures cropped from the supplied cinema cameras & lenses sheet. They are conceptual pictures of each type, not exact brand models. Broadcast, film cameras and lens support keep the original drawings because the sheet has no matching pictures.
- **Sharper camera and lens pictures** (v1.16.0): the 15 camera and lens pictures are now original vector drawings (crisp at any size, shaded in teal and graphite) in place of the soft crops from the sheet. They are conceptual drawings of each type, not exact brand models.
- **Sharper scene tiles** (v1.16.1): the *What does the shot need?* tiles now use original vector scene drawings (`src/illustrations/scenes/*.svg`, listed under `scenes` in `manifest.json`) instead of the soft crops, so they stay crisp on any screen. They are drawings, not photographs.
- **New look** (v2.0.0): a minimalist, film-maker focused redesign in the spirit of Apple apps and Final Draft. White surfaces on a quiet grey canvas with hairlines instead of soft shadows, one blue accent, the system font (SF Pro on Apple devices), lighter icons, iOS-style segmented controls, calm hairline report tables, and the screenplay shown as a white page. On phones the menu is now a bottom tab bar (Script, Breakdown, Schedule, Equipment, More); More opens every report as a grouped list sliding up from the bottom. Light is the default with a true-black dark mode. Motion is short spring easing and turns off with Reduce Motion. All features, data and exports are unchanged. Colours, type and components are also in the Figma file *ScriptDesk v2 design*.
- **Writing tools** (v2.1.0, from Final Draft and Celtx): **Beat Board** (free canvas of coloured story cards you drag around; arrange in rows; send to Outline), **Outline** (acts and sequences as coloured structure lines over the scenes, a length bar, a three-act starter, a Beats lane; colours also show beside scene numbers in the writer), and in the script writer: **script notes** (Ctrl+Shift+N, listed in a Notes tab), **alternate lines** (keep and swap versions), **dual dialogue** (side by side in PDF, `<DualDialogue>` in .fdx, `^` in Fountain), **find & replace** (Ctrl+F), **writing stats** (words today, minutes, streak, 14-day chart, daily goal), **sprint timer**, **Typewriter**, **Focus** and **Midnight** modes, and a spelling toggle.
- **Production revisions** (v2.2.0, like Final Draft): **Revision mode** with standard revision sets (Blue, Pink, Yellow, Green, Goldenrod…); changed lines are coloured in the writer and get an asterisk in the PDF margin; **lock pages** so new material goes on A-pages (12A, 12B) and deleted pages keep their numbers ("10-11"); **omit scene** (prints OMITTED, keeps the number, drops out of the reports); clear marks per set; PDF options for a **watermark**, **revised pages in their revision colour**, **only revised pages**, and a revision header on revised pages; revisions are written into the .fdx file.
- **What does the shot need? tiles** (v1.16.1): all eleven tiles now have pictures. Eight show scene images; Lower budget, Netflix approved and Everything use the new camera and lens drawings on a teal panel with a small label (₹ Lower cost, 4K · Approved, item count).
- **Free AI list refreshed** (v1.13.0, October 2026): Groq (gpt-oss-120b, gpt-oss-20b, Qwen3.8-27b; Llama no longer free), OpenRouter defaults to the free router, NVIDIA defaults to Nemotron 3 Super 120B and lists DeepSeek V4, Kimi and MiniMax, Gemini 3 Flash guidance, Cloudflare allowance, and Cerebras marked as trial with a card.
- **Encryption** (v1.11.0): Settings → Security & saving. A passphrase locks everything stored on the device (AES-256-GCM, key from PBKDF2-SHA256, 310,000 rounds), with a one-time recovery key. Backups and project files on disk are encrypted too (.scriptdesk). Cloud sync inside Claude is off while encryption is on. When you run the AI breakdown, scene text still goes to the AI service you chose; use Ollama for confidential scripts.
- **Saves to your hard disk** (v1.11.0): the Windows/Mac app writes every project, its script text and a copy of every export to Documents/ScriptDesk; Android and iPhone write to the app's Documents folder (visible in the Files app); Chrome/Edge can save to a folder you choose. Not available inside the Claude artifact.

## AI: works with any AI, including all open-source models

ScriptDesk is not tied to one AI company. Only the AI steps (finding scenes, scene descriptions, the breakdown, character profiles, story structure, reading scanned pages) use an AI service, and you choose which one in **Settings → AI service**. Everything else works with no AI and no internet.

**Open-source models it can run:** any model your chosen service offers. That includes DeepSeek, Qwen, Llama, Mistral, Gemma, gpt-oss, Kimi, GLM, MiniMax, Nemotron, Phi and others, at any size.

### Use many AIs at once (AI pool)

In **Settings** you can press **Add to AI pool** after filling in a service, as many times as you like, including several free keys for the same service. ScriptDesk then:

- uses the most accurate AI you have first and shares the work between equally good ones;
- moves to the next AI automatically when a free limit, bad key or outage hits, and waits only if all of them are resting;
- ignores AIs rated below the minimum you set (ratings are an estimate from model family and size), and double-checks scenes with the rotating pool.

Free allowances are never truly unlimited, but a pool of keys multiplies them.

### On your own computer (free, offline, private)

| Tool | How to connect |
|---|---|
| **Ollama** | Built-in option "Ollama · on this computer". Download a model once (`ollama pull qwen3:8b`), then **Load models**. |
| **LM Studio** | "Any other AI" → address `http://localhost:1234/v1` |
| **Jan** | "Any other AI" → address `http://localhost:1337/v1` |
| **llama.cpp server, LocalAI, text-generation-webui, KoboldCpp** | "Any other AI" → the server's address (ends in `/v1`) |
| **vLLM / TGI / SGLang on an office machine** | "Any other AI" → e.g. `http://192.168.1.20:8000/v1` |

The script never leaves your computer or office network. The desktop app connects to these without extra setup.

### Online, free keys

| Service | Notes |
|---|---|
| **Ollama Cloud** | Free key from ollama.com. Large open models; for best accuracy pick `deepseek-v4-pro`. |
| **NVIDIA** (build.nvidia.com) | Free trial key (`nvapi-…`), 100+ open models, about 40 requests a minute. |
| **Google Gemini** | Free tier with daily limits. Good with Telugu and Tinglish. Free-tier data may be used by Google. |
| **Groq** | Free tier, very fast, small per-minute limits. |
| **OpenRouter** (`:free` models) | About 50 requests a day free. |
| **Cloudflare Workers AI** | Free daily allowance. Put your account ID in the address. |

### Online, paid keys

**Claude (Anthropic)**, **OpenAI**, **DeepSeek**, **Mistral**, **Together AI**, **Cerebras**, **Hugging Face**. Any other online service with an OpenAI-compatible API works through **"Any other AI"**.

### Using your Claude subscription

Open ScriptDesk inside Claude (claude.ai or the Claude app). There it uses your Claude account, with no API key. Separate apps can reach Claude only with an API key.

### How it copes with free limits

- Sends smaller pieces to services with small limits, one request at a time.
- Waits and retries automatically when a limit is reached.
- Asks for answers in a strict format where the service supports it. If a service rejects a long answer, it retries with a shorter one.
- Keys are stored only on your device.

**Quick start (free, offline):** install [Ollama](https://ollama.com/download), run `ollama pull qwen3:8b`, then in ScriptDesk choose Settings → **Ollama · on this computer** → **Load models** → pick it → **Test** → **Save**.

Projects are saved on the device. Use **Projects → Backup** to move a project to another device (open it with **Import script**).

## What it costs (everything else is free and open source)

| Part | Cost |
|---|---|
| App, Excel/PDF/Word/PDF-import libraries (SheetJS, jsPDF, pdf.js, Mammoth), Electron, Capacitor | Free, open source |
| GitHub repo, Actions builds, Pages hosting (public repo) | Free |
| Windows .exe, Mac .dmg, Android APK from Releases | Free (unsigned: install warnings, see below) |
| iPhone / iPad | Free: the web app (Add to Home Screen), or the `.ipa` from Releases installed with xtool and a free Apple ID (reinstall every 7 days). An App Store app needs an Apple Developer account ($99/yr). |
| Optional: Play Store listing $25 once · Windows code-signing certificate · Apple notarization | Paid, only if you want store listings or no warnings |

## One-time GitHub setup

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.** The web app is then published at `https://mvmk1903.github.io/SCRIPT.DESK/` on every push.
2. Push to `main`. The **Build ScriptDesk apps** workflow (Actions tab) builds the web app, Windows installer, Mac app, Android APK and iPhone .ipa. Download them from the run's **Artifacts**.
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
