# Empty states + drag-to-reorder — design

Date: 2026-06-12. Branch: main.

## Problem

1. **White page when a list is emptied.** The artist deleted all works from
   POSTERS (`projects[2].works` is now `[]` on main) and the category page
   renders nothing. Root causes:
   - `Projects.jsx` `CategoryStrip`: `const cur = works[i] || works[0]` is
     `undefined` for an empty list; `key={cur.name}` / `cur.name` throw.
   - `Social.jsx` `GalleryStrip`: `at(off)` indexes `items[NaN]` when
     `N === 0`; `item._editPath` throws.
   - `Animation.jsx` / `Canvas.jsx`: no crash, but the page body is blank with
     no affordance or message.
   - No React error boundary anywhere — any render throw unmounts the whole
     tree (the literal white page).
2. **No way to reorder items.** Order is array order in `content.json`; the
   inline editor supports add/edit/delete but not move.

## Design

### Empty states

- Shared `.empty-state` block (bracket typography, dimmed) rendered by each
  list view when its list is empty. Copy from `ui.emptyState` /
  `ui.emptyStateHint` in content.json (with hardcoded fallbacks so missing
  keys can't crash). The hint line ("use + add …") is shown only in edit mode
  via CSS (`body.editor-mode-on`).
- `CategoryStrip`: when `works` is empty, keep the label block (id, category,
  "+ add work") and show the empty state instead of strip/arrows/meta. Guard
  `next`/`prev` against `% 0`.
- `GalleryStrip` (social): when `N === 0`, render `SectionHead` (count 00) +
  empty state; skip strip/arrows/zoom. Add buttons live in the parent
  sections and remain. `GalleryZoom` gets a defensive `if (!cur) return null`.
- `AnimationStrip`: empty list → empty state inside the strip area; the
  label + "+ add animation" button already persist.
- `Canvas`: empty grid → empty state; also adds the missing "+ add item"
  editor button (new `canvasItem` schema; the generic add modal gains a
  `number` field type so `price` stays numeric for currency conversion).
- `index.html`: `ErrorBoundary` class component wrapping `<App />` — shows a
  readable bracket-styled message + reload button instead of a white page.
- Empty-state CSS goes into the inline `<style data-source="styles.css">`
  block in `index.html` (canonical; `styles.css` on disk is a diverged
  legacy source and is intentionally untouched).

### Drag-to-reorder (edit mode only)

- Page components tag each reorderable item root with
  `data-editor-reorder-path` (the content.json list path) and
  `data-editor-reorder-index` (its index). Tagged: top-level projects grid,
  category works, animations, social posts / carousel slides / stories / ads,
  canvas items, about experience / exhibitions / skills. Carousel covers are
  not draggable (they represent a whole carousel, not a list item).
- `editor.jsx` adds delegated HTML5 DnD while edit mode is on:
  - `mousedown` sets `draggable=true` just-in-time on the item under the
    cursor (skipped when pressing the delete badge); cleared on dragend.
  - `dragover` only accepts targets with the **same list path** (cross-list
    drops are rejected by not calling `preventDefault`).
  - `drop` on item Y moves the dragged item to Y's list index (splice
    semantics), via `applyReorder(listPath, from, to)`.
- `applyReorder`:
  1. Rebuilds the list and replaces `window.CONTENT` immutably
     (`setByPath`), so render-time readers and `useMemo` deps see new refs.
  2. Remaps index-addressed state for that list: pending text/image change
     keys (`list.3.name` → follows the item), pending delete indices, and
     `content.imageDisplay` keys — using the standard from→to index map.
  3. Queues a `{type:'reorder'}` pending entry (enables Save, contributes a
     `- REORDER …` line and a `, N reordered` suffix to the commit message;
     content is already final at save time, so it's bookkeeping only).
  4. Dispatches `miki-content-changed`; `App.jsx` listens and force-rerenders
     so every view re-reads `window.CONTENT` (this also gives us a generic
     optimistic-update channel). Pending optimistic text/image previews are
     re-applied to the fresh DOM afterwards.
- Discard still works (it reloads the page, dropping the in-memory CONTENT
  mutation). The beforeunload guard already covers queued reorders.
- Mobile: editor chrome is hidden on touch; HTML5 DnD is desktop-only, which
  matches how the editor is actually used.

## Out of scope / known limitations

- Deleting an item still leaves `imageDisplay` keys for later indices
  pointing one slot off (pre-existing; reorder now handles its own remap).
- A queued *add* isn't draggable until saved (it only exists in the pending
  queue, not in CONTENT) — matches existing add behavior.
- Reordering while a category strip is open may visually change which work
  is "active" (local carousel index is positional). Harmless.
