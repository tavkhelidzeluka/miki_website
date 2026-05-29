# Mobile Version — Design

Date: 2026-05-29
Branch: `mobile-version`
Status: approved (design), pending implementation plan

## Goal

Make the GTXHI / MIKI portfolio usable and on-brand on phones (≤768px). Today the
entire site renders inside a fixed 1440×900 canvas that is transform-scaled to fit
the viewport, so on a ~390px phone everything is uniformly shrunk to ~0.27× — text
is unreadable and tap targets are tiny. This design replaces that scaled-down view
with a true single-column mobile layout while preserving the brutalist aesthetic
(brackets, monospace nav, all-caps display type, paper/ink palette).

Desktop behavior is unchanged.

## The core problem

`Scaled()` in `index.html` (~line 4164) computes
`s = Math.min(innerWidth/1440, innerHeight/900)` and applies
`transform: translate(-50%,-50%) scale(s)` to `.scaler-inner`, which has a fixed
`width:1440px; height:900px`. `<App/>` renders inside it. Three coupled CSS rules
lock the canvas:

- `.scaler-wrap` — `position:fixed; inset:0; overflow:hidden` (`index.html:386` / `styles.css:30`)
- `.scaler-inner` — `position:absolute; width:1440px; height:900px; top/left:50%; transform-origin:center` (`index.html:395` / `styles.css:39`)
- `.site` — `width:1440px; height:900px; overflow:hidden` (`index.html:405`)
- `html, body { overflow:hidden; height:100% }` (`index.html:360`) — blocks native scroll.

The two existing `@media (max-width:768px)` blocks (`styles.css:1992` for Nav + Home,
`styles.css:2414` for an old `.sm-*` namespace) are effectively **dead**: their
elements live inside `.scaler-inner`, which is still 1440px wide and scaled down, so
the rules render at ~27% too. Nothing currently unsets the scaler — that is the root
cause to fix first.

## Critical build constraint (load-bearing)

**There is no build step and no CSS bundler.** `styles.css` and `design-system.css`
are *inlined* into `index.html` as `<style data-source="styles.css">` (line 356) and
`<style data-source="design-system.css">` (line 99). There is **no
`<link rel="stylesheet">`** for them. The editor comment at `index.html:4148`
confirms it: *"the project's styles.css is itself inlined in this document and not
loaded as an external stylesheet, so edits to it would have no effect."* So editing
`styles.css` alone does **not** ship.

JSX, by contrast, *is* loaded from external files via
`<script type="text/babel" src="…">` (`index.html:4084–4120`), so `.jsx` edits ship
directly. The project already loads separate linked CSS for the editor
(`editor/editor.css`, loaded when logged in).

### Decision: all mobile CSS lives in a new linked `mobile.css`

Create `mobile.css` at repo root and add `<link rel="stylesheet" href="mobile.css">`
in `index.html`'s `<head>` **after** the inlined `<style>` blocks. Rationale:

- Ships directly (a real linked stylesheet) — no dual-write to the 3,700-line inlined block.
- Loads after the inline styles, so at equal specificity it wins, within its `@media`/`html[data-mobile]` scope.
- Isolated and reviewable: all mobile behavior in one file, trivial to disable or revert.
- Matches the existing `editor.css` pattern.

The existing dead mobile `@media` blocks (Nav + Home) in the inlined CSS will be
**folded into `mobile.css`** so there is one place to read mobile behavior. They may
be left in place harmlessly, but consolidating avoids two sources of truth.

