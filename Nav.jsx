// Nav.jsx — Top navigation row.
function Nav({ route, setRoute, cartCount, onCartClick, onBack }) {
  const [open, setOpen] = React.useState(false);
  const { lang, setLang, t } = useLang();

  // Close menu on route change
  React.useEffect(() => { setOpen(false); }, [route]);

  const link = (id, label, path) => (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); setRoute(id); setOpen(false); }}
      className="nav-link"
      data-active={route === id ? "true" : "false"}
    >
      [ {path ? <span data-content-path={path}>{label}</span> : label} ]
    </a>
  );

  return (
    <nav className={"nav" + (open ? " nav--open" : "")}>
      {route !== "home" ? (
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onBack ? onBack() : setRoute("home"); }}
          className="nav-link"
        >
          [ <span data-content-path="ui.nav.back">{t(window.CONTENT.ui.nav.back)}</span> ]
        </a>
      ) : (
        <span className="nav-link" style={{ opacity: 0 }} aria-hidden="true">[ ]</span>
      )}
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); setRoute("home"); }}
        className="nav-link nav-center"
        data-active={route === "home" ? "true" : "false"}
      >
        [ <span data-content-path="ui.brand">{t(window.CONTENT.ui.brand)}</span> ]
      </a>
      <button
        type="button"
        className="nav-toggle"
        aria-label="menu"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((o) => !o)}
      >
        [ {open ? t({ en: "close", ua: "закрити" }) : t({ en: "menu", ua: "меню" })} ]
      </button>
      <div className="nav-cluster">
        {link("projects", t(window.CONTENT.ui.nav.projects), "ui.nav.projects")}
        {link("about",    t(window.CONTENT.ui.nav.about),    "ui.nav.about")}
        {link("canvas",   t(window.CONTENT.ui.nav.canvas),   "ui.nav.canvas")}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onCartClick && onCartClick(); }}
          className="nav-link nav-cart"
          title={t({ en: "cart", ua: "кошик" })}
        >
          [ <span data-content-path="ui.nav.cart">{t(window.CONTENT.ui.nav.cart)}</span> <span className="nav-cart-count">{String(cartCount).padStart(2, "0")}</span> ]
        </a>
        {link("contact", t(window.CONTENT.ui.nav.contact), "ui.nav.contact")}
        <span className="nav-link nav-lang" aria-label="language">
          {"[ "}
          <button
            type="button"
            className="nav-lang-btn"
            data-active={lang === "EN" ? "true" : "false"}
            onClick={() => setLang("EN")}
            aria-pressed={lang === "EN"}
          >EN</button>
          {" · "}
          <button
            type="button"
            className="nav-lang-btn"
            data-active={lang === "UA" ? "true" : "false"}
            onClick={() => setLang("UA")}
            aria-pressed={lang === "UA"}
          >UA</button>
          {" ]"}
        </span>
      </div>
    </nav>
  );
}

window.Nav = Nav;

