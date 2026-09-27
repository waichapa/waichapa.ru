let DICTIONARY = [];
let GRAMMAR = [];
let currentQuickFilter = 'all'; // all | last10 | last30 | last50 | last100
let currentSortOrder = 'newest'; // newest | oldest
let multiMeaningCounts = {}; // Korean word -> number of entries sharing it
let currentGrammarTag = ''; // '' = all tags
let currentGrammarLevel = ''; // '' = all levels

async function loadData() {
  const [d, g] = await Promise.all([
    fetch('data/dictionary.json').then(r => r.json()),
    fetch('data/grammar.json').then(r => r.json())
  ]);
  DICTIONARY = d;
  GRAMMAR = g;
  buildMultiMeaningCounts();
  buildTagFilter();
  buildQuickFilters();
  buildSortFilter();
  buildGrammarTagCloud();
  buildGrammarLevelFilter();
  renderDict();
  renderGrammar();
}

// A word is "multi-meaning" when it appears in the dictionary as more than
// one entry (each entry = one distinct sense). This is decided at data-entry
// time (see word-entry prompt), not by string-splitting English/Russian.
function buildMultiMeaningCounts() {
  multiMeaningCounts = {};
  DICTIONARY.forEach(e => {
    multiMeaningCounts[e.Korean] = (multiMeaningCounts[e.Korean] || 0) + 1;
  });
}

function isMultiMeaning(entry) {
  return (multiMeaningCounts[entry.Korean] || 0) > 1;
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

function buildSortFilter() {
  const sel = document.getElementById('sortFilter');
  if (!sel) return;
  sel.innerHTML = `
    <option value="newest">${t('sort_newest')}</option>
    <option value="oldest">${t('sort_oldest')}</option>
  `;
  sel.value = currentSortOrder;
  sel.onchange = () => { currentSortOrder = sel.value; renderDict(); };
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
    data = data.slice(-n);
  }
  if (currentSortOrder === 'newest') data = [...data].reverse();

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

// Distribution of grammar points by tag, shown as clickable chips so it
// doubles as both an overview (counts per tag/"reason", "condition", etc.)
// and a quick way to filter the list down to just that tag.
function buildGrammarTagCloud() {
  const wrap = document.getElementById('grammarTagCloud');
  if (!wrap || !GRAMMAR.length) return;
  const lang = getLang();
  const tagKey = lang === 'ru' ? 'rutag' : 'engtag';

  const counts = {};
  GRAMMAR.forEach(g => { counts[g[tagKey]] = (counts[g[tagKey]] || 0) + 1; });
  const sortedTags = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (currentGrammarTag && !(currentGrammarTag in counts)) currentGrammarTag = '';

  wrap.innerHTML = `<button data-tag="" class="${!currentGrammarTag ? 'active' : ''}">${t('all_tags')}</button>` +
    sortedTags.map(([tag, count]) =>
      `<button data-tag="${tag}" class="${tag === currentGrammarTag ? 'active' : ''}">${tag} <span class="cnt">${count}</span></button>`
    ).join('');

  wrap.querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      currentGrammarTag = b.dataset.tag;
      wrap.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderGrammar();
    };
  });
}

function buildGrammarLevelFilter() {
  const sel = document.getElementById('grammarLevelFilter');
  if (!sel || !GRAMMAR.length) return;
  const levels = [...new Set(GRAMMAR.map(g => g.level))].sort((a, b) => a - b);
  sel.innerHTML = `<option value="">${t('all_levels')}</option>` +
    levels.map(l => `<option value="${l}">${t('grammar_level_' + l)}</option>`).join('');
  sel.value = currentGrammarLevel;
  sel.onchange = () => { currentGrammarLevel = sel.value; renderGrammar(); };
}

function renderGrammar() {
  const listEl = document.getElementById('grammarList');
  if (!listEl || !GRAMMAR.length) return;
  const query = (document.getElementById('grammarSearch').value || '').toLowerCase().trim();
  const lang = getLang();
  const tagKey = lang === 'ru' ? 'rutag' : 'engtag';

  const filtered = GRAMMAR.filter(g => {
    const title = lang === 'ru' ? g.ru_title : g.en_title;
    const expl = lang === 'ru' ? g.ru_explanation : g.en_explanation;
    const matchesQuery = !query || title.toLowerCase().includes(query) || expl.toLowerCase().includes(query) ||
      g.engtag.toLowerCase().includes(query) || g.rutag.toLowerCase().includes(query);
    const matchesTag = !currentGrammarTag || g[tagKey] === currentGrammarTag;
    const matchesLevel = !currentGrammarLevel || String(g.level) === String(currentGrammarLevel);
    return matchesQuery && matchesTag && matchesLevel;
  });

  listEl.innerHTML = filtered.map(g => `
    <div class="card grammar-card">
      <h3>${lang === 'ru' ? g.ru_title : g.en_title}
        <span class="g-tag">${g[tagKey]}</span>
        <span class="g-level">${t('grammar_level_' + g.level)}</span>
      </h3>
      <p class="expl">${lang === 'ru' ? g.ru_explanation : g.en_explanation}</p>
      <p class="ex">${lang === 'ru' ? g.ru_example : g.en_example}</p>
    </div>
  `).join('') || `<p style="color:var(--text-soft)">—</p>`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  document.getElementById('dictSearch').addEventListener('input', renderDict);
  document.getElementById('grammarSearch').addEventListener('input', renderGrammar);
});
document.addEventListener('langChanged', () => {
  buildTagFilter(); buildQuickFilters(); buildSortFilter();
  buildGrammarTagCloud(); buildGrammarLevelFilter();
});