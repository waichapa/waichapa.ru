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
let quizMode = 'choice'; // 'choice' | 'swipe' | 'type' | 'listen' | 'dictation'
let swipeFlipped = false;
let swipeKnown = [];
let swipeUnknown = [];
let swipeDrag = null; // { startX, startY, dx, dy, pointerId }
let swipeReviewPool = null; // when set, quiz runs only over these words (review round)

// ---- New in this version: SRS + typing/listening modes ----
let missedWords = [];          // words answered wrong this round (non-swipe modes) -> "review" button
let typeState = { fb: null, typed: '', hint: 0 };
let quizPoolIds = [];          // ids of all words passing the current filters (for SRS counters)
let quizSession = 0;           // bumped on every initQuiz(): lets delayed callbacks detect a restart
let storageWarned = false;
const WORD_ID = new Map();     // dictionary entry -> stable id used as SRS key
const ENTRY_BY_ID = new Map();

// Stable SRS key. The first entry with a given Korean string uses the string itself;
// further senses of the same word get "#1", "#2"... in file order. So appending new
// words/senses to dictionary.json never changes existing keys, and fixing a typo in
// the English/Russian text does not reset progress. (Don't reorder/delete entries.)
function buildWordIds() {
  WORD_ID.clear(); ENTRY_BY_ID.clear();
  const seen = Object.create(null);
  ALL_WORDS.forEach(e => {
    const n = seen[e.Korean] = (seen[e.Korean] || 0) + 1;
    const id = n === 1 ? e.Korean : e.Korean + '#' + (n - 1);
    WORD_ID.set(e, id);
    ENTRY_BY_ID.set(id, e);
  });
}
function idOf(e) { return WORD_ID.get(e); }

function ttsOk() { return typeof KoTTS !== 'undefined' && KoTTS.supported; }
function ttsBtn(text) { return typeof KoTTS !== 'undefined' ? KoTTS.btnHtml(text) : ''; }
function speakWord(e) { if (ttsOk()) KoTTS.speak(e.Korean); }

// Records an answer in the spaced-repetition store. Skipped in "review missed words" rounds
// (those words were already graded once in the round they were missed).
function gradeWord(w, ok) {
  if (swipeReviewPool || !SRS.enabled()) return;
  SRS.grade(idOf(w), ok);
  if (SRS.saveFailed() && !storageWarned) { storageWarned = true; showToast(t('srs_storage_warn')); }
}

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

// For typing/listening modes: which field is the "meaning" side (the non-Korean one).
// Respects the "Show on card" selector: English/Russian if chosen, otherwise the site language.
function getMeaningKey() {
  const { questionKey, answerKey } = getQuizFields();
  return questionKey === 'Korean' ? answerKey : questionKey;
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
    if (btn.hasAttribute('data-needs-tts')) btn.hidden = !ttsOk();
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
    quizPoolIds = quizWords.map(idOf);
    return;
  }

  let data = ALL_WORDS;

  if (currentQuickFilter.startsWith('last')) {
    const n = parseInt(currentQuickFilter.replace('last', ''), 10);
    data = data.slice(-n);
  }
  if (currentTag) data = data.filter(e => e[tagKey] === currentTag);

  quizPoolIds = data.map(idOf);
  const limit = quizLength === 'all' ? Infinity : parseInt(quizLength, 10);

  if (SRS.enabled()) {
    // Spaced repetition: words due for review first, then a few new ones (see srs.js).
    const ids = SRS.buildQueue(quizPoolIds, { limit });
    quizWords = shuffle(ids.map(id => ENTRY_BY_ID.get(id)));
  } else {
    const shuffled = shuffle([...data]);
    quizWords = shuffled.slice(0, Math.min(limit, shuffled.length));
  }
}

async function initQuiz() {
  if (!ALL_WORDS.length) {
    ALL_WORDS = await fetch('data/dictionary.json').then(r => r.json());
    buildWordIds();
    buildQuizFilters();
    initSrsUi();
  }
  buildQuizModeTabs();
  buildQuizPool();
  quizSession++;
  if (typeof KoTTS !== 'undefined') KoTTS.stop();
  quizIndex = 0; score = { correct: 0, wrong: 0 }; streak = 0; answered = false;
  swipeFlipped = false; swipeKnown = []; swipeUnknown = [];
  missedWords = []; typeState = { fb: null, typed: '', hint: 0 };
  renderQuiz();
}

