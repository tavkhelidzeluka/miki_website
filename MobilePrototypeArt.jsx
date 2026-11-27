// MobilePrototypeArt.jsx — PROTOTYPE ONLY (throwaway).
// Round 3 of "what should mobile look like?": four non-app, process-driven
// directions drawn from Miki's own materials. Loaded before
// MobilePrototype.jsx, which lists them in the switcher as I–L.
//   I  Light table — animator's desk: peg bar, onion skin, line boil, X-sheet
//   J  Collage pile — hand-cut halftone scraps you drag, flick, pick up
//   K  Darkroom    — black square; rub to develop the work as halftone dots
//   L  Riso zine   — stapled zine, misregistered two-pass ink, fold to turn

function artFrames(t) {
  return protoCategories(t).flatMap((c) => c.items.filter((i) => i.img).map((it) => ({ ...it, cat: c })));
}
const artReduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad = (n, w = 2) => String(n).padStart(w, "0");

function ArtInfo({ t, onClose, dark }) {
  return (
    <div className={"art-info" + (dark ? " art-info--dark" : "")}>
      <button className="art-info-close" onClick={onClose}>[ close ]</button>
      <h2>[ MIKI / GTXHI ]</h2>
      <ProtoAbout t={t} />
      <div style={{ height: 24 }} />
      <ProtoContact t={t} />
      <div style={{ height: 16 }} />
      <ProtoLang />
    </div>
  );
}

// ═══ I — Light table ═══════════════════════════════════════════════════
function VariantI() {
  const { t } = useLang();
  const frames = React.useMemo(() => artFrames(t), [t]);
  const n = frames.length;
  const [f, setF] = React.useState(0);
  const [onion, setOnion] = React.useState(true);
  const [info, setInfo] = React.useState(false);
  const sheet = React.useRef(null);
  const flipTimer = React.useRef(0);
  const step = (d) => setF((x) => (x + d + n) % n);

  // Line boil: the sheet jitters between 3 "drawings" on twos (12 fps).
  React.useEffect(() => {
    if (artReduce()) return;
    const boil = [[0, 0, 0], [0.8, -0.6, 0.25], [-0.6, 0.5, -0.2]];
    let k = 0;
    const id = setInterval(() => {
      k = (k + 1) % 3;
      const [x, y, r] = boil[k];
      if (sheet.current) sheet.current.style.transform = `translate(${x}px,${y}px) rotate(${r}deg)`;
    }, 83);
    return () => clearInterval(id);
  }, []);

  // Drag up/down on the table to scrub: every 46px = one drawing.
  const drag = React.useRef(null);
  const onDown = (e) => { drag.current = { y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e) => {
    if (!drag.current) return;
    const dy = drag.current.y - e.clientY;
    if (Math.abs(dy) >= 46) { step(dy > 0 ? 1 : -1); drag.current.y = e.clientY; }
  };
  const onUp = () => { drag.current = null; };
  const onWheel = (e) => { if (Math.abs(e.deltaY) > 20) step(e.deltaY > 0 ? 1 : -1); };

  // Hold to flip the whole pad at 12 fps.
  const flipStart = (e) => { e.preventDefault(); clearInterval(flipTimer.current); flipTimer.current = setInterval(() => step(1), 83); };
  const flipStop = () => clearInterval(flipTimer.current);
  React.useEffect(() => () => clearInterval(flipTimer.current), []);

  // Timing chart: tap / drag to jump.
  const chart = React.useRef(null);
  const chartAt = (e) => {
    const r = chart.current.getBoundingClientRect();
    setF(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
  };

  const cur = frames[f], prev = frames[(f - 1 + n) % n], next = frames[(f + 1) % n];
  const sc = cur.cat.id, frInScene = frames.slice(0, f + 1).filter((x) => x.cat.id === sc).length;

  return (
    <div className="mpi">
      <header className="mpi-top">
        <span>[ MIKI / GTXHI ]</span>
        <button onClick={() => setInfo(true)}>[ info ]</button>
      </header>

      <div className="mpi-table" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
        <div className="mpi-peg" aria-hidden="true"><i className="mpi-slot" /><i className="mpi-hole" /><i className="mpi-slot" /></div>
        <div className="mpi-sheet" ref={sheet}>
          <div className="mpi-punch" aria-hidden="true"><i className="mpi-slot" /><i className="mpi-hole" /><i className="mpi-slot" /></div>
          <div className="mpi-field" aria-hidden="true"><span>12F</span></div>
          {onion && <img className="mpi-onion mpi-onion--prev" src={prev.img} alt="" />}
          {onion && <img className="mpi-onion mpi-onion--next" src={next.img} alt="" />}
          <img className="mpi-art" src={cur.img} alt={cur.title} />
          <span className="mpi-corner">{pad(f + 1, 3)}</span>
        </div>
        <div className="mpi-hint" aria-hidden="true">↕ drag to scrub</div>
      </div>

      <div className="mpi-xsheet">
        <div><small>SC</small>{sc}</div>
        <div><small>FR</small>{pad(frInScene, 3)}</div>
        <div className="mpi-x-title"><small>ACTION</small>{cur.title}{cur.href && <a href={cur.href} target="_blank"> [ ▶ ]</a>}</div>
      </div>

      <div className="mpi-controls">
        <button data-on={onion} onClick={() => setOnion((o) => !o)}>◐ onion</button>
        <button className="mpi-flip" onPointerDown={flipStart} onPointerUp={flipStop} onPointerLeave={flipStop} onPointerCancel={flipStop}>▶ hold to flip</button>
        <span>{pad(f + 1, 3)}/{pad(n, 3)}</span>
      </div>

      <div className="mpi-chart" ref={chart} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); chartAt(e); }} onPointerMove={(e) => e.buttons && chartAt(e)}>
        {frames.map((x, i) => {
          const key = i === 0 || frames[i - 1].cat.id !== x.cat.id;
          return (
            <i key={i} className={"mpi-tick" + (key ? " mpi-tick--key" : "") + (i === f ? " mpi-tick--on" : "")} style={{ left: `${(i / (n - 1)) * 100}%` }}>
              {key && <b>{x.cat.id}</b>}
            </i>
          );
        })}
      </div>

      {info && <ArtInfo t={t} onClose={() => setInfo(false)} />}
    </div>
  );
}
VariantI.label = "Light table";

// ═══ J — Collage stacks (desktop language) ═════════════════════════════
// Screen 1 is the desktop home hero. Screen 2: each category is a neat
// stack of prints in a 2-column grid, labelled like the desktop project
// tiles. Tap a stack → its prints are dealt out into an ordered 3-column
// grid. SOCIAL MEDIA has one more level: it splits into stacks per campaign
// (posts by brand, each carousel, stories by brand, ads by brand) first.
// Tap a print → the desktop detail page. Every print is one absolutely
// positioned element, so moving between levels is one transform transition.
const J_TILE = 0.75; // tile height / width (desktop tiles are 4:3 crops)
const J_SOCIAL = "07";
const J_MOSAIC = new Set(["02", "06"]); // ILLUSTRATION, PHOTOS: mosaic by real proportions
const J_MESSY = "02";                   // ILLUSTRATION also has the messy pile (default)
const J_ANIM = "01";                    // ANIMATION: one wide 16:9 still per row, plays inline
const J_BOOKS = "05";                   // BOOKS: no images yet — black tiles, opens straight to detail
const J_SHOP = "04";                    // CANVAS: originals for sale — the only works with [ add to cart ]
// Prices are numbers (150) or text ("150 $", "Sold"); shown like the desktop: "150 $".
const jPriceNum = (p) => {
  if (typeof p === "number") return p > 0 ? p : null;
  const m = /^\s*[$€]?\s*(\d+(?:[.,]\d+)?)\s*[$€]?\s*$/.exec(String(p || ""));
  return m ? parseFloat(m[1].replace(",", ".")) : null;
};
const jPrice = (p) => {
  const n = jPriceNum(p);
  if (n) return `${n} $`;
  return typeof p === "string" && p.trim() ? p.trim() : null;
};

// Content images fade in once loaded; until then their frame shimmers (.jimg
// in mobile-prototype-art.css). An image already in the cache is marked
// straight away, and a broken one is marked too so the shimmer stops.
const jImgLoaded = (e) => e.currentTarget.classList.add("is-loaded");
const jImg = {
  className: "jimg",
  onLoad: jImgLoaded,
  onError: jImgLoaded,
  ref: (el) => { if (el && el.complete) el.classList.add("is-loaded"); },
};

