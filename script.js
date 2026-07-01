let DICTIONARY = [];
let EXPANDED_DICTIONARY = [];
let NEW_COUNT = 20;
let showNewOnly = false;
let currentTab = "dict";

let quizPool = [];
let quizCurrent = null;
let quizCorrectCount = 0;
let quizWrongCount = 0;
let quizAnswered = false;

const STR = {
    ru: {
        searchPlaceholder: "Поиск слова или перевода…",
        resultCount: n => `${n} слов`,
        statsText: (t, n) => `Выучено слов: <b>${t}</b><span class="stat-sep">·</span>Новых: <b>${n}</b>`,
        noResults: "Ничего не найдено",
        noResultsNew: "Среди новых слов ничего не найдено",
        newFilter: "Новые",
        newBadge: "новое",
        themeToggle: "Переключить тему",
        tabDict: "Словарь",
        tabQuiz: "Квиз",
        tabStats: "Статистика",
        quizPromptKr: "Что значит это слово?",
        quizPromptEn: "Как это будет по-корейски?",
        quizScore: (c, w) => `Правильно: <b>${c}</b> <span class="stat-sep">·</span> Неправильно: <b class="score-wrong">${w}</b>`,
        quizCorrect: "Верно!",
        quizIncorrectPrefix: "Неверно. Правильный ответ: ",
        quizNext: "Следующее слово",
        statWordsLearned: "Слов выучено",
        statHomonyms: "Слов с несколькими значениями",
        statAvgLength: "Средняя длина слова",
        statAvgLengthUnit: "слогов/символов",
        statByLetter: "Распределение по первой букве",
        statTypes: "Обычные и многозначные",
        statTypesNormal: "Обычные",
        statTypesHomonym: "Многозначные",
        statQuizAccuracy: "Точность в квизе (эта сессия)",
        statQuizNoData: "Пройди пару раундов квиза, чтобы увидеть точность"
    },
    en: {
        searchPlaceholder: "Search a word or translation…",
        resultCount: n => `${n} words`,
        statsText: (t, n) => `Words learned: <b>${t}</b><span class="stat-sep">·</span>New: <b>${n}</b>`,
        noResults: "No matches found",
        noResultsNew: "No matches among the new words",
        newFilter: "New",
        newBadge: "new",
        themeToggle: "Toggle theme",
        tabDict: "Dictionary",
        tabQuiz: "Quiz",
        tabStats: "Stats",
        quizPromptKr: "What does this word mean?",
        quizPromptEn: "How do you say this in Korean?",
        quizScore: (c, w) => `Correct: <b>${c}</b> <span class="stat-sep">·</span> Wrong: <b class="score-wrong">${w}</b>`,
        quizCorrect: "Correct!",
        quizIncorrectPrefix: "Not quite. Correct answer: ",
        quizNext: "Next word",
        statWordsLearned: "Words learned",
        statHomonyms: "Words with multiple meanings",
        statAvgLength: "Average word length",
        statAvgLengthUnit: "characters",
        statByLetter: "Breakdown by first letter",
        statTypes: "Regular vs. multi-meaning",
        statTypesNormal: "Regular",
        statTypesHomonym: "Multi-meaning",
        statQuizAccuracy: "Quiz accuracy (this session)",
        statQuizNoData: "Play a few quiz rounds to see your accuracy"
    },
    ko: {
        searchPlaceholder: "단어나 번역을 검색하세요…",
        resultCount: n => `${n}개 단어`,
        statsText: (t, n) => `외운 단어: <b>${t}</b>개<span class="stat-sep">·</span>새 단어: <b>${n}</b>개`,
        noResults: "검색 결과 없음",
        noResultsNew: "새 단어 중 검색 결과 없음",
        newFilter: "새 단어",
        newBadge: "신규",
        themeToggle: "테마 전환",
        tabDict: "단어장",
        tabQuiz: "퀴즈",
        tabStats: "통계",
        quizPromptKr: "이 단어의 뜻은?",
        quizPromptEn: "한국어로 어떻게 말해요?",
        quizScore: (c, w) => `정답: <b>${c}</b> <span class="stat-sep">·</span> 오답: <b class="score-wrong">${w}</b>`,
        quizCorrect: "정답이에요!",
        quizIncorrectPrefix: "틀렸어요. 정답: ",
        quizNext: "다음 단어",
        statWordsLearned: "외운 단어",
        statHomonyms: "여러 뜻을 가진 단어",
        statAvgLength: "평균 단어 길이",
        statAvgLengthUnit: "자",
        statByLetter: "첫 글자별 분포",
        statTypes: "일반 단어 vs 다의어",
        statTypesNormal: "일반",
        statTypesHomonym: "다의어",
        statQuizAccuracy: "퀴즈 정확도 (이번 세션)",
        statQuizNoData: "퀴즈를 몇 번 풀면 정확도가 표시돼요"
    }
};

