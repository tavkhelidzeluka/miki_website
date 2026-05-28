# Inline Editor — Design

**Date:** 2026-05-28
**Status:** Draft
**Owner:** tavkhelidzeluka
**Builds on:** `2026-05-28-static-site-with-decap-admin-design.md` (the static-site + Decap CMS migration)

## Summary

Add "edit-in-place" capability to the live portfolio site for logged-in users: hover a text element to reveal a pencil icon, click to edit in a small popover; hover an image to reveal a swap icon, click to open a file-upload modal. Edits accumulate in an in-memory buffer; "Save all" produces a single atomic commit to the GitHub repo via the git data API, which triggers GitHub Pages to redeploy. The editor JavaScript loads only when a Decap OAuth token is present in `localStorage`, so anonymous visitors download nothing extra.

## Goals

- Logged-in users can edit any text field shown on the site without leaving the page.
- Logged-in users can replace an existing image (by uploading a new file) for any image-bearing element.
- All edits in a session commit as a single git commit (clean history).
- Editor code is invisible (zero bytes downloaded) for anonymous visitors.
- No new auth flow — reuse Decap's existing OAuth token.

## Non-goals

- Adding new items (new project, new work, new social post) — that still happens in `/admin/`.
- Removing or reordering items — also `/admin/`-only for v1.
- Rich-text formatting (bold/italic/links inside fields).
- Real-time collaboration / locking.
- Image cropping/resizing in-browser.
- Undo/redo beyond "discard all unsaved changes" in the current session.
- Editing of non-content data (currency list, tweak defaults, internal mapping tables).

## Current state

- Static site at `tavkhelidzeluka.github.io/miki_website/`. Content lives in `content/content.json`.
- Decap CMS at `/admin/` provides form-based editing. After GitHub OAuth, Decap stores a user object (including the OAuth access token) in `localStorage`.
- Components (`Projects.jsx`, `Canvas.jsx`, etc.) read content from `window.CONTENT` at render time.
- All assets currently referenced from `content.json` live under `assets/images/...` with a known per-category folder structure (e.g., posters at `assets/images/projects/posters/`).

## Target architecture

Three layers, in order of execution:

1. **Bootstrap** (in `index.html`) — checks `localStorage` for the Decap user token. If present, injects the editor script. If absent, no editor code is loaded.
2. **Editor runtime** (`editor/editor.jsx`) — initialises React state for edit mode + pending changes, renders a floating toolbar, attaches click-handlers to elements with `data-content-path` attributes.
3. **GitHub client** (`editor/editor-github.jsx`) — assembles the atomic commit (tree + blobs + commit + ref update) on save.

```
   anonymous visitor                          logged-in user
   ─────────────────                         ────────────────
        |                                          |
        v                                          v
   index.html                                  index.html
        |                                          |
        v                                          v
   bootstrap check: localStorage decap user?   bootstrap check: yes
        no                                         |
        |                                          v
        v                                     load editor/*.jsx
   site renders as before                         |
                                                  v
                                          editor mounts toolbar +
                                          attaches edit handlers
                                                  |
                                          (user clicks pencil)
                                                  v
                                          popover/modal opens,
                                          accepts new value
                                                  v
                                          (user clicks Save All)
                                                  v
                                          git data API:
                                            create blobs + tree +
                                            commit + ref update
                                                  v
                                          Pages redeploys (~1 min)
```

## Content addressing

Every editable element on the page gets a `data-content-path` attribute identifying its position in `content.json`:

```jsx
<dd data-content-path="contact.email">{c.email}</dd>
<span data-content-path={`projects.${i}.name`}>{p.name}</span>
<div
  data-content-path={`projects.${i}.works.${j}.thumb`}
  data-asset-folder={`assets/images/projects/${category.toLowerCase()}`}
  style={{ backgroundImage: `url("${w.thumb}")` }}
/>
```

- `data-content-path` is a dotted/indexed path into `content.json`. Notation: `a.b.0.c` (`.`-separated, integers for array indices).
- `data-asset-folder` is image-only: the directory where new uploads land. The editor reads it to know where to PUT new image blobs.

Path utilities:
```js
getByPath(obj, "projects.0.name")          // → "through the magic crystal"
setByPath(obj, "projects.0.name", "...")  // mutates obj (returns new object via structured clone)
```

The editor builds a fresh draft from `window.CONTENT` on Save and walks the pending-changes map applying each `setByPath`, then serialises to JSON.

## Auth layer

