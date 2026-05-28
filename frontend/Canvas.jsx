// Canvas.jsx — Shop. Vertically scrollable grid of originals/prints.
const ITEMS = [
  { id: "01", title: "с котом",   medium: "(colored paper A3, acrylic, pencils)", mediumUa: "(кольоровий папір А3, акрил, олівці)" },
  { id: "02", title: "яновна",    medium: "(linen canvas A4)",                    mediumUa: "(лляне полотно А4)" },
  { id: "03", title: "в пиджаке", medium: "(collage A3)",                         mediumUa: "(колаж А3)" },
  { id: "04", title: "ночной",    medium: "(riso print, edition of 25)",          mediumUa: "(різо-друк, тираж 25)" },
  { id: "05", title: "LUHANSK",   medium: "(offset poster 600×900mm)",            mediumUa: "(офсетний постер 600×900мм)" },
  { id: "06", title: "сестра",    medium: "(charcoal on A2)",                     mediumUa: "(вугілля на А2)" },
  { id: "07", title: "берлин",    medium: "(acrylic on coloured paper A3)",       mediumUa: "(акрил на кольоровому папері А3)" },
  { id: "08", title: "холст / 08", medium: "(linen canvas A2, oil)",              mediumUa: "(лляне полотно А2, олія)" },
  { id: "09", title: "exposure",  medium: "(riso poster, edition of 50)",         mediumUa: "(різо-постер, тираж 50)" },
];

function Canvas({ tweaks, cart, addToCart, removeFromCart, clearCart, cartOpen, setCartOpen }) {
  const { t, lang } = useLang();
  const [pulse, setPulse] = React.useState(null);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);

  const inCart = (id) => cart.some((c) => c.id === id);

  const handleOrder = (it) => {
    if (inCart(it.id)) {
      const idx = cart.findIndex((c) => c.id === it.id);
      if (idx >= 0) removeFromCart(idx);
      return;
    }
    addToCart({ ...it, price: 0 });
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
        {t({
          en: "Order in any currency — ₽ · € · $",
          ua: "Замовлення у будь-якій валюті — ₴ · € · $",
        })}
      </div>

      <div className="canvas-scroll">
        <div className="canvas-grid">
          {ITEMS.map((it) => {
            const added = inCart(it.id) || pulse === it.id;
            const medium = lang === "UA" ? (it.mediumUa || it.medium) : it.medium;
            return (
              <article key={it.id} className="prod">
                <div className={tilePrefix} />
                <hr className="prod-rule" />
                <div className="prod-foot">
                  <span className="prod-id">[ {it.id} ]</span>
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
                <span>000</span>
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
