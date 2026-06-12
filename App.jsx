// App.jsx — Root shell. Routing, cart state, detail overlay, Tweaks.

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "invert": false,
  "displayFont": "cond",
  "tileStyle": "square",
  "layout": "diagonal",
  "showThumb": true,
  "bracketCursor": false
}/*EDITMODE-END*/;

// ─── URL ↔ state ───
// Hash routing (works on plain GitHub Pages — no server fallback needed):
//   #/              → home
//   #/projects      → category grid
//   #/projects/02   → strip for category 02 (or BOOKS detail for non-strip cats)
//   #/projects/02/3 → detail of work index 3 within category 02
//   #/about | #/contact | #/canvas → those routes
const URL_STRIP_CATS = new Set(["01", "02", "03", "04", "06", "07"]); // strip-style cats (anim, illus, posters, canvas, photos, social); "05" BOOKS opens detail directly
const URL_TOP_ROUTES = new Set(["home", "projects", "about", "contact", "canvas"]);

function buildHash({ route, categoryId, detailProject }) {
  if (detailProject) {
    if (detailProject.workIndex !== undefined) return `/projects/${detailProject.id}/${detailProject.workIndex}`;
    return `/projects/${detailProject.id}`;
  }
  if (route === "projects" && categoryId) return `/projects/${categoryId}`;
  if (route === "home") return "/";
  return `/${route}`;
}

