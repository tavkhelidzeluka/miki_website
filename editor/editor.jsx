// Inline editor main runtime. Mounts its own React root, renders the floating
// toolbar, captures clicks on editable elements, manages the pending-changes
// map, and triggers atomic saves.

window.__editor = window.__editor || {};

(function () {
  const { getByPath, setByPath, isI18nObject, i18nDisplay } = window.__editor;
  const { Popover } = window.__editor;
  const github = window.__editor.github;

  // Field schemas for the generic AddListItemModal. Each entry describes the
  // shape of a list item — used to render the modal inputs and assemble the
  // queued add payload. Keyed by the schemaName supplied via
  // data-editor-add-schema on the + add button.
  const SCHEMAS = {
    socialTile: [
      { key: 'src',   label: 'image', type: 'image',  required: true },
      { key: 'brand', label: 'brand', type: 'string', required: true, placeholder: '@brand or BRAND' },
    ],
    experience: [
      { key: 'title',   label: 'title',                 type: 'i18n', required: true },
      { key: 'role',    label: 'role',                  type: 'i18n', required: true },
      { key: 'subRole', label: 'sub-role (optional)',   type: 'i18n', required: false },
      { key: 'date',    label: 'date',                  type: 'i18n', required: true },
    ],
    exhibition: [
      { key: 'label', label: 'label', type: 'i18n', required: true },
    ],
    skill: [
      { key: 'label', label: 'label', type: 'i18n', required: true },
    ],
    animation: [
      { key: 'id',       label: 'id',                  type: 'string', required: true,  placeholder: 'e.g. A09' },
      { key: 'title',    label: 'title',               type: 'string', required: true },
      { key: 'date',     label: 'date',                type: 'string', required: false, placeholder: 'e.g. 28.05.2026' },
      { key: 'desc',     label: 'description',         type: 'text',   required: false },
      { key: 'thumb',    label: 'thumbnail image',     type: 'image',  required: false },
      { key: 'videoUrl', label: 'video URL (YouTube/Vimeo/.mp4)', type: 'string', required: false, placeholder: 'https://…' },
    ],
    carousel: [
      { key: 'id',      label: 'id',                  type: 'string', required: true,  placeholder: 'e.g. C03' },
      { key: 'brand',   label: 'brand',               type: 'string', required: true },
      { key: 'titleEn', label: 'title (en)',          type: 'string', required: true },
      { key: 'title',   label: 'title (native/ru)',   type: 'string', required: true },
      { key: 'cover',   label: 'cover image',         type: 'image',  required: true },
    ],
  };

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

  // Generic "add item to list" modal. The `fields` schema controls which
  // inputs render. Returns an item object on save plus optional file+path
  // for image fields.
  //
  //   fields: [
  //     { key: 'src',   label: 'image',       type: 'image',  required: true },
  //     { key: 'brand', label: 'brand',       type: 'string', required: true },
  //     { key: 'title', label: 'title',       type: 'i18n',   required: true },
  //     { key: 'desc',  label: 'description', type: 'text',   required: false },
  //     ...
  //   ]
  //
  //   type 'image' = file picker; result item field is the resolved path,
  //                  with file + imagePath passed alongside.
  //   type 'i18n'  = pair of en/ua inputs → { en, ua } object
  function AddListItemModal({ title, fields, assetFolder, onSave, onCancel }) {
    const [values, setValues] = React.useState(() => {
      const v = {};
      for (const f of fields) {
        if (f.type === 'i18n') v[f.key] = { en: '', ua: '' };
        else if (f.type === 'image') v[f.key] = { file: null, filename: '' };
        else v[f.key] = '';
      }
      return v;
    });
    const [previewUrls, setPreviewUrls] = React.useState({});
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
      const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onCancel]);

    const slugify = (s) => (s || 'item').toString().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

    const updateField = (key, val) => setValues((prev) => ({ ...prev, [key]: val }));

    const handlePickFile = (key, file) => {
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setError(`File too large (${Math.round(file.size/1024/1024)}MB). Max 5MB.`);
        return;
      }
      if (!/^image\//.test(file.type)) {
        setError(`Not an image: ${file.type || '(unknown)'}`);
        return;
      }
      setError(null);
      // Auto-suggest filename based on best available text field.
      const slugBasis = values.title?.en || values.name || values.brand || values.label?.en || 'item';
      const ext = (file.name.match(/\.[a-z0-9]+$/i) || ['.png'])[0].toLowerCase();
      const filename = `${slugify(slugBasis)}${ext}`;
      setValues((prev) => ({ ...prev, [key]: { file, filename } }));
      const url = URL.createObjectURL(file);
      setPreviewUrls((prev) => {
        if (prev[key]) URL.revokeObjectURL(prev[key]);
        return { ...prev, [key]: url };
      });
    };

    React.useEffect(() => () => {
      Object.values(previewUrls).forEach((u) => URL.revokeObjectURL(u));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const onSubmit = () => {
      // Required-field check
      for (const f of fields) {
        if (!f.required) continue;
        const v = values[f.key];
        if (f.type === 'i18n') {
          if (!v.en.trim()) { setError(`${f.label} (en) is required.`); return; }
        } else if (f.type === 'image') {
          if (!v.file) { setError(`${f.label} is required.`); return; }
        } else {
          if (!v.trim()) { setError(`${f.label} is required.`); return; }
        }
      }
      const item = {};
      let file = null;
      let imagePath = null;
      for (const f of fields) {
        const v = values[f.key];
        if (f.type === 'image') {
          if (v.file) {
            const cleanName = (v.filename || `image.png`).replace(/[^a-zA-Z0-9._-]+/g, '-');
            imagePath = `${assetFolder}/${cleanName}`;
            item[f.key] = imagePath;
            file = v.file;
          } else {
            item[f.key] = null;
          }
        } else if (f.type === 'i18n') {
          item[f.key] = { en: v.en.trim(), ua: v.ua.trim() };
        } else {
          item[f.key] = v.trim();
        }
      }
      onSave(item, file, imagePath);
    };

    return (
      <div className="editor-modal-scrim" onMouseDown={onCancel}>
        <div className="editor-modal" onMouseDown={(e) => e.stopPropagation()} style={{ minWidth: 380 }}>
          <div className="editor-popover-label">{title || 'add new item'}</div>
          {fields.map((f) => (
            <React.Fragment key={f.key}>
              <div className="editor-popover-label">{f.label}{f.required ? ' *' : ''}</div>
              {f.type === 'i18n' ? (
                <React.Fragment>
                  <input type="text" value={values[f.key].en} placeholder="EN"
                    onChange={(e) => updateField(f.key, { ...values[f.key], en: e.target.value })}
                    autoFocus={fields[0] === f} />
                  <input type="text" value={values[f.key].ua} placeholder="UA" style={{ marginTop: 4 }}
                    onChange={(e) => updateField(f.key, { ...values[f.key], ua: e.target.value })} />
                </React.Fragment>
              ) : f.type === 'text' ? (
                <textarea value={values[f.key]}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  style={{ minHeight: 60, resize: 'vertical' }} />
              ) : f.type === 'image' ? (
                <React.Fragment>
                  <input type="file" accept="image/*"
                    onChange={(e) => handlePickFile(f.key, e.target.files?.[0])} />
                  {previewUrls[f.key] && (
                    <img src={previewUrls[f.key]} alt="preview" className="preview" />
                  )}
                  {values[f.key].file && (
                    <input type="text" value={values[f.key].filename}
                      onChange={(e) => updateField(f.key, { ...values[f.key], filename: e.target.value })} />
                  )}
                  {values[f.key].file && (
                    <div className="editor-modal-meta">
                      will save as: <code>{assetFolder}/{values[f.key].filename}</code>
                    </div>
                  )}
                </React.Fragment>
              ) : (
                <input type="text" value={values[f.key]} placeholder={f.placeholder || ''}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  autoFocus={fields[0] === f} />
              )}
            </React.Fragment>
          ))}
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
        if (el.dataset.editorAction === 'add-generic') {
          let defaults = {};
          if (el.dataset.editorAddDefaults) {
            try { defaults = JSON.parse(el.dataset.editorAddDefaults); }
            catch (_) { /* ignore malformed */ }
          }
          setAddModal({
            kind: 'generic',
            title: el.dataset.editorAddTitle || 'add new item',
            listPath: el.dataset.editorListPath,
            assetFolder: el.dataset.editorAssetFolder,
            schemaName: el.dataset.editorAddSchema,
            defaults,
          });
          return;
        }
        if (el.dataset.editorAction === 'delete-item') {
          const listPath = el.dataset.editorListPath;
          const index = parseInt(el.dataset.editorListIndex, 10);
          const label = el.dataset.editorItemLabel || `item ${index}`;
          if (Number.isNaN(index)) return;
          if (confirm(`Delete "${label}"? This will be committed when you click Save.`)) {
            applyDeleteChange(listPath, index, label);
          }
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

    const applyImageChange = React.useCallback((path, fileResult, displayDelta) => {
      setPending((prev) => {
        const next = new Map(prev);
        const file = fileResult ? fileResult.file : null;
        const newPath = fileResult ? fileResult.path : null;
        next.set(path, {
          type: 'image',
          value: newPath,    // null if only display settings changed
          file,              // null if no file picked
          display: displayDelta || null,
        });
        return next;
      });
      // Optimistic preview.
      const els = document.querySelectorAll(
        `[data-content-path="${CSS.escape(path)}"]`
      );
      const blobUrl = fileResult ? URL.createObjectURL(fileResult.file) : null;
      els.forEach((el) => {
        if (blobUrl) {
          if (el.tagName === 'IMG') el.src = blobUrl;
          else if (el.style.backgroundImage !== undefined) el.style.backgroundImage = `url("${blobUrl}")`;
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

    // Queue a "delete from list" change. Indices are recorded as-of click time;
    // saveAll groups and sorts them descending per list so splices don't shift
    // higher indices.
    const delCounter = React.useRef(0);
    const applyDeleteChange = React.useCallback((listPath, index, label) => {
      const key = `__del:${listPath}:${index}:${delCounter.current++}`;
      setPending((prev) => {
        const next = new Map(prev);
        next.set(key, { type: 'delete', listPath, index, label });
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
        const counts = { text: 0, img: 0, add: 0, del: 0 };
        const lines = [];

        // Apply deletes first, grouped per list and sorted descending so
        // splices don't shift indices we still need to reference.
        const deleteGroups = {};
        for (const [, change] of pending.entries()) {
          if (change.type !== 'delete') continue;
          (deleteGroups[change.listPath] = deleteGroups[change.listPath] || []).push(change);
        }
        for (const [listPath, group] of Object.entries(deleteGroups)) {
          const list = [...(window.__editor.getByPath(nextContent, listPath) || [])];
          // Dedupe by index, sort descending.
          const indices = [...new Set(group.map((g) => g.index))].sort((a, b) => b - a);
          for (const idx of indices) {
            list.splice(idx, 1);
          }
          nextContent = setByPath(nextContent, listPath, list);
          counts.del += indices.length;
          const labels = group.map((g) => g.label).join(', ');
          lines.push(`- DELETE ${listPath}[${indices.join(',')}] (${labels})`);
        }

        for (const [key, change] of pending.entries()) {
          if (change.type === 'delete') continue; // already handled
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
            // Path update (only if a new file was picked)
            if (change.value && change.file) {
              nextContent = setByPath(nextContent, key, change.value);
              images.push({ path: change.value, file: change.file });
              lines.push(`- ${key} (uploaded ${change.value})`);
            }
            // Display settings update (independent of file)
            if (change.display) {
              const currentMap = (nextContent.imageDisplay || {});
              const updated = { ...currentMap };
              // If delta is empty (all defaults) drop the entry to keep JSON clean.
              if (Object.keys(change.display).length === 0) {
                delete updated[key];
              } else {
                updated[key] = change.display;
              }
              nextContent = { ...nextContent, imageDisplay: updated };
              lines.push(`- ${key} (display: ${JSON.stringify(change.display)})`);
            }
            counts.img++;
          } else {
            nextContent = setByPath(nextContent, key, change.value);
            counts.text++;
            lines.push(`- ${key}`);
          }
        }
        const summary =
          `edit(inline): ${counts.text} text, ${counts.img} image, ${counts.add} added, ${counts.del} deleted`;
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
            contentPath={imageModal.path}
            onSave={({ file, display }) => {
              applyImageChange(imageModal.path, file, display);
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

        {addModal && addModal.kind === 'generic' && (
          <AddListItemModal
            title={addModal.title}
            fields={SCHEMAS[addModal.schemaName] || []}
            assetFolder={addModal.assetFolder}
            onSave={(item, file, imagePath) => {
              const merged = { ...(addModal.defaults || {}), ...item };
              applyAddChange(addModal.listPath, merged, file, imagePath);
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
