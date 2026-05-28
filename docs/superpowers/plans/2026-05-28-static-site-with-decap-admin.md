# Static Site + Decap CMS Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Django-hosted React app into a pure static site on GitHub Pages, with content driven by a single editable JSON file, an `/admin/` page (Decap CMS) for non-technical editing, and a working order-request form via Web3Forms.

**Architecture:** Static site at repo root; content in `content/content.json`; admin via Decap CMS on `/admin/`; OAuth proxy via Cloudflare Worker; payments via Web3Forms email form (manual followup). All deploys via `git push`.

**Tech Stack:** React 18 (in-browser Babel — no build step), Decap CMS 3.x, Cloudflare Workers, Web3Forms, GitHub Pages.

**Reference spec:** `docs/superpowers/specs/2026-05-28-static-site-with-decap-admin-design.md`

**Codebase notes (read before starting):**
- `frontend/index.html` is a 1.9MB monolith containing inlined CSS and inlined JSX. The `.jsx` files in `frontend/` are mirror copies that the browser does **not** load. Phase 1 externalizes the scripts so future edits to `.jsx` files take effect.
- Routing is React in-memory state (no URL routing). No SPA fallback needed.
- No test framework exists. Verification is browser-based throughout; each task ends with a concrete "load page X, check Y" step.
- Don't run `python manage.py runserver` — Django is going away. Use `python3 -m http.server 8000` from `frontend/` (or repo root after Phase 7).

---

## Phase 0 — Setup & baseline

### Task 0.1: Working branch and dev loop

**Files:** none — environment setup.

- [ ] **Step 1:** Create a working branch.
  ```bash
  git checkout -b static-migration
  ```

- [ ] **Step 2:** Stop any running Django dev server. Start a static server on the existing `frontend/` directory.
  ```bash
  cd /Users/sds-ge573/PycharmProjects/miki_website
  python3 -m http.server 8000 --directory frontend
  ```
  Leave this running in a separate terminal for the rest of the work.

- [ ] **Step 3:** Open `http://localhost:8000/` in a browser. Verify the home page renders identically to what Django served. Click each top-nav link (Projects, About, Contact, Canvas). Open DevTools → Console; confirm **no red errors** (warnings about React DevTools or `legacy createElement` are fine).

- [ ] **Step 4:** If the page doesn't render, the inline-Babel approach is now caching things differently. Hard-refresh (`Cmd+Shift+R`). If still broken, run `git status` to ensure no unintended changes, then investigate before continuing.

- [ ] **Step 5:** Commit the (empty) starting point so the engineer can `git diff` against it later.
  ```bash
  git add -A
  git commit -m "chore: snapshot before static migration"
  ```

  **Note:** if `git status` is empty (no untracked files added in the index), skip the commit — we just want a known baseline.

---

## Phase 1 — Externalize the inline JSX

The single biggest risk in this migration: `index.html` contains the actual React code inline. Until we make it load `.jsx` files via `src=`, editing those files does nothing. This phase fixes that.

### Task 1.1: Verify on-disk JSX matches inlined code

**Files:** read-only check.

- [ ] **Step 1:** Pick one component (`Projects.jsx`) and confirm the on-disk source matches what's inlined in `index.html`. Run:
  ```bash
  cd /Users/sds-ge573/PycharmProjects/miki_website/frontend
  # Find the inline block range for Projects.jsx in index.html
  grep -n "data-source=\"Projects.jsx\"" index.html
  grep -n "window.ALL_PROJECTS = ALL_PROJECTS" index.html
  ```
  Note the line numbers (open and close of the inline `<script>` block).

- [ ] **Step 2:** Extract the inlined block to a temp file and diff against the on-disk `.jsx`:
  ```bash
  # Adjust line numbers to match the previous step's output;
  # the open line is the <script ...> tag line + 1 (skip the tag itself);
  # the close line is the </script> tag line - 1 (skip the close tag).
  sed -n '<OPEN+1>,<CLOSE-1>p' index.html > /tmp/projects-inline.jsx
  diff /tmp/projects-inline.jsx Projects.jsx
  ```
  Expected: no output (files identical) OR only whitespace/trivia differences.

- [ ] **Step 3:** If the diff is non-trivial, the on-disk file is stale. Resolve by copying the inlined version into the on-disk file:
  ```bash
  cp /tmp/projects-inline.jsx Projects.jsx
  ```
  Repeat the check for all `.jsx` files (`i18n.jsx`, `App.jsx`, `Projects.jsx`, `About.jsx`, `Canvas.jsx`, `Checkout.jsx`, `Social.jsx`, `Contact.jsx`, `Nav.jsx`, `Home.jsx`, `Animation.jsx`, `tweaks-panel.jsx`).

- [ ] **Step 4:** Commit any sync changes.
  ```bash
  git add frontend/*.jsx
  git commit -m "chore: sync on-disk .jsx with inlined copies in index.html"
  ```
  If no files changed, skip the commit.

### Task 1.2: Replace inline JSX blocks with external `src=`

**Files:**
- Modify: `frontend/index.html` (replace each inline `<script type="text/babel" data-source="X.jsx">…</script>` with `<script type="text/babel" src="X.jsx"></script>`).

**Order matters:** scripts must load in dependency order. The current order in `index.html` is (per `grep -n "data-source"` output): `i18n.jsx`, `Nav.jsx`, `Home.jsx`, `Projects.jsx`, `Animation.jsx`, `tweaks-panel.jsx`, `About.jsx`, `Canvas.jsx`, `Checkout.jsx`, `Social.jsx`, `Contact.jsx`, `App.jsx`, plus a final inline mount block. Preserve this order.

- [ ] **Step 1:** For each component, replace its inline block with an external `src` reference. Example for `Projects.jsx`:

  Find:
  ```html
  <!-- Projects.jsx -->
  <script type="text/babel" data-source="Projects.jsx">
  // Projects.jsx — 3×3 grid …
  …
  window.ALL_PROJECTS = ALL_PROJECTS;
  </script>
  ```
  Replace with:
  ```html
  <!-- Projects.jsx -->
  <script type="text/babel" src="Projects.jsx" data-type="module"></script>
  ```
  Repeat for all 12 components listed above.

- [ ] **Step 2:** Leave the **final mount script** (the one at the bottom containing `ReactDOM.createRoot(...).render(<Scaled />)`) inline — it depends on all the previous scripts having registered their components on `window`. Inline keeps the dependency order explicit.

- [ ] **Step 3:** Verify the index.html no longer contains massive inline JSX blocks. The file should shrink dramatically (from ~1.9 MB to a few hundred KB once the inline CSS remains but JSX is gone).
  ```bash
  wc -c frontend/index.html
  ```

- [ ] **Step 4:** Reload `http://localhost:8000/`. The site must render identically. Click through all routes. **In DevTools → Network**, verify every `.jsx` file is fetched as a separate request and returns 200.

- [ ] **Step 5:** If the page is blank or errors appear, the most likely cause is script-load ordering. Check that `i18n.jsx` loads first (defines `window.useLang`) and `App.jsx` loads last (uses everything else). The final inline mount block runs after all script tags have executed in order.

- [ ] **Step 6:** Commit.
  ```bash
  git add frontend/index.html
  git commit -m "refactor: load JSX from external files instead of inline blocks"
  ```

---

## Phase 2 — Web3Forms setup (do this early so the key is ready)

### Task 2.1: Register a Web3Forms access key

**Files:** none — external account setup.

- [ ] **Step 1:** Open `https://web3forms.com/` in a browser.

