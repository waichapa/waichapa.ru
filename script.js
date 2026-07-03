let DICTIONARY = [];
let EXPANDED_DICTIONARY = [];
let GRAMMAR = [];
let showNewOnly = false;
let currentTab = "dict";

let quizPool = [];
let quizCurrent = null;
let quizCorrectCount = 0;
let quizWrongCount = 0;
let quizAnswered = false;

const THEMES = ["dark-green", "dark-indigo", "pastel-lavender", "pastel-peach"];

const STR = {
    en: {
        searchPlaceholder: "Search a word or translation…",
        grammarPlaceholder: "Search grammar rules…",
        resultCount: n => `${n} words`,
        grammarResultCount: n => `${n} rules`,
        statsText: (t) => `Words learned: <b>${t}</b> <span class="level-badge">2 급</span>`,
        noResults: "No matches found",
        noResultsNew: "No matches among the new words",
        newFilter: "New",
        newBadge: "new",
        themeToggle: "Switch Theme",
        tabDict: "Dictionary",
        tabGrammar: "Grammar",
        tabQuiz: "Quiz",
        tabStats: "Stats",
        quizPromptKr: "What does this word mean?",
        quizPromptEn: "How do you say this in Korean?",
        quizScore: (c, w) => `Correct: <b>${c}</b> <span class="stat-sep">·</span> Wrong: <b class="score-wrong">${w}</b>`,
        quizCorrect: "Correct!",
        quizIncorrectPrefix: "Not quite. Correct answer: ",
        quizNext: "Next word",
        statWordsLearned: "Words learned",
        statGrammarLearned: "Grammar rules",
        statHomonyms: "Words with multiple meanings",
        statAvgLength: "Average word length",
        statAvgLengthUnit: "characters",
        statByLetter: "Breakdown by first letter",
        statTypes: "Regular vs. multi-meaning",
        statTypesNormal: "Regular",
        statTypesHomonym: "Multi-meaning",
        statQuizAccuracy: "Quiz accuracy (this session)",
        statQuizNoData: "Play a few quiz rounds to see your accuracy",
        statTotalRounds: "Total Quiz Attempts",
        statLongestWord: "Longest Word Learned",
        statShortestWord: "Shortest Word"
    },
    ru: {
        searchPlaceholder: "Поиск слова или перевода…",
        grammarPlaceholder: "Поиск грамматических правил…",
        resultCount: n => `${n} слов`,
        grammarResultCount: n => `${n} правил`,
        statsText: (t) => `Выучено слов: <b>${t}</b> <span class="level-badge">2 급</span>`,
        noResults: "Ничего не найдено",
        noResultsNew: "Среди новых слов ничего не найдено",
        newFilter: "Новые",
        newBadge: "новое",
        themeToggle: "Переключить тему",
        tabDict: "Словарь",
        tabGrammar: "Грамматика",
        tabQuiz: "Квиз",
        tabStats: "Статистика",
        quizPromptKr: "Что значит это слово?",
        quizPromptEn: "Как это будет по-корейски?",
        quizScore: (c, w) => `Правильно: <b>${c}</b> <span class="stat-sep">·</span> Неправильно: <b class="score-wrong">${w}</b>`,
        quizCorrect: "Верно!",
        quizIncorrectPrefix: "Неверно. Правильный ответ: ",
        quizNext: "Следующее слово",
        statWordsLearned: "Слов выучено",
        statGrammarLearned: "Правил грамматики",
        statHomonyms: "Слов с несколькими значениями",
        statAvgLength: "Средняя длина слова",
        statAvgLengthUnit: "символов",
        statByLetter: "Распределение по первой букве",
        statTypes: "Обычные и многозначные",
        statTypesNormal: "Обычные",
        statTypesHomonym: "Многозначные",
        statQuizAccuracy: "Точность в квизе (эта сессия)",
        statQuizNoData: "Пройди пару раундов квиза, чтобы увидеть точность",
        statTotalRounds: "Всего попыток в квизе",
        statLongestWord: "Самое длинное слово",
        statShortestWord: "Самое короткое слово"
    }
};