### Detection
The bootstrap reads `localStorage` keys matching `/^(decap-cms|netlify-cms)\.user$/`. If any contain a JSON object with a `token` field, the user is "logged in" and the editor is loaded.

### Token usage
The editor uses Decap's existing OAuth token. We never request a new token; we never re-display login UI. If the token has been revoked (returns 401 from GitHub), the editor surfaces an inline message: "Your session expired — open `/admin/` and log in again, then retry."

### Permissions
All GitHub Contents/git-data writes respect the repository's normal collaborator permissions. If a non-collaborator somehow obtains a token and tries to save, GitHub returns 403 and the editor shows the error.

## UI components

### Floating toolbar
Bottom-right of the viewport (fixed position). Contents:
- "Edit" toggle (off/on)
- When on + at least one pending change: "Save N changes" button + "Discard" button
- During save: spinner + "Saving…" text
- On error: red border + error message

### Text editor popover
- Triggered when edit mode is on AND user clicks an element with `data-content-path` pointing to a string.
- A small absolutely-positioned popover anchored to the element.
- Single-line `<input>` for short fields (path matches `*.email|*.brand|*.title|*.id|*.year|*.client|*.role|*.medium|*.tiktok|*.telegram`).
- Multi-line `<textarea>` for `*.desc|*.prose|*.bio.*`.
- Currency-aware `<input type="number">` for `*.price`.
- Buttons: Save (returns to read mode with the new value displayed) and Cancel.
- Edits are NOT pushed to GitHub yet — they sit in the pending-changes map.

### Image upload modal
- Triggered when edit mode is on AND user clicks an element with `data-content-path` pointing to an image string (we infer by checking whether the existing value resembles an image path — extension `.jpg|.jpeg|.png|.webp|.gif`).
- Modal contents:
  - File picker (`<input type="file" accept="image/*">`)
  - Preview pane (uses `URL.createObjectURL` of the chosen file)
  - Filename field (editable; default = `<existing-filename-from-current-path>` so the existing image is overwritten, OR `<slug-of-related-content>-<timestamp>.<ext>` if no existing path)
  - Buttons: Save (queues the upload + path change) and Cancel
- A pending image upload is held in the changes map alongside text edits.

### i18n editing
For fields whose JSON shape is `{ en: string, ua: string }` (e.g., `contact.location`), the popover shows two stacked inputs labeled EN / UA. The path in `data-content-path` points to the parent object (e.g., `contact.location`), and the editor handles the i18n structure as a special case.

### Visual affordances
- Hover (edit mode on): subtle dashed outline (`1px dashed currentColor`, low opacity) + a small icon at the element's top-right.
- Element with pending changes: a small filled dot in the top-right corner.
- Element being edited: solid outline + raised z-index so the popover sits above.

## Save layer

### Atomic commit via git data API

Single git commit per Save, regardless of how many fields/images changed. Sequence:

1. **Reference current head**
   ```
   GET /repos/{owner}/{repo}/git/refs/heads/main
       → { object: { sha: <commit_sha> } }
   ```
2. **Fetch current tree**
   ```
   GET /repos/{owner}/{repo}/git/commits/{commit_sha}
       → { tree: { sha: <tree_sha> } }
   ```
3. **Create blobs for new image files**
   ```
   POST /repos/{owner}/{repo}/git/blobs
        body: { content: <base64>, encoding: "base64" }
        → { sha: <blob_sha> }
   ```
   One POST per new image. Done in parallel (`Promise.all`).
4. **Create updated `content/content.json` blob**
   ```
   POST /repos/{owner}/{repo}/git/blobs
        body: { content: <new_json_string>, encoding: "utf-8" }
        → { sha: <blob_sha> }
   ```
5. **Create tree**
   ```
   POST /repos/{owner}/{repo}/git/trees
        body: {
          base_tree: <tree_sha>,
          tree: [
            { path: "content/content.json", mode: "100644", type: "blob", sha: <sha> },
            { path: "assets/images/.../new-photo.jpg", mode: "100644", type: "blob", sha: <sha> },
            …
          ]
        }
        → { sha: <new_tree_sha> }
   ```
6. **Create commit**
   ```
   POST /repos/{owner}/{repo}/git/commits
        body: {
          message: "<auto-generated summary>",
          tree: <new_tree_sha>,
          parents: [<commit_sha>]
        }
        → { sha: <new_commit_sha> }
   ```
7. **Update ref**
   ```
   PATCH /repos/{owner}/{repo}/git/refs/heads/main
         body: { sha: <new_commit_sha>, force: false }
   ```

