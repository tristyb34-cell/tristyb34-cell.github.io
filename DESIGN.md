# DAX — Design system

The whole app is themed from CSS custom properties at the top of `src/styles.css`.
Change the tokens, re-skin everything. Never hardcode a colour in a component; use a token.

## Direction: "Indigo Night" (default, user-switchable since v0.36)
Cool, premium dark. Deep indigo-black surfaces, a periwinkle→violet accent. Crafted,
not flat: subtle shadows + a 1px top highlight give cards depth, and a light motion
layer (staggered entrance, hero sheen, tile lift) makes it feel alive. The gradient
(periwinkle→violet) is reserved for the hero and primary buttons only.

## Themes (in-app switcher, v0.36+)
Three skins, chosen live from Today → Explore → 🎨 Theme (`src/theme.js`, stored in db `theme`,
applied as `data-theme` on `<html>` before first paint). Add a new theme = one `:root[data-theme="x"]`
block in `styles.css` overriding the base tokens + the four rgb triples.
- **Indigo Night** — the default (tokens above).
- **Molten** — hot orange (`--accent #FF5A2C`) on charcoal (`--bg #0C0D11`).
- **Light Green** — green (`--accent #2E7D46`, white ink) on soft white (`--bg #F3F8F4`). Lighter shadows.

Every decorative glow/tint/chrome now resolves from four RGB-triple tokens
(`--accent-rgb`, `--accent2-rgb`, `--bg-rgb`, `--surface2-rgb`) so a theme re-skins them all at once.
Every theme carries a `--focus` token (ring colour ≥3:1 on all its surfaces). All pairs WCAG AA verified
via the node checker before shipping (see `/tmp/contrast.js` pattern).

## Colour (all pairs WCAG AA verified)
| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#0A0B14` | app background (deep indigo-black) |
| `--surface` | `#151726` | cards |
| `--surface-2` | `#1E2136` | raised / pressed |
| `--line` | `#2E3350` | hairline borders |
| `--text` | `#EEF0FA` | primary text (17.3:1 on bg) |
| `--text-dim` | `#A6ABC8` | secondary text (7.9:1 on surface) |
| `--text-faint` | `#7A80A0` | least-important text (4.6:1 — still readable, not decoration) |
| `--accent` | `#7C8CFF` | the one accent (6.6:1 on bg; ok as small text) |
| `--accent-2` | `#B57BFF` | violet, gradient only |
| `--accent-ink` | `#0A0B1A` | dark text on accent fills (6.6:1 on accent) |
| `--accent-hover` / `--accent-press` | `#93A0FF` / `#5F6FE0` | interaction states |
| `--accent-tint` | `rgba(124,140,255,.10)` | subtle accent-washed backgrounds |
| `--good` / `--warn` | `#35D6A0` / `#FFC24B` | semantics |
| `--cue-label` | `var(--accent)` | form-block "Cue" label (per-theme override where needed) |
| `--cue-warn` | `#FFC24B` | form-block "Doing it wrong if" label (9.86:1 on `--surface-2`) |
| `--cue-cool` | `#5AD1E6` | form-block "Range & tempo" label. **Cyan, not blue** — a blue label reads as the accent in Indigo Night |

## The form block (v0.38+)
Four coaching rows on every exercise (`formBlock()` in `src/cues.js`, shared by the runner
and the how-to so they can never drift): Cue / Feel it / Doing it wrong if / Range & tempo.

Hard rules, learned the painful way:
- The panel is **neutral `--surface-2`**. Colour lives only in the 3px left border and the
  label text. Body text is always `--text`. **Never tint a row's panel with its own hue** —
  that is exactly what dropped the green cue label below 4.5:1 in the light theme in v0.37.
- Rows are distinguished by border **+ icon + text label**, never by colour alone (WCAG 1.4.1).
- Labels are sentence-case in the DOM and uppercased in CSS. Literal `CUE` in markup risks
  being spelled out letter-by-letter by TTS.
- New label colours must clear 4.5:1 on `--surface-2` in **all three** themes before shipping.
  In light, `#9A5B00` and `#0E6E86` are traps: they pass on the panel and fail on a tint.

