let DICTIONARY = [];
let EXPANDED_DICTIONARY = [];
let NEW_COUNT = 20;
let showNewOnly = false;

const STR = {
    ru: {
        searchPlaceholder: "Поиск слова или перевода…",
        resultCount: n => `${n} слов`,
        statsText: (t, n) => `Выучено слов: <b>${t}</b><span class="stat-sep">·</span>Новых: <b>${n}</b>`,
        noResults: "Ничего не найдено",
        noResultsNew: "Среди новых слов ничего не найдено",
        newFilter: "Новые",
        newBadge: "новое",
        themeToggle: "Переключить тему"
    },
    en: {
        searchPlaceholder: "Search a word or translation…",
        resultCount: n => `${n} words`,
        statsText: (t, n) => `Words learned: <b>${t}</b><span class="stat-sep">·</span>New: <b>${n}</b>`,
        noResults: "No matches found",
        noResultsNew: "No matches among the new words",
        newFilter: "New",
        newBadge: "new",
        themeToggle: "Toggle theme"
    },
    ko: {
        searchPlaceholder: "단어나 번역을 검색하세요…",
        resultCount: n => `${n}개 단어`,
        statsText: (t, n) => `외운 단어: <b>${t}</b>개<span class="stat-sep">·</span>새 단어: <b>${n}</b>개`,
        noResults: "검색 결과 없음",
        noResultsNew: "새 단어 중 검색 결과 없음",
        newFilter: "새 단어",
        newBadge: "신규",
        themeToggle: "테마 전환"
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
        card.style.animationDelay = `${Math.min(i, 16) * 14}ms`;
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

function setLang(lang) {
    currentLang = lang;
    document.querySelectorAll(".lang-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.lang === lang);
    });
    document.getElementById("searchInput").placeholder = t().searchPlaceholder;
    document.getElementById("newFilterLabel").textContent = t().newFilter;
    document.getElementById("themeToggle").setAttribute("aria-label", t().themeToggle);
    renderHeader();
    renderGrid();
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
