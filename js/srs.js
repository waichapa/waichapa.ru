/* srs.js — интервальные повторения (упрощённый SM-2).
 *
 * Слова у всех общие (лежат в data/*.json), а ПРОГРЕСС у каждого посетителя свой:
 * он хранится в localStorage его браузера. Сервер не нужен, посетители друг друга
 * не затрагивают. Перенос между устройствами — через экспорт/импорт JSON.
 *
 * Модуль не знает, как выглядят ваши слова: он работает со строковыми id.
 * Требований к другим файлам нет.
 */
(function (global) {
  'use strict';

  var KEY = 'waichapa.srs.v1';
  var PREF_KEY = 'waichapa.srs.enabled';
  var DAY = 86400000;

  var cfg = {
    newPerDay: 20,     // сколько НОВЫХ слов вводить за день
    matureDays: 21,    // интервал, начиная с которого слово считается «выученным»
    maxInterval: 365,  // потолок интервала, дней (иначе за годы он растёт бесконечно)
    minEase: 1.3,
    maxEase: 3.0,
    startEase: 2.5,
    logDays: 400       // сколько дней истории хранить
  };

  var mem = null;          // кэш в памяти (он же запасной вариант, если storage недоступен)
  var saveFailed = false;
  var memEnabled = null;

  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function num(x, def, lo, hi) { x = Number(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : def; }

  /* Номер локального дня (а не UTC), чтобы «завтра» наступало в полночь пользователя. */
  function today() {
    return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / DAY);
  }

  function valid(d) {
    return d && d.v === 1 && d.cards && typeof d.cards === 'object' && d.log && typeof d.log === 'object';
  }

  function load() {
    if (mem) return mem;
    var raw = null, data = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { saveFailed = true; }
    try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
    mem = valid(data) ? data : { v: 1, cards: {}, log: {} };
    return mem;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); saveFailed = false; return true; }
    catch (e) { saveFailed = true; return false; }
  }

  function cleanCard(c) {
    return {
      ease: num(c.ease, cfg.startEase, cfg.minEase, cfg.maxEase),
      interval: num(c.interval, 0, 0, cfg.maxInterval),
      reps: num(c.reps, 0, 0, 1000),
      due: num(c.due, today(), 0, 1e6),
      lapses: num(c.lapses, 0, 0, 1000),
      last: num(c.last, 0, 0, 1e14)
    };
  }

  function dayLog(d, t) {
    if (!own(d.log, t)) d.log[t] = { reviews: 0, correct: 0, newSeen: 0 };
    return d.log[t];
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  /* ---------- оценка ответа ---------- */

  /* correct = true  → интервал растёт: 1 д → 3 д → ×ease …
   * correct = false → сброс, слово вернётся завтра (в текущей сессии его переспросит квиз) */
  function grade(id, correct) {
    id = String(id);
    var d = load(), t = today();
    var isNew = !own(d.cards, id);
    var c = isNew
      ? { ease: cfg.startEase, interval: 0, reps: 0, due: t, lapses: 0, last: 0 }
      : d.cards[id];

    if (correct) {
      c.reps += 1;
      if (c.reps === 1) c.interval = 1;
      else if (c.reps === 2) c.interval = 3;
      else c.interval = Math.max(c.interval + 1, Math.round(c.interval * c.ease));
      c.interval = Math.min(c.interval, cfg.maxInterval);
      c.ease = Math.min(cfg.maxEase, c.ease + 0.05);
    } else {
      c.reps = 0;
      c.lapses += 1;
      c.interval = 1;
      c.ease = Math.max(cfg.minEase, c.ease - 0.2);
    }
    c.due = t + c.interval;
    c.last = Date.now();
    d.cards[id] = c;

    var l = dayLog(d, t);
    l.reviews++;
    if (correct) l.correct++;
    if (isNew) l.newSeen++;

    var keys = Object.keys(d.log);
    if (keys.length > cfg.logDays + 20) {
      keys.forEach(function (k) { if (Number(k) < t - cfg.logDays) delete d.log[k]; });
    }

    save();
    return c;
  }

  /* ---------- очередь ---------- */

  function newLeft() {
    var d = load(), t = today();
    var seen = own(d.log, t) ? d.log[t].newSeen : 0;
    return Math.max(0, cfg.newPerDay - seen);
  }

  /* ids — список id слов из текущего фильтра. Возвращает id в порядке показа:
   * сначала просроченные (самые «старые» первыми), потом новые, но не больше лимита в день. */
  function buildQueue(ids, opts) {
    opts = opts || {};
    var limit = opts.limit > 0 ? opts.limit : 20;
    var d = load(), t = today();
    var due = [], fresh = [];

    ids.forEach(function (raw) {
      var id = String(raw);
      if (!own(d.cards, id)) fresh.push(id);
      else if (d.cards[id].due <= t) due.push(id);
    });

    due.sort(function (a, b) { return d.cards[a].due - d.cards[b].due; });
    var picked = due.slice(0, limit);
    var room = limit - picked.length;
    var take = Math.min(room, newLeft(), fresh.length);
    return picked.concat(shuffle(fresh).slice(0, Math.max(0, take)));
  }

  function counts(ids) {
    var d = load(), t = today();
    var nw = 0, due = 0, mature = 0;
    ids.forEach(function (raw) {
      var id = String(raw);
      if (!own(d.cards, id)) { nw++; return; }
      var c = d.cards[id];
      if (c.due <= t) due++;
      if (c.interval >= cfg.matureDays) mature++;
    });
    return { total: ids.length, new: nw, newAvailable: Math.min(nw, newLeft()), due: due, mature: mature };
  }

  function streak() {
    var d = load(), t = today(), n = 0;
    function active(k) { return own(d.log, k) && d.log[k].reviews > 0; }
    if (!active(t)) t--;
    while (active(t)) { n++; t--; }
    return n;
  }

  /* ---------- переключатель ---------- */

  function enabled() {
    if (memEnabled !== null) return memEnabled;
    var v = null;
    try { v = localStorage.getItem(PREF_KEY); } catch (e) {}
    memEnabled = v === null ? true : v === '1';
    return memEnabled;
  }

  function setEnabled(b) {
    memEnabled = !!b;
    try { localStorage.setItem(PREF_KEY, b ? '1' : '0'); } catch (e) {}
  }

  /* ---------- экспорт / импорт / сброс ---------- */

  function exportJSON() { return JSON.stringify(load()); }

  /* Слияние: для каждого слова побеждает запись с более поздним last. Возвращает число слов в файле. */
  function importJSON(text) {
    var inc = JSON.parse(text);
    if (!inc || inc.v !== 1 || !inc.cards || typeof inc.cards !== 'object') throw new Error('bad format');
    var d = load(), n = 0;

    Object.keys(inc.cards).forEach(function (id) {
      if (id === '__proto__' || id === 'constructor' || id === 'prototype') return;
      var c = inc.cards[id];
      if (!c || typeof c !== 'object') return;
      c = cleanCard(c);
      n++;
      if (!own(d.cards, id) || c.last > d.cards[id].last) d.cards[id] = c;
    });

    var log = inc.log && typeof inc.log === 'object' ? inc.log : {};
    Object.keys(log).forEach(function (k) {
      if (!/^\d+$/.test(k) || !log[k] || typeof log[k] !== 'object') return;
      var l = dayLog(d, k);
      l.reviews = Math.max(l.reviews, num(log[k].reviews, 0, 0, 1e6));
      l.correct = Math.max(l.correct, num(log[k].correct, 0, 0, 1e6));
      l.newSeen = Math.max(l.newSeen, num(log[k].newSeen, 0, 0, 1e6));
    });

    save();
    return n;
  }

  function reset() {
    mem = { v: 1, cards: {}, log: {} };
    save();
  }

  global.SRS = {
    config: cfg,
    today: today,
    grade: grade,
    buildQueue: buildQueue,
    counts: counts,
    streak: streak,
    stateOf: function (id) { var d = load(); return own(d.cards, String(id)) ? d.cards[String(id)] : null; },
    log: function () { return load().log; },
    enabled: enabled,
    setEnabled: setEnabled,
    exportJSON: exportJSON,
    importJSON: importJSON,
    reset: reset,
    saveFailed: function () { return saveFailed; }
  };
})(window);
