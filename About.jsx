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
        <span className="bk-word">{t({ en: "ABOUT ME", ua: "ПРО МЕНЕ" })}</span>
        <span className="bk-bracket">]</span>
      </div>

      <div className="about-bio">
        <h1 className="about-name">MIKI / GTXHI</h1>
        <div className="about-role">{t({
          en: "Visual artist / Animator / Illustrator",
          ua: "Візуальний митець / Аніматор / Ілюстратор",
        })}</div>
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
        <div className="about-col-head"><b>[ 01 ]</b> {t({ en: "EXPERIENCE", ua: "ДОСВІД" })}</div>
        <hr className="hairline" />
        {a.experience.map((e, i) => (
          <div className="exp-item" key={i}>
            <div className="exp-title" data-content-path={`about.experience.${i}.title`}>{t(e.title)}</div>
            <div className="exp-role" data-content-path={`about.experience.${i}.role`}>{t(e.role)}</div>
            {e.subRole && <div className="exp-role" data-content-path={`about.experience.${i}.subRole`}>{t(e.subRole)}</div>}
            <div className="exp-date" data-content-path={`about.experience.${i}.date`}>{t(e.date)}</div>
          </div>
        ))}
      </div>

      <div className="about-projects">
        <div className="about-col-head"><b>[ 02 ]</b> {t({ en: "EXHIBITIONS & PROJECTS", ua: "ВИСТАВКИ ТА ПРОЄКТИ" })}</div>
        <hr className="hairline" />
        <div className="projects-grid">
          {a.exhibitions.map((x, i) => (
            <span key={i} data-content-path={`about.exhibitions.${i}.label`}>{t(x.label)}</span>
          ))}
        </div>
      </div>

      <div className="about-col about-col--skills">
        <div className="about-col-head"><b>[ 03 ]</b> {t({ en: "SKILLS", ua: "НАВИЧКИ" })}</div>
        <hr className="hairline" />
        {a.skills.map((s, i) => (
          <div className="skill" key={i} data-content-path={`about.skills.${i}.label`}>{t(s.label)}</div>
        ))}
      </div>
    </div>
  );
}

window.About = About;

