let ALL_WORDS = [];
let quizWords = [];
let quizIndex = 0;
let score = { correct: 0, wrong: 0 };
let streak = 0;
let bestStreak = 0;
let answered = false;
let currentTag = '';
let currentQuickFilter = 'all'; // all | last10 | last30 | last50 | last100
let questionLang = 'korean'; // korean | english | russian — what's shown on the card
let quizLength = '20'; // '10' | '20' | '30' | '50' | '100' | 'all' — how many cards per round
let quizMode = 'choice'; // 'choice' | 'swipe'
let swipeFlipped = false;
let swipeKnown = [];
let swipeUnknown = [];
let swipeDrag = null; // { startX, startY, dx, dy, pointerId }
let swipeReviewPool = null; // when set, quiz runs only over these words (review round)

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

// Given the chosen "front of card" language and current site language,
// decide which field is shown on the card and which field the person
// answers with.
function getQuizFields() {
  const lang = getLang();
  if (questionLang === 'english') return { questionKey: 'English', answerKey: 'Korean' };
  if (questionLang === 'russian') return { questionKey: 'Russian', answerKey: 'Korean' };
  return { questionKey: 'Korean', answerKey: lang === 'ru' ? 'Russian' : 'English' };
}

function buildQuizFilters() {
  const tagSel = document.getElementById('quizTagFilter');
  const wrap = document.getElementById('quizQuickFilters');
  const frontSel = document.getElementById('quizFrontLang');
  const lengthSel = document.getElementById('quizLength');
  if (!tagSel || !wrap) return;

  const lang = getLang();
  const tagKey = lang === 'ru' ? 'rutag' : 'engtag';
  const tags = [...new Set(ALL_WORDS.map(e => e[tagKey]))].sort();
  tagSel.innerHTML = `<option value="">${t('all_tags')}</option>` +
    tags.map(tag => `<option value="${tag}">${tag}</option>`).join('');
  tagSel.onchange = () => { currentTag = tagSel.value; initQuiz(); };

  if (frontSel) {
    const frontOpts = [
      ['korean', t('quiz_front_korean')],
      ['english', t('quiz_front_english')],
      ['russian', t('quiz_front_russian')]
    ];
    frontSel.innerHTML = frontOpts.map(([key, label]) =>
      `<option value="${key}" ${key === questionLang ? 'selected' : ''}>${label}</option>`
    ).join('');
    frontSel.onchange = () => { questionLang = frontSel.value; initQuiz(); };
  }

  if (lengthSel) {
    const lengthOpts = [
      ['10', '10'], ['20', '20'], ['30', '30'], ['50', '50'], ['100', '100'],
      ['all', t('quiz_length_all')]
    ];
    lengthSel.innerHTML = lengthOpts.map(([key, label]) =>
      `<option value="${key}" ${key === quizLength ? 'selected' : ''}>${label}</option>`
    ).join('');
    lengthSel.onchange = () => { quizLength = lengthSel.value; initQuiz(); };
  }

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

function buildQuizModeTabs() {
  const tabsWrap = document.getElementById('quizModeTabs');
  if (!tabsWrap) return;
  tabsWrap.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === quizMode);
    btn.onclick = () => {
      if (quizMode === btn.dataset.mode) return;
      quizMode = btn.dataset.mode;
      tabsWrap.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      swipeReviewPool = null;
      initQuiz();
    };
  });
}

function buildQuizPool() {
  const lang = getLang();
  const tagKey = lang === 'ru' ? 'rutag' : 'engtag';

  if (swipeReviewPool) {
    quizWords = shuffle([...swipeReviewPool]);
    return;
  }

  let data = ALL_WORDS;

  if (currentQuickFilter.startsWith('last')) {
    const n = parseInt(currentQuickFilter.replace('last', ''), 10);
    data = data.slice(-n);
  }
  if (currentTag) data = data.filter(e => e[tagKey] === currentTag);

  const shuffled = shuffle([...data]);
  quizWords = quizLength === 'all' ? shuffled : shuffled.slice(0, Math.min(parseInt(quizLength, 10), shuffled.length));
}

async function initQuiz() {
  if (!ALL_WORDS.length) {
    ALL_WORDS = await fetch('data/dictionary.json').then(r => r.json());
    buildQuizFilters();
  }
  buildQuizModeTabs();
  buildQuizPool();
  quizIndex = 0; score = { correct: 0, wrong: 0 }; streak = 0; answered = false;
  swipeFlipped = false; swipeKnown = []; swipeUnknown = [];
  renderQuiz();
}

