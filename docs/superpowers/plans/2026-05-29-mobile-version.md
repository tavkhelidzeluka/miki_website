# Mobile Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the GTXHI / MIKI portfolio usable and on-brand on phones (≤768px) by bypassing the 1440×900 transform-scaler and delivering a true single-column mobile layout, without changing desktop.

**Architecture:** A `matchMedia("(max-width: 768px)")` listener inside `Scaled()` (`index.html`) sets a `data-mobile="true"` attribute on `<html>` and skips applying the scale transform on phones. A new linked stylesheet `mobile.css` (loaded after the inlined `<style>` blocks) keys all mobile rules off `html[data-mobile="true"]` and `@media (max-width: 768px)`, resetting the fixed canvas to fluid and reflowing each page to one column. Swipe-between-works is wired into the existing `ProjectDetail` overlay using its already-present `onNext`/`onPrev`/`onClose` props.

**Tech Stack:** Static site — React via in-browser Babel, no build step. CSS plain. Verification via the Playwright MCP at a 390×844 viewport against a local `python3 -m http.server`.

**Spec:** `docs/superpowers/specs/2026-05-29-mobile-version-design.md`

---

## Critical constraints (read before any task)

- **No build step. `styles.css`/`design-system.css` are inlined into `index.html`** (`<style data-source=…>`). Editing `styles.css` does NOT ship. **All mobile CSS goes in the new linked `mobile.css`.** Do not edit the inlined blocks.
- **JSX ships from external files** (`<script type="text/babel" src="…">`), so `.jsx` edits ship directly.
- **mobile.css must stay self-contained and append-only by section.** Each task appends one clearly-commented `/* ── Task N: … ── */` block so the file reads top-to-bottom in build order.
- Breakpoint is **768px** everywhere (matches the `matchMedia` gate and existing `@media` blocks).

## Verification setup (do once, before Task 1)

- [ ] **Start a local server** (background):

```bash
cd /Users/sds-ge573/PycharmProjects/miki_website
python3 -m http.server 8000 >/tmp/miki-http.log 2>&1 &
```

- [ ] **Confirm it serves:**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/index.html`
Expected: `200`

**How verification works in every task below:** use the Playwright MCP — `browser_resize` to width 390 height 844, `browser_navigate` to the given `http://localhost:8000/#…` URL, then `browser_evaluate` with the given function and compare to the expected return. A reusable "no horizontal overflow" check is:

```js
() => ({ scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
         overflow: document.documentElement.scrollWidth > window.innerWidth + 1 })
```

Expected for a healthy mobile page: `overflow: false`.

> If running headless without the Playwright MCP, the equivalent manual check is: open the URL in a browser, set the device toolbar to 390px wide, and confirm the assertion described in each step by eye + devtools "Computed" panel.

---

## Task 1: Scaler bypass — the unlock

Adds `mobile.css`, links it, and makes `Scaled()` switch to native layout below 768px. After this task the **existing** Home/Nav mobile rules (currently dead) should suddenly render — that proves the mechanism before any new per-page CSS.

**Files:**
- Create: `mobile.css`
- Modify: `index.html` (insert `<link>` before `</head>` at line 4075; rewrite `Scaled()` at lines 4164–4185)

- [ ] **Step 1: Create `mobile.css` with the scaler-reset block**

Create `mobile.css`:

```css
/* mobile.css — all mobile (≤768px) rules for the GTXHI/MIKI portfolio.
   Loaded via <link> AFTER the inlined <style> blocks in index.html, so it
   wins specificity ties within its html[data-mobile] / @media scope.
   styles.css is inlined with no build step — do NOT put mobile rules there. */

/* ── Task 1: scaler bypass ──────────────────────────────────────────────
   On phones, Scaled() sets html[data-mobile="true"] and stops applying the
   transform. These rules turn the fixed 1440×900 canvas into fluid flow. */
html[data-mobile="true"],
html[data-mobile="true"] body {
  overflow-x: hidden;
  overflow-y: auto;
  height: auto;
}
html[data-mobile="true"] .scaler-wrap {
  position: static;
  overflow: visible;
}
html[data-mobile="true"] .scaler-inner {
  position: static;
  width: 100%;
  height: auto;
  top: auto;
  left: auto;
  transform: none !important;
}
html[data-mobile="true"] .site {
  width: 100%;
  height: auto;
  min-height: 100vh;      /* fallback for old browsers */
  min-height: 100dvh;     /* dodges iOS address-bar jump */
  overflow: visible;
}
```

