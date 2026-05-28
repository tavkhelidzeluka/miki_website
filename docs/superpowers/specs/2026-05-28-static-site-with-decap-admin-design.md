# Static Site + Decap CMS Admin — Design

**Date:** 2026-05-28
**Status:** Draft
**Owner:** tavkhelidzeluka

## Summary

Convert the site from a Django-hosted React app into a pure static site deployed on GitHub Pages, with all editable content (projects, social posts, contact info, prices) driven by a single JSON file. Add a drop-in admin UI (Decap CMS) at `/admin/` that lets the artist log in with GitHub, edit content through generated forms, upload images, and save — saves are committed back to the repo automatically, which triggers a Pages redeploy.

## Goals

- Remove all server-side code. Site runs on free static hosting.
- Make every piece of editable content (projects, works, social posts, contact info, prices, about text) live in one file: `content/content.json`.
- Give the artist a form-based admin UI that requires no JSON or git knowledge.
- Edits flow: admin UI → git commit → Pages redeploy. No manual deploy step.
- Total hosting cost: $0.

## Non-goals

- No build step (no Vite/webpack/etc.). The site already uses in-browser Babel and keeps that posture.
- No new URL routing system. The app uses React in-memory routing today; that stays.
- No multi-user permissions, draft workflows, comments, or audit log beyond what git history gives you.
- No internationalization changes — existing EN/UA toggle is preserved as-is.
- No redesign or visual changes. This is structural only.

## Current state

- Django 6.x in `config/` + `core/`. Serves `frontend/index.html` and static files. One unused API endpoint (`/api/contact/`) that the frontend never calls — `Contact.jsx` is static info, no form.
- Frontend in `frontend/`: React via in-browser Babel; no build step; ~1.9 MB `index.html` (CSS + base64 fonts inlined); separate `.jsx` files loaded with `<script type="text/babel">`.
- Content is hardcoded in JSX:
  - `Projects.jsx` → `ALL_PROJECTS` (7 categories, each with `id/category/year/name/client/role/medium/desc/prose/works[]`).
  - `Social.jsx` → arrays of `{ src, brand }` for posts and stories.
  - `Contact.jsx` → email, telegram, instagram (two handles), tiktok, location (i18n object).
  - `About.jsx` → bio copy.
  - `Canvas.jsx` → hardcoded `price: 0` stub.
- Assets in `frontend/assets/` (curated, referenced by code) and `frontend/uploads/` (raw working files, not referenced).
- SQLite db is empty / unused.

## Target architecture

Three pieces, deployed independently:

