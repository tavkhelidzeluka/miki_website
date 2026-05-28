// Utilities for content.json path manipulation and value type detection.
// Exposed on window.__editor (shared namespace for all editor modules).

window.__editor = window.__editor || {};

// Walks a dotted path into a JSON-like object. Segments matching /^\d+$/
// are treated as array indices; others as object keys.
window.__editor.getByPath = function (obj, path) {
  if (!path) return obj;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[/^\d+$/.test(p) ? Number(p) : p];
  }
  return cur;
};

// Returns a new object with `path` set to `value`. Does not mutate the input.
// Implemented via structured-clone semantics (JSON round-trip is fine for
// content.json — no functions, no Dates, no circular refs).
window.__editor.setByPath = function (obj, path, value) {
  const cloned = JSON.parse(JSON.stringify(obj));
  if (!path) return value;
  const parts = path.split('.');
  let cur = cloned;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    cur = cur[/^\d+$/.test(p) ? Number(p) : p];
  }
  const last = parts[parts.length - 1];
  cur[/^\d+$/.test(last) ? Number(last) : last] = value;
  return cloned;
};

// Looks like a path to an image asset.
window.__editor.isImagePath = function (value) {
  return typeof value === 'string' && /\.(jpg|jpeg|png|webp|gif)$/i.test(value);
};

// Looks like an i18n object — { en: "...", ua: "..." }.
window.__editor.isI18nObject = function (value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.en === 'string' &&
    typeof value.ua === 'string'
  );
};

// Convenience: derive the current i18n string for display, defaulting to EN.
window.__editor.i18nDisplay = function (value, lang) {
  if (!window.__editor.isI18nObject(value)) return value;
  const k = (lang || 'EN').toLowerCase();
  return value[k] !== undefined ? value[k] : value.en;
};