Rejected alternatives: dual-writing every rule to `styles.css` + the inlined block
(error-prone; silent breakage if mirrors drift); de-inlining `styles.css` into a real
`<link>` (largest blast radius — changes how all desktop CSS loads, risks FOUC,
forces revisiting the editor's inlining assumption; out of scope for a mobile pass).

## Architecture

### Scaler bypass mechanism

One JS change unlocks everything. In `Scaled()` (`index.html` ~4164):

- Add a `const mq = window.matchMedia("(max-width: 768px)")` listener alongside the
  existing resize handler.
- When `mq.matches`: set `document.documentElement.dataset.mobile = "true"` and render
  `.scaler-inner` with `transform: "none"` (skip the scale calc; don't thrash `setScale`).
- When it doesn't match: remove the attribute and resume the existing scale logic.
- Read once on mount, then `mq.addEventListener("change", …)`.

In `mobile.css`, a `html[data-mobile="true"]` reset group makes the canvas fluid:

```css
html[data-mobile="true"] .scaler-wrap { position: static; overflow: visible; }
html[data-mobile="true"] .scaler-inner {
  position: static; width: 100%; height: auto; top: auto; left: auto;
  transform: none !important;
}
html[data-mobile="true"] .site {
  width: 100%; height: auto; min-height: 100dvh; overflow: visible;
}
html[data-mobile="true"], html[data-mobile="true"] body {
  overflow-x: hidden; overflow-y: auto; height: auto;
}
```

Why JS-gated rather than pure CSS: the scale lives in an *inline* `transform` written
by React from state. CSS can override the static transform but would leave the resize
loop running and `width:1440px` driving layout intrinsics. The `matchMedia` gate is the
single source of truth and stops the scale work on phones.

Why `<html>` (documentElement): it sits above the React mount, so a re-render never
clobbers the attribute, and it lets the same selector root flip `html { overflow }`.

Breakpoint: **768px** everywhere (matches `matchMedia` and all existing `@media` blocks).
Viewport meta (`index.html:6`, `width=device-width, initial-scale=1`) is already correct.

## Components / per-page plan

Unless noted, changes are **CSS-only** in `mobile.css`.

### Nav → hamburger drawer (`Nav.jsx`)
The bones exist: `.nav-toggle` (menu button) and a `.nav-cluster` that collapses
(`Nav.jsx:41–82`). `mobile.css` styles the open `.nav--open .nav-cluster` as a
full-width slide-in drawer with large tap targets, preserving brackets + monospace.
**Cart stays inside the drawer** (already there, `Nav.jsx:54–61`) with its count badge;
tapping routes to canvas and opens the cart drawer (`App.jsx:177`). Likely CSS-only;
JSX touched only if a hamburger glyph swap is wanted.

### Home (`Home.jsx`; existing mobile CSS at `styles.css:2031`)
Keep the existing photo-centric overlay treatment (hero text over the photo with
`mix-blend-mode:difference`) — it is a deliberate design already in the repo and only
needs the scaler bypassed to render. The existing mobile rule targets the diagonal
branch's `.home-mark--tl/--br`; the default (`DEFAULT_TWEAKS.layout = "diagonal"`,
`App.jsx:6`) already produces that branch, and Tweaks is hidden on mobile, so a fresh
visitor always gets it. Only if a non-diagonal `tweaks.layout` could persist from a
prior desktop session (localStorage) is a JS guard in `Home.jsx` needed to force the
diagonal branch at ≤768px — treat that as optional. Reflow the absolute
`.home-status`, `.home-meta`, `.home-corner--bl-time` (clock), `.home-mini-thumb` to a
static stacked footer under the photo (or hide the non-essential `.home-mini-thumb` /
`.home-meta`). Switch `calc(100vh - 60px)` → `dvh`. Marquee stays (keep `pointer-events:none`).

### Projects — grid (`Projects.jsx`; no existing mobile CSS for `.proj-*`)
`.proj-gridv2` (absolute, `repeat(4,1fr)`) → `position:static; grid-template-columns:1fr;
gap:24px; padding:0 16px`. `.proj-tile` keeps `aspect-ratio:4/3`, `width:100%`.
`.proj-headline` 72px → `clamp(40px,12vw,72px)`, static.

### Projects — category strip (`CategoryStrip` in `Projects.jsx`)
The horizontal offset carousel (`.cat-strip` flex, fixed 50px gaps, 110px padding,
88×116 → 280×360 thumbs) is incompatible with 390px. On mobile, convert to a
**vertical scroll of full-width rows, one work per row**: `.cat-thumb` items →
`width:100%; height:auto` (aspect preserved); `.cat-label` → `position:sticky; top:0`
header; `.cat-arrow` prev/next hidden (native scroll replaces them). Tapping a row
opens the fullscreen work detail. The `i`/`pulse` carousel state becomes inert on
mobile — acceptable; add a small JS guard in `Projects.jsx` only if the carousel
transforms fight the stacked layout.

### Work detail (`ProjectDetail`)
`.detail-grid` (`540px 1fr`) → single column `1fr`. `.detail-image` (fixed 540×700) →
`width:100%; height:auto`. Fullscreen via `100dvh`. Swipe gestures added (see
cross-cutting).

### About (`About.jsx`; no existing mobile CSS)
All children are `position:absolute` on the 1440 canvas. `.page--about` →
`position:static; display:flex; flex-direction:column; gap; padding:24px 16px`; reset
each child (`.about-portrait`, `.about-headline`, `.about-bio`, `.about-col--exp`,
`.about-col--skills`, `.about-projects`, `.about-contact`) to
`position:static; inset:auto; width:100%`. Portrait 456×568 → `width:100%; max-width:320px;
height:auto`. Headline 180px → tighter `clamp` (e.g. `clamp(48px,16vw,120px)`).
`.projects-grid` `1fr 1fr` → `1fr`. Editor `+`/`×` affordances stay hidden.

### Contact (`Contact.jsx`; no existing mobile CSS)
Absolute → static stack. `.social-portrait` 460×560 → `width:100%; max-width:300px;
height:auto`. `.social-headline` 84px → `clamp(40px,12vw,84px)`. `.contact-card`
(`left:540px`) → static full-width. `.social-rows` grid `140px 1fr` → stack each
`.social-row` to label-over-value (`grid-template-columns:1fr`) or `90px 1fr` if it
fits; reduce per-row `padding:22px 0` → ~`14px 0`. Hairline borders kept.

### Canvas / shop (`Canvas.jsx`; no existing mobile CSS)
`.canvas-scroll` (absolute, internal `overflow-y:auto`) → `position:static;
overflow:visible` (native page scroll). `.canvas-grid` `repeat(3,1fr) gap:56px` →
`repeat(2,1fr)` (denser shop feel), `gap:20px`, `padding:0 16px`. `.canvas-headline` 180px →
`clamp(48px,14vw,120px)`. Currency switches and `.btn` order buttons → ≥44px tap
targets. `.prod-img` keeps `aspect-ratio:280/340; width:100%`; `.prod-foot` allowed to
wrap/stack. **Cart drawer** `width:380px` → `width:100%` (or `min(380px,90vw)`),
full-height. `.canvas-zoom` (already `inset:0`) → constrain image to `max-width:90vw;
max-height:90dvh`.

### Checkout (`Checkout.jsx`; no existing mobile CSS — greenfield)
`.checkout` (absolute `inset:0`, `padding:78px 44px 44px`) → `position:fixed; inset:0;
overflow-y:auto; padding:16px`. `.checkout-body` `1fr 380px gap:64px` → `1fr; gap:24px`.
**`.checkout-summary` moves to the bottom** (`order:2`) and drops `position:sticky`
(it would otherwise cover the form); `width:380px` → `width:100%`. `.checkout-grid`
`1fr 1fr` → `1fr`; inputs full-width, font ≥16px (avoids iOS zoom-on-focus).
`.checkout-headline` 84px → `clamp(40px,12vw,84px)`. `.checkout-steps` (`gap:28px`,
4 spans) → `flex-wrap:wrap` or reduced gap. `.summary-item` `36px 1fr auto` kept.

### Social (`Social.jsx`; no mobile CSS for the live `sm2-` namespace)
Note: the `.sm-*` rules at `styles.css:2414` are for a dead namespace; `Social.jsx`
uses `sm2-`. `.sm-scroll` (absolute, `overflow-y:auto`) → native scroll.
`GalleryStrip` (9-tile horizontal offset carousel) → stacked or 2-col grid list;
`.sm2-gal-arrow` hidden; tile tap still opens `.sm2-zoom`. `.sm-statement` padding
`96px 60px` → `48px 16px`; the `padding-left:220px/80px` nth-child indents → reset to
`0` (or scale to ~`24px/8px`) to keep rhythm without overflow; statement font →
`clamp(48px,16vw,120px)`. `.sm2-zoom` inner image → `max-width:92vw; max-height:80dvh`,
with `-nav`/`-counter`/`-meta` stacked below. `.sm-outro` → column; mail 64px →
`clamp(20px,8vw,40px)`. CSS-first; JS guard in `Social.jsx` only if the offset
transforms fight the stacked layout.

## Cross-cutting concerns

- **Swipe gestures** (`App.jsx` / `ProjectDetail`): add `touchstart`/`touchend` delta
  handlers on the detail root that call the already-wired `onNext` / `onPrev` /
  `onClose` props (`App.jsx:128–147, 204–212`). Horizontal-dominant beyond a threshold
  → prev/next (which already step *within a category's works* when `workIndex` is set);
  vertical-dominant + downward → close. Because those handlers update `detailProject`,
  the hash URL auto-updates via the `useEffect` at `App.jsx:91` (using `replaceState`,
  so swipes don't pollute the back-stack; browser-back cleanly exits the overlay).
  No routing rewrite. Guard against scroll conflicts (only act when one axis clearly
  dominates). Gestures are reserved for the fullscreen detail; the vertical category
  strip uses native scroll.
- **BracketCursor** (`App.jsx:58`): early-return when
  `matchMedia("(pointer: coarse)").matches`; `mobile.css` sets
  `html[data-mobile] .bracket-cursor { display:none }`.
- **Hover affordances**: wrap state-conveying `:hover` rules in `@media (hover:hover)`
  so they don't stick after tap on touch; add `:active` feedback and
  `-webkit-tap-highlight-color: transparent`.
- **Editor / admin**: already hidden for visitors (`index.html:4151`); add
  belt-and-suspenders `html[data-mobile] .editor-add-tile, …{ display:none !important }`
  so CMS chrome never appears on phones even in an authenticated session.
- **Font sizing**: display headlines overridden to `clamp()` tokens (from
  `design-system.css:84`) or tighter mobile clamps inside the mobile rules, with
  `!important` where needed to beat inline px in the JSX. Body text uses fixed mobile
  px (13–16px); inputs ≥16px. Do not strip inline px from JSX wholesale (large risk);
  override in `mobile.css`.
- **Viewport units**: use `dvh` (`100dvh`, `min-height:100dvh`) for full-screen feels
  (home, detail, checkout, zoom, cart drawer) to dodge the iOS address-bar `100vh`
  jump; provide a `vh` fallback line before `dvh` for old browsers.
- **Tweaks panel**: hidden on mobile via `html[data-mobile] .twk-panel { display:none }`.
  (`.twk-panel` is the panel root in `tweaks-panel.jsx:293`; its base CSS is injected by
  that component, and the `html[data-mobile]` prefix outspecifies it.)

## Out of scope

- Editor / admin mobile UX (editing happens on desktop).
- Tweaks panel mobile UX (hidden).
- De-inlining `styles.css`.
- Any desktop layout changes.

## Build / verification order

1. **Scaler bypass** (`Scaled()` + `html[data-mobile]` reset in `mobile.css`, linked in
   `<head>`). Verify the *existing* Home/Nav mobile rules suddenly render correctly at
   ≤768px — this proves the mechanism before any new per-page CSS.
2. **Nav drawer** polish.
3. **Per-page CSS**, traffic order: Home → Projects grid → Projects strip + work
   detail + swipe → About → Contact → Canvas → Checkout → Social.
4. **Cross-cutting hardening**: `pointer:coarse` / hover guards / editor hide / `dvh`.

Verification is manual at ≤768px (e.g. responsive devtools / a real phone) per page,
plus a desktop regression pass to confirm the scaler still scales above 768px.

## Files touched

| File | Change |
|---|---|
| `mobile.css` (new) | All mobile CSS: `html[data-mobile]` scaler reset + per-page `@media (max-width:768px)` reflow + cross-cutting hardening. |
| `index.html` | (a) `<link rel="stylesheet" href="mobile.css">` in `<head>` after the inline `<style>` blocks. (b) `Scaled()` (~4164): `matchMedia` listener sets/removes `html[data-mobile]` and skips the transform on phones. |
| `App.jsx` | Harden `BracketCursor` for `pointer:coarse`; wire swipe handlers into the detail overlay (calls existing `onNext`/`onPrev`/`onClose`). |
| `Projects.jsx` | Optional JS guard so `CategoryStrip` degrades to a vertical stack; ensure detail overlay accepts the swipe handlers. |
| `Social.jsx` | Optional JS guard so `GalleryStrip` degrades to a stacked/grid list. |
| `Nav.jsx` | Optional: hamburger glyph / drawer markup tweaks (CSS-first; touch only if needed). |
