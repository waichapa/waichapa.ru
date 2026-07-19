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
        themeToggle: "Switch Theme",
        navBlog: "Blog",
        navProjects: "Projects",
        brandSub: "Minji · Discord bot",
        heroEyebrow: "Discord AI Tutor",
        heroSubtitle: "Your personal AI Korean tutor, right inside Discord",
        heroLede: "Minji turns your server into a Korean-language hub — AI-generated lessons, a vocabulary that quizzes itself, TOPIK-style exams and an in-character chat partner, all wrapped in a light RPG progress system.",
        ctaLabel: "Add Minji to Discord",
        viewSourceLabel: "View source",
        ctaSub: "Free to add · No configuration needed",
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
        footerViewSourceLabel: "View source"
    },
    ru: {
        themeToggle: "Переключить тему",
        navBlog: "Блог",
        navProjects: "Проекты",
        brandSub: "Minji · Discord-бот",
        heroEyebrow: "AI-репетитор в Discord",
        heroSubtitle: "Твой личный AI-репетитор корейского прямо в Discord",
        heroLede: "Minji превращает твой сервер в хаб по изучению корейского — AI-генерируемые уроки, словарь, который сам себя проверяет, экзамены в стиле TOPIK и собеседник для живого чата — всё это в лёгкой RPG-системе прогресса.",
        ctaLabel: "Добавить Minji в Discord",
        viewSourceLabel: "Исходный код",
        ctaSub: "Бесплатно добавляется · Настройка не требуется",
        featuresTitle: "Что умеет Minji",
        featuresSub: "Шесть способов удержать участников за учёбой",
        f1Title: "Персональные AI-уроки",
        f1Desc: "Minji составляет короткие уроки и упражнения под твой текущий уровень — каждый раз заново.",
        f2Title: "Умный личный словарь",
        f2Desc: "Сохраняй любое слово или фразу, а Minji превращает твой список в квизы, составленные специально для тебя.",
        f3Title: "Экзамены в стиле TOPIK",
        f3Desc: "Готовишься к официальному экзамену или просто хочешь узнать свой уровень? Пройди настоящий экзамен прямо в чате.",
        f4Title: "Живое общение",
        f4Desc: "Общайся с Minji как с носителем языка. Она удерживает контекст, исправляет ошибки и помогает говорить без страха ошибиться.",
        f5Title: "RPG-прогресс",
        f5Desc: "Каждое выполненное задание даёт опыт и поднимает уровень. Следи за всем в профиле — только не забывай про энергию, она восстанавливается со временем.",
        f6Title: "Гид по к-культуре",
        f6Desc: "В любой момент спроси про треки K-pop, корейскую еду или дораму на вечер — Minji учит не только языку, но и культуре вокруг него.",
        whyTitle: "Почему админы добавляют Minji",
        w1Title: "Нулевая настройка",
        w1Desc: "Пригласи её — и она готова к работе: без конфигурации, без базы данных, без лишних прав.",
        w2Title: "Только слэш-команды",
        w2Desc: "Minji работает полностью на современных слэш-командах, так что она никогда не спамит в каналы и не требует прав администратора.",
        w3Title: "Создана для вовлечения",
        w3Desc: "Квизы, уровни и разговоры о дорамах дают участникам стабильный повод возвращаться в текстовые каналы.",
        footerTitle: "Принеси корейский на свой сервер",
        footerCtaLabel: "Добавить Minji в Discord",
        footerViewSourceLabel: "Исходный код"
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
    document.getElementById("themeToggle").setAttribute("aria-label", dict.themeToggle);
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