1. **Static site (GitHub Pages).** The whole site is plain HTML + JSX + CSS + JSON + images, served from the repo root via GitHub Pages.
2. **Admin UI (Decap CMS).** A second page at `/admin/` that bundles Decap CMS from a CDN and reads `admin/config.yml` to render an editor for `content/content.json`. Saves go through Decap's GitHub backend, which calls the GitHub Contents API to commit changes on the user's behalf.
3. **OAuth proxy (Cloudflare Worker).** A ~40-line Worker that performs the GitHub OAuth code-exchange (which requires a client secret that can't live in the browser). Deployed once and left alone. Free tier covers all expected usage.

```
Browser  ──────────────►  GitHub Pages (static files)
   │
   │  /admin/ ──► Decap CMS loads in browser
   │                  │
   │                  │  1. OAuth login button
   │                  ▼
   ├──────────►  Cloudflare Worker (OAuth proxy)
   │                  │
   │                  │  2. Exchanges code for token via GitHub
   │                  ▼
   │             GitHub OAuth
   │
   │  3. Decap holds token; on Save → PUT /repos/.../contents/content.json
   └──────────►  GitHub API ──► commit to main ──► Pages auto-deploys
```

## Repo layout

```
miki_website/
├── index.html                  # main site (moved up from frontend/)
├── App.jsx
├── Projects.jsx
├── Social.jsx
├── Contact.jsx
├── About.jsx
├── Home.jsx
├── Nav.jsx
├── Canvas.jsx
├── Checkout.jsx
├── Animation.jsx
├── tweaks-panel.jsx
├── i18n.jsx
├── design-system.css
├── styles.css
├── fonts/
├── content/
│   └── content.json            # single source of truth (editable)
├── assets/
│   ├── images/
│   │   ├── projects/
│   │   │   ├── animation/
│   │   │   ├── illustration/
│   │   │   ├── posters/
│   │   │   ├── canvas/
│   │   │   ├── books/
│   │   │   ├── photos/
│   │   │   └── social/         # the "SOCIAL MEDIA" category artwork
│   │   └── social/             # social-media post/story thumbnails
│   │       ├── legnacat/
│   │       ├── khedi/
│   │       ├── yang/
│   │       └── realty/
│   ├── docs/                   # CVs
│   └── screenshots/
├── admin/
│   ├── index.html              # Decap CMS shell
│   └── config.yml              # schema
├── oauth-proxy/                # CF Worker source (deployed separately)
│   ├── wrangler.toml
│   ├── package.json
│   └── src/index.js
├── docs/
│   └── superpowers/specs/      # design docs
├── .nojekyll                   # tell Pages not to Jekyll-process
├── .gitignore
└── README.md
```

**Deleted from current repo:**
- `config/` (Django settings)
- `core/` (Django app)
- `manage.py`
- `pyproject.toml`, `uv.lock` (Python deps)
- `db.sqlite3`
- `frontend/` directory — its contents move up to repo root.

**Gitignored (kept locally for the artist, not deployed):**
- `frontend/uploads/` — raw working files, drafts, junk
- `.venv/`, `__pycache__/`
- `db.sqlite3`

## Content schema

Single file: `content/content.json`. Loaded once at app boot and exposed as `window.CONTENT`. All JSX modules read from it.

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
    "web3formsKey": "<access-key-from-web3forms.com>"
  },
  "about": {
    "bio": { "en": "...", "ua": "..." }
  },
  "projects": [
    {
      "id": "01",
      "category": "ANIMATION",
      "year": "2024 — 2025",
      "name": "through the magic crystal",
      "client": "Studio SHAR",
      "role": "Character Animator",
      "medium": "2D digital animation, 12fps",
      "desc": "...",
      "prose": "...",
      "works": [
        {
          "name": "through the magic crystal",
          "desc": "Character animation — Studio SHAR feature. 2024–2025.",
          "thumb": "assets/images/projects/animation/magic-crystal.jpg",
          "price": null
        }
      ]
    }
  ],
  "social": {
    "posts": [
      { "src": "assets/images/social/legnacat/post-1.webp", "brand": "@legnacat" }
    ],
    "stories": [
      { "src": "assets/images/social/yang/story-1.webp", "brand": "YANG" }
    ]
  }
}
```

**Field semantics:**
- `price: null` means "price on request" (current default; Canvas page surfaces it as such).
- `price: { amount: number, currency: "EUR" | "USD" | "GEL" }` when set — Canvas / Checkout reads `amount` and `currency`.
- `thumb` is a path relative to the repo root. The Decap image widget uploads new files to `assets/images/...` and writes the relative path here.
- `location` and `bio` are i18n objects (`{ en, ua }`) — match the pattern the existing `t()` helper consumes.
- `category` is a string matching the EN keys in `Projects.jsx`'s `CAT_UA` map (`"ANIMATION"`, `"ILLUSTRATION"`, ...). UA translation continues to come from `CAT_UA`; not duplicated in JSON.

**Validation:** none beyond what Decap's schema enforces. The JSON is human-trusted; if the artist somehow saves malformed data the site shows a soft error overlay (see "Loader pattern" below) and they fix it in the admin.

## Loader pattern

Today: each component reads its own hardcoded module-level constant.
Target: each component reads from `window.CONTENT`.

In `index.html`, before the first `<script type="text/babel">` that defines a component, add a tiny pre-mount fetch:

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

The mount script awaits the same promise:

```html
<script type="text/babel">
  window.__contentReady.then(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  });
