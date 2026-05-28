// Projects.jsx — 3×3 grid of categories; click a tile → horizontal strip of works.

// Category-label translations. The English label remains the canonical ID.
const CAT_UA = {
  "ANIMATION":     "АНІМАЦІЯ",
  "ILLUSTRATION":  "ІЛЮСТРАЦІЯ",
  "POSTERS":       "ПОСТЕРИ",
  "CANVAS":        "ПОЛОТНА",
  "BOOKS":         "КНИГИ",
  "PHOTOS":        "ФОТО",
  "SOCIAL MEDIA":  "СОЦМЕРЕЖІ",
};
const tCat = (en, lang) => (lang === "UA" && CAT_UA[en]) ? CAT_UA[en] : en;

// Categories that use the horizontal strip view.
// Others (BOOKS) open the project detail overlay directly.
// ANIMATION + SOCIAL MEDIA are special — their own custom views.
const STRIP_CATS = new Set(["02", "03", "04", "06"]); // ILLUSTRATION, POSTERS, CANVAS, PHOTOS
const ANIM_CAT = "01";
const SOCIAL_CAT = "07";

function Projects({ tweaks, openDetail, categoryId, setCategoryId }) {
  // Read at render time, not module-eval time — window.CONTENT may not be
  // set yet when Babel evaluates this file (the content fetch is async).
  const ALL_PROJECTS = window.CONTENT.projects;
  const { t, lang } = useLang();
  // Run entrance animation only on first mount.
  const [fresh, setFresh] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setFresh(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const tileBg = (() => {
    if (tweaks.tileStyle === "halftone") return "proj-tile proj-tile--halftone";
    if (tweaks.tileStyle === "checker")  return "proj-tile proj-tile--checker";
    return "proj-tile";
  })();

  const handleTileClick = (p) => {
    if (p.id === ANIM_CAT) {
      setCategoryId(p.id);
    } else if (p.id === SOCIAL_CAT) {
      setCategoryId(p.id);
    } else if (STRIP_CATS.has(p.id)) {
      setCategoryId(p.id);
    } else {
      // Books — open detail overlay directly.
      openDetail(p);
    }
  };

  if (categoryId === ANIM_CAT) {
    return <AnimationStrip tweaks={tweaks} />;
  }
  if (categoryId === SOCIAL_CAT) {
    return <SocialMediaStrip tweaks={tweaks} />;
  }
  if (categoryId) {
    const cat = ALL_PROJECTS.find((p) => p.id === categoryId);
    return (
      <CategoryStrip
        category={cat}
        tweaks={tweaks}
        openDetail={openDetail}
      />
    );
  }

  return (
    <div className="page page--projects" data-fresh={fresh ? "true" : "false"}>
      {/* headline */}
      <div className="proj-headline">
        <span className="bk-bracket">[</span>
        <span className="bk-word">{t({ en: "PROJECTS", ua: "ПРОЄКТИ" })}</span>
        <span className="bk-bracket">]</span>
      </div>

      {/* grid */}
      <div className="proj-gridv2">
        {ALL_PROJECTS.map((p, idx) => (
          <button
            key={p.id}
            className="proj-card"
            onClick={() => handleTileClick(p)}
            style={{ animationDelay: `${80 + idx * 60}ms` }}
          >
            <div
              className={tileBg + (p.category === "ANIMATION" ? " proj-tile--cover proj-tile--anim" : p.category === "CANVAS" ? " proj-tile--cover proj-tile--canvas" : p.category === "ILLUSTRATION" ? " proj-tile--cover proj-tile--illustration" : p.category === "POSTERS" ? " proj-tile--cover proj-tile--posters" : p.category === "PHOTOS" ? " proj-tile--cover proj-tile--photos" : p.category === "SOCIAL MEDIA" ? " proj-tile--cover proj-tile--social" : "")}
            >
              <span className="proj-tile-hover">[ {t({ en: "open", ua: "відкрити" })} → ]</span>
            </div>
            <div className="proj-card-foot">
              <span className="proj-card-id">[ {p.id} ]</span>
              <span className="proj-card-cat">{tCat(p.category, lang)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Category strip — horizontal carousel of works within one category. ───
function CategoryStrip({ category, tweaks, openDetail }) {
  const { lang } = useLang();
  const works = category.works || [];
  const [i, setI] = React.useState(0);
  const [pulse, setPulse] = React.useState(false);
  const cur = works[i] || works[0];

  // Brief "pulse" class on transition — used to bump the new center thumb.
  const triggerPulse = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 380);
  };

  const next = React.useCallback(() => {
    setI((x) => (x + 1) % works.length);
    triggerPulse();
  }, [works.length]);
  const prev = React.useCallback(() => {
    setI((x) => (x - 1 + works.length) % works.length);
    triggerPulse();
  }, [works.length]);

  // Keyboard
  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Enter") openDetail && openDetail({ ...category, name: cur.name, desc: cur.desc, prose: category.prose });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, openDetail, cur, category]);

  // Visible window — 3 thumbs on each side of active.
  const order = [];
  for (let off = -3; off <= 3; off++) {
    order.push((i + off + works.length) % works.length);
  }

  const baseClass = tweaks.tileStyle === "halftone"
    ? "cat-thumb proj-tile--halftone"
    : tweaks.tileStyle === "checker"
      ? "cat-thumb proj-tile--checker"
      : "cat-thumb";

  return (
    <div className="page page--cat" data-fresh="true">
      <div className="cat-label">
        <div>
          <div className="cat-label-id">[ {category.id} ]</div>
          <div className="cat-label-cat">{tCat(category.category, lang)}</div>
        </div>
      </div>

      <button className="cat-arrow cat-arrow--prev" aria-label="prev" onClick={prev}>←</button>

      <div className="cat-strip">
        {order.map((idx, j) => {
          const isActive = j === 3;
          const w = works[idx];
          const hasImg = !!(w && w.thumb);
          const cls = baseClass
            + (hasImg ? " cat-thumb--img" : "")
            + (isActive ? " cat-thumb--active" : "")
            + (isActive && pulse ? " cat-thumb--pulse" : "");
          const style = hasImg ? { backgroundImage: `url("${w.thumb}")` } : undefined;
          const catIdx = (window.CONTENT.projects || []).findIndex(p => p.id === category.id);
          const assetFolder = `assets/images/projects/${(category.category || "").toLowerCase().replace(/\s+/g, '-')}`;
          return (
            <div
              key={"slot-" + j}
              className={cls}
              style={style}
              data-content-path={`projects.${catIdx}.works.${idx}.thumb`}
              data-editor-kind="image"
              data-asset-folder={assetFolder}
              data-content-name={w && w.name}
              onClick={() => {
                if (isActive) {
                  openDetail({ ...category, name: cur.name, desc: cur.desc, thumb: cur.thumb, prose: category.prose, workIndex: i });
                } else if (j < 3) {
                  for (let k = 0; k < 3 - j; k++) prev();
                } else {
                  for (let k = 0; k < j - 3; k++) next();
                }
              }}
            />
          );
        })}
      </div>

      <button className="cat-arrow cat-arrow--next" aria-label="next" onClick={next}>→</button>

      <div className="cat-meta" key={cur.name}>
        <div className="cat-meta-row">
          <span className="cat-bracket">[</span>
          <span className="cat-name" data-content-path={`projects.${(window.CONTENT.projects || []).findIndex(p => p.id === category.id)}.works.${i}.name`}>{cur.name}</span>
          <span className="cat-bracket">]</span>
        </div>
        <div className="cat-desc" data-content-path={`projects.${(window.CONTENT.projects || []).findIndex(p => p.id === category.id)}.works.${i}.desc`}>{cur.desc}</div>
      </div>
    </div>
  );
}

function ProjectDetail({ project, onClose, onNext, onPrev, tweaks }) {
  const { t, lang } = useLang();
  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNext, onPrev]);

  const hasImg = !!project.thumb;
  const baseImgClass = hasImg ? "detail-image detail-image--img" : "detail-image";
  const imgClass = tweaks.tileStyle === "halftone"
    ? baseImgClass + " detail-image--halftone"
    : tweaks.tileStyle === "checker"
      ? baseImgClass + " proj-tile--checker"
      : baseImgClass;
  const imgStyle = hasImg ? { backgroundImage: `url("${project.thumb}")` } : undefined;

  return (
    <div className="detail-scrim">
      <button className="detail-close" onClick={onClose}>[ {t({ en: "close", ua: "закрити" })} × ]</button>

      <div className="detail-grid">
        {(() => {
          const pIdx = (window.CONTENT.projects || []).findIndex(p => p.id === project.id);
          const wIdx = project.workIndex;
          const thumbPath = wIdx !== undefined
            ? `projects.${pIdx}.works.${wIdx}.thumb`
            : null;
          const assetFolder = `assets/images/projects/${(project.category || "").toLowerCase().replace(/\s+/g, '-')}`;
          return (
            <div
              className={imgClass}
              style={imgStyle}
              {...(thumbPath && {
                'data-content-path': thumbPath,
                'data-editor-kind': 'image',
                'data-asset-folder': assetFolder,
                'data-content-name': project.name,
              })}
            >
              <div className="detail-image-label">[ {project.id} ] · {project.medium}</div>
            </div>
          );
        })()}
        <div>
          {(() => {
            const pIdx = (window.CONTENT.projects || []).findIndex(p => p.id === project.id);
            const wIdx = project.workIndex;
            const base = `projects.${pIdx}`;
            // Title + desc are work-level (overridden in openDetail); the rest
            // are project-level.
            const namePath = wIdx !== undefined ? `${base}.works.${wIdx}.name` : `${base}.name`;
            const descPath = wIdx !== undefined ? `${base}.works.${wIdx}.desc` : `${base}.desc`;
            return (
              <React.Fragment>
                <div className="detail-id">[ {project.id} ] / {tCat(project.category, lang)} / {project.year}</div>
                <h1 className="detail-title" data-content-path={namePath}>{project.name}</h1>
                {project.desc && <p className="detail-desc" data-content-path={descPath}>{project.desc}</p>}
                <dl style={{ margin: 0 }}>
                  <div className="detail-row">
                    <dt>{t({ en: "Client", ua: "Клієнт" })}</dt>
                    <dd data-content-path={`${base}.client`}>{project.client}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>{t({ en: "Role", ua: "Роль" })}</dt>
                    <dd data-content-path={`${base}.role`}>{project.role}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>{t({ en: "Medium", ua: "Техніка" })}</dt>
                    <dd data-content-path={`${base}.medium`}>{project.medium}</dd>
                  </div>
                </dl>
                <p className="detail-prose" data-content-path={`${base}.prose`}>{project.prose}</p>
              </React.Fragment>
            );
          })()}
        </div>
      </div>

      <div className="detail-nav">
        <button onClick={onPrev}>← {t({ en: "previous", ua: "попередній" })}</button>
        <button onClick={onNext}>{t({ en: "next", ua: "наступний" })} →</button>
      </div>
    </div>
  );
}

window.Projects = Projects;
window.ProjectDetail = ProjectDetail;
// Live getter so consumers (e.g. App.jsx detail-nav) always see the current
// projects array. The fetch resolves before the user can trigger any access.
Object.defineProperty(window, "ALL_PROJECTS", {
  configurable: true,
  get: () => (window.CONTENT && window.CONTENT.projects) || [],
});