// youtube.com/watch?v=ID or youtu.be/ID → privacy-friendly embed URL.
const ytEmbed = (u) => {
  const m = /(?:v=|youtu\.be\/)([\w-]{6,})/.exec(u || "");
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` : null;
};

// Social images grouped the way they were made: one group per campaign.
function socialGroups(lang) {
  const S = window.CONTENT.social || {};
  const vis = (a) => (a || []).filter((x) => !x.hidden);
  const ua = lang === "UA";
  const kinds = { posts: ua ? "пости" : "posts", carousel: ua ? "карусель" : "carousel", stories: ua ? "сторіс" : "stories", ads: ua ? "реклама" : "ads", reels: ua ? "рілс" : "reels" };
  const out = [];
  const byBrand = (list, kind) => {
    const m = new Map();
    const vids = new Map();
    vis(list).forEach((p) => {
      const b = p.brand || "—";
      if (!m.has(b)) { m.set(b, []); vids.set(b, []); }
      m.get(b).push(p.src); vids.get(b).push(p.videoUrl || null);
    });
    m.forEach((srcs, brand) => out.push({ key: `${kind}:${brand}`, kind: kinds[kind], label: brand, imgs: srcs, ytUrls: vids.get(brand) }));
  };
  byBrand(S.posts, "posts");
  vis(S.carousels).forEach((c) => out.push({
    key: `carousel:${c.id}`, kind: kinds.carousel, label: (ua ? c.title : c.titleEn) || c.title, brand: c.brand,
    imgs: [c.cover, ...(c.slides || [])].filter(Boolean),
  }));
  byBrand(S.stories, "stories");
  const reels = vis(S.reels);
  if (reels.length) out.push({
    key: "reels:REELS", kind: kinds.reels, label: "REELS",
    imgs: reels.map((r) => r.src), videos: reels.map((r) => r.video), titles: reels.map((r) => r.title || ""),
  });
  byBrand(S.ads, "ads");
  return out;
}

// Stories the visitor has opened, shared with the desktop Social page through
// the same key. A brand's ring turns grey only once all of its stories are seen.
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

function VariantJ() {
  const { t, lang } = useLang();
  const cats = React.useMemo(() => protoCategories(t).filter((c) => c.items.length), [t]);
  const groups = React.useMemo(() => socialGroups(lang), [lang]);
  // Every print on the desk. Social prints come from the campaign groups
  // (all posts, carousels, stories, ads), everything else from its category.
  const all = React.useMemo(() => {
    const out = [];
    cats.forEach((c) => {
      if (c.id === J_SOCIAL) {
        groups.forEach((g) => g.imgs.forEach((img, k) => out.push({
          img, cat: c, group: g.key, title: g.label, sub: `${g.kind} · ${pad(k + 1)}`,
        })));
      } else {
        c.items.filter((i) => i.img || c.id === J_BOOKS).forEach((it) => out.push({ ...it, cat: c, group: null }));
      }
    });
    return out;
  }, [cats, groups]);

  const [open, setOpen] = React.useState(-1); // index into cats, -1 = category stacks
  const [sub, setSub] = React.useState(-1);   // index into groups when SOCIAL is open
  const [picked, setPicked] = React.useState(null); // index into all
  // Story tray at the top of the Social media screen: one item per brand.
  const storyGroups = React.useMemo(() => groups.filter((g) => g.key.startsWith("stories:")), [groups]);
  const [seen, setSeen] = React.useState(readSeenStories);
  const [storyPos, setStoryPos] = React.useState(readStoryPos);
  const [drawer, setDrawer] = React.useState(false); // details drawer on the work page
  const [menu, setMenu] = React.useState(false);
  // Social feed: every post of every non-story group, the visitor's saved
  // posts, and the post a shared link points at.
  const feedGroups = React.useMemo(() => groups.filter((g) => !g.key.startsWith("stories:")), [groups]);
  const allPosts = React.useMemo(() => feedGroups.flatMap(feedPosts), [feedGroups]);
  const [saved, setSaved] = React.useState(readSaved);
  const [savedView, setSavedView] = React.useState(null); // null | { focus: null } (grid) | { focus, ids } (feed)
  const [feedFocus, setFeedFocus] = React.useState(null);
  const toggleSave = (id) => setSaved((list) => {
    const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
    writeSaved(next);
    return next;
  });
  // "See all from …" in a post's ••• menu opens the brand's posts group (a
  // carousel's brand usually has one), else the post's own group. Left out
  // when that group is the one already open.
  const seeAll = (openGroup) => (post) => {
    const g = groups.find((x) => x.key === `posts:${post.brand}`) || groups.find((x) => x.key === post.group);
    if (!g || g === openGroup) return null;
    return () => {
      setSavedView(null);
      setOpen(cats.findIndex((c) => c.id === J_SOCIAL));
      setSub(groups.indexOf(g));
      setFeedFocus(null);
    };
  };
  const [info, setInfo] = React.useState(null); // "about" | "contact"
  // Cart: same item shape as the desktop shop ({ id, title, medium, img,
  // price }), so the desktop CheckoutPage takes it as is.
  const [cart, setCart] = React.useState([]);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [checkout, setCheckout] = React.useState(false);
  const UI = window.CONTENT.ui.canvasPage;
  const desk = React.useRef(null);
  const projects = React.useRef(null);
  const toProjects = () => projects.current && projects.current.scrollIntoView({ behavior: artReduce() ? "auto" : "smooth" });
  const [size, setSize] = React.useState({ W: 343, H: 600 });
  // Illustration opens as a messy, draggable pile; "organized" = mosaic.
  const [illus, setIllus] = React.useState("messy");
  const [messSeed, setMessSeed] = React.useState(0);
  const [messPos, setMessPos] = React.useState({}); // index → {x, y, z} after a drag
  const zTop = React.useRef(100);

  // Natural aspect ratio of every mosaic print, so tall works can span two
  // rows and wide works two columns.
  const [aspects, setAspects] = React.useState({});
  React.useEffect(() => {
    let alive = true;
    all.filter((it) => J_MOSAIC.has(it.cat.id)).forEach((it) => {
      const im = new Image();
      im.onload = () => alive && setAspects((a) => (a[it.img] ? a : { ...a, [it.img]: im.naturalWidth / im.naturalHeight }));
      im.src = it.img;
    });
    return () => { alive = false; };
  }, [all]);

  React.useLayoutEffect(() => {
    // Observe the desk itself: its height changes with the window and when
    // the messy/organized row appears.
    const d = desk.current;
    const measure = () => setSize((s) => (s.W === d.clientWidth && s.H === d.clientHeight ? s : { W: d.clientWidth, H: d.clientHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(d);
    return () => ro.disconnect();
  }, []);
  React.useEffect(() => { if (desk.current) desk.current.scrollTop = 0; }, [open, sub]);
  // A shared link (#/post/<id>) opens that post in its group's feed. The hash
  // is cleared once used, so going back and reloading land on the site itself.
  React.useEffect(() => {
    const openLinked = () => {
      const id = linkedPost();
      const post = id && allPosts.find((p) => p.id === id);
      if (!post) return;
      history.replaceState(null, "", location.pathname + location.search);
      setPicked(null);
      setSavedView(null);
      setOpen(cats.findIndex((c) => c.id === J_SOCIAL));
      setSub(groups.findIndex((g) => g.key === post.group));
      setFeedFocus(post.id);
      if (projects.current) projects.current.scrollIntoView();
    };
    openLinked();
    window.addEventListener("hashchange", openLinked);
    return () => window.removeEventListener("hashchange", openLinked);
  }, [allPosts]);

  const cat = open >= 0 ? cats[open] : null;
  const social = cat && cat.id === J_SOCIAL;
  const group = social && sub >= 0 ? groups[sub] : null;

  // ─── The current view: either stacks (keyed) or a dealt grid (a set). ───
  const view = !cat
    ? { mode: "stacks", keyOf: (it) => it.cat.id, stacks: cats.map((c) => ({ key: c.id, tag: c.id, label: c.label })) }
    : social && !group
      ? { mode: "stacks", keyOf: (it) => (it.cat.id === J_SOCIAL ? it.group : null), stacks: groups.filter((g) => !g.key.startsWith("stories:")).map((g) => ({ key: g.key, tag: g.kind, label: g.label, n: g.imgs.length })) }
      : { mode: "grid", inSet: (it) => (group ? it.group === group.key : it.cat.id === cat.id) };

  // Rank of each print inside its category, its group, and the open set.
  const ranks = React.useMemo(() => {
    const byCat = {}, byGroup = {};
    return all.map((it) => ({
      cat: (byCat[it.cat.id] = (byCat[it.cat.id] ?? -1) + 1),
      group: it.group ? (byGroup[it.group] = (byGroup[it.group] ?? -1) + 1) : 0,
    }));
  }, [all]);
  const setItems = view.mode === "grid" ? all.filter(view.inSet) : [];

  const { W, H } = size;
  const gap = 14;
  const nStacks = view.mode === "stacks" ? view.stacks.length : cats.length;
  const sRows = Math.ceil(nStacks / 2);
  // Stacks fill the screen; with more than 3 rows (social) they keep a
  // readable size and the desk scrolls, with the next row peeking in.
  const cellW = (W - gap) / 2, cellH = sRows > 3 ? Math.max(170, (H - 40) / 3) : Math.max(150, H / sRows);
  const sTileW = Math.min(cellW * 0.8, ((cellH - 34) / J_TILE) * 0.86);
  const gGap = 8, gTileW = (W - gGap * 2) / 3, gTileH = gTileW * J_TILE, gRowH = gTileH + 26;

  // Photos + Illustration: a 2-column masonry at each work's real
  // proportions. Landscape works span both columns. Before a full-width
  // print, and at the very end, the shorter column's last print stretches
  // (a slight cover crop) so no hole is ever left — the right edge and the
  // bottom always land flush.
  const mosaic = view.mode === "grid" && !group && J_MOSAIC.has(cat.id);
  const messy = mosaic && cat.id === J_MESSY && illus === "messy";
  const anim = view.mode === "grid" && !group && cat.id === J_ANIM;
  const aTileH = W * 9 / 16, aRowH = aTileH + 34;
  const packed = (() => {
    if (!mosaic) return null;
    const mGap = 8, cw = (W - mGap) / 2, colX = [0, cw + mGap];
    const colY = [6, 6], last = [null, null], pos = [];
    const flush = () => {
      const target = Math.max(colY[0], colY[1]);
      [0, 1].forEach((c) => {
        const q = last[c];
        if (q && q.w <= cw + 1 && colY[c] < target) { q.h += target - colY[c]; colY[c] = target; }
      });
    };
    const ratio = (k) => aspects[setItems[k].img] || 1;
    const placeWide = (k) => {
      flush();
      const y = Math.max(colY[0], colY[1]), q = { x: 0, y, w: W, h: W / ratio(k) };
      pos[k] = q;
      colY[0] = colY[1] = y + q.h + mGap;
      last[0] = last[1] = q;
    };
    // A wide work waits until the columns are nearly level (portrait works
    // fill the shorter one first), so it never leaves an empty column above
    // it — that was the blank space on the right.
    const pending = [];
    const level = () => Math.abs(colY[0] - colY[1]) <= cw * 0.3;
    setItems.forEach((_, k) => {
      if (ratio(k) > 1.3) { pending.push(k); }
      else {
        const c = colY[0] <= colY[1] ? 0 : 1, q = { x: colX[c], y: colY[c], w: cw, h: cw / ratio(k) };
        pos[k] = q;
        colY[c] += q.h + mGap;
        last[c] = q;
      }
      while (pending.length && level()) placeWide(pending.shift());
    });
    pending.forEach(placeWide);
    flush();
    return { pos, height: Math.max(colY[0], colY[1]) + 6 };
  })();
  // Messy: prints at their own proportions, scattered and tilted over the
  // visible desk; a dragged print keeps where you dropped it.
  const mess = messy ? setItems.map((it, k) => {
    const ar = aspects[it.img] || 1, s = k * 7 + messSeed;
    let w = Math.min(W * 0.55, 118 + hRand(s, 1) * 72), h = w / ar;
    if (h > H * 0.5) { h = H * 0.5; w = h * ar; }
    const base = { x: hRand(s, 2) * (W - w * 0.8) - w * 0.1, y: 6 + hRand(s, 3) * Math.max(0, H - h - 12), w, h, r: (hRand(s, 4) - 0.5) * 30, z: 3 + k };
    const i = all.indexOf(it);
    return messPos[i] ? { ...base, ...messPos[i] } : base;
  }) : null;

  const sheetH = view.mode !== "grid" ? Math.max(H, sRows * cellH)
    : messy ? H
    : mosaic ? packed.height
    : anim ? setItems.length * aRowH + 12
    : Math.ceil(setItems.length / 3) * gRowH + 12;

  // A stack at slot s; the top 4 prints show, the rest hide underneath.
  const stackAt = (s, k, seed, shown) => {
    const col = s % 2, row = Math.floor(s / 2);
    const cx = col * (cellW + gap) + cellW / 2, cy = row * cellH + (cellH - 30) / 2;
    const kk = Math.min(k, 3);
    const r = kk === 0 ? (hRand(seed, 9) - 0.5) * 3 : (hRand(seed, kk) - 0.5) * 16;
    const dx = kk === 0 ? 0 : (hRand(seed, kk + 4) - 0.5) * 12, dy = kk === 0 ? 0 : (hRand(seed, kk + 8) - 0.5) * 8;
    return {
      x: cx - sTileW / 2 + dx, y: cy - (sTileW * J_TILE) / 2 + dy, w: sTileW, h: sTileW * J_TILE, r,
      o: shown && k < 4 ? 1 : 0, z: 1 + (3 - kk), delay: shown ? (3 - kk) * 30 : 0, live: shown,
    };
  };
  const place = (it, i) => {
    const rk = ranks[i];
    if (view.mode === "grid") {
      if (view.inSet(it)) {
        const k = setItems.indexOf(it);
        if (messy) return { ...mess[k], o: 1, delay: k * 28, live: true };
        if (mosaic) return { ...packed.pos[k], r: 0, o: 1, z: 2, delay: k * 28, live: true };
        if (anim) return { x: 0, y: k * aRowH + 6, w: W, h: aTileH, r: 0, o: 1, z: 2, delay: k * 40, live: true };
        const col = k % 3, row = Math.floor(k / 3);
        return { x: col * (gTileW + gGap), y: row * gRowH + 6, w: gTileW, h: gTileH, r: 0, o: 1, z: 2, delay: k * 28, live: true };
      }
    } else {
      const key = view.keyOf(it);
      const s = key == null ? -1 : view.stacks.findIndex((st) => st.key === key);
      // Depth in the stack: rank within the category, or within the
      // campaign group on the social level.
      if (s >= 0) return stackAt(s, social ? rk.group : rk.cat, s * 13 + (social ? 7 : 0), true);
    }
    // Not part of this view: tuck it away, hidden, under its category stack.
    return stackAt(Math.max(0, cats.findIndex((c) => c.id === it.cat.id)), 3, 0, false);
  };

  const tap = (it, i) => {
    if (!cat && it.cat.id === J_BOOKS) { setPicked(all.findIndex((x) => x.cat.id === J_BOOKS)); return; }
    if (!cat) { setOpen(cats.findIndex((c) => c.id === it.cat.id)); setSub(-1); return; }
    if (social && !group) { setSub(groups.findIndex((g) => g.key === it.group)); return; }
    setPicked(i);
  };
  // Messy pile: drag a print anywhere; a tap (no movement) opens it.
  const drag = React.useRef(null);
  const dDown = (i, p) => (e) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    el.style.transition = "none";
    el.style.transitionDelay = "0ms";
    el.style.zIndex = ++zTop.current;
    drag.current = { i, el, sx: e.clientX, sy: e.clientY, x: p.x, y: p.y, r: p.r, nx: p.x, ny: p.y, moved: 0 };
  };
  const dMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    d.moved = Math.max(d.moved, Math.abs(dx) + Math.abs(dy));
    d.nx = d.x + dx; d.ny = d.y + dy;
    d.el.style.transform = `translate(${d.nx}px,${d.ny}px) rotate(${d.r}deg)`;
  };
  const dUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    d.el.style.transition = "";
    if (d.moved < 6) { setPicked(d.i); return; }
    setMessPos((m) => ({ ...m, [d.i]: { x: d.nx, y: d.ny, z: zTop.current } }));
  };
  const setMode = (m) => {
    if (m === "messy" && illus === "messy") { setMessSeed((s) => s + 17); setMessPos({}); } // reshuffle
    setIllus(m);
  };

  const back = () => { if (group) setSub(-1); else { setOpen(-1); setSub(-1); } };
  const cycle = (d) => {
    if (group) setSub((x) => (x + d + groups.length) % groups.length);
    else { setOpen((x) => (x + d + cats.length) % cats.length); setSub(-1); }
  };
  const pk = picked != null && all[picked];
  const pkList = pk ? all.filter((x) => (pk.group ? x.group === pk.group : x.cat.id === pk.cat.id)) : [];
  const pkPos = pk ? pkList.indexOf(pk) : -1;
  const step = (d) => {
    // Stories: step within the brand; from its first or last story, move to the
    // neighbouring brand (as the desktop viewer does).
    const isStory = !!(pk && pk.group && pk.group.startsWith("stories:"));
    if (isStory && (pkPos + d < 0 || pkPos + d >= pkList.length)) { moveGroup(d); return; }
    const nx = pkList[(pkPos + d + pkList.length) % pkList.length];
    setPicked(all.indexOf(nx));
  };

  const shopId = (i) => pad(ranks[i].cat + 1);
  const inCart = (i) => cart.some((c) => c.id === shopId(i));
  const toggleCart = (i) => {
    const it = all[i], id = shopId(i);
    setCart((c) => (c.some((x) => x.id === id) ? c.filter((x) => x.id !== id) : [...c, { id, title: it.title, medium: it.medium || it.sub || "", img: it.img, price: jPriceNum(it.price) }]));
  };

  // The work-page track follows `picked` (arrows, opening a work) and
  // `picked` follows the track (finger). Opening jumps; arrows glide.
  const track = React.useRef(null);
  const trackOpened = React.useRef(false);
  React.useLayoutEffect(() => {
    const el = track.current;
    if (!el || pkPos < 0) { trackOpened.current = false; return; }
    const target = pkPos * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) < 2) { trackOpened.current = true; return; }
    el.scrollTo({ left: target, behavior: trackOpened.current && !artReduce() ? "smooth" : "auto" });
    trackOpened.current = true;
  }, [picked]);
  // Stories autoplay like Instagram: each one advances after 5s (the fill on
  // .mpj-seg in mobile-prototype-art.css), and the last one closes the viewer.
  const pkIsStory = !!(pk && pk.group && pk.group.startsWith("stories:"));
  // Swipe (or the end of a brand's autoplay) moves to the neighbouring brand,
  // resuming at the story it was left on; past the first or last, it closes.
  const moveGroup = (d) => {
    const gi = storyGroups.findIndex((g) => g.key === pk.group);
    const ng = storyGroups[gi + d];
    if (!ng) { setPicked(null); setDrawer(false); return; }
    const first = all.findIndex((x) => x.group === ng.key);
    setPicked(first + Math.min(storyPos[ng.key] || 0, ng.imgs.length - 1));
  };
  const storySwipe = React.useRef(null);
  const onDetailTouchStart = (e) => {
    if (!pkIsStory) return;
    const t0 = e.touches[0];
    storySwipe.current = { x: t0.clientX, y: t0.clientY };
  };
  const onDetailTouchEnd = (e) => {
    const s = storySwipe.current;
    storySwipe.current = null;
    if (!s || drawer) return;
    const t1 = e.changedTouches[0];
    const dx = t1.clientX - s.x, dy = t1.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) moveGroup(dx < 0 ? 1 : -1);
  };
  // Autoplay: 5s per story, paused while the details drawer is open. The timer
  // keeps the time that is left, so resuming carries on where it stopped.
  const storyTimer = React.useRef({ left: 5000, started: 0, id: 0 });
  React.useEffect(() => { storyTimer.current.left = 5000; }, [picked]);
  React.useEffect(() => {
    if (!pkIsStory || drawer) return;
    const tm = storyTimer.current;
    tm.started = performance.now();
    tm.id = setTimeout(() => {
      if (pkPos < pkList.length - 1) step(1);
      else moveGroup(1);
    }, tm.left);
    return () => {
      clearTimeout(tm.id);
      tm.left = Math.max(0, tm.left - (performance.now() - tm.started));
    };
  }, [picked, pkIsStory, drawer]);
  // Opening a story marks it seen and remembers where the visitor stopped.
  React.useEffect(() => {
    if (!pkIsStory) return;
    if (pk.img && !seen.includes(pk.img)) {
      const next = [...seen, pk.img];
      setSeen(next);
      writeSeenStories(next);
    }
    const nextPos = { ...storyPos, [pk.group]: pkPos };
    setStoryPos(nextPos);
    writeStoryPos(nextPos);
  }, [picked, pkIsStory]);
  // A tap moves the track with a smooth scroll; scroll events from that move
  // (or the snap still settling) must not push the page back, so they are
  // ignored for a moment after a tap.
  const tapLock = React.useRef(0);
  const onTrackScroll = (e) => {
    if (performance.now() < tapLock.current) return;
    const el = e.currentTarget, k = Math.round(el.scrollLeft / el.clientWidth);
    // Only settle once the snap has landed on a page.
    if (k !== pkPos && Math.abs(el.scrollLeft - k * el.clientWidth) < 2 && pkList[k]) setPicked(all.indexOf(pkList[k]));
  };

  // Category screens: a clear horizontal swipe = the ← → arrows. Vertical
  // scrolling and dragging prints in the messy pile are left alone.
  const swipe = React.useRef(null);
  const onDeskTouchStart = (e) => {
    if (!cat || e.target.closest(".mpj-print--drag")) { swipe.current = null; return; }
    const t0 = e.touches[0];
    swipe.current = { x: t0.clientX, y: t0.clientY, t: performance.now() };
  };
  const onDeskTouchEnd = (e) => {
    const sw = swipe.current;
    swipe.current = null;
    if (!sw) return;
    const t1 = e.changedTouches[0], dx = t1.clientX - sw.x, dy = t1.clientY - sw.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && performance.now() - sw.t < 700) cycle(dx < 0 ? 1 : -1);
  };
  // Story tray: one item per brand, opening its stories where they were left.
  // Shown on the Social media screen and, Instagram-style, atop the post feeds.
  const storyTray = (variant) => storyGroups.length > 0 && (
    <div className={"mpj-tray" + (variant ? ` mpj-tray--${variant}` : "")}>
      {storyGroups.map((g) => {
        const first = all.findIndex((x) => x.group === g.key);
        const done = g.imgs.every((s) => seen.includes(s));
        return (
          <button
            key={g.key}
            type="button"
            className={"mpj-tray-item" + (done ? " is-seen" : "")}
            onClick={() => { if (first >= 0) setPicked(first + Math.min(storyPos[g.key] || 0, g.imgs.length - 1)); }}
            aria-label={g.label}
          >
            <span className="mpj-tray-ring">
              <span className="mpj-tray-img" style={{ backgroundImage: `url("${g.imgs[0]}")` }} />
            </span>
            <span className="mpj-tray-brand">{g.label}</span>
          </button>
        );
      })}
    </div>
  );
  const navLink = (label, onClick) => (
    <button className="mpj-menu-link" onClick={() => { setMenu(false); onClick && onClick(); }}>[ {label} ]</button>
  );

  return (
    <div className="mpj">
      <header className="mpj-nav">
        {cat
          ? <button className="mpj-link" onClick={back}>[ {lang === "UA" ? "назад" : "back"} ]</button>
          : <span className="mpj-link">[ MIKI / GTXHI ]</span>}
        <span className="mpj-nav-right">
          {cart.length > 0 && (
            <button className="mpj-link" onClick={() => { setMenu(false); setCartOpen(true); }}>[ {t(UI.cartHeader).toLowerCase()} {pad(cart.length)} ]</button>
          )}
          <button className="mpj-link" onClick={() => setMenu((m) => !m)}>[ {menu ? (lang === "UA" ? "закрити" : "close") : (lang === "UA" ? "меню" : "menu")} ]</button>
        </span>
      </header>

      {/* Screen 1: the desktop home, as is — [ GTXHI/ over the halftone
          portrait, MIKI ] below, brackets sliding out from the centre. */}
      <section className="mpj-hero">
        <div className="mpj-hero-bg" aria-hidden="true" />
        <div className="mpj-hero-mark mpj-hero-mark--tl" onClick={toProjects}>
          <span className="mpj-hero-br mpj-hero-br--l">[</span><span className="mpj-hero-tx mpj-hero-tx--l">&nbsp;GTXHI/</span>
        </div>
        <div className="mpj-hero-mark mpj-hero-mark--br" onClick={() => setInfo("about")}>
          <span className="mpj-hero-tx mpj-hero-tx--r">MIKI&nbsp;</span><span className="mpj-hero-br mpj-hero-br--r">]</span>
        </div>
        <button className="mpj-hero-cue" onClick={toProjects} aria-label="scroll to projects">[ ↓ ]</button>
      </section>

      {/* Screen 2: the collage stacks. */}
      <section className="mpj-projects" ref={projects}>
        <div className="mpj-head">
          {group ? (
            <React.Fragment><span>[ {cat.id} ] · {group.kind}</span><b>{group.label}</b></React.Fragment>
          ) : cat ? (
            <React.Fragment><span>[ {cat.id} ]</span><b>{cat.label}</b></React.Fragment>
          ) : (
            <React.Fragment><span>{all.length} {lang === "UA" ? "робіт" : "works"}</span><b>[ {t(window.CONTENT.ui.nav.projects)} ]</b></React.Fragment>
          )}
        </div>

        {cat && !group && cat.id === J_MESSY && (
          <div className="mpj-mode" role="group" aria-label="layout">
            <button data-on={illus === "messy"} onClick={() => setMode("messy")}>[ {lang === "UA" ? "хаос" : "messy"} ]</button>
            <button data-on={illus === "organized"} onClick={() => setMode("organized")}>[ {lang === "UA" ? "порядок" : "organized"} ]</button>
            {illus === "messy" && <small>{lang === "UA" ? "перетягуйте · торкніться [ хаос ] щоб перемішати" : "drag them · tap [ messy ] to reshuffle"}</small>}
          </div>
        )}

        {social && !group && storyTray()}
        <div className="mpj-desk mpj-desk--open" ref={desk} onTouchStart={onDeskTouchStart} onTouchEnd={onDeskTouchEnd}>
          <div className="mpj-sheet" style={{ height: sheetH }}>
            {all.map((it, i) => {
              const p = place(it, i);
              const draggable = messy && p.live;
              return (
                <button
                  key={i}
                  className={"mpj-print" + (draggable ? " mpj-print--drag" : "")}
                  tabIndex={p.live ? 0 : -1}
                  aria-hidden={!p.live}
                  aria-label={p.live ? it.title : undefined}
                  onClick={(e) => { if (!p.live) return; if (draggable && e.detail) return; tap(it, i); }}
                  onPointerDown={draggable ? dDown(i, p) : undefined}
                  onPointerMove={draggable ? dMove : undefined}
                  onPointerUp={draggable ? dUp : undefined}
                  onPointerCancel={draggable ? dUp : undefined}
                  style={{
                    width: p.w, height: p.h, opacity: p.o, zIndex: p.z,
                    transform: `translate(${p.x}px,${p.y}px) rotate(${p.r}deg)`,
                    transitionDelay: `${p.delay}ms`,
                    pointerEvents: p.live && p.o ? "auto" : "none",
                  }}
                >
                  {it.img
                    ? <img {...jImg} src={it.img} alt="" loading="lazy" draggable="false" />
                    : <span className="mpj-blank">{it.cat.label}</span>}
                </button>
              );
            })}

            {/* Labels: under each stack, or under each dealt print. */}
            {view.mode === "stacks" && view.stacks.map((st, si) => (
              <div key={st.key} className="mpj-label mpj-label--stack" style={{ left: (si % 2) * (cellW + gap), top: Math.floor(si / 2) * cellH + cellH - 30, width: cellW }}>
                <span>[ {st.tag} ]</span><span className="mpj-label-name">{st.label}</span>
              </div>
            ))}
            {anim && setItems.map((it, k) => (
              <div key={"a" + k} className="mpj-label mpj-label--anim" style={{ left: 0, top: k * aRowH + 6 + aTileH + 6, width: W, animationDelay: `${200 + k * 40}ms` }}>
                <span>{it.title}</span><span>{it.sub}</span>
              </div>
            ))}
            {view.mode === "grid" && !mosaic && !anim && setItems.map((it, k) => (
              <div key={(group ? group.key : cat.id) + k} className="mpj-label mpj-label--grid" style={{ left: (k % 3) * (gTileW + gGap), top: Math.floor(k / 3) * gRowH + 6 + gTileH + 4, width: gTileW, animationDelay: `${200 + k * 28}ms` }}>
                <span>[ {pad(k + 1)} ]</span> {group ? "" : it.title}
              </div>
            ))}
            {/* Mosaic: the number sits on the print's corner (no room under it). */}
            {mosaic && !messy && packed.pos.map((q, k) => (
              <div key={cat.id + "m" + k} className="mpj-label mpj-label--chip" style={{ left: q.x, top: q.y + q.h - 20, animationDelay: `${300 + k * 28}ms` }}>
                [ {pad(k + 1)} ]
              </div>
            ))}
          </div>
        </div>

        <footer className="mpj-bar">
          {cat ? (
            <React.Fragment>
              <button className="mpj-arrow" onClick={() => cycle(-1)} aria-label={group ? "previous group" : "previous category"}>←</button>
              <div className="mpj-cat">
                {group
                  ? <React.Fragment><span>[ {group.kind} ] · {group.imgs.length}</span><b>{group.label}</b></React.Fragment>
                  : <React.Fragment><span>[ {cat.id} ] · {social ? `${groups.length} ${lang === "UA" ? "груп" : "groups"}` : setItems.length}</span><b>{cat.label}</b></React.Fragment>}
              </div>
              <button className="mpj-arrow" onClick={() => cycle(1)} aria-label={group ? "next group" : "next category"}>→</button>
            </React.Fragment>
          ) : (
            <div className="mpj-cat mpj-cat--hint"><b>{lang === "UA" ? "торкніться стосу" : "tap a stack to deal it out"}</b></div>
          )}
        </footer>
      </section>

      {menu && (
        <nav className="mpj-menu">
          {navLink(t(window.CONTENT.ui.nav.projects), () => { setOpen(-1); setSub(-1); toProjects(); })}
          {navLink(t(window.CONTENT.ui.nav.about), () => setInfo("about"))}
          {navLink(t(window.CONTENT.ui.nav.canvas), () => { setOpen(cats.findIndex((c) => c.id === "04")); setSub(-1); toProjects(); })}
          {navLink(t(window.CONTENT.ui.nav.contact), () => setInfo("contact"))}
          {navLink(`${lang === "UA" ? "ЗБЕРЕЖЕНЕ" : "SAVED"} ${pad(saved.length)}`, () => setSavedView({ focus: null }))}
          <span className="mpj-menu-lang"><ProtoLang /></span>
        </nav>
      )}

      {pk && (
        <div className={"mpj-detail" + (pkIsStory && drawer ? " mpj-detail--paused" : "")} onTouchStart={onDetailTouchStart} onTouchEnd={onDetailTouchEnd}>
          {pk.group && pk.group.startsWith("stories:") && (
            <div className="mpj-progress">
              {pkList.map((_, k) => (
                <span key={k} className={"mpj-seg" + (k < pkPos ? " is-done" : k === pkPos ? " is-active" : "")} />
              ))}
            </div>
          )}
          <button className="mpj-link mpj-close" onClick={() => { setPicked(null); setDrawer(false); }}>[ close × ]</button>
          {/* The work alone; tapping it tucks the drawer away. */}
          {/* Swipe sideways through the set: a scroll-snap track, one work
              per page. Only the current work embeds its video; neighbours
              show their still. */}
          <div
            className={"mpj-track" + (pkIsStory ? " mpj-track--story" : "")}
            ref={track}
            onScroll={onTrackScroll}
            onClick={(e) => {
              // Stories: tap the left half to go back, the right half to go on.
              if (pkIsStory) {
                const r = e.currentTarget.getBoundingClientRect();
                tapLock.current = performance.now() + 700;
                step(e.clientX - r.left < r.width / 2 ? -1 : 1);
              }
              setDrawer(false);
            }}
          >
            {pkList.map((w, k) => pkIsStory && k !== pkPos ? null : (
              <div key={k} className="mpj-detail-img mpj-slide">
                {k === pkPos && ytEmbed(w.href)
                  ? <div className="mpj-video"><iframe src={ytEmbed(w.href)} title={w.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
                  : w.img
                    ? <img {...jImg} className="jimg jimg--lift" src={w.img} alt={w.title} loading={Math.abs(k - pkPos) <= 1 ? "eager" : "lazy"} draggable="false" />
                    : <div className="mpj-cover"><span>[ {w.cat.id} ] {w.cat.name}</span></div>}
              </div>
            ))}
          </div>
          {/* Same bar as switching projects: ← [ 05 / 10 ] TITLE ▴ → . The
              middle opens a drawer with the details; it stays open while you
              step through works. */}
          <footer className="mpj-bar mpj-bar--detail">
            <div className={"mpj-drawer" + (drawer ? " mpj-drawer--open" : "")} aria-hidden={!drawer}>
              <div className="mpj-drawer-panel" id="mpj-drawer">
                <button className="mpj-drawer-grab" onClick={() => setDrawer(false)} aria-label="close details"><i /></button>
                <div className="mpj-detail-label">[ {pk.cat.id} ] / {pk.cat.label}{(pk.year || pk.cat.year) ? ` / ${pk.year || pk.cat.year}` : ""}</div>
                <h2 className="mpj-detail-title">{pk.title}</h2>
                {pk.sub && <p className="mpj-detail-desc">{pk.sub}</p>}
                <dl className="mpj-detail-table">
                  <dt>CLIENT</dt><dd>{pk.group ? pk.title : (pk.client || pk.cat.client || "")}</dd>
                  <dt>ROLE</dt><dd>{pk.role || pk.cat.role || ""}</dd>
                  <dt>MEDIUM</dt><dd>{pk.medium || pk.cat.medium || ""}</dd>
                  <dt>PRICE</dt><dd>{jPrice(pk.price) || (pk.cat.id === J_SHOP ? t(UI.priceOnRequest) : "—")}</dd>
                </dl>
                {pk.href && <a className="mpj-link mpj-watch" href={pk.href} target="_blank">[ ▶ watch ]</a>}
                {pk.cat.id === J_SHOP && (
                  <div className="mpj-buy">
                    <button className="mpj-buy-btn" data-on={inCart(picked)} onClick={() => toggleCart(picked)}>
                      {inCart(picked)
                        ? `[ ${lang === "UA" ? "у кошику ✓ · прибрати" : "in cart ✓ · remove"} ]`
                        : `[ ${lang === "UA" ? "додати в кошик" : "add to cart"} → ]`}
                    </button>
                    {cart.length > 0 && (
                      <button className="mpj-link mpj-buy-view" onClick={() => setCartOpen(true)}>[ {t(UI.cartHeader).toLowerCase()} {pad(cart.length)} → ]</button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button className="mpj-arrow" onClick={() => step(-1)} aria-label="previous work">←</button>
            <button className="mpj-cat mpj-cat--toggle" onClick={() => setDrawer((d) => !d)} aria-expanded={drawer} aria-controls="mpj-drawer">
              <span>[ {pad(pkPos + 1)} / {pad(pkList.length)} ] · {drawer ? (lang === "UA" ? "сховати" : "hide details") : (lang === "UA" ? "деталі" : "details")} {drawer ? "▾" : "▴"}</span>
              <b>{pk.title}</b>
            </button>
            <button className="mpj-arrow" onClick={() => step(1)} aria-label="next work">→</button>
          </footer>
        </div>
      )}
      {group && (() => {
        const nextGroup = feedGroups[feedGroups.indexOf(group) + 1];
        const posts = feedPosts(group);
        const ua = lang === "UA";
        return (
          <JFeed
            key={group.key}
            title={posts[0].handle}
            heading={group.kind}
            posts={posts}
            focus={feedFocus}
            lang={lang}
            saved={saved}
            onToggleSave={toggleSave}
            seeAll={seeAll(group)}
            top={storyTray("ig")}
            onBack={() => { setSub(-1); setFeedFocus(null); }}
            onSaved={() => setSavedView({ focus: null })}
            end={
              <div className="ig-end">
                <span className="ig-end-check" aria-hidden="true">✓</span>
                <b>{ua ? "Ви все переглянули" : "You're all caught up"}</b>
                {nextGroup
                  ? <button className="ig-end-next" onClick={() => { setSub(groups.indexOf(nextGroup)); setFeedFocus(null); }}>{ua ? "Далі" : "Next"}: {nextGroup.label} →</button>
                  : <button className="ig-end-next" onClick={() => { setSub(-1); setFeedFocus(null); }}>{ua ? "Назад до груп" : "Back to groups"}</button>}
              </div>
            }
          />
        );
      })()}
      {/* Saved: the grid, or (after a tap) those posts as a feed. The feed
          keeps the list it opened with, so un-saving a post there doesn't
          pull it out from under the visitor. */}
      {savedView && (savedView.focus
        ? (
          <JFeed
            key="saved"
            title={lang === "UA" ? "Збережене" : "Saved"}
            heading={lang === "UA" ? "Публікації" : "Posts"}
            posts={savedView.ids.map((id) => allPosts.find((p) => p.id === id)).filter(Boolean)}
            focus={savedView.focus}
            lang={lang}
            saved={saved}
            onToggleSave={toggleSave}
            seeAll={seeAll(null)}
            top={storyTray("ig")}
            onBack={() => setSavedView({ focus: null })}
          />
        ) : (
          <JSaved
            posts={saved.map((id) => allPosts.find((p) => p.id === id)).filter(Boolean)}
            lang={lang}
            onOpen={(id) => setSavedView({ focus: id, ids: saved.slice() })}
            onBack={() => setSavedView(null)}
          />
        ))}
      {info === "about" && <JAbout t={t} lang={lang} onClose={() => setInfo(null)} />}
      {info === "contact" && <JContact t={t} onClose={() => setInfo(null)} />}
      {cartOpen && (
        <JCart
          t={t} lang={lang} cart={cart}
          onRemove={(id) => setCart((c) => c.filter((x) => x.id !== id))}
          onClear={() => setCart([])}
          onClose={() => setCartOpen(false)}
          onCheckout={() => { setCartOpen(false); setCheckout(true); }}
        />
      )}
      {checkout && (
        <div className="mpj-checkout">
          <CheckoutPage
            cart={cart}
            onClose={() => setCheckout(false)}
            onPlaced={() => { setCart([]); setCheckout(false); setPicked(null); }}
          />
        </div>
      )}
    </div>
  );
}
VariantJ.label = "Collage stacks";

// Instagram-style feed for one social group: posts top to bottom, a carousel
// as a single post you swipe through, ads marked "Sponsored". Double-tap a
// photo to like it (likes only last for this visit). Saved posts persist in
// this browser and are listed on the Saved screen. Every post has its own
// link, #/post/<id>, which opens straight to it.
const IG_PATHS = {
  back: "M15 4 7 12l8 8",
  heart: "M12 20.5s-7.6-4.7-9.4-9.4C1.3 7.6 3.5 4.3 7 4.3c2.1 0 3.6 1.1 5 2.9 1.4-1.8 2.9-2.9 5-2.9 3.5 0 5.7 3.3 4.4 6.8-1.8 4.7-9.4 9.4-9.4 9.4z",
  share: "M21.5 3 10 13.2M21.5 3l-7 18-4.5-7.8L2.5 9z",
  save: "M18.5 21 12 15.3 5.5 21V3h13z",
  link: "M10 14a4.5 4.5 0 0 0 6.4 0l3.3-3.3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3.3 3.3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2",
  grid: "M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18",
};
function IgIcon({ name, filled }) {
  if (name === "more") {
    return (
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        {[5, 12, 19].map((x) => <circle key={x} cx={x} cy="12" r="1.6" fill="currentColor" />)}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d={IG_PATHS[name]} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// The posts of a group as the feed shows them. A post's id is its image path
// under assets/images/social without the extension (legnacat/post-1), or
// carousel-<id> for a carousel, so links survive reordering.
function feedPosts(group) {
  const isCarousel = group.key.startsWith("carousel:");
  const base = {
    group: group.key,
    brand: isCarousel ? group.brand || group.label : group.label,
    handle: (isCarousel ? group.brand || group.label : group.label).replace(/^@/, "").toLowerCase(),
    avatar: group.imgs[0],
    sponsored: group.key.startsWith("ads:"),
  };
  if (isCarousel) return [{ ...base, id: "carousel-" + group.key.slice("carousel:".length), imgs: group.imgs, caption: group.label }];
  // A brand's feed posts are one post you swipe through, like a carousel.
  if (group.key.startsWith("posts:")) return [{
    ...base, imgs: group.imgs, caption: null,
    id: "posts-" + group.label.replace(/^@/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  }];
  if (group.videos) return group.imgs.map((src, k) => ({
    ...base, handle: "gtxhi", imgs: [src], video: group.videos[k], caption: group.titles[k] || null,
    id: "reel-" + String(k + 1).padStart(2, "0"),
  }));
  return group.imgs.map((src, k) => ({
    ...base, imgs: [src], caption: null, ytUrl: (group.ytUrls && group.ytUrls[k]) || null,
    id: src.replace(/^assets\/images\/social\//, "").replace(/\.[a-z0-9]+$/i, ""),
  }));
}
const postLink = (id) => `${location.origin}${location.pathname}#/post/${id}`;
// Copy without the Clipboard API (missing on plain-http pages): select a
// hidden field and use the old copy command. True if it worked.
function copyByHand(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (_) { /* unsupported */ }
  ta.remove();
  return ok;
}
// #/post/<id> → <id>, or null.
const linkedPost = () => {
  const m = /^#\/post\/(.+)$/.exec(location.hash);
  return m ? decodeURIComponent(m[1]) : null;
};

// Saved posts, newest first. Kept in this browser only.
const SAVED_KEY = "miki-saved-posts";
function readSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); }
  catch (_) { return []; }
}
function writeSaved(list) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); }
  catch (_) { /* storage can be blocked; saves then last for this visit */ }
}

