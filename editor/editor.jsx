// Inline editor main runtime. Mounts its own React root, renders the floating
// toolbar, captures clicks on editable elements, manages the pending-changes
// map, and triggers atomic saves.

window.__editor = window.__editor || {};

(function () {
  const { getByPath, setByPath, isI18nObject, i18nDisplay } = window.__editor;
  const { Popover } = window.__editor;
  const github = window.__editor.github;

  // Modal for adding a new work (or any work-shaped item: name + desc + image
  // + optional price). When image is provided, the editor uploads it next
  // to the new content.json write in a single commit.
  function AddWorkModal({ assetFolder, onSave, onCancel }) {
    const [name, setName] = React.useState('');
    const [desc, setDesc] = React.useState('');
    const [price, setPrice] = React.useState('');
    const [file, setFile] = React.useState(null);
    const [filename, setFilename] = React.useState('');
    const [previewUrl, setPreviewUrl] = React.useState(null);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
      if (!file) { setPreviewUrl(null); return; }
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }, [file]);

    React.useEffect(() => {
      const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onCancel]);

    const slugify = (s) => (s || 'work')
      .toString().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

    const onPick = (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) {
        setError(`File too large (${Math.round(f.size/1024/1024)}MB). Max 5MB.`);
        return;
      }
      if (!/^image\//.test(f.type)) {
        setError(`Not an image: ${f.type || '(unknown)'}`);
        return;
      }
      setError(null);
      setFile(f);
      const ext = (f.name.match(/\.[a-z0-9]+$/i) || ['.png'])[0].toLowerCase();
      setFilename(`${slugify(name)}${ext}`);
    };

    React.useEffect(() => {
      // If user changes name AFTER picking a file, refresh suggested filename
      // unless they've already manually edited it.
      if (file && filename && filename.startsWith(slugify(filename.split('.')[0]))) {
        const ext = (filename.match(/\.[a-z0-9]+$/i) || ['.png'])[0].toLowerCase();
        setFilename(`${slugify(name)}${ext}`);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name]);

    const onSubmit = () => {
      const trimmedName = name.trim();
      if (!trimmedName) { setError('Name is required.'); return; }
      const item = {
        name: trimmedName,
        desc: desc.trim(),
        thumb: null,
        price: price.trim() || null,
      };
      let imagePath = null;
      if (file) {
        const cleanName = (filename || `${slugify(trimmedName)}.png`).replace(/[^a-zA-Z0-9._-]+/g, '-');
        imagePath = `${assetFolder}/${cleanName}`;
        item.thumb = imagePath;
      }
      onSave(item, file, imagePath);
    };

    return (
      <div className="editor-modal-scrim" onMouseDown={onCancel}>
        <div className="editor-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="editor-popover-label">add new work</div>
          <div className="editor-popover-label">name</div>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <div className="editor-popover-label">description (optional)</div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ minHeight: 60, resize: 'vertical' }} />
          <div className="editor-popover-label">price (optional, any format)</div>
          <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder='e.g. "200 €" or "ціна на запит"' />
          <div className="editor-popover-label">image (optional)</div>
          <input type="file" accept="image/*" onChange={onPick} />
          {previewUrl && <img src={previewUrl} alt="preview" className="preview" />}
          {file && (
            <React.Fragment>
              <div className="editor-popover-label">filename</div>
              <input type="text" value={filename} onChange={(e) => setFilename(e.target.value)} />
              <div className="editor-modal-meta">will save as: <code>{assetFolder}/{filename}</code></div>
            </React.Fragment>
          )}
          {error && <div className="editor-modal-error">{error}</div>}
          <div className="editor-popover-actions">
            <button data-variant="cancel" onClick={onCancel}>cancel</button>
            <button onClick={onSubmit}>queue add</button>
          </div>
        </div>
      </div>
    );
  }

  function EditorRoot() {
    const [editMode, setEditMode] = React.useState(false);
    // pending: Map<path, { type: 'text', value }>
    const [pending, setPending] = React.useState(new Map());
    const [popover, setPopover] = React.useState(null); // { anchor, path, initialValue }
    const [imageModal, setImageModal] = React.useState(null); // { path, existing, folder, slugBasis }
    const [addModal, setAddModal] = React.useState(null); // { kind, listPath, assetFolder }
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
        while (el && !el.dataset?.contentPath && !el.dataset?.editorAction) el = el.parentElement;
        if (!el) return;
        e.preventDefault();
        e.stopPropagation();
        if (el.dataset.editorAction === 'add-work') {
          setAddModal({
            kind: 'work',
            listPath: el.dataset.editorListPath,
            assetFolder: el.dataset.editorAssetFolder,
          });
          return;
        }
        const path = el.dataset.contentPath;
        if (el.dataset.editorKind === 'image') {
          const folder = el.dataset.assetFolder;
          if (!folder) {
            setError(`image element at ${path} missing data-asset-folder`);
            return;
          }
          const existing = pending.has(path)
            ? pending.get(path).value
            : getByPath(window.CONTENT, path);
          const slugBasis =
            el.closest('[data-content-name]')?.dataset?.contentName ||
            path.split('.').pop();
          setImageModal({ path, existing, folder, slugBasis });
        } else {
          const current = pending.has(path)
            ? pending.get(path).value
            : getByPath(window.CONTENT, path);
          setPopover({ anchor: el, path, initialValue: current });
        }
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

    const applyImageChange = React.useCallback((path, file, newPath) => {
      setPending((prev) => {
        const next = new Map(prev);
        next.set(path, { type: 'image', value: newPath, file });
        return next;
      });
      // Optimistic preview: swap the visible image to a blob URL.
      const blobUrl = URL.createObjectURL(file);
      const els = document.querySelectorAll(
        `[data-content-path="${CSS.escape(path)}"]`
      );
      els.forEach((el) => {
        if (el.tagName === 'IMG') {
          el.src = blobUrl;
        } else if (el.style.backgroundImage !== undefined) {
          el.style.backgroundImage = `url("${blobUrl}")`;
        }
        el.dataset.editorDirty = 'true';
      });
    }, []);

    // Queue an "add to list" change. We key by an opaque add token so multiple
    // adds to the same list don't collide.
    const addCounter = React.useRef(0);
    const applyAddChange = React.useCallback((listPath, item, file, imagePath) => {
      const key = `__add:${listPath}:${addCounter.current++}`;
      setPending((prev) => {
        const next = new Map(prev);
        next.set(key, { type: 'add', listPath, item, file, imagePath });
        return next;
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
        const images = [];
        const counts = { text: 0, img: 0, add: 0 };
        const lines = [];
        for (const [key, change] of pending.entries()) {
          if (change.type === 'add') {
            const existing = window.__editor.getByPath(nextContent, change.listPath) || [];
            const newList = [...existing, change.item];
            nextContent = setByPath(nextContent, change.listPath, newList);
            if (change.file && change.imagePath) {
              images.push({ path: change.imagePath, file: change.file });
            }
            counts.add++;
            lines.push(`- ADD ${change.listPath} ← ${JSON.stringify(change.item.name || change.item.title || '<new>')}`);
          } else if (change.type === 'image') {
            nextContent = setByPath(nextContent, key, change.value);
            images.push({ path: change.value, file: change.file });
            counts.img++;
            lines.push(`- ${key} (uploaded ${change.value})`);
          } else {
            nextContent = setByPath(nextContent, key, change.value);
            counts.text++;
            lines.push(`- ${key}`);
          }
        }
        const summary =
          `edit(inline): ${counts.text} text, ${counts.img} image, ${counts.add} added`;
        const message = summary + '\n\n' + lines.join('\n');
        await github.saveAtomic(
          { contentJson: nextContent, images },
          message
        );
        setToast({
          kind: 'ok',
          text: `Saved ${pending.size} change(s). Pages will redeploy in ~1 min.`,
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

        {imageModal && (
          <window.__editor.ImageModal
            existingPath={imageModal.existing}
            assetFolder={imageModal.folder}
            suggestedSlug={imageModal.slugBasis}
            onSave={({ file, path: newPath }) => {
              applyImageChange(imageModal.path, file, newPath);
              setImageModal(null);
            }}
            onCancel={() => setImageModal(null)}
          />
        )}

        {addModal && addModal.kind === 'work' && (
          <AddWorkModal
            assetFolder={addModal.assetFolder}
            onSave={(item, file, imagePath) => {
              applyAddChange(addModal.listPath, item, file, imagePath);
              setAddModal(null);
            }}
            onCancel={() => setAddModal(null)}
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
