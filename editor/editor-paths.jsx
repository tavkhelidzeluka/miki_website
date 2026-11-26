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

// Three-way merge for content.json.
//   base   — content as it was when this page loaded
//   mine   — base + this session's edits
//   latest — content.json at the current head of the branch
// Re-applies only what this session changed (leaf by leaf) on top of
// `latest`, so commits made since the page loaded (another tab, a direct
// push, the deploy lagging behind GitHub) are kept instead of overwritten.
// Items appended to a list are appended to latest's list; a list that
// shrank (items deleted here) is taken from `mine` as a whole.
window.__editor.mergeContent = function (base, mine, latest) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const ops = [];
  (function walk(b, m, path) {
    if (same(b, m)) return;
    if (isObj(b) && isObj(m)) {
      for (const k of new Set([...Object.keys(b), ...Object.keys(m)])) {
        const p = path.concat(k);
        if (!(k in m)) ops.push({ path: p, del: true });
        else if (!(k in b)) ops.push({ path: p, value: m[k] });
        else walk(b[k], m[k], p);
      }
      return;
    }
    if (Array.isArray(b) && Array.isArray(m) && m.length >= b.length) {
      for (let i = 0; i < b.length; i++) walk(b[i], m[i], path.concat(i));
      for (let i = b.length; i < m.length; i++) ops.push({ path, append: m[i] });
      return;
    }
    ops.push({ path, value: m });
  })(base, mine, []);

  const out = JSON.parse(JSON.stringify(latest));
  for (const op of ops) {
    if (op.path.length === 0) return JSON.parse(JSON.stringify(mine));
    let cur = out;
    for (let i = 0; i < op.path.length - 1 && cur != null; i++) {
      const k = op.path[i];
      if (cur[k] == null && !op.del) cur[k] = typeof op.path[i + 1] === 'number' ? [] : {};
      cur = cur[k];
    }
    if (cur == null || typeof cur !== 'object') continue;
    const last = op.path[op.path.length - 1];
    if (op.del) {
      if (Array.isArray(cur)) cur.splice(last, 1); else delete cur[last];
    } else if ('append' in op) {
      if (!Array.isArray(cur[last])) cur[last] = [];
      cur[last].push(op.append);
    } else {
      cur[last] = op.value;
    }
  }
  return out;
};
