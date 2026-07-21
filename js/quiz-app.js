let ALL_WORDS = [];
let quizWords = [];
let quizIndex = 0;
let score = { correct: 0, wrong: 0 };
let streak = 0;
let bestStreak = 0;
let answered = false;
let currentTag = '';
let currentQuickFilter = 'all'; // all | last10 | last30 | last50 | last100

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildQuizFilters() {
  const tagSel = document.getElementById('quizTagFilter');
  const wrap = document.getElementById('quizQuickFilters');
  if (!tagSel || !wrap) return;

  const lang = getLang();
  const tagKey = lang === 'ru' ? 'rutag' : 'engtag';
  const tags = [...new Set(ALL_WORDS.map(e => e[tagKey]))].sort();
  tagSel.innerHTML = `<option value="">${t('all_tags')}</option>` +
    tags.map(tag => `<option value="${tag}">${tag}</option>`).join('');
  tagSel.onchange = () => { currentTag = tagSel.value; initQuiz(); };

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
      initQuiz();
    };
  });
}

function buildQuizPool() {
  const lang = getLang();
  const tagKey = lang === 'ru' ? 'rutag' : 'engtag';
  let data = ALL_WORDS;

  if (currentQuickFilter.startsWith('last')) {
    const n = parseInt(currentQuickFilter.replace('last', ''), 10);
    data = data.slice(-n);
  }
  if (currentTag) data = data.filter(e => e[tagKey] === currentTag);

  quizWords = shuffle([...data]).slice(0, Math.min(20, data.length));
}

async function initQuiz() {
  if (!ALL_WORDS.length) {
    ALL_WORDS = await fetch('data/dictionary.json').then(r => r.json());
    buildQuizFilters();
  }
  buildQuizPool();
  quizIndex = 0; score = { correct: 0, wrong: 0 }; streak = 0; answered = false;
  renderQuiz();
}

function buildOptions(current, answerKey, correctAnswer) {
  const seen = new Set([correctAnswer.toLowerCase()]);
  const distractors = [];
  const pool = shuffle(ALL_WORDS.filter(e => e !== current));
  for (const e of pool) {
    const val = e[answerKey].split(' / ')[0].trim();
    const key = val.toLowerCase();
    if (!seen.has(key)) { seen.add(key); distractors.push(val); }
    if (distractors.length === 3) break;
  }
  return shuffle([correctAnswer, ...distractors]);
}

function updateScoreboard() {
  const scoreEl = document.getElementById('quizScore');
  if (!scoreEl) return;
  scoreEl.innerHTML = `
    <span>${t('quiz_score')}: ${score.correct} / ${score.correct + score.wrong}</span>
    <span>🔥 ${t('quiz_streak')}: ${streak}</span>
    <span>⭐ ${t('quiz_best')}: ${bestStreak}</span>
  `;
}

function renderQuiz() {
  const wrap = document.getElementById('flashcardWrap');
  const progEl = document.getElementById('quizProgress');
  if (!wrap) return;

  if (!quizWords.length) {
    wrap.innerHTML = `<div class="flashcard"><p>${t('quiz_empty')}</p></div>`;
    if (progEl) progEl.textContent = '';
    updateScoreboard();
    return;
  }

  if (quizIndex >= quizWords.length) {
    const total = quizWords.length;
    const emoji = score.wrong === 0 ? '🏆' : score.correct >= score.wrong ? '🎉' : '📚';
    wrap.innerHTML = `
      <div class="flashcard result">
        <div class="result-emoji">${emoji}</div>
        <p>${t('quiz_finished')}</p>
        <div class="quiz-final-score">${score.correct} / ${total}</div>
        <button class="btn" id="restartQuiz">${t('quiz_start')}</button>
      </div>`;
    document.getElementById('restartQuiz').onclick = initQuiz;
    if (progEl) progEl.textContent = '';
    updateScoreboard();
    return;
  }

  const w = quizWords[quizIndex];
  const lang = getLang();
  const answerKey = lang === 'ru' ? 'Russian' : 'English';
  const correctAnswer = w[answerKey].split(' / ')[0].trim();
  const options = buildOptions(w, answerKey, correctAnswer);

  wrap.innerHTML = `
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${(quizIndex / quizWords.length) * 100}%"></div></div>
    <div class="flashcard">
      <div class="kr-big">${w.Korean}</div>
    </div>
    <div class="quiz-options">
      ${options.map(opt => `<button class="quiz-opt" data-opt="${escapeHtml(opt)}">${opt}</button>`).join('')}
    </div>
  `;

  document.querySelectorAll('.quiz-opt').forEach(btn => {
    btn.onclick = () => handleAnswer(btn, correctAnswer);
  });

  if (progEl) progEl.textContent = `${quizIndex + 1} / ${quizWords.length}`;
  updateScoreboard();
}

function handleAnswer(btn, correctAnswer) {
  if (answered) return;
  answered = true;
  const chosen = btn.dataset.opt;
  const isCorrect = chosen === correctAnswer;

  document.querySelectorAll('.quiz-opt').forEach(b => {
    b.classList.add('disabled');
    if (b.dataset.opt === correctAnswer) b.classList.add('correct');
    else if (b === btn) b.classList.add('wrong');
  });

  if (isCorrect) { score.correct++; streak++; bestStreak = Math.max(bestStreak, streak); }
  else { score.wrong++; streak = 0; }

  updateScoreboard();
  setTimeout(nextCard, 900);
}

function nextCard() {
  quizIndex++;
  answered = false;
  renderQuiz();
}

document.addEventListener('DOMContentLoaded', initQuiz);
document.addEventListener('langChanged', () => {
  currentTag = '';
  buildQuizFilters();
  initQuiz();
});