// A reel in the feed: plays muted while it is on screen, pauses when it
// scrolls away; a tap turns the sound on or off.
function ReelMedia({ post, lang }) {
  const ref = React.useRef(null);
  const [muted, setMuted] = React.useState(true);
  React.useEffect(() => {
    const v = ref.current;
    if (!v || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio > 0.6) { v.play().catch(() => {}); }
      else { v.pause(); }
    }, { threshold: [0, 0.6, 1] });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (v.paused) v.play().catch(() => {});
  };
  const ua = lang === "UA";
  return (
    <div className="ig-media ig-media--reel" onClick={toggle}>
      <video ref={ref} src={post.video} poster={post.imgs[0]} muted loop playsInline preload="metadata" />
      <span className="ig-reel-sound">{muted ? (ua ? "[ звук вимк ]" : "[ sound off ]") : (ua ? "[ звук увімк ]" : "[ sound on ]")}</span>
    </div>
  );
}

function IgPost({ post, lang, saved, onToggleSave, onSeeAll }) {
  const ua = lang === "UA";
  const { imgs, handle } = post;
  const [sheet, setSheet] = React.useState(false); // the ••• menu
  const [liked, setLiked] = React.useState(false);
  const [burst, setBurst] = React.useState(0); // bumps on each double-tap → heart pops
  const [slide, setSlide] = React.useState(0);
  const [toast, setToast] = React.useState(null);
  // The first photo sets the frame for every slide, within Instagram's
  // 4:5 (tall) to 1.91:1 (wide) range.
  const [ratio, setRatio] = React.useState(0.8);
  const lastTap = React.useRef(0);
  const toastTimer = React.useRef(0);
  React.useEffect(() => () => clearTimeout(toastTimer.current), []);
  const flash = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };
  const onMediaClick = () => {
    const now = performance.now();
    if (now - lastTap.current < 300) { setLiked(true); setBurst((b) => b + 1); lastTap.current = 0; }
    else lastTap.current = now;
  };
  const onScroll = (e) => {
    const el = e.currentTarget, k = Math.round(el.scrollLeft / el.clientWidth);
    if (k !== slide) setSlide(k);
  };
  // The phone's native share sheet. Browsers only offer it on https pages, so
  // elsewhere (or if it fails for a reason other than the visitor closing it)
  // the link is copied instead.
  const share = () => {
    const url = postLink(post.id);
    const data = { title: `${handle} · MIKI / GTXHI`, text: post.caption || handle, url };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      navigator.share(data).catch((err) => { if (err && err.name !== "AbortError") copyLink(url); });
      return;
    }
    copyLink(url);
  };
  const copyLink = (url) => {
    const done = () => flash(ua ? "Посилання скопійовано" : "Link copied");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(done, () => (copyByHand(url) ? done() : flash(url)));
    } else if (copyByHand(url)) done();
    else flash(url);
  };
  const toggleSave = () => {
    flash(saved ? (ua ? "Видалено зі збережених" : "Removed from saved") : (ua ? "Збережено" : "Saved"));
    onToggleSave(post.id);
  };
  return (
    <article className="ig-post" id={"ig-" + post.id}>
      <header className="ig-post-head">
        {/* Tapping the account opens its group, unless that's the one open. */}
        {React.createElement(onSeeAll ? "button" : "span", {
          className: "ig-user",
          ...(onSeeAll ? { type: "button", onClick: onSeeAll, "aria-label": ua ? `Усе від ${handle}` : `See all from ${handle}` } : {}),
        },
          <span className="ig-avatar" style={{ backgroundImage: `url("${post.avatar}")` }} />,
          <span className="ig-who">
            <b>{handle}</b>
            {post.sponsored && <small>{ua ? "Реклама" : "Sponsored"}</small>}
          </span>,
        )}
        <button className="ig-btn ig-more" onClick={() => setSheet(true)} aria-haspopup="dialog" aria-label={ua ? "більше" : "more options"}>
          <IgIcon name="more" />
        </button>
      </header>
      {sheet && (
        <div className="ig-sheet-back" onClick={() => setSheet(false)}>
          <div className="ig-sheet" role="dialog" aria-label={handle} onClick={(e) => e.stopPropagation()}>
            <i className="ig-sheet-grab" aria-hidden="true" />
            <button onClick={() => { setSheet(false); copyLink(postLink(post.id)); }}>
              <IgIcon name="link" />{ua ? "Копіювати посилання" : "Copy link"}
            </button>
            <button onClick={() => { setSheet(false); share(); }}>
              <IgIcon name="share" />{ua ? "Поділитися…" : "Share to…"}
            </button>
            <button onClick={() => { setSheet(false); toggleSave(); }}>
              <IgIcon name="save" filled={saved} />{saved ? (ua ? "Видалити зі збережених" : "Remove from saved") : (ua ? "Зберегти" : "Save")}
            </button>
            {onSeeAll && (
              <button onClick={() => { setSheet(false); onSeeAll(); }}>
                <IgIcon name="grid" />{ua ? `Усе від ${handle}` : `See all from ${handle}`}
              </button>
            )}
            <button className="ig-sheet-cancel" onClick={() => setSheet(false)}>{ua ? "Скасувати" : "Cancel"}</button>
          </div>
        </div>
      )}
      {post.video ? (
        <ReelMedia post={post} lang={lang} />
      ) : post.ytUrl && ytEmbed(post.ytUrl) ? (
        <div className="ig-media ig-media--yt">
          <iframe src={ytEmbed(post.ytUrl)} title={handle} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
        </div>
      ) : (
      <div className="ig-media" style={{ aspectRatio: String(ratio) }} onClick={onMediaClick}>
        <div className="ig-slides" onScroll={onScroll}>
          {imgs.map((src, k) => (
            <img
              key={k}
              {...jImg}
              src={src}
              alt=""
              loading="lazy"
              draggable="false"
              onLoad={(e) => {
                jImgLoaded(e);
                if (k === 0) setRatio(Math.min(1.91, Math.max(0.8, e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)));
              }}
            />
          ))}
        </div>
        {imgs.length > 1 && <span className="ig-count">{slide + 1}/{imgs.length}</span>}
        {burst > 0 && (
          <span key={burst} className="ig-burst" aria-hidden="true"><IgIcon name="heart" filled /></span>
        )}
        {toast && <span className="ig-toast" role="status">{toast}</span>}
      </div>
      )}
      <div className="ig-actions">
        <button className={"ig-btn" + (liked ? " is-liked" : "")} onClick={() => setLiked((l) => !l)} aria-pressed={liked} aria-label={ua ? "подобається" : "like"}>
          <IgIcon name="heart" filled={liked} />
        </button>
        <button className="ig-btn" onClick={share} aria-label={ua ? "поділитися" : "share"}><IgIcon name="share" /></button>
        {imgs.length > 1 && (
          <span className="ig-dots" aria-hidden="true">
            {imgs.map((_, k) => <i key={k} className={k === slide ? "is-on" : ""} />)}
          </span>
        )}
        <button className="ig-btn ig-btn--save" onClick={toggleSave} aria-pressed={saved} aria-label={ua ? "зберегти" : "save"}>
          <IgIcon name="save" filled={saved} />
        </button>
      </div>
      {liked && <div className="ig-likes">{ua ? "Подобається вам" : "Liked by you"}</div>}
      {post.caption && <p className="ig-caption"><b>{handle}</b> {post.caption}</p>}
    </article>
  );
}

