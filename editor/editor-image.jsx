// Image upload modal. Shows file picker + preview + filename field.

window.__editor = window.__editor || {};

const MAX_BYTES = 5 * 1024 * 1024;

function deriveDefaultFilename(existingPath, suggestedSlug, file) {
  // If we have an existing path, default to overwriting it (same filename).
  if (existingPath) {
    const idx = existingPath.lastIndexOf('/');
    return existingPath.slice(idx + 1);
  }
  // Otherwise: slug + original-file-extension.
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
  const { existingPath, assetFolder, suggestedSlug, onSave, onCancel } = props;
  const [file, setFile] = React.useState(null);
  const [filename, setFilename] = React.useState('');
  const [error, setError] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
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

  const onSubmit = () => {
    if (!file) {
      setError('Pick a file first.');
      return;
    }
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const fullPath = `${assetFolder}/${cleanName}`;
    onSave({ file, path: fullPath });
  };

  return (
    <div className="editor-modal-scrim" onMouseDown={onCancel}>
      <div className="editor-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="editor-popover-label">replace image</div>
        {existingPath && (
          <div className="editor-modal-meta">
            currently: <code>{existingPath}</code>
          </div>
        )}
        <input type="file" accept="image/*" onChange={onPick} />
        {previewUrl && (
          <img src={previewUrl} alt="preview" className="preview" />
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
        {error && <div className="editor-modal-error">{error}</div>}
        <div className="editor-popover-actions">
          <button data-variant="cancel" onClick={onCancel}>cancel</button>
          <button onClick={onSubmit} disabled={!file}>save</button>
        </div>
      </div>
    </div>
  );
};
