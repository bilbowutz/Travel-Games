/* Malen und Raten – eine Person zeichnet, die anderen rufen.
   Der Begriff ist nur für die zeichnende Person sichtbar, davor liegt
   ein Sichtschutz. Gespeichert wird nur lokal. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var STATE_KEY = 'malen.state';
  var STATE_VERSION = 1;
  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 8;
  var MAX_NAME = 14;
  var TIMES = [30, 60, 90, 0];
  var LEVELS = ['leicht', 'mittel', 'schwer'];
  var POINTS_GUESS = 2;
  var POINTS_DRAW = 1;
  var RECENT_WORDS = 30;

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
    word: document.getElementById('word'),
    draw: document.getElementById('draw'),
    resolve: document.getElementById('resolve'),
    nameList: document.getElementById('name-list'),
    addPlayer: document.getElementById('add-player'),
    setupActions: document.getElementById('setup-actions'),
    wordActions: document.getElementById('word-actions'),
    drawActions: document.getElementById('draw-actions'),
    startGame: document.getElementById('start-game'),
    secretWord: document.getElementById('secret-word'),
    swapWord: document.getElementById('swap-word'),
    swapHint: document.getElementById('swap-hint'),
    startDraw: document.getElementById('start-draw'),
    drawerName: document.getElementById('drawer-name'),
    roundNumber: document.getElementById('round-number'),
    timer: document.getElementById('timer'),
    timerFill: document.getElementById('timer-fill'),
    timerText: document.getElementById('timer-text'),
    canvas: document.getElementById('canvas'),
    colors: document.getElementById('colors'),
    undo: document.getElementById('undo'),
    clear: document.getElementById('clear'),
    guessed: document.getElementById('guessed'),
    giveUp: document.getElementById('give-up'),
    resolveTitle: document.getElementById('resolve-title'),
    resolveWord: document.getElementById('resolve-word'),
    guessers: document.getElementById('guessers'),
    nobody: document.getElementById('nobody'),
    curtain: document.getElementById('curtain'),
    curtainTitle: document.getElementById('curtain-title'),
    curtainNote: document.getElementById('curtain-note'),
    curtainGo: document.getElementById('curtain-go'),
    scores: document.getElementById('scores'),
    scoreList: document.getElementById('score-list'),
    openScores: document.getElementById('open-scores'),
    closeScores: document.getElementById('close-scores'),
    shareScores: document.getElementById('share-scores'),
    resetScores: document.getElementById('reset-scores'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    timePicker: document.getElementById('time-picker'),
    levelPicker: document.getElementById('level-picker'),
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
  var context = el.canvas.getContext('2d');
  var strokes = [];          /* nur im Speicher – ein Bild muss kein Reload überleben */
  var activeStroke = null;
  var colorId = COLORS[0].id;
  var timerHandle = null;

  var roster = TG.nameEditor(el.nameList, {
    min: MIN_PLAYERS,
    max: MAX_PLAYERS,
    maxLength: MAX_NAME,
    addButton: el.addPlayer
  });

  /* ---------------- Zustand ---------------- */

  function emptyState() {
    return {
      v: STATE_VERSION,
      phase: 'setup',
      players: [],
      drawer: 0,
      round: 1,
      word: '',
      swapped: false,
      time: 60,
      level: 'mittel',
      recent: [],
      curtain: null
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      Array.isArray(candidate.players) &&
      ['setup', 'word', 'draw', 'resolve'].indexOf(candidate.phase) > -1;
  }

  function save() { TG.store.set(STATE_KEY, state); }

  function drawerName() {
    var player = state.players[state.drawer];
    return player ? player.name : '–';
  }

  /* ---------------- Begriffe ---------------- */

  function pickWord() {
    var pool = TG.words.pool(state.level).filter(function (word) {
      return state.recent.indexOf(word) < 0;
    });
    if (!pool.length) {
      state.recent = [];
      pool = TG.words.pool(state.level);
    }

    var word = pool[Math.floor(Math.random() * pool.length)];
    state.recent.push(word);
    if (state.recent.length > RECENT_WORDS) state.recent.shift();
    return word;
  }

  /* ---------------- Zeichnen ---------------- */

  function currentColor() {
    for (var i = 0; i < COLORS.length; i++) if (COLORS[i].id === colorId) return COLORS[i].hex;
    return COLORS[0].hex;
  }

  function sizeCanvas() {
    var rect = el.canvas.getBoundingClientRect();
    if (!rect.width) return;

    var ratio = Math.min(window.devicePixelRatio || 1, 3);
    el.canvas.width = Math.round(rect.width * ratio);
    el.canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    repaint();
  }

  function repaint() {
    var rect = el.canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width || el.canvas.width, rect.height || el.canvas.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';

    strokes.forEach(function (stroke) {
      if (!stroke.points.length) return;
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width;
      context.beginPath();
      context.moveTo(stroke.points[0][0], stroke.points[0][1]);

      for (var i = 1; i < stroke.points.length; i++) {
        var previous = stroke.points[i - 1];
        var point = stroke.points[i];
        context.quadraticCurveTo(previous[0], previous[1],
          (previous[0] + point[0]) / 2, (previous[1] + point[1]) / 2);
      }

      if (stroke.points.length === 1) {
        context.lineTo(stroke.points[0][0] + 0.1, stroke.points[0][1]);
      }
      context.stroke();
    });
  }

  function canvasPoint(event) {
    var rect = el.canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  function canDraw() {
    return state.phase === 'draw' && !el.canvas.classList.contains('is-locked');
  }

  function bindCanvas() {
    el.canvas.addEventListener('pointerdown', function (event) {
      if (!canDraw()) return;
      event.preventDefault();
      if (el.canvas.setPointerCapture) el.canvas.setPointerCapture(event.pointerId);
      activeStroke = { color: currentColor(), width: 5, points: [canvasPoint(event)] };
      strokes.push(activeStroke);
      repaint();
      renderTools();
    });

    el.canvas.addEventListener('pointermove', function (event) {
      if (!activeStroke || !canDraw()) return;
      event.preventDefault();
      activeStroke.points.push(canvasPoint(event));
      repaint();
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
      el.canvas.addEventListener(type, function () { activeStroke = null; });
    });

    window.addEventListener('resize', function () {
      if (state.phase === 'draw') sizeCanvas();
    });
  }

  /* ---------------- Uhr ---------------- */

  function stopTimer() {
    if (timerHandle) { window.clearInterval(timerHandle); timerHandle = null; }
  }

  function startTimer() {
    stopTimer();
    el.canvas.classList.remove('is-locked');

    if (!state.time) {
      el.timer.hidden = true;
      el.timerText.hidden = true;
      return;
    }

    var endsAt = Date.now() + state.time * 1000;
    el.timer.hidden = false;
    el.timerText.hidden = false;
    el.timerText.classList.remove('is-over');

    function tick() {
      var left = Math.max(0, endsAt - Date.now());
      var share = left / (state.time * 1000);

      el.timerFill.style.width = (share * 100) + '%';
      el.timerFill.classList.toggle('is-tight', share <= 0.2);
      el.timerText.textContent = Math.ceil(left / 1000) + ' Sekunden';

      if (left <= 0) {
        stopTimer();
        el.canvas.classList.add('is-locked');
        el.timerText.textContent = 'Zeit um!';
        el.timerText.classList.add('is-over');
        TG.haptic([0, 60, 40, 60]);
      }
    }

    tick();
    timerHandle = window.setInterval(tick, 200);
  }

  /* ---------------- Ablauf ---------------- */

  function showCurtain(next, title, note) {
    stopTimer();
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
  }

  function startRound() {
    state.word = pickWord();
    state.swapped = false;
    strokes = [];
    showCurtain('word', drawerName() + ' zeichnet', 'Nur ' + drawerName() + ' darf jetzt schauen.');
  }

  function finishRound(guesserIndex) {
    if (guesserIndex !== null && guesserIndex !== state.drawer) {
      state.players[guesserIndex].score += POINTS_GUESS;
      state.players[state.drawer].score += POINTS_DRAW;
      TG.confetti(120);
      TG.toast(state.players[guesserIndex].name + ' +' + POINTS_GUESS + ', ' +
        drawerName() + ' +' + POINTS_DRAW, { variant: 'win' });
    } else {
      TG.toast('Keine Punkte diese Runde');
    }

    state.drawer = (state.drawer + 1) % state.players.length;
    state.round++;
    save();
    startRound();
  }

  /* ---------------- Darstellung ---------------- */

  function renderTools() {
    el.colors.textContent = '';

    COLORS.forEach(function (color) {
      var item = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'mr-color';
      button.dataset.color = color.id;
      button.style.setProperty('--swatch', color.hex);
      button.setAttribute('aria-pressed', color.id === colorId ? 'true' : 'false');
      button.setAttribute('aria-label', color.name);
      item.appendChild(button);
      el.colors.appendChild(item);
    });

    el.undo.disabled = strokes.length === 0;
    el.clear.disabled = strokes.length === 0;
  }

  function renderGuessers() {
    el.guessers.textContent = '';

    state.players.forEach(function (player, index) {
      if (index === state.drawer) return;
      var item = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'mr-guesser';
      button.dataset.index = String(index);
      button.textContent = player.name;
      item.appendChild(button);
      el.guessers.appendChild(item);
    });
  }

  function renderScores() {
    el.scoreList.textContent = '';

    var ranked = state.players.slice().sort(function (a, b) { return b.score - a.score; });
    var best = ranked.length ? ranked[0].score : 0;
    var medals = ['🥇', '🥈', '🥉'];

    ranked.forEach(function (player, index) {
      var item = document.createElement('li');
      var row = document.createElement('div');
      row.className = 'score-row' + (best > 0 && player.score === best ? ' score-row--lead' : '');

      var rank = document.createElement('span');
      rank.className = 'score-row__rank';
      rank.textContent = player.score > 0 && index < 3 ? medals[index] : String(index + 1) + '.';

      var name = document.createElement('span');
      name.className = 'score-row__name';
      name.textContent = player.name;

      var points = document.createElement('span');
      points.className = 'score-row__points';
      points.textContent = String(player.score);

      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(points);
      item.appendChild(row);
      el.scoreList.appendChild(item);
    });
  }

  function render() {
    var covered = !!state.curtain;
    var phase = state.phase;

    el.curtain.hidden = !covered;
    el.main.hidden = covered;
    el.actionbar.hidden = covered || phase === 'resolve';
    el.main.classList.toggle('no-actionbar', phase === 'resolve');

    if (covered) {
      el.curtainTitle.textContent = state.curtain.title;
      el.curtainNote.textContent = state.curtain.note;
      /* Hinter dem Sichtschutz darf der Begriff nicht stehen bleiben. */
      el.secretWord.textContent = '';
      stopTimer();
      return;
    }

    el.setup.hidden = phase !== 'setup';
    el.word.hidden = phase !== 'word';
    el.draw.hidden = phase !== 'draw';
    el.resolve.hidden = phase !== 'resolve';
    el.setupActions.hidden = phase !== 'setup';
    el.wordActions.hidden = phase !== 'word';
    el.drawActions.hidden = phase !== 'draw';

    if (phase === 'word') {
      el.secretWord.textContent = state.word;
      el.swapWord.hidden = state.swapped;
      el.swapHint.textContent = state.swapped
        ? 'Zweiter Begriff – jetzt gilt er.'
        : 'Nicht laut sagen. Zeigen geht auch nicht.';
    }

    if (phase === 'draw') {
      el.drawerName.textContent = drawerName() + ' zeichnet';
      el.roundNumber.textContent = String(state.round);
      renderTools();
      sizeCanvas();
    } else {
      stopTimer();
    }

    if (phase === 'resolve') {
      el.resolveWord.textContent = 'Der Begriff war: ' + state.word;
      renderGuessers();
    }

    el.playerSummary.textContent = state.players.length
      ? state.players.map(function (p) { return p.name + ' ' + p.score; }).join(' · ')
      : 'Noch keine Partie begonnen.';

    Array.prototype.forEach.call(el.timePicker.querySelectorAll('button'), function (button) {
      button.setAttribute('aria-pressed', Number(button.dataset.time) === state.time ? 'true' : 'false');
    });
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

  /* ---------------- Verdrahtung ---------------- */

  function startGame() {
    var names = roster.values();
    if (names.length < MIN_PLAYERS) { TG.toast('Bitte mindestens zwei Namen eintragen'); return; }

    var previous = {};
    state.players.forEach(function (player) { previous[player.name] = player.score; });

    state.players = names.map(function (name) {
      return { name: name, score: previous[name] || 0 };
    });
    state.drawer = 0;
    state.round = 1;
    save();
    startRound();
  }

  function toSetup() {
    stopTimer();
    state.phase = 'setup';
    state.curtain = null;
    strokes = [];
    roster.set(state.players.length
      ? state.players.map(function (p) { return p.name; })
      : ['', '', '']);
    save();
    render();
  }

  function bindEvents() {
    el.startGame.addEventListener('click', startGame);

    el.nameList.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); startGame(); }
    });

    el.swapWord.addEventListener('click', function () {
      if (state.swapped) return;
      state.word = pickWord();
      state.swapped = true;
      save();
      render();
    });

    el.startDraw.addEventListener('click', function () {
      state.phase = 'draw';
      strokes = [];
      save();
      render();
      startTimer();
    });

    el.curtainGo.addEventListener('click', leaveCurtain);

    el.colors.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.mr-color') : null;
      if (!button) return;
      colorId = button.dataset.color;
      renderTools();
    });

    el.undo.addEventListener('click', function () {
      strokes.pop();
      repaint();
      renderTools();
    });

    el.clear.addEventListener('click', function () {
      strokes = [];
      repaint();
      renderTools();
    });

    el.guessed.addEventListener('click', function () {
      stopTimer();
      state.phase = 'resolve';
      save();
      render();
    });

    el.giveUp.addEventListener('click', function () {
      stopTimer();
      finishRound(null);
    });

    el.guessers.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.mr-guesser') : null;
      if (!button) return;
      finishRound(Number(button.dataset.index));
    });

    el.nobody.addEventListener('click', function () { finishRound(null); });

    el.openScores.addEventListener('click', function () {
      closeDialog(el.settings);
      renderScores();
      openDialog(el.scores);
    });
    el.closeScores.addEventListener('click', function () { closeDialog(el.scores); });
    el.scores.addEventListener('click', function (event) {
      if (event.target === el.scores) closeDialog(el.scores);
    });

    el.shareScores.addEventListener('click', function () {
      var lines = state.players.slice()
        .sort(function (a, b) { return b.score - a.score; })
        .map(function (p, i) { return (i + 1) + '. ' + p.name + ' – ' + p.score; });
      TG.share({ title: 'Malen und Raten', text: '🎨 Malen und Raten\n' + lines.join('\n'), url: TG.pageUrl() })
        .then(function (result) { TG.reportShare(result, 'Stand kopiert'); });
    });

    el.resetScores.addEventListener('click', function () {
      askConfirm('Punkte zurücksetzen?', 'Alle Punkte gehen auf null, die Namen bleiben.', 'Zurücksetzen')
        .then(function (yes) {
          if (!yes) return;
          state.players.forEach(function (player) { player.score = 0; });
          save();
          renderScores();
          render();
          TG.toast('Punkte zurückgesetzt');
        });
    });

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.timePicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-time]') : null;
      if (!button) return;
      state.time = Number(button.dataset.time);
      save();
      render();
      TG.toast(state.time ? state.time + ' Sekunden' : 'Ohne Uhr');
    });

    el.levelPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-level]') : null;
      if (!button) return;
      state.level = button.dataset.level;
      save();
      render();
      TG.toast('Begriffe: ' + button.textContent);
    });

    el.editPlayers.addEventListener('click', function () {
      closeDialog(el.settings);
      toSetup();
    });

    el.resetGame.addEventListener('click', function () {
      askConfirm('Partie abbrechen?', 'Punkte und Namen gehen verloren.', 'Abbrechen')
        .then(function (yes) {
          if (!yes) return;
          closeDialog(el.settings);
          state = emptyState();
          toSetup();
          TG.toast('Partie abgebrochen');
        });
    });

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  function init() {
    var saved = TG.store.get(STATE_KEY, null);
    state = isValidState(saved) ? saved : emptyState();
    if (TIMES.indexOf(state.time) < 0) state.time = 60;
    if (LEVELS.indexOf(state.level) < 0) state.level = 'mittel';
    if (!Array.isArray(state.recent)) state.recent = [];
    if (state.phase !== 'setup' && state.players.length < MIN_PLAYERS) state.phase = 'setup';
    if (state.phase === 'setup') roster.set(['', '', '']);

    if (!TG.store.available) {
      el.storageHint.textContent = 'Hinweis: Dieser Browser erlaubt keinen lokalen Speicher – Namen und Punkte gehen beim Schließen verloren.';
    }

    save();
    render();
    bindEvents();
    bindCanvas();
    if (state.phase === 'draw') startTimer();
    TG.registerServiceWorker('../../sw.js');
  }

  init();
})(window, document);