- [ ] **Step 2:** In the "Get Access Key" form, enter `seriton3@gmail.com` (or the artist's preferred destination email). Submit.

- [ ] **Step 3:** Check the destination inbox for the activation email. Click the activation link.

- [ ] **Step 4:** Copy the access key from the activation page. It looks like `abc123ef-4567-89ab-cdef-0123456789ab`. **Save it locally** — you'll paste it into `content.json` in Phase 3.

- [ ] **Step 5:** (Optional but recommended) In the Web3Forms dashboard for this key, enable the **honeypot** field and **hCaptcha** for spam protection. Note: hCaptcha would also require frontend integration — for v1, skip hCaptcha and rely on honeypot only.

---

## Phase 3 — Create `content.json`

### Task 3.1: Create the content directory and a baseline JSON file

**Files:**
- Create: `frontend/content/content.json`

- [ ] **Step 1:** Create the directory and a starter file.
  ```bash
  mkdir -p frontend/content
  ```

- [ ] **Step 2:** Create `frontend/content/content.json` with the **complete content structure below**, populated from the current `.jsx` source. The structure is fixed; fill in each `<…>` placeholder by reading the corresponding line of the corresponding source file. References to source files use repo-relative paths from `frontend/`.

  ```json
  {
    "contact": {
      "email": "seriton3@gmail.com",
      "telegram": "@gtxhi",
      "instagram": ["@gtxhi", "@mykyta.lg"],
      "tiktok": "@gtxhi",
      "location": { "en": "Tbilisi, GE", "ua": "Тбілісі, Грузія" }
    },
    "orderForm": {
      "web3formsKey": "<PASTE THE KEY FROM TASK 2.1>"
    },
    "about": {
      "bio": {
        "en": [
          "Working with animation, illustration, posters, and collage.",
          "Mix classical art with modern digital design — every piece begins with a black square."
        ],
        "ua": [
          "Працюю з анімацією, ілюстрацією, постерами та колажами.",
          "Поєдную класичне мистецтво з сучасним цифровим дизайном — кожна робота починається з чорного квадрата."
        ]
      },
      "experience": [
        {
          "title": { "en": "Studio \"SHAR\"", "ua": "Студія «ШАР»" },
          "role":  { "en": "Character Animator", "ua": "Аніматор персонажів" },
          "subRole": { "en": "\"Through the Magic Crystal\"", "ua": "«Крізь магічний кристал»" },
          "date":  { "en": "2024 – 2025", "ua": "2024 – 2025" }
        },
        {
          "title": { "en": "Freelance", "ua": "Фріланс" },
          "role":  { "en": "Illustrator / Animator", "ua": "Ілюстратор / Аніматор" },
          "subRole": null,
          "date":  { "en": "2023 – Present", "ua": "2023 – дотепер" }
        },
        {
          "title": { "en": "Bolshoi Theatre", "ua": "Большой театр" },
          "role":  { "en": "Poster Designer (contract)", "ua": "Постер-дизайнер (контракт)" },
          "subRole": null,
          "date":  { "en": "2024 season", "ua": "сезон 2024" }
        }
      ],
      "exhibitions": [
        { "label": { "en": "Music Video — Grigory Polukhutenko", "ua": "Музичне відео — Григорій Полухутенко" } },
        { "label": { "en": "Animated Ad — Nyaono", "ua": "Анімаційна реклама — Nyaono" } },
        { "label": { "en": "\"Body of Vision\" — exhibition", "ua": "«Body of Vision» — виставка" } },
        { "label": { "en": "FOREST / VÉM ÀRXÎV — group show", "ua": "FOREST / VÉM ÀRXÎV — групова виставка" } },
        { "label": { "en": "Live Show Posters", "ua": "Постери до live-шоу" } },
        { "label": { "en": "Bolshoi Theatre — posters", "ua": "Большой театр — постери" } }
      ],
      "skills": [
        { "label": { "en": "Animation · Storyboarding",         "ua": "Анімація · Сторібординг" } },
        { "label": { "en": "Concept Art · Color & Light",       "ua": "Концепт-арт · Колір і світло" } },
        { "label": { "en": "Visual Style & Composition",        "ua": "Візуальний стиль і композиція" } },
        { "label": { "en": "Poster Design · Art Direction",     "ua": "Постер-дизайн · Арт-дирекція" } },
        { "label": { "en": "Illustration · Collage",            "ua": "Ілюстрація · Колаж" } }
      ]
    },
    "projects": [
      "// FILL: copy each entry from frontend/Projects.jsx ALL_PROJECTS literally. See structure example below."
    ],
    "canvas": {
      "items": [
        { "id": "01", "title": "с котом",    "medium": "(colored paper A3, acrylic, pencils)", "mediumUa": "(кольоровий папір А3, акрил, олівці)", "price": null },
        { "id": "02", "title": "яновна",     "medium": "(linen canvas A4)",                    "mediumUa": "(лляне полотно А4)",                   "price": null },
        { "id": "03", "title": "в пиджаке",  "medium": "(collage A3)",                         "mediumUa": "(колаж А3)",                           "price": null },
        { "id": "04", "title": "ночной",     "medium": "(riso print, edition of 25)",          "mediumUa": "(різо-друк, тираж 25)",                "price": null },
        { "id": "05", "title": "LUHANSK",    "medium": "(offset poster 600×900mm)",            "mediumUa": "(офсетний постер 600×900мм)",          "price": null },
        { "id": "06", "title": "сестра",     "medium": "(charcoal on A2)",                     "mediumUa": "(вугілля на А2)",                      "price": null },
        { "id": "07", "title": "берлин",     "medium": "(acrylic on coloured paper A3)",       "mediumUa": "(акрил на кольоровому папері А3)",     "price": null },
        { "id": "08", "title": "холст / 08", "medium": "(linen canvas A2, oil)",               "mediumUa": "(лляне полотно А2, олія)",             "price": null },
        { "id": "09", "title": "exposure",   "medium": "(riso poster, edition of 50)",         "mediumUa": "(різо-постер, тираж 50)",              "price": null }
      ]
    },
    "social": {
      "posts": [
        "// FILL: copy 16 entries from frontend/Social.jsx POSTS array (lines 9–26)"
      ],
      "carousels": [
        "// FILL: copy 2 carousels from frontend/Social.jsx CAROUSELS (lines 28–59)"
      ],
      "stories": [
        "// FILL: copy 21 entries from frontend/Social.jsx STORIES (lines 61–83)"
      ],
      "ads": [
        "// FILL: copy 4 entries from frontend/Social.jsx ADS (lines 85–90)"
      ],
      "services": [
        "// FILL: copy 5 entries from frontend/Social.jsx SERVICES (lines 92–98)"
      ]
    }
  }
  ```

  Note: comment strings like `"// FILL: …"` are not valid JSON. They're placeholders in this plan only — replace them with real JSON arrays per the next step.

- [ ] **Step 3:** Fill in the `projects` array by literal translation of `frontend/Projects.jsx` lines 15–141 (the `ALL_PROJECTS` constant). The shape per project:
  ```json
  {
    "id": "01",
    "category": "ANIMATION",
    "year": "2024 — 2025",
    "name": "through the magic crystal",
    "client": "Studio SHAR",
    "role": "Character Animator",
    "medium": "2D digital animation, 12fps",
    "desc": "Character animation for the Russian-language animated feature. …",
    "prose": "A long-arc creature animation gig. …",
    "works": [
      { "name": "through the magic crystal", "desc": "Character animation — Studio SHAR feature. 2024–2025.", "thumb": null, "price": null }
    ]
  }
  ```
  Preserve every field on every project (`id`, `category`, `year`, `name`, `client`, `role`, `medium`, `desc`, `prose`). For each work, copy `name` and `desc` literally; copy `thumb` if the source JSX has one (POSTERS category does — lines 61–66), otherwise set `thumb: null`. Set every `price: null`.

- [ ] **Step 4:** Fill in `social.posts` from `frontend/Social.jsx` lines 9–26 (POSTS):
  ```json
  { "src": "assets/social/legnacat/post-1.webp", "brand": "@legnacat" }
  ```
  Copy all 16 entries verbatim, preserving `src` and `brand`.

- [ ] **Step 5:** Fill in `social.carousels` from `frontend/Social.jsx` lines 28–59. Schema:
  ```json
  {
    "id": "01",
    "brand": "@legnacat",
    "title": "Кризис четверти жизни",
    "titleEn": "Quarter-life crisis",
    "cover": "assets/social/legnacat/crisis-cover.webp",
    "slides": [
      "assets/social/legnacat/crisis-1.webp",
      "assets/social/legnacat/crisis-2.webp"
    ]
  }
  ```
  Both carousels.

- [ ] **Step 6:** Fill in `social.stories` from `frontend/Social.jsx` lines 61–83 (21 entries, same shape as posts).

- [ ] **Step 7:** Fill in `social.ads` from `frontend/Social.jsx` lines 85–90. Schema per entry:
  ```json
  { "src": "assets/social/scratch/ad-1.webp", "aspect": "1 / 1", "brand": "SCRATCH SCHOOL" }
  ```

- [ ] **Step 8:** Fill in `social.services` from `frontend/Social.jsx` lines 92–98. Schema:
  ```json
  { "id": "01", "title": "BRAND AUDIT", "sub": "Visual identity + content review, competitor scan.", "subUa": "Аудит ідентичності та контенту, конкурентний скан." }
  ```

- [ ] **Step 9:** Replace `<PASTE THE KEY FROM TASK 2.1>` with the actual Web3Forms key.

- [ ] **Step 10:** Validate the JSON.
  ```bash
  python3 -c "import json; json.load(open('frontend/content/content.json'))"
  ```
  Expected: no output (silent success). If it errors, fix the JSON until it parses.

- [ ] **Step 11:** Commit.
  ```bash
  git add frontend/content/content.json
  git commit -m "feat: extract site content to content.json"
  ```

---

## Phase 4 — Content loader in `index.html`

### Task 4.1: Add the pre-mount content fetch

**Files:**
- Modify: `frontend/index.html` (insert one new `<script>` block; modify the final inline mount block).

- [ ] **Step 1:** Find the final inline mount script at the bottom of `frontend/index.html`. It currently contains:
  ```html
  <script type="text/babel">
    function Scaled() {
      const [scale, setScale] = React.useState(1);
      …
      return ( … <App /> … );
    }
    ReactDOM.createRoot(document.getElementById("root")).render(<Scaled />);
  </script>
  ```

- [ ] **Step 2:** Immediately before this `<script type="text/babel">` block, insert a new plain `<script>` block that fetches content:
  ```html
  <script>
    window.__contentReady = (async function () {
      try {
        const res = await fetch('content/content.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('content fetch failed: ' + res.status);
        window.CONTENT = await res.json();
      } catch (err) {
        const root = document.getElementById('root');
        const pre = document.createElement('pre');
        pre.style.cssText = 'padding:24px;font-family:monospace;color:#c00';
        pre.textContent = 'Failed to load content/content.json — ' + String(err);
        root.replaceChildren(pre);
        throw err;
      }
    })();
  </script>
  ```
  This runs immediately on page load (no `async`/`defer` needed since the work happens inside the IIFE).

- [ ] **Step 3:** Wrap the `ReactDOM.createRoot(...).render(<Scaled />)` call in the existing mount script so it waits for content:
  ```html
  <script type="text/babel">
    function Scaled() { … unchanged … }
    window.__contentReady.then(() => {
      ReactDOM.createRoot(document.getElementById("root")).render(<Scaled />);
    });
  </script>
  ```
  Only the last line of that block changes — wrap the render call in `.then(...)`.

- [ ] **Step 4:** Reload `http://localhost:8000/`. The site should still render. **Verify in DevTools → Network** that `content/content.json` is fetched and returns 200. **In Console**, type `window.CONTENT` and confirm the object structure matches what you wrote in Phase 3.

- [ ] **Step 5:** Test the failure path: rename `content.json` temporarily, reload, confirm the red error message appears.
  ```bash
  mv frontend/content/content.json frontend/content/content.json.bak
  ```
  Reload. Expect a `Failed to load content/content.json — …` red message in the page. Then restore:
  ```bash
  mv frontend/content/content.json.bak frontend/content/content.json
  ```

- [ ] **Step 6:** Commit.
  ```bash
  git add frontend/index.html
  git commit -m "feat: pre-fetch content.json before mounting React"
  ```

---

## Phase 5 — Wire components to `window.CONTENT`

Each task in this phase modifies one `.jsx` file to read from `window.CONTENT` instead of a hardcoded module-level constant, then verifies the corresponding page still renders correctly.

### Task 5.1: Wire `Projects.jsx`

**Files:**
- Modify: `frontend/Projects.jsx` (replace the `ALL_PROJECTS` constant).

- [ ] **Step 1:** In `frontend/Projects.jsx`, replace lines 15–141 (the `const ALL_PROJECTS = [ … ];` block) with:
  ```js
  const ALL_PROJECTS = window.CONTENT.projects;
  ```
  The line `window.ALL_PROJECTS = ALL_PROJECTS;` at the bottom of the file stays as-is (it just exposes the array on `window` for `App.jsx`'s detail-nav helpers).

- [ ] **Step 2:** Reload `http://localhost:8000/`. Navigate to `Projects`. Verify:
  - 3×3 grid of category tiles renders with all 7 categories visible.
  - Click a category tile (e.g., POSTERS) → horizontal strip opens, showing works with thumbnails.
  - Click a work → detail overlay opens with name, desc, prose, year, etc.
  - Switch language EN→UA (top nav). Category labels translate (`POSTERS` → `ПОСТЕРИ`).

- [ ] **Step 3:** Commit.
  ```bash
  git add frontend/Projects.jsx
  git commit -m "feat: Projects.jsx reads from window.CONTENT.projects"
  ```

### Task 5.2: Wire `Social.jsx`

**Files:**
- Modify: `frontend/Social.jsx` (replace `POSTS`, `CAROUSELS`, `STORIES`, `ADS`, `SERVICES` constants and the derived `WORK_ITEMS`).

- [ ] **Step 1:** In `frontend/Social.jsx`, replace lines 9–26 (`POSTS`), lines 28–59 (`CAROUSELS`), lines 61–83 (`STORIES`), lines 85–90 (`ADS`), lines 92–98 (`SERVICES`) — all five constant blocks — with:
  ```js
  const POSTS     = window.CONTENT.social.posts;
  const CAROUSELS = window.CONTENT.social.carousels;
  const STORIES   = window.CONTENT.social.stories;
  const ADS       = window.CONTENT.social.ads;
  const SERVICES  = window.CONTENT.social.services;
  ```

- [ ] **Step 2:** The `WORK_ITEMS` constant at lines 101–107 derives from `POSTS` and `CAROUSELS`. It can stay as-is — it'll now use the new sources.

- [ ] **Step 3:** Reload. Click into the Projects → SOCIAL MEDIA category to render the Social page. Verify:
  - The hero with POSTS/STORIES/CAROUSELS/ADS headline renders.
  - The WORK strip shows posts followed by carousel covers and slides.
  - STORIES section shows stories at 9/16 aspect.
  - ADS section shows the scratch-school ads.
  - Console shows no errors about undefined arrays.

- [ ] **Step 4:** Commit.
  ```bash
  git add frontend/Social.jsx
  git commit -m "feat: Social.jsx reads from window.CONTENT.social"
  ```

### Task 5.3: Wire `Contact.jsx`

**Files:**
- Modify: `frontend/Contact.jsx`.

- [ ] **Step 1:** In `frontend/Contact.jsx`, replace the body of the component. Current code hardcodes the dl rows. Change to:
  ```jsx
  function Contact({ tweaks }) {
    const { t } = useLang();
    const c = window.CONTENT.contact;
    return (
      <div className="page page--contact">
        <div className="social-portrait" aria-hidden="true" />

        <div className="social-headline">
          <span className="bk-bracket">[</span>
          <span className="bk-word">{t({ en: "CONTACT", ua: "КОНТАКТ" })}</span>
          <span className="bk-bracket">]</span>
        </div>

        <div className="contact-card">
          <h1 className="social-name">MIKI / GTXHI</h1>
          <div className="social-role">{t({
            en: "Visual artist / Animator / Illustrator",
            ua: "Візуальний митець / Аніматор / Ілюстратор",
          })}</div>

          <dl className="social-rows">
            <div className="social-row">
              <dt>{t({ en: "EMAIL", ua: "ПОШТА" })}</dt>
              <dd>{c.email}</dd>
            </div>
            <div className="social-row">
              <dt>TELEGRAM</dt>
              <dd>{c.telegram}</dd>
            </div>
            <div className="social-row">
              <dt>INSTAGRAM</dt>
              <dd>
                <span>{c.instagram[0]}</span>
                {c.instagram[1] && <span className="social-row-secondary">{c.instagram[1]}</span>}
              </dd>
            </div>
            <div className="social-row">
              <dt>TIKTOK</dt>
              <dd>{c.tiktok}</dd>
            </div>
            <div className="social-row">
              <dt>{t({ en: "LOCATION", ua: "ЛОКАЦІЯ" })}</dt>
              <dd>{t(c.location)}</dd>
            </div>
          </dl>
        </div>
      </div>
    );
  }

  window.Contact = Contact;
  ```

- [ ] **Step 2:** Reload, navigate to Contact via top nav. Verify all five rows show the correct values (matching what's in `content.json`). Switch language; "EMAIL"/"ПОШТА" toggles and "Tbilisi, GE"/"Тбілісі, Грузія" toggles.

- [ ] **Step 3:** Commit.
  ```bash
  git add frontend/Contact.jsx
  git commit -m "feat: Contact.jsx reads from window.CONTENT.contact"
  ```

### Task 5.4: Wire `About.jsx`

**Files:**
- Modify: `frontend/About.jsx`.

- [ ] **Step 1:** Replace the entire `About` function body to read from `window.CONTENT.about`. New file contents (replace lines 2–77 entirely):
  ```jsx
  function About({ tweaks }) {
    const { t } = useLang();
    const a = window.CONTENT.about;
    return (
      <div className="page page--about">
        <div className="about-portrait" />

        <div className="about-headline">
          <span className="bk-bracket">[</span>
          <span className="bk-word">{t({ en: "ABOUT ME", ua: "ПРО МЕНЕ" })}</span>
          <span className="bk-bracket">]</span>
        </div>

        <div className="about-bio">
          <h1 className="about-name">MIKI / GTXHI</h1>
          <div className="about-role">{t({
            en: "Visual artist / Animator / Illustrator",
            ua: "Візуальний митець / Аніматор / Ілюстратор",
          })}</div>
          <div className="about-prose">
            {(t({ en: a.bio.en, ua: a.bio.ua }) || []).map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < a.bio.en.length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="about-col about-col--exp">
          <div className="about-col-head"><b>[ 01 ]</b> {t({ en: "EXPERIENCE", ua: "ДОСВІД" })}</div>
          <hr className="hairline" />
          {a.experience.map((e, i) => (
            <div className="exp-item" key={i}>
              <div className="exp-title">{t(e.title)}</div>
              <div className="exp-role">{t(e.role)}</div>
              {e.subRole && <div className="exp-role">{t(e.subRole)}</div>}
              <div className="exp-date">{t(e.date)}</div>
            </div>
          ))}
        </div>

        <div className="about-projects">
          <div className="about-col-head"><b>[ 02 ]</b> {t({ en: "EXHIBITIONS & PROJECTS", ua: "ВИСТАВКИ ТА ПРОЄКТИ" })}</div>
          <hr className="hairline" />
          <div className="projects-grid">
            {a.exhibitions.map((x, i) => (
              <span key={i}>{t(x.label)}</span>
            ))}
          </div>
        </div>

        <div className="about-col about-col--skills">
          <div className="about-col-head"><b>[ 03 ]</b> {t({ en: "SKILLS", ua: "НАВИЧКИ" })}</div>
          <hr className="hairline" />
          {a.skills.map((s, i) => (
            <div className="skill" key={i}>{t(s.label)}</div>
          ))}
        </div>
      </div>
    );
  }

  window.About = About;
  ```

- [ ] **Step 2:** Reload, navigate to About. Verify:
  - Bio paragraph renders with both lines, separated by a line break.
  - Experience column shows all three roles (SHAR / Freelance / Bolshoi).
  - Exhibitions grid shows all six items.
  - Skills column shows all five.
  - Language toggle works on every field.

- [ ] **Step 3:** Commit.
  ```bash
  git add frontend/About.jsx
  git commit -m "feat: About.jsx reads from window.CONTENT.about"
  ```

### Task 5.5: Wire `Canvas.jsx` (and surface prices)

**Files:**
- Modify: `frontend/Canvas.jsx`.

- [ ] **Step 1:** Replace lines 2–12 (the `const ITEMS = [ … ];` block) with:
  ```js
  const ITEMS = window.CONTENT.canvas.items;
  ```

- [ ] **Step 2:** Update `handleOrder` (currently line 21–30) to read price from the item instead of hardcoding `0`:
  ```js
  const handleOrder = (it) => {
    if (inCart(it.id)) {
      const idx = cart.findIndex((c) => c.id === it.id);
      if (idx >= 0) removeFromCart(idx);
      return;
    }
    addToCart({ ...it });  // keeps it.price as-is (null or {amount, currency})
    setPulse(it.id);
    setTimeout(() => setPulse(null), 800);
  };
  ```

- [ ] **Step 3:** Update the cart total row (currently shows `<span>000</span>` at line 123). Replace:
  ```jsx
  <div className="cart-total">
    <span>{t({ en: "Total", ua: "Разом" })}</span>
    <span>000</span>
  </div>
  ```
  With:
  ```jsx
  <div className="cart-total">
    <span>{t({ en: "Total", ua: "Разом" })}</span>
    <span>{(() => {
      const priced = cart.filter(c => c.price && typeof c.price.amount === 'number');
      if (priced.length === 0) {
        return t({ en: 'price on request', ua: 'ціна на запит' });
      }
      const byCurrency = priced.reduce((acc, c) => {
        acc[c.price.currency] = (acc[c.price.currency] || 0) + c.price.amount;
        return acc;
      }, {});
      return Object.entries(byCurrency)
        .map(([cur, amt]) => `${amt} ${cur}`)
        .join(' + ');
    })()}</span>
  </div>
  ```
  This sums priced items per currency and shows "price on request" if no items have a price.

- [ ] **Step 4:** Reload, go to Canvas. Verify:
  - All 9 items render.
  - Click "Order" → button changes to "Added", cart-count in nav increments.
  - Open cart drawer → items listed, total shows "price on request" (since every `price` is `null` in v1).
  - Click "checkout" → checkout overlay opens.
  - Switch language → totals/labels translate.

- [ ] **Step 5:** Commit.
  ```bash
  git add frontend/Canvas.jsx
  git commit -m "feat: Canvas.jsx reads items and prices from window.CONTENT.canvas"
  ```

### Task 5.6: Rewrite `Checkout.jsx` (drop card, wire Web3Forms)

**Files:**
- Modify: `frontend/Checkout.jsx`.

- [ ] **Step 1:** Remove the `card` payment method. In the `form` initial state (around line 50–61), keep `method` but its default changes from `"card"` to `"paypal"`:
  ```js
  const [form, setForm] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    address: "",
    postal: "",
    currency: "EUR",
    method: "paypal",
    notes: "",
  });
  ```

- [ ] **Step 2:** Remove the entire `card` state declaration (line 62) and the `setC` helper (line 68). Also remove the `cardValid` derivation (lines 77–82).

- [ ] **Step 3:** Add an `error` state alongside the existing `processing` state:
  ```js
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState(null);
  ```

- [ ] **Step 4:** Replace `generateTrackingNumber` and `placeOrder` (lines 39–92). Delete `generateTrackingNumber` entirely. Replace `placeOrder` with:
  ```js
  const placeOrder = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: window.CONTENT.orderForm.web3formsKey,
          subject: `New order — ${form.fullName}`,
          from_name: 'miki portfolio',
          reply_to: form.email,
          // Flattened, human-readable fields for the email body:
          full_name: form.fullName,
          email: form.email,
          phone: form.phone,
          country: form.country,
          city: form.city,
          address: form.address,
          postal: form.postal,
          currency: form.currency,
          payment_method: form.method,
          notes: form.notes,
          items: cart.map(c => `${c.title || c.name} [${c.id}]`).join('\n'),
          // Full cart for reference:
          cart_json: JSON.stringify(cart),
        }),
      });
      if (!res.ok) throw new Error('order submission failed: ' + res.status);
      setStep('done');
      setTimeout(() => onPlaced && onPlaced(), 8000);
    } catch (err) {
      setError(t({
        en: `Couldn't send your order automatically. Please email ${window.CONTENT.contact.email} with your items and shipping address — we'll reply with payment instructions.`,
        ua: `Не вдалося надіслати замовлення автоматично. Будь ласка, напишіть на ${window.CONTENT.contact.email}, ми надішлемо інструкції з оплати.`,
      }));
    } finally {
      setProcessing(false);
    }
  };
  ```
  Also remove `setTracking` / `tracking` / `setTrackingCopied` / `trackingCopied` state and the `copyTracking` helper — none of them are needed without the fake tracking number.

- [ ] **Step 5:** Find the payment method radio array (around line 203–208). Remove the `card` entry and add a `contact` option:
  ```js
  {[
    { v: "paypal",  l: { en: "PayPal",        ua: "PayPal" } },
    { v: "bank",    l: { en: "Bank transfer", ua: "Банк. переказ" } },
    { v: "crypto",  l: { en: "USDT",          ua: "USDT" } },
    { v: "contact", l: { en: "Just contact me", ua: "Зв'яжіться зі мною" } },
  ].map((m) => ( … ))}
  ```

- [ ] **Step 6:** Remove the card-details fields section (lines 220–230 — the `{form.method === "card" && …}` block). Delete it entirely.

- [ ] **Step 7:** Update the `form.method !== "card"` block (around lines 232–247) so it always renders (since `card` is gone, this block can lose the conditional). Find:
  ```jsx
  {form.method !== "card" && (
    <div className="checkout-section"> … </div>
  )}
  ```
  Replace with (removing the wrapping conditional and adding the new "contact" branch):
  ```jsx
  <div className="checkout-section">
    <div className="checkout-section-head">[ ] {form.method.toUpperCase()}</div>
    <p className="checkout-prose">
      {lang === "UA" ? (
        <React.Fragment>
          {form.method === "contact"
            ? <>Залишіть деталі, і ми зв'яжемося з вами на <b>{form.email || "вашу пошту"}</b> з інструкціями.</>
            : <>Після підтвердження ми надішлемо {form.method === "paypal" ? "інвойс PayPal" : form.method === "bank" ? "банківські реквізити (IBAN + SWIFT)" : "адресу USDT-гаманця (TRC-20)"} на <b>{form.email || "вашу пошту"}</b>. Замовлення зарезервовано на 48&nbsp;годин до сплати.</>
          }
        </React.Fragment>
      ) : (
        <React.Fragment>
          {form.method === "contact"
            ? <>Leave your details and we'll reach out to <b>{form.email || "your email"}</b> with instructions.</>
            : <>After you confirm, we'll send {form.method === "paypal" ? "the PayPal invoice" : form.method === "bank" ? "bank details (IBAN + SWIFT)" : "the USDT wallet address (TRC-20)"} to <b>{form.email || "your email"}</b>. The order is reserved for 48&nbsp;hours pending payment.</>
          }
        </React.Fragment>
      )}
    </p>
  </div>
  ```

- [ ] **Step 8:** Find the final "Place order" button (in the `step === "pay"` block, search for `placeOrder`). Above it, add an error banner that renders only when `error` is set:
  ```jsx
  {error && (
    <div className="checkout-error" style={{
      padding: '12px 16px',
      margin: '12px 0',
      border: '1px solid #c00',
      color: '#c00',
      fontFamily: 'monospace',
      fontSize: '13px',
    }}>{error}</div>
  )}
  ```
  Place it immediately before the existing button so customers see the error without losing their form data.

- [ ] **Step 9:** In the `step === "done"` section, replace any UI that references the fake tracking number with simple "order received" copy. Search the file for `tracking` or `[ TRACK` and remove that subtree. Replace the entire `step === "done"` block's content with:
  ```jsx
  <div className="checkout-done">
    <div className="checkout-section-head">[ 03 ] {t({ en: "ORDER RECEIVED", ua: "ЗАМОВЛЕННЯ ПРИЙНЯТО" })}</div>
    <p className="checkout-prose">{t({
      en: `Thanks! Your order is in. Watch your inbox at ${form.email} — we'll reply within 24 hours with payment instructions.`,
      ua: `Дякуємо! Замовлення отримано. Чекайте листа на ${form.email} — відповімо протягом 24 годин із інструкціями для оплати.`,
    })}</p>
  </div>
  ```

- [ ] **Step 10:** Reload. Navigate to Canvas → add an item → checkout. Fill in the form with **real** test values (your own email). Pick "PayPal" payment method. Click "place order". Verify:
  - Browser network tab shows a POST to `api.web3forms.com/submit` returning 200.
  - The success screen appears.
  - Within ~30 seconds, an email arrives at the destination address with `Subject: New order — <name>` and all form fields in the body.

- [ ] **Step 11:** Test the error path. Temporarily break the access key in `content.json` (e.g., add an "x" to the end), reload, retry checkout. Verify:
  - The red error banner appears with the contact-email fallback.
  - The form doesn't transition to the "done" step.
  Then restore the correct key.

- [ ] **Step 12:** Commit.
  ```bash
  git add frontend/Checkout.jsx
  git commit -m "feat: Checkout.jsx submits orders via Web3Forms, drop fake card flow"
  ```

---

## Phase 6 — Asset restructure

The current asset layout is split across `frontend/assets/` (curated), `frontend/uploads/` (raw working files, not referenced), and `frontend/screenshots/` (dev/debug). For v1 we keep only assets that are referenced by `content.json`.

### Task 6.1: Plan the asset moves

**Files:** none — read-only analysis.

- [ ] **Step 1:** List the current curated structure.
  ```bash
  find frontend/assets -type f | sort
  ```

- [ ] **Step 2:** List the current uploads directory (for reference — these will not be copied).
  ```bash
  find frontend/uploads -type f | head -50
  ```

- [ ] **Step 3:** Verify every `thumb`/`src`/`cover` path in `content/content.json` matches a real file under `frontend/`. Run:
  ```bash
  python3 -c "
  import json, os
  c = json.load(open('frontend/content/content.json'))
  refs = set()
  def collect(o, k=None):
    if isinstance(o, dict):
      for kk, v in o.items(): collect(v, kk)
    elif isinstance(o, list):
      for v in o: collect(v, k)
    elif isinstance(o, str) and (k in ('thumb', 'src', 'cover')) and o:
      refs.add(o)
  collect(c)
  missing = [r for r in sorted(refs) if not os.path.exists(os.path.join('frontend', r))]
  print(f'Total refs: {len(refs)}; Missing files: {len(missing)}')
  for m in missing[:20]: print('  MISSING:', m)
  "
  ```
  Expected: most refs exist; some `social/` paths may be missing if the artist hasn't uploaded those images yet. Record the missing list.

### Task 6.2: Move assets to the new layout

**Files:**
- Move many image files from `frontend/assets/...` to `frontend/assets/images/...` and `frontend/assets/docs/`.

The target structure under `frontend/assets/` becomes:
```
assets/
├── images/
│   ├── projects/
│   │   └── posters/          # was frontend/assets/posters/
│   └── social/               # was frontend/assets/social/
├── docs/                     # was frontend/assets/Mykyta_*.pdf
└── screenshots/              # was frontend/screenshots/ (or move out entirely)
```

- [ ] **Step 1:** Create the new directory tree.
  ```bash
  cd /Users/sds-ge573/PycharmProjects/miki_website/frontend
  mkdir -p assets/images/projects assets/images/social assets/docs
  ```

- [ ] **Step 2:** Move posters into `assets/images/projects/posters/`.
  ```bash
  if [ -d assets/posters ]; then
    git mv assets/posters assets/images/projects/posters
  fi
  ```

- [ ] **Step 3:** Move social images into `assets/images/social/`.
  ```bash
  if [ -d assets/social ]; then
    git mv assets/social assets/images/social
  fi
  ```

- [ ] **Step 4:** Move CV PDFs into `assets/docs/`.
  ```bash
  git mv assets/Mykyta_Kirichenko_CV_EN.pdf assets/docs/ 2>/dev/null || true
  git mv assets/Mykyta_Kirichenko_CV_RU.pdf assets/docs/ 2>/dev/null || true
  ```

- [ ] **Step 5:** Update **every** path in `content/content.json` to match the new layout. The two systematic replacements:
  - `"assets/posters/...` → `"assets/images/projects/posters/...`
  - `"assets/social/...` → `"assets/images/social/...`

  Do it with sed:
  ```bash
  sed -i.bak \
    -e 's|"assets/posters/|"assets/images/projects/posters/|g' \
    -e 's|"assets/social/|"assets/images/social/|g' \
    content/content.json
  rm content/content.json.bak
  ```

- [ ] **Step 6:** Re-run the path-validation script from Task 6.1 Step 3. The "Missing files" list should be no larger than before. (Some social images may genuinely not exist yet — that's expected.)

- [ ] **Step 7:** Reload `http://localhost:8000/`. Click into Projects → POSTERS — verify the poster thumbnails still render (they reference the moved paths). Open Social view — verify any social images that existed before still load.

