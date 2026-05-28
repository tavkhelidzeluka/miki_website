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

const ALL_PROJECTS = [
  {
    id: "01", category: "ANIMATION", year: "2024 — 2025",
    name: "through the magic crystal",
    client: "Studio SHAR",
    role: "Character Animator",
    medium: "2D digital animation, 12fps",
    desc: "Character animation for the Russian-language animated feature. Worked across 14 scenes — creature walk-cycles, crowd shots, key-frames on twos.",
    prose: "A long-arc creature animation gig. I keyframed by hand on twos, working from rough director's storyboards and finishing into clean line. The crystal scenes — fragmented, refractive — were the most challenging. We treated each facet as its own animation rig.",
    works: [
      { name: "through the magic crystal", desc: "Character animation — Studio SHAR feature. 2024–2025." },
      { name: "nyaono spot",                desc: "30-second animated commercial, two-frame loops." },
      { name: "polukhutenko video",         desc: "Frame-by-frame rotoscoped music video, 3:42." },
      { name: "studio test reel",           desc: "Bench reel from 2024 — eight clips, no sound." },
      { name: "creature studies",           desc: "Daily walk-cycle studies, sketchbook origin." },
      { name: "loop set / berlin",          desc: "Three-week residency, 12 loops at 12fps." },
      { name: "crystal facet rig",          desc: "Test rig — refractive faceted-glass character system." },
    ],
  },
  {
    id: "02", category: "ILLUSTRATION", year: "2024",
    name: "body of vision",
    client: "Group exhibition",
    role: "Illustrator",
    medium: "Mixed media on A3 paper",
    desc: "Twelve mixed-media pieces exploring perception, distortion, and the body. Every piece begins with a cut-cardstock black square.",
    prose: "Twelve pieces, A3, all from the same week in October. I started each one with a black square cut from cardstock — the shape was the rule. Everything else (pencil, paint, collage) responded to that anchor.",
    works: [
      { name: "body of vision — i",   desc: "Mixed media on A3 paper, October 2024." },
      { name: "body of vision — ii",  desc: "Black-square cardstock anchor + pencil + acrylic." },
      { name: "body of vision — iii", desc: "Cut paper layered with charcoal underdrawing." },
      { name: "body of vision — iv",  desc: "Series of twelve, fourth piece — figure study." },
      { name: "body of vision — v",   desc: "Mixed media; the only piece with red ink." },
      { name: "body of vision — vi",  desc: "Final piece — closing the loop on the series." },
      { name: "studio notes",         desc: "Process pages from the week of work." },
    ],
  },
  {
    id: "03", category: "POSTERS", year: "2024",
    name: "bolshoi theatre",
    client: "Bolshoi Theatre",
    role: "Poster designer",
    medium: "Offset, 600×900mm",
    desc: "Poster series for the 2024 season. Six titles. One halftone portrait, one block of condensed display per piece.",
    prose: "The brief asked for restraint. Black ink on warm paper, one photograph treated as halftone, big type. We avoided the season's typical illustrative direction entirely.",
    works: [
      { name: "home",         desc: "Offset poster, 600×900mm. Halftone portrait, condensed display.",      thumb: "assets/posters/home.jpg" },
      { name: "bones",        desc: "Bone-white riso poster on warm paper, edition of 80.",                thumb: "assets/posters/bones.jpg" },
      { name: "forever",      desc: "Two-colour offset poster, 600×900mm. All-type, hand-set leading.",     thumb: "assets/posters/forever.jpg" },
      { name: "blue grid",    desc: "Screenprint, 50×70cm. Cyan grid over a halftone interior.",            thumb: "assets/posters/blue-grid.jpg" },
      { name: "serofarm",     desc: "Concert poster, A2. Two passes through the riso, hand-trimmed.",       thumb: "assets/posters/serofarm.jpg" },
      { name: "war is hell",  desc: "Offset poster, 600×900mm. Bracket headline, single-image composition.", thumb: "assets/posters/war-is-hell.jpg" },
    ],
  },
  {
    id: "04", category: "CANVAS", year: "2023 — Present",
    name: "originals on canvas",
    client: "Personal / commissions",
    role: "Painter",
    medium: "Acrylic / oil / collage",
    desc: "Originals on linen and coloured paper. A3 — A1. Sold through the Canvas page; some commissioned.",
    prose: "I work alla-prima, building tone in two or three sessions, then collaging textured paper over the top. The canvas works are the slowest part of the practice — usually one finished piece every two weeks.",
    works: [
      { name: "с котом",     desc: "Coloured paper A3, acrylic + pencils." },
      { name: "яновна",      desc: "Linen canvas A4, oil." },
      { name: "в пиджаке",   desc: "Collage A3, mixed media." },
      { name: "ночной",      desc: "A2 linen canvas, alla-prima oil sketch." },
      { name: "сестра",      desc: "Charcoal on A2, finished in single sitting." },
      { name: "берлин",      desc: "Acrylic on coloured paper, A3 — 2025." },
      { name: "холст / 07",  desc: "Untitled canvas, in-progress." },
    ],
  },
  {
    id: "05", category: "BOOKS", year: "2024",
    name: "exposure / book series",
    client: "Independent publishers",
    role: "Cover designer · illustrator",
    medium: "Hardcover, 130×200mm",
    desc: "Two book covers and a 24-page zine. All-typographic spines, halftone interiors.",
    prose: "Three projects in this folder. The Exposure zine started as a poster series; the publishers asked to turn it into a perfect-bound 24-page book. Hand-bound the first run myself.",
    works: [
      { name: "exposure — zine",       desc: "24 pages, perfect-bound, halftone interiors." },
      { name: "exposure — cover",      desc: "Hardcover concept, typographic spine." },
      { name: "vém àrxîv — anthology", desc: "Group anthology cover + 4 inserts." },
      { name: "studio / book i",       desc: "Independent publisher, monograph." },
      { name: "studio / book ii",      desc: "Companion volume — softcover, riso." },
      { name: "zine — quarterly",      desc: "Ongoing quarterly zine, 16 pages." },
      { name: "book — endpapers",      desc: "Endpaper-only commission, six titles." },
    ],
  },
  {
    id: "06", category: "PHOTOS", year: "2023 — Present",
    name: "field notes",
    client: "Personal",
    role: "Photographer",
    medium: "35mm + medium format film",
    desc: "Ongoing 35mm and 120 film series. Mostly Kyiv, sometimes Berlin. Halftoned for the brand voice.",
    prose: "Always one camera, mostly Olympus mju. I scan and treat everything to 1-bit halftone before publishing — the texture matters more than the literal photograph.",
    works: [
      { name: "field notes — kyiv",   desc: "Mostly Olympus mju, 35mm Portra." },
      { name: "field notes — berlin", desc: "Three weeks, two rolls of HP5." },
      { name: "studio portraits",     desc: "Mamiya RB67, all natural light." },
      { name: "halftone studies",     desc: "1-bit halftone treatment tests." },
      { name: "kyiv at night",        desc: "Long-exposure 35mm series." },
      { name: "subjects / index",     desc: "Compiled portrait index, 2023–25." },
      { name: "self — 07",            desc: "Self portrait series, ongoing." },
    ],
  },
  {
    id: "07", category: "SOCIAL MEDIA", year: "2024",
    name: "social campaign — nyaono",
    client: "Nyaono",
    role: "Animator · designer",
    medium: "Animated story sets",
    desc: "Animated story sets and grid posts for a brand launch. Two-frame loops in Photoshop, output at three aspect ratios.",
    prose: "Quick turnaround social work. Two-frame loops in Photoshop, output at 1080×1920 / 1080×1080 / 1080×1350. Same brand voice held across all three.",
    works: [
      { name: "nyaono — launch",       desc: "Brand launch grid + stories." },
      { name: "nyaono — story set",    desc: "Animated story set, 8 frames." },
      { name: "campaign / spring",     desc: "Spring lookbook social rollout." },
      { name: "ig grid / april",       desc: "Single-month feed plan, 12 tiles." },
      { name: "story templates",       desc: "Template set, 6 layouts." },
      { name: "reel — exposure",       desc: "Reel cutdown of Exposure zine launch." },
      { name: "stickers / 07",         desc: "Custom sticker set for paid promotion." },
    ],
  },
];