## Exercise frames
Two static public-domain images, cross-faded (`.ex-frames` / `.frame-b`, 1.4s interval,
.9s fade). It shows the start and end of the rep, not the path between them. Real animation
would need licensed assets (every "free" exercise GIF set on GitHub is uncleared GymVisual
media). Single-frame exercises and `prefers-reduced-motion` get a still image and no timer.

## Motion (premium feel, v0.35+)
- Staggered rise: each screen's top-level cards cascade in on load (`.view > *`, ~50ms steps).
- Hero sheen: a slow light sweep across `.card-hero` every 7s.
- Primary CTA breathes (soft accent glow); tiles lift on hover, cards press on tap.
- ALL motion is wrapped in `@media (prefers-reduced-motion: reduce)` → off. Keep it that way.

Rule: body text must clear 4.5:1 on its background; accent as UI/large ≥3:1; dark
`--accent-ink` on any accent fill ≥4.5:1. Verify with the WCAG check before shipping.

## Shape, depth & motion
- Radii: `--r-sm 10` / `--r-md 16` / `--r-lg 22`.
- Depth: `--shadow-1` (cards), `--shadow-2` (overlays/hero), `--hair-top` (inset top highlight). Primary buttons carry a soft accent glow.
- Ease: `--ease: cubic-bezier(.22,.61,.36,1)`.

## Type
System stack (SF Pro on iOS). Headings are tight and heavy: `.screen-title` 31/850,
letter-spacing −.022em. Body 15–15.5, line-height ~1.55. Use `font-variant-numeric:
tabular-nums` wherever numbers change (weights, reps, stats).

## Accessibility (non-negotiable — repo enforces it)
- Editing files in `src/views/*` is hard-blocked until `accessibility-agents:accessibility-lead` reviews the change in-session.
- Decorative emoji get `aria-hidden="true"`. Interactive targets ≥44px. Visible focus
  rings (`:focus-visible`, 2px `--text` outline). Modals: `role="dialog"`, `inert` the
  background (not `#sr-status`), focus the title, Esc + focus-return. Live updates go
  through `announce()` (src/a11y.js).
- A dialog that demands a **choice** uses `role="alertdialog"` and moves focus (the set-count
  guard). A passive notice that needs no response goes to `#sr-status` instead. Never both:
  focusing a dialog already reads its title and body, so an `announce()` double-speaks.
- Changing exercise = `window.scrollTo(0,0)` then `.focus({preventScroll:true})` on the `<h1>`.
  Without `preventScroll` the focus call drags the heading back to mid-viewport.

## Attendance & data model (v0.39+)
- A day counts as "showed up" the moment real work is logged (`isMeaningful`: sets for
  ≥ half the planned exercises). `logSet` auto-upserts the day into `sessions[]`, so the
  **Finish button is optional** and an unfinished workout can never be overwritten and lost
  (the original bug). `reconcileActive` on boot rescues any pre-fix stranded session.
- `sessions[]` is the single source of truth (consistency, history, streak, volume all read it).
  One record per date; always upsert-by-date, never push (no duplicates).
- Backfill: `backfillSession(date)` adds an attendance-only record (`backfilled:true`, empty
  entries). `removeBackfill` will ONLY ever delete a backfilled record, never real logged data.
  Attendance-only rows render as "Attended (no sets logged)", never "0 sets · 0kg".
- **DATE FOOTGUN (fixed, do not reintroduce):** session date keys come from `toISOString()`
  (UTC). All day math and weekday lookups in consistency.js MUST be UTC too (`dayAt` parses
  with `Z`, `addDays` uses `setUTCDate`, weekday via `getUTCDay`). Mixing local `getDay()` with
  a UTC date string shifts a day in UTC+2 (SAST) and mislabels weekdays. This mislabeled
  rest days as training days in the first cut of the backfill list.

## Versioning
Bump `APP_VERSION` (src/data.js) and `CACHE` (sw.js) together on every ship; the header
watermark is how Tristan confirms an update landed.