function buildOptions(current, answerKey, correctAnswer) {
  const seen = new Set([correctAnswer.toLowerCase()]);
  const distractors = [];
  const pool = shuffle(ALL_WORDS.filter(e => e !== current));
  for (const e of pool) {
    const val = e[answerKey].trim();
    const key = val.toLowerCase();
    if (!seen.has(key)) { seen.add(key); distractors.push(val); }
    if (distractors.length === 3) break;
  }
  return shuffle([correctAnswer, ...distractors]);
}

function updateScoreboard() {
  const scoreEl = document.getElementById('quizScore');
  if (!scoreEl) return;
  if (quizMode === 'swipe') {
    scoreEl.innerHTML = `
      <span>✅ ${t('quiz_know')}: ${swipeKnown.length}</span>
      <span>❌ ${t('quiz_dont_know')}: ${swipeUnknown.length}</span>
    `;
  } else {
    scoreEl.innerHTML = `
      <span>${t('quiz_score')}: ${score.correct} / ${score.correct + score.wrong}</span>
      <span>🔥 ${t('quiz_streak')}: ${streak}</span>
      <span>⭐ ${t('quiz_best')}: ${bestStreak}</span>
    `;
  }
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
    renderFinishScreen();
    if (progEl) progEl.textContent = '';
    updateScoreboard();
    return;
  }

  if (progEl) progEl.textContent = `${quizIndex + 1} / ${quizWords.length}`;

  if (quizMode === 'swipe') renderSwipeCard();
  else renderChoiceCard();

  updateScoreboard();
}

function renderFinishScreen() {
  const wrap = document.getElementById('flashcardWrap');
  if (quizMode === 'swipe') {
    const total = swipeKnown.length + swipeUnknown.length;
    const emoji = swipeUnknown.length === 0 ? '🏆' : swipeKnown.length >= swipeUnknown.length ? '🎉' : '📚';
    wrap.innerHTML = `
      <div class="flashcard result">
        <div class="result-emoji">${emoji}</div>
        <p>${t('quiz_finished')}</p>
        <div class="quiz-final-score">✅ ${swipeKnown.length} / ❌ ${swipeUnknown.length}</div>
        <div class="quiz-final-actions">
          ${swipeUnknown.length ? `<button class="btn" id="reviewUnknown">${t('quiz_review_unknown')}</button>` : ''}
          <button class="btn outline" id="restartQuiz">${t('quiz_start')}</button>
        </div>
      </div>`;
    const reviewBtn = document.getElementById('reviewUnknown');
    if (reviewBtn) reviewBtn.onclick = () => {
      swipeReviewPool = [...swipeUnknown];
      initQuiz();
    };
    document.getElementById('restartQuiz').onclick = () => { swipeReviewPool = null; initQuiz(); };
  } else {
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
  }
}

function renderChoiceCard() {
  const wrap = document.getElementById('flashcardWrap');
  const w = quizWords[quizIndex];
  const { questionKey, answerKey } = getQuizFields();
  const questionText = w[questionKey].trim();
  const correctAnswer = w[answerKey].trim();
  const options = buildOptions(w, answerKey, correctAnswer);

  wrap.innerHTML = `
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${(quizIndex / quizWords.length) * 100}%"></div></div>
    <div class="flashcard">
      <div class="kr-big">${questionText}</div>
    </div>
    <div class="quiz-options">
      ${options.map(opt => `<button class="quiz-opt" data-opt="${escapeHtml(opt)}">${opt}</button>`).join('')}
    </div>
  `;

  document.querySelectorAll('.quiz-opt').forEach(btn => {
    btn.onclick = () => handleAnswer(btn, correctAnswer);
  });
}

// ---- Swipe mode (know / don't know) ----

