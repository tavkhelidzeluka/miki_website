// Canvas.jsx — Shop. Vertically scrollable grid of originals/prints.

// Currency conversion. Base prices are USD; rates apply on top.
// Fallback rates approximate late-2025 values; live rates fetched on mount.
const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "RUB", symbol: "₽" },
  { code: "UAH", symbol: "₴" },
  { code: "GEL", symbol: "₾" },
];
const FALLBACK_RATES = { USD: 1, EUR: 0.92, RUB: 92, UAH: 41, GEL: 2.72 };

function Canvas({ tweaks, cart, addToCart, removeFromCart, clearCart, cartOpen, setCartOpen }) {
  // Read at render time, not module-eval time — window.CONTENT may not be
  // set yet when Babel evaluates this file (the content fetch is async).
  const ENTRIES = window.visibleEntries(window.CONTENT.canvas.items);
  const { t, lang } = useLang();
  const [pulse, setPulse] = React.useState(null);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [zoom, setZoom] = React.useState(null); // currently-zoomed item
  const [currency, setCurrency] = React.useState(() => {
    try { return localStorage.getItem("canvas-currency") || "USD"; } catch { return "USD"; }
  });
  const [rates, setRates] = React.useState(FALLBACK_RATES);

  // Fetch live rates. Frankfurter is reliable but doesn't include RUB (ECB
  // stopped publishing it after Feb 2022). open.er-api.com is CORS-enabled,
  // free, and covers RUB. Try er-api first, fall back to frankfurter, then
  // to the static table.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/USD");
        if (!r.ok) throw new Error("er-api bad");
        const j = await r.json();
        if (cancelled || !j || !j.rates) throw new Error("no rates");
        const r2 = j.rates;
        setRates({
          USD: 1,
          EUR: r2.EUR ?? FALLBACK_RATES.EUR,
          RUB: r2.RUB ?? FALLBACK_RATES.RUB,
          UAH: r2.UAH ?? FALLBACK_RATES.UAH,
          GEL: r2.GEL ?? FALLBACK_RATES.GEL,
        });
      } catch (e) {
        // fall back to frankfurter (no RUB)
        try {
          const r = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,UAH,GEL");
          if (!r.ok) return;
          const j = await r.json();
          if (cancelled || !j || !j.rates) return;
          setRates({ ...FALLBACK_RATES, ...j.rates, USD: 1 });
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setCur = (c) => {
    setCurrency(c);
    try { localStorage.setItem("canvas-currency", c); } catch {}
  };

  const sym = (CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]).symbol;
  const formatPrice = (usd) => {
    if (!usd) return "";
    const rate = rates[currency] || 1;
    const v = usd * rate;
    // round to nice value
    const rounded = v >= 1000 ? Math.round(v / 10) * 10 : Math.round(v);
    return `${rounded.toLocaleString(lang === "UA" ? "uk-UA" : "en-US")} ${sym}`;
  };

  React.useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => { if (window.uiKeysBlocked(e)) return; if (e.key === "Escape") setZoom(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  const inCart = (id) => cart.some((c) => c.id === id);

  const handleOrder = (it) => {
    if (inCart(it.id)) {
      const idx = cart.findIndex((c) => c.id === it.id);
      if (idx >= 0) removeFromCart(idx);
      return;
    }
    addToCart({ ...it });
    setPulse(it.id);
    setTimeout(() => setPulse(null), 800);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const tilePrefix = tweaks.tileStyle === "halftone"
    ? "prod-img prod-img--halftone"
    : tweaks.tileStyle === "checker"
      ? "prod-img prod-img--checker"
      : "prod-img";

  return (
    <div className="page page--canvas">
      <div className="canvas-headline">
        <span className="bk-bracket">[</span>
        <span className="bk-word" data-content-path="ui.headers.canvas">{t(window.CONTENT.ui.headers.canvas)}</span>
        <span className="bk-bracket">]</span>
      </div>

      <div className="canvas-sub">
        <span data-content-path="ui.canvasPage.tagline">{t(window.CONTENT.ui.canvasPage.tagline)}</span>
        <div className="canvas-curswitch">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              className={"canvas-curbtn" + (currency === c.code ? " canvas-curbtn--on" : "")}
              onClick={() => setCur(c.code)}
              title={c.code}
            >
              [ {c.symbol} ]
            </button>
          ))}
        </div>
      </div>

      <div className="canvas-scroll">
        {ENTRIES.length === 0 && <EmptyState />}
        <div className="canvas-grid">
          {ENTRIES.map(({ item: it, srcIdx: idx }) => {
            const added = inCart(it.id) || pulse === it.id;
            const medium = lang === "UA" ? (it.mediumUa || it.medium) : it.medium;
            const mediumPath = lang === "UA" ? `canvas.items.${idx}.mediumUa` : `canvas.items.${idx}.medium`;
            return (
              <article
                key={it.id}
                className="prod"
                data-content-name={it.title}
                data-editor-reorder-path="canvas.items"
                data-editor-reorder-index={idx}
                data-item-hidden={it.hidden ? 'true' : undefined}
              >
                <button
                  type="button"
                  className="editor-delete-action editor-delete-action--corner"
                  data-editor-action="delete-item"
                  data-editor-list-path="canvas.items"
                  data-editor-list-index={idx}
                  data-editor-item-label={it.title}
                  aria-label={`delete ${it.title}`}
                >×</button>
                <button
                  type="button"
                  className="editor-hide-action editor-hide-action--corner"
                  data-editor-action="toggle-hide"
                  data-editor-list-path="canvas.items"
                  data-editor-list-index={idx}
                  aria-label={it.hidden ? `unhide ${it.title}` : `hide ${it.title}`}
                >{it.hidden ? '◉' : '⊘'}</button>
                <button
                  type="button"
                  className={tilePrefix + (it.img ? " prod-img--photo prod-img--zoomable" : "")}
                  style={it.img ? { backgroundImage: `url("${it.img}")`, ...window.imgDisplay(`canvas.items.${idx}.img`) } : undefined}
                  onClick={() => it.img && setZoom(it)}
                  aria-label={it.img ? t(window.CONTENT.ui.canvasPage.zoomImage) : undefined}
                  data-content-path={`canvas.items.${idx}.img`}
                  data-editor-kind="image"
                  data-asset-folder="assets"
                />
                <hr className="prod-rule" />
                <div className="prod-foot">
                  <div className="prod-info">
                    <div className="prod-line">
                      <span className="prod-title">[ <span data-content-path={`canvas.items.${idx}.title`}>{it.title}</span> ]</span>
                      {!!it.price && (
                        <span className="prod-price" data-content-path={`canvas.items.${idx}.price`}>{formatPrice(it.price)}</span>
                      )}
                    </div>
                    <div className="prod-medium" data-content-path={mediumPath}>{medium}</div>
                  </div>
                  <button
                    className={"btn" + (added ? " btn--added" : "")}
                    onClick={() => handleOrder(it)}
                  >
                    {pulse === it.id
                      ? <span data-content-path="ui.canvasPage.buttonAdded">{t(window.CONTENT.ui.canvasPage.buttonAdded)}</span>
                      : (added
                          ? <span data-content-path="ui.canvasPage.buttonInCart">{t(window.CONTENT.ui.canvasPage.buttonInCart)}</span>
                          : <span data-content-path="ui.canvasPage.buttonOrder">{t(window.CONTENT.ui.canvasPage.buttonOrder)}</span>)}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            type="button"
            className="editor-add-tile"
            data-editor-action="add-generic"
            data-editor-add-title="add new canvas item"
            data-editor-add-schema="canvasItem"
            data-editor-list-path="canvas.items"
            data-editor-asset-folder="assets"
          >+ add item</button>
        </div>
      </div>

      {zoom && (
        <div className="canvas-zoom" onClick={() => setZoom(null)}>
          <button className="canvas-zoom-close" onClick={() => setZoom(null)}>[ <span data-content-path="ui.canvasPage.close">{t(window.CONTENT.ui.canvasPage.close)}</span> × ]</button>
          <img
            className="canvas-zoom-img"
            src={zoom.img}
            alt={zoom.title}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="canvas-zoom-cap" onClick={(e) => e.stopPropagation()}>
            <span className="canvas-zoom-title">[ {zoom.title} ]</span>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="cart-drawer">
          <button className="cart-close" onClick={() => setCartOpen(false)}>[ <span data-content-path="ui.canvasPage.close">{t(window.CONTENT.ui.canvasPage.close)}</span> × ]</button>
          <h2 className="cart-head">[ <span data-content-path="ui.canvasPage.cartHeader">{t(window.CONTENT.ui.canvasPage.cartHeader)}</span> ]</h2>
          <div className="cart-sub">
            {cart.length === 0
              ? <span data-content-path="ui.canvasPage.cartEmpty">{t(window.CONTENT.ui.canvasPage.cartEmpty)}</span>
              : <span>{lang === "UA"
                  ? `${cart.length} ${cart.length === 1 ? "робота" : (cart.length < 5 ? "роботи" : "робіт")}`
                  : `${cart.length} item${cart.length === 1 ? "" : "s"}`}</span>}
            {cart.length > 0 && (
              <button className="cart-clear" onClick={clearCart}>[ <span data-content-path="ui.canvasPage.cartClearAll">{t(window.CONTENT.ui.canvasPage.cartClearAll)}</span> × ]</button>
            )}
          </div>
          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty" data-content-path="ui.canvasPage.cartNothing">{t(window.CONTENT.ui.canvasPage.cartNothing)}</div>
            ) : cart.map((c, idx) => {
              const medium = lang === "UA" ? (c.mediumUa || c.medium) : c.medium;
              return (
                <div key={c.id + "-" + idx} className="cart-item">
                  <div className="cart-item-img" />
                  <div>
                    <div className="cart-item-title">[ {c.id} ]</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button className="cart-item-rm" onClick={() => removeFromCart(idx)} title={t(window.CONTENT.ui.canvasPage.cartRemove)}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
          {cart.length > 0 && (
            <div className="cart-foot">
              <div className="cart-total">
                <span data-content-path="ui.canvasPage.cartTotal">{t(window.CONTENT.ui.canvasPage.cartTotal)}</span>
                {(() => {
                  const sumUsd = cart.reduce((acc, c) => acc + (typeof c.price === 'number' ? c.price : 0), 0);
                  if (sumUsd === 0) {
                    return <span data-content-path="ui.canvasPage.priceOnRequest">{t(window.CONTENT.ui.canvasPage.priceOnRequest)}</span>;
                  }
                  return <span>{formatPrice(sumUsd)}</span>;
                })()}
              </div>
              <button className="cart-checkout" onClick={handleCheckout}>[ <span data-content-path="ui.canvasPage.cartCheckout">{t(window.CONTENT.ui.canvasPage.cartCheckout)}</span> → ]</button>
            </div>
          )}
        </div>
      )}

      {checkoutOpen && (
        <CheckoutPage
          cart={cart}
          onClose={() => setCheckoutOpen(false)}
          onPlaced={() => { clearCart(); setCheckoutOpen(false); }}
        />
      )}
    </div>
  );
}

window.Canvas = Canvas;

