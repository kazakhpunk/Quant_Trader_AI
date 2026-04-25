# Landing Page Redesign — Design Spec

**Date:** 2026-04-25
**Scope:** Landing page (`/`) + shared header. Authenticated app surfaces (dashboard, trade, account, signin/signup) untouched.
**Direction:** "Quiet Authority" — Modern fintech base (Linear/Vercel-leaning) with one borrowed AI-native element: a cursor-aware grid lattice behind the hero.
**Stack:** Next.js 14 (App Router), Tailwind, shadcn/ui, next-themes. Framer Motion to be added.

---

## 1. Goals & Non-Goals

### Goals
- Replace the current landing page with a more professional, distinctive design.
- Preserve the existing visual personality (whitespace, restrained color, primary accent) while raising craft and density of meaning.
- Add the four user-requested patterns: morphing header, sticky horizontal feature carousel with split panels, scroll-reveal motion, subtle grid lines.
- Keep performance budget tight: no Lighthouse regressions on mobile; no jank on scroll.

### Non-Goals
- No redesign of authenticated pages (dashboard, trade, account, analysis).
- No change to auth flow, API surface, data model, or backend.
- No new product features. Copy stays substantively the same; layout and motion change.
- No floating notification badges or scroll-triggered modals (explicitly rejected during brainstorm).

---

## 2. Page Architecture (Top → Bottom)

1. **Header** — full-width at scroll=0; morphs to centered floating pill on scroll>24px.
2. **Hero** — eyebrow + headline + subhead + CTA pair + product mock; cursor-aware grid behind it.
3. **Trust strip** — thin band with three product-derived stats.
4. **About** — existing About card, lightly tweaked.
5. **Sticky horizontal feature carousel** — pinned section; 4 panels slide horizontally as user scrolls vertically. Replaces the current 4-card grid.
6. **How it works** — 3-step explanation with connecting timeline.
7. **Final CTA** — single primary action, centered, on faint static grid.
8. **Footer** — extended with 3-column nav block + existing credit line.

Order rationale: Hero (hook) → Trust (credibility) → About (what it is) → Carousel (what it does, in depth) → How (how to use) → CTA (act now).

---

## 3. Header (Morphing Behavior)

**State A — top of page (scrollY = 0):**
- Full-width edge-to-edge bar.
- Height: 64px.
- Transparent background; no blur, no border.
- Layout: logo left, optional centered nav links ("Features", "How it works", "About" — anchor links to sections), action cluster right (GitHub icon, ModeToggle, "Start Trading" button).

**State B — scrolled (scrollY > 24px):**
- Centered floating pill, overlapping content.
- Width: max-w-3xl (~768px), centered.
- Height: 52px.
- Background: `bg-background/70` with `backdrop-blur-xl`.
- Border: `border border-border/50`.
- Border-radius: `rounded-full`.
- Shadow: `shadow-lg shadow-black/5` (light) / soft glow (dark).
- Top offset: 12px.
- Z-index: 50.
- Centered nav links hide in this state (saves space; mobile menu still available).

**Transition:**
- All properties (width, height, top, border-radius, background opacity, shadow) animate together.
- Duration: 300ms ease-out.
- Threshold: 24px hysteresis to prevent flicker on bounce-scrolls.
- Driven by Framer Motion `useScroll` or a single throttled scroll listener writing to `useState`. Either is fine; pick whichever has fewer re-renders in practice.

**Mobile (<768px):**
- Always in State B (skip the morph). Width = `calc(100vw - 32px)` so it has the floating feel without awkward shrinking. Height stays 52px.
- Hamburger menu replaces the centered nav links (uses existing `sheetMenu` component).

**Accessibility:**
- `role="banner"` on the header element.
- All interactive elements remain ≥44px tap target (use padding wrappers).
- Keyboard-only "Skip to main content" link, visible on focus.
- Focus rings preserved across the morph.

**Reduced motion:**
- Snap between states; no animated transitions.

---

## 4. Hero Section

