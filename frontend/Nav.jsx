// Nav.jsx — Top navigation row.
function Nav({ route, setRoute, cartCount, onCartClick, onBack }) {
  const [open, setOpen] = React.useState(false);
  const { lang, setLang, t } = useLang();

  // Close menu on route change
  React.useEffect(() => { setOpen(false); }, [route]);

  const link = (id, label) => (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); setRoute(id); setOpen(false); }}
      className="nav-link"
      data-active={route === id ? "true" : "false"}
    >
      [ {label} ]
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
          [ {t({ en: "Back", ua: "Назад" })} ]
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
        [ GTXHI ]
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
        {link("projects", t({ en: "PROJECTS", ua: "ПРОЄКТИ" }))}
        {link("about",    t({ en: "ABOUT",    ua: "ПРО"     }))}
        {link("canvas",   t({ en: "CANVAS",   ua: "КАНВАС"  }))}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onCartClick && onCartClick(); }}
          className="nav-link nav-cart"
          title={t({ en: "cart", ua: "кошик" })}
        >
          [ {t({ en: "CART", ua: "КОШИК" })} <span className="nav-cart-count">{String(cartCount).padStart(2, "0")}</span> ]
        </a>
        {link("contact", t({ en: "CONTACT", ua: "КОНТАКТ" }))}
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

