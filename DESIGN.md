# DAX — Design system

The whole app is themed from CSS custom properties at the top of `src/styles.css`.
Change the tokens, re-skin everything. Never hardcode a colour in a component; use a token.

## Direction: "Molten"
Energetic dark. Warm near-black surfaces, one confident molten-orange accent (no
two-colour gradients as a crutch, the orange→red gradient is reserved for the hero
and primary buttons only). Crafted, not flat: subtle shadows + a 1px top highlight
give cards depth.

## Colour (all pairs WCAG AA verified)
| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#0C0D11` | app background |
| `--surface` | `#17181E` | cards |
| `--surface-2` | `#202128` | raised / pressed |
| `--line` | `#2C2E38` | hairline borders |
| `--text` | `#F4F5F7` | primary text (17.8:1 on bg) |
| `--text-dim` | `#A6ABB5` | secondary text (7.7:1 on surface) |
| `--text-faint` | `#7C828E` | least-important text (4.6:1 — still readable, not decoration) |
| `--accent` | `#FF5A2C` | the one accent (6.2:1 on bg; ok as small text) |
| `--accent-2` | `#FF3B2E` | hotter red-orange, lava gradient only |
| `--accent-ink` | `#1E0A03` | dark text on accent fills (6.1:1 on accent) |
| `--accent-hover` / `--accent-press` | `#FF6E44` / `#E84A20` | interaction states |
| `--accent-tint` | `rgba(255,90,44,.10)` | subtle accent-washed backgrounds |
| `--good` / `--warn` | `#35D6A0` / `#FFC24B` | semantics |

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