let currentLang = "en";

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
    document.getElementById("statsText").innerHTML = t().statsText(EXPANDED_DICTIONARY.length);
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
    filtered.forEach((w) => {
        const card = document.createElement("div");
        card.className = "word-card" + (w.isNew ? " is-new" : "");
        const homonymBadge = w.isHomonym ? '<div class="homonym-badge">↻</div>' : '';
        const newBadge = w.isNew ? `<div class="new-badge">${t().newBadge}</div>` : '';
        card.innerHTML = `
            ${newBadge}
            ${homonymBadge}
            <div class="seal">✓</div>
            <div class="word-kr">${w.Korean}</div>
            <div class="word-tr">${w.English}</div>
        `;
        frag.appendChild(card);
    });
    grid.appendChild(frag);
}

function renderGrammar() {
    const query = (document.getElementById("grammarSearchInput").value || "").trim().toLowerCase();
    const grid = document.getElementById("grammarGrid");
    grid.innerHTML = "";

    let filtered = GRAMMAR;

    if (query) {
        filtered = GRAMMAR.filter(g => {
            const title = currentLang === "ru" ? (g.ru_title || "") : (g.en_title || "");
            const exp = currentLang === "ru" ? (g.ru_explanation || "") : (g.en_explanation || "");
            const ex = currentLang === "ru" ? (g.ru_example || "") : (g.en_example || "");
            
            return title.toLowerCase().includes(query) ||
                   exp.toLowerCase().includes(query) ||
                   ex.toLowerCase().includes(query);
        });
    }

    document.getElementById("grammarResultCount").textContent = t().grammarResultCount(filtered.length);

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state"><span class="big-kr">📚</span>${t().noResults}</div>`;
        return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach(g => {
        const card = document.createElement("div");
        card.className = "word-card grammar-card";
        
        const title = currentLang === "ru" ? (g.ru_title || "—") : (g.en_title || "—");
        const explanation = currentLang === "ru" ? (g.ru_explanation || "") : (g.en_explanation || "");
        const example = currentLang === "ru" ? (g.ru_example || "") : (g.en_example || "");

        card.innerHTML = `
            <div class="word-kr">${title}</div>
            <div class="word-tr" style="color: var(--text); font-weight: 600; margin-bottom: 8px; text-align: left;">${explanation}</div>
            <div style="font-size: 13px; color: var(--accent); font-style: italic; text-align: left;">${example}</div>
        `;
        frag.appendChild(card);
    });
    grid.appendChild(frag);
}

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
    if (tab === "grammar") {
        renderGrammar();
    }
    if (tab === "stats") {
        renderStats();
    }
}

document.getElementById("tabs").addEventListener("click", e => {
    const btn = e.target.closest(".tab-btn");
    if (btn) switchTab(btn.dataset.tab);
});

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

