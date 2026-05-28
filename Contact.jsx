// Contact.jsx — Contact / social-media handles (opens from top nav).
function Contact({ tweaks }) {
  const { t } = useLang();
  const c = window.CONTENT.contact;
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
            <dd data-content-path="contact.email">{c.email}</dd>
          </div>
          <div className="social-row">
            <dt>TELEGRAM</dt>
            <dd data-content-path="contact.telegram">{c.telegram}</dd>
          </div>
          <div className="social-row">
            <dt>INSTAGRAM</dt>
            <dd>
              <span data-content-path="contact.instagram.0">{c.instagram[0]}</span>
              {c.instagram[1] && <span className="social-row-secondary" data-content-path="contact.instagram.1">{c.instagram[1]}</span>}
            </dd>
          </div>
          <div className="social-row">
            <dt>TIKTOK</dt>
            <dd data-content-path="contact.tiktok">{c.tiktok}</dd>
          </div>
          <div className="social-row">
            <dt>{t({ en: "LOCATION", ua: "ЛОКАЦІЯ" })}</dt>
            <dd data-content-path="contact.location">{t(c.location)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

window.Contact = Contact;