// A list of posts under Instagram's top bar. `focus` scrolls to that post on
// open (a shared link, or a tile tapped on the Saved screen).
// `seeAll(post)` gives the handler for the ••• menu's "See all from …", or
// null to leave that item out.
// `top` sits under the bar, above the first post (the story tray).
function JFeed({ title, heading, posts, focus, lang, saved, onToggleSave, seeAll, onBack, onSaved, top, end }) {
  const ua = lang === "UA";
  const box = React.useRef(null);
  React.useLayoutEffect(() => {
    const el = focus && document.getElementById("ig-" + focus);
    if (el && box.current) box.current.scrollTop = el.offsetTop - 52; // below the sticky bar
  }, []);
  return (
    <div className="ig-feed" ref={box}>
      <header className="ig-top">
        <button className="ig-btn" onClick={onBack} aria-label={ua ? "назад" : "back"}><IgIcon name="back" /></button>
        <div className="ig-top-title">
          {title && <small>{title}</small>}
          <b>{heading}</b>
        </div>
        {onSaved
          ? <button className="ig-btn" onClick={onSaved} aria-label={ua ? "збережене" : "saved"}><IgIcon name="save" /></button>
          : <span className="ig-btn" aria-hidden="true" />}
      </header>
      {top}
      {posts.map((p) => (
        <IgPost key={p.id} post={p} lang={lang} saved={saved.includes(p.id)} onToggleSave={onToggleSave} onSeeAll={seeAll ? seeAll(p) : null} />
      ))}
      {end}
    </div>
  );
}