let currentLang = "ru";

function t() {
    return STR[currentLang];
}

function expandDictionary(dict) {
    const expanded = [];

    dict.forEach(item => {
        const korean = item.Korean;
        const english = item.English;

        if (english.includes(' / ')) {
            const meanings = english.split(' / ').map(s => s.trim());
            meanings.forEach(meaning => {
                expanded.push({
                    Korean: korean,
                    English: meaning,
                    isHomonym: true,
                    id: item.id,
                    isNew: item.isNew
                });
            });
        } else {
            expanded.push({
                Korean: korean,
                English: english,
                isHomonym: false,
                id: item.id,
                isNew: item.isNew
            });
        }
    });

    return expanded;
}

function renderHeader() {
    const newTotal = DICTIONARY.filter(w => w.isNew).length;
    document.getElementById("statsText").innerHTML = t().statsText(EXPANDED_DICTIONARY.length, newTotal);
}

function renderGrid() {
    const query = (document.getElementById("searchInput").value || "").trim().toLowerCase();
    const grid = document.getElementById("dictGrid");
    grid.innerHTML = "";

    let filtered = EXPANDED_DICTIONARY;

    if (showNewOnly) {
        filtered = filtered.filter(w => w.isNew);
    }

    if (query) {
        filtered = filtered.filter(w => {
            return w.Korean.toLowerCase().includes(query) ||
                   w.English.toLowerCase().includes(query);
        });
    }

    document.getElementById("resultCount").textContent = t().resultCount(filtered.length);

    if (filtered.length === 0) {
        const message = showNewOnly ? t().noResultsNew : t().noResults;
        grid.innerHTML = `<div class="empty-state"><span class="big-kr">🔍</span>${message}</div>`;
        return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach((w, i) => {
        const card = document.createElement("div");
        card.className = "word-card" + (w.isNew ? " is-new" : "");
        const homonymBadge = w.isHomonym ? '<div class="homonym-badge">↻</div>' : '';
        const newBadge = w.isNew ? `<div class="new-badge">${t().newBadge}</div>` : '';
        card.innerHTML = `
            ${newBadge}
            ${homonymBadge}
            <div class="seal">${currentLang === "ko" ? "印" : "✓"}</div>
            <div class="word-kr">${w.Korean}</div>
            <div class="word-tr">${w.English}</div>
        `;
        frag.appendChild(card);
    });
    grid.appendChild(frag);
}

/* ---------- Tabs ---------- */

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === tab);
    });
    document.querySelectorAll(".tab-panel").forEach(p => {
        p.classList.toggle("active", p.id === `panel-${tab}`);
    });
    if (tab === "quiz" && !quizCurrent) {
        nextQuizQuestion();
    }
    if (tab === "stats") {
        renderStats();
    }
}

document.getElementById("tabs").addEventListener("click", e => {
    const btn = e.target.closest(".tab-btn");
    if (btn) switchTab(btn.dataset.tab);
});

/* ---------- Quiz ---------- */

