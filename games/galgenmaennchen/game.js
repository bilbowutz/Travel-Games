/* Galgenmännchen – allein gegen ein Zufallswort oder zu zweit.
   Statt eines Galgens wächst eine Rakete; ist sie fertig, startet sie ohne dich. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var STATE_KEY = 'galgen.state';
  var STATE_VERSION = 1;
  var MAX_WRONG = 6;
  var LEVELS = ['leicht', 'mittel', 'schwer'];
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß'.split('');

  var el = {
    main: document.querySelector('.game-main'),
    actionbar: document.querySelector('.actionbar'),
    setup: document.getElementById('setup'),
    enter: document.getElementById('enter'),
    play: document.getElementById('play'),
    over: document.getElementById('over'),
    modeSolo: document.getElementById('mode-solo'),
    modeDuo: document.getElementById('mode-duo'),
    wordForm: document.getElementById('word-form'),
    wordInput: document.getElementById('word-input'),
    enterActions: document.getElementById('enter-actions'),
    overActions: document.getElementById('over-actions'),
    wordDone: document.getElementById('word-done'),
    rocket: document.getElementById('rocket'),
    left: document.getElementById('left'),
    word: document.getElementById('word'),
    keys: document.getElementById('keys'),
    overTitle: document.getElementById('over-title'),
    overText: document.getElementById('over-text'),
    changeMode: document.getElementById('change-mode'),
    again: document.getElementById('again'),
    curtain: document.getElementById('curtain'),
    curtainTitle: document.getElementById('curtain-title'),
    curtainNote: document.getElementById('curtain-note'),
    curtainGo: document.getElementById('curtain-go'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    levelPicker: document.getElementById('level-picker'),
    resetGame: document.getElementById('reset-game'),
    storageHint: document.getElementById('storage-hint')
  };

  var state = null;

  /* ---------------- Buchstaben ---------------- */

  /* toUpperCase macht aus ß ein SS – das würde die Wortlänge verändern. */
  function upper(text) {
    return String(text).split('').map(function (character) {
      return character === 'ß' ? 'ß' : character.toUpperCase();
    }).join('');
  }

  function isLetter(character) {
    return LETTERS.indexOf(character) > -1;
  }

  function cleanWord(text) {
    return upper(String(text).trim()).split('').filter(isLetter).join('');
  }

  /* ---------------- Zustand ---------------- */

  function emptyState() {
    return {
      v: STATE_VERSION,
      phase: 'setup',
      mode: 'solo',
      level: 'mittel',
      word: '',
      guessed: [],
      wrong: 0,
      won: false,
      curtain: null
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      ['setup', 'enter', 'play', 'over'].indexOf(candidate.phase) > -1 &&
      Array.isArray(candidate.guessed);
  }

  function save() { TG.store.set(STATE_KEY, state); }

  function letters() {
    return state.word.split('');
  }

  function isRevealed(character) {
    return state.guessed.indexOf(character) > -1;
  }

  function solved() {
    return state.word.length > 0 && letters().every(isRevealed);
  }

  /* ---------------- Spielzüge ---------------- */

  function startSolo() {
    var pool = TG.words.pool(state.level);
    state.mode = 'solo';
    state.word = cleanWord(pool[Math.floor(Math.random() * pool.length)]);
    state.guessed = [];
    state.wrong = 0;
    state.won = false;
    state.phase = 'play';
    state.curtain = null;
    save();
    render();
  }

  function startDuo() {
    state.mode = 'duo';
    state.word = '';
    state.guessed = [];
    state.wrong = 0;
    state.won = false;
    showCurtain('enter', 'Handy an die Person, die sich ein Wort ausdenkt', 'Die anderen schauen bitte weg.');
  }

  function submitWord() {
    var word = cleanWord(el.wordInput.value);

    if (word.length < 3) { TG.toast('Mindestens drei Buchstaben'); return; }
    if (word.length > 16) { TG.toast('Höchstens sechzehn Buchstaben'); return; }

    state.word = word;
    el.wordInput.value = '';
    showCurtain('play', 'Handy an die Person, die rät', word.length + ' Buchstaben sind es.');
  }

  function guess(character) {
    if (state.phase !== 'play' || isRevealed(character)) return;

    state.guessed.push(character);
    var hit = state.word.indexOf(character) > -1;

    if (!hit) {
      state.wrong++;
      TG.haptic(10);
    } else {
      TG.haptic(14);
    }

    if (solved()) {
      state.phase = 'over';
      state.won = true;
      save();
      TG.confetti(180);
      render();
      return;
    }

    if (state.wrong >= MAX_WRONG) {
      state.phase = 'over';
      state.won = false;
      save();
      TG.haptic([0, 60, 40, 60]);
      render();
      return;
    }

    save();
    render();
  }

  /* ---------------- Sichtschutz ---------------- */

  function showCurtain(next, title, note) {
    state.curtain = { next: next, title: title, note: note || '' };
    save();
    render();
  }

  function leaveCurtain() {
    var next = state.curtain.next;
    state.curtain = null;
    state.phase = next;
    save();
    render();
    if (next === 'enter') el.wordInput.focus();
  }

  /* ---------------- Darstellung ---------------- */

  function renderWord(reveal) {
    el.word.textContent = '';

    letters().forEach(function (character) {
      var span = document.createElement('span');
      var open = !isRevealed(character);
      span.className = 'gm-letter' +
        (open && !reveal ? ' is-open' : '') +
        (open && reveal ? ' is-missed' : '');
      span.textContent = character;
      el.word.appendChild(span);
    });

    el.word.setAttribute('aria-label', reveal
      ? 'Das Wort war ' + state.word
      : letters().map(function (c) { return isRevealed(c) ? c : 'Lücke'; }).join(' '));
  }

  function renderKeys() {
    el.keys.textContent = '';

    LETTERS.forEach(function (character) {
      var item = document.createElement('li');
      var key = document.createElement('button');
      var used = isRevealed(character);
      var hit = used && state.word.indexOf(character) > -1;

      key.type = 'button';
      key.className = 'gm-key' + (used ? (hit ? ' is-hit' : ' is-miss') : '');
      key.dataset.letter = character;
      key.textContent = character;
      key.disabled = used;
      key.setAttribute('aria-label', character + (used ? (hit ? ' – richtig' : ' – daneben') : ''));

      item.appendChild(key);
      el.keys.appendChild(item);
    });
  }

  function renderRocket(launched) {
    Array.prototype.forEach.call(el.rocket.querySelectorAll('.gm-part'), function (part) {
      part.classList.toggle('is-built', Number(part.dataset.part) <= state.wrong);
    });
    el.rocket.classList.toggle('is-launched', !!launched);

    var left = MAX_WRONG - state.wrong;
    el.left.textContent = launched
      ? 'Die Rakete ist weg.'
      : (left === 1 ? 'Noch ein Fehler frei' : left + ' Fehler frei');
    el.left.classList.toggle('is-tight', left <= 2 && !launched);
  }

  function renderOver() {
    el.overTitle.textContent = state.won ? '🏆 Erraten!' : '🚀 Die Rakete ist ohne dich gestartet';
    el.overText.textContent = state.won
      ? 'Mit ' + state.wrong + (state.wrong === 1 ? ' Fehler' : ' Fehlern') + ': ' + state.word
      : 'Das Wort war: ' + state.word;
  }

  function render() {
    var covered = !!state.curtain;
    var phase = state.phase;

    el.curtain.hidden = !covered;
    el.main.hidden = covered;
    el.actionbar.hidden = covered || phase === 'setup' || phase === 'play';
    el.main.classList.toggle('no-actionbar', phase === 'setup' || phase === 'play');

    if (covered) {
      el.curtainTitle.textContent = state.curtain.title;
      el.curtainNote.textContent = state.curtain.note;
      /* Hinter dem Sichtschutz darf nichts vom Wort stehen bleiben. */
      el.word.textContent = '';
      el.wordInput.value = '';
      return;
    }

    el.setup.hidden = phase !== 'setup';
    el.enter.hidden = phase !== 'enter';
    el.play.hidden = phase !== 'play';
    el.over.hidden = phase !== 'over';
    el.enterActions.hidden = phase !== 'enter';
    el.overActions.hidden = phase !== 'over';

    if (phase === 'play' || phase === 'over') {
      renderRocket(phase === 'over' && !state.won);
      renderWord(phase === 'over' && !state.won);
      renderKeys();
    }
    if (phase === 'over') renderOver();

    Array.prototype.forEach.call(el.levelPicker.querySelectorAll('button'), function (button) {
      button.setAttribute('aria-pressed', button.dataset.level === state.level ? 'true' : 'false');
    });
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

  function bindEvents() {
    el.modeSolo.addEventListener('click', startSolo);
    el.modeDuo.addEventListener('click', startDuo);

    el.wordForm.addEventListener('submit', function (event) {
      event.preventDefault();
      submitWord();
    });
    el.wordDone.addEventListener('click', submitWord);

    el.keys.addEventListener('click', function (event) {
      var key = event.target.closest ? event.target.closest('.gm-key') : null;
      if (!key || key.disabled) return;
      guess(key.dataset.letter);
    });

    el.curtainGo.addEventListener('click', leaveCurtain);

    el.again.addEventListener('click', function () {
      if (state.mode === 'solo') startSolo();
      else startDuo();
    });

    el.changeMode.addEventListener('click', function () {
      state.phase = 'setup';
      state.curtain = null;
      save();
      render();
    });

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.levelPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-level]') : null;
      if (!button || button.dataset.level === state.level) return;
      state.level = button.dataset.level;
      save();
      render();
      TG.toast('Schwierigkeit: ' + button.textContent);
    });

    el.resetGame.addEventListener('click', function () {
      closeDialog(el.settings);
      state.phase = 'setup';
      state.curtain = null;
      state.word = '';
      save();
      render();
    });

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  function init() {
    var saved = TG.store.get(STATE_KEY, null);
    state = isValidState(saved) ? saved : emptyState();
    if (LEVELS.indexOf(state.level) < 0) state.level = 'mittel';
    if (state.phase === 'play' && !state.word) state.phase = 'setup';

    if (!TG.store.available) {
      el.storageHint.textContent = 'Hinweis: Dieser Browser erlaubt keinen lokalen Speicher – die Runde geht beim Schließen verloren.';
    }

    save();
    render();
    bindEvents();
    TG.registerServiceWorker('../../sw.js');
  }

  init();
})(window, document);