// Instagram's Saved screen: a 3-column grid of what this visitor bookmarked.
function JSaved({ posts, lang, onOpen, onBack }) {
  const ua = lang === "UA";
  return (
    <div className="ig-feed">
      <header className="ig-top">
        <button className="ig-btn" onClick={onBack} aria-label={ua ? "назад" : "back"}><IgIcon name="back" /></button>
        <div className="ig-top-title"><b>{ua ? "Збережене" : "Saved"}</b></div>
        <span className="ig-btn" aria-hidden="true" />
      </header>
      {posts.length ? (
        <div className="ig-grid">
          {posts.map((p) => (
            <button key={p.id} className="ig-tile" onClick={() => onOpen(p.id)} aria-label={p.handle}>
              <img {...jImg} src={p.imgs[0]} alt="" loading="lazy" draggable="false" />
              {p.imgs.length > 1 && <span className="ig-tile-multi" aria-hidden="true" />}
            </button>
          ))}
        </div>
      ) : (
        <div className="ig-empty">
          <span className="ig-empty-icon"><IgIcon name="save" /></span>
          <b>{ua ? "Збережіть те, що сподобалося" : "Save what you like"}</b>
          <p>{ua ? "Торкніться закладки під публікацією, щоб додати її сюди. Збережене бачите лише ви." : "Tap the bookmark under a post to add it here. Only you can see what you've saved."}</p>
        </div>
      )}
    </div>
  );
}

