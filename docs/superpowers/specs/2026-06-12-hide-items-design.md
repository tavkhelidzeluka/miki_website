# Hide-instead-of-delete for inline-editor list items

**Date:** 2026-06-12
**Status:** approved by owner (chat), pending implementation

## Purpose

The artist can currently only delete list items through the inline editor. Deleting
is destructive (the item leaves `content/content.json` and its image may become
orphaned). Add a **hide** toggle so items can be removed from the public site but
kept in the content file, and restored later with one click.

## Scope

Hide is available everywhere delete is available today — the ten editable lists:

| List path | Rendered in |
|---|---|
| `projects.<c>.works` | Projects category strip + detail overlay |
| `animations` | Animation strip + player |
| `canvas.items` | Canvas shop grid (+ cart/zoom) |
| `social.posts`, `social.stories`, `social.ads` | Social page sections |
| `about.experience`, `about.exhibitions`, `about.skills` | About page lists |

Hiding whole project categories is out of scope (they have no delete either).
Carousel slides (`social.carousels.<n>.slides`) keep delete only: slides are
plain strings in content.json and cannot carry a `hidden` flag.

## Data model

- Optional boolean `hidden` on any item of the lists above. Absent or `false` =
  visible. No migration; existing content is untouched until something is hidden.
- Unhide writes `hidden: false` (key stays — `setByPath` cannot delete keys, and a
  stale `false` is harmless).

## Visibility plumbing

New globals in `i18n.jsx` (loads before all components, exists for anonymous
visitors):

- `window.isEditMode()` — returns `window.__EDIT_MODE === true`. The editor sets
  `window.__EDIT_MODE` when edit mode toggles and dispatches the existing
  `miki-content-changed` event so the app re-renders (App already listens to it
  for reorders).
- `window.visibleEntries(list)` — returns `[{ item, srcIdx }, …]`: every entry in
  edit mode, only non-hidden entries otherwise. `srcIdx` is the index in the
  SOURCE array and is what all `data-content-path` / reorder / delete / hide
  attributes must use (the `_srcIdx` idiom Animation.jsx already follows).

## Render-site changes

Each list render maps over `visibleEntries(...)` instead of the raw array:

- **Projects:** `CategoryStrip` thumbs/window math and meta iterate visible works;
  `ProjectDetail` next/prev (`stepWithinWorks` in App.jsx) steps through visible
  works only. `workIndex` stays a SOURCE index everywhere. A public deep-link to a
  hidden work (`#/projects/02/3`) falls back to the category strip.
- **Animation:** extend the existing source-index mapping with the hidden filter;
  the player opens from strip items, so it only ever shows visible works (it has
  no next/prev of its own).
- **Canvas:** hidden items don't render, so they can't be zoomed or ordered.
  Items already sitting in a visitor's cart are left alone (edge case).
- **Social:** the four lists filter the same way.
- **About:** the three lists filter the same way.
- In edit mode all items render; hidden ones additionally get
  `data-item-hidden="true"` on the item root for styling.

## Editor UI and save flow

- A `hide` / `unhide` button (label reflects current state) next to every
  `× delete` button, using a new `data-editor-action="toggle-hide"` with the same
  `data-editor-list-path` / `data-editor-list-index` / `data-editor-item-label`
  attributes.
- Click behavior (drag-to-reorder precedent — instant feedback, committed on
  Save): the editor sets `<listPath>.<index>.hidden` in `window.CONTENT`
  immediately, dispatches `miki-content-changed`, and queues a pending **text**
  change at that path. Reusing the text type means the existing reorder remapping
  (`applyReorder`) and delete remapping (`remapAcrossDeletes`) apply to hide
  entries with no new code; hide-then-delete in one session resolves to delete
  (the pending hide is dropped with a SKIP note).
- At save, `setByPath` re-writes the flag (idempotent — content already reflects
  it). Discard reloads the page, reverting the in-memory flag.
- Edit-mode styling in `editor.css`: `body.editor-mode-on [data-item-hidden="true"]`
  gets ~0.35 opacity, a dashed outline, and a "hidden" text badge.

## Edge cases

- **All works in a category hidden:** visitors get the existing `EmptyState`
  (same path as all-deleted). Detail can't be opened from an empty strip.
- **Hide + delete same item, one session:** delete wins; the queued hide is
  dropped by `remapAcrossDeletes`.
- **Toggling edit mode with pending hides:** content flag is already applied
  in-memory, so leaving edit mode immediately previews the public result;
  re-entering shows the item greyed again.
- **Keyboard navigation** in detail/zoom already routes through the same
  next/prev functions, so it skips hidden items for free.

## Testing

Browser verification against a local server with `saveAtomic` mocked (established
recipe in project memory): hide a work → instant grey + pending count; toggle edit
mode off → item gone from strip and next/prev; save payload contains
`hidden: true` at the right path; unhide round-trip; hide+delete combo produces
delete only; spot-check one list each on Canvas, Social, About, Animation; empty-
category EmptyState; deep-link fallback.
