// About.jsx — Halftone portrait + bio + experience + skills + exhibitions + contact.
function About({ tweaks }) {
  const { t, lang } = useLang();
  const a = window.CONTENT.about;
  const CV = (typeof window !== "undefined" && window.__CV) || {};
  const cvHref = lang === "UA"
    ? (CV.ru || "assets/Mykyta_Kirichenko_CV_RU.pdf")
    : (CV.en || "assets/Mykyta_Kirichenko_CV_EN.pdf");
  return (
    <div className="page page--about">
      <div className="about-portrait" />

      <div className="about-headline">
        <span className="bk-bracket">[</span>
        <span className="bk-word" data-content-path="ui.headers.about">{t(window.CONTENT.ui.headers.about)}</span>
        <span className="bk-bracket">]</span>
      </div>

      <div className="about-bio">
        <h1 className="about-name" data-content-path="ui.brand">{t(window.CONTENT.ui.brand)}</h1>
        <div className="about-role" data-content-path="ui.aboutPage.role">{t(window.CONTENT.ui.aboutPage.role)}</div>
        <div className="about-prose">
          {(t({ en: a.bio.en, ua: a.bio.ua }) || []).map((line, i, arr) => {
            const lang = window.getLang ? window.getLang().toLowerCase() : 'en';
            return (
              <React.Fragment key={i}>
                <span data-content-path={`about.bio.${lang}.${i}`}>{line}</span>
                {i < arr.length - 1 && <br />}
              </React.Fragment>
            );
          })}
        </div>
        <a
          className="about-cv-btn"
          href={cvHref}
          target="_blank"
          rel="noopener noreferrer"
          download={lang === "UA" ? "Mykyta_Kirichenko_CV_RU.pdf" : "Mykyta_Kirichenko_CV_EN.pdf"}
        >
          [ {t({ en: "DOWNLOAD CV", ua: "ЗАВАНТАЖИТИ CV" })} ↓ ]
        </a>
      </div>

      <div className="about-col about-col--exp">
        <div className="about-col-head"><b>[ 01 ]</b> <span data-content-path="ui.aboutPage.experienceHeader">{t(window.CONTENT.ui.aboutPage.experienceHeader)}</span></div>
        <hr className="hairline" />
        {window.visibleEntries(a.experience).map(({ item: e, srcIdx: i }) => (
          <div
            className="exp-item"
            key={i}
            style={{ position: 'relative' }}
            data-editor-reorder-path="about.experience"
            data-editor-reorder-index={i}
            data-item-hidden={e.hidden ? 'true' : undefined}
          >
            <button
              type="button"
              className="editor-delete-action editor-delete-action--corner"
              data-editor-action="delete-item"
              data-editor-list-path="about.experience"
              data-editor-list-index={i}
              data-editor-item-label={(e.title && e.title.en) || `experience ${i + 1}`}
            >×</button>
            <button
              type="button"
              className="editor-hide-action editor-hide-action--corner"
              data-editor-action="toggle-hide"
              data-editor-list-path="about.experience"
              data-editor-list-index={i}
            >{e.hidden ? '◉' : '⊘'}</button>
            <div className="exp-title" data-content-path={`about.experience.${i}.title`}>{t(e.title)}</div>
            <div className="exp-role" data-content-path={`about.experience.${i}.role`}>{t(e.role)}</div>
            {e.subRole && <div className="exp-role" data-content-path={`about.experience.${i}.subRole`}>{t(e.subRole)}</div>}
            <div className="exp-date" data-content-path={`about.experience.${i}.date`}>{t(e.date)}</div>
          </div>
        ))}
        <button
          type="button"
          className="editor-add-tile"
          data-editor-action="add-generic"
          data-editor-add-title="add new experience"
          data-editor-add-schema="experience"
          data-editor-list-path="about.experience"
        >+ add experience</button>
      </div>

      <div className="about-projects">
        <div className="about-col-head"><b>[ 02 ]</b> <span data-content-path="ui.aboutPage.exhibitionsHeader">{t(window.CONTENT.ui.aboutPage.exhibitionsHeader)}</span></div>
        <hr className="hairline" />
        <div className="projects-grid">
          {window.visibleEntries(a.exhibitions).map(({ item: x, srcIdx: i }) => (
            <div
              key={i}
              style={{ position: 'relative' }}
              data-editor-reorder-path="about.exhibitions"
              data-editor-reorder-index={i}
              data-item-hidden={x.hidden ? 'true' : undefined}
            >
              <button
                type="button"
                className="editor-delete-action editor-delete-action--corner"
                data-editor-action="delete-item"
                data-editor-list-path="about.exhibitions"
                data-editor-list-index={i}
                data-editor-item-label={(x.label && x.label.en) || `exhibition ${i + 1}`}
              >×</button>
              <button
                type="button"
                className="editor-hide-action editor-hide-action--corner"
                data-editor-action="toggle-hide"
                data-editor-list-path="about.exhibitions"
                data-editor-list-index={i}
              >{x.hidden ? '◉' : '⊘'}</button>
              <span data-content-path={`about.exhibitions.${i}.label`}>{t(x.label)}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="editor-add-tile"
          data-editor-action="add-generic"
          data-editor-add-title="add new exhibition"
          data-editor-add-schema="exhibition"
          data-editor-list-path="about.exhibitions"
        >+ add exhibition</button>
      </div>

      <div className="about-col about-col--skills">
        <div className="about-col-head"><b>[ 03 ]</b> <span data-content-path="ui.aboutPage.skillsHeader">{t(window.CONTENT.ui.aboutPage.skillsHeader)}</span></div>
        <hr className="hairline" />
        {window.visibleEntries(a.skills).map(({ item: s, srcIdx: i }) => (
          <div
            className="skill"
            key={i}
            style={{ position: 'relative' }}
            data-editor-reorder-path="about.skills"
            data-editor-reorder-index={i}
            data-item-hidden={s.hidden ? 'true' : undefined}
          >
            <button
              type="button"
              className="editor-delete-action editor-delete-action--corner"
              data-editor-action="delete-item"
              data-editor-list-path="about.skills"
              data-editor-list-index={i}
              data-editor-item-label={(s.label && s.label.en) || `skill ${i + 1}`}
            >×</button>
            <button
              type="button"
              className="editor-hide-action editor-hide-action--corner"
              data-editor-action="toggle-hide"
              data-editor-list-path="about.skills"
              data-editor-list-index={i}
            >{s.hidden ? '◉' : '⊘'}</button>
            <span data-content-path={`about.skills.${i}.label`}>{t(s.label)}</span>
          </div>
        ))}
        <button
          type="button"
          className="editor-add-tile"
          data-editor-action="add-generic"
          data-editor-add-title="add new skill"
          data-editor-add-schema="skill"
          data-editor-list-path="about.skills"
        >+ add skill</button>
      </div>
    </div>
  );
}

window.About = About;

