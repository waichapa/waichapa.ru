const THEMES = ["dark-green", "dark-indigo", "dark-plum", "dark-ocean", "pastel-lavender", "pastel-peach", "pastel-mint", "sakura", "hacker"];

const THEME_NAMES = {
    en: {
        "dark-green": "Dark Green",
        "dark-indigo": "Dark Indigo",
        "dark-plum": "Dark Plum",
        "dark-ocean": "Dark Ocean",
        "pastel-lavender": "Lavender",
        "pastel-peach": "Peach",
        "pastel-mint": "Mint",
        "sakura": "Sakura",
        "hacker": "Hacker"
    },
    ru: {
        "dark-green": "Тёмно-зелёная",
        "dark-indigo": "Тёмно-синяя",
        "dark-plum": "Тёмно-сливовая",
        "dark-ocean": "Тёмный океан",
        "pastel-lavender": "Лаванда",
        "pastel-peach": "Персиковая",
        "pastel-mint": "Мятная",
        "sakura": "Сакура",
        "hacker": "Хакер"
    }
};

const STR = {
    en: {
        heroEyebrow: "Learn Korean",
        heroTagline: "A dictionary, grammar notes and quizzes for learning Korean — plus an AI tutor you can bring into your own Discord server.",
        cardBlogEyebrow: "Language Blog",
        cardBlogTitle: "Dictionary & Grammar",
        cardBlogDesc: "Browse the word list, search grammar rules, take a quiz and track your stats.",
        cardBlogCta: "Open the blog →",
        cardProjectsEyebrow: "More from waichapa",
        cardProjectsTitle: "Projects",
        cardProjectsDesc: "Minji, an AI Korean tutor for Discord, and Capri, a cursor theme installer for Linux.",
        cardProjectsCta: "See the projects →"
    },
    ru: {
        heroEyebrow: "Учи корейский",
        heroTagline: "Словарь, грамматика и квизы для изучения корейского — а ещё AI-репетитор, которого можно добавить на свой Discord-сервер.",
        cardBlogEyebrow: "Языковой блог",
        cardBlogTitle: "Словарь и грамматика",
        cardBlogDesc: "Смотри список слов, ищи грамматические правила, проходи квиз и следи за статистикой.",
        cardBlogCta: "Открыть блог →",
        cardProjectsEyebrow: "Ещё проекты waichapa",
        cardProjectsTitle: "Проекты",
        cardProjectsDesc: "Minji — AI-репетитор корейского для Discord, и Capri — установщик тем курсора для Linux.",
        cardProjectsCta: "Смотреть проекты →"
    }
};

function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark-green";
}

function updateThemeLabel(lang) {
    const label = document.getElementById("themeLabel");
    if (label) label.textContent = (THEME_NAMES[lang] || THEME_NAMES.en)[currentTheme()];
}

function applyLang(lang) {
    const dict = STR[lang] || STR.en;
    document.querySelectorAll(".lang-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.lang === lang);
    });
    Object.keys(dict).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = dict[id];
    });
    updateThemeLabel(lang);
}

function setLang(lang) {
    try { localStorage.setItem("waichapa-lang", lang); } catch (e) {}
    applyLang(lang);
}

let currentLang = "en";
try { currentLang = localStorage.getItem("waichapa-lang") || "en"; } catch (e) {}
applyLang(currentLang);

document.getElementById("langSwitch").addEventListener("click", e => {
    const btn = e.target.closest(".lang-btn");
    if (btn) {
        currentLang = btn.dataset.lang;
        setLang(currentLang);
    }
});

document.getElementById("themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    let currentIdx = THEMES.indexOf(currentTheme());
    let nextIdx = (currentIdx + 1) % THEMES.length;
    const nextTheme = THEMES[nextIdx];

    root.setAttribute("data-theme", nextTheme);
    try { localStorage.setItem("waichapa-theme", nextTheme); } catch (e) {}
    updateThemeLabel(currentLang);
});
