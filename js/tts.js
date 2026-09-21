/* tts.js — озвучка корейских слов через Web Speech API (без сервера и ключей).
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

  var synth = global.speechSynthesis;
  var supported = !!(synth && global.SpeechSynthesisUtterance);
  var koVoice = null;
  var warned = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pickVoice() {
    if (!supported) return;
    var voices = synth.getVoices() || [];
    // Android отдаёт "ko_KR", остальные "ko-KR" — ловим оба варианта
    var ko = voices.filter(function (v) { return /^ko([-_]|$)/i.test(v.lang); });
    koVoice = ko.filter(function (v) { return v.default; })[0] || ko[0] || null;
  }

  if (supported) {
    pickVoice();
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', pickVoice);
    else synth.onvoiceschanged = pickVoice;
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

  function speak(text, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var s = clean(text, opts.sentence);
      if (!supported || !s) return resolve(false);

      pickVoice();
      if (hasKoreanVoice() === false && !warned) {
        warned = true;
        if (typeof global.showToast === 'function') global.showToast(global.t('tts_no_voice'));
      }

      synth.cancel();
      var u = new global.SpeechSynthesisUtterance(s);
      u.lang = 'ko-KR';
      if (koVoice) u.voice = koVoice;
      u.rate = opts.rate || 0.9;
      u.onend = function () { resolve(true); };
      u.onerror = function () { resolve(false); };
      synth.speak(u);
    });
  }

  function stop() { if (supported) synth.cancel(); }

  /* Возвращает '' если озвучка не поддерживается — «мёртвых» кнопок не будет. */
  function btnHtml(text, opts) {
    opts = opts || {};
    if (!supported || !clean(text, opts.sentence)) return '';
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
      rate: el.hasAttribute('data-tts-slow') ? 0.6 : 0.9,
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
