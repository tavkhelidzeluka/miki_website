// Checkout.jsx — full-page checkout (overlay) — multi-step form.

// Rough shipping bands from Tbilisi, GE — (days_min, days_max).
// Country code is normalized to lowercase ISO-ish key; fallback "rest of world".
const SHIPPING_BANDS = {
  "georgia":  [2, 4],   "ge": [2, 4],   "грузия": [2, 4],   "грузія": [2, 4],
  "armenia":  [3, 5],   "am": [3, 5],   "армения": [3, 5],  "вірменія": [3, 5],
  "azerbaijan": [3, 5], "az": [3, 5],   "азербайджан": [3, 5],
  "turkey":   [4, 7],   "tr": [4, 7],   "турция": [4, 7],   "туреччина": [4, 7],
  "russia":   [5, 9],   "ru": [5, 9],   "россия": [5, 9],   "росія": [5, 9],
  "ukraine":  [5, 10],  "ua": [5, 10],  "украина": [5, 10], "україна": [5, 10],
  "kazakhstan":[6, 10], "kz": [6, 10],  "казахстан": [6, 10],
  "germany":  [7, 12],  "de": [7, 12],  "германия": [7, 12], "німеччина": [7, 12],
  "france":   [7, 12],  "fr": [7, 12],  "франция": [7, 12],  "франція": [7, 12],
  "uk":       [7, 14],  "gb": [7, 14],  "united kingdom": [7, 14],
  "italy":    [8, 14],  "it": [8, 14],  "італія": [8, 14],
  "spain":    [8, 14],  "es": [8, 14],  "іспанія": [8, 14],
  "netherlands":[7,12], "nl": [7, 12],  "нідерланди": [7, 12],
  "poland":   [6, 11],  "pl": [6, 11],  "польща": [6, 11],
  "usa":      [10, 18], "us": [10, 18], "united states": [10, 18], "сша": [10, 18],
  "canada":   [10, 18], "ca": [10, 18], "канада": [10, 18],
  "japan":    [10, 16], "jp": [10, 16], "японія": [10, 16],
  "china":    [9, 16],  "cn": [9, 16],  "китай": [9, 16],
  "australia":[14, 21], "au": [14, 21], "австралія": [14, 21],
};

function shippingEstimate(country, locale) {
  if (!country) return null;
  const key = country.trim().toLowerCase();
  const band = SHIPPING_BANDS[key] || [10, 18]; // default: rest of world
  const min = new Date(Date.now() + band[0] * 86400000);
  const max = new Date(Date.now() + band[1] * 86400000);
  const loc = locale === "UA" ? "uk-UA" : "en-GB";
  const fmt = (d) => d.toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" });
  return { min: fmt(min), max: fmt(max), days: `${band[0]}–${band[1]}` };
}

// Mock tracking number — deterministic for the session.
function generateTrackingNumber() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 2; i++) s += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 9; i++) s += Math.floor(Math.random() * 10);
  return s + "GE";
}

