# Design reference

The approved mockups. **The app must look like them.** The spec (`docs/spec.md`) wins on behaviour, the mockups win on look.

- Live canvas (owner-only link): https://claude.ai/artifact/NZo5NHfzKLkjH5hwL5uCfM
- `screens/*.html`: the exact source of each screen. Every colour, size, radius, gap and font is in the inline styles. Read values from here; never guess. (They are "Design Component" files: `{{holes}}`, `<sc-for>` and `<sc-if>` are template syntax, and the `renderVals()` script at the bottom holds the sample data, e.g. waveform bars.)
- Mock data (folder/song names, placeholder lyrics) is final and is also what the README screenshots use: `good kid, m.A.A.d city` → `Money Trees`, `DAMN.`, `To Pimp a Butterfly`, lyrics as `[ verse 1 lyrics ]` placeholders. Never put real copyrighted lyrics in the repo.

| File | Screen | Milestone |
| --- | --- | --- |
| 01-library | Library (root) | 1–2 |
| 02-folder | Song folder grid | 1–2 |
| 03-lyrics | lyrics.md editor + mini player | 1 (editor), 3 (mini player) |
| 04-recording | Recording | 1 |
| 05-save-recording | Save recording sheet | 1 |
| 06-player | Player + loop | 1 (basic), 3 (loop, speed) |
| 07-add-to-folder | Add sheet | 2 |
| 08-search | Search | 2 |
| 09-mac-sync | Mac sync | 3 |

## Tokens (also in `src/ui/tokens.ts`)

| Token | Value |
| --- | --- |
| background | `#000000` |
| tile / fill | `#161616` |
| sheet | `#111111` |
| input / sheet row | `#1C1C1E` |
| hairline | `#1F1F1F` |
| text | `#F5F5F5` |
| secondary text | `#C7C7CC` |
| muted | `#8E8E93` |
| faint (placeholder) | `#6E6E73` |
| waveform bar | `#D1D1D6` |
| record red | `#FF5A52` |
| synced green | `#2F9E5B` |
| status: writing | `#A78BFA` |

- Fonts: **Geist** 400/500/600 (300 for the record timer), **Geist Mono** 400/500 for file names, sizes, durations, paths and section labels.
- Screen padding 20 px; titles 28 px / 600 / −0.6 letter-spacing; tile radius 14 (folder tiles 16); grid 3 columns, 14 px column gap, 18 px row gap.
- Pill buttons radius 999. Touch targets ≥ 44 px. No emoji, no gradients, no bordered cards.

## Translating to React Native

- Build from the small kit in `src/ui/` (Text, Tile, IconButton, Pill, Sheet, Waveform, icons). Screens use only these.
- Map CSS 1:1: padding, gap, borderRadius, fontSize, letterSpacing, lineHeight (multiplier × size → px).
- Custom font weights are separate families (`Geist_600SemiBold`); never rely on `fontWeight` with custom fonts.
- Widths in the HTML are for a 390 pt phone; use flex so other sizes work.
- After building a screen, screenshot the simulator (`xcrun simctl io booted screenshot`) and compare with the mockup; fix gaps before moving on.