- [ ] **Step 2: Link `mobile.css` in `index.html`**

In `index.html`, insert immediately before `</head>` (currently line 4075, right after the `<style data-source="inline-bg">…</style>` block):

```html
<link rel="stylesheet" href="mobile.css">
```

- [ ] **Step 3: Rewrite `Scaled()` to gate on `matchMedia`**

In `index.html`, replace the entire `Scaled()` function (lines 4164–4185) with:

```jsx
  function Scaled() {
    const mq = window.matchMedia("(max-width: 768px)");
    const [scale, setScale] = React.useState(1);
    const [isMobile, setIsMobile] = React.useState(() => mq.matches);
    React.useEffect(() => {
      const setAttr = (m) => {
        if (m) document.documentElement.setAttribute("data-mobile", "true");
        else document.documentElement.removeAttribute("data-mobile");
      };
      const fit = () => {
        if (mq.matches) return; // mobile: native layout, skip scaling
        setScale(Math.min(window.innerWidth / 1440, window.innerHeight / 900));
      };
      const onChange = () => { setIsMobile(mq.matches); setAttr(mq.matches); fit(); };
      setAttr(mq.matches); // initial
      fit();
      window.addEventListener("resize", fit);
      mq.addEventListener("change", onChange);
      return () => {
        window.removeEventListener("resize", fit);
        mq.removeEventListener("change", onChange);
      };
    }, []);
    return (
      <div className="scaler-wrap">
        <div
          className="scaler-inner"
          style={isMobile ? undefined : { transform: `translate(-50%, -50%) scale(${scale})` }}
        >
          <App />
        </div>
      </div>
    );
  }
```

- [ ] **Step 4: Verify the bypass at 390px**

Playwright: `browser_resize` 390×844 → `browser_navigate` `http://localhost:8000/#/` → `browser_evaluate`:

```js
() => ({
  dataMobile: document.documentElement.getAttribute("data-mobile"),
  transform: getComputedStyle(document.querySelector(".scaler-inner")).transform,
  siteWidth: document.querySelector(".site").getBoundingClientRect().width,
})
```

Expected: `dataMobile: "true"`, `transform: "none"`, `siteWidth` ≈ 390 (not 1440).

- [ ] **Step 5: Verify desktop is untouched**

Playwright: `browser_resize` 1440×900 → `browser_navigate` `http://localhost:8000/#/` → `browser_evaluate`:

```js
() => ({
  dataMobile: document.documentElement.getAttribute("data-mobile"),
  transform: getComputedStyle(document.querySelector(".scaler-inner")).transform,
})
```

Expected: `dataMobile: null`, `transform` is a `matrix(...)` (scale applied) — NOT `none`.

- [ ] **Step 6: Commit**

```bash
git add mobile.css index.html
git commit -m "feat(mobile): bypass 1440x900 scaler below 768px via html[data-mobile]"
```

---

## Task 2: Nav → hamburger drawer

`Nav.jsx` already renders a `.nav-toggle` button and a `.nav-cluster` that the existing CSS collapses. Make the open cluster a full-width drawer with large tap targets. CSS-only.

**Files:**
- Modify: `mobile.css` (append)

- [ ] **Step 1: Append the Nav drawer block to `mobile.css`**

