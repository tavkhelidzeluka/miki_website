// Image loading effect for the desktop site (and anything else not already
// handled by the mobile .jimg images in MobilePrototypeArt.jsx).
//
// Desktop pages show most images as inline `background-image` on tiles, so
// instead of touching every component this watches the DOM:
//   - a tile whose background image is still downloading gets .bg-loading
//     (a sweeping placeholder drawn on its ::after), then .bg-reveal as the
//     image arrives (the placeholder fades away, uncovering it);
//   - a plain <img> that hasn't loaded yet stays hidden (.img-loading) and
//     fades in once it has.
// Styles live in index.html next to the <script> tag that loads this file.
//
// A tile is only handled when its ::after is free, and (if it isn't already
// positioned) when it has no children, so the placeholder never fights a
// tile's own overlay or layout.

(function () {
  const URL_RE = /url\(\s*["']?([^"')]+)["']?\s*\)/;
  const tracked = new WeakMap(); // element → background URL it was handled for
  const ready = new Set();       // URLs known to have loaded (or failed)

  function trackBg(el) {
    const m = URL_RE.exec(el.style.backgroundImage || '');
    if (!m || m[1].startsWith('data:')) return;
    const url = m[1];
    if (tracked.get(el) === url) return;
    tracked.set(el, url);
    if (ready.has(url)) { el.classList.remove('bg-loading'); return; }
    if (!el.classList.contains('bg-loading')) {
      if (getComputedStyle(el, '::after').content !== 'none') return;
      // An unpositioned tile gets position: relative while it loads — but
      // only an empty one, so no child ever changes what it's placed against.
      if (getComputedStyle(el).position === 'static') {
        if (el.children.length) return;
        el.classList.add('bg-pos');
      }
    }
    el.classList.add('bg-loading');
    const im = new Image();
    const done = () => {
      ready.add(url);
      if (tracked.get(el) !== url) return; // the tile moved on to another image
      el.classList.remove('bg-loading');
      el.classList.add('bg-reveal');
      setTimeout(() => el.classList.remove('bg-reveal', 'bg-pos'), 450);
    };
    im.onload = im.onerror = done;
    im.src = url;
  }

  function trackImg(img) {
    if (img.classList.contains('jimg') || img.dataset.ldSrc === img.currentSrc + img.src) return;
    img.dataset.ldSrc = img.currentSrc + img.src;
    if (img.complete) return;
    img.classList.add('img-fade', 'img-loading');
    const done = () => img.classList.remove('img-loading');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  }

  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.tagName === 'IMG') trackImg(node);
    else if (node.style && node.style.backgroundImage) trackBg(node);
    node.querySelectorAll('img').forEach(trackImg);
    node.querySelectorAll('[style*="background-image"]').forEach(trackBg);
  }

  new MutationObserver((records) => {
    records.forEach((r) => {
      if (r.type === 'childList') r.addedNodes.forEach(scan);
      else if (r.target.tagName === 'IMG') trackImg(r.target);
      else trackBg(r.target);
    });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'src'] });
})();
