# Hide-Instead-of-Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the artist hide list items from the public site (and unhide them later) instead of deleting them, per the approved spec at `docs/superpowers/specs/2026-06-12-hide-items-design.md`.

**Architecture:** Optional `hidden: true` flag on items of the editable lists. A `window.visibleEntries(list)` helper returns `{item, srcIdx}` pairs — all items in edit mode, non-hidden otherwise — and every list render maps over it, using `srcIdx` (the content.json index) for all editor path attributes. The inline editor gets a `toggle-hide` action that flips the flag in `window.CONTENT` immediately (re-render via the existing `miki-content-changed` event) and queues a pending text change at `<list>.<idx>.hidden` for the commit.

**Tech Stack:** No build step — babel-standalone compiles JSX in the browser; React 18; plain `<link>`-loaded editor CSS. No test framework: each task is verified in a real browser via the recipe below.

---

## Preflight (read before Task 1)

**⚠ Foreign in-progress work in the tree.** The working tree contains uncommitted, half-wired "edit details" feature code (a `DETAIL_SCHEMAS` constant, an `EditDetailsModal` component and `detailsModal` state in `editor/editor.jsx`; an `✎ edit details` button in `Projects.jsx`; `.editor-edit-action` rules in `editor/editor.css`). **Do not revert, finish, or commit any of it.**

- Before each commit, run `git diff --cached` and confirm the staged hunks are ONLY the ones this plan wrote. If a shared file (editor.jsx, Projects.jsx, editor.css) contains foreign hunks, `git add -p <file>` and stage only your hunks. If that proves impossible, STOP and ask the user how to proceed.
- Do **not** `git push` anywhere in this plan. Pushing is a separate decision the user makes at the end (the tree contains unfinished foreign work and the repo deploys from main).

**Browser verification recipe** (used by every task; "VERIFY-SETUP" below refers to this):

1. `python3 -m http.server 8742` from the repo root (background).
2. Open `http://localhost:8742/` in the Playwright browser.
3. `localStorage.setItem('decap-cms.user', JSON.stringify({ token: 'fake' }))`, then `location.reload()` — a **full reload is required**; hash-only navigation does not re-run the editor bootstrap. Accept any `beforeunload` dialog.
4. Wait until `window.__editor && window.__editor.github && document.querySelector('.editor-toolbar')` (poll ~250 ms, ≤10 s).
5. Mock the save: `window.__editor.github.saveAtomic = async (payload, message) => { window.__SAVED = { payload, message }; };` and auto-accept confirms: `window.confirm = () => true;`.
6. Enter edit mode: `document.querySelector('.editor-toolbar button').click()`.
7. After EVERY change to a source file, `location.reload()` and redo steps 4–6 (babel recompiles on load; the saveAtomic mock and edit-mode state do not survive reloads).

---

### Task 1: Visibility globals in i18n.jsx

**Files:**
- Modify: `i18n.jsx` (after the `window.uiKeysBlocked` block)

- [ ] **Step 1: Add the globals**

In `i18n.jsx`, directly after the closing `};` of `window.uiKeysBlocked`, insert:

```js

  // ── Hidden-item support ────────────────────────────────────────────
  // Items in editable lists may carry `hidden: true` (set by the inline
  // editor). The public site filters them out; edit mode renders everything.
  // The editor sets window.__EDIT_MODE and dispatches miki-content-changed
  // when toggling, so filtered views re-render.
  window.isEditMode = () => window.__EDIT_MODE === true;

  // Maps a content list to the entries a view should render, as
  // [{ item, srcIdx }]. srcIdx is the index in the SOURCE array — every
  // data-content-path / reorder / delete / hide attribute must use it,
  // never the position in the returned array.
  window.visibleEntries = (list) => {
    const out = [];
    (list || []).forEach((item, srcIdx) => {
      if (window.isEditMode() || !item || !item.hidden) out.push({ item, srcIdx });
    });
    return out;
  };
```

- [ ] **Step 2: Verify in the browser**

Do VERIFY-SETUP steps 1–4 (no edit mode needed), then evaluate:

```js
(() => {
  const sample = [{ n: 'a' }, { n: 'b', hidden: true }, { n: 'c' }];
  const pub = window.visibleEntries(sample).map(e => e.srcIdx);
  window.__EDIT_MODE = true;
  const edit = window.visibleEntries(sample).map(e => e.srcIdx);
  window.__EDIT_MODE = false;
  return { pub, edit, empty: window.visibleEntries(null) };
})()
```

