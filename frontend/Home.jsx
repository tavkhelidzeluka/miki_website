// Home.jsx — Hero wordmark + marquee + status block.
function Home({ tweaks, setRoute }) {
  const [time, setTime] = React.useState("");
  React.useEffect(() => {
    const update = () => {
      const d = new Date();
      // pretend Kyiv time
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      setTime(`${hh}:${mm}:${ss}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const layout = tweaks.layout || "diagonal";

  // marquee: doubled for seamless loop
  const reel = [
    "through the magic crystal",
    "body of vision",
    "bolshoi theatre",
    "polukhutenko",
    "nyaono",
    "forest / vém àrxîv",
    "live show posters",
  ];

  const heroFontClass = tweaks.displayFont === "comp"
    ? "home-mark home-mark--comp"
    : "home-mark";
  const heroFamily = tweaks.displayFont === "comp"
    ? "var(--font-display-hv)"
    : tweaks.displayFont === "cond"
      ? "var(--font-display-mid)"
      : "var(--font-display)";

  // Layout variants
  const heroNodes = (() => {
    if (layout === "stacked") {
      return (
        <React.Fragment>
          <div
            className={heroFontClass}
            style={{ fontFamily: heroFamily, top: 78, left: 44, fontSize: 240, lineHeight: 0.86 }}
            onClick={() => setRoute("projects")}
          >
            [ GTXHI/
          </div>
          <div
            className={heroFontClass}
            style={{ fontFamily: heroFamily, top: 340, left: 44, fontSize: 240, lineHeight: 0.86 }}
            onClick={() => setRoute("about")}
          >
            MIKI ]
          </div>
        </React.Fragment>
      );
    }
    if (layout === "centered") {
      return (
        <div
          className={heroFontClass}
          style={{
            fontFamily: heroFamily,
            top: 200, left: 0, right: 0,
            fontSize: 220,
            textAlign: "center",
            lineHeight: 0.92,
            position: "absolute",
            color: "var(--ink)",
            textTransform: "uppercase",
          }}
          onClick={() => setRoute("projects")}
        >
          [ GTXHI/<br />MIKI ]
        </div>
      );
    }
    // default — diagonal split (figma)
    return (
      <React.Fragment>
        <div className="home-bg" aria-hidden="true" />
        <div
          className="home-mark home-mark--tl"
          style={{ fontFamily: heroFamily }}
          onClick={() => setRoute("projects")}
        >
          <span className="hero-bracket hero-bracket--l">[</span>
          <span className="hero-text hero-text--l">&nbsp;GTXHI/</span>
        </div>
        <div
          className="home-mark home-mark--br"
          style={{ fontFamily: heroFamily }}
          onClick={() => setRoute("about")}
        >
          <span className="hero-text hero-text--r">MIKI&nbsp;</span>
          <span className="hero-bracket hero-bracket--r">]</span>
        </div>
      </React.Fragment>
    );
  })();

  return (
    <div className="page page--home">
      {heroNodes}
    </div>
  );
}

window.Home = Home;
