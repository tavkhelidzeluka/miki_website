// Animation.jsx — special view for ANIMATION category.
// Horizontal scrolling strip of 16:9 video thumbnails. Click → fullscreen player
// with title/description on the left. Click the text to toggle its visibility.

function AnimationStrip({ tweaks }) {
  // Read at render time (window.CONTENT may not exist at module-eval time
  // due to the async content fetch).
  const ANIMATION_WORKS = window.CONTENT.animations;
  const { t, lang } = useLang();
  const [playing, setPlaying] = React.useState(null);
  const scrollRef = React.useRef(null);
  const thumbsRef = React.useRef([]);

  // Render the works list 3× for seamless infinite loop. Each looped item
  // carries _srcIdx so we can wire data-content-path back to the SOURCE
  // array index in content.json (the three copies otherwise share the same
  // visible content but different DOM nodes).
  const looped = React.useMemo(() => {
    const withSrc = ANIMATION_WORKS.map((w, srcIdx) => ({ ...w, _srcIdx: srcIdx }));
    return [...withSrc, ...withSrc, ...withSrc];
  }, [ANIMATION_WORKS]);
  const baseLen = ANIMATION_WORKS.length;

  // Convert vertical wheel to horizontal scroll on the strip.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Loop logic: keep scroll position inside the middle copy.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;

    const oneCopyWidth = () => {
      // Width of one full list copy = total scrollable width / 3
      return el.scrollWidth / 3;
    };

    // Snap to the middle copy on mount so we can scroll both directions.
    requestAnimationFrame(() => {
      el.scrollLeft = oneCopyWidth();
      update();
    });

    const update = () => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const maxDist = rect.width / 2;
      thumbsRef.current.forEach((t) => {
        if (!t) return;
        const tr = t.getBoundingClientRect();
        const tc = tr.left + tr.width / 2;
        const dist = Math.abs(tc - cx);
        const norm = Math.min(1, dist / maxDist);
        const scale = 1.10 - norm * 0.13;
        t.style.transform = `scale(${scale.toFixed(3)})`;
        t.style.zIndex = Math.round((1 - norm) * 10);
      });
    };

    const onScroll = () => {
      const w = oneCopyWidth();
      // Jump back/forward by one copy when crossing into outer copies.
      // This keeps the user always in the middle copy, creating an
      // infinite-loop illusion without animation hiccups.
      if (el.scrollLeft < w * 0.5) {
        el.scrollLeft += w;
      } else if (el.scrollLeft > w * 2.5) {
        el.scrollLeft -= w;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    el.addEventListener("scroll", onScroll);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="page page--anim" data-fresh="true">
      <div className="anim-label">
        <div className="anim-label-id">[ 01 ]</div>
        <div className="anim-label-cat">{t({ en: "ANIMATION", ua: "АНІМАЦІЯ" })}</div>
        <button
          type="button"
          className="editor-add-tile"
          data-editor-action="add-generic"
          data-editor-add-title="add new animation"
          data-editor-add-schema="animation"
          data-editor-list-path="animations"
        >+ add animation</button>
      </div>

      <div className="anim-strip-wrap">
        <div className="anim-strip" ref={scrollRef}>
          {looped.map((w, idx) => (
            <button
              key={idx}
              ref={(el) => (thumbsRef.current[idx] = el)}
              className="anim-thumb"
              onClick={() => setPlaying(w)}
            >
              <div
                className="anim-thumb-img"
                style={w.thumb ? { backgroundImage: `url("${w.thumb}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                data-content-path={`animations.${w._srcIdx}.thumb`}
                data-editor-kind="image"
                data-asset-folder="assets/images/animations"
                data-content-name={w.title}
              />
              <div className="anim-thumb-play">▶</div>
              <div className="anim-thumb-meta">
                <span data-content-path={`animations.${w._srcIdx}.title`}>{w.title.toUpperCase()}</span>
                <span data-content-path={`animations.${w._srcIdx}.date`}>{w.date}</span>
              </div>
              <span
                className="editor-delete-action editor-delete-action--corner"
                data-editor-action="delete-item"
                data-editor-list-path="animations"
                data-editor-list-index={w._srcIdx}
                data-editor-item-label={w.title}
              >×</span>
            </button>
          ))}
        </div>
      </div>
      <div className="anim-center-line" aria-hidden="true" />

      {playing && (
        <AnimationPlayer work={playing} onClose={() => setPlaying(null)} />
      )}
    </div>
  );
}

function AnimationPlayer({ work, onClose }) {
  const { t } = useLang();
  const [hideText, setHideText] = React.useState(false);

  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Detect YouTube / Vimeo / direct file URLs.
  const renderVideo = () => {
    const url = work.videoUrl;
    if (!url) {
      return (
        <React.Fragment>
          <div className="anim-player-vignette" />
          <div className="anim-player-play">▶</div>
        </React.Fragment>
      );
    }
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (ytMatch) {
      return (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1`}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      );
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      );
    }
    // Direct file (mp4/webm/mov)
    return (
      <video src={url} controls autoPlay style={{ width: "100%", height: "100%" }} />
    );
  };

  return (
    <div className="anim-player">
      {/* fullscreen video surface — placeholder or real video */}
      <div className="anim-player-video">
        {renderVideo()}
      </div>

      <button
        className={"anim-player-overlay" + (hideText ? " anim-player-overlay--hidden" : "")}
        onClick={() => setHideText((x) => !x)}
        aria-label="toggle title visibility"
      >
        <div className="anim-player-id">[ 01 ] {t({ en: "ANIMATION", ua: "АНІМАЦІЯ" })} / <span data-content-path={work._srcIdx !== undefined ? `animations.${work._srcIdx}.id` : undefined}>{work.id}</span></div>
        <h2 className="anim-player-title" data-content-path={work._srcIdx !== undefined ? `animations.${work._srcIdx}.title` : undefined}>{work.title}</h2>
        <p className="anim-player-desc" data-content-path={work._srcIdx !== undefined ? `animations.${work._srcIdx}.desc` : undefined}>{work.desc}</p>
        {work._srcIdx !== undefined && (
          <div
            style={{ marginTop: 8, fontSize: 11, opacity: 0.65, fontFamily: 'monospace', wordBreak: 'break-all' }}
            data-content-path={`animations.${work._srcIdx}.videoUrl`}
          >video: {work.videoUrl || "(click to set URL — YouTube, Vimeo, or .mp4)"}</div>
        )}
        <div className="anim-player-hint">[ {t({ en: "click to hide", ua: "натисніть, щоб сховати" })} ]</div>
      </button>

      {hideText && (
        <button
          className="anim-player-show"
          onClick={() => setHideText(false)}
        >[ {t({ en: "show info", ua: "показати інфо" })} ]</button>
      )}

      <button className="anim-player-close" onClick={onClose}>[ {t({ en: "close", ua: "закрити" })} × ]</button>
    </div>
  );
}

window.AnimationStrip = AnimationStrip;
window.AnimationPlayer = AnimationPlayer;

