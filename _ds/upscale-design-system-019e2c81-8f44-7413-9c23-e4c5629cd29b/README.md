# UPSCALE — Design System

UPSCALE is a product under **PT Arthavara Skala Kriya** (operating shorthand: **ASK**), an Indonesian **AI-powered hospitality management** company. The design language is built around a dark, premium "ink-blue + electric-violet + cyan" palette — a treatment that reads as a **control center for property operations**: dense, calm, data-forward. Adjacent in vibe to Mews, Cloudbeds and Linear; not to consumer travel apps.

> **Important caveat — read first.** The only brand artifact supplied so far is a single image titled *"Option E — Color System"* (`uploads/WhatsApp Image 2026-04-23 at 16.50.21.jpeg`) showing four background swatches and four accent swatches. **No logo, typography spec, product screenshots, codebase, Figma file, or written brand guidelines were attached.** Everything in this system beyond the colors is a **disciplined extrapolation** — interpretations of what UPSCALE's product surfaces *would* look like given that palette and the brand name. Please review with that in mind; flag what should change and we will iterate.

---

## What we know vs. what we inferred

| | Source |
|---|---|
| **8-color palette** (4 backgrounds, 4 accents) | ✅ Given — `uploads/WhatsApp Image 2026-04-23 at 16.50.21.jpeg` ("Option E — Color System") |
| Company name & legal entity | ✅ Given — UPSCALE / PT Arthavara Skala Kriya |
| Product category | ✅ Given — AI-powered hospitality management platform |
| Typography | ✅ **Display: Plus Jakarta Sans** · **Body: IBM Plex Sans** · **Mono: Geist Mono** · **Brand wordmark: Montserrat 700**. |
| Logo | ✅ Approved — `upscale.` wordmark in Montserrat 700, violet terminal dot. |
| Iconography | ✅ Locked — Lucide (CDN), curated hotel-management set across 5 functional groups |
| Product surfaces | 🟡 Designed from inference — see `ui_kits/` |
| Copy / tone of voice | 🟡 Inferred from category — short, confident, English-Indonesian bilingual ready |

---

## Sources

- Uploaded files: `uploads/WhatsApp Image 2026-04-23 at 16.50.21.jpeg`
- No Figma link, GitHub repo, or codebase path was provided.

---

## Index — what's in this folder

| Path | Purpose |
|---|---|
| `README.md` | This file. Brand context, content + visual foundations, iconography. |
| `SKILL.md` | Agent-Skills-compatible front matter so this folder can drive a Claude Code skill. |
| `colors_and_type.css` | All design tokens as CSS custom properties — colors, type, spacing, radii, shadows, motion. |
| `fonts/` | Google Fonts copies (loaded via `@import` from the CSS). Web font files cached locally would replace these. |
| `assets/` | Logos, icon references, product imagery placeholders. |
| `preview/` | Small HTML cards that render in the Design System review tab. One card per token cluster. |
| `ui_kits/upscale-app/` | High-fidelity recreation of the hospitality management app — composable JSX components + a clickable `index.html`. Exported components: AppShell, CalendarTapeChart, CommandPalette, HousekeepingBoard, LoginScreen, Primitives, PropertyDashboard, ReservationSlideOver. |

---

## Content fundamentals

UPSCALE is positioned as an **AI-powered hospitality management platform** for Indonesian (and SEA) hotels. Copy is bilingual-ready (Bahasa Indonesia / English) but the primary surfaces ship in English with selective Bahasa terms for trust and locality. The user is a hotelier — GM, front-office manager, revenue manager, housekeeper — working a long shift. Copy must respect that.

**Tone.** Confident, quiet, operational. Adjacent to Linear, Stripe, Mews — never to consumer-travel "have an amazing stay!✨" cheerfulness. The product is a tool, not a concierge.

