// Social.jsx — Social-media page. Single scrollable page.
// Hero → WORK strip (posts + carousels, Rue-Studio-style horizontal
// gallery) → STORIES grid → ADS → services.

// ─── Pools — read lazily inside each section (window.CONTENT isn't
//     set when this file is evaluated; the content fetch is async). ──

// Builds the flat WORK strip from posts + carousel covers/slides.
function buildWorkItems(posts, carousels) {
  // Each item carries per-item edit metadata so the strip can offer edit +
  // delete affordances even though items come from three different paths
  // in content.json:
  //   _editPath  → image src path in content.json (for image-edit popover)
  //   _listPath  → path to the array this item lives in (for delete)
  //   _listIdx   → index inside that list (for delete)
  //   _label     → friendly name for the delete confirm dialog
  // Carousel covers get _editPath only (no _listPath) because deleting a
  // cover means deleting the whole carousel — out of scope for inline delete.
  const out = [];
  window.visibleEntries(posts).forEach(({ item: p, srcIdx: i }) => {
    out.push({
      ...p,
      _editPath: `social.posts.${i}.src`,
      _listPath: 'social.posts',
      _listIdx: i,
      _label: p.brand || `post ${i + 1}`,
      _hideable: true,
    });
  });
  carousels.forEach((c, ci) => {
    out.push({
      src: c.cover,
      brand: c.brand,
      set: c.id,
      role: 'cover',
      _editPath: `social.carousels.${ci}.cover`,
    });
    c.slides.forEach((s, si) => {
      out.push({
        src: s,
        brand: c.brand,
        set: c.id,
        role: 'slide',
        n: si + 2,
        _editPath: `social.carousels.${ci}.slides.${si}`,
        _listPath: `social.carousels.${ci}.slides`,
        _listIdx: si,
        _label: `${c.brand} slide ${si + 1}`,
      });
    });
  });
  return out;
}

// ─── Helpers ────────────────────────────────────────────────────────

const smBg = (url, path) => url ? {
  backgroundImage: `url("${url}")`,
  backgroundColor: "var(--paper)",
  ...window.imgDisplay(path),
} : undefined;

// ─── Hero ───────────────────────────────────────────────────────────
// Editorial bracket-typography header. Each big word sits between
// parentheses with a small photographic accent slipped beside it,
// echoing the "(In) (No) (Particular) (Order)" reference.

function SocialHero({ lang }) {
  const { t } = useLang();
  return (
    <section className="sm2-hero">
      <h1 className="sm2-hero-headline" aria-label="Posts. Stories. Carousels. Ads.">
        <span className="sm2-h-row">
          <span className="sm2-h-word">[&nbsp;<span data-content-path="ui.socialPage.heroPosts">{t(window.CONTENT.ui.socialPage.heroPosts)}</span>&nbsp;]</span>
          <span className="sm2-h-word">[&nbsp;<span data-content-path="ui.socialPage.heroStories">{t(window.CONTENT.ui.socialPage.heroStories)}</span>&nbsp;]</span>
        </span>
        <span className="sm2-h-row sm2-h-row--center">
          <span className="sm2-h-word sm2-h-word--big">[&nbsp;<span data-content-path="ui.socialPage.heroCarousels">{t(window.CONTENT.ui.socialPage.heroCarousels)}</span>&nbsp;]</span>
        </span>
        <span className="sm2-h-row sm2-h-row--end">
          <span className="sm2-h-word">[&nbsp;<span data-content-path="ui.socialPage.heroAds">{t(window.CONTENT.ui.socialPage.heroAds)}</span>&nbsp;]</span>
        </span>
      </h1>
    </section>
  );
}

// ─── Section header ─────────────────────────────────────────────────
function SectionHead({ idx, label, count, current }) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <header className="sm2-head">
      <span className="sm2-head-id">[ {pad(idx)} ]</span>
      <h2 className="sm2-head-label">{label}</h2>
      <span className="sm2-head-count">{current !== undefined ? `${pad(current + 1)} / ${pad(count)}` : `/ ${count}`}</span>
    </header>
  );
}