function buildOptions(current, answerKey, correctAnswer) {
  const lang = getLang();
  const tagKey = lang === 'ru' ? 'rutag' : 'engtag';
  const tag = current[tagKey];

  const seen = new Set([correctAnswer.toLowerCase()]);
  const distractors = [];

  const addFrom = pool => {
    for (const e of pool) {
      if (distractors.length === 3) break;
      const val = e[answerKey].trim();
      const key = val.toLowerCase();
      if (!seen.has(key)) { seen.add(key); distractors.push(val); }
    }
  };

  // Prefer distractors from the same topic, so options can't be guessed
  // just by grammatical form/pattern (e.g. verbs ending in -하다).
  const samePool = shuffle(ALL_WORDS.filter(e => e !== current && e[tagKey] === tag));
  addFrom(samePool);

  // If the topic doesn't have enough words, fill the rest from the whole dictionary.
  if (distractors.length < 3) {
    const restPool = shuffle(ALL_WORDS.filter(e => e !== current && e[tagKey] !== tag));
    addFrom(restPool);
  }

  return shuffle([correctAnswer, ...distractors]);
}

function updateSrsStats() {
  const el = document.getElementById('srsStats');
  if (!el) return;
  if (!SRS.enabled() || !quizPoolIds.length || swipeReviewPool) { el.textContent = ''; return; }
  const c = SRS.counts(quizPoolIds);
  el.textContent = tf('srs_stats', { due: c.due, new: c.newAvailable, mature: c.mature });
}

