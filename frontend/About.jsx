// About.jsx — Halftone portrait + bio + experience + skills + exhibitions + contact.
function About({ tweaks }) {
  const { t } = useLang();
  return (
    <div className="page page--about">
      <div className="about-portrait" />

      <div className="about-headline">
        <span className="bk-bracket">[</span>
        <span className="bk-word">{t({ en: "ABOUT\u00A0ME", ua: "ПРО\u00A0МЕНЕ" })}</span>
        <span className="bk-bracket">]</span>
      </div>

      <div className="about-bio">
        <h1 className="about-name">MIKI / GTXHI</h1>
        <div className="about-role">{t({
          en: "Visual artist / Animator / Illustrator",
          ua: "Візуальний митець / Аніматор / Ілюстратор",
        })}</div>
        <div className="about-prose">
          {t({
            en: "Working with animation, illustration, posters, and collage.",
            ua: "Працюю з анімацією, ілюстрацією, постерами та колажами.",
          })}<br/>
          {t({
            en: "Mix classical art with modern digital design — every piece begins with a black square.",
            ua: "Поєдную класичне мистецтво з сучасним цифровим дизайном — кожна робота починається з чорного квадрата.",
          })}
        </div>
      </div>

      <div className="about-col about-col--exp">
        <div className="about-col-head"><b>[ 01 ]</b> {t({ en: "EXPERIENCE", ua: "ДОСВІД" })}</div>
        <hr className="hairline" />
        <div className="exp-item">
          <div className="exp-title">{t({ en: "Studio \"SHAR\"", ua: "Студія «ШАР»" })}</div>
          <div className="exp-role">{t({ en: "Character Animator", ua: "Аніматор персонажів" })}</div>
          <div className="exp-role">{t({ en: "\"Through the Magic Crystal\"", ua: "«Крізь магічний кристал»" })}</div>
          <div className="exp-date">2024 – 2025</div>
        </div>
        <div className="exp-item">
          <div className="exp-title">{t({ en: "Freelance", ua: "Фріланс" })}</div>
          <div className="exp-role">{t({ en: "Illustrator / Animator", ua: "Ілюстратор / Аніматор" })}</div>
          <div className="exp-date">{t({ en: "2023 – Present", ua: "2023 – дотепер" })}</div>
        </div>
        <div className="exp-item">
          <div className="exp-title">{t({ en: "Bolshoi Theatre", ua: "Большой театр" })}</div>
          <div className="exp-role">{t({ en: "Poster Designer (contract)", ua: "Постер-дизайнер (контракт)" })}</div>
          <div className="exp-date">{t({ en: "2024 season", ua: "сезон 2024" })}</div>
        </div>
      </div>

      <div className="about-projects">
        <div className="about-col-head"><b>[ 02 ]</b> {t({ en: "EXHIBITIONS & PROJECTS", ua: "ВИСТАВКИ ТА ПРОЄКТИ" })}</div>
        <hr className="hairline" />
        <div className="projects-grid">
          <span>{t({ en: "Music Video — Grigory Polukhutenko", ua: "Музичне відео — Григорій Полухутенко" })}</span>
          <span>{t({ en: "Animated Ad — Nyaono", ua: "Анімаційна реклама — Nyaono" })}</span>
          <span>{t({ en: "\"Body of Vision\" — exhibition", ua: "«Body of Vision» — виставка" })}</span>
          <span>FOREST / VÉM ÀRXÎV — {t({ en: "group show", ua: "групова виставка" })}</span>
          <span>{t({ en: "Live Show Posters", ua: "Постери до live-шоу" })}</span>
          <span>{t({ en: "Bolshoi Theatre — posters", ua: "Большой театр — постери" })}</span>
        </div>
      </div>

      <div className="about-col about-col--skills">
        <div className="about-col-head"><b>[ 03 ]</b> {t({ en: "SKILLS", ua: "НАВИЧКИ" })}</div>
        <hr className="hairline" />
        <div className="skill">{t({ en: "Animation · Storyboarding", ua: "Анімація · Сторібординг" })}</div>
        <div className="skill">{t({ en: "Concept Art · Color & Light", ua: "Концепт-арт · Колір і світло" })}</div>
        <div className="skill">{t({ en: "Visual Style & Composition", ua: "Візуальний стиль і композиція" })}</div>
        <div className="skill">{t({ en: "Poster Design · Art Direction", ua: "Постер-дизайн · Арт-дирекція" })}</div>
        <div className="skill">{t({ en: "Illustration · Collage", ua: "Ілюстрація · Колаж" })}</div>
      </div>
    </div>
  );
}

window.About = About;
