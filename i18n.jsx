// i18n.jsx — lightweight language toggle (EN ⇄ UA).
// Global current-lang state; subscribers re-render via useLang().
// Russian artwork titles ("с котом" etc) stay as-is — they're proper names.
//
// Usage:
//   const { t, lang, setLang } = useLang();
//   <h1>{t({ en: "ABOUT ME", ua: "ПРО МЕНЕ" })}</h1>

(function () {
  const STORAGE_KEY = "miki.lang";

  let currentLang = "EN";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "EN" || saved === "UA") currentLang = saved;
  } catch (_) {}

  const listeners = new Set();

  window.getLang = () => currentLang;
  window.setLang = (lang) => {
    if (lang !== "EN" && lang !== "UA") return;
    if (lang === currentLang) return;
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
    listeners.forEach((fn) => fn());
  };

  function useLang() {
    const [, force] = React.useReducer((x) => x + 1, 0);
    React.useEffect(() => {
      listeners.add(force);
      return () => { listeners.delete(force); };
    }, []);
    const t = React.useCallback((obj) => {
      if (obj == null) return "";
      if (typeof obj === "string") return obj;
      const key = currentLang.toLowerCase();
      if (obj[key] !== undefined) return obj[key];
      if (obj.en !== undefined) return obj.en;
      return "";
    }, []);
    return { lang: currentLang, setLang: window.setLang, t };
  }

  window.useLang = useLang;

  // Shared empty-list placeholder. Rendered by any list view whose backing
  // array in content.json has no items, so the page never goes blank. The
  // hint line is CSS-gated to edit mode (body.editor-mode-on).
  function EmptyState() {
    const { t } = useLang();
    const ui = (window.CONTENT && window.CONTENT.ui) || {};
    return (
      <div className="empty-state">
        <div className="empty-state-msg">
          [ {t(ui.emptyState || { en: "nothing here yet", ua: "тут поки порожньо" })} ]
        </div>
        <div className="empty-state-hint">
          {t(ui.emptyStateHint || { en: "use the + add button to create the first item", ua: "натисніть + щоб додати перший елемент" })}
        </div>
      </div>
    );
  }
  window.EmptyState = EmptyState;
})();