Expected: `{ pub: [0, 2], edit: [0, 1, 2], empty: [] }`. Also confirm zero console errors on load.

- [ ] **Step 3: Commit**

```bash
git add i18n.jsx
git diff --cached   # only the block above
git commit -m "feat(editor): visibleEntries/isEditMode globals for hidden items"
```

---

### Task 2: Editor — edit-mode signal + toggle-hide action

**Files:**
- Modify: `editor/editor.jsx` (three edits inside `EditorRoot`)

- [ ] **Step 1: Broadcast edit-mode toggles**

Replace:

```js
    // Toggle the body class so CSS rules activate.
    React.useEffect(() => {
      document.body.classList.toggle('editor-mode-on', editMode);
      return () => document.body.classList.remove('editor-mode-on');
    }, [editMode]);
```

with:

```js
    // Toggle the body class so CSS rules activate, and tell the app —
    // hidden items render only in edit mode, so filtered views must
    // re-read window.visibleEntries.
    React.useEffect(() => {
      document.body.classList.toggle('editor-mode-on', editMode);
      window.__EDIT_MODE = editMode;
      window.dispatchEvent(new Event('miki-content-changed'));
      return () => {
        document.body.classList.remove('editor-mode-on');
        window.__EDIT_MODE = false;
      };
    }, [editMode]);
```

- [ ] **Step 2: Add applyHideToggle**

Directly after the `applyDeleteChange` callback (search for `const applyDeleteChange` and insert after its closing `}, []);`):

```js

    // Toggle `hidden` on a list item. Applied to window.CONTENT immediately
    // (reorder precedent — index-addressed views re-render from content),
    // plus a queued text change that carries the flag into the commit.
    // Toggling back before saving removes the queued change — net zero.
    const applyHideToggle = React.useCallback((listPath, index) => {
      const path = `${listPath}.${index}.hidden`;
      const hide = !getByPath(window.CONTENT, path);
      window.CONTENT = setByPath(window.CONTENT, path, hide);
      setPending((prev) => {
        const next = new Map(prev);
        if (prev.has(path)) next.delete(path);
        else next.set(path, { type: 'text', value: hide });
        return next;
      });
      window.dispatchEvent(new Event('miki-content-changed'));
    }, []);
```

- [ ] **Step 3: Add the click branch**

Inside the click-capture handler, directly BEFORE the line `if (el.dataset.editorAction === 'delete-item') {`, insert:

```js
        if (el.dataset.editorAction === 'toggle-hide') {
          const listPath = el.dataset.editorListPath;
          const index = parseInt(el.dataset.editorListIndex, 10);
          if (!Number.isNaN(index)) applyHideToggle(listPath, index);
          return;
        }
```

