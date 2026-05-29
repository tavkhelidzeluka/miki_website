// App.jsx — Root shell. Routing, cart state, detail overlay, Tweaks.

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "invert": false,
  "displayFont": "cond",
  "tileStyle": "square",
  "layout": "diagonal",
  "showThumb": true,
  "bracketCursor": false
}/*EDITMODE-END*/;

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
  const [route, setRoute] = React.useState("home");
  const [categoryId, setCategoryId] = React.useState(null);
  const [detailProject, setDetailProject] = React.useState(null);
  const [cart, setCart] = React.useState([]);
  const [cartOpen, setCartOpen] = React.useState(false);

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
    const works = (category && category.works) || [];
    if (!works.length) return;
    const nextIdx = (detailProject.workIndex + delta + works.length) % works.length;
    const w = works[nextIdx];
    setDetailProject({ ...category, name: w.name, desc: w.desc, thumb: w.thumb, prose: category.prose, workIndex: nextIdx });
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

