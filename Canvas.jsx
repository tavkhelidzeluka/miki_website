// Canvas.jsx — Shop. Vertically scrollable grid of originals/prints.
const ITEMS = window.CONTENT.canvas.items;

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
    const onKey = (e) => { if (e.key === "Escape") setZoom(null); };
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
        <span className="bk-word">{t({ en: "CANVAS", ua: "КАНВАС" })}</span>
        <span className="bk-bracket">]</span>
      </div>

      <div className="canvas-sub">
        <span>{t({
          en: "Order in any currency —",
          ua: "Замовлення у будь-якій валюті —",
        })}</span>
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
        <div className="canvas-grid">
          {ITEMS.map((it) => {
            const added = inCart(it.id) || pulse === it.id;
            const medium = lang === "UA" ? (it.mediumUa || it.medium) : it.medium;
            return (
              <article key={it.id} className="prod">
                <button
                  type="button"
                  className={tilePrefix + (it.img ? " prod-img--photo prod-img--zoomable" : "")}
                  style={it.img ? { backgroundImage: `url("${it.img}")` } : undefined}
                  onClick={() => it.img && setZoom(it)}
                  aria-label={it.img ? t({ en: "zoom image", ua: "збільшити" }) : undefined}
                  disabled={!it.img}
                />
                <hr className="prod-rule" />
                <div className="prod-foot">
                  <div className="prod-info">
                    <div className="prod-line">
                      <span className="prod-title">[ {it.title} ]</span>
                      {it.price && (
                        <span className="prod-price">{formatPrice(it.price)}</span>
                      )}
                    </div>
                    <div className="prod-medium">{medium}</div>
                  </div>
                  <button
                    className={"btn" + (added ? " btn--added" : "")}
                    onClick={() => handleOrder(it)}
                  >
                    {pulse === it.id
                      ? t({ en: "ДОБАВЛЕНО ✓", ua: "ДОДАНО ✓" })
                      : (added
                          ? t({ en: "В КОРЗИНЕ", ua: "У КОШИКУ" })
                          : t({ en: "ЗАКАЗАТЬ →", ua: "ЗАМОВИТИ →" }))}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {zoom && (
        <div className="canvas-zoom" onClick={() => setZoom(null)}>
          <button className="canvas-zoom-close" onClick={() => setZoom(null)}>[ {t({ en: "close", ua: "закрити" })} × ]</button>
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
          <button className="cart-close" onClick={() => setCartOpen(false)}>[ {t({ en: "close", ua: "закрити" })} × ]</button>
          <h2 className="cart-head">[ {t({ en: "CART", ua: "КОШИК" })} ]</h2>
          <div className="cart-sub">
            <span>{cart.length === 0
              ? t({ en: "Empty. Add a piece from the grid →", ua: "Порожньо. Додайте роботу з сітки →" })
              : (lang === "UA"
                  ? `${cart.length} ${cart.length === 1 ? "робота" : (cart.length < 5 ? "роботи" : "робіт")}`
                  : `${cart.length} item${cart.length === 1 ? "" : "s"}`)}</span>
            {cart.length > 0 && (
              <button className="cart-clear" onClick={clearCart}>[ {t({ en: "clear all", ua: "очистити" })} × ]</button>
            )}
          </div>
          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty">{t({ en: "(nothing here yet)", ua: "(тут поки порожньо)" })}</div>
            ) : cart.map((c, idx) => {
              const medium = lang === "UA" ? (c.mediumUa || c.medium) : c.medium;
              return (
                <div key={c.id + "-" + idx} className="cart-item">
                  <div className="cart-item-img" />
                  <div>
                    <div className="cart-item-title">[ {c.id} ]</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button className="cart-item-rm" onClick={() => removeFromCart(idx)} title={t({ en: "remove", ua: "видалити" })}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
          {cart.length > 0 && (
            <div className="cart-foot">
              <div className="cart-total">
                <span>{t({ en: "Total", ua: "Разом" })}</span>
                <span>{(() => {
                  const sumUsd = cart.reduce((acc, c) => acc + (typeof c.price === 'number' ? c.price : 0), 0);
                  if (sumUsd === 0) {
                    return t({ en: 'price on request', ua: 'ціна на запит' });
                  }
                  return formatPrice(sumUsd);
                })()}</span>
              </div>
              <button className="cart-checkout" onClick={handleCheckout}>[ {t({ en: "checkout", ua: "оформити" })} → ]</button>
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

