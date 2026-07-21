const THEMES = ['light', 'dark', 'pastel'];
function getTheme() { return localStorage.getItem('theme') || 'light'; }
function setTheme(th) {
  document.documentElement.setAttribute('data-theme', th);
  localStorage.setItem('theme', th);
}
function cycleTheme() {
  const cur = getTheme();
  const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
  setTheme(next);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = themeIcon(next);
}
function themeIcon(th) {
  return th === 'light' ? '☀️' : th === 'dark' ? '🌙' : '🌸';
}
setTheme(getTheme());