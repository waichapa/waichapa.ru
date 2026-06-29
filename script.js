let DICTIONARY = [];
let EXPANDED_DICTIONARY = [];

const STR = {
    ru: {
        searchPlaceholder: "Поиск слова или перевода…",
        resultCount: n => `${n} слов`,
        statsText: (t, u) => `Всего значений: <b>${t}</b> · Уникальных слов: <b>${u}</b>`,
        noResults: "Ничего не найдено"
    },
    en: {
        searchPlaceholder: "Search a word or translation…",
        resultCount: n => `${n} words`,
        statsText: (t, u) => `Total meanings: <b>${t}</b> · Unique words: <b>${u}</b>`,
        noResults: "No matches found"
    },
    ko: {
        searchPlaceholder: "단어나 번역을 검색하세요…",
        resultCount: n => `${n}개 단어`,
        statsText: (t, u) => `전체 의미: <b>${t}</b>개 · 고유 단어: <b>${u}</b>개`,
        noResults: "검색 결과 없음"
    }
};

let currentLang = "ru";

function t() {
    return STR[currentLang];
}

function expandDictionary(dict) {
    const expanded = [];
    const uniqueWords = new Set();
    
    dict.forEach(item => {
        const korean = item.Korean;
        const english = item.English;
        uniqueWords.add(korean);
        
        if (english.includes(' / ')) {
            const meanings = english.split(' / ').map(s => s.trim());
            meanings.forEach(meaning => {
                expanded.push({
                    Korean: korean,
                    English: meaning,
                    isHomonym: true
                });
            });
        } else {
            expanded.push({
                Korean: korean,
                English: english,
                isHomonym: false
            });
        }
    });
    
    return { expanded, uniqueCount: uniqueWords.size };
}

function renderHeader() {
    const totalMeanings = EXPANDED_DICTIONARY.length;
    const uniqueWords = DICTIONARY.length;
    document.getElementById("statsText").innerHTML = t().statsText(totalMeanings, uniqueWords);
}

function renderGrid() {
    const query = (document.getElementById("searchInput").value || "").trim().toLowerCase();
    const grid = document.getElementById("dictGrid");
    grid.innerHTML = "";
    
    let filtered;
    if (!query) {
        filtered = EXPANDED_DICTIONARY;
    } else {
        filtered = EXPANDED_DICTIONARY.filter(w => {
            return w.Korean.toLowerCase().includes(query) || 
                   w.English.toLowerCase().includes(query);
        });
    }
    
    document.getElementById("resultCount").textContent = t().resultCount(filtered.length);
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state"><span class="big-kr">🔍</span>${t().noResults}</div>`;
        return;
    }
    
    const frag = document.createDocumentFragment();
    filtered.forEach(w => {
        const card = document.createElement("div");
        card.className = "word-card";
        const homonymBadge = w.isHomonym ? '<div class="homonym-badge">↻</div>' : '';
        card.innerHTML = `
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
    renderHeader();
    renderGrid();
}

document.getElementById("langSwitch").addEventListener("click", e => {
    const btn = e.target.closest(".lang-btn");
    if (btn) setLang(btn.dataset.lang);
});

document.getElementById("searchInput").addEventListener("input", renderGrid);

async function init() {
    try {
        const res = await fetch("dictionary.json");
        if (!res.ok) throw new Error("HTTP " + res.status);
        DICTIONARY = await res.json();
        DICTIONARY.forEach((w, i) => w.id = i);
        
        const result = expandDictionary(DICTIONARY);
        EXPANDED_DICTIONARY = result.expanded;
        
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