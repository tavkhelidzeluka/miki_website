// Animation.jsx — special view for ANIMATION category.
// Horizontal scrolling strip of 16:9 video thumbnails. Click → fullscreen player
// with title/description on the left. Click the text to toggle its visibility.

const ANIMATION_WORKS = [
  { id: "A01", title: "through the magic crystal", date: "10.04.2025", desc: "Character animation for Studio SHAR's feature. Crystal facets rigged separately." },
  { id: "A02", title: "nyaono spot",                date: "22.02.2025", desc: "Animated 30-second commercial, two-frame loops in Photoshop." },
  { id: "A03", title: "polukhutenko",               date: "08.01.2025", desc: "Frame-by-frame rotoscoped music video, 3:42 total runtime." },
  { id: "A04", title: "studio test reel",            date: "15.12.2024", desc: "Bench reel from 2024 — eight clips, no sound." },
  { id: "A05", title: "creature studies",           date: "30.10.2024", desc: "Daily walk-cycle studies. Sketchbook origin, finished line." },
  { id: "A06", title: "berlin loop set",            date: "12.09.2024", desc: "Three-week residency. Twelve loops at 12fps." },
  { id: "A07", title: "crystal facet rig",          date: "04.08.2024", desc: "Test rig for refractive faceted-glass character system." },
  { id: "A08", title: "field test / ii",            date: "18.06.2024", desc: "Second field test — full storyboard timing on twos." },
];

function AnimationStrip({ tweaks }) {
  const { t, lang } = useLang();
  const [playing, setPlaying] = React.useState(null);
  const scrollRef = React.useRef(null);
  const thumbsRef = React.useRef([]);

  // Render the works list 3× for seamless infinite loop.
  const looped = React.useMemo(
    () => [...ANIMATION_WORKS, ...ANIMATION_WORKS, ...ANIMATION_WORKS],
    []
  );
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
              <div className="anim-thumb-img" />
              <div className="anim-thumb-play">▶</div>
              <div className="anim-thumb-meta">
                <span>{w.title.toUpperCase()}</span>
                <span>{w.date}</span>
              </div>
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

  return (
    <div className="anim-player">
      {/* fullscreen "video" surface — black placeholder w/ subtle animation */}
      <div className="anim-player-video">
        <div className="anim-player-vignette" />
        <div className="anim-player-play">▶</div>
      </div>

      <button
        className={"anim-player-overlay" + (hideText ? " anim-player-overlay--hidden" : "")}
        onClick={() => setHideText((x) => !x)}
        aria-label="toggle title visibility"
      >
        <div className="anim-player-id">[ 01 ] {t({ en: "ANIMATION", ua: "АНІМАЦІЯ" })} / {work.id}</div>
        <h2 className="anim-player-title">{work.title}</h2>
        <p className="anim-player-desc">{work.desc}</p>
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
