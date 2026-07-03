# DAX — Design system

The whole app is themed from CSS custom properties at the top of `src/styles.css`.
Change the tokens, re-skin everything. Never hardcode a colour in a component; use a token.

## Direction: "Indigo Night"
Cool, premium dark. Deep indigo-black surfaces, a periwinkle→violet accent. Crafted,
not flat: subtle shadows + a 1px top highlight give cards depth, and a light motion
layer (staggered entrance, hero sheen, tile lift) makes it feel alive. The gradient
(periwinkle→violet) is reserved for the hero and primary buttons only.

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

## Versioning
Bump `APP_VERSION` (src/data.js) and `CACHE` (sw.js) together on every ship; the header
watermark is how Tristan confirms an update landed.