- [ ] **Step 8:** Commit.
  ```bash
  git add -A
  git commit -m "refactor: reorganize assets into images/projects + images/social + docs"
  ```

---

## Phase 7 — Flatten layout, drop Django

### Task 7.1: Move `frontend/` contents up to repo root

**Files:** large mechanical move.

- [ ] **Step 1:** Stop the static server. Open a new terminal at the repo root.

- [ ] **Step 2:** Move everything out of `frontend/` to the repo root. Use `git mv` so history is preserved per file.
  ```bash
  cd /Users/sds-ge573/PycharmProjects/miki_website
  for item in frontend/*; do
    name=$(basename "$item")
    git mv "$item" "$name"
  done
  # frontend/ should now be empty
  rmdir frontend
  ```

- [ ] **Step 3:** Sanity check: `index.html`, `App.jsx`, `content/content.json`, `assets/`, `fonts/` should all now be at the repo root.
  ```bash
  ls -la | head -30
  ```

- [ ] **Step 4:** Start the static server at the repo root now.
  ```bash
  python3 -m http.server 8000
  ```

- [ ] **Step 5:** Open `http://localhost:8000/`. Verify the site loads identically. Click through all routes; check DevTools Console for errors and Network for any 404s.

- [ ] **Step 6:** Commit.
  ```bash
  git add -A
  git commit -m "refactor: flatten frontend/ to repo root"
  ```