// Desktop cart drawer, as a full-screen sheet: count + clear, one row per
// work (thumb, title, medium, price, ×), total, checkout.
function JCart({ t, lang, cart, onRemove, onClear, onClose, onCheckout }) {
  const UI = window.CONTENT.ui.canvasPage;
  const sum = cart.reduce((a, c) => a + (typeof c.price === "number" ? c.price : 0), 0);
  return (
    <div className="mpj-page mpj-cart">
      <button className="mpj-link mpj-close" onClick={onClose}>[ {t(UI.close)} × ]</button>
      <h2 className="mpj-page-title">[ {t(UI.cartHeader)} ]</h2>
      <div className="mpj-cart-sub">
        <span>{cart.length === 0
          ? t(UI.cartNothing)
          : lang === "UA"
            ? `${cart.length} ${cart.length === 1 ? "робота" : (cart.length < 5 ? "роботи" : "робіт")}`
            : `${cart.length} item${cart.length === 1 ? "" : "s"}`}</span>
        {cart.length > 0 && <button className="mpj-link" onClick={onClear}>[ {t(UI.cartClearAll)} × ]</button>}
      </div>
      {cart.map((c) => (
        <div key={c.id} className="mpj-cart-item">
          {c.img ? <img src={c.img} alt="" /> : <i aria-hidden="true" />}
          <div>
            <b>[ {c.id} ] {c.title}</b>
            {c.medium && <small>{c.medium}</small>}
          </div>
          <span className="mpj-cart-price">{jPrice(c.price) || "—"}</span>
          <button className="mpj-cart-rm" onClick={() => onRemove(c.id)} aria-label={`${t(UI.cartRemove)} ${c.title}`}>×</button>
        </div>
      ))}
      {cart.length > 0 && (
        <React.Fragment>
          <div className="mpj-cart-total">
            <span>{t(UI.cartTotal)}</span>
            <b>{jPrice(sum) || t(UI.priceOnRequest)}</b>
          </div>
          <button className="mpj-cart-go" onClick={onCheckout}>[ {t(UI.cartCheckout)} → ]</button>
        </React.Fragment>
      )}
    </div>
  );
}