</script>
```

**Security notes (loader):**
- Error display uses `textContent` + `replaceChildren`, never `innerHTML`. Even though the error string is constructed in our own code, this keeps the pattern safe by default — if anyone later edits this block to surface server-supplied content (e.g., a body from a 4xx response), they won't accidentally introduce XSS.
- The fetched JSON is fed directly into React (`<img src={...}>`, `<div>{text}</div>`); React escapes by default. The only place where a JSON field flows into HTML attributes is `backgroundImage: url("${w.thumb}")` (existing code in `Projects.jsx`). Since the artist is the only person who can write to `content.json` (via Decap, authenticated as a repo collaborator), this is not a viable XSS vector — but during migration we should keep an eye on any field that's interpolated into `style` or `dangerouslySetInnerHTML`.

**Per-component changes:**
- `Projects.jsx`: replace `const ALL_PROJECTS = [...]` with `const ALL_PROJECTS = window.CONTENT.projects;`.
- `Social.jsx`: same treatment for `SOCIAL_POSTS` / `SOCIAL_STORIES`.
- `Contact.jsx`: switch hardcoded fields to `window.CONTENT.contact.*`.
- `About.jsx`: switch bio text to `window.CONTENT.about.bio`.
- `Canvas.jsx`: when adding to cart, read `price` from the work record instead of hardcoding 0; display "price on request" when `price === null`.
- `Checkout.jsx`: when summing the cart, treat `null` prices as zero and label the line item accordingly.

No code outside these six files needs to change to swap a piece of content.

## Hosting (GitHub Pages)

**One-time setup:**
1. Confirm repo is public (GitHub Pro can use private; default plan must be public).
2. Repo Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: `main`, Folder: `/` (root) → Save.
3. Add `.nojekyll` at repo root (empty file). This prevents Pages from running Jekyll on JSX files (Jekyll would otherwise skip files/dirs starting with `_` and attempt liquid processing in some cases).
4. (Optional) Add `CNAME` file with custom domain; point DNS A/AAAA records to GitHub Pages IPs and `www` to `<user>.github.io`. HTTPS auto-issued via Let's Encrypt.

**Operational behavior:**
- Push to `main` → Pages workflow runs → live in ~1 min.
- Pages serves the repo root as web root. `index.html` is the default document. No further routing config; the app is single-page and manages routes in React state.
- `.jsx` files are served as plain text; the in-browser Babel tag in `index.html` interprets them.

**Bandwidth/limits:** GitHub Pages has a 100 GB/month soft bandwidth limit and 1 GB repo size limit. The current site's largest asset is the 1.9 MB `index.html`; expected portfolio traffic is far below the limit.

## Admin (Decap CMS)

**`admin/index.html`** — minimal shell that loads Decap from CDN with **Subresource Integrity (SRI) pinning** so a CDN compromise can't inject code into the admin (where an attacker could steal the GitHub OAuth token and rewrite the repo). The implementation plan walks through computing the hash; the resulting tag looks like:

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
    src="https://unpkg.com/decap-cms@3.7.5/dist/decap-cms.js"
    integrity="sha384-<computed-at-install>"
    crossorigin="anonymous"
  ></script>
</body>
</html>
```

Version is pinned exactly (no `^` range) — SRI hashes are tied to a single bundle. Bumping Decap means re-computing the hash and updating both fields together. Decap auto-locates `config.yml` next to `index.html`.

**`admin/config.yml`** — schema. Sketch (full version drafted in implementation):

```yaml
backend:
  name: github
  repo: tavkhelidzeluka/miki_website
  branch: main
  base_url: https://miki-oauth.<subdomain>.workers.dev
  # auth_endpoint left at default '/auth'

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
                  { name: en, widget: text },
                  { name: ua, widget: text }
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
                      { name: amount, widget: number },
                      { name: currency, widget: select, options: [EUR, USD, GEL] }
                  ]}
              ]}
          ]}
          - { name: social, label: Social, widget: object, fields: [
              { name: posts, widget: list, fields: [
                  { name: src, widget: image },
                  { name: brand, widget: string }
              ]},
              { name: stories, widget: list, fields: [
                  { name: src, widget: image },
                  { name: brand, widget: string }
              ]}
          ]}
```

**Behavior:**
- Visiting `/admin/` shows a login screen. Click "Login with GitHub" → OAuth popup → user authorizes → admin UI appears.
- Edits build up a diff. Clicking "Save" pushes a commit to `main` directly (no editorial workflow / draft PRs — single-editor site).
- Image uploads go into `assets/images/...` and are referenced by relative path.
- Decap shows a media library UI for picking previously-uploaded images.

## OAuth proxy (Cloudflare Worker)

