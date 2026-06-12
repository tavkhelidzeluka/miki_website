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
    canvasItem: [
      { key: 'id',       label: 'id',                  type: 'string', required: true,  placeholder: 'e.g. CV-11' },
      { key: 'title',    label: 'title',               type: 'string', required: true },
      { key: 'medium',   label: 'medium (en)',         type: 'string', required: false, placeholder: 'e.g. oil on canvas · 50×70' },
      { key: 'mediumUa', label: 'medium (ua)',         type: 'string', required: false },
      { key: 'img',      label: 'image',               type: 'image',  required: false },
      { key: 'price',    label: 'price (USD, number)', type: 'number', required: false, placeholder: 'e.g. 350' },
    ],
  };

  // Field lists for the EditDetailsModal — every text field an item carries,
  // including ones the page that hosts the button doesn't render (e.g. a
  // work's client/role/medium/year live on the detail overlay only). Keyed by
  // the schemaName supplied via data-editor-details-schema. `fallback: true`
  // fields inherit the category value when the item has none — that value is
  // surfaced as the input's placeholder, never as its value, so an untouched
  // field can't copy the fallback into the item.
  const DETAIL_SCHEMAS = {
    work: [
      { key: 'name',   label: 'name',        type: 'string', required: true },
      { key: 'desc',   label: 'description', type: 'text' },
      { key: 'client', label: 'client',      type: 'string', fallback: true },
      { key: 'role',   label: 'role',        type: 'string', fallback: true },
      { key: 'medium', label: 'medium',      type: 'string', fallback: true },
      { key: 'year',   label: 'year',        type: 'string', fallback: true },
      { key: 'price',  label: 'price',       type: 'string', emptyAs: null, placeholder: 'e.g. "200 €" or "ціна на запит"' },
    ],
    animation: [
      { key: 'id',       label: 'id',    type: 'string', required: true, placeholder: 'e.g. A09' },
      { key: 'title',    label: 'title', type: 'string', required: true },
      { key: 'date',     label: 'date',  type: 'string', placeholder: 'e.g. 28.05.2026' },
      { key: 'desc',     label: 'description', type: 'text' },
      { key: 'videoUrl', label: 'video URL (YouTube/Vimeo/.mp4)', type: 'string', placeholder: 'https://…' },
    ],
  };

  // Write text into a React-rendered element WITHOUT detaching the text node
  // React manages. `el.textContent = …` replaces the child node; React keeps
  // updating the old, detached node on later renders, so the element's text
  // freezes on screen and "travels" to whatever item the element shows next
  // (e.g. detail overlay next/prev reuses the same nodes). Updating nodeValue
  // in place keeps React able to repaint the element.
  function writeText(el, display) {
    const first = el.firstChild;
    if (first && first.nodeType === Node.TEXT_NODE && !first.nextSibling) {
      first.nodeValue = display;
    } else {
      el.textContent = display;
    }
  }

  // Index remap for moving one item within a list from `from` to `to` —
  // every other index shifts by at most one.
  function moveIndexMap(from, to) {
    return (k) => {
      if (k === from) return to;
      if (from < to) return (k > from && k <= to) ? k - 1 : k;
      return (k >= to && k < from) ? k + 1 : k;
    };
  }

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
        if (f.type === 'number') {
          const trimmed = String(values[f.key]).trim();
          if (trimmed && Number.isNaN(Number(trimmed))) { setError(`${f.label} must be a number.`); return; }
          if (f.required && !trimmed) { setError(`${f.label} is required.`); return; }
          continue;
        }
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
        } else if (f.type === 'number') {
          const trimmed = String(v).trim();
          item[f.key] = trimmed === '' ? null : Number(trimmed);
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
                <input type={f.type === 'number' ? 'number' : 'text'} value={values[f.key]} placeholder={f.placeholder || ''}
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

  // Pre-filled "edit details" modal — all of one item's text fields in a
  // single form, so detail-page-only fields stay reachable from list pages.
  // `fields` arrive resolved: [{ key, label, type, required, placeholder,
  // path, initial }]. Saving emits [path, value] pairs for MODIFIED fields
  // only; untouched fields never write.
  function EditDetailsModal({ title, fields, onSave, onCancel }) {
    const [values, setValues] = React.useState(() => {
      const v = {};
      for (const f of fields) v[f.key] = f.initial;
      return v;
    });
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
      const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onCancel]);

    const updateField = (key, val) => setValues((prev) => ({ ...prev, [key]: val }));

    const onSubmit = () => {
      for (const f of fields) {
        if (f.required && !values[f.key].trim()) { setError(`${f.label} is required.`); return; }
      }
      const changes = [];
      for (const f of fields) {
        const next = values[f.key].trim();
        if (next === f.initial.trim()) continue;
        changes.push([f.path, next === '' && f.emptyAs === null ? null : next]);
      }
      onSave(changes);
    };

    return (
      <div className="editor-modal-scrim" onMouseDown={onCancel}>
        <div className="editor-modal" onMouseDown={(e) => e.stopPropagation()} style={{ minWidth: 380 }}>
          <div className="editor-popover-label">{title}</div>
          {fields.map((f, i) => (
            <React.Fragment key={f.key}>
              <div className="editor-popover-label">{f.label}{f.required ? ' *' : ''}</div>
              {f.type === 'text' ? (
                <textarea value={values[f.key]} placeholder={f.placeholder || ''}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  style={{ minHeight: 60, resize: 'vertical' }} />
              ) : (
                <input type="text" value={values[f.key]} placeholder={f.placeholder || ''}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  autoFocus={i === 0} />
              )}
            </React.Fragment>
          ))}
          {error && <div className="editor-modal-error">{error}</div>}
          <div className="editor-popover-actions">
            <button data-variant="cancel" onClick={onCancel}>cancel</button>
            <button onClick={onSubmit}>queue changes</button>
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
    const [detailsModal, setDetailsModal] = React.useState(null); // { title, fields }
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [toast, setToast] = React.useState(null);

    // Toggle the body class so CSS rules activate, and tell the app —
    // hidden items render only in edit mode, so filtered views must
    // re-read window.visibleEntries.
    React.useEffect(() => {
      document.body.classList.toggle('editor-mode-on', editMode);
      window.__EDIT_MODE = editMode;
      window.dispatchEvent(new Event('miki-content-changed'));
      return () => {
        document.body.classList.remove('editor-mode-on');
        window.__EDIT_MODE = false;
      };
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
        // Pending edits win over content.json, same as the single-field flows.
        const resolve = (p) => (pending.has(p) ? pending.get(p).value : getByPath(window.CONTENT, p));
        // Resolve the element's details opt-in (data-editor-details-schema +
        // data-editor-base-path) into prefilled modal fields. Null when the
        // element doesn't opt in.
        const resolveDetailFields = () => {
          const schema = DETAIL_SCHEMAS[el.dataset.editorDetailsSchema];
          const basePath = el.dataset.editorBasePath;
          if (!schema || !basePath) return null;
          const fallbackBase = el.dataset.editorFallbackPath;
          return schema.map((f) => {
            const path = `${basePath}.${f.key}`;
            const own = resolve(path);
            let placeholder = f.placeholder || '';
            if (f.fallback && fallbackBase) {
              const fb = resolve(`${fallbackBase}.${f.key}`);
              if (fb) placeholder = `category: ${fb}`;
            }
            return { ...f, path, initial: own == null ? '' : String(own), placeholder };
          });
        };
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
        if (el.dataset.editorAction === 'edit-details') {
          const fields = resolveDetailFields();
          if (!fields || fields.length === 0) return;
          // The label attribute renders from window.CONTENT, so a pending
          // (unsaved) rename wouldn't show in it — prefer the resolved name.
          const ownName = resolve(`${el.dataset.editorBasePath}.name`);
          setDetailsModal({
            title: `edit details — ${(typeof ownName === 'string' && ownName.trim()) ? ownName : (el.dataset.editorItemLabel || el.dataset.editorBasePath)}`,
            fields,
          });
          return;
        }
        if (el.dataset.editorAction === 'toggle-hide') {
          const listPath = el.dataset.editorListPath;
          const index = parseInt(el.dataset.editorListIndex, 10);
          if (!Number.isNaN(index)) applyHideToggle(listPath, index);
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
          const existing = resolve(path);
          const slugBasis =
            el.closest('[data-content-name]')?.dataset?.contentName ||
            path.split('.').pop();
          // An image element can opt into details editing too — the modal
          // then hosts the item's text fields alongside the image controls
          // (e.g. animation tiles, where the image click is the only
          // editor-reachable surface for desc/videoUrl).
          const pendingImg = pending.get(path);
          setImageModal({
            path, existing, folder, slugBasis,
            detailFields: resolveDetailFields(),
            pendingDisplay: (pendingImg && pendingImg.type === 'image' && pendingImg.display) || null,
          });
        } else {
          setPopover({ anchor: el, path, initialValue: resolve(path) });
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
        // null means an explicit clear (e.g. price removed via the details
        // modal) — blank the element so the queued clear is visible.
        const display = newValue === null ? '' : i18nDisplay(newValue, currentLang);
        if (display !== undefined && display !== null) {
          // Stash what the app had rendered before overwriting it. Components
          // may render PROJECTIONS of the content (e.g. ProjectDetail falls
          // back to the category value when a work has none), so this stash —
          // not content.json — is the only faithful restore source if this
          // node is later reused for a different item.
          if (el.dataset.editorTextOwner !== path) {
            el.dataset.editorPrevText = el.textContent;
          }
          writeText(el, display);
          el.dataset.editorTextOwner = path;
        }
        el.dataset.editorDirty = 'true';
      });
    }, []);

    const applyImageChange = React.useCallback((path, fileResult, displayDelta) => {
      // One blob URL per queued change, reused by the reconciler so previews
      // survive app re-renders without minting new URLs each pass.
      const blobUrl = fileResult ? URL.createObjectURL(fileResult.file) : null;
      setPending((prev) => {
        const next = new Map(prev);
        const old = prev.get(path);
        const prevImg = old && old.type === 'image' ? old : null;
        // A display-only re-edit must not drop a previously queued upload —
        // merge with it instead of replacing it.
        if (fileResult && prevImg && prevImg.blobUrl) URL.revokeObjectURL(prevImg.blobUrl);
        next.set(path, {
          type: 'image',
          value: fileResult ? fileResult.path : (prevImg ? prevImg.value : null),
          file: fileResult ? fileResult.file : (prevImg ? prevImg.file : null),
          display: displayDelta || (prevImg ? prevImg.display : null),
          blobUrl: blobUrl || (prevImg ? prevImg.blobUrl : null),
        });
        return next;
      });
      // Optimistic preview.
      const els = document.querySelectorAll(
        `[data-content-path="${CSS.escape(path)}"]`
      );
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

    // Toggle `hidden` on a list item. Applied to window.CONTENT immediately
    // (reorder precedent — index-addressed views re-render from content),
    // plus a queued text change that carries the flag into the commit.
    // Toggling back before saving removes the queued change — net zero.
    const applyHideToggle = React.useCallback((listPath, index) => {
      const path = `${listPath}.${index}.hidden`;
      const hide = !getByPath(window.CONTENT, path);
      window.CONTENT = setByPath(window.CONTENT, path, hide);
      setPending((prev) => {
        const next = new Map(prev);
        if (prev.has(path)) next.delete(path);
        else next.set(path, { type: 'text', value: hide });
        return next;
      });
      window.dispatchEvent(new Event('miki-content-changed'));
    }, []);

    // Reconcile the DOM with pending edits after the app re-renders (detail
    // next/prev, strip arrows, language switch, reorder). Re-renders paint
    // from window.CONTENT — which excludes pending edits — and reuse DOM
    // nodes across items, which both wipes optimistic previews and strands
    // dirty markers / blob previews on elements that now show a DIFFERENT
    // item. Every write below is guarded (fires only when the DOM diverges)
    // so running this from a MutationObserver converges instead of looping.
    const reapplyOptimistic = React.useCallback((pendingMap) => {
      const currentLang = (window.getLang && window.getLang()) || 'EN';
      for (const [key, change] of pendingMap.entries()) {
        if (change.type !== 'text' && change.type !== 'image') continue;
        document.querySelectorAll(`[data-content-path="${CSS.escape(key)}"]`).forEach((el) => {
          if (change.type === 'text') {
            // null = explicit clear; render as empty (mirrors applyTextChange).
            const display = change.value === null ? '' : i18nDisplay(change.value, currentLang);
            if (display !== undefined && display !== null) {
              if (el.dataset.editorTextOwner !== key) {
                el.dataset.editorPrevText = el.textContent;
                el.dataset.editorTextOwner = key;
              }
              if (el.textContent !== String(display)) writeText(el, display);
            }
          } else if (change.blobUrl) {
            if (el.tagName === 'IMG') {
              if (el.src !== change.blobUrl) el.src = change.blobUrl;
            } else if (el.style.backgroundImage !== `url("${change.blobUrl}")`) {
              el.style.backgroundImage = `url("${change.blobUrl}")`;
            }
          }
          if (el.dataset.editorDirty !== 'true') el.dataset.editorDirty = 'true';
        });
      }
      // Residue cleanup: nodes reused for a different item keep attributes,
      // text and inline styles the app doesn't manage. When a node we wrote
      // text into now carries a different path, React may have skipped
      // repainting it (its diff no-ops when both items render the same value,
      // e.g. two works with no client both render ''). If the node still
      // shows exactly what we wrote, restore its text from content.
      document.querySelectorAll('[data-editor-text-owner]').forEach((el) => {
        const owner = el.dataset.editorTextOwner;
        const cur = el.dataset.contentPath;
        if (cur && cur === owner && pendingMap.has(cur)) return; // handled above
        const ownChange = pendingMap.get(owner);
        if (ownChange && ownChange.type === 'text') {
          const wrote = ownChange.value === null ? '' : i18nDisplay(ownChange.value, currentLang);
          if (wrote !== undefined && wrote !== null && el.textContent === String(wrote)) {
            // React skipped repainting (both items render the same string, so
            // its diff no-opped) — put back what the app had rendered. That
            // stashed text equals what React believes is on screen, which
            // also equals what THIS item should display.
            writeText(el, el.dataset.editorPrevText || '');
          }
        }
        delete el.dataset.editorTextOwner;
        delete el.dataset.editorPrevText;
      });
      // Clear dirty markers whose path has no pending change, and repaint
      // stale blob previews from content (blob: URLs only ever come from
      // this editor).
      document.querySelectorAll('[data-editor-dirty="true"]').forEach((el) => {
        const p = el.dataset.contentPath;
        if (!p || !pendingMap.has(p)) delete el.dataset.editorDirty;
      });
      document.querySelectorAll('[data-content-path]').forEach((el) => {
        const p = el.dataset.contentPath;
        if (pendingMap.has(p)) return;
        const isBlobImg = el.tagName === 'IMG' && el.src.startsWith('blob:');
        const isBlobBg = el.style.backgroundImage.includes('blob:');
        if (!isBlobImg && !isBlobBg) return;
        const real = getByPath(window.CONTENT, p);
        if (isBlobImg) el.src = typeof real === 'string' ? real : '';
        else el.style.backgroundImage = typeof real === 'string' && real ? `url("${real}")` : '';
      });
    }, []);

    // Move one item within a list. Unlike text/image/add/delete, the move is
    // applied to window.CONTENT immediately (and the app re-rendered via the
    // miki-content-changed event) — index-addressed paths all over the DOM
    // must agree with the new order, and a full re-render is the only way to
    // keep them consistent. The queued 'reorder' entry enables Save and
    // records the move in the commit message; at save time the content base
    // (window.CONTENT) already reflects it.
    const moveCounter = React.useRef(0);
    const applyReorder = React.useCallback((listPath, from, to, label) => {
      const list = getByPath(window.CONTENT, listPath);
      if (!Array.isArray(list) || from === to) return;
      if (from < 0 || from >= list.length || to < 0 || to >= list.length) return;

      const mapIdx = moveIndexMap(from, to);
      // Rewrites "listPath.<i>.rest" (or exactly "listPath.<i>") so
      // index-keyed references follow the items they describe.
      const remapPath = (path) => {
        if (typeof path !== 'string' || !path.startsWith(listPath + '.')) return path;
        const rest = path.slice(listPath.length + 1);
        const m = rest.match(/^(\d+)(\..*)?$/);
        if (!m) return path;
        return `${listPath}.${mapIdx(Number(m[1]))}${m[2] || ''}`;
      };

      const newList = [...list];
      const [moved] = newList.splice(from, 1);
      newList.splice(to, 0, moved);
      let nextContent = setByPath(window.CONTENT, listPath, newList);

      // Per-image display settings are keyed by index path — keep them
      // attached to their items.
      if (nextContent.imageDisplay) {
        const remapped = {};
        for (const [k, v] of Object.entries(nextContent.imageDisplay)) {
          remapped[remapPath(k)] = v;
        }
        nextContent = { ...nextContent, imageDisplay: remapped };
      }
      window.CONTENT = nextContent;

      // Queued changes addressed by index follow their items too. Deletes in
      // the reordered list itself keep their key but follow the moved item's
      // index; deletes/adds/reorders whose listPath lives INSIDE a moved item
      // (e.g. 'projects.1.works' while reordering 'projects') follow their
      // parent via the listPath remap — remapPath leaves exact-equal and
      // unrelated paths unchanged.
      setPending((prev) => {
        const next = new Map();
        for (const [key, change] of prev.entries()) {
          if (change.type === 'text' || change.type === 'image') {
            next.set(remapPath(key), change);
          } else if (change.type === 'delete') {
            next.set(key, {
              ...change,
              listPath: remapPath(change.listPath),
              index: change.listPath === listPath ? mapIdx(change.index) : change.index,
            });
          } else if (change.type === 'add' || change.type === 'reorder') {
            next.set(key, { ...change, listPath: remapPath(change.listPath) });
          } else {
            next.set(key, change);
          }
        }
        next.set(`__move:${listPath}:${moveCounter.current++}`, { type: 'reorder', listPath, from, to, label });
        return next;
      });

      // Owner markers on DOM nodes are keyed by path too — keep them in step
      // with the remapped pending keys.
      document.querySelectorAll('[data-editor-text-owner]').forEach((el) => {
        el.dataset.editorTextOwner = remapPath(el.dataset.editorTextOwner);
      });

      window.dispatchEvent(new Event('miki-content-changed'));
      // The mutation observer below restores the optimistic previews of
      // pending edits once the app has re-rendered from the new content.
    }, []);

    // ── Drag-to-reorder ───────────────────────────────────────────────
    // Items opt in via data-editor-reorder-path (the content.json list they
    // live in) + data-editor-reorder-index. Dropping item A onto item B of
    // the SAME list moves A to B's index; cross-list drops are rejected.
    const pendingRef = React.useRef(pending);
    pendingRef.current = pending;

    // Run the reconciler after any app re-render. rAF-debounced; reconcile
    // writes are guarded, so the observer settles after one extra frame
    // instead of feeding back into itself.
    React.useEffect(() => {
      if (!editMode) return;
      const editorHost = document.getElementById('editor-root');
      let raf = 0;
      const schedule = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          reapplyOptimistic(pendingRef.current);
        });
      };
      const observer = new MutationObserver((records) => {
        // The editor's own UI (popover typing, toolbar status) mutates
        // constantly — only app-DOM changes need reconciling.
        if (editorHost && records.every((r) => editorHost.contains(r.target))) return;
        schedule();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });
      // Catch up on anything that re-rendered while the observer was off
      // (e.g. edit mode toggled off and back on with pending changes).
      schedule();
      return () => {
        observer.disconnect();
        if (raf) cancelAnimationFrame(raf);
      };
    }, [editMode, reapplyOptimistic]);

    const dragRef = React.useRef(null); // { el, path, index }

    React.useEffect(() => {
      if (!editMode) return;

      const itemAt = (target) =>
        target && target.closest && target.closest('[data-editor-reorder-path]');
      const clearDraggable = () => {
        document
          .querySelectorAll('[data-editor-reorder-path][draggable="true"]')
          .forEach((n) => { n.draggable = false; });
      };

      // dragstart only fires on draggable elements — set the flag just-in-
      // time on mousedown so the attribute never lingers in the page DOM.
      const onMouseDown = (e) => {
        if (e.target.closest && e.target.closest('.editor-delete-action')) return;
        const el = itemAt(e.target);
        if (el) el.draggable = true;
      };
      // During a real drag the browser swallows mouseup; this only fires for
      // plain clicks, where it undoes the mousedown opt-in.
      const onMouseUp = () => clearDraggable();
      const onDragStart = (e) => {
        const el = itemAt(e.target);
        if (!el) return;
        dragRef.current = {
          el,
          path: el.dataset.editorReorderPath,
          index: parseInt(el.dataset.editorReorderIndex, 10),
        };
        el.classList.add('editor-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', 'reorder'); } catch (_) {} // Firefox
      };
      const onDragOver = (e) => {
        const drag = dragRef.current;
        if (!drag) return;
        const el = itemAt(e.target);
        if (!el || el.dataset.editorReorderPath !== drag.path) return;
        e.preventDefault(); // allow drop
        e.dataTransfer.dropEffect = 'move';
        if (el !== drag.el) el.classList.add('editor-drop-target');
      };
      const onDragLeave = (e) => {
        // Skip leaves into the tile's own children — only clear the highlight
        // when the cursor actually exits the tile (contains(null) is false,
        // so leaving the window still clears it).
        const el = itemAt(e.target);
        if (el && !el.contains(e.relatedTarget)) el.classList.remove('editor-drop-target');
      };
      const onDrop = (e) => {
        const drag = dragRef.current;
        if (!drag) return;
        const el = itemAt(e.target);
        if (!el || el.dataset.editorReorderPath !== drag.path) return;
        e.preventDefault();
        e.stopPropagation();
        const to = parseInt(el.dataset.editorReorderIndex, 10);
        if (!Number.isNaN(drag.index) && !Number.isNaN(to)) {
          applyReorder(drag.path, drag.index, to, drag.el.dataset.contentName);
        }
      };
      const onDragEnd = () => {
        dragRef.current = null;
        document.querySelectorAll('.editor-drop-target, .editor-dragging').forEach((n) => {
          n.classList.remove('editor-drop-target', 'editor-dragging');
        });
        clearDraggable();
      };

      document.addEventListener('mousedown', onMouseDown, true);
      document.addEventListener('mouseup', onMouseUp, true);
      document.addEventListener('dragstart', onDragStart, true);
      document.addEventListener('dragover', onDragOver, true);
      document.addEventListener('dragleave', onDragLeave, true);
      document.addEventListener('drop', onDrop, true);
      document.addEventListener('dragend', onDragEnd, true);
      return () => {
        document.removeEventListener('mousedown', onMouseDown, true);
        document.removeEventListener('mouseup', onMouseUp, true);
        document.removeEventListener('dragstart', onDragStart, true);
        document.removeEventListener('dragover', onDragOver, true);
        document.removeEventListener('dragleave', onDragLeave, true);
        document.removeEventListener('drop', onDrop, true);
        document.removeEventListener('dragend', onDragEnd, true);
        clearDraggable();
      };
    }, [editMode, applyReorder]);

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
        const counts = { text: 0, img: 0, add: 0, del: 0, move: 0 };
        const lines = [];

        // Apply deletes first, grouped per list and sorted descending so
        // splices don't shift indices we still need to reference.
        const deleteGroups = {};
        for (const [, change] of pending.entries()) {
          if (change.type !== 'delete') continue;
          (deleteGroups[change.listPath] = deleteGroups[change.listPath] || []).push(change);
        }
        const deletedByList = {}; // listPath -> ascending deleted indices
        for (const [listPath, group] of Object.entries(deleteGroups)) {
          const list = [...(window.__editor.getByPath(nextContent, listPath) || [])];
          // Dedupe by index, sort descending.
          const indices = [...new Set(group.map((g) => g.index))].sort((a, b) => b - a);
          for (const idx of indices) {
            list.splice(idx, 1);
          }
          deletedByList[listPath] = indices.slice().reverse();
          nextContent = setByPath(nextContent, listPath, list);
          counts.del += indices.length;
          const labels = group.map((g) => g.label).join(', ');
          lines.push(`- DELETE ${listPath}[${indices.join(',')}] (${labels})`);
        }

        // The splices above shift the indices of every surviving item, but
        // queued text/image keys, add listPaths and stored imageDisplay keys
        // were recorded against the PRE-delete order. Remap them so edits
        // follow the items they describe; paths addressing a deleted item
        // resolve to null and the change is dropped.
        const remapAcrossDeletes = (path) => {
          if (typeof path !== 'string') return path;
          let p = path;
          for (const [listPath, deleted] of Object.entries(deletedByList)) {
            if (!p.startsWith(listPath + '.')) continue;
            const rest = p.slice(listPath.length + 1);
            const m = rest.match(/^(\d+)(\..*)?$/);
            if (!m) continue;
            const i = Number(m[1]);
            if (deleted.includes(i)) return null;
            const shift = deleted.filter((d) => d < i).length;
            p = `${listPath}.${i - shift}${m[2] || ''}`;
          }
          return p;
        };
        if (nextContent.imageDisplay && Object.keys(deletedByList).length) {
          const remapped = {};
          for (const [k, v] of Object.entries(nextContent.imageDisplay)) {
            const nk = remapAcrossDeletes(k);
            if (nk !== null) remapped[nk] = v;
          }
          nextContent = { ...nextContent, imageDisplay: remapped };
        }

        for (const [key, change] of pending.entries()) {
          if (change.type === 'delete') continue; // already handled
          if (change.type === 'reorder') {
            // Content already reflects the move (applied to window.CONTENT
            // at drag time) — record it in the commit message only.
            counts.move++;
            lines.push(`- REORDER ${change.listPath}: ${change.from} → ${change.to}${change.label ? ` (${change.label})` : ''}`);
            continue;
          }
          if (change.type === 'add') {
            const listPath = remapAcrossDeletes(change.listPath);
            if (listPath === null) {
              lines.push(`- SKIP add to ${change.listPath} (parent item deleted)`);
              continue;
            }
            const existing = window.__editor.getByPath(nextContent, listPath) || [];
            const newList = [...existing, change.item];
            nextContent = setByPath(nextContent, listPath, newList);
            if (change.file && change.imagePath) {
              images.push({ path: change.imagePath, file: change.file });
            }
            counts.add++;
            lines.push(`- ADD ${listPath} ← ${JSON.stringify(change.item.name || change.item.title || '<new>')}`);
          } else if (change.type === 'image') {
            const target = remapAcrossDeletes(key);
            if (target === null) {
              lines.push(`- SKIP ${key} (item deleted)`);
              continue;
            }
            // Path update (only if a new file was picked)
            if (change.value && change.file) {
              nextContent = setByPath(nextContent, target, change.value);
              images.push({ path: change.value, file: change.file });
              lines.push(`- ${target} (uploaded ${change.value})`);
            }
            // Display settings update (independent of file)
            if (change.display) {
              const currentMap = (nextContent.imageDisplay || {});
              const updated = { ...currentMap };
              // If delta is empty (all defaults) drop the entry to keep JSON clean.
              if (Object.keys(change.display).length === 0) {
                delete updated[target];
              } else {
                updated[target] = change.display;
              }
              nextContent = { ...nextContent, imageDisplay: updated };
              lines.push(`- ${target} (display: ${JSON.stringify(change.display)})`);
            }
            counts.img++;
          } else {
            const target = remapAcrossDeletes(key);
            if (target === null) {
              lines.push(`- SKIP ${key} (item deleted)`);
              continue;
            }
            nextContent = setByPath(nextContent, target, change.value);
            counts.text++;
            lines.push(`- ${target}`);
          }
        }
        const summary =
          `edit(inline): ${counts.text} text, ${counts.img} image, ${counts.add} added, ${counts.del} deleted` +
          (counts.move ? `, ${counts.move} reordered` : '');
        const message = summary + '\n\n' + lines.join('\n');
        await github.saveAtomic(
          { contentJson: nextContent, images },
          message
        );
        // Keep the in-memory content in sync so the reconciler doesn't
        // repaint just-saved changes back to their old values during the
        // pre-reload window.
        window.CONTENT = nextContent;
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
            detailFields={imageModal.detailFields}
            pendingDisplay={imageModal.pendingDisplay}
            onSave={({ file, display, details }) => {
              // Details-only saves must not queue an empty image change.
              if (file || display) applyImageChange(imageModal.path, file, display);
              for (const [path, value] of (details || [])) applyTextChange(path, value);
              setImageModal(null);
            }}
            onCancel={() => setImageModal(null)}
          />
        )}

        {detailsModal && (
          <EditDetailsModal
            title={detailsModal.title}
            fields={detailsModal.fields}
            onSave={(changes) => {
              for (const [path, value] of changes) applyTextChange(path, value);
              setDetailsModal(null);
            }}
            onCancel={() => setDetailsModal(null)}
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