### Layout
- Section: `min-h-[88vh]`, vertically centered content.
- Inner container: `max-w-5xl mx-auto`.
- Stack (top to bottom): eyebrow → headline → subhead → CTA pair → product mock.

### Eyebrow tag
- Small pill: `New: Sentiment Analysis 2.0` (placeholder copy — finalize during implementation).
- Style: `text-xs font-medium text-muted-foreground`, thin border, `rounded-full`, `px-3 py-1`.
- Optional small SVG dot with `animate-pulse` to suggest "live".
- Wraps a `<Link>` to a relevant anchor or external page.

### Headline
- Two lines, current copy preserved: "Auto Buy Low and Sell High with" / "Real-time Trading Signals".
- Type: `text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]`.
- Second line uses gradient text: `bg-gradient-to-b from-primary/70 to-primary bg-clip-text text-transparent`.

### Subhead
- Current copy preserved.
- Style: `text-lg md:text-xl text-muted-foreground max-w-[640px] mx-auto`.

### CTA pair
- **Primary** — "Start Trading" → `/trade`. `<Button variant="default" size="lg">` with right arrow icon.
- **Secondary** — "How it works" → anchor `#how-it-works`. `<Button variant="ghost" size="lg">` with subtle border.
- Spacing: `gap-3`. Stacks full-width on mobile.
- Note: Instagram CTA moves out of hero into footer.

### Product mock
- Single device mock (replaces current stacked mac+phone).
- Source: existing `/mac-light.png` and `/mac-dark.png` (themed via `dark:hidden` / `dark:block`).
- Frame: `border border-border/60 rounded-2xl shadow-2xl`.
- Soft glow underneath: `before:absolute before:bottom-0 before:left-1/2 before:-translate-x-1/2 before:w-[80%] before:h-[60%] before:bg-primary/20 before:blur-3xl`.
- Sizing: `max-w-4xl mx-auto`. `next/image` with explicit dimensions and `priority`.
- Reveal: translateY(20px) → 0 + opacity 0 → 1 on enter.

### Cursor-aware grid (the AI-native touch)
- Position: `absolute inset-0 -z-10` inside the hero section. Section has `overflow-hidden` so grid is clipped at section bounds.
- Implementation: SVG `<pattern>` with vertical + horizontal lines at 48px spacing. Stroke: 1px, `stroke-foreground/[0.06]` light / `stroke-foreground/[0.08]` dark.
- Reveal mask: radial gradient mask centered at cursor, ~400px radius. Mask fades the grid from `opacity-0` (far from cursor) to `opacity-100` (near). The grid is essentially invisible elsewhere.
- Cursor tracking: `useEffect` `mousemove` listener on the section. Throttled with `requestAnimationFrame`. Updates two CSS variables on the section element:
  - `--mouse-x`, `--mouse-y` (in pixels relative to section).
- Mask uses CSS variables: `mask-image: radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), black 0%, transparent 80%)`.
- No React state per frame. Reads are RAF-throttled. One render path.

**Pointer detection / fallbacks:**
- Coarse pointer (touch): use `(pointer: fine)` media query. If false, render a flat very-faint static grid (`opacity-[0.04]`, no mask), or skip the grid entirely. Decide during implementation based on visual outcome.
- Reduced motion: render the static flat lattice. No mask animation.

### Bottom fade
- Linear gradient overlay at section bottom (`from-background to-transparent`, height 96px) for a soft transition into the trust strip.

---

## 5. Trust Strip (new)

- Position: between Hero and About.
- Container: full-width band, `py-12`, `border-y border-border/40`.
- Contents:
  - Eyebrow: `text-xs uppercase tracking-widest text-muted-foreground` — "Built for serious traders".
  - 3-column grid (`md:grid-cols-3`), each cell:
    - Large stat: `text-3xl font-semibold tabular-nums`, animated count-up on enter.
    - Label: small muted text.
- Stats (product-derived; do not fabricate user counts or accuracy figures):
  - "200+" / "Assets monitored"
  - "24/7" / "Real-time scanning"
  - "4" / "Analysis dimensions"
