/* tts.js — озвучка корейских слов, без сервера, ключей и предварительной генерации.
 *
 * Порядок:
 *   1) если в браузере есть ХОРОШИЙ корейский голос (Edge Natural, Google, macOS/iOS Premium) — берём его;
 *   2) иначе берём онлайн-голос Google Translate (звучит как человек, нужен интернет);
 *   3) если онлайн не сработал — любой доступный голос браузера (на Linux это eSpeak).
 *
 * В разметке (работает на ЛЮБОМ элементе, делегированием событий):
 *     <button data-tts="먹다">…</button>
 *     <button data-tts="저는 학생이에요." data-tts-sentence>…</button>   ← целое предложение
 *     <button data-tts="안녕하세요" data-tts-slow>…</button>             ← медленно
 * Готовая кнопка из JS-шаблона:
 *     `${KoTTS.btnHtml(entry.Korean)}`
 * Из кода:
 *     KoTTS.speak('먹다');
 *
 * Требует: i18n.js (t) и common.js (showToast).
 */
(function (global) {
  'use strict';

  var ONLINE_URL = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ko&q=';
  var GOOD_VOICE_SCORE = 30;   // голоса с баллом ниже считаются «роботными»

  var synth = global.speechSynthesis;
  var supported = !!(synth && global.SpeechSynthesisUtterance);
  var koVoice = null;
  var warned = false;
  var current = null;          // играющий сейчас онлайн-<audio>

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- выбор голоса браузера ---------- */

  // Чем выше балл, тем приятнее голос. eSpeak и подобные — в самый низ.
  function scoreVoice(v) {
    var n = (v.name || '').toLowerCase(), s = 0;
    if (/espeak|festival|flite|pico/.test(n)) s -= 100;
    if (/natural|neural|online/.test(n)) s += 50;   // Edge: «Microsoft SunHi Online (Natural)»
    if (/google/.test(n)) s += 40;                  // Chrome: «Google 한국어»
    if (/premium|enhanced/.test(n)) s += 30;        // macOS / iOS
    if (/yuna|sunhi|injoon|heami|sora/.test(n)) s += 10;
    if (v.default) s += 1;
    return s;
  }

  function pickVoice() {
    if (!supported) return;
    var voices = synth.getVoices() || [];
    // Android отдаёт "ko_KR", остальные "ko-KR" — ловим оба варианта
    var ko = voices.filter(function (v) { return /^ko([-_]|$)/i.test(v.lang); });
    ko.sort(function (a, b) { return scoreVoice(b) - scoreVoice(a); });
    koVoice = ko[0] || null;
  }

  if (supported) {
    pickVoice();
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', pickVoice);
    else synth.onvoiceschanged = pickVoice;
  }

  function hasGoodVoice() {
    pickVoice();
    return !!koVoice && scoreVoice(koVoice) >= GOOD_VOICE_SCORE;
  }

  /* Убираем то, что не нужно произносить: «(пояснения)», «~». Для слова берём первый вариант из «a / b». */
  function clean(text, sentence) {
    var s = String(text == null ? '' : text).replace(/\([^)]*\)/g, ' ');
    if (!sentence) s = s.split(/[\/;]/)[0].replace(/-/g, '');
    return s.replace(/[~∼〜]/g, '').replace(/\s+/g, ' ').trim();
  }

  /* true — голос есть; false — список голосов загружен, но корейского нет; null — список ещё не загрузился */
  function hasKoreanVoice() {
    if (!supported) return false;
    pickVoice();
    if (koVoice) return true;
    return (synth.getVoices() || []).length ? false : null;
  }

  /* ---------- воспроизведение ---------- */

  function speakOnline(s, slow) {
    return new Promise(function (resolve) {
      if (typeof Audio === 'undefined' || s.length > 190) return resolve(false);
      var a = new Audio(ONLINE_URL + encodeURIComponent(s));
      current = a;
      a.playbackRate = slow ? 0.75 : 1;
      a.onended = function () { if (current === a) current = null; resolve(true); };
      a.onerror = function () { if (current === a) current = null; resolve(false); };
      a.onpause = function () { if (!a.ended) resolve(false); };   // stop() или прерывание другим звуком
      var p = a.play();
      if (p && typeof p.catch === 'function') p.catch(function () { resolve(false); });
    });
  }

  function speakSynth(s, slow, rate) {
    return new Promise(function (resolve) {
      if (!supported) return resolve(false);

      pickVoice();
      if (hasKoreanVoice() === false && !warned) {
        warned = true;
        if (typeof global.showToast === 'function') global.showToast(global.t('tts_no_voice'));
      }

      synth.cancel();
      var u = new global.SpeechSynthesisUtterance(s);
      u.lang = 'ko-KR';
      if (koVoice) u.voice = koVoice;
      u.rate = rate || (slow ? 0.75 : 1.0);
      u.onend = function () { resolve(true); };
      u.onerror = function () { resolve(false); };
      synth.speak(u);
    });
  }

  function stop() {
    if (current) { try { current.pause(); } catch (e) {} current = null; }
    if (supported) synth.cancel();
  }

  function speak(text, opts) {
    opts = opts || {};
    var s = clean(text, opts.sentence);
    if (!s) return Promise.resolve(false);
    var slow = !!opts.slow || (opts.rate > 0 && opts.rate < 0.8);

    stop();
    if (hasGoodVoice()) return speakSynth(s, slow, opts.rate);

    return speakOnline(s, slow).then(function (ok) {
      return ok ? true : speakSynth(s, slow, opts.rate);   // онлайн недоступен — голос браузера
    });
  }

  /* Возвращает '' только если текста для озвучки нет. */
  function btnHtml(text, opts) {
    opts = opts || {};
    if (!clean(text, opts.sentence)) return '';
    var label = esc(global.t('tts_play'));
    return '<button type="button" class="tts-btn" data-tts="' + esc(text) + '"' +
      (opts.sentence ? ' data-tts-sentence' : '') +
      (opts.slow ? ' data-tts-slow' : '') +
      ' aria-label="' + label + '" title="' + label + '">🔊</button>';
  }

  // Фаза перехвата + stopPropagation: клик по 🔊 внутри кликабельного блока не должен срабатывать «сквозь» кнопку.
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-tts]') : null;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    el.classList.add('tts-speaking');
    speak(el.getAttribute('data-tts'), {
      slow: el.hasAttribute('data-tts-slow'),
      sentence: el.hasAttribute('data-tts-sentence')
    }).then(function () { el.classList.remove('tts-speaking'); });
  }, true);

  global.KoTTS = {
    supported: supported,
    speak: speak,
    stop: stop,
    clean: clean,
    btnHtml: btnHtml,
    hasKoreanVoice: hasKoreanVoice
  };
})(window);
