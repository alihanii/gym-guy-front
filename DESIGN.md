# Design system — clean neutral dark

Mode: **Operate** (gym floor, one hand, sweaty thumb). Minimal workout-tracker look: true-black canvas, neutral grey surfaces with no blue cast, one blue accent, green only for completed sets.

## Color (tokens in `frontend/src/index.css`)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#000000` | canvas, OLED-friendly |
| `--surface` / `-2` / `-3` | `#161618` / `#232325` / `#2E2E31` | sheets, input cells, check boxes |
| `--primary` | `#2F8CFF` | primary actions, focus, active field |
| `--title` | `#4EA0FF` | exercise names in the logger |
| `--success` | `#2EC866` | completed set (whole row tint `rgba(46,200,102,.16)`) |
| `--warmup` | `#FFB020` | W sets, injury warnings |
| `--drop` | `#A77BFF` | D sets, superset rail/tag |
| `--failure` | `#FF5A52` | F sets, heavy muscle load, destructive |
| `--gold` | `#FFC940` | personal records, streak |

Corners are sharp: 8px panels, 6px buttons/inputs/keys, 4px cells and badges, 12px only on the top of bottom sheets.

Logger layout: exercises are a flat list separated by hairlines (no cards); each set is one row (set, previous, value cells, check) and the whole row turns green when checked.

Muscle load bars: blue < 6 weekly sets, green 6–20, red > 20.

## Type
Vazirmatn Variable for everything (Peyda is commercial; swap in for headings if licensed). Numbers in Persian digits through `fa()`, always `tabular-nums`. Ranges/tempos are wrapped in LTR isolates so `8-12` never flips.

## Ergonomics
- Touch targets ≥ 44–48px; frequent actions in the bottom third (numpad, rest timer, finish sheet).
- Custom numpad replaces the OS keyboard in the logger: ±2.5 kg, "previous", next/commit set.
- Haptics on set check, rest end, PR. Rest timer is anchored to an absolute end time and survives reloads.
- Motion: sheets slide with `cubic-bezier(.32,.72,0,1)`; buttons press to `scale(.97)`; numpad keys never animate beyond press feedback. `prefers-reduced-motion` respected.
