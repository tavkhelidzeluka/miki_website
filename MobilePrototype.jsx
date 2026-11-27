// MobilePrototype.jsx — PROTOTYPE ONLY (throwaway).
// Question: "What should the mobile version of the site look like?"
// Seven structurally different mobile shells on the existing "/" route,
// switchable via ?variant=A–G and the floating bottom bar. All read the
// real window.CONTENT; nothing mutates. Mounted from index.html in place of
// the scaled 1440×900 desktop canvas when the viewport is ≤ 768px on
// localhost, or whenever ?variant= is present.

// ─── Shared: flatten content into categories → items ───
function protoCategories(t) {
  const C = window.CONTENT;
  const vis = (arr) => (arr || []).filter((x) => !x.hidden);
  return C.projects.filter((p) => !p.hidden).map((p) => {
    let items;
    if (p.id === "01") {
      items = vis(C.animations).map((a) => ({ title: a.title, sub: a.date, img: a.thumb, href: a.videoUrl }));
    } else if (p.id === "07") {
      items = vis(C.social && C.social.posts).map((s, i) => ({ title: s.brand, sub: `post ${i + 1}`, img: s.src }));
    } else {
      items = vis(p.works).map((w) => ({
        title: w.name, sub: w.desc, img: w.thumb || null, price: w.price,
        client: w.client, role: w.role, medium: w.medium, year: w.year,
      }));
    }
    const cover = p.coverImage || (items.find((i) => i.img) || {}).img || null;
    return {
      id: p.id,
      label: t(p.categoryLabel) || p.category,
      name: p.name,
      year: p.year,
      desc: p.desc,
      client: p.client,
      role: p.role,
      medium: p.medium,
      cover,
      items,
    };
  });
}

function ProtoImg({ src, alt, className, style }) {
  if (!src) {
    return <div className={"mp-img mp-img--empty " + (className || "")} style={style} aria-label={alt}>[ ]</div>;
  }
  return <img className={"mp-img " + (className || "")} style={style} src={src} alt={alt || ""} loading="lazy" />;
}

function ProtoAbout({ t }) {
  const A = window.CONTENT.about;
  const bio = t(A.bio) || [];
  return (
    <div className="mp-about">
      {(Array.isArray(bio) ? bio : [bio]).map((b, i) => <p key={i}>{b}</p>)}
      <div className="mp-about-h">[ experience ]</div>
      {(A.experience || []).map((e, i) => (
        <div key={i} className="mp-about-row">
          <span>{t(e.title)}<br /><small>{t(e.role)}</small></span>
          <small>{t(e.date)}</small>
        </div>
      ))}
    </div>
  );
}

function ProtoContact({ t }) {
  const C = window.CONTENT.contact;
  return (
    <div className="mp-contact">
      <a href={`mailto:${C.email}`}>{C.email}</a>
      <a href={`https://t.me/${C.telegram.replace("@", "")}`}>tg {C.telegram}</a>
      {(C.instagram || []).map((ig) => (
        <a key={ig} href={`https://instagram.com/${ig.replace("@", "")}`}>ig {ig}</a>
      ))}
      <a href={`https://tiktok.com/${C.tiktok}`}>tt {C.tiktok}</a>
      <small>{t(C.location)}</small>
    </div>
  );
}

function ProtoLang() {
  const { lang, setLang } = useLang();
  return (
    <span className="mp-lang">
      [ <button data-on={lang === "EN"} onClick={() => setLang("EN")}>EN</button> ·{" "}
      <button data-on={lang === "UA"} onClick={() => setLang("UA")}>UA</button> ]
    </span>
  );
}

// ═══ A — Scroll index: one long editorial page, sticky bracket header ═══
function VariantA() {
  const { t } = useLang();
  const cats = protoCategories(t);
  const [menu, setMenu] = React.useState(false);
  const jump = (id) => { setMenu(false); document.getElementById("mpa-" + id)?.scrollIntoView({ behavior: "smooth" }); };
  return (
    <div className="mpa">
      <header className="mpa-bar">
        <span>[ MIKI / GTXHI ]</span>
        <button onClick={() => setMenu((m) => !m)}>[ {menu ? "close" : "index"} ]</button>
      </header>
      {menu && (
        <nav className="mpa-menu">
          {cats.map((c) => <button key={c.id} onClick={() => jump(c.id)}><small>{c.id}</small> {c.label}</button>)}
          <button onClick={() => jump("about")}><small>→</small> ABOUT</button>
          <button onClick={() => jump("contact")}><small>→</small> CONTACT</button>
          <ProtoLang />
        </nav>
      )}
      <section className="mpa-hero">
        <div className="mpa-hero-bg" />
        <div className="mpa-mark mpa-mark--tl">[ GTXHI/</div>
        <div className="mpa-mark mpa-mark--br">MIKI ]</div>
      </section>
      {cats.map((c) => (
        <section key={c.id} id={"mpa-" + c.id} className="mpa-sec">
          <div className="mpa-sec-head">
            <span className="mpa-num">{c.id}</span>
            <h2>{c.label}</h2>
            <small>{c.items.length} works</small>
          </div>
          <div className="mpa-strip">
            {c.items.map((it, i) => (
              <a key={i} className="mpa-card" href={it.href || undefined} target={it.href ? "_blank" : undefined}>
                <ProtoImg src={it.img} alt={it.title} />
                <span>{String(i + 1).padStart(2, "0")} · {it.title}</span>
              </a>
            ))}
          </div>
        </section>
      ))}
      <section id="mpa-about" className="mpa-sec"><div className="mpa-sec-head"><span className="mpa-num">→</span><h2>ABOUT</h2></div><ProtoAbout t={t} /></section>
      <section id="mpa-contact" className="mpa-sec mpa-sec--ink"><div className="mpa-sec-head"><span className="mpa-num">→</span><h2>CONTACT</h2></div><ProtoContact t={t} /></section>
    </div>
  );
}
VariantA.label = "Scroll index";

