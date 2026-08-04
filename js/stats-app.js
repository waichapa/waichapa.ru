let statDict = [], statGrammar = [];

function countLearnedWords(entries) {
  // Each entry is a separate meaning/sense to memorize (e.g. 배: pear/ship/
  // stomach are 3 things to actually learn), so count entries, not unique
  // Korean strings.
  return entries.length;
}

function countMultiMeaning(entries) {
  const seen = new Set();
  const duplicates = new Set();
  for (const e of entries) {
    const word = e.Korean;
    if (seen.has(word)) {
      duplicates.add(word);
    } else {
      seen.add(word);
    }
  }
  return duplicates.size;
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