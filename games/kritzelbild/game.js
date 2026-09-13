/* Kritzelbild – aus einer zufälligen Form wird ein Bild.
   Alle bekommen dieselbe Form, danach vergleicht man. Gespeichert werden
   nur die Striche, nicht fertige Bilder – das bleibt klein genug. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var STATE_KEY = 'kritzel.state';
  var STATE_VERSION = 1;
  var MIN_PLAYERS = 1;
  var MAX_PLAYERS = 6;
  var MAX_NAME = 14;

  var COLORS = [
    { id: 'schwarz', hex: '#1c1c1e', name: 'Schwarz' },
    { id: 'rot',     hex: '#ff3b30', name: 'Rot' },
    { id: 'blau',    hex: '#007aff', name: 'Blau' },
    { id: 'gruen',   hex: '#34c759', name: 'Grün' },
    { id: 'orange',  hex: '#ff9500', name: 'Orange' },
    { id: 'braun',   hex: '#8b5e3c', name: 'Braun' }
  ];

  var el = {
    main: document.querySelector('.game-main'),
    actionbar: document.querySelector('.actionbar'),
    setup: document.getElementById('setup'),
    draw: document.getElementById('draw'),
    gallery: document.getElementById('gallery'),
    nameList: document.getElementById('name-list'),
    addPlayer: document.getElementById('add-player'),
    setupActions: document.getElementById('setup-actions'),
    drawActions: document.getElementById('draw-actions'),
    galleryActions: document.getElementById('gallery-actions'),
    startGame: document.getElementById('start-game'),
    drawerName: document.getElementById('drawer-name'),
    drawerCount: document.getElementById('drawer-count'),
    canvas: document.getElementById('canvas'),
    colors: document.getElementById('colors'),
    undo: document.getElementById('undo'),
    clear: document.getElementById('clear'),
    done: document.getElementById('done'),
    galleryTitle: document.getElementById('gallery-title'),
    galleryHint: document.getElementById('gallery-hint'),
    galleryList: document.getElementById('gallery-list'),
    sameAgain: document.getElementById('same-again'),
    newShape: document.getElementById('new-shape'),
    curtain: document.getElementById('curtain'),
    curtainTitle: document.getElementById('curtain-title'),
    curtainNote: document.getElementById('curtain-note'),
    curtainGo: document.getElementById('curtain-go'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    gameCode: document.getElementById('game-code'),
    shareGame: document.getElementById('share-game'),
    showQr: document.getElementById('show-qr'),
    codeForm: document.getElementById('code-form'),
    codeInput: document.getElementById('code-input'),
    playerSummary: document.getElementById('player-summary'),
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
  var sketch = null;
  var colorId = COLORS[0].id;

  var roster = TG.nameEditor(el.nameList, {
    min: MIN_PLAYERS,
    max: MAX_PLAYERS,
    maxLength: MAX_NAME,
    addButton: el.addPlayer
  });

  /* ---------------- Zustand ---------------- */

  function emptyState() {
    var seed = TG.randomSeed();
    return {
      v: STATE_VERSION,
      phase: 'setup',
      players: [],
      seed: seed,
      code: TG.code.fromNumber(seed),
      index: 0,
      drawings: [],
      winner: null,
      curtain: null
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      Array.isArray(candidate.players) &&
      Array.isArray(candidate.drawings) &&
      typeof candidate.code === 'string' &&
      ['setup', 'draw', 'gallery'].indexOf(candidate.phase) > -1;
  }

  function save() { TG.store.set(STATE_KEY, state); }

  function shapePaths() {
    return TG.squiggle.build(state.seed).paths;
  }

  function playerName(index) {
    var player = state.players[index];
    return player ? player.name : '–';
  }

  function colorHex() {
    for (var i = 0; i < COLORS.length; i++) if (COLORS[i].id === colorId) return COLORS[i].hex;
    return COLORS[0].hex;
  }

  /* ---------------- Ablauf ---------------- */

  function beginTurn(index) {
    state.index = index;
    state.phase = 'draw';
    state.curtain = null;

    if (sketch) {
      sketch.setBackdrop(shapePaths());
      sketch.setStrokes(state.drawings[index] ? state.drawings[index].slice() : []);
    }

    save();
    render();
  }

  function askTurn(index) {
    if (state.players.length === 1) { beginTurn(index); return; }
    state.index = index;
    state.curtain = {
      title: 'Handy an ' + playerName(index),
      note: 'Die anderen sollen das Bild noch nicht sehen.'
    };
    save();
    render();
  }

  function finishTurn() {
    state.drawings[state.index] = sketch.getStrokes();
    save();

    if (state.index + 1 < state.players.length) {
      askTurn(state.index + 1);
      return;
    }

    state.phase = 'gallery';
    state.curtain = null;
    save();
    render();
  }

  function newRound(keepShape) {
    if (!keepShape) {
      state.seed = TG.randomSeed();
      state.code = TG.code.fromNumber(state.seed);
    }
    state.drawings = [];
    state.winner = null;
    askTurn(0);
  }

  /* ---------------- Darstellung ---------------- */

  function renderTools() {
    el.colors.textContent = '';

    COLORS.forEach(function (color) {
      var item = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'kb-color';
      button.dataset.color = color.id;
      button.style.setProperty('--swatch', color.hex);
      button.setAttribute('aria-pressed', color.id === colorId ? 'true' : 'false');
      button.setAttribute('aria-label', color.name);
      item.appendChild(button);
      el.colors.appendChild(item);
    });

    el.undo.disabled = !sketch || sketch.isEmpty();
    el.clear.disabled = !sketch || sketch.isEmpty();
  }

  function renderGallery() {
    var backdrop = shapePaths();
    var several = state.players.length > 1;

    el.galleryTitle.textContent = several
      ? 'Dieselbe Form, ' + state.players.length + ' Bilder'
      : 'Fertig!';
    el.galleryHint.textContent = several
      ? (state.winner === null
        ? 'Tippt das Bild an, das euch am besten gefällt.'
        : playerName(state.winner) + ' hat diese Runde gewonnen.')
      : 'Neue Form holen oder dieselbe nochmal probieren.';

    el.galleryList.textContent = '';

    state.players.forEach(function (player, index) {
      var item = document.createElement('li');
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'kb-card' + (state.winner === index ? ' is-winner' : '');
      card.dataset.index = String(index);
      card.disabled = !several;

      var canvas = document.createElement('canvas');
      canvas.className = 'kb-card__image';
      canvas.width = 300;
      canvas.height = 300;

      var name = document.createElement('span');
      name.className = 'kb-card__name';
      name.textContent = player.name;

      var score = document.createElement('span');
      score.className = 'kb-card__score';
      score.textContent = player.score === 1 ? '1 Punkt' : player.score + ' Punkte';

      card.appendChild(canvas);
      card.appendChild(name);
      if (several) card.appendChild(score);
      item.appendChild(card);
      el.galleryList.appendChild(item);

      /* Erst nach dem Einhängen zeichnen – vorher hat das Canvas keine Maße. */
      TG.sketch.render(canvas, backdrop, state.drawings[index] || []);
    });
  }

  function render() {
    var covered = !!state.curtain;
    var phase = state.phase;

    el.curtain.hidden = !covered;
    el.main.hidden = covered;
    el.actionbar.hidden = covered;

    if (covered) {
      el.curtainTitle.textContent = state.curtain.title;
      el.curtainNote.textContent = state.curtain.note;
      return;
    }

    el.setup.hidden = phase !== 'setup';
    el.draw.hidden = phase !== 'draw';
    el.gallery.hidden = phase !== 'gallery';
    el.setupActions.hidden = phase !== 'setup';
    el.drawActions.hidden = phase !== 'draw';
    el.galleryActions.hidden = phase !== 'gallery';

    if (phase === 'draw') {
      el.drawerName.textContent = state.players.length > 1
        ? playerName(state.index) + ' ist dran'
        : 'Mach was daraus';
      el.drawerCount.textContent = state.players.length > 1
        ? (state.index + 1) + ' von ' + state.players.length
        : '';
      if (sketch) sketch.resize();
      renderTools();
    }

    if (phase === 'gallery') renderGallery();

    el.gameCode.textContent = TG.code.format(state.code);
    el.playerSummary.textContent = state.players.length
      ? state.players.map(function (p) { return p.name + ' ' + p.score; }).join(' · ')
      : 'Noch keine Runde begonnen.';
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

  function gameUrl() {
    return TG.pageUrl() + '#c=' + state.code;
  }

  /* ---------------- Verdrahtung ---------------- */

  function startGame() {
    var names = roster.values();
    if (!names.length) { TG.toast('Bitte mindestens einen Namen eintragen'); return; }

    var previous = {};
    state.players.forEach(function (player) { previous[player.name] = player.score; });

    state.players = names.map(function (name) {
      return { name: name, score: previous[name] || 0 };
    });
    state.drawings = [];
    state.winner = null;
    askTurn(0);
  }

  function toSetup() {
    state.phase = 'setup';
    state.curtain = null;
    roster.set(state.players.length
      ? state.players.map(function (p) { return p.name; })
      : ['']);
    save();
    render();
  }

  function bindEvents() {
    el.startGame.addEventListener('click', startGame);

    el.nameList.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); startGame(); }
    });

    el.colors.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.kb-color') : null;
      if (!button) return;
      colorId = button.dataset.color;
      sketch.setColor(colorHex());
      renderTools();
    });

    el.undo.addEventListener('click', function () { sketch.undo(); });
    el.clear.addEventListener('click', function () { sketch.clear(); });

    el.done.addEventListener('click', function () {
      if (sketch.isEmpty()) {
        TG.toast('Mal erst etwas dazu 🙂');
        return;
      }
      finishTurn();
    });

    el.curtainGo.addEventListener('click', function () {
      beginTurn(state.index);
    });

    el.galleryList.addEventListener('click', function (event) {
      var card = event.target.closest ? event.target.closest('.kb-card') : null;
      if (!card || card.disabled) return;

      var index = Number(card.dataset.index);
      if (state.winner === index) return;
      if (state.winner !== null) state.players[state.winner].score--;

      state.winner = index;
      state.players[index].score++;
      TG.haptic(14);
      TG.confetti(110);
      save();
      renderGallery();
    });

    el.newShape.addEventListener('click', function () {
      newRound(false);
      TG.toast('Neue Form!');
    });

    el.sameAgain.addEventListener('click', function () {
      newRound(true);
      TG.toast('Dieselbe Form nochmal');
    });

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.shareGame.addEventListener('click', function () {
      TG.share({
        title: 'Kritzelbild',
        text: 'Malt mit! Code: ' + TG.code.format(state.code),
        url: gameUrl()
      }).then(function (result) {
        TG.reportShare(result, 'Link kopiert – jetzt einfügen und verschicken');
      });
    });

    el.showQr.addEventListener('click', function () {
      TG.showQrDialog(gameUrl(), {
        title: 'Mitmalen: Form scannen',
        caption: TG.code.format(state.code)
      });
    });

    el.codeForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var typed = TG.code.clean(el.codeInput.value);
      var seed = TG.code.toNumber(typed);

      if (seed === null) { TG.toast('Code nicht erkannt – bitte prüfen'); return; }
      if (typed === state.code) {
        el.codeInput.value = '';
        TG.toast('Das ist schon eure Form 🙂');
        return;
      }

      el.codeInput.value = '';
      state.seed = seed;
      state.code = typed;
      closeDialog(el.settings);
      newRound(true);
      TG.toast('Form ' + TG.code.format(state.code) + ' geladen');
    });

    el.editPlayers.addEventListener('click', function () {
      closeDialog(el.settings);
      toSetup();
    });

    el.resetGame.addEventListener('click', function () {
      askConfirm('Alles zurücksetzen?', 'Bilder, Punkte und Namen gehen verloren.', 'Zurücksetzen')
        .then(function (yes) {
          if (!yes) return;
          closeDialog(el.settings);
          state = emptyState();
          toSetup();
          TG.toast('Zurückgesetzt');
        });
    });

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  function init() {
    var saved = TG.store.get(STATE_KEY, null);
    var sharedCode = TG.codeFromLocation();
    var sharedSeed = TG.code.toNumber(sharedCode);

    state = isValidState(saved) ? saved : emptyState();
    if (state.phase !== 'setup' && !state.players.length) state.phase = 'setup';
    if (state.phase === 'setup') roster.set(state.players.length
      ? state.players.map(function (p) { return p.name; })
      : ['']);

    if (sharedSeed !== null && sharedCode !== state.code) {
      state.seed = sharedSeed;
      state.code = sharedCode;
      state.drawings = [];
      state.winner = null;
    }

    sketch = TG.sketch.create(el.canvas, {
      color: colorHex(),
      width: 5,
      backdropColor: '#9aa3ad',
      onChange: function () { if (state.phase === 'draw') renderTools(); }
    });
    sketch.setBackdrop(shapePaths());

    if (!TG.store.available) {
      el.storageHint.textContent = 'Hinweis: Dieser Browser erlaubt keinen lokalen Speicher – die Bilder gehen beim Schließen verloren.';
    }

    save();
    TG.clearHash();
    render();
    bindEvents();

    if (sharedSeed !== null) {
      TG.toast('Gemeinsame Form ' + TG.code.format(state.code) + ' geladen', { duration: 2600 });
    }

    TG.registerServiceWorker('../../sw.js');
  }

  init();
})(window, document);