// ═══ B — App tabs: bottom tab bar, category grid, swipe pager ═══
function VariantB() {
  const { t } = useLang();
  const cats = protoCategories(t);
  const [tab, setTab] = React.useState("work");
  const [open, setOpen] = React.useState(null); // category id
  const [page, setPage] = React.useState(0);
  const cat = cats.find((c) => c.id === open);
  const onScroll = (e) => setPage(Math.round(e.target.scrollLeft / e.target.clientWidth));
  return (
    <div className="mpb">
      <header className="mpb-top">
        <span>[ MIKI / GTXHI ]</span>
        <ProtoLang />
      </header>
      <main className="mpb-main">
        {tab === "work" && (
          <div className="mpb-grid">
            {cats.map((c) => (
              <button key={c.id} className="mpb-tile" onClick={() => { setOpen(c.id); setPage(0); }}>
                <ProtoImg src={c.cover} alt={c.label} />
                <span className="mpb-tile-label"><small>{c.id}</small> {c.label}</span>
              </button>
            ))}
          </div>
        )}
        {tab === "shop" && (
          <div className="mpb-list">
            {(window.CONTENT.canvas.items || []).filter((x) => !x.hidden).map((it) => (
              <div key={it.id} className="mpb-shop-row">
                <ProtoImg src={it.img} alt={it.title} />
                <div><b>{it.title}</b><br /><small>{it.medium}</small></div>
                <button disabled>{it.price ? `€${it.price}` : "—"}</button>
              </div>
            ))}
          </div>
        )}
        {tab === "about" && <div className="mpb-pad"><ProtoAbout t={t} /></div>}
        {tab === "contact" && <div className="mpb-pad mpb-contact"><ProtoContact t={t} /></div>}
      </main>
      <nav className="mpb-tabs">
        {["work", "shop", "about", "contact"].map((k) => (
          <button key={k} data-on={tab === k} onClick={() => { setTab(k); setOpen(null); }}>{tab === k ? `[ ${k} ]` : k}</button>
        ))}
      </nav>
      {cat && (
        <div className="mpb-pager">
          <header>
            <button onClick={() => setOpen(null)}>[ ← back ]</button>
            <span>{cat.label}</span>
            <span>{String(page + 1).padStart(2, "0")}/{String(cat.items.length).padStart(2, "0")}</span>
          </header>
          <div className="mpb-pager-track" onScroll={onScroll}>
            {cat.items.map((it, i) => (
              <figure key={i}>
                <ProtoImg src={it.img} alt={it.title} />
                <figcaption><b>{it.title}</b><br /><small>{it.sub}</small></figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
VariantB.label = "App tabs";

// ═══ C — Type menu: giant numbered list, accordion reveals images ═══
function VariantC() {
  const { t } = useLang();
  const cats = protoCategories(t);
  const [open, setOpen] = React.useState(null);
  const [overlay, setOverlay] = React.useState(null); // "about" | "contact"
  return (
    <div className="mpc">
      <header className="mpc-top">
        <button onClick={() => setOverlay("about")}>[ about ]</button>
        <button onClick={() => setOverlay("contact")}>[ contact ]</button>
        <ProtoLang />
      </header>
      <h1 className="mpc-word">[ GTXHI/<br />&nbsp;&nbsp;MIKI ]</h1>
      <ol className="mpc-list">
        {cats.map((c) => (
          <li key={c.id} data-open={open === c.id}>
            <button className="mpc-row" onClick={() => setOpen(open === c.id ? null : c.id)}>
              <small>{c.id}</small>
              <span>{c.label}</span>
              <small>{open === c.id ? "−" : c.items.length}</small>
            </button>
            {open === c.id && (
              <div className="mpc-body">
                {c.desc && <p>{c.desc}</p>}
                <div className="mpc-cols">
                  {c.items.map((it, i) => (
                    <a key={i} href={it.href || undefined} target={it.href ? "_blank" : undefined}>
                      <ProtoImg src={it.img} alt={it.title} />
                      <small>{it.title}</small>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
      {overlay && (
        <div className="mpc-overlay">
          <button className="mpc-close" onClick={() => setOverlay(null)}>[ close ]</button>
          <h2>{overlay.toUpperCase()}</h2>
          {overlay === "about" ? <ProtoAbout t={t} /> : <ProtoContact t={t} />}
        </div>
      )}
    </div>
  );
}
VariantC.label = "Type menu";

// ═══ D — Feed: full-screen vertical snap, one work per screen ═══
function VariantD() {
  const { t } = useLang();
  const cats = protoCategories(t);
  const [filter, setFilter] = React.useState("all");
  const feed = cats
    .filter((c) => filter === "all" || c.id === filter)
    .flatMap((c) => c.items.filter((it) => it.img).map((it) => ({ ...it, cat: c })));
  const ref = React.useRef(null);
  React.useEffect(() => { ref.current && (ref.current.scrollTop = 0); }, [filter]);
  return (
    <div className="mpd">
      <header className="mpd-top">
        <span>[ MIKI / GTXHI ]</span>
        <div className="mpd-chips">
          <button data-on={filter === "all"} onClick={() => setFilter("all")}>all</button>
          {cats.map((c) => (
            <button key={c.id} data-on={filter === c.id} onClick={() => setFilter(c.id)}>{c.label.toLowerCase()}</button>
          ))}
        </div>
      </header>
      <div className="mpd-feed" ref={ref}>
        {feed.map((it, i) => (
          <section key={filter + i} className="mpd-card">
            <ProtoImg src={it.img} alt={it.title} />
            <div className="mpd-cap">
              <small>{it.cat.id} · {it.cat.label}</small>
              <b>{it.title}</b>
              {it.sub && <span>{it.sub}</span>}
              {it.href && <a href={it.href} target="_blank">[ ▶ watch ]</a>}
            </div>
            <span className="mpd-count">{String(i + 1).padStart(2, "0")}/{String(feed.length).padStart(2, "0")}</span>
          </section>
        ))}
        <section className="mpd-card mpd-card--end">
          <h2>[ say hi ]</h2>
          <ProtoContact t={t} />
        </section>
      </div>
    </div>
  );
}
VariantD.label = "Feed";

// ═══ E — Black square + sheet: the brand's black square is the stage,
// a resizable bottom sheet (grabber, 3 detents) holds all navigation in
// thumb reach. HIG: sheets.md › grabber + medium detent. ═══
const E_DETENTS = [0.16, 0.5, 0.88]; // fraction of viewport height
function VariantE() {
  const { t } = useLang();
  const cats = protoCategories(t);
  const [detent, setDetent] = React.useState(1);
  const [drag, setDrag] = React.useState(null); // live height px while dragging
  const [cat, setCat] = React.useState(null);
  const [idx, setIdx] = React.useState(0);
  const [pane, setPane] = React.useState("work"); // work | about | contact
  const vh = window.innerHeight;
  const start = React.useRef(null);
  const onDown = (e) => { start.current = { y: e.clientY, h: E_DETENTS[detent] * vh, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e) => {
    if (!start.current) return;
    const dy = start.current.y - e.clientY;
    if (Math.abs(dy) > 4) start.current.moved = true;
    setDrag(Math.max(vh * 0.1, Math.min(vh * 0.92, start.current.h + dy)));
  };
  const onUp = () => {
    if (!start.current) return;
    if (!start.current.moved) setDetent((d) => (d + 1) % E_DETENTS.length); // tap grabber cycles
    else {
      const f = drag / vh;
      setDetent(E_DETENTS.reduce((best, d, i) => (Math.abs(d - f) < Math.abs(E_DETENTS[best] - f) ? i : best), 0));
    }
    start.current = null; setDrag(null);
  };
  const c = cats.find((x) => x.id === cat);
  const it = c && c.items[idx];
  const h = drag != null ? drag : E_DETENTS[detent] * vh;
  return (
    <div className="mpe">
      <header className="mpe-top"><span>[ MIKI / GTXHI ]</span><ProtoLang /></header>
      <div className="mpe-stage" style={{ bottom: h }}>
        <div className="mpe-square" onClick={() => c && setIdx((idx + 1) % c.items.length)}>
          {it ? <ProtoImg src={it.img} alt={it.title} /> : <span className="mpe-mark">[ GTXHI/<br />MIKI ]</span>}
        </div>
        {it && <div className="mpe-cap"><b>{it.title}</b> <small>{String(idx + 1).padStart(2, "0")}/{String(c.items.length).padStart(2, "0")}</small></div>}
      </div>
      <section className="mpe-sheet" style={{ height: h, transition: drag != null ? "none" : undefined }}>
        <button className="mpe-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} aria-label="resize sheet"><i /></button>
        <div className="mpe-seg" role="tablist">
          {["work", "about", "contact"].map((k) => (
            <button key={k} data-on={pane === k} onClick={() => { setPane(k); if (detent === 0) setDetent(1); }}>{k}</button>
          ))}
        </div>
        <div className="mpe-body">
          {pane === "work" && !c && cats.map((x) => (
            <button key={x.id} className="mpe-row" onClick={() => { setCat(x.id); setIdx(0); }}>
              <span>{x.label}</span><small>{x.items.length} ›</small>
            </button>
          ))}
          {pane === "work" && c && (
            <React.Fragment>
              <button className="mpe-back" onClick={() => setCat(null)}>‹ all work</button>
              <h3>{c.label}</h3>
              {c.desc && <p>{c.desc}</p>}
              <div className="mpe-thumbs">
                {c.items.map((x, i) => (
                  <button key={i} data-on={i === idx} onClick={() => setIdx(i)} aria-label={x.title}><ProtoImg src={x.img} alt={x.title} /></button>
                ))}
              </div>
            </React.Fragment>
          )}
          {pane === "about" && <ProtoAbout t={t} />}
          {pane === "contact" && <ProtoContact t={t} />}
        </div>
      </section>
    </div>
  );
}
VariantE.label = "Square + sheet";

// A contact-sheet frame that reports its image's shape once loaded, so the
// mosaic can let tall works span two rows and wide works span two columns.
function MpfFrame({ it, k, onOpen, span, onShape }) {
  const onLoad = (e) => {
    const r = e.target.naturalWidth / e.target.naturalHeight;
    onShape(k, r > 1.25 ? "wide" : r < 0.8 ? "tall" : "sq");
  };
  return (
    <button className={"mpf-frame" + (span ? " mpf-frame--" + span : "")} onClick={onOpen}>
      <img className="mp-img" src={it.img} alt={it.title} loading="lazy" onLoad={onLoad} />
      <small>{String(k + 1).padStart(3, "0")}</small>
    </button>
  );
}

// ═══ F — Contact sheet: every work as numbered frames on a film sheet,
// tap → bracket-framed viewer with a bottom toolbar. 3-tab bar.
// HIG: tab-bars.md › navigation, not actions; toolbar holds prev/next. ═══
function VariantF() {
  const { t } = useLang();
  const cats = protoCategories(t);
  const [tab, setTab] = React.useState("work");
  const [view, setView] = React.useState(null); // index into frames
  const [info, setInfo] = React.useState(true);
  const [mosaic, setMosaic] = React.useState(true);
  const [shapes, setShapes] = React.useState({}); // frame index → sq | tall | wide
  const onShape = React.useCallback((k, s) => setShapes((m) => (m[k] === s ? m : { ...m, [k]: s })), []);
  // Per roll: a wide work spans 2 columns only while a non-wide work is left
  // to fill the third; otherwise it runs full width. An all-square roll
  // opens with a 2×2 feature so it isn't a flat grid.
  const spansFor = (keys) => {
    const s = keys.map((k) => shapes[k] || "sq");
    let fillers = s.filter((x) => x !== "wide").length;
    const allSq = s.every((x) => x === "sq");
    return s.map((x, i) => {
      if (x === "tall") return "tall";
      if (x === "wide") { if (fillers > 0) { fillers--; return "wide"; } return "full"; }
      return allSq && i === 0 && s.length >= 5 ? "feature" : "sq";
    });
  };
  const frames = cats.flatMap((c) => c.items.filter((i) => i.img).map((i) => ({ ...i, cat: c })));
  let n = 0;
  const touch = React.useRef(null);
  const step = (d) => setView((v) => (v + d + frames.length) % frames.length);
  const f = view != null && frames[view];
  return (
    <div className="mpf">
      <header className="mpf-top">
        <span>[ MIKI / GTXHI ]</span>
        <button className="mpf-toggle" onClick={() => setMosaic((m) => !m)} aria-label="toggle grid layout">
          {mosaic ? "▦ mosaic" : "▢ grid"}
        </button>
      </header>
      {tab === "work" && cats.map((c) => {
        const own = c.items.filter((i) => i.img);
        if (!own.length) return null;
        return (
          <section key={c.id} className="mpf-roll">
            <div className="mpf-edge"><span>ROLL {c.id}</span><span>{c.label}</span><span>{c.year || ""}</span></div>
            <div className={"mpf-grid" + (mosaic ? " mpf-grid--mosaic" : "")}>
              {(() => {
                const keys = own.map(() => n++);
                const spans = spansFor(keys);
                return own.map((it, i) => (
                  <MpfFrame key={keys[i]} it={it} k={keys[i]} span={mosaic && spans[i]} onShape={onShape} onOpen={() => setView(keys[i])} />
                ));
              })()}
            </div>
          </section>
        );
      })}
      {tab === "about" && <div className="mpf-pad"><ProtoAbout t={t} /></div>}
      {tab === "contact" && <div className="mpf-pad"><ProtoContact t={t} /></div>}
      <nav className="mpf-tabs">
        {["work", "about", "contact"].map((k) => (
          <button key={k} data-on={tab === k} onClick={() => setTab(k)}>
            <span className="mpf-tab-ico">{tab === k ? "■" : "□"}</span>{k}
          </button>
        ))}
        <ProtoLang />
      </nav>
      {f && (
        <div
          className="mpf-viewer"
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); }}
        >
          <header><button onClick={() => setView(null)}>Done</button><span>{String(view + 1).padStart(3, "0")} / {String(frames.length).padStart(3, "0")}</span></header>
          <div className="mpf-frameview">
            <span className="mpf-br">[</span>
            <ProtoImg src={f.img} alt={f.title} />
            <span className="mpf-br">]</span>
          </div>
          {info && <div className="mpf-info"><small>{f.cat.label}</small><b>{f.title}</b>{f.sub && <span>{f.sub}</span>}</div>}
          <footer>
            <button onClick={() => step(-1)} aria-label="previous">‹</button>
            <button onClick={() => setInfo((x) => !x)}>{info ? "Hide info" : "Info"}</button>
            {f.href ? <a href={f.href} target="_blank">Watch</a> : <span />}
            <button onClick={() => step(1)} aria-label="next">›</button>
          </footer>
        </div>
      )}
    </div>
  );
}
VariantF.label = "Contact sheet";

// ═══ G — Poster deck: swipe sideways between categories, each one a
// full-screen halftone poster; scroll down within a poster for its works. ═══
function VariantG() {
  const { t } = useLang();
  const cats = protoCategories(t);
  const [page, setPage] = React.useState(0);
  const [sheet, setSheet] = React.useState(null);
  const ref = React.useRef(null);
  const onScroll = (e) => setPage(Math.round(e.target.scrollLeft / e.target.clientWidth));
  const go = (i) => ref.current && ref.current.scrollTo({ left: i * ref.current.clientWidth, behavior: "smooth" });
  return (
    <div className="mpg">
      <div className="mpg-deck" ref={ref} onScroll={onScroll}>
        {cats.map((c) => (
          <article key={c.id} className="mpg-poster">
            <div className="mpg-hero">
              <div className="mpg-ht" style={c.cover ? { backgroundImage: `url("${c.cover}")` } : undefined} />
              <span className="mpg-id">[ {c.id} ]</span>
              <h2>{c.label}</h2>
              <span className="mpg-hint">scroll ↓ {c.items.length} works</span>
            </div>
            <div className="mpg-works">
              {c.desc && <p>{c.desc}</p>}
              {c.items.map((it, i) => (
                <a key={i} className="mpg-work" href={it.href || undefined} target={it.href ? "_blank" : undefined}>
                  <ProtoImg src={it.img} alt={it.title} />
                  <div><b>{it.title}</b><small>{it.sub}</small></div>
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
      <header className="mpg-top">
        <span>[ MIKI / GTXHI ]</span>
        <span>
          <button onClick={() => setSheet("about")}>about</button> · <button onClick={() => setSheet("contact")}>contact</button>
        </span>
      </header>
      <nav className="mpg-dots" aria-label="categories">
        <button onClick={() => go(Math.max(0, page - 1))} aria-label="previous category">‹</button>
        <span>[ {String(page + 1).padStart(2, "0")} / {String(cats.length).padStart(2, "0")} ]</span>
        <button onClick={() => go(Math.min(cats.length - 1, page + 1))} aria-label="next category">›</button>
      </nav>
      {sheet && (
        <div className="mpg-scrim" onClick={() => setSheet(null)}>
          <section className="mpg-sheet" onClick={(e) => e.stopPropagation()}>
            <i className="mpg-grab" />
            <header><h3>{sheet}</h3><button onClick={() => setSheet(null)}>Done</button></header>
            {sheet === "about" ? <ProtoAbout t={t} /> : <ProtoContact t={t} />}
            <ProtoLang />
          </section>
        </div>
      )}
    </div>
  );
}
VariantG.label = "Poster deck";

// ═══ H — Sketchbook: one work per screen, each a slightly tilted
// sheet. A single pencil line threads the whole book, drawing itself as you
// scroll and looping around each work; the scrollbar is a wobbly pencil
// track with a bracket marker that rides along (and can be dragged). ═══
const H_TILTS = [-3.2, 2.4, -1.4, 3.8, -2.6, 1.2, -4, 2.9, -0.8, 3.3];
const hRand = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

// Catmull-Rom through points → cubic segments [p1, c1, c2, p2].
function hSegs(pts) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    segs.push([p1, c1, c2, p2]);
  }
  return segs;
}
const hFmt = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
function hSpline(pts) {
  return `M${hFmt(pts[0])}` + hSegs(pts).map(([, c1, c2, p2]) => ` C${hFmt(c1)} ${hFmt(c2)} ${hFmt(p2)}`).join("");
}
// Walk the curve in JS (getPointAtLength is ~1.6ms per call on a path this
// long — sampling it froze the page for 12s). Returns {x, y, len} samples.
function hSamples(segs, steps = 14) {
  const out = [{ x: segs[0][0][0], y: segs[0][0][1], len: 0 }];
  let len = 0;
  for (const [a, b, c, d] of segs) {
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, u = 1 - t;
      const x = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0];
      const y = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1];
      const prev = out[out.length - 1];
      len += Math.hypot(x - prev.x, y - prev.y);
      out.push({ x, y, len });
    }
  }
  return out;
}

function VariantH() {
  const { t } = useLang();
  const cats = protoCategories(t);
  const pages = React.useMemo(() => {
    const out = [{ kind: "intro" }];
    cats.forEach((c) => {
      out.push({ kind: "chapter", cat: c });
      c.items.filter((i) => i.img).forEach((it) => out.push({ kind: "work", it, cat: c }));
    });
    out.push({ kind: "end" });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);
  const workNo = React.useMemo(() => { let n = 0; return pages.map((p) => (p.kind === "work" ? ++n : n)); }, [pages]);
  const totalWorks = workNo[workNo.length - 1];

  const scroller = React.useRef(null);
  const secs = React.useRef([]);
  const lines = React.useRef([]); // per page: [ghostPath, inkPath]
  const tip = React.useRef(null);
  const bar = React.useRef(null);
  const mark = React.useRef(null);
  const lastIdx = React.useRef(-1);
  // One pencil piece per page: {d, total, samples: [{x, y, len}]}.
  const [geo, setGeo] = React.useState({ w: 375, h: 800, pieces: [] });
  const [cur, setCur] = React.useState(0);
  const [menu, setMenu] = React.useState(false);
  const reduce = React.useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  // Build the pencil path from the real section positions.
  React.useLayoutEffect(() => {
    const build = () => {
      const el = scroller.current;
      if (!el) return;
      const w = el.clientWidth, vh = el.clientHeight;
      const pts = [[w * 0.5, 40]];
      secs.current.forEach((s, i) => {
        if (!s) return;
        const top = s.offsetTop, cy = top + vh / 2;
        const L = i % 2 === 0;
        const j = (k) => (hRand(i, k) - 0.5) * 28;
        pts.push([w * (L ? 0.1 : 0.9) + j(1), top + vh * 0.1 + j(2)]);       // enter on one side
        pts.push([w * (L ? 0.88 : 0.12) + j(3), cy - vh * 0.36 + j(4)]);     // sweep over the top
        pts.push([w * (L ? 0.96 : 0.04) + j(5), cy + j(6)]);                  // round the far edge
        pts.push([w * (L ? 0.5 : 0.5) + j(7), cy + vh * 0.37 + j(8)]);        // under the work
        pts.push([w * (L ? 0.06 : 0.94) + j(9), cy + vh * 0.2 + j(10)]);      // little hook back
        pts.push([w * (L ? 0.3 : 0.7) + j(11), top + vh * 0.97 + j(12)]);    // drift into the next page
      });
      // Spline the whole book at once (smooth joins), then cut it into one
      // piece per page (6 segments each) so a frame only repaints the
      // pieces near the screen. Hand tremble is baked into the geometry —
      // an SVG filter on a ~45000px tall layer is far too expensive on phones.
      const segs = hSegs(pts);
      const pieces = secs.current.map((_, i) => {
        const samples = hSamples(segs.slice(i * 6, i * 6 + 6));
        let len = 0;
        samples.forEach((s, k) => {
          s.x += (hRand(i * 97 + k, 21) - 0.5) * 1.4;
          s.y += (hRand(i * 97 + k, 22) - 0.5) * 1.4;
          if (k) len += Math.hypot(s.x - samples[k - 1].x, s.y - samples[k - 1].y);
          s.len = len;
        });
        return { total: len, samples, d: "M" + samples.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join("L") };
      });
      drawnFloor.current = -1;
      setGeo({ w, h: el.scrollHeight, pieces });
    };
    build();
    // Phones fire resize as the address bar shows/hides; batch those.
    let timer;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(build, 150); };
    window.addEventListener("resize", onResize);
    return () => { clearTimeout(timer); window.removeEventListener("resize", onResize); };
  }, [pages]);

  // ─── Pencil position, in pages: 2.4 = page 2's piece is 40% drawn. ───
  // `pen` eases toward `penTarget` so the line glides after your thumb
  // instead of stepping with every scroll tick.
  const pen = React.useRef(0);
  const penTarget = React.useRef(0);
  const penRaf = React.useRef(0);
  const penLast = React.useRef(0);
  const drawnFloor = React.useRef(-1);
  const geoRef = React.useRef(geo);
  geoRef.current = geo; // the rAF loop outlives renders; always read the latest pieces

  const drawPen = (p) => {
    const pieces = geoRef.current.pieces;
    if (!pieces.length) return;
    const fl = Math.min(pieces.length - 1, Math.floor(p));
    const frac = Math.min(1, p - fl);
    const set = (i, off) => { const pair = lines.current[i]; if (pair) pair.forEach((el) => el && (el.style.strokeDashoffset = off)); };
    if (fl !== drawnFloor.current) {
      // Crossed into another page (or jumped): settle every other piece.
      pieces.forEach((pc, i) => { if (i !== fl) set(i, i < fl ? 0 : pc.total); });
      drawnFloor.current = fl;
    }
    const pc = pieces[fl];
    set(fl, pc.total * (1 - frac));
    // Tip: binary-search the sample at the drawn length.
    const want = pc.total * frac, s = pc.samples;
    let lo = 0, hi = s.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (s[mid].len < want) lo = mid + 1; else hi = mid; }
    tip.current && tip.current.setAttribute("transform", `translate(${s[lo].x.toFixed(1)},${s[lo].y.toFixed(1)})`);
  };

  const penTick = (now) => {
    const dt = Math.min(64, now - (penLast.current || now));
    penLast.current = now;
    const k = reduce ? 1 : 1 - Math.exp(-dt / 120); // ~120ms catch-up
    pen.current += (penTarget.current - pen.current) * k;
    if (Math.abs(penTarget.current - pen.current) < 0.0008) pen.current = penTarget.current;
    drawPen(pen.current);
    if (pen.current !== penTarget.current) penRaf.current = requestAnimationFrame(penTick);
    else { penRaf.current = 0; penLast.current = 0; }
  };
  const aimPen = (p) => {
    penTarget.current = Math.max(0, Math.min(geoRef.current.pieces.length, p));
    if (!penRaf.current) penRaf.current = requestAnimationFrame(penTick);
  };
  React.useEffect(() => () => cancelAnimationFrame(penRaf.current), []);

  React.useLayoutEffect(() => {
    if (!geo.pieces.length) return;
    drawPen(pen.current);
    onScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  const raf = React.useRef(0);
  const onScroll = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = scroller.current;
      if (!el) return;
      const vh = el.clientHeight, st = el.scrollTop;
      const max = el.scrollHeight - vh;
      const prog = max > 0 ? st / max : 0;
      const idx = Math.round(st / vh);
      // Scrollbar is written straight to the DOM; React only re-renders
      // when the current page changes, not on every scroll frame.
      if (bar.current) bar.current.style.strokeDashoffset = 1 - prog;
      if (mark.current) mark.current.style.top = `${prog * 100}%`;
      if (idx !== lastIdx.current) { lastIdx.current = idx; setCur(idx); }

      // Resting on page i, its piece is 80% drawn: the loop around the
      // work is closed, the drift to the next page starts as you scroll.
      aimPen(st / vh + 0.8);

      // Tilt / drop / fade the sheets near the viewport.
      for (let i = Math.max(0, idx - 2); i <= Math.min(secs.current.length - 1, idx + 2); i++) {
        const s = secs.current[i];
        if (!s) continue;
        const d = Math.max(-1, Math.min(1, (st - s.offsetTop) / vh)); // 0 = centred
        const sheet = s.firstElementChild;
        if (!sheet || reduce) continue;
        const tilt = H_TILTS[i % H_TILTS.length];
        sheet.style.transform = `translateY(${d * 90}px) rotate(${tilt + d * 9}deg) scale(${1 - Math.abs(d) * 0.14})`;
        sheet.style.opacity = String(Math.max(0, 1 - Math.abs(d) * 1.3));
      }
    });
  };

  const jumpTo = (i) => { setMenu(false); scroller.current.scrollTo({ top: secs.current[i].offsetTop, behavior: "smooth" }); };

  // Pencil scrollbar: drag or tap along the track to scrub.
  const track = React.useRef(null);
  const scrub = (e) => {
    const r = track.current.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    const el = scroller.current;
    el.scrollTop = f * (el.scrollHeight - el.clientHeight);
  };
  const trackPath = React.useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push([10 + (hRand(i, 99) - 0.5) * 9, (i / 24) * 1000]);
    return hSpline(pts);
  }, []);
  const page = pages[Math.min(cur, pages.length - 1)];

  return (
    <div className="mph">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="mph-pencil">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
      </svg>

      <header className="mph-top">
        <span>[ MIKI / GTXHI ]</span>
        <button onClick={() => setMenu((m) => !m)}>{menu ? "[ close ]" : "[ index ]"}</button>
      </header>

      <div className="mph-scroll" ref={scroller} onScroll={onScroll}>
        <svg className="mph-line" width={geo.w} height={geo.h} aria-hidden="true">
          {geo.pieces.map((pc, i) => (
            <g key={i}>
              {["mph-stroke mph-stroke--ghost", "mph-stroke"].map((cls, k) => (
                <path
                  key={k}
                  ref={(el) => { (lines.current[i] = lines.current[i] || [])[k] = el; }}
                  d={pc.d}
                  className={cls}
                  style={{ strokeDasharray: pc.total, strokeDashoffset: pc.total }}
                />
              ))}
            </g>
          ))}
          <g ref={tip} className="mph-tip"><circle r="3.2" /><text x="7" y="-6">✎</text></g>
        </svg>

        {pages.map((p, i) => (
          <section key={i} className={"mph-page mph-page--" + p.kind} ref={(el) => (secs.current[i] = el)}>
            {p.kind === "intro" && (
              <div className="mph-sheet mph-intro">
                <h1>[ GTXHI/<br />&nbsp;&nbsp;MIKI ]</h1>
                <p>sketchbook · {totalWorks} works</p>
                <small>scroll ↓ follow the line</small>
              </div>
            )}
            {p.kind === "chapter" && (
              <div className="mph-sheet mph-chapter">
                <small>chapter {p.cat.id}</small>
                <h2>[ {p.cat.label} ]</h2>
                {p.cat.desc && <p>{p.cat.desc}</p>}
              </div>
            )}
            {p.kind === "work" && (
              <figure className="mph-sheet mph-work">
                <img src={p.it.img} alt={p.it.title} loading="lazy" />
                <figcaption style={{ transform: `rotate(${(hRand(i, 3) - 0.5) * 6}deg)` }}>
                  <b>{p.it.title}</b>
                  <small>{String(workNo[i]).padStart(2, "0")} · {p.cat.label.toLowerCase()}{p.it.sub ? ` · ${p.it.sub}` : ""}</small>
                  {p.it.href && <a href={p.it.href} target="_blank">[ ▶ watch ]</a>}
                </figcaption>
              </figure>
            )}
            {p.kind === "end" && (
              <div className="mph-sheet mph-end">
                <h2>[ say hi ]</h2>
                <ProtoContact t={t} />
                <div className="mph-end-about"><ProtoAbout t={t} /></div>
              </div>
            )}
          </section>
        ))}
      </div>

      <div
        className="mph-bar"
        ref={track}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e); }}
        onPointerMove={(e) => e.buttons && scrub(e)}
        role="scrollbar"
        aria-valuenow={Math.round((cur / Math.max(1, pages.length - 1)) * 100)}
        aria-label="scroll position"
      >
        <svg viewBox="0 0 20 1000" preserveAspectRatio="none" aria-hidden="true">
          <path d={trackPath} className="mph-bar-track" />
          <path ref={bar} d={trackPath} className="mph-bar-ink" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
        </svg>
        <span ref={mark} className="mph-bar-mark" style={{ transform: `translateY(-50%) rotate(${(hRand(cur, 7) - 0.5) * 14}deg)` }}>
          [{String(page && page.kind === "work" ? workNo[cur] : 0).padStart(2, "0")}]
        </span>
      </div>

      {menu && (
        <nav className="mph-menu">
          {pages.map((p, i) => p.kind === "chapter" && (
            <button key={i} onClick={() => jumpTo(i)} style={{ transform: `rotate(${(hRand(i, 5) - 0.5) * 4}deg)` }}>
              <small>{p.cat.id}</small> {p.cat.label}
            </button>
          ))}
          <button onClick={() => jumpTo(pages.length - 1)}><small>→</small> CONTACT</button>
          <ProtoLang />
        </nav>
      )}
    </div>
  );
}
VariantH.label = "Sketchbook";

const PROTO_VARIANTS = [
  { key: "A", name: VariantA.label, C: VariantA },
  { key: "B", name: VariantB.label, C: VariantB },
  { key: "C", name: VariantC.label, C: VariantC },
  { key: "D", name: VariantD.label, C: VariantD },
  { key: "E", name: VariantE.label, C: VariantE },
  { key: "F", name: VariantF.label, C: VariantF },
  { key: "G", name: VariantG.label, C: VariantG },
  { key: "H", name: VariantH.label, C: VariantH },
];
// Round 3 (MobilePrototypeArt.jsx): I–L. Verdict: J (collage stacks) won;
// the switcher is gone and only J renders. A–I, K, L stay in the code for
// the throwaway prototype branch, not for main.

function MobilePrototype() {
  React.useEffect(() => { document.documentElement.classList.add("mp-body"); }, []);
  return <div className="mp-root"><VariantJ /></div>;
}

window.MobilePrototype = MobilePrototype;