// ─── Generic Gallery (centered focus strip + zoom modal) ───────────

// How long each story stays up before the viewer moves on (matches the fill
// animation on the progress segment in index.html).
const STORY_MS = 5000;

function GalleryZoom({ items, idx, onClose, onPrev, onNext, onGroupPrev, onGroupNext, lang, aspect, kindLabel }) {
  const cur = items[idx];
  // Arrows and arrow keys step through the stories of this group; they move to
  // the neighbouring group only from the group's last story (next) or first (previous).
  const goNext = () => {
    if (idx < items.length - 1 || !onGroupNext) onNext();
    else onGroupNext();
  };
  const goPrev = () => {
    if (idx > 0 || !onGroupPrev) onPrev();
    else onGroupPrev();
  };
  React.useEffect(() => {
    const h = (e) => {
      if (window.uiKeysBlocked(e)) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onNext, onPrev]);

  // Stories autoplay like Instagram: each one advances after STORY_MS, and the
  // last one closes the viewer. The ref keeps the timer on the latest callbacks
  // without restarting it on every parent render.
  const isStory = aspect === "9 / 16";
  const advance = React.useRef(null);
  // At the end of a group, autoplay moves on to the next group (or closes).
  advance.current = () => {
    if (idx < items.length - 1) onNext();
    else if (onGroupNext) onGroupNext();
    else onClose();
  };
  // Swipe sideways on the story: left goes to the next group, right to the previous.
  const swipe = React.useRef(null);
  const onFrameTouchStart = (e) => {
    const t0 = e.touches[0];
    swipe.current = { x: t0.clientX, y: t0.clientY };
  };
  const onFrameTouchEnd = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const t1 = e.changedTouches[0];
    const dx = t1.clientX - s.x, dy = t1.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && onGroupNext) onGroupNext();
      else if (dx > 0 && onGroupPrev) onGroupPrev();
    }
  };
  React.useEffect(() => {
    if (!isStory || !cur) return;
    const t = setTimeout(() => advance.current(), STORY_MS);
    return () => clearTimeout(t);
  }, [idx, isStory]);

  if (!cur) return null;

  const ytMatch = cur.videoUrl && cur.videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  const ytId = ytMatch ? ytMatch[1] : null;

  const zoom = (
    <div className="sm2-zoom" data-story={isStory ? "true" : undefined} onClick={onClose}>
      <div className="sm2-zoom-inner" onClick={(e) => e.stopPropagation()}>
        <button className="sm2-zoom-close" onClick={onClose}>
          [ {lang === "UA" ? "закрити" : "close"} × ]
        </button>
        <div className="sm2-zoom-counter">
          ( {String(idx + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")} )
        </div>

        <button className="sm2-zoom-nav sm2-zoom-nav--prev" onClick={goPrev} aria-label="prev">←</button>
        <div
          className="sm2-zoom-frame"
          key={"zf-" + idx}
          data-aspect={aspect || cur.aspect || "4 / 5"}
          onTouchStart={onFrameTouchStart}
          onTouchEnd={onFrameTouchEnd}
          onClick={(e) => {
            if (ytId) return; // the video player takes its own clicks
            // Instagram-style: the left half goes back, the right half forward.
            const r = e.currentTarget.getBoundingClientRect();
            if (e.clientX - r.left < r.width / 2) goPrev();
            else goNext();
          }}
        >
          {ytId ? (
            <iframe
              className="sm2-zoom-video"
              src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
              style={{ aspectRatio: aspect || cur.aspect || "16 / 9" }}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              title={cur.brand}
            />
          ) : (
            <div className="sm2-zoom-img" style={{ ...smBg(cur.src), aspectRatio: aspect || cur.aspect || "4 / 5" }} />
          )}
          {isStory && <div className="sm2-zoom-head">{cur.brand}</div>}
          {aspect === "9 / 16" && (
            <div className="sm2-zoom-progress">
              {items.map((_, i) => (
                <span
                  key={i}
                  className={"sm2-zoom-seg" + (i < idx ? " is-done" : i === idx ? " is-active" : "")}
                />
              ))}
            </div>
          )}
        </div>
        <button className="sm2-zoom-nav sm2-zoom-nav--next" onClick={goNext} aria-label="next">→</button>

        <div className="sm2-zoom-meta">
          <span className="sm2-zoom-bracket">[</span>
          <span className="sm2-zoom-brand">{cur.brand}</span>
          <span className="sm2-zoom-sep">·</span>
          <span className="sm2-zoom-kind">{kindLabel(cur, lang)}</span>
          <span className="sm2-zoom-bracket">]</span>
        </div>
      </div>
    </div>
  );
  // Portal to <body>: the desktop canvas is CSS-scaled with a transform, and a
  // transformed ancestor would confine this position:fixed overlay to that box,
  // pushing the close button and the caption off screen.
  return ReactDOM.createPortal(zoom, document.body);
}

function GalleryStrip({ items, aspect, kindLabel, lang, sectionIdx, sectionLabel, variant, pathBase, assetFolder }) {
  const N = items.length;
  const [i, setI] = React.useState(0);
  const [zoom, setZoom] = React.useState(false);
  // The pool shrinks when hidden items leave it (edit mode off) — clamp the
  // position so the SectionHead counter never reads e.g. "05 / 03".
  React.useEffect(() => {
    if (N > 0 && i >= N) setI(0);
  }, [N, i]);
  const at = (off) => items[((i + off) % N + N) % N];
  const offsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

  const goTo = (target) => { if (N > 0) setI(((target % N) + N) % N); };
  // Stories stop at the first and last one instead of wrapping around.
  const next = () => { if (variant !== "stories" || i < N - 1) goTo(i + 1); };
  const prev = () => { if (variant !== "stories" || i > 0) goTo(i - 1); };

  // A group that is a single video: show the player itself, full width,
  // instead of a carousel that would repeat the one tile with arrows.
  const soloVideo = N === 1 && items[0].videoUrl
    ? (items[0].videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/) || [])[1]
    : null;
  if (soloVideo) {
    return (
      <section className={"sm2-section sm2-section--video sm2-section--" + variant}>
        <SectionHead idx={sectionIdx} label={sectionLabel} count={1} current={0} />
        <div className="sm2-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${soloVideo}?rel=0`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            title={items[0].brand}
          />
        </div>
      </section>
    );
  }

  // Every item deleted — show the section header + placeholder instead of
  // indexing into an empty pool (items[NaN]). The parent section keeps its
  // "+ add" buttons below, so new items can still be created.
  if (N === 0) {
    return (
      <section className={"sm2-section sm2-section--gal sm2-section--" + variant}>
        <SectionHead idx={sectionIdx} label={sectionLabel} count={0} />
        <EmptyState />
      </section>
    );
  }

  return (
    <section className={"sm2-section sm2-section--gal sm2-section--" + variant}>
      <SectionHead idx={sectionIdx} label={sectionLabel} count={N} current={i} />

      <div className={"sm2-gal sm2-gal--" + variant}>
        <button className="sm2-gal-arrow sm2-gal-arrow--prev" onClick={prev} aria-label="prev">←</button>

        <div className="sm2-gal-strip">
          {offsets.map((off) => {
            const item = at(off);
            const slot = off < 0 ? "n" + (-off) : "" + off;
            const active = off === 0;
            const tileIdx = ((i + off) % N + N) % N;
            // Prefer per-item metadata (work strip), fall back to pathBase
            // (stories / ads).
            const editPath = item._editPath || (pathBase ? `${pathBase}.${tileIdx}.src` : null);
            const listPath = item._listPath || pathBase;
            const listIdx = item._listIdx !== undefined ? item._listIdx : tileIdx;
            const deleteLabel = item._label || item.brand || `item ${tileIdx + 1}`;
            const tileProps = editPath
              ? {
                  'data-content-path': editPath,
                  'data-editor-kind': 'image',
                  'data-asset-folder': assetFolder || 'assets/images/social',
                  'data-content-name': item.brand,
                }
              : {};
            return (
              <button
                key={"g-" + i + "-" + off}
                className={"sm2-gal-tile sm2-gal-tile--o" + slot + (active ? " sm2-gal-tile--active" : "")}
                onClick={() => {
                  if (active) setZoom(true);
                  else goTo(i + off);
                }}
                aria-label={item.brand}
                style={{ aspectRatio: aspect || item.aspect || "4 / 5" }}
                {...tileProps}
                {...(listPath ? {
                  'data-editor-reorder-path': listPath,
                  'data-editor-reorder-index': listIdx,
                } : {})}
                {...(item.hidden ? { 'data-item-hidden': 'true' } : {})}
              >
                <div className="sm2-gal-img" style={smBg(item.src, editPath)} />
                {item.videoUrl && <span className="sm2-gal-play" aria-hidden="true">[ ▶ ]</span>}
                {listPath && (
                  <span
                    className="editor-delete-action editor-delete-action--corner"
                    data-editor-action="delete-item"
                    data-editor-list-path={listPath}
                    data-editor-list-index={listIdx}
                    data-editor-item-label={deleteLabel}
                  >×</span>
                )}
                {listPath && item._hideable && (
                  <span
                    className="editor-hide-action editor-hide-action--corner"
                    data-editor-action="toggle-hide"
                    data-editor-list-path={listPath}
                    data-editor-list-index={listIdx}
                  >{item.hidden ? '◉' : '⊘'}</span>
                )}
              </button>
            );
          })}
        </div>

        <button className="sm2-gal-arrow sm2-gal-arrow--next" onClick={next} aria-label="next">→</button>
      </div>

      {zoom && (
        <GalleryZoom
          items={items}
          idx={i}
          onClose={() => setZoom(false)}
          onPrev={prev}
          onNext={next}
          lang={lang}
          aspect={aspect}
          kindLabel={kindLabel}
        />
      )}
    </section>
  );
}

// Kind-label helpers per gallery
const workKindLabel = (cur, lang) =>
  cur.role === "cover"
    ? (lang === "UA" ? "обкладинка карусели · #" + cur.set : "carousel cover · #" + cur.set)
    : cur.role === "slide"
      ? (lang === "UA" ? "слайд карусели #" + cur.set + " / " + cur.n : "carousel slide #" + cur.set + " / " + cur.n)
      : (lang === "UA" ? "стрічковий пост" : "feed post");

const storyKindLabel = (cur, lang) =>
  lang === "UA" ? "сторіс · 9:16" : "story · 9:16";

const adsKindLabel = (cur, lang) =>
  cur.videoUrl
    ? (lang === "UA" ? "рекламне відео" : "ad video")
    : cur.aspect === "16 / 9"
    ? (lang === "UA" ? "рекламний банер · 16:9" : "ad banner · 16:9")
    : (lang === "UA" ? "рекламний пост · 1:1" : "ad square · 1:1");

// Desktop rows, grouped the way the mobile social screen groups them: posts by
// brand, one row per carousel, ads by brand. Each group is its own row, and
// tapping a tile opens the viewer on that row.
function socialRowGroups(list, kind) {
  const m = new Map();
  window.visibleEntries(list).forEach(({ item }) => {
    const b = item.brand || "—";
    if (!m.has(b)) m.set(b, []);
    m.get(b).push({ src: item.src, brand: item.brand, aspect: item.aspect, videoUrl: item.videoUrl });
  });
  return [...m.entries()].map(([brand, items]) => ({ key: `${kind}:${brand}`, kind, label: brand, items }));
}
function workRowGroups(s) {
  const out = socialRowGroups(s.posts, "posts");
  window.visibleEntries(s.carousels).forEach(({ item: c }) => {
    const srcs = [c.cover, ...(c.slides || [])].filter(Boolean);
    out.push({
      key: `carousel:${c.id}`,
      kind: "carousel",
      label: c.title || c.titleEn || c.brand,
      items: srcs.map((src, si) => ({
        src,
        brand: c.brand,
        role: si === 0 ? "cover" : "slide",
        set: c.id,
        n: srcs.length - 1,
      })),
    });
  });
  return out;
}
// One carousel strip per group, so each group sits in its own row.
function SocialRows({ groups, lang, aspect, kindLabel, variant }) {
  return (
    <React.Fragment>
      {groups.map((g, gi) => (
        <GalleryStrip
          key={g.key}
          items={g.items}
          aspect={aspect}
          kindLabel={kindLabel}
          lang={lang}
          sectionIdx={gi + 1}
          sectionLabel={g.label}
          variant={variant}
        />
      ))}
    </React.Fragment>
  );
}

function WorkSection({ lang }) {
  const { t } = useLang();
  const s = window.CONTENT.social;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const groups = workRowGroups(s);
  const count = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <React.Fragment>
      <SectionHead idx={1} label={t(window.CONTENT.ui.socialPage.sectionPosts)} count={count} />
      <SocialRows groups={groups} lang={lang} aspect="4 / 5" kindLabel={workKindLabel} variant="work" />
      <div style={{ textAlign: 'center', marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="editor-add-tile"
          data-editor-action="add-generic"
          data-editor-add-title="add new post"
          data-editor-add-schema="socialTile"
          data-editor-list-path="social.posts"
          data-editor-asset-folder="assets/images/social"
        >+ add post</button>
        <button
          type="button"
          className="editor-add-tile"
          data-editor-action="add-generic"
          data-editor-add-title="add new carousel"
          data-editor-add-schema="carousel"
          data-editor-list-path="social.carousels"
          data-editor-asset-folder="assets/images/social"
          data-editor-add-defaults='{"slides":[]}'
        >+ add carousel</button>
      </div>
    </React.Fragment>
  );
}

// Desktop Social page stories block: the Instagram-style tray.
function StoriesSection({ lang }) {
  return <StoryTrayStrip lang={lang} />;
}

// The 9:16 story carousel (arrows and tiles), opened in the story viewer.
function CarouselStories({ lang }) {
  const { t } = useLang();
  const STORIES = window.visibleEntries(window.CONTENT.social.stories).map(({ item, srcIdx }) => ({
    ...item,
    _editPath: `social.stories.${srcIdx}.src`,
    _listPath: 'social.stories',
    _listIdx: srcIdx,
    _label: item.brand || `story ${srcIdx + 1}`,
    _hideable: true,
  }));
  return (
    <React.Fragment>
      <GalleryStrip
        items={STORIES}
        aspect="9 / 16"
        kindLabel={storyKindLabel}
        lang={lang}
        sectionIdx={2}
        sectionLabel={t(window.CONTENT.ui.socialPage.sectionStories)}
        variant="stories"
        pathBase="social.stories"
        assetFolder="assets/images/social"
      />
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button
          type="button"
          className="editor-add-tile"
          data-editor-action="add-generic"
          data-editor-add-title="add new story"
          data-editor-add-schema="socialTile"
          data-editor-list-path="social.stories"
          data-editor-asset-folder="assets/images/social"
        >+ add story</button>
      </div>
    </React.Fragment>
  );
}

// Which stories the visitor has already opened. Kept per browser, so a story
// turns "seen" (grey ring) the way it does on Instagram.
const STORIES_SEEN_KEY = "miki-stories-seen";
function readSeenStories() {
  try { return JSON.parse(localStorage.getItem(STORIES_SEEN_KEY) || "[]"); }
  catch (_) { return []; }
}
function writeSeenStories(list) {
  try { localStorage.setItem(STORIES_SEEN_KEY, JSON.stringify(list)); }
  catch (_) { /* storage can be blocked; the ring just won't persist */ }
}
// The story each brand was last left on, so reopening it resumes there.
const STORIES_POS_KEY = "miki-stories-pos";
function readStoryPos() {
  try { return JSON.parse(localStorage.getItem(STORIES_POS_KEY) || "{}"); }
  catch (_) { return {}; }
}
function writeStoryPos(map) {
  try { localStorage.setItem(STORIES_POS_KEY, JSON.stringify(map)); }
  catch (_) { /* storage can be blocked; the position just won't persist */ }
}

// Instagram-style story tray: a row of square thumbnails with a ring (dark when
// unseen, grey once opened) and the brand underneath. Tapping one opens the
// viewer, which autoplays through the stories in order.
function StoryTrayStrip({ lang }) {
  const { t } = useLang();
  const STORIES = window.visibleEntries(window.CONTENT.social.stories).map(({ item, srcIdx }) => ({
    ...item,
    _editPath: `social.stories.${srcIdx}.src`,
    _listPath: 'social.stories',
    _listIdx: srcIdx,
    _label: item.brand || `story ${srcIdx + 1}`,
    _hideable: true,
  }));
  // One tray item per brand, like Instagram's per-account rings: the ring only
  // turns grey once every story of that brand has been opened.
  const groups = [];
  STORIES.forEach((s) => {
    const key = s.brand || "—";
    let g = groups.find((x) => x.brand === key);
    if (!g) { g = { brand: key, items: [] }; groups.push(g); }
    g.items.push(s);
  });
  const G = groups.length;
  const trayRef = React.useRef(null);
  const [openGroup, setOpenGroup] = React.useState(-1);
  const [openIdx, setOpenIdx] = React.useState(0);
  const [seen, setSeen] = React.useState(readSeenStories);
  const [pos, setPos] = React.useState(readStoryPos);
  const openStory = (g, i) => {
    setOpenGroup(g);
    setOpenIdx(i);
    const item = groups[g].items[i];
    if (item.src && !seen.includes(item.src)) {
      const next = [...seen, item.src];
      setSeen(next);
      writeSeenStories(next);
    }
    // Remember where the visitor stopped in this brand.
    const nextPos = { ...pos, ["stories:" + groups[g].brand]: i };
    setPos(nextPos);
    writeStoryPos(nextPos);
  };
  // Tapping a brand resumes at the story it was left on.
  const startGroup = (g) => {
    const saved = pos["stories:" + groups[g].brand] || 0;
    openStory(g, Math.min(saved, groups[g].items.length - 1));
  };
  // Swipe (or the end of a brand's autoplay) moves to the neighbouring brand;
  // past the last or first one, the viewer closes.
  const moveGroup = (d) => {
    const ng = openGroup + d;
    if (ng < 0 || ng >= G) setOpenGroup(-1);
    else startGroup(ng);
  };
  const cur = openGroup >= 0 ? groups[openGroup] : null;
  const nextStory = () => { if (cur && openIdx < cur.items.length - 1) openStory(openGroup, openIdx + 1); };
  const prevStory = () => { if (cur && openIdx > 0) openStory(openGroup, openIdx - 1); };

  return (
    <React.Fragment>
      <section className="sm2-section sm2-section--gal sm2-section--stories">
        <SectionHead idx={2} label={t(window.CONTENT.ui.socialPage.sectionStories)} count={G} current={Math.max(openGroup, 0)} />
        {(
          <div className="sm2-tray-wrap">
          <button type="button" className="sm2-tray-arrow sm2-tray-arrow--prev" onClick={() => trayRef.current && trayRef.current.scrollBy({ left: -260, behavior: "smooth" })} aria-label="scroll stories back">‹</button>
          <div className="sm2-tray" ref={trayRef}>
            {/* Edit mode only (the editor shows .editor-add-tile): a new story at the start of the row, like Instagram's "+" tile. */}
            <button
              type="button"
              className="editor-add-tile sm2-tray-add"
              data-editor-action="add-generic"
              data-editor-add-title="add new story"
              data-editor-add-schema="socialTile"
              data-editor-list-path="social.stories"
              data-editor-asset-folder="assets/images/social"
              data-editor-add-defaults='{"brand":"MIKI"}'
            >
              <span className="sm2-tray-ring sm2-tray-add-ring">
                <span className="sm2-tray-img sm2-tray-add-plus">+</span>
              </span>
              <span className="sm2-tray-brand">add story</span>
            </button>
            {groups.map((g, gi) => {
              const first = g.items[0];
              const done = g.items.every((s) => seen.includes(s.src));
              return (
                <button
                  key={g.brand}
                  type="button"
                  className={"sm2-tray-item" + (done ? " is-seen" : "")}
                  onClick={() => startGroup(gi)}
                  aria-label={g.brand}
                  {...(first._editPath ? {
                    'data-content-path': first._editPath,
                    'data-editor-kind': 'image',
                    'data-asset-folder': 'assets/images/social',
                    'data-content-name': g.brand,
                  } : {})}
                >
                  <span className="sm2-tray-ring">
                    <span className="sm2-tray-img" style={smBg(first.src, first._editPath)} />
                  </span>
                  <span className="sm2-tray-brand">{g.brand}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="sm2-tray-arrow sm2-tray-arrow--next" onClick={() => trayRef.current && trayRef.current.scrollBy({ left: 260, behavior: "smooth" })} aria-label="scroll stories forward">›</button>
          </div>
        )}
      </section>
      {cur && (
        <GalleryZoom
          items={cur.items}
          idx={openIdx}
          onClose={() => setOpenGroup(-1)}
          onPrev={prevStory}
          onNext={nextStory}
          onGroupPrev={() => moveGroup(-1)}
          onGroupNext={() => moveGroup(1)}
          lang={lang}
          aspect="9 / 16"
          kindLabel={storyKindLabel}
        />
      )}
    </React.Fragment>
  );
}

function AdsSection({ lang }) {
  const { t } = useLang();
  const groups = socialRowGroups(window.CONTENT.social.ads, "ads");
  const count = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <React.Fragment>
      <SectionHead idx={3} label={t(window.CONTENT.ui.socialPage.sectionAds)} count={count} />
      <SocialRows groups={groups} lang={lang} aspect={null} kindLabel={adsKindLabel} variant="ads" />
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button
          type="button"
          className="editor-add-tile"
          data-editor-action="add-generic"
          data-editor-add-title="add new ad"
          data-editor-add-schema="socialTile"
          data-editor-list-path="social.ads"
          data-editor-asset-folder="assets/images/social"
        >+ add ad</button>
      </div>
    </React.Fragment>
  );
}

// ─── Statement band ─────────────────────────────────────────────────
function Statement({ lang }) {
  const { t } = useLang();
  return (
    <section className="sm-statement">
      <div className="sm-statement-bg" />
      <h2 className="sm-statement-text">
        <span data-content-path="ui.socialPage.statementLine1">{t(window.CONTENT.ui.socialPage.statementLine1)}</span>
        <span data-content-path="ui.socialPage.statementLine2">{t(window.CONTENT.ui.socialPage.statementLine2)}</span>
        <span data-content-path="ui.socialPage.statementLine3">{t(window.CONTENT.ui.socialPage.statementLine3)}</span>
      </h2>
      <div className="sm-statement-corner sm-statement-corner--tl">[</div>
      <div className="sm-statement-corner sm-statement-corner--tr">]</div>
      <div className="sm-statement-corner sm-statement-corner--bl">→</div>
      <div className="sm-statement-corner sm-statement-corner--br">←</div>
    </section>
  );
}

// ─── Outro ──────────────────────────────────────────────────────────
function Outro({ t }) {
  return (
    <section className="sm-outro">
      <span className="sm-outro-line">→ <span data-content-path="ui.socialPage.outroCta">{t(window.CONTENT.ui.socialPage.outroCta)}</span></span>
      <a className="sm-outro-mail" href="mailto:seriton3@gmail.com">
        seriton3@gmail.com
      </a>
    </section>
  );
}

// ─── Page ───────────────────────────────────────────────────────────
function SocialMediaStrip({ tweaks }) {
  const { t, lang } = useLang();

  return (
    <div className="page page--sm page--sm2">
      <div className="sm-scroll">
        <SocialHero lang={lang} />
        <StoriesSection lang={lang} />
        <WorkSection lang={lang} />
        <Statement lang={lang} />
        <AdsSection lang={lang} />
      </div>
    </div>
  );
}

window.SocialMediaStrip = SocialMediaStrip;


