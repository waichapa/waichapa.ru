const THEMES = ["dark-green", "dark-indigo", "dark-plum", "dark-ocean", "pastel-lavender", "pastel-peach", "pastel-mint", "pastel-rose", "sakura", "hacker"];

const THEME_NAMES = {
    en: {
        "dark-green": "Dark Green",
        "dark-indigo": "Dark Indigo",
        "dark-plum": "Dark Plum",
        "dark-ocean": "Dark Ocean",
        "pastel-lavender": "Lavender",
        "pastel-peach": "Peach",
        "pastel-mint": "Mint",
        "pastel-rose": "Rose",
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
        "pastel-rose": "Розовая",
        "sakura": "Сакура",
        "hacker": "Хакер"
    }
};

function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark-green";
}

const STR = {
    en: {
        navBlog: "Blog",
        navMinji: "Minji",
        brandSub: "Minji · Discord bot",
        heroEyebrow: "Discord AI Tutor",
        heroSubtitle: "Your personal AI Korean tutor, right inside Discord",
        heroLede: "Minji turns your server into a Korean-language hub — AI-generated lessons, a vocabulary that quizzes itself, TOPIK-style exams and an in-character chat partner, all wrapped in a light RPG progress system.",
        ctaLabel: "Add Minji to Discord",
        ctaSub: "Free to add · No configuration needed",
        viewSourceLabel: "View source",
        footerViewSourceLabel: "View source",
        featuresTitle: "What Minji does",
        featuresSub: "Six ways she keeps members learning",
        f1Title: "Personalized AI lessons",
        f1Desc: "Minji builds short lessons and practice drills that match your current level, generated fresh every time.",
        f2Title: "Smart personal vocabulary",
        f2Desc: "Save any word or phrase, and Minji turns your saved list into quizzes built just for you.",
        f3Title: "TOPIK-style exams",
        f3Desc: "Preparing for the official test, or just want to check where you stand? Sit a real exam right in chat.",
        f4Title: "Live conversation",
        f4Desc: "Chat with Minji like a native speaker. She keeps track of context, corrects mistakes, and helps you speak up without the fear of getting it wrong.",
        f5Title: "RPG-style progress",
        f5Desc: "Every finished task earns XP and pushes you up a level. Track it all on your profile — just mind your energy, which refills over time.",
        f6Title: "K-culture guide",
        f6Desc: "Ask any time for K-pop track picks, Korean food to try, or a drama to start next — Minji teaches the language and the culture around it.",
        whyTitle: "Why admins add Minji",
        w1Title: "Zero setup",
        w1Desc: "Invite her and she's ready to go — no configuration, no database, no extra permissions to grant.",
        w2Title: "Slash commands only",
        w2Desc: "Minji runs entirely on modern slash commands, so she never spams your channels or needs admin rights.",
        w3Title: "Built for engagement",
        w3Desc: "Quizzes, levels and drama talk give members a steady reason to come back to your text channels.",
        footerTitle: "Bring Korean into your server",
        footerCtaLabel: "Add Minji to Discord",
        themeToggle: "Switch Theme"
    },
    ru: {
        navBlog: "Блог",
        navMinji: "Minji",
        brandSub: "Minji · Discord-бот",
        heroEyebrow: "AI-репетитор в Discord",
        heroSubtitle: "Твой персональный AI-репетитор корейского прямо в Discord",
        heroLede: "Minji превращает твой сервер в корейский культурный хаб — AI-уроки под твой уровень, личный словарь, который сам генерирует квизы, экзамены в формате TOPIK и живое общение с ботом, всё в обёртке лёгкой RPG-прокачки.",
        ctaLabel: "Добавить Minji в Discord",
        ctaSub: "Бесплатно · Без настройки",
        viewSourceLabel: "Исходный код",
        footerViewSourceLabel: "Исходный код",
        featuresTitle: "Что умеет Minji",
        featuresSub: "Шесть способов удерживать интерес к учёбе",
        f1Title: "Персонализированные AI-уроки",
        f1Desc: "Minji составляет короткие уроки и практические задания под твой текущий уровень — каждый раз заново.",
        f2Title: "Умный личный словарь",
        f2Desc: "Сохраняй новые слова и фразы, а Minji превратит их в квизы специально для тебя.",
        f3Title: "Экзамены в формате TOPIK",
        f3Desc: "Готовишься к официальному тесту или хочешь проверить силы? Пройди настоящий экзамен прямо в чате.",
        f4Title: "Живой чат с репетитором",
        f4Desc: "Общайся с Minji как с носителем языка: она удерживает контекст диалога, исправляет ошибки и помогает заговорить без страха.",
        f5Title: "Игровая система прогресса",
        f5Desc: "За каждое задание — опыт и новый уровень. Следи за профилем, но не забывай про энергию — она восстанавливается со временем.",
        f6Title: "Гид по K-Culture",
        f6Desc: "В любой момент попроси подборку K-Pop треков, корейских блюд или дораму на вечер — Minji учит не только языку, но и культуре.",
        whyTitle: "Почему админы выбирают Minji",
        w1Title: "Нулевая настройка",
        w1Desc: "Пригласи бота — и он готов к работе: без конфигурации, без баз данных и лишних прав.",
        w2Title: "Только слэш-команды",
        w2Desc: "Minji работает через слэш-команды, не спамит в чаты и не требует административных прав.",
        w3Title: "Работает на вовлечённость",
        w3Desc: "Квизы, уровни и обсуждение дорам дают участникам сервера повод возвращаться в текстовые каналы.",
        footerTitle: "Преврати свой сервер в корейский хаб",
        footerCtaLabel: "Добавить Minji в Discord",
        themeToggle: "Переключить тему"
    }
};

function applyLang(lang) {
    const dict = STR[lang] || STR.en;
    document.querySelectorAll(".lang-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.lang === lang);
    });
    Object.keys(dict).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = dict[id];
    });
    const toggle = document.getElementById("themeToggle");
    if (toggle) toggle.setAttribute("aria-label", dict.themeToggle);
    const themeLabel = document.getElementById("themeLabel");
    if (themeLabel) themeLabel.textContent = (THEME_NAMES[lang] || THEME_NAMES.en)[currentTheme()];
}

function setLang(lang) {
    try { localStorage.setItem("waichapa-lang", lang); } catch (e) {}
    applyLang(lang);
}

let savedLang = "en";
try { savedLang = localStorage.getItem("waichapa-lang") || "en"; } catch (e) {}
applyLang(savedLang);
document.querySelectorAll(".lang-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.lang === savedLang);
});

document.getElementById("langSwitch").addEventListener("click", e => {
    const btn = e.target.closest(".lang-btn");
    if (btn) setLang(btn.dataset.lang);
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
    const themeLabel = document.getElementById("themeLabel");
    let lang = "en";
    try { lang = localStorage.getItem("waichapa-lang") || "en"; } catch (e2) {}
    if (themeLabel) themeLabel.textContent = (THEME_NAMES[lang] || THEME_NAMES.en)[nextTheme];
});
