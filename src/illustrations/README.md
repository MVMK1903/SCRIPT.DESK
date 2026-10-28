# ScriptDesk equipment illustrations

72 local SVG drawings (no external links), grouped by category in folders and listed in `manifest.json`.
`scripts/build.py` checks every file against the manifest (paths, categories, alt text, regex rules, no scripts or external references) and fails the build on any problem, then inlines them into the app.

Every drawing is a **conceptual illustration of a kind of equipment**, never an exact branded model. Alt text always starts with "Conceptual illustration of …".

Sources (see `source` in the manifest):
- Supplied pack, individual set (ScriptDesk_All_Individual_Equipment_Illustrations.zip). That zip contains only seven distinct base drawings reused under 71 names (for example every camera, and the gimbal, dolly, crane and drone, share one picture). Only the ones that match their name are used as delivered.
- Supplied pack, first set (ScriptDesk_Original_SVG_Illustrations.zip): dolly, gimbal, crane, drone, vehicle rig, matte box, rain cover, underwater housing, tripod, lens set.
- ScriptDesk original drawings: everything else, drawn in the same style (ivory plate, charcoal outline, teal accent) so each name has a picture that fits it.

`manifest.json`: `items[].match` is a case-insensitive regex tested against an equipment name in list order (first match wins); `fallback` maps a gear kind or department to an asset.