function parseHash(rawHash, allProjects) {
  const parts = String(rawHash || "").replace(/^#/, "").replace(/^\//, "").split("/").filter(Boolean);
  const home = { route: "home", categoryId: null, detailProject: null };
  if (parts.length === 0) return home;
  if (parts[0] !== "projects") return URL_TOP_ROUTES.has(parts[0]) ? { ...home, route: parts[0] } : home;
  if (parts.length === 1) return { route: "projects", categoryId: null, detailProject: null };
  const cat = allProjects.find((p) => p.id === parts[1]);
  if (!cat) return { route: "projects", categoryId: null, detailProject: null };
  const isStrip = URL_STRIP_CATS.has(cat.id);
  if (parts.length === 2) {
    return isStrip
      ? { route: "projects", categoryId: cat.id, detailProject: null }
      : { route: "projects", categoryId: null, detailProject: cat };
  }
  const wIdx = parseInt(parts[2], 10);
  const works = cat.works || [];
  const hiddenTarget = works[wIdx] && works[wIdx].hidden && !(window.isEditMode && window.isEditMode());
  if (Number.isNaN(wIdx) || wIdx < 0 || wIdx >= works.length || hiddenTarget) {
    return isStrip
      ? { route: "projects", categoryId: cat.id, detailProject: null }
      : { route: "projects", categoryId: null, detailProject: cat };
  }
  const w = works[wIdx];
  const detail = { ...cat, name: w.name, desc: w.desc, thumb: w.thumb, prose: cat.prose, workIndex: wIdx };
  return { route: "projects", categoryId: isStrip ? cat.id : null, detailProject: detail };
}

function BracketCursor({ on }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!on) return;
    const el = ref.current;
    const move = (e) => {
      if (!el) return;
      el.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 20}px)`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [on]);
  if (!on) return null;
  return <div ref={ref} className="bracket-cursor">[&nbsp;]</div>;
}

function App() {
  const [tweaks, setTweak] = useTweaks(DEFAULT_TWEAKS);
  // Initial route/category/detail come from the URL hash so deep-links are
  // shareable. window.CONTENT is guaranteed loaded by the time App mounts
  // (see index.html __contentReady gate).
  const initial = React.useMemo(
    () => parseHash(window.location.hash, (window.CONTENT && window.CONTENT.projects) || []),
    []
  );
  const [route, setRoute] = React.useState(initial.route);
  const [categoryId, setCategoryId] = React.useState(initial.categoryId);
  const [detailProject, setDetailProject] = React.useState(initial.detailProject);
  const [cart, setCart] = React.useState([]);
  const [cartOpen, setCartOpen] = React.useState(false);

  // The inline editor replaces window.CONTENT (e.g. after a drag-to-reorder)
  // and fires this event; re-render so every view re-reads the new content.
  const [, forceContentRefresh] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const handler = () => forceContentRefresh();
    window.addEventListener("miki-content-changed", handler);
    return () => window.removeEventListener("miki-content-changed", handler);
  }, []);

  // Sync state → URL hash. replaceState (not push) so browser-back exits the
  // site rather than retracing every in-app transition.
  React.useEffect(() => {
    const newHash = buildHash({ route, categoryId, detailProject });
    const curHash = window.location.hash.replace(/^#/, "");
    if (curHash === newHash) return;
    const base = window.location.pathname + window.location.search;
    history.replaceState(null, "", newHash === "/" ? base : base + "#" + newHash);
  }, [route, categoryId, detailProject]);

  // Sync URL hash → state (handles back/forward + user editing the URL bar).
  React.useEffect(() => {
    const handler = () => {
      const next = parseHash(window.location.hash, (window.CONTENT && window.CONTENT.projects) || []);
      setRoute(next.route);
      setCategoryId(next.categoryId);
      setDetailProject(next.detailProject);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const addToCart = (it) => setCart((c) => [...c, it]);
  const removeFromCart = (idx) => setCart((c) => c.filter((_, i) => i !== idx));
  const clearCart = () => setCart([]);

  // Detail nav helpers
  const openDetail = (p) => setDetailProject(p);
  const closeDetail = () => setDetailProject(null);
  // When detail was opened from a category strip (workIndex set), iterate the
  // works inside that category; otherwise iterate top-level categories.
  const stepWithinWorks = (delta) => {
    const category = window.ALL_PROJECTS.find((p) => p.id === detailProject.id);
    const entries = window.visibleEntries((category && category.works) || []);
    if (!entries.length) return;
    const pos = entries.findIndex((e) => e.srcIdx === detailProject.workIndex);
    const nextPos = ((pos < 0 ? 0 : pos) + delta + entries.length) % entries.length;
    const { item: w, srcIdx } = entries[nextPos];
    setDetailProject({ ...category, name: w.name, desc: w.desc, thumb: w.thumb, prose: category.prose, workIndex: srcIdx });
  };
  const detailNext = () => {
    if (!detailProject) return;
    if (detailProject.workIndex !== undefined) { stepWithinWorks(1); return; }
    const i = window.ALL_PROJECTS.findIndex((p) => p.id === detailProject.id);
    setDetailProject(window.ALL_PROJECTS[(i + 1) % window.ALL_PROJECTS.length]);
  };
  const detailPrev = () => {
    if (!detailProject) return;
    if (detailProject.workIndex !== undefined) { stepWithinWorks(-1); return; }
    const len = window.ALL_PROJECTS.length;
    const i = window.ALL_PROJECTS.findIndex((p) => p.id === detailProject.id);
    setDetailProject(window.ALL_PROJECTS[(i - 1 + len) % len]);
  };

  // Smart back — strip view → grid → home
  const goBack = () => {
    if (detailProject) { setDetailProject(null); return; }
    if (route === "projects" && categoryId) { setCategoryId(null); return; }
    setRoute("home");
  };

  // Sync wrapper bg with invert
  React.useEffect(() => {
    const wrap = document.querySelector(".scaler-wrap");
    if (wrap) wrap.classList.toggle("is-invert", !!tweaks.invert);
  }, [tweaks.invert]);

  // Apply selected display font globally via CSS var override on the shell
  const fontOverride = tweaks.displayFont === "comp"
    ? "var(--font-display-hv)"
    : tweaks.displayFont === "cond"
      ? "var(--font-display-mid)"
      : tweaks.displayFont === "rg"
        ? "var(--font-display-rg)"
        : "var(--font-display)";

  return (
    <React.Fragment>
      <BracketCursor on={tweaks.bracketCursor} />
      <div
        className="site"
        data-invert={tweaks.invert ? "true" : "false"}
        data-screen-label={`Portfolio · ${route}`}
        style={{ ["--font-display-active"]: fontOverride }}
      >
        <Nav
          route={route}
          setRoute={(r) => { setDetailProject(null); setCategoryId(null); setRoute(r); }}
          cartCount={cart.length}
          onCartClick={() => { setRoute("canvas"); setCartOpen(true); }}
          onBack={goBack}
        />

        {route === "home"     && <Home tweaks={tweaks} setRoute={setRoute} />}
        {route === "projects" && (
          <Projects
            tweaks={tweaks}
            openDetail={openDetail}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
          />
        )}
        {route === "about"    && <About tweaks={tweaks} />}
        {route === "contact"  && <Contact tweaks={tweaks} />}
        {route === "canvas"   && (
          <Canvas
            tweaks={tweaks}
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
            cartOpen={cartOpen}
            setCartOpen={setCartOpen}
          />
        )}

        {detailProject && (
          <ProjectDetail
            project={detailProject}
            onClose={closeDetail}
            onNext={detailNext}
            onPrev={detailPrev}
            tweaks={tweaks}
          />
        )}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakToggle
            label="Invert (paper → ink)"
            value={tweaks.invert}
            onChange={(v) => setTweak("invert", v)}
          />
          <TweakRadio
            label="Display font"
            value={tweaks.displayFont}
            options={[
              { label: "Cram", value: "cram" },
              { label: "Cond", value: "cond" },
              { label: "Comp", value: "comp" },
            ]}
            onChange={(v) => setTweak("displayFont", v)}
          />
        </TweakSection>

        <TweakSection title="Home">
          <TweakRadio
            label="Wordmark layout"
            value={tweaks.layout}
            options={[
              { label: "Diagonal", value: "diagonal" },
              { label: "Stacked", value: "stacked" },
              { label: "Centered", value: "centered" },
            ]}
            onChange={(v) => setTweak("layout", v)}
          />
          <TweakToggle
            label="Show 'LATEST' thumb"
            value={tweaks.showThumb}
            onChange={(v) => setTweak("showThumb", v)}
          />
        </TweakSection>

        <TweakSection title="Image treatment">
          <TweakRadio
            label="Tile style"
            value={tweaks.tileStyle}
            options={[
              { label: "Square", value: "square" },
              { label: "Halftone", value: "halftone" },
              { label: "Checker", value: "checker" },
            ]}
            onChange={(v) => setTweak("tileStyle", v)}
          />
        </TweakSection>

        <TweakSection title="Chrome">
          <TweakToggle
            label="Bracket cursor"
            value={tweaks.bracketCursor}
            onChange={(v) => setTweak("bracketCursor", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

window.App = App;

