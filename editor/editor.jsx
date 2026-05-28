// Inline editor main runtime. Mounts its own React root, renders the floating
// toolbar, captures clicks on editable elements, manages the pending-changes
// map, and triggers atomic saves.

window.__editor = window.__editor || {};

(function () {
  const { getByPath, setByPath, isI18nObject, i18nDisplay } = window.__editor;
  const { Popover } = window.__editor;
  const github = window.__editor.github;

  function EditorRoot() {
    const [editMode, setEditMode] = React.useState(false);
    // pending: Map<path, { type: 'text', value }>
    const [pending, setPending] = React.useState(new Map());
    const [popover, setPopover] = React.useState(null); // { anchor, path, initialValue }
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [toast, setToast] = React.useState(null);

    // Toggle the body class so CSS rules activate.
    React.useEffect(() => {
      document.body.classList.toggle('editor-mode-on', editMode);
      return () => document.body.classList.remove('editor-mode-on');
    }, [editMode]);

    // Capture clicks on [data-content-path] elements while in edit mode.
    React.useEffect(() => {
      if (!editMode) return;
      const handle = (e) => {
        let el = e.target;
        while (el && !el.dataset?.contentPath) el = el.parentElement;
        if (!el) return;
        // Only intercept if this is a text path (image handling is added in a
        // later phase).
        if (el.dataset.editorKind === 'image') return;
        e.preventDefault();
        e.stopPropagation();
        const path = el.dataset.contentPath;
        const current = pending.has(path)
          ? pending.get(path).value
          : getByPath(window.CONTENT, path);
        setPopover({ anchor: el, path, initialValue: current });
      };
      // Use capture so we run before the page's own click handlers.
      document.addEventListener('click', handle, true);
      return () => document.removeEventListener('click', handle, true);
    }, [editMode, pending]);

    const applyTextChange = React.useCallback((path, newValue) => {
      setPending((prev) => {
        const next = new Map(prev);
        next.set(path, { type: 'text', value: newValue });
        return next;
      });
      // Optimistic DOM update — show the new value immediately.
      const els = document.querySelectorAll(
        `[data-content-path="${CSS.escape(path)}"]`
      );
      const currentLang = (window.getLang && window.getLang()) || 'EN';
      els.forEach((el) => {
        const display = i18nDisplay(newValue, currentLang);
        if (display !== undefined && display !== null) {
          el.textContent = display;
        }
        el.dataset.editorDirty = 'true';
      });
    }, []);

    const discardAll = React.useCallback(() => {
      if (
        pending.size === 0 ||
        confirm(`Discard ${pending.size} unsaved change(s)?`)
      ) {
        window.location.reload();
      }
    }, [pending]);

    const saveAll = React.useCallback(async () => {
      if (pending.size === 0) return;
      setSaving(true);
      setError(null);
      try {
        let nextContent = window.CONTENT;
        const changedPaths = [];
        for (const [path, change] of pending.entries()) {
          nextContent = setByPath(nextContent, path, change.value);
          changedPaths.push(path);
        }
        const message =
          `edit(inline): ${changedPaths.length} text change(s)\n\n` +
          changedPaths.map((p) => `- ${p}`).join('\n');
        await github.saveAtomic(
          { contentJson: nextContent, images: [] },
          message
        );
        setToast({
          kind: 'ok',
          text: `Saved ${changedPaths.length} change(s). Pages will redeploy in ~1 min.`,
        });
        setPending(new Map());
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setError(`${err.message}${err.body ? ' — ' + err.body.slice(0, 200) : ''}`);
      } finally {
        setSaving(false);
      }
    }, [pending]);

    // beforeunload guard.
    React.useEffect(() => {
      if (pending.size === 0) return;
      const handle = (e) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handle);
      return () => window.removeEventListener('beforeunload', handle);
    }, [pending]);

    return (
      <React.Fragment>
        <div
          className={
            'editor-toolbar' +
            (saving ? ' editor-toolbar--saving' : '') +
            (error ? ' editor-toolbar--error' : '')
          }
        >
          <button onClick={() => setEditMode((m) => !m)}>
            {editMode ? 'edit: on' : 'edit'}
          </button>
          {editMode && (
            <React.Fragment>
              <span className="editor-toolbar-status">
                {pending.size > 0
                  ? `${pending.size} change(s)`
                  : 'no changes'}
              </span>
              <button
                disabled={pending.size === 0 || saving}
                onClick={saveAll}
              >
                {saving ? 'saving…' : `save ${pending.size}`}
              </button>
              <button
                disabled={pending.size === 0 || saving}
                data-variant="cancel"
                onClick={discardAll}
              >
                discard
              </button>
            </React.Fragment>
          )}
        </div>

        {popover && (
          <Popover
            anchor={popover.anchor}
            path={popover.path}
            initialValue={popover.initialValue}
            onSave={(v) => {
              applyTextChange(popover.path, v);
              setPopover(null);
            }}
            onCancel={() => setPopover(null)}
          />
        )}

        {toast && (
          <div
            className={
              'editor-toast' +
              (toast.kind === 'error' ? ' editor-toast--error' : '')
            }
          >
            {toast.text}
          </div>
        )}

        {error && !toast && (
          <div className="editor-toast editor-toast--error">{error}</div>
        )}
      </React.Fragment>
    );
  }

  // Mount the editor into its own root, kept separate from the main app.
  function mount() {
    const host = document.createElement('div');
    host.id = 'editor-root';
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);
    root.render(<EditorRoot />);
  }

  // Wait for window.CONTENT (the existing pre-mount fetch).
  if (window.__contentReady) {
    window.__contentReady.then(mount);
  } else {
    mount();
  }
})();
