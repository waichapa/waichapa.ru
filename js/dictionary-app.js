let DICTIONARY = [];
let GRAMMAR = [];
let currentQuickFilter = 'all'; // all | last10 | last30 | last50 | last100

async function loadData() {
  const [d, g] = await Promise.all([
    fetch('data/dictionary.json').then(r => r.json()),
    fetch('data/grammar.json').then(r => r.json())
  ]);
  DICTIONARY = d;
  GRAMMAR = g;
  buildTagFilter();
  buildQuickFilters();
  renderDict();
  renderGrammar();
}

function isMultiMeaning(entry) {
  return entry.English.split(' / ').map(s => s.trim()).filter(Boolean).length > 1;
}

function buildTagFilter() {
  const sel = document.getElementById('tagFilter');
  const lang = getLang();
  const tagKey = lang === 'ru' ? 'rutag' : 'engtag';
  const tags = [...new Set(DICTIONARY.map(e => e[tagKey]))].sort();
  sel.innerHTML = `<option value="">${t('all_tags')}</option>` +
    tags.map(tag => `<option value="${tag}">${tag}</option>`).join('');
  sel.onchange = renderDict;
}

function buildQuickFilters() {
  const wrap = document.getElementById('quickFilters');
  const opts = [
    ['all', t('show_all')], ['last10', t('last10')],
    ['last30', t('last30')], ['last50', t('last50')], ['last100', t('last100')]
  ];
  wrap.innerHTML = opts.map(([key, label]) =>
    `<button data-key="${key}" class="${key === currentQuickFilter ? 'active' : ''}">${label}</button>`
  ).join('');
  wrap.querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      currentQuickFilter = b.dataset.key;
      wrap.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderDict();
    };
  });
}

function renderDict() {
  const listEl = document.getElementById('dictList');
  if (!listEl || !DICTIONARY.length) return;
  const query = (document.getElementById('dictSearch').value || '').toLowerCase().trim();
  const tagVal = document.getElementById('tagFilter').value;
  const lang = getLang();
  const tagKey = lang === 'ru' ? 'rutag' : 'engtag';

  let data = DICTIONARY;
  if (currentQuickFilter.startsWith('last')) {
    const n = parseInt(currentQuickFilter.replace('last', ''), 10);
    data = data.slice(-n).reverse();
  }

  const filtered = data.filter(e => {
    const matchesQuery = !query ||
      e.Korean.toLowerCase().includes(query) ||
      e.English.toLowerCase().includes(query) ||
      e.Russian.toLowerCase().includes(query) ||
      e.rutag.toLowerCase().includes(query) ||
      e.engtag.toLowerCase().includes(query);
    const matchesTag = !tagVal || e[tagKey] === tagVal;
    return matchesQuery && matchesTag;
  });

  listEl.innerHTML = filtered.map(e => `
    <div class="word-card">
      <div class="kr">${e.Korean}</div>
      <div class="en">${e.English}${isMultiMeaning(e) ? `<span class="multi-badge">✦ ${t('multi_meaning')}</span>` : ''}</div>
      <div class="ru">${e.Russian}</div>
      <span class="tag">${lang === 'ru' ? e.rutag : e.engtag}</span>
    </div>
  `).join('') || `<p style="color:var(--text-soft)">—</p>`;
}

function renderGrammar() {
  const listEl = document.getElementById('grammarList');
  if (!listEl || !GRAMMAR.length) return;
  const query = (document.getElementById('grammarSearch').value || '').toLowerCase().trim();
  const lang = getLang();

  const filtered = GRAMMAR.filter(g => {
    const title = lang === 'ru' ? g.ru_title : g.en_title;
    const expl = lang === 'ru' ? g.ru_explanation : g.en_explanation;
    return !query || title.toLowerCase().includes(query) || expl.toLowerCase().includes(query);
  });

  listEl.innerHTML = filtered.map(g => `
    <div class="card grammar-card">
      <h3>${lang === 'ru' ? g.ru_title : g.en_title}</h3>
      <p class="expl">${lang === 'ru' ? g.ru_explanation : g.en_explanation}</p>
      <p class="ex">${lang === 'ru' ? g.ru_example : g.en_example}</p>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  document.getElementById('dictSearch').addEventListener('input', renderDict);
  document.getElementById('grammarSearch').addEventListener('input', renderGrammar);
});
document.addEventListener('langChanged', () => {
  buildTagFilter(); buildQuickFilters();
});