/* Erzählwürfel – kooperativ, ohne Punkte.
   Die Symbole kommen aus einem Startwert, damit sie sich teilen lassen. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var STATE_KEY = 'erzaehl.state';
  var STATE_VERSION = 1;
  var COUNTS = [3, 6, 9];
  var DEFAULT_COUNT = 9;

  var el = {
    opener: document.getElementById('opener'),
    dice: document.getElementById('dice'),
    hint: document.getElementById('hint'),
    roll: document.getElementById('roll'),
    resetUsed: document.getElementById('reset-used'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    countPicker: document.getElementById('count-picker'),
    gameCode: document.getElementById('game-code'),
    shareGame: document.getElementById('share-game'),
    showQr: document.getElementById('show-qr'),
    codeForm: document.getElementById('code-form'),
    codeInput: document.getElementById('code-input'),
    storageHint: document.getElementById('storage-hint')
  };

  var state = null;
  var justRolled = false;

  /* ---------------- Code <-> Wurf ---------------- */

  /* Startwert und Anzahl stecken gemeinsam im Code. */
  function encodeCode(seed, count) {
    return TG.code.fromNumber(seed * 4 + COUNTS.indexOf(count));
  }

  function decodeCode(text) {
    var value = TG.code.toNumber(text);
    if (value === null) return null;
    var count = COUNTS[value % 4];
    if (!count) return null;
    return { seed: Math.floor(value / 4), count: count };
  }

  /* ---------------- Zustand ---------------- */

  function buildState(seed, count) {
    if (typeof seed !== 'number') seed = TG.randomSeed();
    if (typeof count !== 'number') count = DEFAULT_COUNT;

    var random = TG.rng(seed);
    var picked = TG.shuffle(TG.storySymbols, random).slice(0, count);
    var opener = TG.storyOpeners[Math.floor(random() * TG.storyOpeners.length)];

    return {
      v: STATE_VERSION,
      seed: seed,
      code: encodeCode(seed, count),
      count: count,
      opener: opener,
      symbols: picked.map(function (symbol) { return symbol.emoji; }),
      names: picked.map(function (symbol) { return symbol.name; }),
      used: picked.map(function () { return false; })
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      typeof candidate.code === 'string' &&
      Array.isArray(candidate.symbols) &&
      Array.isArray(candidate.used) &&
      candidate.symbols.length === candidate.used.length &&
      COUNTS.indexOf(candidate.count) > -1;
  }

  function save() { TG.store.set(STATE_KEY, state); }

  function usedCount() {
    return state.used.filter(Boolean).length;
  }

  /* ---------------- Darstellung ---------------- */

  function render() {
    el.opener.textContent = state.opener;
    el.dice.dataset.count = String(state.count);
    el.dice.textContent = '';

    state.symbols.forEach(function (emoji, index) {
      var item = document.createElement('li');
      var die = document.createElement('button');

      die.type = 'button';
      die.className = 'story-die' +
        (state.used[index] ? ' is-used' : '') +
        (justRolled ? ' is-rolling' : '');
      die.dataset.index = String(index);
      die.style.animationDelay = justRolled ? (index * 35) + 'ms' : '';
      die.textContent = emoji;
      die.setAttribute('aria-pressed', state.used[index] ? 'true' : 'false');
      die.setAttribute('aria-label', state.names[index] +
        (state.used[index] ? ' – schon benutzt' : ' – noch offen'));

      item.appendChild(die);
      el.dice.appendChild(item);
    });

    justRolled = false;

    var open = state.symbols.length - usedCount();
    el.hint.textContent = open === 0
      ? 'Alle Symbole verbraucht – Geschichte fertig! 🎉'
      : (usedCount() === 0
        ? 'Tippe ein Symbol an, wenn es in der Geschichte vorkam.'
        : 'Noch ' + open + (open === 1 ? ' Symbol' : ' Symbole') + ' übrig.');

    el.resetUsed.disabled = usedCount() === 0;
    el.gameCode.textContent = TG.code.format(state.code);

    Array.prototype.forEach.call(el.countPicker.querySelectorAll('button'), function (button) {
      button.setAttribute('aria-pressed', Number(button.dataset.count) === state.count ? 'true' : 'false');
    });
  }

  /* ---------------- Spielzüge ---------------- */

  function roll(seed, count) {
    state = buildState(seed, typeof count === 'number' ? count : state.count);
    justRolled = true;
    TG.haptic(12);
    save();
    render();
  }

  function toggleUsed(index) {
    state.used[index] = !state.used[index];
    TG.haptic(8);
    save();
    render();

    if (state.used.every(Boolean)) {
      TG.confetti(150);
      TG.toast('Geschichte fertig! 🎉', { variant: 'win' });
    }
  }

  /* ---------------- Dialoge ---------------- */

  function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function gameUrl() {
    return TG.pageUrl() + '#c=' + state.code;
  }

  function bindEvents() {
    el.roll.addEventListener('click', function () {
      roll();
      TG.toast('Neue Symbole – los geht’s!');
    });

    el.resetUsed.addEventListener('click', function () {
      state.used = state.used.map(function () { return false; });
      save();
      render();
    });

    el.dice.addEventListener('click', function (event) {
      var die = event.target.closest ? event.target.closest('.story-die') : null;
      if (!die) return;
      toggleUsed(Number(die.dataset.index));
    });

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.countPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-count]') : null;
      if (!button) return;
      var count = Number(button.dataset.count);
      if (count === state.count) return;
      roll(undefined, count);
      TG.toast(count + ' Symbole');
    });

    el.shareGame.addEventListener('click', function () {
      TG.share({
        title: 'Erzählwürfel',
        text: 'Erzählt mit! Code: ' + TG.code.format(state.code),
        url: gameUrl()
      }).then(function (result) {
        TG.reportShare(result, 'Link kopiert – jetzt einfügen und verschicken');
      });
    });

    el.showQr.addEventListener('click', function () {
      TG.showQrDialog(gameUrl(), {
        title: 'Mitspielen: Symbole scannen',
        caption: TG.code.format(state.code)
      });
    });

    el.codeForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var typed = TG.code.clean(el.codeInput.value);
      var decoded = decodeCode(typed);

      if (!decoded) { TG.toast('Code nicht erkannt – bitte prüfen'); return; }
      if (typed === state.code) {
        el.codeInput.value = '';
        TG.toast('Das sind schon eure Symbole 🙂');
        return;
      }

      el.codeInput.value = '';
      roll(decoded.seed, decoded.count);
      TG.toast('Symbole ' + TG.code.format(state.code) + ' geladen');
    });

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  function init() {
    var saved = TG.store.get(STATE_KEY, null);
    var shared = decodeCode(TG.codeFromLocation());

    if (shared) {
      state = buildState(shared.seed, shared.count);
    } else if (isValidState(saved)) {
      state = saved;
    } else {
      state = buildState();
    }

    save();
    TG.clearHash();

    if (!TG.store.available) {
      el.storageHint.textContent = 'Hinweis: Dieser Browser erlaubt keinen lokalen Speicher – der Wurf geht beim Schließen verloren.';
    }

    render();
    bindEvents();

    if (shared) TG.toast('Gemeinsame Symbole ' + TG.code.format(state.code) + ' geladen', { duration: 2600 });

    TG.registerServiceWorker('../../sw.js');
  }

  init();
})(window, document);
