# ScriptDesk DESIGN.md

How ScriptDesk should look and feel. Agents and people changing the interface follow this file.
Direction set on 4 Nov 2026 using tasteskill (app-screen rules), UI UX Pro Max (accessibility and touch rules)
and Linear's published DESIGN.md from the awesome-claude-design list as a reference for density and restraint.

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

## Styles

- Light: tasteskill **accent-ladder**. One blue (`#0071e3`) at full strength only on small marks: the one primary
  button per screen, focus rings, the active nav icon. Pale tints and grey steps do the area work.
- Dark: tasteskill **true-black-flat**. Ground `#000`, surfaces stepped by lightness
  (`#101012`, `#18181b`, `#222226`), lines `#2a2a2e`, colour only on data.

## Rules

- **Work first.** No banner above a page unless it carries information: the "last change" line is hidden until
  there is a change; the sample-project note is one slim line.
- **Titles** are nouns, 24px/600 (22px on a phone), with one 14px grey line under them.
- **Tables** use hairlines, no zebra stripes. Headers are sentence case, 12px/600 and grey, never uppercase or tracked.
  Names, places and descriptions are left-aligned; scene numbers and effects are centred; numbers use tabular figures.
- **Sidebar.** Group labels in sentence case. The active item is a neutral grey pill with ink text and a blue icon.
- **Contrast.** Text meets 4.5:1 in both themes (`--muted` `#5a5a61` / `#a9a9b0`, `--faint` `#6e6e75` / `#8c8c93`).
  Blue text on grey uses `--accent-text`.
- **Touch.** On phones, top-bar icons are 40px with an 8px gap. Tab labels are at least 11px. Icon buttons keep
  their text for screen readers and hide it with an overflow trick, never `font-size:0`.
- **Focus.** `:focus-visible` shows a 2px accent outline everywhere.
- **Motion** is feedback only: press, hover, focus, a sheet opening. Nothing performs an entrance, and reduced motion is respected.
- **No** gradients, glows, glass, emoji icons, icon-in-tinted-circle KPIs or rainbow charts.

## Checks

```bash
node .claude/skills/design-taste-frontend/scripts/inspect.mjs www/index.html --app
```

Last run: 0 FAIL, 1 WARN. The warning is the disabled Undo button before any edit; WCAG exempts disabled controls.

## Known exception

The Camera & equipment storytelling views (Scene view, By need, By movement) keep the larger editorial layout that
was asked for in an earlier round. They are the one place the app-screen title size does not apply.
