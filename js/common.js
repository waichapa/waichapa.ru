const CONTACTS = [
  { icon: '💻', label: 'GitHub', href: 'https://github.com/waichapa' },
  { icon: '🎮', label: 'Discord: waichapa', href: '#' },
  { icon: '✈️', label: 'Telegram: @waichapa', href: 'https://t.me/waichapa' },
  { icon: '✉️', label: 'waichapaofficial@gmail.com', href: 'mailto:waichapaofficial@gmail.com' }
];

function renderHeader(activePage) {
  const el = document.getElementById('app-header');
  if (!el) return;
  el.innerHTML = `
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="index.html">
        <img src="assets/image.png" alt="waichapa avatar">
        <span class="name">waichapa <span class="level">2 급</span></span>
      </a>
      <nav class="main-nav">
        <a href="index.html" data-page="index" data-i18n="nav_home">Blog</a>
        <a href="dictionary.html" data-page="dictionary" data-i18n="nav_dict">Dictionary</a>
        <a href="quiz.html" data-page="quiz" data-i18n="nav_quiz">Quiz</a>
        <a href="stats.html" data-page="stats" data-i18n="nav_stats">Stats</a>
        <a href="projects.html" data-page="projects" data-i18n="nav_projects">Projects</a>
      </nav>
      <div class="controls">
        <button id="langBtn">${getLang() === 'ru' ? 'EN' : 'RU'}</button>
        <button id="themeBtn">${themeIcon(getTheme())}</button>
      </div>
    </div>
  </header>`;
  el.querySelectorAll('nav.main-nav a').forEach(a => {
    if (a.dataset.page === activePage) a.classList.add('active');
  });
  document.getElementById('langBtn').onclick = () => {
    const newLang = getLang() === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    document.getElementById('langBtn').textContent = newLang === 'ru' ? 'EN' : 'RU';
  };
  document.getElementById('themeBtn').onclick = cycleTheme;
}

function renderFooter() {
  const el = document.getElementById('app-footer');
  if (!el) return;
  el.innerHTML = `
  <footer class="site-footer">
    <div class="container">
      <h3 style="text-align:center;margin-top:0" data-i18n="contacts_title">Contacts</h3>
      <div class="contacts-grid">
        ${CONTACTS.map(c => `<a class="contact-chip" href="${c.href}" target="_blank" rel="noopener">${c.icon} ${c.label}</a>`).join('')}
      </div>
      <p style="text-align:center;color:var(--text-soft);margin-top:20px;font-size:.85rem" data-i18n="footer_rights">Made by waichapa</p>
    </div>
  </footer>`;
}

document.addEventListener('DOMContentLoaded', () => {
  applyI18n();
});