// Desktop ABOUT ME, stacked: bracket title, halftone portrait, name/role,
// bio, CV button, then [ 01 ] experience, [ 02 ] exhibitions, [ 03 ] skills.
function JAbout({ t, lang, onClose }) {
  const a = window.CONTENT.about, ui = window.CONTENT.ui;
  const CV = window.__CV || {};
  const cv = lang === "UA" ? (CV.ru || "assets/docs/Mykyta_Kirichenko_CV_RU.pdf") : (CV.en || "assets/docs/Mykyta_Kirichenko_CV_EN.pdf");
  const vis = (l) => (l || []).filter((x) => !x.hidden);
  return (
    <div className="mpj-page">
      <button className="mpj-link mpj-close" onClick={onClose}>[ close × ]</button>
      <h2 className="mpj-page-title">[ {t(ui.headers && ui.headers.about) || (lang === "UA" ? "ПРО МЕНЕ" : "ABOUT ME")} ]</h2>
      <div className="mpj-portrait mpj-portrait--about" aria-hidden="true" />
      <h3 className="mpj-page-name">{t(ui.brand)}</h3>
      <div className="mpj-page-role">{t(ui.aboutPage.role)}</div>
      <div className="mpj-page-prose">{(t(a.bio) || []).map((l, i) => <p key={i}>{l}</p>)}</div>
      <a className="mpj-cv" href={cv} target="_blank" rel="noopener noreferrer" download={lang === "UA" ? "Mykyta_Kirichenko_CV_RU.pdf" : "Mykyta_Kirichenko_CV_EN.pdf"}>
        [ {lang === "UA" ? "ЗАВАНТАЖИТИ CV" : "DOWNLOAD CV"} ↓ ]
      </a>
      <div className="mpj-col-head"><b>[ 01 ]</b> {t(ui.aboutPage.experienceHeader)}</div>
      {vis(a.experience).map((e, i) => (
        <div key={i} className="mpj-exp">
          <i>◎</i>
          <div><b>{t(e.title)}</b><span>{t(e.role)}</span>{t(e.subRole).trim() && <span>{t(e.subRole)}</span>}<small>{t(e.date)}</small></div>
        </div>
      ))}
      <div className="mpj-col-head"><b>[ 02 ]</b> {t(ui.aboutPage.exhibitionsHeader)}</div>
      {vis(a.exhibitions).map((x, i) => <div key={i} className="mpj-exp"><i>◎</i><div><b>{t(x.label)}</b></div></div>)}
      <div className="mpj-col-head"><b>[ 03 ]</b> {t(ui.aboutPage.skillsHeader)}</div>
      {vis(a.skills).map((x, i) => <div key={i} className="mpj-skill">{t(x.label)}</div>)}
    </div>
  );
}

// Desktop CONTACT, stacked: bracket title, portrait, name/role, ruled table.
function JContact({ t, onClose }) {
  const c = window.CONTENT.contact, ui = window.CONTENT.ui, L = ui.contactPage;
  const ig = c.instagram || [];
  const row = (label, value) => <React.Fragment><dt>{t(label)}</dt><dd>{value}</dd></React.Fragment>;
  return (
    <div className="mpj-page">
      <button className="mpj-link mpj-close" onClick={onClose}>[ close × ]</button>
      <h2 className="mpj-page-title">[ {t(ui.headers && ui.headers.contact) || "CONTACT"} ]</h2>
      <div className="mpj-portrait mpj-portrait--contact" aria-hidden="true" />
      <h3 className="mpj-page-name">{t(ui.brand)}</h3>
      <div className="mpj-page-role">{t(ui.aboutPage.role)}</div>
      <dl className="mpj-detail-table mpj-contact-table">
        {row(L.emailLabel, <a href={`mailto:${c.email}`}>{c.email}</a>)}
        {row(L.telegramLabel, <a href={`https://t.me/${c.telegram.replace("@", "")}`} target="_blank">{c.telegram}</a>)}
        {row(L.instagramLabel, <span className="mpj-multi">{ig.map((h) => <a key={h} href={`https://instagram.com/${h.replace("@", "")}`} target="_blank">{h}</a>)}</span>)}
        {row(L.tiktokLabel, <a href={`https://tiktok.com/${c.tiktok}`} target="_blank">{c.tiktok}</a>)}
        {row(L.locationLabel, t(c.location))}
      </dl>
    </div>
  );
}

