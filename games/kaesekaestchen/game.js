/* Käsekästchen – zu zweit auf einem Handy.
   Nichts ist verdeckt, deshalb kein Sichtschutz: beide sehen dasselbe Feld. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var D = TG.dotsAndBoxes;
  var STATE_KEY = 'kaese.state';
  var STATE_VERSION = 1;
  var DEFAULT_SIZE = 5;
  var MAX_NAME = 14;

  var el = {
    main: document.querySelector('.game-main'),
    actionbar: document.querySelector('.actionbar'),
    setup: document.getElementById('setup'),
    play: document.getElementById('play'),
    over: document.getElementById('over'),
    nameList: document.getElementById('name-list'),
    setupActions: document.getElementById('setup-actions'),
    overActions: document.getElementById('over-actions'),
    startGame: document.getElementById('start-game'),
    board: document.getElementById('board'),
    scoreA: document.getElementById('score-a'),
    scoreB: document.getElementById('score-b'),
    nameA: document.getElementById('name-a'),
    nameB: document.getElementById('name-b'),
    boxesA: document.getElementById('boxes-a'),
    boxesB: document.getElementById('boxes-b'),
    turnLine: document.getElementById('turn-line'),
    overTitle: document.getElementById('over-title'),
    overText: document.getElementById('over-text'),
    newNames: document.getElementById('new-names'),
    rematch: document.getElementById('rematch'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    sizePicker: document.getElementById('size-picker'),
    gameSummary: document.getElementById('game-summary'),
    editPlayers: document.getElementById('edit-players'),
    resetGame: document.getElementById('reset-game'),
    storageHint: document.getElementById('storage-hint'),
    confirm: document.getElementById('confirm'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmText: document.getElementById('confirm-text'),
    confirmOk: document.getElementById('confirm-ok'),
    confirmCancel: document.getElementById('confirm-cancel')
  };

  var state = null;
  var freshBoxes = [];

  var roster = TG.nameEditor(el.nameList, { min: 2, max: 2, maxLength: MAX_NAME });

  /* ---------------- Zustand ---------------- */

  function emptyState() {
    return {
      v: STATE_VERSION,
      phase: 'setup',
      size: DEFAULT_SIZE,
      players: [],
      current: 0,
      board: null
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      Array.isArray(candidate.players) &&
      D.SIZES.indexOf(candidate.size) > -1 &&
      ['setup', 'play', 'over'].indexOf(candidate.phase) > -1;
  }

  function save() { TG.store.set(STATE_KEY, state); }

  function playerName(index) {
    return state.players[index] ? state.players[index].name : '–';
  }

  function initial(index) {
    return playerName(index).charAt(0).toUpperCase();
  }

  /* ---------------- Brett ---------------- */

  function renderBoard() {
    var size = state.size;
    var board = state.board;
    var cells = 2 * size + 1;

    el.board.textContent = '';
    el.board.style.gridTemplateColumns = 'var(--dot) repeat(' + size + ', 1fr var(--dot))';
    el.board.style.gridTemplateRows = 'var(--dot) repeat(' + size + ', 1fr var(--dot))';

    for (var row = 0; row < cells; row++) {
      for (var col = 0; col < cells; col++) {
        var evenRow = row % 2 === 0;
        var evenCol = col % 2 === 0;
        var node;

        if (evenRow && evenCol) {
          node = document.createElement('span');
          node.className = 'kk-cell kk-point';
          node.setAttribute('aria-hidden', 'true');

        } else if (evenRow) {
          node = lineButton('h', row / 2, (col - 1) / 2);

        } else if (evenCol) {
          node = lineButton('v', (row - 1) / 2, col / 2);

        } else {
          var br = (row - 1) / 2, bc = (col - 1) / 2;
          var owner = board.boxes[br][bc];
          node = document.createElement('span');
          node.className = 'kk-cell kk-box' +
            (freshBoxes.some(function (b) { return b[0] === br && b[1] === bc; }) ? ' is-new' : '');
          if (owner !== null) {
            node.dataset.owner = String(owner);
            node.textContent = initial(owner);
            node.setAttribute('aria-label', 'Kästchen von ' + playerName(owner));
          }
        }

        el.board.appendChild(node);
      }
    }

    freshBoxes = [];
  }

  function lineButton(type, r, c) {
    var drawn = type === 'h' ? state.board.h[r][c] : state.board.v[r][c];
    var owner = state.board.lines && state.board.lines[type + r + '_' + c];
    var node = document.createElement('button');

    node.type = 'button';
    node.className = 'kk-cell kk-line kk-line--' + type + (drawn ? ' is-drawn' : '');
    node.dataset.type = type;
    node.dataset.r = String(r);
    node.dataset.c = String(c);
    node.disabled = !!drawn || state.phase !== 'play';

    if (drawn && owner !== undefined) node.dataset.owner = String(owner);
    node.setAttribute('aria-label', (type === 'h' ? 'Waagerechte' : 'Senkrechte') +
      ' Linie' + (drawn ? ' – schon gezogen' : ' ziehen'));

    return node;
  }

  /* ---------------- Zug ---------------- */

  function play(type, r, c) {
    if (state.phase !== 'play') return;

    var result = D.claim(state.board, type, r, c, state.current);
    if (!result.ok) return;

    state.board.lines = state.board.lines || {};
    state.board.lines[type + r + '_' + c] = state.current;
    freshBoxes = result.closed;

    if (result.closed.length) {
      TG.haptic([0, 20, 30, 20]);
    } else {
      TG.haptic(8);
      state.current = state.current === 0 ? 1 : 0;
    }

    if (D.isFinished(state.board)) {
      state.phase = 'over';
      save();
      TG.confetti(180);
      render();
      return;
    }

    save();
    renderBoard();
    renderStatus();
  }

  /* ---------------- Darstellung ---------------- */

  function renderStatus() {
    var points = D.scores(state.board);

    el.nameA.textContent = playerName(0);
    el.nameB.textContent = playerName(1);
    el.boxesA.textContent = String(points[0]);
    el.boxesB.textContent = String(points[1]);

    el.scoreA.classList.toggle('is-turn', state.current === 0);
    el.scoreB.classList.toggle('is-turn', state.current === 1);
    el.scoreA.style.setProperty('--turn-color', 'var(--p0)');
    el.scoreB.style.setProperty('--turn-color', 'var(--p1)');

    el.turnLine.textContent = playerName(state.current) + ' ist dran';
    el.turnLine.style.color = state.current === 0 ? 'var(--p0)' : 'var(--p1)';
  }

  function renderOver() {
    var points = D.scores(state.board);
    var draw = points[0] === points[1];
    var winner = points[0] > points[1] ? 0 : 1;

    el.overTitle.textContent = draw
      ? 'Unentschieden'
      : '🏆 ' + playerName(winner) + ' gewinnt';
    el.overText.textContent = playerName(0) + ' ' + points[0] + ' · ' +
      playerName(1) + ' ' + points[1] + ' Kästchen';
  }

  function render() {
    var phase = state.phase;

    el.setup.hidden = phase !== 'setup';
    el.play.hidden = phase === 'setup';
    el.over.hidden = phase !== 'over';
    el.setupActions.hidden = phase !== 'setup';
    el.overActions.hidden = phase !== 'over';
    el.actionbar.hidden = phase === 'play';
    el.main.classList.toggle('no-actionbar', phase === 'play');

    if (phase !== 'setup') {
      renderBoard();
      renderStatus();
      el.turnLine.hidden = phase === 'over';
    }
    if (phase === 'over') renderOver();

    renderSizePicker();
    el.gameSummary.textContent = state.players.length === 2
      ? playerName(0) + ' gegen ' + playerName(1) + ' · ' + state.size + ' × ' + state.size
      : 'Noch keine Partie begonnen.';
  }

  function renderSizePicker() {
    Array.prototype.forEach.call(el.sizePicker.querySelectorAll('button'), function (button) {
      button.setAttribute('aria-pressed', Number(button.dataset.size) === state.size ? 'true' : 'false');
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

  function askConfirm(title, text, okLabel) {
    return new Promise(function (resolve) {
      el.confirmTitle.textContent = title;
      el.confirmText.textContent = text;
      el.confirmOk.textContent = okLabel || 'Ja';

      function done(answer) {
        el.confirmOk.removeEventListener('click', onOk);
        el.confirmCancel.removeEventListener('click', onCancel);
        el.confirm.removeEventListener('close', onCancel);
        closeDialog(el.confirm);
        resolve(answer);
      }
      function onOk() { done(true); }
      function onCancel() { done(false); }

      el.confirmOk.addEventListener('click', onOk);
      el.confirmCancel.addEventListener('click', onCancel);
      el.confirm.addEventListener('close', onCancel);
      openDialog(el.confirm);
    });
  }

  /* ---------------- Start ---------------- */

  function startGame() {
    var names = roster.values();
    if (names.length < 2) { TG.toast('Bitte zwei Namen eintragen'); return; }

    state.players = names.slice(0, 2).map(function (name) { return { name: name }; });
    newRound();
    TG.toast(state.players[0].name + ' fängt an');
  }

  function newRound() {
    state.phase = 'play';
    state.current = 0;
    state.board = D.createBoard(state.size);
    state.board.lines = {};
    freshBoxes = [];
    save();
    render();
  }

  function toSetup() {
    var names = state.players.map(function (p) { return p.name; });
    state.phase = 'setup';
    state.board = null;
    roster.set(names.length ? names : ['', '']);
    save();
    render();
  }

  function hasProgress() {
    return !!state.board && Object.keys(state.board.lines || {}).length > 0;
  }

  function bindEvents() {
    el.startGame.addEventListener('click', startGame);

    el.nameList.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); startGame(); }
    });

    el.board.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.kk-line') : null;
      if (!button || button.disabled) return;
      play(button.dataset.type, Number(button.dataset.r), Number(button.dataset.c));
    });

    el.rematch.addEventListener('click', function () {
      newRound();
      TG.toast('Revanche – neues Feld!');
    });

    el.newNames.addEventListener('click', toSetup);

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.sizePicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-size]') : null;
      if (!button) return;
      var size = Number(button.dataset.size);
      if (size === state.size) return;

      function apply() {
        state.size = size;
        if (state.phase === 'setup') { save(); render(); return; }
        newRound();
        TG.toast('Neues Feld: ' + size + ' × ' + size);
      }

      if (!hasProgress()) { apply(); return; }
      askConfirm('Feldgröße ändern?', 'Dafür startet eine neue Partie.', 'Ändern')
        .then(function (yes) { if (yes) apply(); });
    });

    el.editPlayers.addEventListener('click', function () {
      closeDialog(el.settings);
      toSetup();
    });

    el.resetGame.addEventListener('click', function () {
      askConfirm('Partie abbrechen?', 'Das Feld wird geleert.', 'Abbrechen')
        .then(function (yes) {
          if (!yes) return;
          closeDialog(el.settings);
          toSetup();
          TG.toast('Partie abgebrochen');
        });
    });

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  function init() {
    var saved = TG.store.get(STATE_KEY, null);
    state = isValidState(saved) ? saved : emptyState();
    if (state.phase !== 'setup' && !state.board) state.phase = 'setup';
    if (state.phase === 'setup') roster.set(['', '']);

    if (!TG.store.available) {
      el.storageHint.textContent = 'Hinweis: Dieser Browser erlaubt keinen lokalen Speicher – die Partie geht beim Schließen verloren.';
    }

    save();
    render();
    bindEvents();
    TG.registerServiceWorker('../../sw.js');
  }

  init();
})(window, document);