**Voice principles**
- **Direct, second-person.** "86% occupied tonight." not "We're pleased to report your hotel is doing well."
- **Numbers first.** A figure leads, the label trails. `+12 arrivals · today`
- **Short.** Headlines are 2–6 words. Microcopy ≤ 12 words.
- **Active.** "Move funds" not "Funds can be moved." "Review holdings" not "Holdings are available for review."
- **No fluff, no hedge.** Skip "simply", "just", "easily", "powerful", "seamless". The design carries those qualities; the words don't have to.

**Casing**
- **Sentence case** for everything — buttons, headers, menu items, table columns. ("Open positions", not "Open Positions".)
- **ALL-CAPS with wide tracking (`var(--ls-eyebrow)`)** for eyebrow kickers and section labels only — never for headlines or buttons.
- Numbers in IDR use **Indonesian thousand separators**: `Rp 12.450.000` (dot, not comma).

**Currency & numeric formatting**
- IDR: `Rp 12.450.000`  (no decimals for whole rupiah)
- USD: `$1,250.00`
- % change: `+3.24%` / `−1.08%` (true minus glyph `−`, not hyphen)
- Trailing time qualifier in `--fg-3`: `+3.24% · 1D`

**Pronouns.** "You" / "your" for the user. "We" for the product team in marketing copy only — avoided in-app to keep the product feeling like an instrument, not a chatty teammate.

**Emoji.** **Never** in product UI. Allowed in optional internal/community surfaces only. Status states use the typographic and color systems instead (a cyan dot, a violet glow).

**Sample copy**
- Hero: *"The operating system for Indonesia's best hotels."*
- CTA: *"Book a demo"* / *"Jadwalkan demo"*
- Empty state: *"No reservations for tonight. Quiet evening."*
- Confirmation: *"Reservation created. 3 nights · Deluxe Twin · Rp 4.260.000."*
- Error: *"Booking failed — room unavailable on those dates."*
- AI suggestion: *"Rate up 12% for Sat. — demand from 4 OTAs."* (violet sparkle prefix)

---

## Visual foundations

### The single biggest rule

**UPSCALE is dark.** The default canvas is `#081428` and nearly every surface lives within the four-step ink-blue ramp. Light mode is not in scope for v1; if it ships later, it will be a deliberate inversion, not a default.

### The palette in use

| Token | Use |
|---|---|
| `--bg-ink` `#081428` | Body background. The "page". |
| `--bg-deep` `#061020` | Recessed panels (left rail, drawer behind a modal). |
| `--bg-elevated` `#0D1E38` | Cards, popovers, table rows on hover. |
| `--bg-border` `#162444` | A *tonal step*, used both as borders and as a third elevation step. |
| `--accent-violet` `#7C5CFC` | The single brand action color. Primary CTAs, focused inputs, the brand logo. |
| `--accent-violet-hi` `#9B80FF` | Hover-state of violet, and **links**. |
| `--accent-cyan` `#00D4FF` | **Reserved for live / positive data.** Live occupancy pulse, real-time arrivals, RevPAR gains, room-just-cleaned blips. Never used as a button color. |
| `--fg-ice` `#EEF4FF` | Primary text. Off-white with the faintest cool tint to harmonize with the bg. |

**One brand color, one data color.** Violet = action. Cyan = positive/live. Treat them as orthogonal. Don't violet-on-cyan or stack them in gradients except in the rare hero gradient (`linear-gradient(135deg, var(--accent-violet) 0%, var(--accent-cyan) 100%)`).

### Type

- **Display** — Plus Jakarta Sans, bold/semibold, tight tracking (`-0.02em`). Designed in Jakarta; carries local identity. Used for headlines and big numeric blocks.
- **Body** — IBM Plex Sans, regular/medium. Picked for its legibility at small sizes against dark surfaces and its slight technical flavor.
- **Mono** — Geist Mono, tabular figures. **All numeric data** in tables and KPI tiles is mono — this is non-negotiable for alignment.

> ⚠️ **These fonts are best-guess Google substitutions.** When real brand fonts are available, drop them into `fonts/` and update the `@import` in `colors_and_type.css`.

### Spacing & rhythm