### Commit message format
```
edit(inline): <N> text change(s), <M> image upload(s)

- contact.email
- about.bio.en.0
- projects.2.works.4.thumb (uploaded new poster.jpg)
```
First line is a short summary; body lists each path that changed, with image paths annotated.

### Conflict handling
If step 7 returns `422 fast-forward` (someone else committed concurrently after step 1), the editor:
1. Refetches `content/content.json` from the new HEAD.
2. Diffs the pending changes against the new base.
3. If no overlap: silently retry the commit from step 1.
4. If overlap: show a modal "The site changed since you started editing. Your changes for <paths> would overwrite someone else's. [Reload and lose my changes] / [Keep my changes anyway (force-overwrite)]."

Force-overwrite uses the same flow with `force: true` on the ref update.

### Optimistic UI updates
After successful commit, the editor:
1. Re-fetches `content/content.json` (the freshly-committed version).
2. Replaces `window.CONTENT`.
3. Triggers a React re-render so the new values appear without a full page reload.
4. Shows a toast "Saved. Pages will redeploy in ~1 min."

## Component instrumentation

Every consumer component gets `data-content-path` (and `data-asset-folder` for images) on each editable element. **Existing JSX changes only — no new components.**

Per file:

### `Contact.jsx`
- `<dd>` for email, telegram, instagram entries, tiktok, location → 6 paths.

### `About.jsx`
- Bio paragraphs (each `line` in `bio.en` / `bio.ua` arrays).
- Experience entries: `title`, `role`, `subRole`, `date` (each as i18n object so popover shows EN+UA).
- Exhibition labels.
- Skill labels.

### `Projects.jsx`
- Project grid: tile labels (`category` is select-only, not editable inline; `id` not editable).
- Strip view: work names + descs + thumbs.
- Detail overlay: name, desc, prose, client, role, medium fields.
- Category cover backgrounds (currently inline-style `backgroundImage`) — opt-in: only the ones we want editable.

### `Canvas.jsx`
- Item titles, mediums, prices, image swaps.
- The currency picker is not content; skipped.

### `Social.jsx`
- Post images (`src`) per entry.
- Story images.
- Ad images + aspect (string, editable).
- Carousel cover + slides.

### Skipped (intentionally non-editable in v1)
- `Nav.jsx` brand text "MIKI / GTXHI" — could be promoted later.
- `Home.jsx` decorative elements.
- `Animation.jsx`, `tweaks-panel.jsx`, `Checkout.jsx` UI — not content.

## File layout

```
editor/
├── editor.jsx              # toolbar, mode toggle, pending-changes state, event wiring
├── editor-popover.jsx      # text popover component + i18n object editor
├── editor-image.jsx        # image upload modal
├── editor-paths.jsx        # getByPath, setByPath, isImagePath utilities
├── editor-github.jsx       # git data API client (atomic commit)
├── editor-bootstrap.js     # plain JS, runs immediately, conditionally injects the .jsx
└── editor.css              # outline/icon/toolbar styles
```

`index.html` change: add a single inline `<script src="editor/editor-bootstrap.js">` after the existing content loader. The bootstrap script reads localStorage, decides whether to inject the editor scripts.

## Code splitting

The "if logged in, load editor" check happens in `editor-bootstrap.js`:

```js
(function () {
  const KEY_PATTERN = /^(decap-cms|netlify-cms)\.user$/;
  let token = null;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (KEY_PATTERN.test(k)) {
      try {
        const u = JSON.parse(localStorage.getItem(k));
        if (u && u.token) { token = u.token; break; }
      } catch (_) {}
    }
  }
  if (!token) return;
  window.__EDITOR_TOKEN = token;
  // Inject editor scripts — Babel-standalone observes new <script type="text/babel"> additions
  // and processes them, just like the existing component scripts.
  const files = ['editor/editor-paths.jsx', 'editor/editor-github.jsx',
                 'editor/editor-popover.jsx', 'editor/editor-image.jsx',
                 'editor/editor.jsx'];
  for (const src of files) {
    const s = document.createElement('script');
    s.type = 'text/babel';
    s.src = src;
    document.body.appendChild(s);
  }
})();
```

Anonymous visitors hit the early return on line 11 and download nothing else.

## Security considerations

