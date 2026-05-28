// Social.jsx — Social-media page. Single scrollable page.
// Hero → WORK strip (posts + carousels, Rue-Studio-style horizontal
// gallery) → STORIES grid → ADS → services.

// ─── Pools — read lazily inside each section (window.CONTENT isn't
//     set when this file is evaluated; the content fetch is async). ──

// Builds the flat WORK strip from posts + carousel covers/slides.
function buildWorkItems(posts, carousels) {
  const out = [...posts];
  for (const c of carousels) {
    out.push({ src: c.cover, brand: c.brand, set: c.id, role: "cover" });
    c.slides.forEach((s, i) => {
      out.push({ src: s, brand: c.brand, set: c.id, role: "slide", n: i + 2 });
    });
  }
  return out;
}

// ─── Helpers ────────────────────────────────────────────────────────

const smBg = (url) => url ? {
  backgroundImage: `url("${url}")`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundColor: "var(--paper)",
} : undefined;

// ─── Hero ───────────────────────────────────────────────────────────
// Editorial bracket-typography header. Each big word sits between
// parentheses with a small photographic accent slipped beside it,
// echoing the "(In) (No) (Particular) (Order)" reference.

function SocialHero({ lang }) {
  return (
    <section className="sm2-hero">
      <h1 className="sm2-hero-headline" aria-label="Posts. Stories. Carousels. Ads.">
        <span className="sm2-h-row">
          <span className="sm2-h-word">[&nbsp;{lang === "UA" ? "ПОСТИ" : "POSTS"}&nbsp;]</span>
          <span className="sm2-h-word">[&nbsp;{lang === "UA" ? "СТОРІС" : "STORIES"}&nbsp;]</span>
        </span>
        <span className="sm2-h-row sm2-h-row--center">
          <span className="sm2-h-word sm2-h-word--big">[&nbsp;{lang === "UA" ? "КАРУСЕЛІ" : "CAROUSELS"}&nbsp;]</span>
        </span>
        <span className="sm2-h-row sm2-h-row--end">
          <span className="sm2-h-word">[&nbsp;{lang === "UA" ? "РЕКЛАМА" : "ADS"}&nbsp;]</span>
        </span>
      </h1>
    </section>
  );
}

// ─── Section header ─────────────────────────────────────────────────
function SectionHead({ idx, label, count }) {
  return (
    <header className="sm2-head">
      <span className="sm2-head-id">[ {String(idx).padStart(2, "0")} ]</span>
      <h2 className="sm2-head-label">{label}</h2>
      <span className="sm2-head-count">/ {count}</span>
    </header>
  );
}

// ─── Generic Gallery (centered focus strip + zoom modal) ───────────

function GalleryZoom({ items, idx, onClose, onPrev, onNext, lang, aspect, kindLabel }) {
  const cur = items[idx];
  React.useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onNext, onPrev]);

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

function GalleryStrip({ items, aspect, kindLabel, lang, sectionIdx, sectionLabel, variant }) {
  const N = items.length;
  const [i, setI] = React.useState(0);
  const [zoom, setZoom] = React.useState(false);
  const at = (off) => items[((i + off) % N + N) % N];
  const offsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

  const goTo = (target) => setI(((target % N) + N) % N);
  const next = () => goTo(i + 1);
  const prev = () => goTo(i - 1);

  return (
    <section className={"sm2-section sm2-section--gal sm2-section--" + variant}>
      <SectionHead idx={sectionIdx} label={sectionLabel} count={N} />

      <div className={"sm2-gal sm2-gal--" + variant}>
        <button className="sm2-gal-arrow sm2-gal-arrow--prev" onClick={prev} aria-label="prev">←</button>

        <div className="sm2-gal-strip">
          {offsets.map((off) => {
            const item = at(off);
            const slot = off < 0 ? "n" + (-off) : "" + off;
            const active = off === 0;
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
              >
                <div className="sm2-gal-img" style={smBg(item.src)} />
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
  const s = window.CONTENT.social;
  const workItems = React.useMemo(() => buildWorkItems(s.posts, s.carousels), [s]);
  return (
    <GalleryStrip
      items={workItems}
      aspect="4 / 5"
      kindLabel={workKindLabel}
      lang={lang}
      sectionIdx={1}
      sectionLabel={lang === "UA" ? "ПОСТИ" : "POSTS"}
      variant="work"
    />
  );
}

function StoriesSection({ lang }) {
  const STORIES = window.CONTENT.social.stories;
  return (
    <GalleryStrip
      items={STORIES}
      aspect="9 / 16"
      kindLabel={storyKindLabel}
      lang={lang}
      sectionIdx={2}
      sectionLabel={lang === "UA" ? "СТОРІС" : "STORIES"}
      variant="stories"
    />
  );
}

function AdsSection({ lang }) {
  const ADS = window.CONTENT.social.ads;
  return (
    <GalleryStrip
      items={ADS}
      aspect={null}
      kindLabel={adsKindLabel}
      lang={lang}
      sectionIdx={3}
      sectionLabel={lang === "UA" ? "РЕКЛАМА" : "ADS"}
      variant="ads"
    />
  );
}

// ─── Statement band ─────────────────────────────────────────────────
function Statement({ lang }) {
  return (
    <section className="sm-statement">
      <div className="sm-statement-bg" />
      <h2 className="sm-statement-text">
        {lang === "UA" ? (
          <React.Fragment>
            <span>КОЖЕН ПОСТ</span>
            <span>ЦЕ</span>
            <span>ЗАЯВА</span>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <span>EVERY POST</span>
            <span>IS A</span>
            <span>STATEMENT</span>
          </React.Fragment>
        )}
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
      <span className="sm-outro-line">→ {t({ en: "FOR COLLABORATIONS", ua: "ДЛЯ КОЛАБОРАЦІЙ" })}</span>
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