A strict **4-pt base scale** (`--sp-1` = 4px, doubling and stepping cleanly to 96px). Most UI rests on 16 / 24 / 32. Section spacing on marketing surfaces uses 80 / 96.

### Backgrounds & texture

- **Flat dark by default.** No background photos under product UI.
- **Marketing surfaces** can use a single subtle **radial violet glow** anchored to a focal point, blurred to ~280px radius, at 10–18% opacity. Never two glows at once.
- **No noise/grain texture** in v1. (It's tempting; resist. Stripe pulled it off; most don't.)
- **Imagery**, when used, is cool, blue-shifted, with deep blacks — never warm sunsets or candid lifestyle photography. Think: long-exposure city lights, abstract data visualizations, brushed metal close-ups.

### Borders, dividers, elevation

- Borders are **1px**, with the color **drawn from `var(--line)` (≈6% white)**, not from a flat hex. This keeps them luminous on the deep navy.
- Cards use `border: 1px solid var(--line)` + `background: var(--bg-elevated)` + a soft shadow. No drop-shadow alone — always border + shadow + 1px inner highlight (top edge of `rgba(238,244,255,0.04–0.06)`).
- Three elevation tokens: `--shadow-1` (resting), `--shadow-2` (hover/raised card), `--shadow-3` (modals, command palette).

### Corner radii

| Radius | Use |
|---|---|
| `--r-xs` 4px | Tags, chips inside data tables. |
| `--r-sm` 6px | Inputs, small buttons. |
| `--r-md` 10px | Default buttons, popovers. |
| `--r-lg` 14px | Cards. |
| `--r-xl` 20px | Modals, hero cards. |
| `--r-pill` 999px | Status pills, segmented controls. |

UPSCALE is **softly rounded**, not pill-shaped. Avoid the over-rounded "iOS app card" look; the system has technical edges.

### Hover / press / focus

- **Hover (button)**: violet → `--accent-violet-hi` (lighter), 140ms `--ease-out`. No scale.
- **Hover (card / row)**: background lifts one step on the elevation ramp (`bg-deep` → `bg-elevated`), border brightens to `--line-strong`.
- **Press**: brief inset shadow + 1% scale-down (`transform: scale(.99)`), 80ms.
- **Focus**: a 2px violet ring (`box-shadow: 0 0 0 2px var(--bg-ink), 0 0 0 4px var(--accent-violet)`) — the inner ring keeps the halo readable against any surface.
- **Disabled**: 40% opacity + `cursor: not-allowed`. Never grey-out the color; just dim it.

### Motion

- Default easing: `--ease-out` `cubic-bezier(.2, .8, .2, 1)`.
- Default duration: `--dur-base` 220ms. Quick UI moves use 140ms; modals and route transitions use 420ms.
- **No bounces** on functional UI. The spring easing token is reserved for **on-brand moments** — a number ticking up on first load, a confetti-equivalent live-data pulse.
- Fades are paired with a small 4–8px translate, not pure opacity.

### Transparency & blur

- `backdrop-filter: blur(20px) saturate(140%)` on the **top app bar** and **command palette overlay** — over a dark base, this reads as expensive depth rather than frosted glass.
- Modal scrims: `rgba(3, 6, 15, 0.72)` with `backdrop-filter: blur(6px)`.
- Do **not** put blur behind body content; reserved for floating chrome.

### Layout

- **Fixed top app bar (56px)** on product surfaces.
- **Optional fixed left rail (240px collapsed → 64px)** on dashboard surfaces.
- **Max content width 1280px** on marketing; **fluid** in product.
- **Tables are full-bleed within their card** — rows extend edge-to-edge, columns inherit card padding.

### Capsules vs. protection gradients

When text must sit over imagery: prefer **capsules** (`background: var(--bg-elevated); border: 1px solid var(--line); border-radius: var(--r-pill)`) over **protection gradients**. UPSCALE is a system of legible chips, not soft-floor scrims.

---

## Iconography