function renderSwipeCard() {
  const wrap = document.getElementById('flashcardWrap');
  const w = quizWords[quizIndex];
  const { questionKey, answerKey } = getQuizFields();
  const front = w[questionKey].trim();
  const back = w[answerKey].trim();
  swipeFlipped = false;

  wrap.innerHTML = `
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${(quizIndex / quizWords.length) * 100}%"></div></div>
    <div class="swipe-card-wrap">
      <div class="swipe-card" id="swipeCard">
        <div class="swipe-label know">✅ ${t('quiz_know')}</div>
        <div class="swipe-label dontknow">❌ ${t('quiz_dont_know')}</div>
        <div class="swipe-card-face">${escapeHtml(front)}</div>
      </div>
    </div>
    <p class="swipe-hint">${t('quiz_flip_hint')}</p>
    <div class="swipe-buttons">
      <button class="swipe-btn dontknow" id="btnDontKnow">❌ ${t('quiz_dont_know')}</button>
      <button class="swipe-btn flip" id="btnFlip">🔄</button>
      <button class="swipe-btn know" id="btnKnow">✅ ${t('quiz_know')}</button>
    </div>
  `;

  const cardEl = document.getElementById('swipeCard');
  const faceEl = cardEl.querySelector('.swipe-card-face');
  let justDragged = false;

  const flip = () => {
    swipeFlipped = !swipeFlipped;
    faceEl.textContent = swipeFlipped ? back : front;
    cardEl.classList.toggle('flipped', swipeFlipped);
  };

  cardEl.addEventListener('click', () => {
    if (justDragged) { justDragged = false; return; }
    flip();
  });
  document.getElementById('btnFlip').onclick = flip;
  document.getElementById('btnDontKnow').onclick = () => resolveSwipe(false);
  document.getElementById('btnKnow').onclick = () => resolveSwipe(true);

  attachSwipeHandlers(cardEl, moved => { justDragged = moved; });
}

function attachSwipeHandlers(cardEl, onDragEnd) {
  cardEl.addEventListener('pointerdown', e => {
    swipeDrag = { startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, pointerId: e.pointerId, moved: false };
    cardEl.setPointerCapture(e.pointerId);
    cardEl.classList.add('dragging');
  });

  cardEl.addEventListener('pointermove', e => {
    if (!swipeDrag || swipeDrag.pointerId !== e.pointerId) return;
    swipeDrag.dx = e.clientX - swipeDrag.startX;
    swipeDrag.dy = e.clientY - swipeDrag.startY;
    if (Math.abs(swipeDrag.dx) > 6) swipeDrag.moved = true;
    const rot = swipeDrag.dx / 14;
    cardEl.style.transform = `translate(${swipeDrag.dx}px, ${swipeDrag.dy}px) rotate(${rot}deg)`;
    const knowLabel = cardEl.querySelector('.swipe-label.know');
    const dontKnowLabel = cardEl.querySelector('.swipe-label.dontknow');
    const strength = Math.min(Math.abs(swipeDrag.dx) / 100, 1);
    if (swipeDrag.dx > 0) { knowLabel.style.opacity = strength; dontKnowLabel.style.opacity = 0; }
    else { dontKnowLabel.style.opacity = strength; knowLabel.style.opacity = 0; }
  });

  const endDrag = e => {
    if (!swipeDrag || swipeDrag.pointerId !== e.pointerId) return;
    cardEl.classList.remove('dragging');
    const dx = swipeDrag.dx;
    const moved = swipeDrag.moved;
    onDragEnd(moved);
    if (Math.abs(dx) > 100) {
      flyOutAndResolve(cardEl, dx > 0);
    } else {
      cardEl.style.transform = '';
      const knowLabel = cardEl.querySelector('.swipe-label.know');
      const dontKnowLabel = cardEl.querySelector('.swipe-label.dontknow');
      if (knowLabel) knowLabel.style.opacity = 0;
      if (dontKnowLabel) dontKnowLabel.style.opacity = 0;
    }
    swipeDrag = null;
  };

  cardEl.addEventListener('pointerup', endDrag);
  cardEl.addEventListener('pointercancel', endDrag);
}

function flyOutAndResolve(cardEl, knew) {
  cardEl.style.transition = 'transform .3s ease, opacity .3s ease';
  cardEl.style.transform = `translate(${knew ? 600 : -600}px, -40px) rotate(${knew ? 30 : -30}deg)`;
  cardEl.style.opacity = '0';
  setTimeout(() => resolveSwipe(knew), 220);
}

function resolveSwipe(knew) {
  const w = quizWords[quizIndex];
  if (knew) swipeKnown.push(w); else swipeUnknown.push(w);
  quizIndex++;
  renderQuiz();
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
  buildQuizModeTabs();
  initQuiz();
});