// ═══ K — Darkroom ══════════════════════════════════════════════════════
const K_CELL = 7; // css px per halftone cell
function VariantK() {
  const { t } = useLang();
  const frames = React.useMemo(() => artFrames(t), [t]);
  const n = frames.length;
  const [f, setF] = React.useState(0);
  const [touched, setTouched] = React.useState(false);
  const [fixed, setFixed] = React.useState(false);
  const [rock, setRock] = React.useState(false);
  const [info, setInfo] = React.useState(false);
  const wrap = React.useRef(null);
  const canvas = React.useRef(null);
  const S = React.useRef(null); // {cols, rows, lum, dev, dpr, img}
  const raf = React.useRef(0);
  const pointer = React.useRef(null);
  const agitate = React.useRef(0);

  // Load the work into a cols×rows luminance grid.
  React.useEffect(() => {
    const w = wrap.current, c = canvas.current;
    const W = w.clientWidth, H = w.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px";
    const cols = Math.floor(W / K_CELL), rows = Math.floor(H / K_CELL);
    S.current = { cols, rows, dpr, lum: new Float32Array(cols * rows), dev: new Float32Array(cols * rows), img: false };
    setFixed(false);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height);
    const img = new Image();
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = cols; off.height = rows;
      const o = off.getContext("2d");
      const s = Math.min(cols / img.width, rows / img.height) * 0.92;
      const dw = img.width * s, dh = img.height * s;
      o.fillStyle = "#000"; o.fillRect(0, 0, cols, rows);
      o.drawImage(img, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
      const px = o.getImageData(0, 0, cols, rows).data;
      const st = S.current;
      for (let i = 0; i < cols * rows; i++) {
        st.lum[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
      }
      st.img = true;
      kick();
    };
    img.src = frames[f].img;
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  const draw = () => {
    const st = S.current, c = canvas.current;
    if (!st || !c) return false;
    const ctx = c.getContext("2d");
    const { cols, rows, lum, dev, dpr } = st;
    let changing = false, sum = 0, count = 0;
    // Developer at the fingertip.
    const p = pointer.current;
    const R = 46 / K_CELL;
    if (p) {
      const cx = p.x / K_CELL, cy = p.y / K_CELL;
      for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(rows, cy + R); y++) {
        for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(cols, cx + R); x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d < R) { const i = y * cols + x; dev[i] = Math.min(1, dev[i] + 0.07 * (1 - d / R)); }
        }
      }
      changing = true;
    }
    const ag = agitate.current > performance.now();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    const cell = K_CELL * dpr, maxR = cell * 0.62;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        // Once wet, the paper keeps developing on its own; agitating the
        // tray washes developer over everything.
        if (dev[i] > 0 && dev[i] < 1) { dev[i] = Math.min(1, dev[i] + 0.006); changing = true; }
        if (ag && dev[i] < 1) { dev[i] = Math.min(1, dev[i] + 0.012); changing = true; }
        if (lum[i] > 0.04) { sum += dev[i]; count++; }
        const v = lum[i] * dev[i];
        if (v < 0.02) continue;
        const r = maxR * Math.sqrt(v);
        const cx = x * cell + cell / 2, cy = y * cell + cell / 2;
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, 6.2832);
      }
    }
    ctx.fill();
    if (count && sum / count > 0.62) setFixed(true);
    return changing || ag;
  };
  const loop = () => { raf.current = draw() ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf.current) raf.current = requestAnimationFrame(loop); };

  const local = (e) => { const r = wrap.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const sw = React.useRef(null);
  const onDown = (e) => { e.currentTarget.setPointerCapture(e.pointerId); pointer.current = local(e); sw.current = { x: e.clientX, y: e.clientY }; setTouched(true); kick(); };
  const onMove = (e) => { if (pointer.current) { pointer.current = local(e); kick(); } };
  const onUp = () => { pointer.current = null; };
  const go = (d) => { setF((x) => (x + d + n) % n); };
  const shake = () => { agitate.current = performance.now() + 1400; setRock(true); setTimeout(() => setRock(false), 1400); setTouched(true); kick(); };

  const cur = frames[f];
  return (
    <div className="mpk">
      <header className="mpk-top">
        <span>[ MIKI / GTXHI ]</span>
        <button onClick={() => setInfo(true)}>[ info ]</button>
      </header>
      <div className={"mpk-tray" + (rock ? " mpk-tray--rock" : "")}>
        <div className="mpk-paper" ref={wrap} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvas} />
          {!touched && <span className="mpk-hint">[ rub to develop ]</span>}
        </div>
      </div>
      <div className="mpk-cap" data-on={fixed}>
        <small>sheet {pad(f + 1)} / {pad(n)} · {cur.cat.label.toLowerCase()}</small>
        <b>{fixed ? cur.title : "· · ·"}</b>
        {fixed && cur.href && <a href={cur.href} target="_blank">[ ▶ watch ]</a>}
      </div>
      <div className="mpk-controls">
        <button onClick={() => go(-1)} aria-label="previous sheet">‹</button>
        <button onClick={shake}>≈ agitate tray</button>
        <button onClick={() => go(1)} aria-label="next sheet">›</button>
      </div>
      {info && <ArtInfo t={t} onClose={() => setInfo(false)} dark />}
    </div>
  );
}
VariantK.label = "Darkroom";

// ═══ L — Riso zine ═════════════════════════════════════════════════════
const L_INKS = [
  { key: "black", label: "black × 2", c: "#0A0A0A" },
  { key: "pink", label: "black + fluoro pink", c: "#FF48B0" },
  { key: "blue", label: "black + medium blue", c: "#3255A4" },
];

function RisoImg({ src, alt, seed }) {
  const dx = (hRand(seed, 1) - 0.5) * 7, dy = (hRand(seed, 2) - 0.5) * 6;
  return (
    <div className="riso">
      <div className="riso-ink2" style={{ transform: `translate(${dx}px,${dy}px)` }}><img src={src} alt="" /></div>
      <img className="riso-ink1" src={src} alt={alt} />
    </div>
  );
}

function ZinePage({ i, page, total, t }) {
  const cm = <React.Fragment><i className="crop crop--tl" /><i className="crop crop--tr" /><i className="crop crop--bl" /><i className="crop crop--br" /></React.Fragment>;
  if (page.kind === "cover") {
    return (
      <div className="zine-page zine-cover">
        {cm}<i className="staple staple--a" /><i className="staple staple--b" />
        <small>ZINE NO.1 · {new Date().getFullYear()}</small>
        <h1>[ GTXHI/<br />MIKI ]</h1>
        {page.img && <RisoImg src={page.img} alt="" seed={3} />}
        <p>animation · illustration · posters · collage<br />{page.count} works, printed in two passes</p>
      </div>
    );
  }
  if (page.kind === "back") {
    return (
      <div className="zine-page zine-back">
        {cm}
        <h2>[ say hi ]</h2>
        <ProtoContact t={t} />
        <div className="zine-colophon"><ProtoAbout t={t} /></div>
      </div>
    );
  }
  const it = page.it, lay = i % 3;
  return (
    <div className={"zine-page zine-work zine-work--" + lay}>
      {cm}
      <RisoImg src={it.img} alt={it.title} seed={i} />
      <div className="zine-text">
        <small>{it.cat.label}</small>
        <h2>{it.title}</h2>
        {it.sub && <p>{it.sub}</p>}
        {it.href && <a href={it.href} target="_blank" onPointerDown={(e) => e.stopPropagation()}>[ ▶ watch ]</a>}
      </div>
      <span className="zine-folio">p. {pad(i + 1)}</span>
    </div>
  );
}

function VariantL() {
  const { t } = useLang();
  const frames = React.useMemo(() => artFrames(t), [t]);
  const pages = React.useMemo(() => [
    { kind: "cover", img: (frames.find((x) => x.cat.id === "02") || frames[0]).img, count: frames.length },
    ...frames.map((it) => ({ kind: "work", it })),
    { kind: "back" },
  ], [frames]);
  const total = pages.length;
  const [p, setP] = React.useState(0);
  const [turn, setTurnState] = React.useState(null); // {dir: 1|-1, f: 0..1, settling}
  const turnRef = React.useRef(null); // pointer handlers read this, not a stale `turn`
  const setTurn = (v) => { turnRef.current = v; setTurnState(v); };
  const [ink, setInk] = React.useState(0);
  const book = React.useRef(null);
  const g = React.useRef(null);

  const onDown = (e) => {
    if (turnRef.current) return; // a turn is still settling
    g.current = { x: e.clientX, y: e.clientY, dir: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const s = g.current;
    if (!s) return;
    const dx = e.clientX - s.x, W = book.current.clientWidth;
    if (!s.dir) {
      if (Math.abs(dx) < 8) return;
      s.dir = dx < 0 ? 1 : -1;
      if ((s.dir === 1 && p >= total - 1) || (s.dir === -1 && p <= 0)) { g.current = null; return; }
    }
    setTurn({ dir: s.dir, f: Math.max(0, Math.min(1, (s.dir === 1 ? -dx : dx) / (W * 0.85))) });
  };
  const finish = (complete, dir) => {
    setTurn({ dir, f: complete ? 1 : 0, settling: true });
    setTimeout(() => { if (complete) setP((x) => x + dir); setTurn(null); }, artReduce() ? 0 : 420);
  };
  const onUp = (e) => {
    const s = g.current;
    g.current = null;
    if (!s) return;
    if (!s.dir) {
      // Tap: right half turns forward, left half back.
      const r = book.current.getBoundingClientRect();
      const dir = e.clientX - r.left > r.width / 2 ? 1 : -1;
      if ((dir === 1 && p < total - 1) || (dir === -1 && p > 0)) { setTurn({ dir, f: 0 }); requestAnimationFrame(() => finish(true, dir)); }
      return;
    }
    const tr = turnRef.current;
    if (tr && !tr.settling) finish(tr.f > 0.33, tr.dir);
  };

  // While turning forward: page p lifts off revealing p+1 underneath.
  // Turning back: page p-1 swings back over p.
  const under = turn ? (turn.dir === 1 ? p + 1 : p) : p;
  const flying = turn ? (turn.dir === 1 ? p : p - 1) : null;
  const angle = turn ? (turn.dir === 1 ? -180 * turn.f : -180 * (1 - turn.f)) : 0;
  const shade = turn ? Math.sin((Math.abs(angle) / 180) * Math.PI) : 0;

  return (
    <div className="mpl" style={{ "--ink2": L_INKS[ink].c }}>
      <header className="mpl-top">
        <span>[ MIKI / GTXHI ]</span>
        <button onClick={() => setInk((k) => (k + 1) % L_INKS.length)}>ink: {L_INKS[ink].label}</button>
      </header>
      <div className="mpl-book" ref={book} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="mpl-leaf mpl-leaf--under">
          <ZinePage i={under} page={pages[under]} total={total} t={t} />
          {turn && <div className="mpl-shadow" style={{ opacity: shade * 0.35 }} />}
        </div>
        {flying != null && (
          <div className={"mpl-leaf mpl-leaf--fly" + (turn.settling ? " mpl-leaf--settle" : "")} style={{ transform: `rotateY(${angle}deg)` }}>
            <div className="mpl-face"><ZinePage i={flying} page={pages[flying]} total={total} t={t} /></div>
            <div className="mpl-face mpl-face--back">
              {/* Show-through: the print bleeds faintly through thin paper. */}
              <div className="mpl-showthrough"><ZinePage i={flying} page={pages[flying]} total={total} t={t} /></div>
            </div>
          </div>
        )}
      </div>
      <footer className="mpl-foot">
        <span>‹ fold to turn ›</span>
        <span>{pad(p + 1)} / {pad(total)}</span>
      </footer>
    </div>
  );
}
VariantL.label = "Riso zine";