- Count-up: `IntersectionObserver` triggers a `requestAnimationFrame` loop that increments the displayed value over 800ms (ease-out). Disable when reduced motion is on; show final value immediately.

---

## 6. About Section (lightly tweaked)

- Keep existing `<Card>` structure and `<Statistics />` component.
- Visual changes:
  - Replace `shadow-lg` with `shadow-sm`.
  - Border `border-border/60`.
  - Add a 1px primary-tinted vertical accent line on the left edge of the card (`before:absolute before:left-0 before:top-8 before:bottom-8 before:w-px before:bg-primary/40`).
- Headline / paragraph copy unchanged.
- Image (`/qtrader.png`) unchanged: `rounded-lg`, no shadow.
- Reveal: standard fade + slide.

---

## 7. Sticky Horizontal Feature Carousel

The centerpiece of the redesign.

### Behavior
- **Outer wrapper:** `height: 400vh` (4 panels × 100vh of scroll travel). `position: relative`.
- **Inner container:** `position: sticky; top: 0; height: 100vh; overflow: hidden`.
- **Track:** flex row, `width: 400vw`, holds 4 × `100vw × 100vh` panels.
- **Animation:** `useScroll` with `target: outerRef`, `offset: ["start start", "end end"]`. Map `scrollYProgress` (0→1) to `track.x` (`0%` → `-75%` of track width).
- All work happens via Framer Motion `motion.div` + `useTransform` motion values — no React state per frame, no re-renders during scroll.
- Pinning is purely CSS `position: sticky`; no scroll-jacking library.

### Section preamble (above pinned area, not pinned)
- Eyebrow: "Features".
- Headline: `text-4xl md:text-5xl font-semibold tracking-tight` — placeholder: "Four lenses. One signal."

### Panel structure (the user's "B — split with annotated UI")
- 100vw × 100vh, padding `px-12 lg:px-24`, vertically centered content.
- Two-column grid `lg:grid-cols-2 gap-12`, stacks on mobile (mobile uses fallback below).
- **Left column — visual:**
  - Bordered frame `rounded-xl border border-border/60 shadow-2xl`.
  - Soft primary glow underneath.
  - Subtle tilt on enter: `rotateY(-3deg)` → `rotateY(0)` as panel becomes active. Restored on exit. Tilt is small enough to avoid disorientation.
- **Right column — annotated callouts:**
  - Tiny eyebrow: `01 / 04` in `font-mono text-muted-foreground text-xs`.
  - Headline: `text-3xl lg:text-5xl font-semibold tracking-tight`.
  - Lede: 1–2 sentences, `text-lg text-muted-foreground`.
  - Three callout rows. Each row: icon in a small primary-tinted square (`p-2 rounded-md bg-primary/10`), bold label, supporting metric/detail.

### Panel content (4 panels)

| # | Title | Lede | Callouts |
|---|-------|------|----------|
| 01 | Technical Analysis | Indicator-driven signals across multiple timeframes. | "12+ indicators monitored 24/7" · "Multi-timeframe confluence" · "Volatility-adjusted signals" |
| 02 | Fundamental Analysis | Earnings, ratios, and financials parsed automatically. | "P/E, P/B, ROIC scoring" · "Quarterly updates from filings" · "Sector-relative valuation" |
| 03 | Sentiment Analysis | News and social sentiment measured in real-time. | "NLP-driven sentiment scoring" · "News + social media monitored" · "Sentiment-shift alerts" |
| 04 | Paper / Live Trading | Practice risk-free, then go live with one click. | "Paper trading sandbox" · "Broker integrations" · "One-click execution" |

### Progress indicator
- Fixed at bottom-center of the pinned viewport.
- 4 small dots; the active one elongates into a pill (`w-8`) using `scrollYProgress` (each dot active in its quartile).
- `text-xs` numeric label `01 — Technical Analysis` to the right; updates per panel.
- `pointer-events-none`.

### Mobile fallback (<lg breakpoint, 1024px)
- Skip horizontal scroll-jacking entirely.
- Render the 4 panels as a vertical stack of `min-h-[80vh]` sections, reusing the same panel internals.
- Each panel scroll-reveals (fade + translateY) on enter.
- Reason: scroll-jacking on mobile is fragile, conflicts with momentum scroll, harms Lighthouse and accessibility.

