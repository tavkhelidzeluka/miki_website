// Contact.jsx — Contact / social-media handles (opens from top nav).
function Contact({ tweaks }) {
  const { t } = useLang();
  return (
    <div className="page page--contact">
      <div className="social-portrait" aria-hidden="true" />

      <div className="social-headline">
        <span className="bk-bracket">[</span>
        <span className="bk-word">{t({ en: "CONTACT", ua: "КОНТАКТ" })}</span>
        <span className="bk-bracket">]</span>
      </div>

      <div className="contact-card">
        <h1 className="social-name">MIKI / GTXHI</h1>
        <div className="social-role">{t({
          en: "Visual artist / Animator / Illustrator",
          ua: "Візуальний митець / Аніматор / Ілюстратор",
        })}</div>

        <dl className="social-rows">
          <div className="social-row">
            <dt>{t({ en: "EMAIL", ua: "ПОШТА" })}</dt>
            <dd>seriton3@gmail.com</dd>
          </div>
          <div className="social-row">
            <dt>TELEGRAM</dt>
            <dd>@gtxhi</dd>
          </div>
          <div className="social-row">
            <dt>INSTAGRAM</dt>
            <dd>
              <span>@gtxhi</span>
              <span className="social-row-secondary">@mykyta.lg</span>
            </dd>
          </div>
          <div className="social-row">
            <dt>TIKTOK</dt>
            <dd>@gtxhi</dd>
          </div>
          <div className="social-row">
            <dt>{t({ en: "LOCATION", ua: "ЛОКАЦІЯ" })}</dt>
            <dd>{t({ en: "Tbilisi, GE", ua: "Тбілісі, Грузія" })}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

window.Contact = Contact;