A standalone Cloudflare Worker handles the GitHub OAuth code-exchange step. Decap maintainers publish a ready-made implementation: [`decaporg/decap-cms-oauth-provider-workers`](https://github.com/decaporg/decap-cms-oauth-provider-workers). We use it directly.

**One-time setup:**
1. Register a GitHub OAuth App: github.com/settings/developers → New OAuth App.
   - Application name: `miki-portfolio-admin`
   - Homepage URL: `https://<user>.github.io/miki_website/` (or custom domain)
   - Authorization callback URL: `https://miki-oauth.<subdomain>.workers.dev/callback`
   - Save → copy Client ID + Client Secret.
2. Clone the proxy template into `oauth-proxy/`.
3. `wrangler secret put GITHUB_CLIENT_ID` and `wrangler secret put GITHUB_CLIENT_SECRET`.
4. `wrangler deploy` → get the Worker URL.
5. Put that URL in `admin/config.yml` under `backend.base_url`.

The Worker is deployed once. We commit its source to `oauth-proxy/` for reproducibility but it has its own deploy lifecycle (not tied to GitHub Pages).

**Access control:** Decap requests the `repo` scope. GitHub's own permission check is the gate — only accounts with write access to the repo can save. The artist gets added as a collaborator on the repo; nobody else can save even if they authenticate.

**Free tier:** Cloudflare Workers free plan allows 100,000 requests/day. The proxy is only hit during login (~3 requests per session), not on every edit. Well within free tier.

## Identity & access (how "who can edit" works)

The admin has no user database, no email allowlist, no session table. The entire identity question is delegated to GitHub.

1. **Login.** The "Login with GitHub" button in `/admin/` opens a popup to `github.com/login/oauth/authorize?...`. The artist authenticates **on github.com itself** (we never see their password). GitHub asks them to authorize the `miki-portfolio-admin` OAuth App with `repo` scope.
2. **Code exchange.** GitHub redirects the popup to the Cloudflare Worker with a temporary `code`. The Worker exchanges that code (using the client secret it holds in env vars) for an OAuth access token, then `postMessage`s the token back to the admin window and closes.
3. **Token storage.** Decap stores the token in `localStorage` for the site's origin. Subsequent visits skip login.
4. **Authorization on every save.** When Decap saves, it calls `PUT /repos/<owner>/<repo>/contents/<path>` with the token in the `Authorization` header. GitHub looks up which user the token belongs to, checks whether *that user* has write access to *this repo*, and either commits or returns 403.

**Who can edit, concretely:** anyone listed as a collaborator on the GitHub repo (or members of an org team with write access). To grant edit access to someone, add them as a collaborator in GitHub's repo settings; to revoke, remove them. No code change required.

**Why not Google login.** A pure-frontend Google OAuth check (`if (email === "artist@gmail.com")`) is unenforceable — the check runs in the user's browser, which they fully control. The browser is not a trust boundary. GitHub's permission check, by contrast, runs on GitHub's servers and is unbypassable. So we use the auth mechanism that GitHub itself enforces, instead of building a fake check we couldn't enforce.

If a Google-account-based gate is hard-required later, that needs a real backend (Option C from brainstorming: Cloudflare Worker that verifies Google ID tokens server-side, then performs commits on the user's behalf with a stored GitHub App credential). Out of scope for v1.

## Order flow (payments)

**Current state:** `Checkout.jsx` is non-functional theatre — `placeOrder` generates a random tracking number and shows a success screen with no network call. Card details are collected but discarded.

**Target for v1: order-request flow** matching the existing UX copy ("we'll send the PayPal invoice / bank details / USDT address to your email").

### Mechanism

The cart + shipping form submits to **Web3Forms** (free, no signup, 250 submissions/month). On successful submit, the artist gets an email with the full order details; the customer sees the existing "thank you, watch your inbox" screen.

**Why Web3Forms over alternatives:**
- No signup, no API key bound to an account — just a public access key tied to your destination email.
- Built-in honeypot + optional hCaptcha for spam.
- Free tier covers expected portfolio volume.
- (Formspree is a fine substitute with similar shape; switching is a 1-line change.)

### Required changes to `Checkout.jsx`

1. **Remove the `card` payment method.** Currently it collects raw card number / CVC / holder with no processor. That's worse than useless — a security liability if those fields ever start submitting somewhere. Keep only `paypal`, `bank`, `crypto`, plus a new `contact` ("get in touch") option.
2. **Add `error` state** alongside the existing `processing` state.
3. **Implement `placeOrder` for real:**
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
           ...form,
           items: cart.map(c => `${c.name} (${c.id})`).join('\n'),
           cart_json: JSON.stringify(cart),
         }),
       });
       if (!res.ok) throw new Error('order submission failed');
       setStep('done');
     } catch (err) {
       setError(t({
         en: `Couldn't send order automatically. Please email ${window.CONTENT.contact.email} with your items and shipping address.`,
         ua: `Не вдалося надіслати замовлення автоматично. Будь ласка, напишіть на ${window.CONTENT.contact.email}.`,
       }));
     } finally {
       setProcessing(false);
     }
   };
   ```
   On error, the "done" step is not entered — the form stays visible and the error banner shows alongside the submit button.
4. **Drop the fake tracking number.** The "done" screen shows "order received, watch your email" instead of a fake tracking ID. (The "tracking" UX referred to shipping tracking, not payment — it can come back later when the artist enters a real tracking number in a reply email.)

### Order persistence

- v1: artist's email inbox. Each order = one email with all fields. Searchable, archivable. Adequate for low volume.
- Future upgrade (no code change to site): connect Web3Forms to Google Sheets via Zapier for a running order log.

### Stripe is explicitly out of scope for v1

If/when the artist wants instant card payments, the upgrade path is additive: add an optional `paymentLink: "https://buy.stripe.com/..."` field to a work in `content.json`. Canvas page shows a "Buy now" button if present, falls back to the order request form if absent. No restructuring needed.

### Setup steps

1. Visit `web3forms.com` → enter destination email (this binds the access key to the inbox; not stored in our code) → copy the access key.
2. Add to `content.json` (or via the admin UI):
   ```json
   "orderForm": { "web3formsKey": "abc123-..." }
   ```
3. (Optional but recommended) Enable hCaptcha + honeypot in the Web3Forms dashboard for the same access key.

## End-to-end edit flow

1. Artist visits `https://<site>/admin/`.
2. Clicks "Login with GitHub". Popup opens to `https://miki-oauth.<sub>.workers.dev/auth?provider=github...`. After GitHub authorizes, the Worker exchanges the code for an access token and `postMessage`s it back to the admin window.
3. Admin UI shows the editor. Artist edits text, adjusts a price, drags in a new image.
4. Clicks "Save".
5. Decap calls GitHub Contents API:
   - `PUT /repos/.../contents/content/content.json` (updated JSON).
   - `PUT /repos/.../contents/assets/images/projects/posters/new-poster.jpg` (new image, if any).