// Categories that use the horizontal strip view.
// Others (BOOKS) open the project detail overlay directly.
// ANIMATION + SOCIAL MEDIA are special — their own custom views.
const STRIP_CATS = new Set(["02", "03", "04", "06"]); // ILLUSTRATION, POSTERS, CANVAS, PHOTOS
const ANIM_CAT = "01";
const SOCIAL_CAT = "07";

function Projects({ tweaks, openDetail, categoryId, setCategoryId }) {
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
              className={tileBg + (p.category === "ANIMATION" ? " proj-tile--cover proj-tile--anim" : "")}
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
          return (
            <div
              key={"slot-" + j}
              className={cls}
              style={style}
              onClick={() => {
                if (isActive) {
                  openDetail({ ...category, name: cur.name, desc: cur.desc, thumb: cur.thumb, prose: category.prose });
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
          <span className="cat-name">{cur.name}</span>
          <span className="cat-bracket">]</span>
        </div>
        <div className="cat-desc">{cur.desc}</div>
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
        <div className={imgClass} style={imgStyle}>
          <div className="detail-image-label">[ {project.id} ] · {project.medium}</div>
        </div>
        <div>
          <div className="detail-id">[ {project.id} ] / {tCat(project.category, lang)} / {project.year}</div>
          <h1 className="detail-title">{project.name}</h1>
          {project.desc && <p className="detail-desc">{project.desc}</p>}
          <dl style={{ margin: 0 }}>
            <div className="detail-row">
              <dt>{t({ en: "Client", ua: "Клієнт" })}</dt>
              <dd>{project.client}</dd>
            </div>
            <div className="detail-row">
              <dt>{t({ en: "Role", ua: "Роль" })}</dt>
              <dd>{project.role}</dd>
            </div>
            <div className="detail-row">
              <dt>{t({ en: "Medium", ua: "Техніка" })}</dt>
              <dd>{project.medium}</dd>
            </div>
          </dl>
          <p className="detail-prose">{project.prose}</p>
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
window.ALL_PROJECTS = ALL_PROJECTS;