### Task 7.2: Delete Django

**Files:**
- Delete: `config/`, `core/`, `manage.py`, `pyproject.toml`, `uv.lock`, `db.sqlite3`.

- [ ] **Step 1:** Remove the Django files.
  ```bash
  git rm -rf config core
  git rm manage.py pyproject.toml uv.lock
  # db.sqlite3 was untracked but staged in the initial git index — check first:
  git rm --cached db.sqlite3 2>/dev/null || true
  rm -f db.sqlite3
  ```

- [ ] **Step 2:** Reload `http://localhost:8000/`. Site should be unaffected (Django wasn't being used). Verify everything still works.

- [ ] **Step 3:** Commit.
  ```bash
  git add -A
  git commit -m "chore: remove Django backend — site is now pure static"
  ```

### Task 7.3: Add `.nojekyll` and `.gitignore`

**Files:**
- Create: `.nojekyll`, `.gitignore`.

- [ ] **Step 1:** Create empty `.nojekyll` (prevents GitHub Pages' Jekyll processing).
  ```bash
  touch .nojekyll
  ```

- [ ] **Step 2:** Create `.gitignore` at repo root with this content:
  ```
  # Python / Django leftovers
  .venv/
  __pycache__/
  *.pyc
  db.sqlite3

  # IDE / OS
  .idea/
  .DS_Store

  # Raw working files — not part of the deployed site
  uploads/

  # OAuth proxy local dev artifacts
  oauth-proxy/node_modules/
  oauth-proxy/.wrangler/
  ```

- [ ] **Step 3:** If `uploads/` exists at repo root (moved from `frontend/uploads/`), it should now be ignored by git. Untrack it:
  ```bash
  git rm -rf --cached uploads 2>/dev/null || true
  ```

- [ ] **Step 4:** Commit.
  ```bash
  git add .nojekyll .gitignore
  git commit -m "chore: add .nojekyll for Pages, .gitignore for repo hygiene"
  ```

---

## Phase 8 — Admin page (Decap CMS)

### Task 8.1: Create the Decap shell

**Files:**
- Create: `admin/index.html`.

The Decap CMS script is loaded from a CDN. Pin to a specific version and use Subresource Integrity (SRI) so a CDN compromise can't inject code into the admin (where an attacker could otherwise steal the GitHub OAuth token and rewrite the repo).

- [ ] **Step 1:** Create `admin/`.
  ```bash
  mkdir -p admin
  ```

- [ ] **Step 2:** Look up the latest stable Decap CMS version on npm and pin it.
  ```bash
  npm view decap-cms version
  ```
  Note the exact version (e.g., `3.7.5`). For the rest of these steps, substitute `<VERSION>` with that value.

- [ ] **Step 3:** Download the bundle and compute the SHA-384 hash for the SRI attribute.
  ```bash
  VERSION=<VERSION>  # e.g., 3.7.5
  curl -sSL "https://unpkg.com/decap-cms@${VERSION}/dist/decap-cms.js" \
    | openssl dgst -sha384 -binary \
    | openssl base64 -A
  ```
  Copy the resulting base64 string (e.g., `abcDEF...=`). This is the `integrity` value.

- [ ] **Step 4:** Write `admin/index.html`. Replace `<VERSION>` and `<SRI_HASH>` with the values from Steps 2–3:
  ```html
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MIKI — Admin</title>
  </head>
  <body>
    <script
      src="https://unpkg.com/decap-cms@<VERSION>/dist/decap-cms.js"
      integrity="sha384-<SRI_HASH>"
      crossorigin="anonymous"
    ></script>
  </body>
  </html>
  ```
  `crossorigin="anonymous"` is required for the browser to enforce SRI on cross-origin scripts. With both attributes set, the browser refuses to execute the script if the fetched bytes don't hash to the pinned value.

- [ ] **Step 5:** When bumping the Decap version in the future, re-run Steps 2–3 to compute a fresh hash and update both the URL and the `integrity` attribute together. Never bump the version without bumping the hash — the browser will block the script if they don't match.

### Task 8.2: Write the Decap schema

**Files:**
- Create: `admin/config.yml`.

- [ ] **Step 1:** Write `admin/config.yml`. The `<GITHUB_USER>/<REPO>` placeholder must be replaced — for this project it's `tavkhelidzeluka/miki_website`. The `base_url` is filled in **later** (Task 9.4) after the Cloudflare Worker is deployed; leave it as a placeholder for now.

  ```yaml
  backend:
    name: github
    repo: tavkhelidzeluka/miki_website
    branch: main
    base_url: https://miki-oauth.<your-cf-subdomain>.workers.dev
    # auth_endpoint defaults to /auth

  media_folder: "assets/images"
  public_folder: "/assets/images"

  collections:
    - name: site
      label: "Site content"
      files:
        - name: content
          label: "Content"
          file: "content/content.json"
          format: json
          fields:
            - { name: contact, label: Contact, widget: object, fields: [
                { name: email, widget: string },
                { name: telegram, widget: string },
                { name: instagram, widget: list, field: { name: handle, widget: string } },
                { name: tiktok, widget: string },
                { name: location, widget: object, fields: [
                    { name: en, widget: string },
                    { name: ua, widget: string }
                ]}
            ]}
            - { name: orderForm, label: "Order form (Web3Forms)", widget: object, fields: [
                { name: web3formsKey, label: "Web3Forms access key", widget: string }
            ]}
            - { name: about, label: About, widget: object, fields: [
                { name: bio, widget: object, fields: [
                    { name: en, widget: list, field: { name: line, widget: string } },
                    { name: ua, widget: list, field: { name: line, widget: string } }
                ]},
                { name: experience, widget: list, fields: [
                    { name: title, widget: object, fields: [
                        { name: en, widget: string },
                        { name: ua, widget: string }
                    ]},
                    { name: role, widget: object, fields: [
                        { name: en, widget: string },
                        { name: ua, widget: string }
                    ]},
                    { name: subRole, widget: object, required: false, fields: [
                        { name: en, widget: string },
                        { name: ua, widget: string }
                    ]},
                    { name: date, widget: object, fields: [
                        { name: en, widget: string },
                        { name: ua, widget: string }
                    ]}
                ]},
                { name: exhibitions, widget: list, fields: [
                    { name: label, widget: object, fields: [
                        { name: en, widget: string },
                        { name: ua, widget: string }
                    ]}
                ]},
                { name: skills, widget: list, fields: [
                    { name: label, widget: object, fields: [
                        { name: en, widget: string },
                        { name: ua, widget: string }
                    ]}
                ]}
            ]}
            - { name: projects, label: Projects, widget: list, fields: [
                { name: id, widget: string },
                { name: category, widget: select,
                  options: [ANIMATION, ILLUSTRATION, POSTERS, CANVAS, BOOKS, PHOTOS, "SOCIAL MEDIA"] },
                { name: year, widget: string },
                { name: name, widget: string },
                { name: client, widget: string },
                { name: role, widget: string },
                { name: medium, widget: string },
                { name: desc, widget: text },
                { name: prose, widget: text },
                { name: works, widget: list, fields: [
                    { name: name, widget: string },
                    { name: desc, widget: text },
                    { name: thumb, widget: image, required: false },
                    { name: price, widget: object, required: false, fields: [
                        { name: amount, widget: number, value_type: int },
                        { name: currency, widget: select, options: [EUR, USD, GEL] }
                    ]}
                ]}
            ]}
            - { name: canvas, label: "Canvas (shop)", widget: object, fields: [
                { name: items, widget: list, fields: [
                    { name: id, widget: string },
                    { name: title, widget: string },
                    { name: medium, widget: string },
                    { name: mediumUa, widget: string },
                    { name: price, widget: object, required: false, fields: [
                        { name: amount, widget: number, value_type: int },
                        { name: currency, widget: select, options: [EUR, USD, GEL] }
                    ]}
                ]}
            ]}
            - { name: social, label: Social, widget: object, fields: [
                { name: posts, widget: list, fields: [
                    { name: src, widget: image },
                    { name: brand, widget: string }
                ]},
                { name: carousels, widget: list, fields: [
                    { name: id, widget: string },
                    { name: brand, widget: string },
                    { name: title, widget: string },
                    { name: titleEn, widget: string },
                    { name: cover, widget: image },
                    { name: slides, widget: list, field: { name: src, widget: image } }
                ]},
                { name: stories, widget: list, fields: [
                    { name: src, widget: image },
                    { name: brand, widget: string }
                ]},
                { name: ads, widget: list, fields: [
                    { name: src, widget: image },
                    { name: aspect, widget: string },
                    { name: brand, widget: string }
                ]},
                { name: services, widget: list, fields: [
                    { name: id, widget: string },
                    { name: title, widget: string },
                    { name: sub, widget: string },
                    { name: subUa, widget: string }
                ]}
            ]}
  ```

- [ ] **Step 2:** Open `http://localhost:8000/admin/` in a browser. Verify the Decap login screen renders (a "Login with GitHub" button on a dark background). Don't try to log in yet — the OAuth proxy isn't deployed.

  Common failure: a YAML parse error on the schema is shown. Fix the indentation and reload.

- [ ] **Step 3:** Commit.
  ```bash
  git add admin/
  git commit -m "feat: add Decap CMS admin page and schema"
  ```

---

## Phase 9 — OAuth proxy (Cloudflare Worker)

This is the only part that doesn't live in this repo's deploy. It's a separate Cloudflare Worker, deployed via Wrangler CLI.

### Task 9.1: Register a GitHub OAuth App

**Files:** none — external setup.

- [ ] **Step 1:** Go to `https://github.com/settings/developers` → OAuth Apps → New OAuth App.

- [ ] **Step 2:** Fill in:
  - Application name: `miki-portfolio-admin`
  - Homepage URL: `https://tavkhelidzeluka.github.io/miki_website/` (or the eventual custom domain)
  - Authorization callback URL: `https://miki-oauth.<your-cf-subdomain>.workers.dev/callback`
    (`<your-cf-subdomain>` is whatever Cloudflare assigns; you'll set this in 9.3. For now, put a placeholder — you'll come back and edit this.)

- [ ] **Step 3:** Click "Register application". Copy the **Client ID** (visible). Click "Generate a new client secret" and copy the **Client Secret** immediately (it's only shown once). Save both somewhere safe.

### Task 9.2: Set up the proxy source

**Files:**
- Create: `oauth-proxy/wrangler.toml`, `oauth-proxy/package.json`, `oauth-proxy/src/index.js`.

- [ ] **Step 1:** Install Wrangler (Cloudflare CLI) if not already installed.
  ```bash
  npm install -g wrangler
  wrangler --version
  ```

- [ ] **Step 2:** Create the proxy directory and files.
  ```bash
  mkdir -p oauth-proxy/src
  ```

- [ ] **Step 3:** Write `oauth-proxy/package.json`:
  ```json
  {
    "name": "miki-oauth-proxy",
    "version": "1.0.0",
    "private": true,
    "scripts": {
      "deploy": "wrangler deploy",
      "dev": "wrangler dev"
    }
  }
  ```

- [ ] **Step 4:** Write `oauth-proxy/wrangler.toml`:
  ```toml
  name = "miki-oauth"
  main = "src/index.js"
  compatibility_date = "2024-12-01"
  ```

- [ ] **Step 5:** Write `oauth-proxy/src/index.js`. This is the Decap-compatible GitHub OAuth proxy. The protocol: `/auth?provider=github` redirects to GitHub; `/callback?code=…` exchanges the code and posts the token back to the opener window.

  ```js
  const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
  const GITHUB_TOKEN_URL     = "https://github.com/login/oauth/access_token";

  function html(body) {
    return new Response(`<!doctype html><html><body>${body}</body></html>`, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  function renderCallbackPage(message) {
    // Decap expects: window.opener.postMessage('authorization:github:success:{"token":"..."}', '*')
    const safeMessage = JSON.stringify(message);
    return html(`<script>
      (function () {
        function receiveMessage(e) {
          window.opener.postMessage(${safeMessage}, e.origin);
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>`);
  }

  export default {
    async fetch(request, env) {
      const url = new URL(request.url);

      if (url.pathname === "/auth") {
        const params = new URLSearchParams({
          client_id: env.GITHUB_CLIENT_ID,
          scope: "repo,user",
          redirect_uri: `${url.origin}/callback`,
        });
        return Response.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`, 302);
      }

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        if (!code) return new Response("missing code", { status: 400 });

        const tokenRes = await fetch(GITHUB_TOKEN_URL, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        });
        const data = await tokenRes.json();

        if (data.error) {
          return renderCallbackPage(
            `authorization:github:error:${JSON.stringify(data)}`
          );
        }

        return renderCallbackPage(
          `authorization:github:success:${JSON.stringify({ token: data.access_token, provider: "github" })}`
        );
      }

      return new Response("miki oauth proxy — endpoints: /auth, /callback", {
        headers: { "content-type": "text/plain" },
      });
    },
  };
  ```

- [ ] **Step 6:** Commit the source (before deploying, so it's reproducible).
  ```bash
  git add oauth-proxy/
  git commit -m "feat: add Cloudflare Worker OAuth proxy for Decap CMS"
  ```

### Task 9.3: Deploy the Worker

**Files:** none — deploy step.

- [ ] **Step 1:** Authenticate Wrangler with your Cloudflare account.
  ```bash
  cd oauth-proxy
  wrangler login
  ```
  This opens a browser; approve.

- [ ] **Step 2:** Set the GitHub credentials as Worker secrets (encrypted at rest, never in the repo).
  ```bash
  wrangler secret put GITHUB_CLIENT_ID
  # Paste the client ID from Task 9.1 when prompted
  wrangler secret put GITHUB_CLIENT_SECRET
  # Paste the client secret
  ```

- [ ] **Step 3:** Deploy.
  ```bash
  wrangler deploy
  ```
  Expected output: `Published miki-oauth ... https://miki-oauth.<your-cf-subdomain>.workers.dev`.