### Reduced motion
- Skip horizontal scroll mapping regardless of viewport size; render as the mobile vertical stack.
- No tilt on screenshots. Reveals are instant.

### Accessibility
- Wrapper has `aria-label="Product features"`.
- Each panel is a `<section>` with its own `<h2>` heading.
- Tab order matches visual reading order.
- Tabbing into a panel auto-scrolls the page so that panel is in view (`scrollIntoView({ behavior: 'smooth', block: 'start' })`) — keyboard users don't get stuck behind the pin.
- All textual content is fully readable without animation.

### Performance
- Track is animated only via `transform: translate3d(...)`. Never animate `width`, `left`, `right`, or the scrollable container's height during runtime.
- Images: `next/image` with explicit dimensions. `priority` on first panel only; `loading="lazy"` on the rest.
- Motion values bypass React state — no re-renders per frame.

---

## 8. How It Works

- Eyebrow + headline ("How it works", "Three steps to your first signal").
- 3 steps in a row (`md:grid-cols-3`); on mobile, vertical stack with a single dashed line on the left side (timeline).
- Connecting dashed line between steps on desktop only (CSS pseudo-element on each card except the last).
- Each step:
  - Large number `01`/`02`/`03`: `text-5xl font-semibold text-primary/30`.
  - Title: `text-xl font-semibold`.
  - 1-line description.
- Steps:
  1. **Connect your broker** — "Link your account in under a minute."
  2. **AI scans markets** — "Our engine watches 200+ assets in real time."
  3. **Get signals & auto-trade** — "Receive notifications, or let it execute for you."

---

## 9. Final CTA

- `py-32`, centered, `max-w-3xl mx-auto text-center`.
- Background: faint static grid lattice, no cursor effect — `opacity-[0.04]` flat.
- Headline: `text-4xl md:text-6xl font-semibold tracking-tight` — placeholder: "Start trading smarter today."
- Subhead: 1 line.
- Primary button: "Start Trading →" → `/trade`. `<Button variant="default" size="lg">`.

---

## 10. Footer (extended)

- Above existing credit line, add a 3-column block (`md:grid-cols-3 gap-8`):
  - **Col 1:** Logo (Gem + "Quant Trader AI") + 1-line tagline.
  - **Col 2:** Nav links — About, Trade, Dashboard.
  - **Col 3:** Social — GitHub (link existing), Instagram (moved from hero).
- Below: thin border + existing "Built by Nursultan Sagyntay" credit line.

---

## 11. Motion System

### Library
- Add `framer-motion` (~30kb gzipped). No other animation libraries.

### Reveal pattern
- Use `motion.div` with `whileInView={{ opacity: 1, y: 0 }}`, `initial={{ opacity: 0, y: 16 }}`, `viewport={{ once: true, margin: "-15%" }}`.
- Default duration: 400ms.
- Easing: `[0.16, 1, 0.3, 1]` (ease-out cubic).
- Stagger children: `staggerChildren: 0.06` on lists / callouts.
- Wrap as a single `<Reveal>` component for consistency.

### Constraints
- No scale or rotate animations except the carousel screenshot tilt.
- Micro durations 150–300ms (button hover, header morph). Section reveals 300–500ms. Nothing > 500ms.
- All transforms use `translate` / `opacity` only. Never animate `width`, `height`, `top`, `left`.

### Reduced motion
- All reveals collapse to instant `opacity: 1`, no transforms.
- Header morph snaps between states.
- Carousel falls back to vertical stack.
- Cursor grid renders as flat static lattice.
- Stat count-ups show final value immediately.

---

## 12. Design Tokens

### Z-index scale (define explicitly)
- `0` content
- `10` decorative (grid, glows)
- `40` sticky elements (carousel pin, progress indicator)
- `50` header
- `60` modals (none on landing; reserved for future)