function pickRandom(arr, count, exclude) {
    const pool = arr.filter(w => w !== exclude);
    const picked = [];
    while (picked.length < count && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
}

function nextQuizQuestion() {
    if (!EXPANDED_DICTIONARY.length) return;

    quizAnswered = false;
    document.getElementById("quizFeedback").textContent = "";
    document.getElementById("quizFeedback").className = "quiz-feedback";
    document.getElementById("quizNext").classList.remove("visible");

    const direction = Math.random() < 0.5 ? "kr-to-en" : "en-to-kr";
    const answer = EXPANDED_DICTIONARY[Math.floor(Math.random() * EXPANDED_DICTIONARY.length)];
    const distractors = pickRandom(EXPANDED_DICTIONARY, 3, answer);
    const options = [answer, ...distractors].sort(() => Math.random() - 0.5);

    quizCurrent = { direction, answer, options };

    const promptLabel = document.getElementById("quizPromptLabel");
    const prompt = document.getElementById("quizPrompt");
    promptLabel.textContent = direction === "kr-to-en" ? t().quizPromptKr : t().quizPromptEn;
    prompt.textContent = direction === "kr-to-en" ? answer.Korean : answer.English;
    prompt.classList.toggle("is-latin", direction === "en-to-kr");

    const optionsWrap = document.getElementById("quizOptions");
    optionsWrap.innerHTML = "";
    options.forEach(opt => {
        const btn = document.createElement("button");
        const showKorean = direction === "en-to-kr";
        btn.className = "quiz-option" + (showKorean ? " kr-option" : "");
        btn.textContent = showKorean ? opt.Korean : opt.English;
        btn.addEventListener("click", () => answerQuiz(opt, btn));
        optionsWrap.appendChild(btn);
    });
}

function answerQuiz(chosen, btnEl) {
    if (quizAnswered) return;
    quizAnswered = true;

    const isCorrect = chosen === quizCurrent.answer;
    const feedback = document.getElementById("quizFeedback");
    const showKorean = quizCurrent.direction === "en-to-kr";

    document.querySelectorAll(".quiz-option").forEach(b => {
        b.disabled = true;
        const label = showKorean ? quizCurrent.answer.Korean : quizCurrent.answer.English;
        if (b.textContent === label) b.classList.add("correct");
    });

    if (isCorrect) {
        quizCorrectCount++;
        feedback.textContent = t().quizCorrect;
        feedback.classList.add("correct");
    } else {
        quizWrongCount++;
        btnEl.classList.add("incorrect");
        const answerText = showKorean ? quizCurrent.answer.Korean : quizCurrent.answer.English;
        feedback.textContent = t().quizIncorrectPrefix + answerText;
        feedback.classList.add("incorrect");
    }

    renderQuizScore();
    document.getElementById("quizNext").classList.add("visible");
}

function renderQuizScore() {
    document.getElementById("quizScore").innerHTML = t().quizScore(quizCorrectCount, quizWrongCount);
}

document.getElementById("quizNext").addEventListener("click", nextQuizQuestion);

/* ---------- Stats ---------- */

function renderStats() {
    const wrap = document.getElementById("statsGrid");
    wrap.innerHTML = "";

    const total = EXPANDED_DICTIONARY.length;
    const homonymCount = EXPANDED_DICTIONARY.filter(w => w.isHomonym).length;
    const normalCount = total - homonymCount;
    const avgLen = total
        ? (EXPANDED_DICTIONARY.reduce((sum, w) => sum + w.Korean.replace(/\s/g, "").length, 0) / total).toFixed(1)
        : "0";

    const letterCounts = {};
    EXPANDED_DICTIONARY.forEach(w => {
        const letter = w.Korean.trim().charAt(0) || "?";
        letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    });
    const topLetters = Object.entries(letterCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    const maxLetterCount = topLetters.length ? topLetters[0][1] : 1;

    const donutPct = total ? Math.round((normalCount / total) * 100) : 0;

    const quizTotal = quizCorrectCount + quizWrongCount;
    const accuracyPct = quizTotal ? Math.round((quizCorrectCount / quizTotal) * 100) : null;

    wrap.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">${t().statWordsLearned}</div>
            <div class="stat-value">${total}</div>
        </div>

        <div class="stat-card">
            <div class="stat-label">${t().statHomonyms}</div>
            <div class="stat-value">${homonymCount}</div>
        </div>

        <div class="stat-card">
            <div class="stat-label">${t().statAvgLength}</div>
            <div class="stat-value small">${avgLen}</div>
            <div class="stat-sub">${t().statAvgLengthUnit}</div>
        </div>

        <div class="stat-card stat-card-wide">
            <div class="stat-label">${t().statTypes}</div>
            <div class="donut-wrap">
                ${renderDonut(donutPct)}
                <div class="donut-legend">
                    <div class="donut-legend-item"><span class="donut-dot" style="background:var(--accent)"></span>${t().statTypesNormal} — ${normalCount}</div>
                    <div class="donut-legend-item"><span class="donut-dot" style="background:var(--seal)"></span>${t().statTypesHomonym} — ${homonymCount}</div>
                </div>
            </div>
        </div>

        <div class="stat-card stat-card-wide">
            <div class="stat-label">${t().statByLetter}</div>
            <div class="bar-list">
                ${topLetters.map(([letter, count]) => `
                    <div class="bar-row">
                        <div class="bar-row-label">${letter}</div>
                        <div class="bar-track"><div class="bar-fill" style="width:${(count / maxLetterCount) * 100}%"></div></div>
                        <div class="bar-row-count">${count}</div>
                    </div>
                `).join("")}
            </div>
        </div>

        <div class="stat-card stat-card-wide">
            <div class="stat-label">${t().statQuizAccuracy}</div>
            ${accuracyPct === null
                ? `<div class="stat-sub">${t().statQuizNoData}</div>`
                : `<div class="stat-value">${accuracyPct}%</div><div class="stat-sub">${quizCorrectCount} / ${quizTotal}</div>`
            }
        </div>
    `;
}

function renderDonut(pct) {
    const r = 42;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - pct / 100);
    return `
        <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="${r}" fill="none" stroke="var(--seal)" stroke-width="14" opacity="0.35"/>
            <circle cx="55" cy="55" r="${r}" fill="none" stroke="var(--accent)" stroke-width="14"
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                stroke-linecap="round" transform="rotate(-90 55 55)"/>
            <text x="55" y="61" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="20" fill="var(--text)">${pct}%</text>
        </svg>
    `;
}


function setLang(lang) {
    currentLang = lang;
    document.querySelectorAll(".lang-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.lang === lang);
    });
    document.getElementById("searchInput").placeholder = t().searchPlaceholder;
    document.getElementById("newFilterLabel").textContent = t().newFilter;
    document.getElementById("themeToggle").setAttribute("aria-label", t().themeToggle);
    document.getElementById("tabDictLabel").textContent = t().tabDict;
    document.getElementById("tabQuizLabel").textContent = t().tabQuiz;
    document.getElementById("tabStatsLabel").textContent = t().tabStats;
    document.getElementById("quizNext").textContent = t().quizNext;
    renderHeader();
    renderGrid();
    renderQuizScore();
    if (quizCurrent) {
        const promptLabel = document.getElementById("quizPromptLabel");
        promptLabel.textContent = quizCurrent.direction === "kr-to-en" ? t().quizPromptKr : t().quizPromptEn;
    }
    if (currentTab === "stats") {
        renderStats();
    }
}

document.getElementById("langSwitch").addEventListener("click", e => {
    const btn = e.target.closest(".lang-btn");
    if (btn) setLang(btn.dataset.lang);
});

document.getElementById("searchInput").addEventListener("input", renderGrid);

document.getElementById("newFilter").addEventListener("click", () => {
    showNewOnly = !showNewOnly;
    document.getElementById("newFilter").classList.toggle("active", showNewOnly);
    renderGrid();
});

document.getElementById("themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try {
        localStorage.setItem("waichapa-theme", next);
    } catch (e) {}
});

async function init() {
    try {
        const res = await fetch("dictionary.json");
        if (!res.ok) throw new Error("HTTP " + res.status);
        DICTIONARY = await res.json();

        const newCutoff = Math.max(0, DICTIONARY.length - NEW_COUNT);
        DICTIONARY.forEach((w, i) => {
            w.id = i;
            w.isNew = i >= newCutoff;
        });

        EXPANDED_DICTIONARY = expandDictionary(DICTIONARY);

        setLang("ru");
    } catch (err) {
        document.getElementById("dictGrid").innerHTML = `
            <div class="empty-state">
                <span class="big-kr">⚠️</span>
                Не удалось загрузить dictionary.json.<br>
                Открой страницу через локальный сервер (VS Code Live Server) или GitHub Pages.
            </div>
        `;
        document.getElementById("statsText").textContent = "—";
        document.getElementById("resultCount").textContent = "0";
    }
}

init();
