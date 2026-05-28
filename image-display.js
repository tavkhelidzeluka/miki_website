// Per-image display settings. Loaded unconditionally so both anonymous
// and logged-in viewers see the same styling.
//
// Content shape:
//   window.CONTENT.imageDisplay = {
//     "projects.0.coverImage":  { fit: "contain", position: "top", repeat: "no-repeat" },
//     "canvas.items.0.img":     { fit: "cover", position: "center" },
//     ...
//   }
//
// Each field is optional. Missing fields fall back to "cover" / "center" /
// "no-repeat" — which match the existing CSS class defaults so existing
// styling is preserved when no settings are stored.

(function () {
  const DEFAULTS = {
    fit: 'cover',
    position: 'center',
    repeat: 'no-repeat',
  };

  window.imgDisplay = function (path) {
    const map = (window.CONTENT && window.CONTENT.imageDisplay) || {};
    const d = (path && map[path]) || {};
    return {
      backgroundSize: d.fit || DEFAULTS.fit,
      backgroundPosition: d.position || DEFAULTS.position,
      backgroundRepeat: d.repeat || DEFAULTS.repeat,
    };
  };

  // Static enums for the editor modal to render dropdowns from.
  window.imgDisplay.FITS = ['cover', 'contain', 'fill', 'none', 'scale-down'];
  window.imgDisplay.POSITIONS = [
    'center',
    'center top',
    'center bottom',
    'left center',
    'right center',
    'top left',
    'top right',
    'bottom left',
    'bottom right',
  ];
  window.imgDisplay.REPEATS = ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'];
  window.imgDisplay.DEFAULTS = DEFAULTS;
})();