function renderStats() {
    const wrap = document.getElementById("statsGrid");
    wrap.innerHTML = "";

    const total = EXPANDED_DICTIONARY.length;
    const homonymCount = EXPANDED_DICTIONARY.filter(w => w.isHomonym).length;
    const normalCount = total - homonymCount;
    const avgLen = total
        ? (EXPANDED_DICTIONARY.reduce((sum, w) => sum + w.Korean.replace(/\s/g, "").length, 0) / total).toFixed(1)
        : "0";

    let longestWord = "—";
    let shortestWord = "—";
    if (DICTIONARY.length > 0) {
        longestWord = DICTIONARY.reduce((max, w) => w.Korean.length > max.length ? w.Korean : max, DICTIONARY[0].Korean);
        shortestWord = DICTIONARY.reduce((min, w) => w.Korean.length < min.length ? w.Korean : min, DICTIONARY[0].Korean);
    }

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
            <div class="stat-label">${t().statGrammarLearned}</div>
            <div class="stat-value" style="color: var(--bronze)">${GRAMMAR.length}</div>
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

        <div class="stat-card">
            <div class="stat-label">${t().statLongestWord}</div>
            <div class="stat-value small kr" style="font-size: 18px; margin-top:5px;">${longestWord}</div>
            <div class="stat-sub">${longestWord !== "—" ? longestWord.length : 0} ${t().statAvgLengthUnit}</div>
        </div>

        <div class="stat-card">
            <div class="stat-label">${t().statShortestWord}</div>
            <div class="stat-value small kr" style="font-size: 18px; margin-top:5px;">${shortestWord}</div>
            <div class="stat-sub">${shortestWord !== "—" ? shortestWord.length : 0} ${t().statAvgLengthUnit}</div>
        </div>

        <div class="stat-card">
            <div class="stat-label">${t().statTotalRounds}</div>
            <div class="stat-value small" style="color: var(--text)">${quizTotal}</div>
            <div class="stat-sub">🟢 ${quizCorrectCount} · 🔴 ${quizWrongCount}</div>
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
    try { localStorage.setItem("waichapa-lang", lang); } catch (e) {}
    document.querySelectorAll(".lang-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.lang === lang);
    });
    document.getElementById("searchInput").placeholder = t().searchPlaceholder;
    document.getElementById("grammarSearchInput").placeholder = t().grammarPlaceholder;
    document.getElementById("newFilterLabel").textContent = t().newFilter;
    document.getElementById("themeToggle").setAttribute("aria-label", t().themeToggle);
    document.getElementById("tabDictLabel").textContent = t().tabDict;
    document.getElementById("tabGrammarLabel").textContent = t().tabGrammar;
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
    if (currentTab === "grammar") {
        renderGrammar();
    }
}

document.getElementById("langSwitch").addEventListener("click", e => {
    const btn = e.target.closest(".lang-btn");
    if (btn) setLang(btn.dataset.lang);
});

document.getElementById("searchInput").addEventListener("input", renderGrid);
document.getElementById("grammarSearchInput").addEventListener("input", renderGrammar);

document.getElementById("newFilter").addEventListener("click", () => {
    showNewOnly = !showNewOnly;
    document.getElementById("newFilter").classList.toggle("active", showNewOnly);
    renderGrid();
});

document.getElementById("themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute("data-theme") || "dark-green";
    
    let currentIdx = THEMES.indexOf(currentTheme);
    let nextIdx = (currentIdx + 1) % THEMES.length;
    const nextTheme = THEMES[nextIdx];
    
    root.setAttribute("data-theme", nextTheme);
    try {
        localStorage.setItem("waichapa-theme", nextTheme);
    } catch (e) {}
});

async function init() {
    try {
        const res = await fetch("dictionary.json");
        if (!res.ok) throw new Error("HTTP " + res.status);
        DICTIONARY = await res.json();

        const newCutoff = Math.max(0, DICTIONARY.length - 20);
        DICTIONARY.forEach((w, i) => {
            w.id = i;
            w.isNew = i >= newCutoff;
        });

        EXPANDED_DICTIONARY = expandDictionary(DICTIONARY);

        try {
            const resGrammar = await fetch("grammar.json");
            if (resGrammar.ok) {
                GRAMMAR = await resGrammar.json();
            }
        } catch (gErr) {
            console.error("Failed to load grammar.json", gErr);
        }

        let savedLang = "en";
        try { savedLang = localStorage.getItem("waichapa-lang") || "en"; } catch (e) {}
        setLang(savedLang);
    } catch (err) {
        document.getElementById("dictGrid").innerHTML = `
            <div class="empty-state">
                <span class="big-kr">⚠️</span>
                Failed to load data. Ensure you use VS Code Live Server or GitHub Pages.
            </div>
        `;
        document.getElementById("statsText").textContent = "—";
        document.getElementById("resultCount").textContent = "0";
    }
}

init();