function updateScoreboard() {
  updateSrsStats();
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
    if (SRS.enabled() && quizPoolIds.length && !swipeReviewPool) {
      // Nothing is due today: say so instead of "no words match".
      wrap.innerHTML = `
        <div class="flashcard result">
          <div class="result-emoji">✅</div>
          <p>${t('srs_empty')}</p>
          <button class="btn outline" id="srsPractice">${t('srs_practice')}</button>
        </div>`;
      document.getElementById('srsPractice').onclick = () => {
        SRS.setEnabled(false);
        const toggle = document.getElementById('srsToggle');
        if (toggle) toggle.checked = false;
        initQuiz();
      };
    } else {
      wrap.innerHTML = `<div class="flashcard"><p>${t('quiz_empty')}</p></div>`;
    }
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
  else if (quizMode === 'type' || quizMode === 'dictation') renderTypeCard();
  else if (quizMode === 'listen') renderListenCard();
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
        <div class="quiz-final-actions">
          ${missedWords.length ? `<button class="btn" id="reviewUnknown">${t('quiz_review_unknown')}</button>` : ''}
          <button class="btn outline" id="restartQuiz">${t('quiz_start')}</button>
        </div>
      </div>`;
    const reviewBtn = document.getElementById('reviewUnknown');
    if (reviewBtn) reviewBtn.onclick = () => {
      swipeReviewPool = [...missedWords];
      initQuiz();
    };
    document.getElementById('restartQuiz').onclick = () => { swipeReviewPool = null; initQuiz(); };
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
      <div class="kr-big">${questionText}${questionKey === 'Korean' ? ttsBtn(questionText) : ''}</div>
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
      ${ttsOk() ? `<button type="button" class="swipe-btn flip" data-tts="${escapeHtml(w.Korean)}" aria-label="${escapeHtml(t('tts_play'))}" title="${escapeHtml(t('tts_play'))}">🔊</button>` : ''}
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
  gradeWord(w, knew);
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

  const w = quizWords[quizIndex];
  if (isCorrect) { score.correct++; streak++; bestStreak = Math.max(bestStreak, streak); }
  else { score.wrong++; streak = 0; missedWords.push(w); }
  gradeWord(w, isCorrect);

  updateScoreboard();
  if (quizMode === 'listen') revealListenAnswer(w);
  const session = quizSession;
  setTimeout(() => { if (session === quizSession) nextCard(); }, quizMode === 'listen' ? 1800 : 900);
}

function nextCard() {
  quizIndex++;
  answered = false;
  renderQuiz();
}

// ---- Listening mode: hear the word, pick its meaning ----

function renderListenCard() {
  const wrap = document.getElementById('flashcardWrap');
  const w = quizWords[quizIndex];
  const meaningKey = getMeaningKey();
  const correctAnswer = w[meaningKey].trim();
  const options = buildOptions(w, meaningKey, correctAnswer);

  wrap.innerHTML = `
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${(quizIndex / quizWords.length) * 100}%"></div></div>
    <div class="flashcard">
      <p class="type-label">${t('quiz_p_listen')}</p>
      <div class="type-audio">
        <button type="button" class="btn" data-tts="${escapeHtml(w.Korean)}">🔊 ${t('tts_play')}</button>
        <button type="button" class="btn outline" data-tts="${escapeHtml(w.Korean)}" data-tts-slow>🐢 ${t('tts_slow')}</button>
      </div>
      <div class="type-reveal" id="listenReveal"></div>
    </div>
    <div class="quiz-options">
      ${options.map(opt => `<button class="quiz-opt" data-opt="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}
    </div>
  `;

  document.querySelectorAll('.quiz-opt').forEach(btn => {
    btn.onclick = () => handleAnswer(btn, correctAnswer);
  });
  speakWord(w);
}

// After answering in listening mode, show what the word looked like.
function revealListenAnswer(w) {
  const el = document.getElementById('listenReveal');
  if (!el) return;
  el.innerHTML = `<span class="kr-word">${escapeHtml(w.Korean)}</span>`;
}

// ---- Typing modes: 'type' (meaning -> write Korean) and 'dictation' (audio -> write Korean) ----

function normAnswer(s) {
  // NFC: macOS/iOS keyboards can deliver decomposed jamo; the "~" is used in the dictionary for endings.
  return String(s == null ? '' : s).normalize('NFC').replace(/[~∼〜]/g, '').replace(/\s+/g, ' ').trim();
}

// Spacing (띄어쓰기) is a common learner mistake, so spaces are ignored when comparing.
function sameKorean(a, b) {
  a = normAnswer(a); b = normAnswer(b);
  return a === b || a.replace(/ /g, '') === b.replace(/ /g, '');
}

// In 'type' mode every dictionary word with the same meaning text is accepted (synonyms).
// In 'dictation' only the word that was actually pronounced counts.
function isTypedCorrect(w, given) {
  if (!normAnswer(given)) return false;
  let accepted = [w.Korean];
  if (quizMode === 'type') {
    const key = getMeaningKey();
    const m = w[key].trim().toLowerCase();
    accepted = ALL_WORDS.filter(e => e === w || e[key].trim().toLowerCase() === m).map(e => e.Korean);
  }
  return accepted.some(k => sameKorean(k, given));
}

// "먹다" + hint level 1  ->  "먹 _"
function hintMask(word, level) {
  let shown = 0;
  return [...word].map(ch => {
    if (ch === ' ') return '\u00A0\u00A0';
    if (shown < level) { shown++; return ch; }
    return '_';
  }).join(' ');
}

function renderTypeCard() {
  const wrap = document.getElementById('flashcardWrap');
  const w = quizWords[quizIndex];
  const dictation = quizMode === 'dictation';
  const canHint = [...w.Korean.replace(/ /g, '')].length > 1;
  typeState = { fb: null, typed: '', hint: 0 };

  const prompt = dictation
    ? `<div class="type-audio">
         <button type="button" class="btn" data-tts="${escapeHtml(w.Korean)}">🔊 ${t('tts_play')}</button>
         <button type="button" class="btn outline" data-tts="${escapeHtml(w.Korean)}" data-tts-slow>🐢 ${t('tts_slow')}</button>
       </div>`
    : `<div class="type-prompt">${escapeHtml(w[getMeaningKey()].trim())}</div>`;

  wrap.innerHTML = `
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${(quizIndex / quizWords.length) * 100}%"></div></div>
    <div class="flashcard">
      <p class="type-label">${t(dictation ? 'quiz_p_dictation' : 'quiz_p_type')}</p>
      ${prompt}
    </div>
    <div class="type-area">
      <input id="typeInput" class="type-input" type="text" lang="ko" autocomplete="off" autocapitalize="off"
             autocorrect="off" spellcheck="false" placeholder="${escapeHtml(t('quiz_type_placeholder'))}">
      <div class="type-hint" id="typeHint" aria-live="polite"></div>
      <div class="type-actions" id="typeActions">
        ${canHint ? `<button type="button" class="btn outline small" id="typeHintBtn">💡 ${t('quiz_hint')}</button>` : ''}
        <button type="button" class="btn outline small" id="typeSkipBtn">${t('quiz_dont_know')}</button>
        <button type="button" class="btn" id="typeCheckBtn">${t('quiz_check')}</button>
      </div>
      <div id="typeFeedback"></div>
    </div>
  `;

  const input = document.getElementById('typeInput');
  input.addEventListener('input', () => { typeState.typed = input.value; });
  // Korean IME: Enter also confirms the syllable being composed. Ignore it until composition ends.
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    submitTyped();
  });
  document.getElementById('typeCheckBtn').onclick = submitTyped;
  document.getElementById('typeSkipBtn').onclick = skipTyped;
  const hintBtn = document.getElementById('typeHintBtn');
  if (hintBtn) hintBtn.onclick = () => {
    const max = [...w.Korean.replace(/ /g, '')].length - 1; // always keep at least one syllable hidden
    typeState.hint = Math.min(typeState.hint + 1, max);
    document.getElementById('typeHint').textContent = hintMask(w.Korean, typeState.hint);
    if (typeState.hint >= max) hintBtn.disabled = true;
    input.focus();
  };

  input.focus();
  if (dictation) speakWord(w);
}