- **Token in `localStorage`**: an XSS bug anywhere on the site would let an attacker steal it. Today this is no worse than running `/admin/` (Decap already uses localStorage). We're not creating a new exposure; we're reading what's already there.
- **No client-side validation of edits**: an attacker who controls the editor (via XSS) could commit arbitrary content. Same threat surface as the existing Decap admin — both rely on the in-browser code path being uncompromised. Mitigation: keep CSP and the SRI hash on the Decap CDN script (already in place).
- **Image upload size**: client-side check (reject > 5 MB) so a bad file doesn't try to base64 itself into oblivion. GitHub's own limit is 100 MB per file but the API rejects > ~50 MB blobs; 5 MB is a sensible client cap.
- **MIME-type spoofing**: we check the `File` object's `type` plus the extension. Renaming a `.exe` to `.png` is fine — we only ever serve files at their committed path via Pages, and Pages serves with the path's MIME, so a malicious upload at `nope.png` would render as a broken image, not execute.

## Open decisions

- **Decap localStorage key name**: I assumed `decap-cms.user` and `netlify-cms.user` based on Decap's source. The bootstrap script tries both. If neither matches the actual key our Decap instance uses, the editor never loads — Phase 1's first task verifies this empirically before building anything else.
- **Image path filename suggestion strategy**: for "swap image", default to **overwriting** the existing file (same filename). The user can rename in the modal. Rationale: the existing path is referenced in `content.json`; overwriting keeps the JSON unchanged, only the binary file in the commit differs.
- **For new images (no existing value)**: suggest `<slug-of-title-or-name>.<ext>`. If a path with that name already exists, suffix with `-2`, `-3`, etc.

## Out of scope

- Adding new items to arrays (projects, works, posts, etc.) — admin only.
- Removing items — admin only.
- Reordering — admin only.
- Editing category labels (`CAT_UA` map in JSX) — code change.
- Editing the `oauth-proxy/` Worker via inline editor.
- Service-worker / offline support.
- Multi-tab sync of pending changes.

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Babel-standalone doesn't process dynamically-added script tags | low | Decap also dynamically loads things; this is a documented Babel-standalone feature. Phase 1 verifies before building further. |
| Decap stores token under a different key than expected | medium | Bootstrap tries the two known patterns; Phase 1's first task is "log in once and run a console snippet to confirm the key." If none match, add it to the pattern. |
| User clicks an inline element while popover is open | low | Popover absorbs clicks; outside-click closes the popover without saving. |
| User leaves the page with unsaved changes | medium | `beforeunload` warning if pending changes exist (standard browser confirm). |
| Concurrent commits (someone else edits via admin) | low | The 422-fast-forward retry/force-overwrite UX handles this. |
| Image upload exceeds GitHub blob size | low | Client-side 5 MB cap; show friendly error. |
| Browser cache serves stale `content.json` after save | medium | `cache: 'no-cache'` on the fetch is already in place. After save, the editor refetches and replaces `window.CONTENT` in memory, so the user sees their edit without waiting for Pages. |
| Inline edit while logged out (token expired silently) | medium | First save attempt returns 401; editor shows "session expired, re-login at /admin/" and disables Save until token is refreshed (page reload after re-login). |

## Implementation phases

Four phases, each independently deployable:

1. **Foundation** (~150 lines): `editor-bootstrap.js`, `editor-paths.jsx`, `editor-github.jsx`. Token detection + git data API client + path utilities. No UI yet; verified via console tests.
2. **Text editing** (~250 lines): `editor.jsx`, `editor-popover.jsx`, `editor.css`. Instrument `About.jsx` + `Contact.jsx` (smallest text-only surfaces). End-to-end test: edit email, save, see commit.
3. **Image editing** (~250 lines): `editor-image.jsx`. Instrument `Canvas.jsx` (10 items, easy to verify). End-to-end test: upload a new image for `recovery`, save, see image + commit.
4. **Roll out** (~100 lines): Instrument `Projects.jsx` (works) + `Social.jsx` (posts/carousels/stories/ads). No new code, just attribute annotations.

Total estimated size: ~750 lines of new code + ~200 lines of `data-content-path` annotations across existing files.

## Success criteria

- A logged-in user can change the contact email via the live site, save, and within 2 minutes the change is on the deployed site as a single git commit.
- A logged-in user can upload a replacement image for the canvas `recovery` piece, save, and within 2 minutes the new image is served and `content.json` reflects the (possibly-renamed) path.
- An anonymous visitor downloads zero extra bytes related to the editor.
- All Save operations produce exactly one commit each (verified via `git log`).
- Concurrent edits don't silently overwrite each other (the conflict modal appears on a forced-write scenario).
