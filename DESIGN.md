# ScriptDesk DESIGN.md

How ScriptDesk should look and feel. Agents and people changing the interface follow this file.
Rules for accessibility, touch, tables and contrast were set on 4 Nov 2026 with tasteskill and UI UX Pro Max.
The look was changed the same day to the owner's **glass** mockup (see Styles); where the two disagree, the mockup wins.

## The idea

ScriptDesk is worked in for hours by production crews, so the work comes first and the chrome stays quiet.
Its own face is the **stripboard colour code** every production office already uses:

| Scene | Colour | Light | Dark |
| --- | --- | --- | --- |
| Day exterior | yellow | `#e0a800` | `#ffd60a` |
| Day interior | white (shown as grey) | `#b8b8be` | `#8e8e93` |
| Night exterior | green | `#2f9e4f` | `#30d158` |
| Night interior | blue | `#3b6fd6` | `#5e8cff` |

Every scene row carries a 4px left edge and a tinted effect cell in its colour, and scene cards use the same
chip colours. A small "Colour code" legend sits above the first table and lists only the kinds on screen.
Exports keep their own document formats.

## Styles: glass

- **Backdrop.** Light: a soft gradient of pale blue (top right), lavender (left) and peach (bottom right) over
  `#edf2fb`. Dark: deep navy, plum and rust glows over `#0b1020`. Fixed, behind everything.
- **Surfaces.** Cards, tables, banners, the sidebar and dialogs are frosted glass: `rgba(255,255,255,.56)` light /
  `rgba(26,31,54,.56)` dark, 20px blur, a 1px white edge, 20-24px corners and a soft blue shadow. Bars over the
  backdrop (app bar, project header) stay transparent. The script page stays white paper.
- **Buttons.** Buttons are glass rectangles. The primary is a blue gradient pill (`#2f6bff` to `#4f5df5`) with a soft glow;
  "Checks" is a peach pill. Active tabs, nav items and segmented options are a pale blue pill (`--pill-on`) with blue
  text and a soft glow.
- **Shapes.** Rectangles only, no circles or pill shapes: buttons, tabs and inputs 10px corners, the highlight inside a
  switch 8px, chips and small badges 6px, cards 16px, dialogs 18px, story-arc markers rounded squares.
- **Type.** The film title is bold uppercase (22px desktop, up to 26px on a phone); page titles 26px/700.
- **Story arc** uses the blue to purple to pink gradient curve and coloured bands.
- **Phone.** The main tabs sit under the film title as a sticky glass pill row (icon over label; icon beside label
  from 480px), not at the bottom.

## Rules

- **Work first.** No banner above a page unless it carries information: the "last change" line is hidden until
  there is a change; the sample-project note is one slim line.
- **Titles** are nouns, 24px/600 (22px on a phone), with one 14px grey line under them.
- **Tables** use hairlines, no zebra stripes. Headers are sentence case, 12px/600 and grey, never uppercase or tracked.
  Names, places and descriptions are left-aligned; scene numbers and effects are centred; numbers use tabular figures.
- **Sidebar.** A floating glass panel. Group labels in sentence case. The active item is the pale blue glowing pill.
- **Contrast.** Text meets 4.5:1 in both themes (`--muted` `#4c556e` / `#aab2c8`, `--faint` `#5f6882` / `#8e96ae`).
  Blue text on grey uses `--accent-text`.
- **Touch.** On phones, top-bar icons are 40px with an 8px gap. Tab labels are at least 11px. Icon buttons keep
  their text for screen readers and hide it with an overflow trick, never `font-size:0`.
- **Focus.** `:focus-visible` shows a 2px accent outline everywhere.
- **Motion** is feedback only: press, hover, focus, a sheet opening. Nothing performs an entrance, and reduced motion is respected.
  Two effects are ported from Libraries.dev (MIT, plain JS, no React):
  - **Border beam pulse** on pressing a button (inner pulse, ocean blue-violet; white on the blue primary) and on changing a
    select (outer pulse). One shot, about 0.7 s, an overlay that never covers the label.
  - **Gooey move** on segmented controls and the writer's element buttons: the highlight stretches as liquid from the old
    option to the new one (head 0.26 s, tail 0.46 s). Only the highlight layer is filtered, so labels stay sharp.
  Do not add other decorative motion, and never put two effects on the same element.
- **No** emoji icons or icon-in-tinted-circle KPIs. Gradients and glows are limited to what the glass style above names.

## Page templates (writer)

Five screenplay page templates, picked when a screenplay is started and changeable from "Page template" in the writer:
Final Draft default (the default and the earlier layout), Compact (58 lines a page), Cole & Hagg (57-character action,
40-character dialogue), Warner Bros. (57-character action, 34-character dialogue) and Celtx default (one blank line before
scene headings, (CONTINUED) at page breaks, no watermark). Each sets the margins, indents, spacing before scene headings,
the editor's page breaks, the page count and the PDF. Stage, audio and comic formats keep their own layouts.

## Checks

```bash
node .claude/skills/design-taste-frontend/scripts/inspect.mjs www/index.html --app
```

Last run (glass theme): no contrast or text-size problems. Two deliberate fails remain: `button-fx` (the gradient,
glowing primary pill) and `heavy-shadow` (floating glass cards). Both are the mockup's look; pass `--allow button-fx,heavy-shadow`.

## Known exception

The Camera & equipment storytelling views (Scene view, By need, By movement) keep the larger editorial layout that
was asked for in an earlier round. They are the one place the app-screen title size does not apply.
