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
    method: "paypal",
    notes: "",
  });
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const estimate = React.useMemo(() => shippingEstimate(form.country, lang), [form.country, lang]);

  const formValid = Boolean(
    form.fullName.trim() &&
    /\S+@\S+\.\S+/.test(form.email)
  );

  const placeOrder = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: window.CONTENT.orderForm.web3formsKey,
          subject: `New order — ${form.fullName}`,
          from_name: 'miki portfolio',
          reply_to: form.email,
          full_name: form.fullName,
          email: form.email,
          phone: form.phone,
          country: form.country,
          city: form.city,
          address: form.address,
          postal: form.postal,
          currency: form.currency,
          payment_method: form.method,
          notes: form.notes,
          items: cart.map(c => `${c.title || c.name} [${c.id}]`).join('\n'),
          cart_json: JSON.stringify(cart),
        }),
      });
      if (!res.ok) throw new Error('order submission failed: ' + res.status);
      setStep('done');
      setTimeout(() => onPlaced && onPlaced(), 8000);
    } catch (err) {
      setError(t({
        en: `Couldn't send your order automatically. Please email ${window.CONTENT.contact.email} with your items and shipping address — we'll reply with payment instructions.`,
        ua: `Не вдалося надіслати замовлення автоматично. Будь ласка, напишіть на ${window.CONTENT.contact.email}, ми надішлемо інструкції з оплати.`,
      }));
    } finally {
      setProcessing(false);
    }
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
                    { v: "paypal",  l: { en: "PayPal",        ua: "PayPal" } },
                    { v: "bank",    l: { en: "Bank transfer", ua: "Банк. переказ" } },
                    { v: "crypto",  l: { en: "USDT",          ua: "USDT" } },
                    { v: "contact", l: { en: "Just contact me", ua: "Зв'яжіться зі мною" } },
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

              <div className="checkout-section">
                <div className="checkout-section-head">[ ] {form.method.toUpperCase()}</div>
                <p className="checkout-prose">
                  {lang === "UA" ? (
                    <React.Fragment>
                      {form.method === "contact"
                        ? <>Залишіть деталі, і ми зв'яжемося з вами на <b>{form.email || "вашу пошту"}</b> з інструкціями.</>
                        : <>Після підтвердження ми надішлемо {form.method === "paypal" ? "інвойс PayPal" : form.method === "bank" ? "банківські реквізити (IBAN + SWIFT)" : "адресу USDT-гаманця (TRC-20)"} на <b>{form.email || "вашу пошту"}</b>. Замовлення зарезервовано на 48&nbsp;годин до сплати.</>
                      }
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      {form.method === "contact"
                        ? <>Leave your details and we'll reach out to <b>{form.email || "your email"}</b> with instructions.</>
                        : <>After you confirm, we'll send {form.method === "paypal" ? "the PayPal invoice" : form.method === "bank" ? "bank details (IBAN + SWIFT)" : "the USDT wallet address (TRC-20)"} to <b>{form.email || "your email"}</b>. The order is reserved for 48&nbsp;hours pending payment.</>
                      }
                    </React.Fragment>
                  )}
                </p>
              </div>

              {error && (
                <div className="checkout-error" style={{
                  padding: '12px 16px',
                  margin: '12px 0',
                  border: '1px solid #c00',
                  color: '#c00',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                }}>{error}</div>
              )}

              <div className="checkout-actions">
                <button type="button" className="checkout-back-btn" onClick={() => setStep("form")}>← {t({ en: "back", ua: "назад" })}</button>
                <button
                  type="button"
                  className="checkout-cta"
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
              <div className="checkout-section-head">[ 03 ] {t({ en: "ORDER RECEIVED", ua: "ЗАМОВЛЕННЯ ПРИЙНЯТО" })}</div>
              <p className="checkout-prose">{t({
                en: `Thanks! Your order is in. Watch your inbox at ${form.email} — we'll reply within 24 hours with payment instructions.`,
                ua: `Дякуємо! Замовлення отримано. Чекайте листа на ${form.email} — відповімо протягом 24 годин із інструкціями для оплати.`,
              })}</p>
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

