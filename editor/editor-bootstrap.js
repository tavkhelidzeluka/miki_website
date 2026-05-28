// Editor bootstrap — runs unconditionally on every page load.
// If a Decap CMS OAuth token is found in localStorage, dynamically loads the
// editor scripts (Babel observes new <script type="text/babel"> tags). For
// anonymous visitors, this early-returns and nothing else is downloaded.

(function () {
  // Try the two known patterns; extend if needed.
  const KEY_PATTERNS = [/^decap-cms\.user$/, /^netlify-cms\.user$/];

  function findToken() {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!KEY_PATTERNS.some((re) => re.test(k))) continue;
      try {
        const u = JSON.parse(localStorage.getItem(k));
        if (u && typeof u.token === 'string' && u.token.length > 0) {
          return u.token;
        }
      } catch (_) {
        // ignore parse errors
      }
    }
    return null;
  }

  const token = findToken();
  if (!token) return;

  window.__EDITOR_TOKEN = token;
  window.__EDITOR_REPO = {
    owner: 'tavkhelidzeluka',
    name: 'miki_website',
    branch: 'main',
  };

  // Load CSS first so styles are applied as soon as editor renders.
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'editor/editor.css';
  document.head.appendChild(link);

  // Inject editor scripts. Babel-standalone observes the DOM and processes
  // new <script type="text/babel"> elements. Order matters for window-global
  // dependencies (paths/github first, then UI components, then main runtime).
  const scripts = [
    'editor/editor-paths.jsx',
    'editor/editor-github.jsx',
    'editor/editor-popover.jsx',
    'editor/editor-image.jsx',
    'editor/editor.jsx',
  ];
  for (const src of scripts) {
    const s = document.createElement('script');
    s.type = 'text/babel';
    s.src = src;
    document.body.appendChild(s);
  }
})();
