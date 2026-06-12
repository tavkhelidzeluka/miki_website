// Image modal: file picker + preview + filename + display settings
// (background-size / position / repeat). File is OPTIONAL — the artist may
// just want to adjust display settings without re-uploading.
//
// When `detailFields` is supplied (resolved DETAIL_SCHEMAS entries from
// editor.jsx: [{ key, label, type, required, placeholder, path, initial }]),
// the modal also hosts the item's text fields below the image controls and
// returns [path, value] pairs for MODIFIED fields in onSave's `details` —
// used where the image click is the only editor-reachable surface for an
// item's detail fields (e.g. animation tiles).

window.__editor = window.__editor || {};

const MAX_BYTES = 5 * 1024 * 1024;

function deriveDefaultFilename(existingPath, suggestedSlug, file) {
  if (existingPath) {
    const idx = existingPath.lastIndexOf('/');
    return existingPath.slice(idx + 1);
  }
  const ext = (file.name.match(/\.[a-z0-9]+$/i) || ['.png'])[0].toLowerCase();
  const slug = (suggestedSlug || 'image')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug}${ext}`;
}

window.__editor.ImageModal = function ImageModal(props) {
  const { existingPath, assetFolder, suggestedSlug, contentPath, onSave, onCancel } = props;
  const detailFields = props.detailFields || [];
  const [file, setFile] = React.useState(null);
  const [filename, setFilename] = React.useState('');
  const [error, setError] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [detailValues, setDetailValues] = React.useState(() => {
    const v = {};
    for (const f of detailFields) v[f.key] = f.initial;
    return v;
  });

  // Display settings — initialise from the QUEUED (unsaved) display edit when
  // one exists, else from committed content. Mirrors the pending-first
  // resolution of the detail fields; also makes "revert to default" register
  // as a change against the pending state instead of being silently dropped.
  const stored = props.pendingDisplay
    || (window.CONTENT && window.CONTENT.imageDisplay && contentPath
      ? window.CONTENT.imageDisplay[contentPath]
      : null)
    || {};
  const D = window.imgDisplay.DEFAULTS;
  const [fit, setFit] = React.useState(stored.fit || D.fit);
  const [position, setPosition] = React.useState(stored.position || D.position);
  const [customPosition, setCustomPosition] = React.useState(
    window.imgDisplay.POSITIONS.includes(stored.position || D.position) ? '' : (stored.position || '')
  );
  const [usingCustomPos, setUsingCustomPos] = React.useState(
    !!(stored.position && !window.imgDisplay.POSITIONS.includes(stored.position))
  );
  const [repeat, setRepeat] = React.useState(stored.repeat || D.repeat);

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

  const onPick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError(`File is too large (${Math.round(f.size / 1024 / 1024)}MB). Max ${MAX_BYTES / 1024 / 1024}MB.`);
      setFile(null);
      return;
    }
    if (!/^image\//.test(f.type)) {
      setError(`Not an image: ${f.type || '(unknown type)'}`);
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
    setFilename(deriveDefaultFilename(existingPath, suggestedSlug, f));
  };

  // Build a delta of display settings vs DEFAULTS. We only persist non-default
  // values to keep content.json clean.
  const buildDisplayDelta = () => {
    const effectivePos = usingCustomPos ? (customPosition.trim() || D.position) : position;
    const delta = {};
    if (fit !== D.fit) delta.fit = fit;
    if (effectivePos !== D.position) delta.position = effectivePos;
    if (repeat !== D.repeat) delta.repeat = repeat;
    return delta;
  };

  const onSubmit = () => {
    const displayDelta = buildDisplayDelta();
    const displayChanged = JSON.stringify(displayDelta) !== JSON.stringify(stored || {});

    // Detail changes — MODIFIED fields only, mirroring EditDetailsModal.
    for (const f of detailFields) {
      if (f.required && !detailValues[f.key].trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    const details = [];
    for (const f of detailFields) {
      const next = detailValues[f.key].trim();
      if (next === f.initial.trim()) continue;
      details.push([f.path, next === '' && f.emptyAs === null ? null : next]);
    }

    if (!file && !displayChanged && details.length === 0) {
      setError(detailFields.length
        ? 'Nothing changed — edit a field, pick a file, or change a display setting.'
        : 'Pick a file or change a display setting to save.');
      return;
    }

    let fileResult = null;
    if (file) {
      const cleanName = filename.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const fullPath = `${assetFolder}/${cleanName}`;
      fileResult = { file, path: fullPath };
    }

    onSave({
      file: fileResult,
      display: displayChanged ? displayDelta : null,
      details,
    });
  };

  // Live preview of background-size on the preview image.
  const previewStyle = previewUrl
    ? {
        backgroundImage: `url("${previewUrl}")`,
        backgroundSize: fit,
        backgroundPosition: usingCustomPos ? (customPosition || position) : position,
        backgroundRepeat: repeat,
        backgroundColor: '#f0f0f0',
        height: 200,
        border: '1px solid #ddd',
        margin: '8px 0',
      }
    : null;

  // Live preview using EXISTING image when no new file picked.
  const existingPreviewStyle = !previewUrl && existingPath
    ? {
        backgroundImage: `url("${existingPath}")`,
        backgroundSize: fit,
        backgroundPosition: usingCustomPos ? (customPosition || position) : position,
        backgroundRepeat: repeat,
        backgroundColor: '#f0f0f0',
        height: 200,
        border: '1px solid #ddd',
        margin: '8px 0',
      }
    : null;

  return (
    <div className="editor-modal-scrim" onMouseDown={onCancel}>
      <div className="editor-modal" onMouseDown={(e) => e.stopPropagation()} style={{ minWidth: 420 }}>
        <div className="editor-popover-label">image</div>
        {existingPath && (
          <div className="editor-modal-meta">
            current: <code>{existingPath}</code>
          </div>
        )}
        <input type="file" accept="image/*" onChange={onPick} />
        {(previewStyle || existingPreviewStyle) && (
          <div style={previewStyle || existingPreviewStyle} />
        )}
        {file && (
          <React.Fragment>
            <div className="editor-popover-label">filename</div>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
            <div className="editor-modal-meta">
              will save as: <code>{assetFolder}/{filename}</code>
            </div>
          </React.Fragment>
        )}

        <div className="editor-popover-label" style={{ marginTop: 12 }}>display</div>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 6, alignItems: 'center' }}>
          <label>fit</label>
          <select value={fit} onChange={(e) => setFit(e.target.value)}>
            {window.imgDisplay.FITS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <label>position</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <select
              value={usingCustomPos ? '__custom' : position}
              onChange={(e) => {
                if (e.target.value === '__custom') {
                  setUsingCustomPos(true);
                } else {
                  setUsingCustomPos(false);
                  setPosition(e.target.value);
                }
              }}
              style={{ flex: 1 }}
            >
              {window.imgDisplay.POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="__custom">custom…</option>
            </select>
            {usingCustomPos && (
              <input
                type="text"
                value={customPosition}
                onChange={(e) => setCustomPosition(e.target.value)}
                placeholder="e.g. 50% 30%"
                style={{ flex: 1 }}
              />
            )}
          </div>

          <label>repeat</label>
          <select value={repeat} onChange={(e) => setRepeat(e.target.value)}>
            {window.imgDisplay.REPEATS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {detailFields.length > 0 && (
          <React.Fragment>
            <div className="editor-popover-label" style={{ marginTop: 12 }}>details</div>
            {detailFields.map((f) => (
              <React.Fragment key={f.key}>
                <div className="editor-popover-label">{f.label}{f.required ? ' *' : ''}</div>
                {f.type === 'text' ? (
                  <textarea value={detailValues[f.key]} placeholder={f.placeholder || ''}
                    onChange={(e) => setDetailValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ minHeight: 60, resize: 'vertical' }} />
                ) : (
                  <input type="text" value={detailValues[f.key]} placeholder={f.placeholder || ''}
                    onChange={(e) => setDetailValues((prev) => ({ ...prev, [f.key]: e.target.value }))} />
                )}
              </React.Fragment>
            ))}
          </React.Fragment>
        )}

        {error && <div className="editor-modal-error">{error}</div>}
        <div className="editor-popover-actions">
          <button data-variant="cancel" onClick={onCancel}>cancel</button>
          <button onClick={onSubmit}>save</button>
        </div>
      </div>
    </div>
  );
};