6. GitHub records the commits on `main`.
7. GitHub Pages workflow auto-triggers; site live in ~1 minute.

## Migration plan

Mechanical, ordered to keep each step independently verifiable:

1. **Snapshot.** Create a working branch. Confirm the existing app still serves correctly via `python manage.py runserver`.
2. **Extract data.** Write a one-off script (or do it by hand) that reads `ALL_PROJECTS`, the social arrays, and contact info from the JSX files and writes `content/content.json`.
3. **Restructure assets.** Move `frontend/assets/posters/*` → `assets/images/projects/posters/`, `frontend/assets/social/*` → `assets/images/social/`, etc. Update paths in `content.json` accordingly. Keep `frontend/uploads/` as-is locally; gitignore it.
4. **Add loader.** Modify `frontend/index.html` to pre-fetch `content/content.json` before mounting React.
5. **Switch components.** One file at a time: `Projects.jsx` → `Social.jsx` → `Contact.jsx` → `About.jsx` → `Canvas.jsx` (prices) → `Checkout.jsx` (real form submit + drop the `card` method). Verify after each.
6. **Flatten layout.** Move everything from `frontend/` up to repo root. Update `index.html` script src paths if any are absolute.
7. **Delete Django.** Remove `config/`, `core/`, `manage.py`, `pyproject.toml`, `uv.lock`, `db.sqlite3`. Confirm `python -m http.server 8000` serves the site correctly (or any static server).
8. **Add admin.** Create `admin/index.html` and a first cut of `admin/config.yml`. The OAuth proxy isn't deployed yet, so login won't work — but the page should load and show the login screen.
9. **Deploy OAuth proxy.** Register GitHub OAuth App, deploy Worker, fill `base_url` in `admin/config.yml`.
10. **Enable Pages.** Push to `main`, enable Pages in repo settings, verify the site loads at the Pages URL.
11. **Verify admin end-to-end.** Login → make a tiny edit (change a description) → save → confirm commit on `main` → confirm site updates.
12. **Documentation.** Write `README.md` with: how to edit, where to find the admin, how to add a new project, how to redeploy the proxy if needed.