### CSS variables (add to `globals.css`)
- `--mouse-x`, `--mouse-y` — cursor position relative to hero section. Set by hero. Used by grid mask.
- `--header-height` — current header height (64px → 52px). Used for skip-link offset and any anchor scroll padding.

### Colors / typography
- No new color tokens. Existing `primary` / `muted-foreground` / `border` / `background` system stays intact.
- No new font. Existing typography stack stays.

### Spacing
- Standard Tailwind scale (`4/8/12/16/24/32/48/64/96/128`). No custom values needed.

---

## 13. File Structure

New files under `frontend/src/components/landing/`:
- `header.tsx` — morphing header (replaces inline header in `page.tsx`).
- `hero.tsx` — hero section + cursor-aware grid.
- `cursor-grid.tsx` — extracted grid lattice (reused in hero + final CTA, with optional cursor-tracking variant).
- `trust-strip.tsx` — stats band with count-up.
- `about.tsx` — current About card, lightly tweaked. (Optional split — can stay inline if preferred.)
- `feature-carousel.tsx` — sticky horizontal carousel + mobile fallback.
- `feature-panel.tsx` — single panel renderer.
- `how-it-works.tsx` — 3-step section.
- `final-cta.tsx` — closing CTA.
- `site-footer.tsx` — extended footer.
- `reveal.tsx` — `whileInView` wrapper for consistent reveals.

`frontend/src/app/page.tsx` becomes a thin composition file:

```tsx
<>
  <Header />
  <Hero />
  <TrustStrip />
  <About />
  <FeatureCarousel />
  <HowItWorks />
  <FinalCTA />
  <SiteFooter />
</>
```

The `<Header />` and `<SiteFooter />` may also need to apply to other public pages (signin/signup) — to be decided during implementation. If shared, lift them into the `(front)` layout.

---

## 14. Dependencies

**Add:**
- `framer-motion` — for `useScroll`, `useTransform`, `motion`, `useInView`.

**No other new dependencies.** No animation library, no scroll-jacking helper, no state library beyond what's already in the project.

---

## 15. Accessibility Checklist

- Color contrast ≥4.5:1 for body text in both themes.
- All interactive elements have visible focus rings.
- Touch targets ≥44px in all states (including the morphed header).
- Skip-to-main link on the header, visible on focus.
- Heading hierarchy: one `<h1>` (hero), `<h2>` per section, no level skips.
- Carousel panels are `<section>` with their own `<h2>`; tab focus moves logically.
- Tabbing into a non-visible carousel panel triggers `scrollIntoView`.
- All meaningful images have `alt` text.
- `prefers-reduced-motion` collapses every animation as specified above.
- Cursor grid is purely decorative; nothing relies on it being visible.
- Dynamic Type / browser zoom: no fixed-px containers; all sizes scale with rem-based Tailwind tokens.

---

## 16. Performance Checklist

- Cursor grid: no React re-renders per frame (CSS variables only, RAF-throttled).
- Carousel: motion values only (no React state); single transform on a single track.
- Images: `next/image` with explicit dimensions; `priority` only on hero + first carousel panel.
- Below-fold images: `loading="lazy"`.
- No animation of layout-affecting properties.
- Reserve space for all async/animated content (no CLS).
- Intersection observers used for reveals are `once: true` so they disconnect after firing.

---

## 17. Out of Scope (explicit non-goals)

- Authenticated pages (dashboard, trade, account, analysis).
- Any backend, API, or data-model change.
- New product features or new copy beyond stat labels and step descriptions.
- Auth flow changes.
- Email capture / newsletter signup.
- A/B testing infrastructure.
- Analytics events beyond what `@vercel/analytics` already provides.

---

## 18. Open Questions (resolve during implementation)

- Final eyebrow text in hero (`New: Sentiment Analysis 2.0` is placeholder).
- Whether the cursor grid renders any visible lattice on coarse-pointer devices, or skips entirely.
- Whether `<Header />` and `<SiteFooter />` should be shared with signin/signup via the `(front)` layout (most likely yes for header).
- Final headline copy for "Final CTA" and the carousel preamble.

These do not block design approval; they are minor copy/UX details to settle during the build.