function CheckoutPage({ cart, onClose, onPlaced }) {
  const { t, lang } = useLang();
  const [step, setStep] = React.useState("form"); // form | pay | done
  const [form, setForm] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    address: "",
    postal: "",
    currency: "EUR",
    method: "card",
    notes: "",
  });
  const [card, setCard] = React.useState({ number: "", expiry: "", cvc: "", holder: "" });
  const [processing, setProcessing] = React.useState(false);
  const [tracking, setTracking] = React.useState(null);
  const [trackingCopied, setTrackingCopied] = React.useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setC = (k, v) => setCard((c) => ({ ...c, [k]: v }));

  const estimate = React.useMemo(() => shippingEstimate(form.country, lang), [form.country, lang]);

  const formValid = Boolean(
    form.fullName.trim() &&
    /\S+@\S+\.\S+/.test(form.email)
  );

  const cardValid = Boolean(
    card.number.replace(/\s/g, "").length >= 12 &&
    /^\d{2}\s*\/\s*\d{2}$/.test(card.expiry) &&
    card.cvc.length >= 3 &&
    card.holder.trim()
  );

  const placeOrder = () => {
    setProcessing(true);
    setTimeout(() => {
      setTracking(generateTrackingNumber());
      setProcessing(false);
      setStep("done");
      setTimeout(() => onPlaced && onPlaced(), 8000);
    }, 1400);
  };

  const copyTracking = () => {
    if (!tracking) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tracking);
    }
    setTrackingCopied(true);
    setTimeout(() => setTrackingCopied(false), 1500);
  };

  return (
    <div className="checkout">
      <button className="checkout-close" onClick={onClose}>[ {t({ en: "close", ua: "закрити" })} × ]</button>

      <div className="checkout-headline">
        <span className="bk-bracket">[</span>
        <span className="bk-word">{t({ en: "CHECKOUT", ua: "ОФОРМЛЕННЯ" })}</span>
        <span className="bk-bracket">]</span>
      </div>

      <div className="checkout-steps">
        <span data-active={step === "form" ? "true" : "false"}>[ 01 ] {t({ en: "DETAILS", ua: "ДАНІ" })}</span>
        <span data-active={step === "pay"  ? "true" : "false"}>[ 02 ] {t({ en: "PAYMENT", ua: "ОПЛАТА" })}</span>
        <span data-active={step === "done" ? "true" : "false"}>[ 03 ] {t({ en: "CONFIRM", ua: "ПІДТВЕРДЖЕННЯ" })}</span>
      </div>

      <div className="checkout-body">
        {/* LEFT: form */}
        <div className="checkout-form">
          {step === "form" && (
            <React.Fragment>
              <div className="checkout-section">
                <div className="checkout-section-head">[ 01 ] {t({ en: "SHIPPING DETAILS", ua: "ДАНІ ДОСТАВКИ" })}</div>
                <div className="checkout-grid">
                  <Field label={t({ en: "Full name", ua: "Імʼя та прізвище" })} value={form.fullName} onChange={(v) => set("fullName", v)} />
                  <Field label={t({ en: "Email", ua: "Пошта" })}                value={form.email}    onChange={(v) => set("email", v)}    type="email" />
                  <Field label={t({ en: "Phone", ua: "Телефон" })}              value={form.phone}    onChange={(v) => set("phone", v)}    type="tel" />
                  <Field label={t({ en: "Country", ua: "Країна" })}             value={form.country}  onChange={(v) => set("country", v)} />
                  <Field label={t({ en: "City", ua: "Місто" })}                 value={form.city}     onChange={(v) => set("city", v)} />
                  <Field label={t({ en: "Postal code", ua: "Поштовий індекс" })} value={form.postal}  onChange={(v) => set("postal", v)} />
                  <Field label={t({ en: "Address", ua: "Адреса" })}             value={form.address}  onChange={(v) => set("address", v)} full />
                </div>

                {estimate && (
                  <div className="checkout-eta">
                    <div className="checkout-eta-head">[ ETA ] {t({
                      en: "estimated delivery from Tbilisi, GE",
                      ua: "орієнтовна доставка з Тбілісі, Грузія",
                    })}</div>
                    <div className="checkout-eta-body">
                      <span className="checkout-eta-days">{estimate.days} {t({ en: "business days", ua: "робочих днів" })}</span>
                      <span className="checkout-eta-dates">{estimate.min} — {estimate.max}</span>
                    </div>
                    <div className="checkout-eta-note">
                      {t({
                        en: "Estimate based on standard registered air mail. You'll get a tracking number after the order is placed.",
                        ua: "Орієнтир за стандартним рекомендованим авіа-відправленням. Номер для відстеження надішлемо після оформлення.",
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="checkout-section">
                <div className="checkout-section-head">[ 02 ] {t({ en: "CURRENCY", ua: "ВАЛЮТА" })}</div>
                <div className="checkout-radios">
                  {["EUR", "USD", "RUB", "GEL"].map((cur) => (
                    <button
                      key={cur}
                      className="checkout-radio"
                      data-active={form.currency === cur ? "true" : "false"}
                      onClick={() => set("currency", cur)}
                    >{cur}</button>
                  ))}
                </div>
              </div>

              <div className="checkout-section">
                <div className="checkout-section-head">[ 03 ] {t({ en: "NOTES", ua: "ПРИМІТКИ" })}</div>
                <textarea
                  className="checkout-textarea"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder={t({
                    en: "anything we should know? — preferred delivery date, framing, gift wrap…",
                    ua: "щось важливе? — бажана дата, рамка, подарункова упаковка…",
                  })}
                  rows={3}
                />
              </div>

              <button
                type="button"
                className="checkout-cta"
                disabled={!formValid}
                onClick={() => setStep("pay")}
              >[ {t({ en: "continue to payment", ua: "перейти до оплати" })} → ]</button>
              {!formValid && (
                <div className="checkout-hint">{t({
                  en: "fill in your name and a valid email to continue",
                  ua: "заповніть імʼя та коректну пошту, щоб продовжити",
                })}</div>
              )}
            </React.Fragment>
          )}

          {step === "pay" && (
            <React.Fragment>
              <div className="checkout-section">
                <div className="checkout-section-head">[ 02 ] {t({ en: "PAYMENT METHOD", ua: "СПОСІБ ОПЛАТИ" })}</div>
                <div className="checkout-radios">
                  {[
                    { v: "card",   l: { en: "Card",          ua: "Картка" } },
                    { v: "paypal", l: { en: "PayPal",        ua: "PayPal" } },
                    { v: "bank",   l: { en: "Bank transfer", ua: "Банк. переказ" } },
                    { v: "crypto", l: { en: "USDT",          ua: "USDT" } },
                  ].map((m) => (
                    <button
                      key={m.v}
                      className="checkout-radio"
                      data-active={form.method === m.v ? "true" : "false"}
                      onClick={() => set("method", m.v)}
                    >{t(m.l)}</button>
                  ))}
                </div>
              </div>

              {form.method === "card" && (
                <div className="checkout-section">
                  <div className="checkout-section-head">[ ] {t({ en: "CARD DETAILS", ua: "ДАНІ КАРТКИ" })}</div>
                  <div className="checkout-grid">
                    <Field label={t({ en: "Card number", ua: "Номер картки" })} value={card.number} onChange={(v) => setC("number", v)} placeholder="0000 0000 0000 0000" full />
                    <Field label={t({ en: "Expiry (MM / YY)", ua: "Термін (ММ / РР)" })} value={card.expiry} onChange={(v) => setC("expiry", v)} placeholder="01 / 28" />
                    <Field label="CVC"                                                  value={card.cvc}    onChange={(v) => setC("cvc", v)}    placeholder="000" />
                    <Field label={t({ en: "Cardholder", ua: "Власник картки" })}        value={card.holder} onChange={(v) => setC("holder", v)} full />
                  </div>
                </div>
              )}

              {form.method !== "card" && (
                <div className="checkout-section">
                  <div className="checkout-section-head">[ ] {form.method.toUpperCase()}</div>
                  <p className="checkout-prose">
                    {lang === "UA" ? (
                      <React.Fragment>
                        Після підтвердження ми надішлемо {form.method === "paypal" ? "інвойс PayPal" : form.method === "bank" ? "банківські реквізити (IBAN + SWIFT)" : "адресу USDT-гаманця (TRC-20)"} на <b>{form.email || "вашу пошту"}</b>. Замовлення зарезервовано на 48&nbsp;годин до сплати.
                      </React.Fragment>
                    ) : (
                      <React.Fragment>
                        After you confirm, we'll send {form.method === "paypal" ? "the PayPal invoice" : form.method === "bank" ? "bank details (IBAN + SWIFT)" : "the USDT wallet address (TRC-20)"} to <b>{form.email || "your email"}</b>. The order is reserved for 48&nbsp;hours pending payment.
                      </React.Fragment>
                    )}
                  </p>
                </div>
              )}

              <div className="checkout-actions">
                <button type="button" className="checkout-back-btn" onClick={() => setStep("form")}>← {t({ en: "back", ua: "назад" })}</button>
                <button
                  type="button"
                  className="checkout-cta"
                  disabled={form.method === "card" && !cardValid}
                  onClick={placeOrder}
                >
                  {processing
                    ? t({ en: "PROCESSING…", ua: "ОБРОБКА…" })
                    : "[ " + t({ en: "place order", ua: "оформити замовлення" }) + " → ]"}
                </button>
              </div>
            </React.Fragment>
          )}

          {step === "done" && (
            <div className="checkout-done">
              <div className="checkout-done-mark">[ ✓ ]</div>
              <h2 className="checkout-done-title">{t({
                en: "thank you for your order",
                ua: "дякуємо за замовлення",
              })}</h2>
              <p className="checkout-prose">
                {t({ en: "Confirmation sent to", ua: "Підтвердження надіслано на" })} <b>{form.email}</b>.
              </p>

              {estimate && (
                <div className="checkout-eta checkout-eta--done">
                  <div className="checkout-eta-head">[ ETA ] {t({
                    en: "estimated delivery to",
                    ua: "орієнтовна доставка до",
                  })} {form.country || t({ en: "your country", ua: "вашої країни" })}</div>
                  <div className="checkout-eta-body">
                    <span className="checkout-eta-days">{estimate.days} {t({ en: "business days", ua: "робочих днів" })}</span>
                    <span className="checkout-eta-dates">{estimate.min} — {estimate.max}</span>
                  </div>
                </div>
              )}

              {tracking && (
                <div className="checkout-tracking">
                  <div className="checkout-tracking-head">[ {t({ en: "TRACKING NUMBER", ua: "НОМЕР ВІДСТЕЖЕННЯ" })} ]</div>
                  <div className="checkout-tracking-row">
                    <span className="checkout-tracking-no">{tracking}</span>
                    <button className="checkout-tracking-copy" onClick={copyTracking}>
                      {trackingCopied
                        ? t({ en: "copied ✓", ua: "скопійовано ✓" })
                        : t({ en: "copy", ua: "копіювати" })}
                    </button>
                    <a
                      className="checkout-tracking-link"
                      href={`https://www.17track.net/en/track?nums=${tracking}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >[ {t({ en: "track", ua: "відстежити" })} → ]</a>
                  </div>
                  <div className="checkout-tracking-note">
                    {t({
                      en: "Use this number to follow your parcel on 17track or your local carrier — updates appear within 24–48 hours.",
                      ua: "Використайте цей номер на 17track або у вашого локального перевізника — оновлення зʼявляться протягом 24–48 годин.",
                    })}
                  </div>
                </div>
              )}

              <button className="checkout-cta" onClick={onClose}>[ {t({ en: "back to canvas", ua: "повернутися до канвасу" })} → ]</button>
            </div>
          )}
        </div>

        {/* RIGHT: summary */}
        <aside className="checkout-summary">
          <div className="checkout-section-head">[ {t({ en: "SUMMARY", ua: "ПІДСУМОК" })} ]</div>
          <div className="summary-items">
            {cart.map((c, idx) => {
              const medium = lang === "UA" ? (c.mediumUa || c.medium) : c.medium;
              return (
                <div key={c.id + "-" + idx} className="summary-item">
                  <div className="summary-item-img" />
                  <div>
                    <div className="summary-item-title">[ {c.id} ] {c.title}</div>
                    <div className="summary-item-medium">{medium}</div>
                  </div>
                  <div className="summary-item-price">000</div>
                </div>
              );
            })}
          </div>
          <div className="summary-line"><span>{t({ en: "Subtotal", ua: "Сума" })}</span><span>000</span></div>
          <div className="summary-line"><span>{t({ en: "Shipping", ua: "Доставка" })}</span><span>000</span></div>
          <div className="summary-total"><span>{t({ en: "Total", ua: "Разом" })} ({form.currency})</span><span>000</span></div>

          <div className="checkout-help">
            {t({ en: "need help? — email", ua: "потрібна допомога? — пишіть" })}&nbsp;
            <a href="mailto:seriton3@gmail.com">seriton3@gmail.com</a>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", full = false, placeholder = "" }) {
  return (
    <label className={"checkout-field" + (full ? " checkout-field--full" : "")}>
      <span className="checkout-field-label">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="checkout-input"
        placeholder={placeholder}
      />
    </label>
  );
}

window.CheckoutPage = CheckoutPage;
