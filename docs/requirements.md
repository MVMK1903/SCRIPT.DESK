# ScriptDesk — agreed requirements (12 Oct 2026)

Status: **built as v2** (artifact https://claude.ai/artifact/E9UvNpxLmvFjyudnWrKGs6). Name chosen by user: ScriptDesk.

## Look
Clean, minimal, dark cinema-style screen (like the user's black Raahu Kaalam one-line order), film-strip sidebar. Left-side menu of pages; bottom menu on phone, tables become cards. PDFs export white for printing, with production name, film name and date in the header.

## Script reading
- Any screenplay: English, Tinglish (Telugu in Roman letters), Telugu and other Indian languages, mixed scripts; Word (.docx), PDF, Final Draft, Fountain, pasted text; scanned PDFs read by Claude from page images.
- Quick local scan for scene headings; Claude finds scenes itself when the format is unusual. Tested on SYG: 38 scenes including "SCENE NO 2 :" + next-line heading, "9 & 9A", 14A/14B, "21 & 21A … INTERCUT OF 16", MRNG/AFTN/EVNG. An unnumbered heading inside scene 7 (EXT. LAKE EVENING) is numbered 7A and flagged.
- User checks the scene list (Scene list check) before the AI breakdown.
- Reports in English. Story structure is analysed (three-act, five-act, Hero's Journey, Save the Cat, Kishotenketsu, real-time, non-linear, reverse, Rashomon, hyperlink, circular); every scene gets a timeline tag (Present / 1947 / Flashback).

## Data behaviour
- No master sheet. Every report is its own page.
- Edits carry over everywhere (rename artist or location once; merge duplicates). Editing a scene in Full script re-reads that scene with AI; manual fixes are never overwritten.
- Undo, Checks panel (duplicate numbers, missing locations/effects, failed scenes, likely duplicate artists/locations), retry failed scenes.
- Saved to the user's private account storage (opens on laptop and phone); also cached in the browser.

## Pages (15)
Full script · Story structure · Character profiles · Single line order (Sc No | Location | Effect/Time "EXT / NIGHT" | Scene description | Artist & crowd) · Location-wise SLO · Artist-wise SLO · Stunt/fight SLO (THRILL-n units; Songs tab SONG-n) · No. of locations (script locations only) · No. of artists (Sl no, Character, Designation, Artist, Ph. No; Primary then Secondary) · Location-wise scene list · Artist-wise scene list · Script breakdown (card per scene: setup, artistes, extras, juniors, props, art, costumes, makeup, vehicles, animals, VFX, SFX, stunts, song, special sets/props, equipment, technicians, notes) · Special identification (by item / scene-wise, plus period scenes) · Costume continuity (scene-wise / artist-wise, C1/C2 numbering, change flags, makeup) · Art/props (overall / scene-wise).
Character profiles: description, arc start / turning points (no scene numbers) / end, relationships, key scenes.
Every page: Excel and PDF; "Download all" = one Excel workbook with every report.

## Known limits
- AI is never 100% correct; review step, checks and editing are part of the design.
- PDF cannot render Telugu/Hindi letters (Excel can). Reports are in English by default.
- Old .doc files must be saved as .docx or PDF.

## Next
- Shooting schedule (like the user's 4th Schedule) with day breaks and holidays.

## Reference files from user
SYG Tinglish script (1st half), SYG character list, SYG artist location-wise dates (xlsx), SYG 4th schedule, Raahu Kaalam one-line order (PDF), 2-episodes props breakdown (PDF).
