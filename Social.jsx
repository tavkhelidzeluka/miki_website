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
  posts.forEach((p, i) => {
    out.push({
      ...p,
      _editPath: `social.posts.${i}.src`,
      _listPath: 'social.posts',
      _listIdx: i,
      _label: p.brand || `post ${i + 1}`,
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

function GalleryZoom({ items, idx, onClose, onPrev, onNext, lang, aspect, kindLabel }) {
  const cur = items[idx];
  React.useEffect(() => {
    const h = (e) => {
      if (window.uiKeysBlocked(e)) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onNext, onPrev]);

  if (!cur) return null;

  return (
    <div className="sm2-zoom" onClick={onClose}>
      <div className="sm2-zoom-inner" onClick={(e) => e.stopPropagation()}>
        <button className="sm2-zoom-close" onClick={onClose}>
          [ {lang === "UA" ? "закрити" : "close"} × ]
        </button>
        <div className="sm2-zoom-counter">
          ( {String(idx + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")} )
        </div>

        <button className="sm2-zoom-nav sm2-zoom-nav--prev" onClick={onPrev} aria-label="prev">←</button>
        <div className="sm2-zoom-frame" key={"zf-" + idx} data-aspect={aspect || cur.aspect || "4 / 5"}>
          <div className="sm2-zoom-img" style={{ ...smBg(cur.src), aspectRatio: aspect || cur.aspect || "4 / 5" }} />
        </div>
        <button className="sm2-zoom-nav sm2-zoom-nav--next" onClick={onNext} aria-label="next">→</button>

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
}

function GalleryStrip({ items, aspect, kindLabel, lang, sectionIdx, sectionLabel, variant, pathBase, assetFolder }) {
  const N = items.length;
  const [i, setI] = React.useState(0);
  const [zoom, setZoom] = React.useState(false);
  const at = (off) => items[((i + off) % N + N) % N];
  const offsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

  const goTo = (target) => { if (N > 0) setI(((target % N) + N) % N); };
  const next = () => goTo(i + 1);
  const prev = () => goTo(i - 1);

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
              >
                <div className="sm2-gal-img" style={smBg(item.src, editPath)} />
                {listPath && (
                  <span
                    className="editor-delete-action editor-delete-action--corner"
                    data-editor-action="delete-item"
                    data-editor-list-path={listPath}
                    data-editor-list-index={listIdx}
                    data-editor-item-label={deleteLabel}
                  >×</span>
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
  cur.aspect === "16 / 9"
    ? (lang === "UA" ? "рекламний банер · 16:9" : "ad banner · 16:9")
    : (lang === "UA" ? "рекламний пост · 1:1" : "ad square · 1:1");

function WorkSection({ lang }) {
  const { t } = useLang();
  const s = window.CONTENT.social;
  const workItems = React.useMemo(() => buildWorkItems(s.posts, s.carousels), [s]);
  return (
    <React.Fragment>
      <GalleryStrip
        items={workItems}
        aspect="4 / 5"
        kindLabel={workKindLabel}
        lang={lang}
        sectionIdx={1}
        sectionLabel={t(window.CONTENT.ui.socialPage.sectionPosts)}
        variant="work"
      />
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

function StoriesSection({ lang }) {
  const { t } = useLang();
  const STORIES = window.CONTENT.social.stories;
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

function AdsSection({ lang }) {
  const { t } = useLang();
  const ADS = window.CONTENT.social.ads;
  return (
    <React.Fragment>
      <GalleryStrip
        items={ADS}
        aspect={null}
        kindLabel={adsKindLabel}
        lang={lang}
        sectionIdx={3}
        sectionLabel={t(window.CONTENT.ui.socialPage.sectionAds)}
        variant="ads"
        pathBase="social.ads"
        assetFolder="assets/images/social"
      />
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
        <WorkSection lang={lang} />
        <Statement lang={lang} />
        <StoriesSection lang={lang} />
        <AdsSection lang={lang} />
      </div>
    </div>
  );
}

window.SocialMediaStrip = SocialMediaStrip;