- [ ] **Step 4:** Note the deployed URL. Sanity check:
  ```bash
  curl https://miki-oauth.<your-cf-subdomain>.workers.dev/
  ```
  Expected: `miki oauth proxy — endpoints: /auth, /callback`.

### Task 9.4: Wire the Worker URL into config

**Files:**
- Modify: `admin/config.yml`.
- Update: GitHub OAuth App settings (callback URL).

- [ ] **Step 1:** Edit `admin/config.yml`. Replace the `base_url` placeholder with the real Worker URL from Task 9.3 Step 3:
  ```yaml
  backend:
    name: github
    repo: tavkhelidzeluka/miki_website
    branch: main
    base_url: https://miki-oauth.<your-cf-subdomain>.workers.dev
  ```

- [ ] **Step 2:** Go back to `https://github.com/settings/developers` → your OAuth app → edit the Authorization callback URL to the real worker URL:
  ```
  https://miki-oauth.<your-cf-subdomain>.workers.dev/callback
  ```
  Save.

- [ ] **Step 3:** Commit.
  ```bash
  cd /Users/sds-ge573/PycharmProjects/miki_website
  git add admin/config.yml
  git commit -m "config: wire Decap to the deployed OAuth proxy URL"
  ```

---

## Phase 10 — Deploy to GitHub Pages