```css
/* ── Task 2: Nav hamburger drawer ───────────────────────────────────── */
@media (max-width: 768px) {
  .nav {
    position: sticky;
    top: 0;
    background: var(--paper);
    z-index: 50;
    padding: 12px 16px;
  }
  .site[data-invert="true"] .nav { background: #0A0A0A; }
  .nav-toggle { display: inline-block; font-size: 15px; padding: 8px 0; }
  /* Drawer: full-width column, generous tap targets */
  .nav--open .nav-cluster {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
    width: 100%;
    padding: 16px 0 8px;
    font-size: 18px;
  }
  .nav--open .nav-cluster .nav-link { font-size: 18px; padding: 6px 0; }
  .nav-cart { display: inline-flex; align-items: center; gap: 8px; }
  .nav-lang { margin-top: 4px; }
}
```

- [ ] **Step 2: Verify the toggle opens a full-width drawer**

Playwright: 390×844 → `http://localhost:8000/#/projects` → `browser_click` the menu button (role=button, name contains "menu") → `browser_evaluate`:

```js
() => {
  const c = document.querySelector(".nav--open .nav-cluster");
  return c ? { display: getComputedStyle(c).display, dir: getComputedStyle(c).flexDirection,
               width: Math.round(c.getBoundingClientRect().width) } : "closed";
}
```

Expected: `display: "flex"`, `dir: "column"`, `width` ≈ viewport width (≈ 358–390).

- [ ] **Step 3: Commit**

```bash
git add mobile.css
git commit -m "feat(mobile): full-width nav drawer with large tap targets"
```

---

## Task 3: Home reflow

Keep the photo-centric overlay treatment (already in the inlined CSS at the old `styles.css:2031`). Reflow the absolute clock / status / meta into a static footer and switch the home min-height to `dvh`. CSS-only. (The default `tweaks.layout` is `"diagonal"`, `App.jsx:6`, so a fresh mobile visitor always gets the overlay branch — no JS needed.)

**Files:**
- Modify: `mobile.css` (append)

- [ ] **Step 1: Append the Home block to `mobile.css`**

```css
/* ── Task 3: Home ───────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .page--home {
    min-height: calc(100vh - 60px);
    min-height: calc(100dvh - 60px);
    padding: 24px 16px 40px;
  }
  /* Reflow the absolute corner chrome into a static, centered footer column */
  .home-corner--tr,
  .home-mini-thumb { display: none; }            /* drop non-essential overlays */
  .home-status,
  .home-meta,
  .home-corner--bl-time {
    position: static !important;
    left: auto !important; right: auto !important;
    top: auto !important; bottom: auto !important;
    width: 100% !important;
    max-width: none !important;
    margin: 14px auto 0 !important;
    text-align: center;
  }
  .home-status { display: flex; justify-content: center; gap: 10px; }
}
```

- [ ] **Step 2: Verify no horizontal overflow on Home**

Playwright: 390×844 → `http://localhost:8000/#/` → `browser_evaluate` the overflow check (from setup). Expected `overflow: false`. Also `browser_take_screenshot` to eyeball the wordmark-over-photo treatment.

- [ ] **Step 3: Commit**

```bash
git add mobile.css
git commit -m "feat(mobile): reflow Home chrome into a static footer"
```

---

## Task 4: Projects grid

`.proj-gridv2` is absolute `repeat(4,1fr)`. Make it a static single column. CSS-only.

**Files:**
- Modify: `mobile.css` (append)

- [ ] **Step 1: Append the Projects-grid block to `mobile.css`**

```css
/* ── Task 4: Projects grid ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .proj-headline {
    position: static;
    font-size: clamp(40px, 12vw, 72px);
    padding: 16px 16px 0;
    text-align: left;
  }
  .proj-gridv2 {
    position: static;
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 16px;
    inset: auto;
  }
  .proj-tile { width: 100%; }   /* keep aspect-ratio: 4/3 */
}
```

- [ ] **Step 2: Verify single-column grid, no overflow**

Playwright: 390×844 → `http://localhost:8000/#/projects` → `browser_evaluate`:

```js
() => ({
  cols: getComputedStyle(document.querySelector(".proj-gridv2")).gridTemplateColumns,
  overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
})
```

Expected: `cols` is a single track (one value, ≈ full width), `overflow: false`.

- [ ] **Step 3: Commit**