Each step is a small commit. The site stays functional throughout except briefly during step 6/7 (where it switches from Django-served to file://-served).

## Decisions

- **Prices.** Field is nullable (`null` = "price on request"). Canvas page renders "price on request" in that case. Checkout flow remains intact and submits as an order request (manual followup) regardless of whether prices are set.
- **Payments.** Order request flow via Web3Forms (Option A). No card processor in v1. Stripe explicitly out of scope, but `paymentLink` field on works is the planned upgrade path if needed.
- **Auth.** GitHub OAuth via Cloudflare Worker proxy. No Google login. Access controlled via GitHub repo collaborators list.
- **Custom domain.** Not required for v1 — `https://<user>.github.io/miki_website/` works. `CNAME` file can be added later.

## Out of scope

- Visual redesign or styling changes.
- New site features (blog, RSS, etc.).
- Replacing in-browser Babel with a build step.
- Multi-user admin, draft workflows, editorial review.
- i18n changes beyond preserving the existing EN/UA toggle.
- Migrating the raw `frontend/uploads/` directory contents into the new asset structure — those files aren't referenced.
- Server-side image optimization. (Future: pre-process images locally before upload.)
- **Online card payments / Stripe integration.** Documented upgrade path: add `paymentLink` field to works in `content.json`.
- **Persisted order database.** Orders live in the artist's email inbox. Future upgrade: Web3Forms → Google Sheets via Zapier.
- **Google login for admin.** Documented upgrade path: Cloudflare Worker with server-side Google ID token verification + GitHub App credential.

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| In-browser Babel performance on large `Projects.jsx` becomes noticeable | low | Already shipping this way; no change. Add a build step later if needed. |
| Artist edits malformed JSON via admin and breaks the site | low | Decap's schema-driven UI prevents malformed JSON. If it ever happens, the loader's catch block shows a clear error and `git revert` fixes it. |
| GitHub OAuth App credentials leak | low | Client secret only lives in Cloudflare Worker env vars (encrypted at rest). Never in the repo. Rotate via GitHub OAuth App settings if exposed. |
| Cloudflare Worker free tier exceeded | very low | Login = ~3 requests; 100k/day limit; artist logs in rarely. Hard to exceed. |
| GitHub Pages outage | low | Outages do happen but are typically short. No real mitigation needed for a portfolio. |
| Image uploads via Decap commit large binaries to git | medium | Decap commits images directly. Repo will grow over time. For a portfolio this is fine for years; if it becomes a problem, switch Decap's media to an external store later. |
| Repo size approaches Pages 1 GB limit | low | Current `frontend/assets/` is small. Watch over time; archive old work to a separate repo if needed. |
| Web3Forms free quota exceeded (250/mo) | low | Portfolio volume well below. If hit, switch to Formspree (50/mo free + paid tiers) or self-host via Cloudflare Worker + Resend (Option D). |
| Order form spam | medium | Enable Web3Forms' built-in honeypot + hCaptcha. Reject submissions with empty/invalid email. |
| Web3Forms outage | low | Order form returns an error; existing UI shows a fallback message telling the customer to email directly (the contact email is shown). |

## Success criteria

- `git push` to `main` deploys the site.
- All editable content lives in `content/content.json`; no JSX edits required to change a price, title, or image.
- `/admin/` is reachable, login works, save commits to `main`, site reflects the change within ~2 minutes of save.
- Total monthly cost: $0.
- The artist can add a new poster to the "POSTERS" category — upload image, fill in name + description + optional price — without involving the developer.
- A customer placing an order through `Checkout.jsx` causes an email with the order details to arrive in the artist's inbox; the customer sees a success confirmation.
- The `card` payment method (which would otherwise collect raw card data with no processor) is removed from the UI.