### Task 10.1: Push to GitHub

**Files:** none — git push.

- [ ] **Step 1:** Ensure the repo has a remote called `origin` pointing at GitHub. If not, create the repo on github.com (public, no README/license/gitignore — we have our own) and add the remote:
  ```bash
  git remote -v
  # If empty:
  git remote add origin git@github.com:tavkhelidzeluka/miki_website.git
  ```

- [ ] **Step 2:** Verify branch and push.
  ```bash
  git status                            # working tree clean
  git checkout -b main 2>/dev/null || git checkout main
  git merge --ff-only static-migration  # if static-migration branch is ahead
  git push -u origin main
  ```
  If the user prefers PR-based integration, push the feature branch instead and open a PR — the rest of these steps assume `main` has the changes.

### Task 10.2: Enable GitHub Pages

**Files:** none — GitHub UI.

- [ ] **Step 1:** Visit `https://github.com/tavkhelidzeluka/miki_website/settings/pages`.

- [ ] **Step 2:** Under **Build and deployment** → **Source**, pick **Deploy from a branch**. Pick branch `main`, folder `/ (root)`. Save.

- [ ] **Step 3:** Wait ~30–90 seconds. Reload the Pages settings page. The top of the page should say "Your site is live at `https://tavkhelidzeluka.github.io/miki_website/`".

