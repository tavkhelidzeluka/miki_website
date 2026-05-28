// Text-edit popover. Renders an absolutely-positioned panel anchored to an
// element. Supports single-line, multi-line, and i18n object editing.

window.__editor = window.__editor || {};

window.__editor.Popover = function Popover(props) {
  const { anchor, path, initialValue, onSave, onCancel } = props;
  const { isI18nObject } = window.__editor;
  const isI18n = isI18nObject(initialValue);
  const isLong =
    typeof initialValue === 'string' &&
    (initialValue.length > 60 || /[.!?]\s/.test(initialValue));

  const [val, setVal] = React.useState(initialValue);
  const popRef = React.useRef(null);

  // Anchor positioning: place below the anchor, clamped to viewport.
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  React.useEffect(() => {
    if (!anchor || !popRef.current) return;
    const rect = anchor.getBoundingClientRect();
    const popH = popRef.current.offsetHeight;
    const popW = popRef.current.offsetWidth;
    let top = rect.bottom + 6;
    let left = rect.left;
    if (top + popH > window.innerHeight - 8) {
      top = Math.max(8, rect.top - popH - 6);
    }
    if (left + popW > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popW - 8);
    }
    setPos({ top, left });
  }, [anchor]);

  // Outside-click closes (treated as cancel).
  React.useEffect(() => {
    const handle = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) {
        onCancel();
      }
    };
    // Defer adding the listener so the click that opened us doesn't immediately
    // close us.
    const t = setTimeout(() => window.addEventListener('mousedown', handle), 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousedown', handle);
    };
  }, [onCancel]);

  // Escape cancels, Cmd/Ctrl+Enter saves.
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onSave(val);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [val, onSave, onCancel]);

  const onSetEn = (e) => setVal({ ...val, en: e.target.value });
  const onSetUa = (e) => setVal({ ...val, ua: e.target.value });

  return (
    <div
      ref={popRef}
      className="editor-popover"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="editor-popover-label">{path}</div>
      {isI18n ? (
        <React.Fragment>
          <div className="editor-popover-label">EN</div>
          <textarea value={val.en} onChange={onSetEn} autoFocus />
          <div className="editor-popover-label">UA</div>
          <textarea value={val.ua} onChange={onSetUa} />
        </React.Fragment>
      ) : isLong ? (
        <textarea
          value={val || ''}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
        />
      ) : (
        <input
          type="text"
          value={val || ''}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
        />
      )}
      <div className="editor-popover-actions">
        <button data-variant="cancel" onClick={onCancel}>cancel</button>
        <button onClick={() => onSave(val)}>save</button>
      </div>
    </div>
  );
};