```bash
git add mobile.css
git commit -m "feat(mobile): single-column Projects grid"
```

---

## Task 5: Category strip → vertical stack

The horizontal offset carousel (`.cat-strip`) is incompatible with 390px. On mobile, stack works as full-width rows with a sticky category label and no arrows. CSS-first (the carousel's `i`/`pulse` state simply becomes visually inert). Tapping a row still opens the detail overlay.

**Files:**
- Modify: `mobile.css` (append)

- [ ] **Step 1: Append the Category-strip block to `mobile.css`**

```css
/* ── Task 5: Category strip → vertical stack ────────────────────────── */
@media (max-width: 768px) {
  .cat-label {
    position: sticky;
    top: 52px;                 /* below the sticky nav */
    left: auto;
    z-index: 10;
    background: var(--paper);
    padding: 12px 16px;
  }
  .site[data-invert="true"] .cat-label { background: #0A0A0A; }
  .cat-arrow { display: none; }
  .cat-strip {
    position: static;
    transform: none;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 8px 16px 24px;
  }
  /* Every thumb becomes a full-width row at a readable size */
  .cat-thumb,
  .cat-thumb--active {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 4 / 3;
    opacity: 1 !important;
    transform: none !important;
    flex: 0 0 auto;
  }
  .cat-meta {
    position: static;
    bottom: auto; left: auto;
    padding: 0 16px 24px;
  }
  .cat-meta .cat-name { font-size: clamp(22px, 7vw, 40px); }
}
```

- [ ] **Step 2: Verify rows stack vertically, arrows hidden, no overflow**

Playwright: 390×844 → `http://localhost:8000/#/projects/02` (POSTERS strip) → `browser_evaluate`:

```js
() => {
  const strip = document.querySelector(".cat-strip");
  const arrow = document.querySelector(".cat-arrow");
  const thumbs = document.querySelectorAll(".cat-thumb");
  return {
    dir: strip ? getComputedStyle(strip).flexDirection : null,
    arrowHidden: arrow ? getComputedStyle(arrow).display === "none" : true,
    firstThumbWidth: thumbs[0] ? Math.round(thumbs[0].getBoundingClientRect().width) : null,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
}
```

Expected: `dir: "column"`, `arrowHidden: true`, `firstThumbWidth` ≈ viewport minus 32px padding (~358), `overflow: false`.

- [ ] **Step 3: Commit**

```bash
git add mobile.css
git commit -m "feat(mobile): category strip becomes a vertical stack with sticky label"
```

---

## Task 6: Work detail reflow + swipe gestures

Reflow the `.detail-grid` (540px + 1fr) to one column and the fixed-size image to fluid, then add touch swipe to the `ProjectDetail` overlay calling its existing `onNext`/`onPrev`/`onClose` props. `ProjectDetail` lives in `Projects.jsx:244` and already has a keydown `useEffect` to model the touch handler on.

**Files:**
- Modify: `mobile.css` (append)
- Modify: `Projects.jsx` (add a touch `useEffect` inside `ProjectDetail`, after the keydown effect ending at line 254)

- [ ] **Step 1: Append the detail-overlay CSS to `mobile.css`**

```css
/* ── Task 6: Work detail overlay ────────────────────────────────────── */
@media (max-width: 768px) {
  .detail-scrim { overflow-y: auto; }
  .detail-grid {
    position: static;
    grid-template-columns: 1fr;
    gap: 20px;
    inset: auto;
    padding: 56px 16px 32px;   /* clear the .detail-close button */
    min-height: 100vh;
    min-height: 100dvh;
  }
  .detail-image,
  .detail-image--img {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 4 / 5;
  }
  .detail-close { top: 12px; right: 16px; font-size: 15px; }
}
```

- [ ] **Step 2: Add the swipe `useEffect` to `ProjectDetail`**

In `Projects.jsx`, immediately after the keydown `useEffect` (the block that ends with `}, [onClose, onNext, onPrev]);` at line 254), insert:

```jsx
  // Touch swipe (mobile): horizontal → prev/next within category, vertical-down → close.
  React.useEffect(() => {
    let x0 = null, y0 = null;
    const onStart = (e) => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; };
    const onEnd = (e) => {
      if (x0 === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      const THRESH = 50;
      if (ax > ay && ax > THRESH) { dx < 0 ? onNext() : onPrev(); }
      else if (ay > ax && dy > THRESH * 1.6) { onClose(); }
      x0 = y0 = null;
    };
    const el = document.querySelector(".detail-scrim");
    if (!el) return;
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [onClose, onNext, onPrev]);
```

- [ ] **Step 3: Verify detail reflow + swipe-next changes the work**

Playwright: 390×844 → `http://localhost:8000/#/projects/02/0` → `browser_evaluate` to capture the current title and grid columns:

```js
() => ({
  cols: getComputedStyle(document.querySelector(".detail-grid")).gridTemplateColumns,
  title: document.querySelector(".detail-title")?.textContent,
  hash: location.hash,
})
```

Expected: `cols` is a single track. Then simulate a left-swipe and re-read:

```js
() => {
  const el = document.querySelector(".detail-scrim");
  const mk = (type, x, y) => new TouchEvent(type, { bubbles: true,
    [type === "touchend" ? "changedTouches" : "touches"]: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk("touchstart", 300, 400));
  el.dispatchEvent(mk("touchend", 100, 405));
  return { hash: location.hash, title: document.querySelector(".detail-title")?.textContent };
}
```

Expected: `hash` advances from `#/projects/02/0` to `#/projects/02/1` and `title` changes. (If the browser blocks the `Touch` constructor, fall back to manually swiping on a real device / the device-emulation touch tool and confirm next/prev/close by eye.)

- [ ] **Step 4: Verify desktop detail still uses two columns**

Playwright: 1440×900 → `http://localhost:8000/#/projects/02/0` → `browser_evaluate` `() => getComputedStyle(document.querySelector(".detail-grid")).gridTemplateColumns`. Expected: two tracks (≈ `540px …`).

- [ ] **Step 5: Commit**

```bash
git add mobile.css Projects.jsx
git commit -m "feat(mobile): single-column work detail + swipe between works"
```

---

## Task 7: About reflow

All sections are absolutely positioned on the 1440 canvas. Stack them. CSS-only.

**Files:**
- Modify: `mobile.css` (append)

- [ ] **Step 1: Append the About block to `mobile.css`**

```css
/* ── Task 7: About ──────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .page--about {
    position: static;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 16px;
    inset: auto;
    height: auto;
  }
  .about-portrait,
  .about-headline,
  .about-bio,
  .about-col,
  .about-col--exp,
  .about-col--skills,
  .about-projects,
  .about-contact {
    position: static !important;
    inset: auto !important;
    left: auto !important; right: auto !important; top: auto !important; bottom: auto !important;
    width: 100% !important;
  }
  .about-portrait { max-width: 320px; height: auto; }
  .about-headline { font-size: clamp(48px, 16vw, 120px); }
  .projects-grid { grid-template-columns: 1fr; }
  .about-contact { display: flex; flex-direction: column; gap: 12px; }
}
```

- [ ] **Step 2: Verify About stacks, no overflow**

Playwright: 390×844 → `http://localhost:8000/#/about` → overflow check. Expected `overflow: false`. `browser_evaluate` also confirm the portrait is constrained:

```js
() => Math.round(document.querySelector(".about-portrait").getBoundingClientRect().width)
```

Expected: ≤ 320.

- [ ] **Step 3: Commit**

```bash
git add mobile.css
git commit -m "feat(mobile): stack About sections into one column"
```

---

## Task 8: Contact reflow

Absolute → static stack; contact rows go label-over-value. CSS-only.

**Files:**
- Modify: `mobile.css` (append)

- [ ] **Step 1: Append the Contact block to `mobile.css`**

```css
/* ── Task 8: Contact ────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .page--contact {
    position: static;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 16px;
    inset: auto;
    height: auto;
  }
  .social-portrait,
  .social-headline,
  .contact-card {
    position: static !important;
    inset: auto !important;
    left: auto !important; right: auto !important; top: auto !important; bottom: auto !important;
    width: 100% !important;
  }
  .social-portrait { max-width: 300px; height: auto; }
  .social-headline { font-size: clamp(40px, 12vw, 84px); }
  .social-row {
    grid-template-columns: 1fr;   /* label stacks above value */
    gap: 4px;
    padding: 14px 0;
  }
}
```

- [ ] **Step 2: Verify Contact stacks, rows single-column, no overflow**

Playwright: 390×844 → `http://localhost:8000/#/contact` → `browser_evaluate`:

```js
() => ({
  rowCols: getComputedStyle(document.querySelector(".social-row")).gridTemplateColumns,
  overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
})
```

Expected: `rowCols` is a single track, `overflow: false`.

- [ ] **Step 3: Commit**

```bash
git add mobile.css
git commit -m "feat(mobile): stack Contact card and rows"
```

---

## Task 9: Canvas / shop — 2-column grid, full-width cart, fluid zoom

`.canvas-scroll` (absolute internal scroller) → native page scroll; grid → 2 columns; cart drawer → full-width; bump tap targets. CSS-only.

**Files:**
- Modify: `mobile.css` (append)

- [ ] **Step 1: Append the Canvas block to `mobile.css`**

```css
/* ── Task 9: Canvas / shop ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .canvas-headline { position: static; font-size: clamp(48px, 14vw, 120px); padding: 12px 16px 0; }
  .canvas-sub { position: static; padding: 0 16px; }
  .canvas-curswitch { position: static; padding: 8px 16px; gap: 10px; }
  .canvas-curbtn { padding: 8px 10px; min-height: 44px; }
  .canvas-scroll {
    position: static;
    overflow: visible;
    inset: auto;
    padding: 0 16px 32px;
  }
  .canvas-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
  .prod-img { width: 100%; }     /* keep aspect-ratio: 280/340 */
  .prod-foot { flex-wrap: wrap; gap: 8px; }
  .prod-foot .btn { min-height: 40px; padding: 10px 14px; }
  /* Cart drawer: full-width slide-in */
  .cart-drawer { width: 100%; left: 0; right: 0; }
  /* Zoom modal: constrain image to viewport */
  .canvas-zoom img { max-width: 92vw; max-height: 80dvh; height: auto; }
}
```

- [ ] **Step 2: Verify 2-column grid + full-width cart, no overflow**

Playwright: 390×844 → `http://localhost:8000/#/canvas` → `browser_evaluate`:

```js
() => ({
  cols: getComputedStyle(document.querySelector(".canvas-grid")).gridTemplateColumns,
  overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
})
```

Expected: `cols` has **two** tracks, `overflow: false`. Then open the cart (click the `[ cart … ]` nav link inside the drawer) and check:

```js
() => { const d = document.querySelector(".cart-drawer");
        return d ? Math.round(d.getBoundingClientRect().width) : "closed"; }
```

Expected: ≈ viewport width when open.

- [ ] **Step 3: Commit**

```bash
git add mobile.css
git commit -m "feat(mobile): 2-column shop grid, full-width cart drawer, fluid zoom"
```

---

## Task 10: Checkout reflow

Two-column → single column; summary moves to the bottom and drops sticky; inputs full-width at ≥16px. CSS-only.

**Files:**
- Modify: `mobile.css` (append)

- [ ] **Step 1: Append the Checkout block to `mobile.css`**

```css
/* ── Task 10: Checkout ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .checkout {
    position: fixed;
    inset: 0;
    overflow-y: auto;
    padding: 16px;
  }
  .checkout-headline { font-size: clamp(40px, 12vw, 84px); }
  .checkout-steps { flex-wrap: wrap; gap: 12px; }
  .checkout-body {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .checkout-summary {
    order: 2;             /* summary below the form */
    position: static;
    width: 100%;
  }
  .checkout-form { order: 1; }
  .checkout-grid { grid-template-columns: 1fr; }
  .checkout-field input,
  .checkout-field textarea,
  .checkout-textarea { font-size: 16px; }   /* prevents iOS focus-zoom */
}
```

- [ ] **Step 2: Verify checkout stacks and summary is last**

Playwright: 390×844 → `http://localhost:8000/#/canvas` → add an item to cart → open cart → click checkout (`.cart-checkout`). Then `browser_evaluate`:

```js
() => {
  const body = document.querySelector(".checkout-body");
  const form = document.querySelector(".checkout-form");
  const sum = document.querySelector(".checkout-summary");
  return {
    dir: getComputedStyle(body).flexDirection,
    summaryBelowForm: sum.getBoundingClientRect().top > form.getBoundingClientRect().top,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
}
```

Expected: `dir: "column"`, `summaryBelowForm: true`, `overflow: false`.

- [ ] **Step 3: Commit**

```bash
git add mobile.css
git commit -m "feat(mobile): single-column checkout with summary at bottom"
```

---

## Task 11: Social reflow

`.sm-scroll` → native scroll; `GalleryStrip` carousel → stacked grid, arrows hidden; statement band + outro reflow. CSS-first.

**Files:**
- Modify: `mobile.css` (append)

- [ ] **Step 1: Append the Social block to `mobile.css`**

```css
/* ── Task 11: Social ────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .sm-scroll { position: static; inset: auto; overflow: visible; }
  /* Gallery: stop the horizontal offset carousel, lay tiles out as a 2-col grid */
  .sm2-gal-arrow { display: none; }
  .sm2-gal-strip {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    transform: none !important;
    padding: 0 16px;
  }
  .sm2-gal-tile,
  .sm2-gal-tile--active {
    position: static !important;
    width: 100% !important;
    height: auto !important;
    transform: none !important;
    opacity: 1 !important;
  }
  /* Statement band */
  .sm-statement { padding: 48px 16px; }
  .sm-statement-text { font-size: clamp(48px, 16vw, 120px); }
  .sm-statement-text span:nth-child(2) { padding-left: 0; }
  .sm-statement-text span:nth-child(3) { padding-left: 0; }
  /* Zoom modal */
  .sm2-zoom img { max-width: 92vw; max-height: 80dvh; height: auto; }
  /* Outro */
  .sm-outro { flex-direction: column; align-items: flex-start; gap: 12px; padding: 32px 16px; }
  .sm-outro-mail { font-size: clamp(20px, 8vw, 40px); word-break: break-word; }
}
```

- [ ] **Step 2: Verify gallery is a grid, arrows hidden, no overflow**

Playwright: 390×844 → `http://localhost:8000/#/projects/07` (social) → `browser_evaluate`:

```js
() => {
  const strip = document.querySelector(".sm2-gal-strip");
  const arrow = document.querySelector(".sm2-gal-arrow");
  return {
    display: strip ? getComputedStyle(strip).display : null,
    cols: strip ? getComputedStyle(strip).gridTemplateColumns : null,
    arrowHidden: arrow ? getComputedStyle(arrow).display === "none" : true,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
}
```

Expected: `display: "grid"`, `cols` has two tracks, `arrowHidden: true`, `overflow: false`.

- [ ] **Step 3: Commit**

```bash
git add mobile.css
git commit -m "feat(mobile): Social gallery becomes a grid, statement/outro reflow"
```

---

## Task 12: Cross-cutting hardening

Disable the custom cursor on touch, neutralize sticky `:hover`, hide editor + Tweaks chrome on mobile.

**Files:**
- Modify: `App.jsx` (`BracketCursor`, lines 58–72)
- Modify: `mobile.css` (append)

- [ ] **Step 1: Harden `BracketCursor` for touch devices**

In `App.jsx`, change the `BracketCursor` effect (lines 60–69) so it no-ops on coarse pointers. Replace:

```jsx
  React.useEffect(() => {
    if (!on) return;
    const el = ref.current;
```

with:

```jsx
  React.useEffect(() => {
    if (!on) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const el = ref.current;
```

- [ ] **Step 2: Append the hardening block to `mobile.css`**

```css
/* ── Task 12: Cross-cutting hardening ───────────────────────────────── */
html[data-mobile="true"] .bracket-cursor { display: none !important; }
html[data-mobile="true"] .twk-panel { display: none !important; }
html[data-mobile="true"] .editor-add-tile,
html[data-mobile="true"] .editor-delete-action,
html[data-mobile="true"] .editor-delete-action--corner { display: none !important; }

@media (hover: none) {
  * { -webkit-tap-highlight-color: transparent; }
  .nav-link:active, .btn:active, .cat-thumb:active { opacity: 0.6; }
}
```

- [ ] **Step 3: Verify chrome is hidden and cursor is off**

Playwright: 390×844 → `http://localhost:8000/#/` → `browser_evaluate`:

```js
() => ({
  twk: document.querySelector(".twk-panel") ? getComputedStyle(document.querySelector(".twk-panel")).display : "absent",
  cursor: document.querySelector(".bracket-cursor") ? getComputedStyle(document.querySelector(".bracket-cursor")).display : "absent",
})
```

Expected: `twk` is `"none"` or `"absent"`; `cursor` is `"none"` or `"absent"`.

- [ ] **Step 4: Commit**

```bash
git add App.jsx mobile.css
git commit -m "feat(mobile): disable cursor on touch, hide editor/Tweaks chrome"
```

---

## Task 13: Full regression sweep + finalize

- [ ] **Step 1: Mobile sweep — every route, no horizontal overflow**

Playwright: 390×844. For each URL below, `browser_navigate` then `browser_evaluate` the overflow check; record `overflow` (must be `false` for all) and `browser_take_screenshot` each:

```
http://localhost:8000/#/
http://localhost:8000/#/projects
http://localhost:8000/#/projects/02
http://localhost:8000/#/projects/02/0
http://localhost:8000/#/projects/05        (BOOKS → opens detail directly)
http://localhost:8000/#/projects/07        (social)
http://localhost:8000/#/about
http://localhost:8000/#/contact
http://localhost:8000/#/canvas
```

Expected: `overflow: false` on every route. If any is `true`, fix that page's section in `mobile.css` before continuing.

- [ ] **Step 2: Desktop regression — scaler still scales**

Playwright: 1440×900 → `http://localhost:8000/#/` → `browser_evaluate`:

```js
() => ({
  dataMobile: document.documentElement.getAttribute("data-mobile"),
  transform: getComputedStyle(document.querySelector(".scaler-inner")).transform,
  siteWidth: Math.round(document.querySelector(".site").getBoundingClientRect().width),
})
```

Expected: `dataMobile: null`, `transform` is a `matrix(...)`, `siteWidth: 1440`. Spot-check `/#/projects`, `/#/canvas`, `/#/about` look identical to before this branch.

- [ ] **Step 3: Tablet boundary — 769px is still desktop, 768px is mobile**

Playwright: resize to 769×1000 → `http://localhost:8000/#/` → `() => document.documentElement.getAttribute("data-mobile")` → expected `null`. Resize to 768×1000 → re-evaluate → expected `"true"`.

- [ ] **Step 4: Stop the local server**

```bash
pkill -f "http.server 8000" || true
```

- [ ] **Step 5: Final commit (if any sweep fixes were made)**

```bash
git add mobile.css
git commit -m "fix(mobile): regression sweep adjustments across routes"
```

---

## Notes for the executor

- **Only `mobile.css`, `index.html`, `App.jsx`, and `Projects.jsx` are edited.** No other JSX should need changes; if a page can't be reflowed in CSS alone, prefer the smallest possible JSX guard over restructuring.
- **Never edit the inlined `<style>` blocks in `index.html`** — they won't conflict because `mobile.css` loads after them, and editing them is the documented footgun.
- The `!important` flags are deliberate: they beat the inline px font-sizes and absolute positioning baked into the components. Keep them.
- If the `Touch`/`TouchEvent` constructor is unavailable for the Task 6 swipe check, verify swipe on a real device or the Playwright device-emulation touch API; the CSS reflow assertions still hold regardless.