(The capture effect's dependency array `[editMode, pending]` stays unchanged — `applyHideToggle` has stable identity.)

- [ ] **Step 4: Verify in the browser**

VERIFY-SETUP 1–6, then evaluate:

```js
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const before = window.__EDIT_MODE;
  // applyHideToggle is internal — exercise it via a synthetic button.
  const btn = document.createElement('button');
  btn.dataset.editorAction = 'toggle-hide';
  btn.dataset.editorListPath = 'projects.1.works';
  btn.dataset.editorListIndex = '0';
  document.body.appendChild(btn);
  btn.click();
  await sleep(100);
  const afterHide = window.CONTENT.projects[1].works[0].hidden;
  const status1 = document.querySelector('.editor-toolbar-status').textContent;
  btn.click();
  await sleep(100);
  const afterUnhide = window.CONTENT.projects[1].works[0].hidden;
  const status2 = document.querySelector('.editor-toolbar-status').textContent;
  btn.remove();
  return { editModeFlag: before, afterHide, status1, afterUnhide, status2 };
})()
```

Expected: `{ editModeFlag: true, afterHide: true, status1: "1 change(s)", afterUnhide: false, status2: "no changes" }`.

- [ ] **Step 5: Commit (selective — file contains foreign edit-details hunks)**

```bash
git add -p editor/editor.jsx   # stage ONLY the three hunks above
git diff --cached              # confirm: no DETAIL_SCHEMAS / EditDetailsModal hunks
git commit -m "feat(editor): toggle-hide action + edit-mode broadcast"
```

---

### Task 3: Hide-button and hidden-item styles

**Files:**
- Modify: `editor/editor.css` (append at end of file)

- [ ] **Step 1: Append the styles**

```css

/* Hide/unhide affordances: visible only in edit mode. Mirrors the delete
   action but in neutral grey — hiding is reversible. */
.editor-hide-action {
  display: none;
}
body.editor-mode-on .editor-hide-action {
  display: inline-block;
  background: transparent;
  color: #555;
  border: 1.5px dashed #555;
  padding: 6px 10px;
  margin-top: 6px;
  margin-left: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s;
}
body.editor-mode-on .editor-hide-action:hover {
  opacity: 1;
  background: rgba(85, 85, 85, 0.08);
}

/* Per-item corner badge — sits LEFT of the delete × (which is at right: 4px). */
.editor-hide-action--corner { display: none; }
body.editor-mode-on .editor-hide-action--corner {
  display: flex;
  position: absolute;
  top: 4px;
  right: 32px;
  z-index: 10;
  width: 22px;
  height: 22px;
  margin: 0;
  padding: 0;
  align-items: center;
  justify-content: center;
  background: rgba(85, 85, 85, 0.85);
  color: #fff;
  border: none;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
body.editor-mode-on .editor-hide-action--corner:hover {
  background: #555;
}

/* Hidden items (hidden: true in content.json) render only in edit mode —
   greyed, dashed red outline, "hidden" badge. Keep this AFTER the dirty-dot
   rule so the badge wins when an element is both dirty and hidden. */
body.editor-mode-on [data-item-hidden="true"] {
  position: relative;
  opacity: 0.4;
  outline: 1px dashed #c00 !important;
}
body.editor-mode-on [data-item-hidden="true"]::before {
  content: 'hidden';
  position: absolute;
  top: 4px;
  left: 4px;
  width: auto;
  height: auto;
  background: #c00;
  color: #fff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  line-height: 1.4;
  padding: 1px 5px;
  border-radius: 2px;
  z-index: 4;
}
```

- [ ] **Step 2: Verify**

Reload the browser page; no visual change yet (no markup uses the classes). Confirm no console errors and that `getComputedStyle` resolves: evaluate `(() => { const d = document.createElement('div'); d.className = 'editor-hide-action'; document.body.appendChild(d); const r = getComputedStyle(d).display; d.remove(); return r; })()` → `"none"` (not in edit mode) — proves the stylesheet parsed.

- [ ] **Step 3: Commit (selective if editor.css contains foreign `.editor-edit-action` hunks)**

```bash
git add -p editor/editor.css   # stage only the appended block
git diff --cached
git commit -m "feat(editor): hide-action button + hidden-item styles"
```

---

### Task 4: Projects — works strip, detail navigation, deep links

**Files:**
- Modify: `Projects.jsx` (CategoryStrip)
- Modify: `App.jsx` (`stepWithinWorks`, `parseHash`)

- [ ] **Step 1: CategoryStrip — entries pool**

Replace:

```js
  const works = category.works || [];
  const [i, setI] = React.useState(0);
  const [pulse, setPulse] = React.useState(false);
  const cur = works[i] || works[0];
```

with:

```js
  // Entries the strip shows: every work in edit mode, non-hidden otherwise.
  // `i` indexes into entries; entry.srcIdx is the index in content.json and
  // is what every editor path attribute must use.
  const entries = window.visibleEntries(category.works);
  const [i, setI] = React.useState(0);
  const [pulse, setPulse] = React.useState(false);
  // The pool shrinks when edit mode turns off — keep i in range.
  React.useEffect(() => {
    if (i >= entries.length && entries.length > 0) setI(0);
  }, [entries.length, i]);
  const curEntry = entries[i] || entries[0];
  const cur = curEntry && curEntry.item;
  const curSrcIdx = curEntry && curEntry.srcIdx;
```

- [ ] **Step 2: CategoryStrip — counts and window math**

In the `next` and `prev` callbacks, replace all four `works.length` with `entries.length` (also change both dependency arrays from `[works.length]` to `[entries.length]`). Replace the empty-state check `if (works.length === 0) {` with `if (entries.length === 0) {`. In the visible-window loop replace `order.push((i + off + works.length) % works.length);` with `order.push((i + off + entries.length) % entries.length);`.

- [ ] **Step 3: CategoryStrip — thumbs use srcIdx**

In the `order.map((idx, j) => {` body, replace:

```js
          const w = works[idx];
```

with:

```js
          const { item: w, srcIdx } = entries[idx];
```

then in that same body replace both occurrences of `works.${idx}.thumb` with `works.${srcIdx}.thumb` (the `thumbPath` const and the `data-content-path` attribute), replace `data-editor-reorder-index={idx}` with `data-editor-reorder-index={srcIdx}`, add `data-item-hidden={w && w.hidden ? 'true' : undefined}` directly after the `data-editor-reorder-index` line, and in the `onClick` replace `workIndex: i` with `workIndex: curSrcIdx`.

- [ ] **Step 4: CategoryStrip — meta block uses srcIdx + hide button**

In the cat-meta IIFE, replace:

```js
        const base = `projects.${catIdx}.works.${i}`;
```

with:

```js
        const base = `projects.${catIdx}.works.${curSrcIdx}`;
```

Replace the cat-meta opening tag `<div className="cat-meta" key={cur.name}>` with:

```jsx
          <div className="cat-meta" key={cur.name} data-item-hidden={cur && cur.hidden ? 'true' : undefined}>
```

In the delete button, replace `data-editor-list-index={i}` with `data-editor-list-index={curSrcIdx}`. Then directly AFTER the delete button's closing `>× delete this work</button>`, add:

```jsx
            <button
              type="button"
              className="editor-hide-action"
              data-editor-action="toggle-hide"
              data-editor-list-path={`projects.${catIdx}.works`}
              data-editor-list-index={curSrcIdx}
            >{cur && cur.hidden ? '◉ unhide this work' : '⊘ hide this work'}</button>
```

- [ ] **Step 5: App.jsx — stepWithinWorks skips hidden works**

Replace:

```js
  const stepWithinWorks = (delta) => {
    const category = window.ALL_PROJECTS.find((p) => p.id === detailProject.id);
    const works = (category && category.works) || [];
    if (!works.length) return;
    const nextIdx = (detailProject.workIndex + delta + works.length) % works.length;
    const w = works[nextIdx];
    setDetailProject({ ...category, name: w.name, desc: w.desc, thumb: w.thumb, prose: category.prose, workIndex: nextIdx });
  };
```

with:

```js
  const stepWithinWorks = (delta) => {
    const category = window.ALL_PROJECTS.find((p) => p.id === detailProject.id);
    const entries = window.visibleEntries((category && category.works) || []);
    if (!entries.length) return;
    const pos = entries.findIndex((e) => e.srcIdx === detailProject.workIndex);
    const nextPos = ((pos < 0 ? 0 : pos) + delta + entries.length) % entries.length;
    const { item: w, srcIdx } = entries[nextPos];
    setDetailProject({ ...category, name: w.name, desc: w.desc, thumb: w.thumb, prose: category.prose, workIndex: srcIdx });
  };
```

- [ ] **Step 6: App.jsx — deep links to hidden works fall back**

In `parseHash`, replace:

```js
  const wIdx = parseInt(parts[2], 10);
  const works = cat.works || [];
  if (Number.isNaN(wIdx) || wIdx < 0 || wIdx >= works.length) {
```

with:

```js
  const wIdx = parseInt(parts[2], 10);
  const works = cat.works || [];
  const hiddenTarget = works[wIdx] && works[wIdx].hidden && !(window.isEditMode && window.isEditMode());
  if (Number.isNaN(wIdx) || wIdx < 0 || wIdx >= works.length || hiddenTarget) {
```

- [ ] **Step 7: Verify in the browser**

VERIFY-SETUP, navigate to `#/projects/02` (full reload), enter edit mode, then evaluate:

```js
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const out = {};
  // hide the centered work (source index 0)
  document.querySelector('.editor-hide-action').click();
  await sleep(200);
  out.hiddenMarked = document.querySelector('.cat-meta').dataset.itemHidden;
  out.buttonLabel = document.querySelector('.editor-hide-action').textContent;
  out.pending = document.querySelector('.editor-toolbar-status').textContent;
  out.thumbCount = document.querySelectorAll('.cat-thumb').length;
  // leave edit mode → strip must drop the hidden work
  document.querySelector('.editor-toolbar button').click();
  await sleep(200);
  out.nameAfterEditOff = document.querySelector('.cat-name').textContent;
  out.pathAfterEditOff = document.querySelector('.cat-name').dataset.contentPath;
  return out;
})()
```

Expected: `hiddenMarked: "true"`, `buttonLabel: "◉ unhide this work"`, `pending: "1 change(s)"`, `thumbCount: 7`; after leaving edit mode the strip centers a DIFFERENT work — `nameAfterEditOff: "lovers"` and `pathAfterEditOff: "projects.1.works.1.name"` (work 0 is skipped).

Then verify detail navigation skips it: still outside edit mode, evaluate:

```js
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  document.querySelector('.cat-thumb--active').click(); // open detail of visible work
  await sleep(300);
  const seen = [];
  for (let k = 0; k < 7; k++) {
    seen.push(document.querySelector('.detail-title').textContent);
    [...document.querySelectorAll('.detail-nav button')].find(b => b.textContent.includes('next')).click();
    await sleep(150);
  }
  return { seen, skipsHidden: !seen.includes(window.CONTENT.projects[1].works[0].name) };
})()
```

Expected: `skipsHidden: true` and `seen` cycles through the 6 visible works only. Finally re-enter edit mode, click `◉ unhide this work` (after navigating the strip back to the hidden work), confirm toolbar returns to `no changes`.

- [ ] **Step 8: Commit (selective — Projects.jsx contains the foreign edit-details button hunk only if you touched that region; keep it unstaged if not yours)**

```bash
git add -p Projects.jsx App.jsx
git diff --cached
git commit -m "feat(projects): hide/unhide works — strip, detail nav, deep links"
```

---

### Task 5: Animation strip

**Files:**
- Modify: `Animation.jsx` (AnimationStrip)

- [ ] **Step 1: Filter the pool**

Replace:

```js
  const looped = React.useMemo(() => {
    const withSrc = ANIMATION_WORKS.map((w, srcIdx) => ({ ...w, _srcIdx: srcIdx }));
    return [...withSrc, ...withSrc, ...withSrc];
  }, [ANIMATION_WORKS]);
  const baseLen = ANIMATION_WORKS.length;
```

with:

```js
  // window.isEditMode() is a memo input: toggling edit mode re-renders (via
  // miki-content-changed) without replacing ANIMATION_WORKS, and hidden
  // entries must appear/disappear.
  const entries = window.visibleEntries(ANIMATION_WORKS);
  const looped = React.useMemo(() => {
    const withSrc = entries.map(({ item, srcIdx }) => ({ ...item, _srcIdx: srcIdx }));
    return [...withSrc, ...withSrc, ...withSrc];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ANIMATION_WORKS, window.isEditMode()]);
  const baseLen = entries.length;
```

Replace the empty check `{ANIMATION_WORKS.length === 0 && <EmptyState />}` with `{entries.length === 0 && <EmptyState />}`.

- [ ] **Step 2: Mark hidden thumbs + hide badge**

On the `anim-thumb` button, directly after `data-editor-reorder-index={w._srcIdx}`, add:

```jsx
              data-item-hidden={w.hidden ? 'true' : undefined}
```

Directly after the delete `<span className="editor-delete-action editor-delete-action--corner" …>×</span>`, add:

```jsx
              <span
                className="editor-hide-action editor-hide-action--corner"
                data-editor-action="toggle-hide"
                data-editor-list-path="animations"
                data-editor-list-index={w._srcIdx}
              >{w.hidden ? '◉' : '⊘'}</span>
```

- [ ] **Step 3: Verify in the browser**

VERIFY-SETUP, navigate to `#/projects/01` (full reload), edit mode on, evaluate:

```js
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const before = document.querySelectorAll('.anim-thumb').length; // 3 × N
  document.querySelector('.editor-hide-action--corner').click();
  await sleep(200);
  const hiddenMarked = document.querySelectorAll('[data-item-hidden="true"].anim-thumb').length;
  document.querySelector('.editor-toolbar button').click(); // edit off
  await sleep(200);
  const after = document.querySelectorAll('.anim-thumb').length;
  document.querySelector('.editor-toolbar button').click(); // edit back on
  await sleep(200);
  document.querySelector('[data-item-hidden="true"] .editor-hide-action--corner').click(); // unhide
  await sleep(200);
  return { before, hiddenMarked, after, status: document.querySelector('.editor-toolbar-status').textContent };
})()
```

Expected: `before: 21` (7 animations × 3 copies), `hiddenMarked: 3` (the same source item in all 3 copies), `after: 18` (6 × 3), `status: "no changes"` (hide+unhide nets out).

- [ ] **Step 4: Commit**

```bash
git add Animation.jsx
git diff --cached
git commit -m "feat(animation): hide/unhide animations in the strip"
```

---

### Task 6: Canvas shop grid

**Files:**
- Modify: `Canvas.jsx`

- [ ] **Step 1: Filter the pool**

Replace `const ITEMS = window.CONTENT.canvas.items;` with:

```js
  const ENTRIES = window.visibleEntries(window.CONTENT.canvas.items);
```

Replace `{ITEMS.length === 0 && <EmptyState />}` with `{ENTRIES.length === 0 && <EmptyState />}` and the map opener `{ITEMS.map((it, idx) => {` with:

```js
          {ENTRIES.map(({ item: it, srcIdx: idx }) => {
```

(The body keeps using `it` and `idx` unchanged — `idx` is now the source index, which is exactly what every `canvas.items.${idx}.*` path needs.)

- [ ] **Step 2: Mark hidden items + hide badge**

On the `<article … className="prod"` element, after `data-editor-reorder-index={idx}`, add:

```jsx
                data-item-hidden={it.hidden ? 'true' : undefined}
```

Directly after the delete button (`…>×</button>` with `data-editor-list-path="canvas.items"`), add:

```jsx
                <button
                  type="button"
                  className="editor-hide-action editor-hide-action--corner"
                  data-editor-action="toggle-hide"
                  data-editor-list-path="canvas.items"
                  data-editor-list-index={idx}
                  aria-label={`hide ${it.title}`}
                >{it.hidden ? '◉' : '⊘'}</button>
```

- [ ] **Step 3: Verify in the browser**

VERIFY-SETUP, navigate to `#/canvas` (full reload), edit mode on, evaluate:

```js
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const before = document.querySelectorAll('.prod').length;
  document.querySelector('.prod .editor-hide-action--corner').click();
  await sleep(200);
  const marked = !!document.querySelector('.prod[data-item-hidden="true"]');
  document.querySelector('.editor-toolbar button').click();
  await sleep(200);
  const after = document.querySelectorAll('.prod').length;
  return { before, marked, after };
})()
```

Expected: `marked: true`, `after === before - 1`. Re-enter edit mode and unhide (status back to `no changes`).

- [ ] **Step 4: Commit**

```bash
git add Canvas.jsx
git diff --cached
git commit -m "feat(canvas): hide/unhide shop items"
```

---

### Task 7: Social galleries

**Files:**
- Modify: `Social.jsx` (buildWorkItems, StoriesSection, AdsSection, WorkSection, GalleryStrip)

- [ ] **Step 1: buildWorkItems — filter posts, mark hideable**

Replace the posts loop:

```js
  posts.forEach((p, i) => {
    out.push({
      ...p,
      _editPath: `social.posts.${i}.src`,
      _listPath: 'social.posts',
      _listIdx: i,
      _label: p.brand || `post ${i + 1}`,
    });
  });
```

with:

```js
  window.visibleEntries(posts).forEach(({ item: p, srcIdx: i }) => {
    out.push({
      ...p,
      _editPath: `social.posts.${i}.src`,
      _listPath: 'social.posts',
      _listIdx: i,
      _label: p.brand || `post ${i + 1}`,
      _hideable: true,
    });
  });
```

(Carousel covers/slides stay as they are: slides are plain strings and carry no `hidden` flag — they keep delete only, mirroring the existing "no delete for covers" scoping.)

- [ ] **Step 2: WorkSection — memo must react to edit-mode toggles**

Replace:

```js
  const workItems = React.useMemo(() => buildWorkItems(s.posts, s.carousels), [s]);
```

with:

```js
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const workItems = React.useMemo(() => buildWorkItems(s.posts, s.carousels), [s, window.isEditMode()]);
```

- [ ] **Step 3: StoriesSection and AdsSection — filtered pools with per-item metadata**

In `StoriesSection`, replace `const STORIES = window.CONTENT.social.stories;` with:

```js
  const STORIES = window.visibleEntries(window.CONTENT.social.stories).map(({ item, srcIdx }) => ({
    ...item,
    _editPath: `social.stories.${srcIdx}.src`,
    _listPath: 'social.stories',
    _listIdx: srcIdx,
    _label: item.brand || `story ${srcIdx + 1}`,
    _hideable: true,
  }));
```

In `AdsSection`, replace `const ADS = window.CONTENT.social.ads;` with the same block, substituting `ads` for `stories` everywhere (`window.CONTENT.social.ads`, `social.ads.${srcIdx}.src`, `'social.ads'`, `` `ad ${srcIdx + 1}` ``) and assigning to `ADS`.

(The `pathBase` props on these two `GalleryStrip` usages become dead fallbacks — leave them; per-item `_editPath`/`_listPath` now always win.)

- [ ] **Step 4: GalleryStrip — hidden marker + hide badge**

On the gallery tile `<button … {...tileProps}`, after the reorder spread `{...(listPath ? {…} : {})}`, add:

```jsx
                {...(item.hidden ? { 'data-item-hidden': 'true' } : {})}
```

Directly after the delete `<span className="editor-delete-action editor-delete-action--corner" …>×</span>` block (inside the same `{listPath && (…)}` pattern), add:

```jsx
                {listPath && item._hideable && (
                  <span
                    className="editor-hide-action editor-hide-action--corner"
                    data-editor-action="toggle-hide"
                    data-editor-list-path={listPath}
                    data-editor-list-index={listIdx}
                  >{item.hidden ? '◉' : '⊘'}</span>
                )}
```

- [ ] **Step 5: Verify in the browser**

VERIFY-SETUP, navigate to `#/projects/07` (full reload), edit mode on, evaluate:

```js
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const tile = document.querySelector('.sm2-gal-tile .editor-hide-action--corner');
  if (!tile) return { error: 'no hide badge found' };
  tile.click();
  await sleep(250);
  const marked = !!document.querySelector('.sm2-gal-tile[data-item-hidden="true"]');
  const status = document.querySelector('.editor-toolbar-status').textContent;
  document.querySelector('.editor-toolbar button').click(); // edit off
  await sleep(250);
  const stillMarked = !!document.querySelector('.sm2-gal-tile[data-item-hidden="true"]');
  document.querySelector('.editor-toolbar button').click(); // edit on
  await sleep(250);
  document.querySelector('.sm2-gal-tile[data-item-hidden="true"] .editor-hide-action--corner').click(); // unhide
  await sleep(250);
  return { marked, status, stillMarked, finalStatus: document.querySelector('.editor-toolbar-status').textContent };
})()
```

Expected: `marked: true`, `status: "1 change(s)"`, `stillMarked: false` (hidden tile left the pool outside edit mode), `finalStatus: "no changes"`. Also confirm carousel slides show NO hide badge (only ×): `document.querySelectorAll('.sm2-gal-tile .editor-hide-action--corner').length` must be smaller than `document.querySelectorAll('.sm2-gal-tile .editor-delete-action--corner').length` when carousel slides are in view.

- [ ] **Step 6: Commit**

```bash
git add Social.jsx
git diff --cached
git commit -m "feat(social): hide/unhide posts, stories, ads"
```

---

### Task 8: About lists

**Files:**
- Modify: `About.jsx` (three list renders)

- [ ] **Step 1: Experience**

Replace `{a.experience.map((e, i) => (` with:

```js
        {window.visibleEntries(a.experience).map(({ item: e, srcIdx: i }) => (
```

On the `exp-item` div, after `data-editor-reorder-index={i}`, add `data-item-hidden={e.hidden ? 'true' : undefined}`. Directly after the delete button `>×</button>`, add:

```jsx
            <button
              type="button"
              className="editor-hide-action editor-hide-action--corner"
              data-editor-action="toggle-hide"
              data-editor-list-path="about.experience"
              data-editor-list-index={i}
            >{e.hidden ? '◉' : '⊘'}</button>
```

- [ ] **Step 2: Exhibitions**

Replace `{a.exhibitions.map((x, i) => (` with:

```js
          {window.visibleEntries(a.exhibitions).map(({ item: x, srcIdx: i }) => (
```

On the exhibition wrapper div, after `data-editor-reorder-index={i}`, add `data-item-hidden={x.hidden ? 'true' : undefined}`. Directly after the delete button `>×</button>`, add:

```jsx
              <button
                type="button"
                className="editor-hide-action editor-hide-action--corner"
                data-editor-action="toggle-hide"
                data-editor-list-path="about.exhibitions"
                data-editor-list-index={i}
              >{x.hidden ? '◉' : '⊘'}</button>
```

- [ ] **Step 3: Skills**

Replace `{a.skills.map((s, i) => (` with:

```js
        {window.visibleEntries(a.skills).map(({ item: s, srcIdx: i }) => (
```

On the `skill` div, after `data-editor-reorder-index={i}`, add `data-item-hidden={s.hidden ? 'true' : undefined}`. Directly after the delete button `>×</button>`, add:

```jsx
            <button
              type="button"
              className="editor-hide-action editor-hide-action--corner"
              data-editor-action="toggle-hide"
              data-editor-list-path="about.skills"
              data-editor-list-index={i}
            >{s.hidden ? '◉' : '⊘'}</button>
```

- [ ] **Step 4: Verify in the browser**

VERIFY-SETUP, navigate to `#/about` (full reload), edit mode on, evaluate:

```js
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const before = document.querySelectorAll('.exp-item').length;
  document.querySelector('.exp-item .editor-hide-action--corner').click();
  await sleep(200);
  const marked = !!document.querySelector('.exp-item[data-item-hidden="true"]');
  document.querySelector('.editor-toolbar button').click();
  await sleep(200);
  const after = document.querySelectorAll('.exp-item').length;
  return { before, marked, after };
})()
```

Expected: `marked: true`, `after === before - 1`. Re-enter edit mode and unhide. Spot-check one exhibition and one skill the same way.

- [ ] **Step 5: Commit**

```bash
git add About.jsx
git diff --cached
git commit -m "feat(about): hide/unhide experience, exhibitions, skills"
```

---

### Task 9: End-to-end edge cases + save payload

**Files:** none (verification only; fixes go to the file that owns the bug)

- [ ] **Step 1: Save payload + hide/delete interaction**

VERIFY-SETUP, navigate to `#/projects/02` (full reload), edit mode on, evaluate:

```js
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  // hide centered work 0, delete work via the same session, then save
  document.querySelector('.editor-hide-action').click();           // hide src 0
  await sleep(200);
  document.querySelector('.cat-arrow--next').click();              // center next visible
  await sleep(200);
  document.querySelector('.editor-delete-action').click();         // delete it (confirm mocked)
  await sleep(200);
  [...document.querySelectorAll('.editor-toolbar button')].find(b => b.textContent.startsWith('save')).click();
  for (let k = 0; k < 30 && !window.__SAVED; k++) await sleep(50);
  const works = window.__SAVED.payload.contentJson.projects[1].works;
  return {
    messageLines: window.__SAVED.message.split('\n').slice(2),
    work0Hidden: works[0].hidden,
    count: works.length,
  };
})()
```

Expected: `work0Hidden: true`; `count` is one less than before; the message contains a `- DELETE projects.1.works[…]` line and a `- projects.1.works.0.hidden` line (the hide flag survives the delete remap because it targets a different, surviving item).

- [ ] **Step 2: Hide the deleted item variant**

Reload (auto after save — the mocked save still reloads), redo VERIFY-SETUP 4–6 on `#/projects/02`, then evaluate:

```js
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  delete window.__SAVED;
  document.querySelector('.editor-hide-action').click();    // hide centered work (src 0)
  await sleep(200);
  document.querySelector('.editor-delete-action').click();  // delete the SAME work
  await sleep(200);
  [...document.querySelectorAll('.editor-toolbar button')].find(b => b.textContent.startsWith('save')).click();
  for (let k = 0; k < 30 && !window.__SAVED; k++) await sleep(50);
  const works = window.__SAVED.payload.contentJson.projects[1].works;
  return {
    skipLine: window.__SAVED.message.includes('SKIP projects.1.works.0.hidden'),
    newFirstHidden: works[0].hidden,
  };
})()
```

Expected: `skipLine: true` and `newFirstHidden: undefined` — the item that shifted into index 0 did NOT inherit the dropped hide flag.

- [ ] **Step 3: All-hidden empty state + deep-link fallback**

Outside edit mode, with one work hidden via console:

```js
(async () => {
  // simulate all-hidden without saving:
  const c = JSON.parse(JSON.stringify(window.CONTENT));
  c.projects[1].works.forEach((w) => { w.hidden = true; });
  window.CONTENT = c;
  window.dispatchEvent(new Event('miki-content-changed'));
  await new Promise(r => setTimeout(r, 300));
  const empty = !!document.querySelector('.empty-state');
  location.hash = '#/projects/02/0';
  await new Promise(r => setTimeout(r, 300));
  return { empty, fellBack: location.hash === '#/projects/02' || !document.querySelector('.detail-scrim') };
})()
```

Expected: `{ empty: true, fellBack: true }`. Reload afterwards to restore clean state.

- [ ] **Step 4: Final review**

Run `git log --oneline` — one commit per task (6 feature commits). Run `git status` — only the foreign edit-details hunks remain unstaged. Do NOT push; report to the user and let them decide.