UPSCALE uses **[Lucide](https://lucide.dev)** — the open-source fork of Feather Icons — loaded from CDN.

**Curated hotel-ops set** in five functional groups (see `preview/18-iconography.html`):
- **Property & rooms** — hotel, building, bed-double, bed-single, door-open, door-closed, key-round, hash (room no), layers (floors), map-pin
- **Reservations & guests** — calendar variants (days / check / clock / x), log-in (check-in), log-out (check-out), user, users, user-plus, clipboard-list, qr-code
- **Amenities & services** — wifi, coffee, utensils, wine, waves (pool), dumbbell, bath, tv, air-vent, parking-square, plane (transfer)
- **Operations & housekeeping** — concierge-bell, headset, list-checks, sparkles (housekeeping), washing-machine, wrench, alert-triangle, message-square, languages, shield-check
- **Billing & rates** — credit-card, banknote, receipt, file-text (folio), percent, tag, trending-up (occupancy), bar-chart-3, star (review), globe (channel), refresh-cw (sync)

Lucide is loaded via `<script src="https://unpkg.com/lucide@0.453.0/dist/umd/lucide.min.js"></script>` and rendered as inline React SVG (see `ui_kits/upscale-app/components/Primitives.jsx`). If UPSCALE later commissions a bespoke icon set, drop SVGs into `assets/icons/` and update this section.

**Rules**
- **Stroke width:** 1.5px (Lucide default). Never mix stroke weights in one screen.
- **Sizes:** 14 / 16 / 20 / 24 / 32. Default 16 for inline, 20 for buttons, 24 for nav.
- **Color:** Icons inherit `currentColor`. They take `--fg-2` at rest, `--fg-1` on hover, `--accent-violet` only when the parent is a primary active state.
- **Live indicators:** when an icon represents *live* data, pair it with a `--accent-cyan` 6px dot pulse — never recolor the icon itself to cyan.
- **No filled-icon set.** Stroke only. If a "selected" state is needed, swap to the icon's filled variant from Lucide (`type="solid"` doesn't exist in Lucide — use a background-capsule under the stroke icon instead).

**SVG vs PNG.** Always SVG. Never PNG sprites. Never icon fonts.

**Emoji.** Not used in product. Period.

**Unicode glyphs.** Used carefully:
- True minus `−` (U+2212) for negative numbers — not the hyphen-minus.
- Multiplication `×` (U+00D7) where applicable — not `x`.
- Bullet `·` (U+00B7) as inline separator in meta strings.
- En-dash `–` for ranges; em-dash `—` for parenthetical breaks.

**Logo.** The UPSCALE wordmark is **"upscale."** — set lowercase in **Montserrat 700**, with a terminal dot in `--accent-violet-hi` (`#9B80FF`). On violet backgrounds the dot drops to ink (`#0D1E38`) for legibility. Wordmark in `assets/logo-upscale.svg`; single-glyph mark ("u.") in `assets/logo-mark.svg`. Montserrat is loaded via the global `@import` in `colors_and_type.css` and is reserved for the brand mark — body and display type still use IBM Plex Sans and Space Grotesk respectively.

---

## Folder index (manifest)

```
README.md                      ← you are here
SKILL.md                       ← agent-skills front matter
colors_and_type.css            ← all design tokens
fonts/                         ← font @import notes; replace with real files when available
assets/
  logo-upscale.svg             ← placeholder wordmark
  logo-mark.svg                ← placeholder glyph
  icons/                       ← (currently empty — using Lucide via CDN)
  imagery/                     ← reference imagery direction
preview/
  01-palette-backgrounds.html
  02-palette-accents.html
  03-palette-semantic.html
  04-type-display.html
  05-type-body.html
  06-type-mono-numbers.html
  07-spacing.html
  08-radii.html
  09-shadows-elevation.html
  10-buttons.html
  11-inputs.html
  12-cards.html
  13-badges-pills.html
  14-tabs-segments.html
  15-data-table-row.html
  16-kpi-tile.html
  17-logo-mark.html
  18-iconography.html
ui_kits/
  upscale-app/                 ← clickable hi-fi prototype of the hospitality management app
    README.md
    index.html
    components/
```

