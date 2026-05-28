// Contact.jsx — Contact / social-media handles (opens from top nav).
function Contact({ tweaks }) {
  const { t } = useLang();
  const c = window.CONTENT.contact;
  return (
    <div className="page page--contact">
      <div className="social-portrait" aria-hidden="true" />

      <div className="social-headline">
        <span className="bk-bracket">[</span>
        <span className="bk-word" data-content-path="ui.headers.contact">{t(window.CONTENT.ui.headers.contact)}</span>
        <span className="bk-bracket">]</span>
      </div>

      <div className="contact-card">
        <h1 className="social-name" data-content-path="ui.brand">{t(window.CONTENT.ui.brand)}</h1>
        <div className="social-role" data-content-path="ui.aboutPage.role">{t(window.CONTENT.ui.aboutPage.role)}</div>

        <dl className="social-rows">
          <div className="social-row">
            <dt data-content-path="ui.contactPage.emailLabel">{t(window.CONTENT.ui.contactPage.emailLabel)}</dt>
            <dd data-content-path="contact.email">{c.email}</dd>
          </div>
          <div className="social-row">
            <dt data-content-path="ui.contactPage.telegramLabel">{t(window.CONTENT.ui.contactPage.telegramLabel)}</dt>
            <dd data-content-path="contact.telegram">{c.telegram}</dd>
          </div>
          <div className="social-row">
            <dt data-content-path="ui.contactPage.instagramLabel">{t(window.CONTENT.ui.contactPage.instagramLabel)}</dt>
            <dd>
              <span data-content-path="contact.instagram.0">{c.instagram[0]}</span>
              {c.instagram[1] && <span className="social-row-secondary" data-content-path="contact.instagram.1">{c.instagram[1]}</span>}
            </dd>
          </div>
          <div className="social-row">
            <dt data-content-path="ui.contactPage.tiktokLabel">{t(window.CONTENT.ui.contactPage.tiktokLabel)}</dt>
            <dd data-content-path="contact.tiktok">{c.tiktok}</dd>
          </div>
          <div className="social-row">
            <dt data-content-path="ui.contactPage.locationLabel">{t(window.CONTENT.ui.contactPage.locationLabel)}</dt>
            <dd data-content-path="contact.location">{t(c.location)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

window.Contact = Contact;