- [ ] **Step 4:** Open that URL in a browser. Verify the site loads. Click through all routes. Check DevTools Console; expect no errors.

  Common failure: a 404 on `content/content.json` if the path is wrong. Pages serves the repo at `/miki_website/` as the base path. Since our fetch uses the **relative** URL `content/content.json` (no leading slash), it resolves correctly under `/miki_website/`. If you used `/content/content.json`, change it back to relative.

### Task 10.3: Update OAuth App URLs to Pages

**Files:** GitHub OAuth App settings.

- [ ] **Step 1:** Go to `github.com/settings/developers` → `miki-portfolio-admin` → edit.

- [ ] **Step 2:** Set Homepage URL to `https://tavkhelidzeluka.github.io/miki_website/`. Callback URL stays at the Cloudflare Worker URL. Save.

### Task 10.4: End-to-end admin verification

**Files:** none — manual test.

- [ ] **Step 1:** Visit `https://tavkhelidzeluka.github.io/miki_website/admin/`. The Decap login screen should appear.

- [ ] **Step 2:** Click "Login with GitHub". A popup opens to github.com. Approve. The popup closes and the Decap editor loads.

- [ ] **Step 3:** In the editor, navigate to **Site content** → **Content**. Find the **Contact** section. Change the email field to `seriton3+test@gmail.com` (the `+test` makes it an obvious test value). Click **Save** in the top right.

