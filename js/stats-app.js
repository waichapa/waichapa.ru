let statDict = [], statGrammar = [];

// Каждое значение через " / " считается отдельным выученным словом
function countLearnedWords(entries) {
  return entries.reduce((sum, e) => {
    const meanings = e.English.split(' / ').map(s => s.trim()).filter(Boolean);
    return sum + (meanings.length || 1);
  }, 0);
}

function countMultiMeaning(entries) {
  return entries.filter(e => e.English.split(' / ').map(s => s.trim()).filter(Boolean).length > 1).length;
}

async function initStats() {
  const [d, g] = await Promise.all([
    fetch('data/dictionary.json').then(r => r.json()),
    fetch('data/grammar.json').then(r => r.json())
  ]);
  statDict = d; statGrammar = g;
  renderStats();
}

function renderStats() {
  const grid = document.getElementById('statGrid');
  const tagWrap = document.getElementById('tagBars');
  if (!grid || !statDict.length) return;
  const lang = getLang();
  const tagKey = lang === 'ru' ? 'rutag' : 'engtag';

  const learned = countLearnedWords(statDict);
  const multi = countMultiMeaning(statDict);
  const grammarCount = statGrammar.length;

  grid.innerHTML = `
    <div class="card stat-box"><div class="num">${learned}</div><div class="label">${t('stat_learned')}</div></div>
    <div class="card stat-box"><div class="num">${multi}</div><div class="label">${t('stat_multi')}</div></div>
    <div class="card stat-box"><div class="num">${grammarCount}</div><div class="label">${t('stat_grammar')}</div></div>
  `;

  const tagCounts = {};
  statDict.forEach(e => {
    const tag = e[tagKey];
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });
  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  const max = sorted.length ? sorted[0][1] : 1;

  tagWrap.innerHTML = sorted.map(([tag, count]) => `
    <div class="bar-row">
      <div class="bar-label">${tag}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div>
      <div class="bar-count">${count}</div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', initStats);