function submitTyped() {
  if (typeState.fb) return;
  const w = quizWords[quizIndex];
  const given = typeState.typed.trim();
  if (!given) return;
  const correct = isTypedCorrect(w, given);
  // Correct-with-hint is honest but not "known": it counts as a miss (score and SRS).
  finishTyped(w, correct && !typeState.hint, { given, hinted: correct && typeState.hint > 0 });
}

function skipTyped() {
  if (typeState.fb) return;
  finishTyped(quizWords[quizIndex], false, { skipped: true, given: '' });
}

function finishTyped(w, ok, extra) {
  typeState.fb = Object.assign({ ok }, extra);
  answered = true;
  if (ok) { score.correct++; streak++; bestStreak = Math.max(bestStreak, streak); }
  else { score.wrong++; streak = 0; missedWords.push(w); }
  gradeWord(w, ok);
  updateScoreboard();
  showTypeFeedback(w);
}

function showTypeFeedback(w) {
  const fb = typeState.fb;
  const input = document.getElementById('typeInput');
  if (input) input.disabled = true;
  const actions = document.getElementById('typeActions');
  if (actions) actions.hidden = true;

  const msgKey = fb.ok ? 'quiz_fb_ok' : fb.hinted ? 'quiz_fb_hinted' : fb.skipped ? 'quiz_fb_skipped' : 'quiz_fb_bad';
  const meaning = w[getLang() === 'ru' ? 'Russian' : 'English'];
  document.getElementById('typeFeedback').innerHTML = `
    <div class="type-fb ${fb.ok ? 'ok' : 'bad'}" role="status">
      <strong>${t(msgKey)}</strong>
      ${!fb.ok && fb.given ? `<div class="type-yours">${t('quiz_fb_yours')} ${escapeHtml(fb.given)}</div>` : ''}
      <div class="type-answer"><span class="kr-word">${escapeHtml(w.Korean)}</span>${ttsBtn(w.Korean)}
        <span class="type-meaning">${escapeHtml(meaning)}</span></div>
    </div>
    <div class="type-actions"><button type="button" class="btn" id="typeNextBtn">${t('quiz_next')}</button></div>
  `;

  const shownAt = Date.now();
  const next = document.getElementById('typeNextBtn');
  // 300 ms guard: a held-down Enter must not skip the feedback the moment it appears.
  next.onclick = () => { if (Date.now() - shownAt > 300) nextCard(); };
  setTimeout(() => next.focus(), 0);
  if (quizMode === 'type') speakWord(w); // dictation already played it
}

// ---- SRS progress tools (export / import / reset) ----

function initSrsUi() {
  const toggle = document.getElementById('srsToggle');
  if (toggle) {
    toggle.checked = SRS.enabled();
    toggle.onchange = () => { SRS.setEnabled(toggle.checked); swipeReviewPool = null; initQuiz(); };
  }

  const exportBtn = document.getElementById('srsExport');
  if (exportBtn) exportBtn.onclick = () => {
    const url = URL.createObjectURL(new Blob([SRS.exportJSON()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waichapa-srs-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const fileInput = document.getElementById('srsFile');
  const importBtn = document.getElementById('srsImport');
  if (importBtn && fileInput) {
    importBtn.onclick = () => fileInput.click();
    fileInput.onchange = () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const n = SRS.importJSON(String(reader.result));
          showToast(tf('srs_imported', { n }));
          initQuiz();
        } catch (e) { showToast(t('srs_bad')); }
      };
      reader.onerror = () => showToast(t('srs_bad'));
      reader.readAsText(file);
    };
  }

  const resetBtn = document.getElementById('srsReset');
  if (resetBtn) resetBtn.onclick = () => {
    if (!confirm(t('srs_reset_confirm'))) return;
    SRS.reset();
    showToast(t('srs_reset_done'));
    initQuiz();
  };
}

// Keys 1-4 pick an option in multiple-choice and listening modes.
document.addEventListener('keydown', e => {
  if (quizMode !== 'choice' && quizMode !== 'listen') return;
  if (answered || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (!/^[1-4]$/.test(e.key)) return;
  const btn = document.querySelectorAll('.quiz-opt')[Number(e.key) - 1];
  if (btn) btn.click();
});

document.addEventListener('DOMContentLoaded', initQuiz);
document.addEventListener('langChanged', () => {
  currentTag = '';
  buildQuizFilters();
  buildQuizModeTabs();
  initQuiz();
});