- [ ] **Step 4:** Within ~10 seconds, check the GitHub repo's commit history: a new commit should appear authored by your GitHub user, modifying `content/content.json`. Wait another ~60 seconds for Pages to redeploy.

- [ ] **Step 5:** Open `https://tavkhelidzeluka.github.io/miki_website/` (the main site). Navigate to Contact. Verify the email shows the `+test` value.

- [ ] **Step 6:** **Revert** the change via the admin: set the email back to `seriton3@gmail.com`. Save. Verify on the main site.

- [ ] **Step 7:** Test the end-to-end order flow on the live site. Navigate to Canvas → add an item → checkout → fill in real test data → place order. Confirm an email arrives in the destination inbox.

---

## Phase 11 — Documentation

### Task 11.1: Write `README.md`

**Files:**
- Create: `README.md`.

- [ ] **Step 1:** Write `README.md` with this content:
  ```markdown
  # MIKI / GTXHI — Portfolio

  Static portfolio site for visual artist Mykyta Kirichenko.
  Live at: https://tavkhelidzeluka.github.io/miki_website/

  ## Editing content

  All editable content (projects, social posts, contact info, prices, about text)
  lives in `content/content.json`.

  **The easy way:** open the admin UI and use the form-based editor.

  1. Visit `https://tavkhelidzeluka.github.io/miki_website/admin/`.
  2. Click "Login with GitHub". You'll need write access to this repo.
  3. Edit fields, upload images. Click **Save**.
  4. Within ~1–2 minutes, the live site updates.

  **The direct way:** edit `content/content.json` and push to `main`. Pages auto-deploys.

  ## Adding a new piece (e.g. a poster)

  - In the admin UI: navigate to **Projects → POSTERS → works**. Click "Add work".
    Fill in name + desc. Drag an image into the **thumb** field — it uploads to
    `assets/images/projects/posters/`. Optionally fill in price.
  - In a code editor: drop the image in `assets/images/projects/posters/`, then add
    an entry to the `works` array of the POSTERS project in `content/content.json`.

  ## Order flow

  When a customer places an order from the Canvas/Checkout page, the form submits
  to Web3Forms, which emails the destination address (set in the Web3Forms
  dashboard for the access key in `content.json:orderForm.web3formsKey`). The
  artist then replies manually with payment instructions (PayPal invoice, IBAN
  details, or USDT wallet address).

  No card payments are processed on the site itself.

  ## Local development

  ```bash
  python3 -m http.server 8000
  open http://localhost:8000/
  ```

  No build step. Babel runs in-browser on the `.jsx` files.

  ## Deployment

  - Site: GitHub Pages, deployed automatically from `main` branch.
  - Admin: same repo, served at `/admin/`.
  - OAuth proxy: Cloudflare Worker, deployed separately via `wrangler deploy`
    from the `oauth-proxy/` directory. Holds the GitHub OAuth client secret as a
    Worker secret.

  ## Architecture

  See `docs/superpowers/specs/2026-05-28-static-site-with-decap-admin-design.md`
  for the full design rationale.
  ```

- [ ] **Step 2:** Commit.
  ```bash
  git add README.md
  git commit -m "docs: add README with editing and deploy notes"
  git push
  ```

### Task 11.2: Final cleanup pass

**Files:** any leftovers.

- [ ] **Step 1:** Run a final cleanup check.
  ```bash
  git status
  git ls-files | grep -E '(\.pyc|__pycache__|\.bak|\.tmp)$'
  ```
  Both should be empty (or `git status` clean).

- [ ] **Step 2:** Confirm the live site one last time. Walk through:
  - Home page renders.
  - Projects → click each of 7 categories.
  - About → all sections render, language toggles work.
  - Contact → all rows render.
  - Canvas → add an item, see it in cart.
  - Admin → login still works, save still commits.

- [ ] **Step 3:** Done. Close the working terminal.

---

## Self-Review

**Spec coverage check (every spec section maps to ≥ 1 task):**
- ✅ Repo layout — Phases 6, 7
- ✅ Content schema — Phase 3 (full JSON written)
- ✅ Loader pattern — Phase 4 (with the textContent-based error UI)
- ✅ Hosting (GitHub Pages) — Phase 10
- ✅ Admin (Decap) — Phase 8
- ✅ OAuth proxy — Phase 9
- ✅ Identity & access — covered via Phase 9 + 10.4 (collaborator-based gate exercised in the verification)
- ✅ Order flow — Phase 2 (Web3Forms signup) + Phase 5.6 (Checkout rewrite)
- ✅ End-to-end edit flow — Phase 10.4
- ✅ Migration plan — Phases 1–7 mirror the spec's 12-step plan, expanded
- ✅ Decisions (prices nullable, Stripe deferred, no Google login, Pages default URL) — implemented
- ✅ Removal of `card` payment method — Phase 5.6 Steps 1, 2, 5, 6
- ✅ `.nojekyll` — Phase 7.3
- ✅ `.gitignore` — Phase 7.3
- ✅ README — Phase 11

**Type-consistency check:**
- `window.CONTENT.about.bio` is `{ en: [string], ua: [string] }` (arrays of lines). About.jsx (Task 5.4) renders it as an array — consistent.
- `window.CONTENT.canvas.items[].price` is `null | { amount, currency }`. Canvas.jsx Step 2 (`addToCart({ ...it })`) carries `price` through unchanged; cart total (Step 3) checks `c.price && typeof c.price.amount === 'number'` — consistent.
- `window.CONTENT.orderForm.web3formsKey` used in Checkout.jsx (Step 4) and present in the schema (Phase 3 Step 2) — consistent.
- Decap schema `about.experience.subRole` is `required: false`; content.json sets `subRole: null` for entries without one — consistent.

**Placeholder scan:** every code block contains full code. The two `"// FILL: …"` markers in Phase 3 Step 2's JSON are explicit instructions to translate from specific source-file line ranges; the schema, surrounding fields, and a complete example entry are all shown.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-28-static-site-with-decap-admin.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
