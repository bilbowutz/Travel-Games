/* Wer würde eher …? – Spiellogik.
   Die Fragenreihenfolge entsteht aus einem Startwert, der als kurzer Code
   teilbar ist: gleicher Code = gleiche Fragen in gleicher Reihenfolge.
   Die Punkte zählt jedes Handy für sich, gespeichert wird nur lokal. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var STATE_KEY = 'wwe.state';
  var STATE_VERSION = 1;
  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 10;
  var MAX_NAME = 16;

  var QUESTIONS = TG.wwePack.questions;

  var el = {
    setup: document.getElementById('setup'),
    play: document.getElementById('play'),
    nameList: document.getElementById('name-list'),
    addPlayer: document.getElementById('add-player'),
    setupActions: document.getElementById('setup-actions'),
    playActions: document.getElementById('play-actions'),
    startGame: document.getElementById('start-game'),
    nextQuestion: document.getElementById('next-question'),
    question: document.getElementById('question'),
    questionCard: document.querySelector('.question-card'),
    playHint: document.querySelector('.play-hint'),
    playerGrid: document.getElementById('player-grid'),
    qIndex: document.getElementById('q-index'),
    qTotal: document.getElementById('q-total'),
    qProgress: document.getElementById('q-progress'),
    qFill: document.getElementById('q-fill'),
    scores: document.getElementById('scores'),
    scoresTitle: document.getElementById('scores-title'),
    scoreList: document.getElementById('score-list'),
    openScores: document.getElementById('open-scores'),
    closeScores: document.getElementById('close-scores'),
    shareScores: document.getElementById('share-scores'),
    newRound: document.getElementById('new-round'),
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
    resetScores: document.getElementById('reset-scores'),
    storageHint: document.getElementById('storage-hint'),
    confirm: document.getElementById('confirm'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmText: document.getElementById('confirm-text'),
    confirmOk: document.getElementById('confirm-ok'),
    confirmCancel: document.getElementById('confirm-cancel')
  };

  var state = null;
  var editing = false;

  var roster = TG.nameEditor(el.nameList, {
    min: MIN_PLAYERS,
    max: MAX_PLAYERS,
    maxLength: MAX_NAME,
    addButton: el.addPlayer
  });

  /* ---------------- Zustand ---------------- */

  function buildOrder(seed) {
    var indexes = [];
    for (var i = 0; i < QUESTIONS.length; i++) indexes.push(i);
    return TG.shuffle(indexes, TG.rng(seed));
  }

  function buildState(seed, players) {
    if (typeof seed !== 'number') seed = TG.randomSeed();
    return {
      v: STATE_VERSION,
      seed: seed,
      code: TG.code.fromNumber(seed),
      order: buildOrder(seed),
      index: 0,
      players: players || []
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      typeof candidate.code === 'string' &&
      Array.isArray(candidate.order) &&
      candidate.order.length > 0 &&
      Array.isArray(candidate.players);
  }

  function save() {
    TG.store.set(STATE_KEY, state);
  }

  function isFinished() {
    return state.index >= state.order.length;
  }

  function currentQuestion() {
    var questionIndex = state.order[state.index];
    return QUESTIONS[questionIndex] || QUESTIONS[0];
  }

  function ready() {
    return state.players.length >= MIN_PLAYERS;
  }

  /* ---------------- Namen eintragen ---------------- */

  function showSetup() {
    editing = true;
    roster.set(state.players.length
      ? state.players.map(function (p) { return p.name; })
      : ['', '', '']);
    render();
  }

  function startFromDraft() {
    var names = roster.values();

    if (names.length < MIN_PLAYERS) {
      TG.toast('Bitte mindestens zwei Namen eintragen');
      return;
    }

    // Punkte behalten, wenn der Name schon dabei war
    var previous = {};
    state.players.forEach(function (p) { previous[p.name] = p.score; });

    state.players = names.map(function (name) {
      return { name: name, score: previous[name] || 0 };
    });

    editing = false;
    save();
    render();
    TG.toast('Los geht’s!');
  }

  /* ---------------- Darstellung ---------------- */

  function render() {
    var showPlay = ready() && !editing;

    el.setup.hidden = showPlay;
    el.play.hidden = !showPlay;
    el.setupActions.hidden = showPlay;
    el.playActions.hidden = !showPlay;

    if (showPlay) renderPlay();
    renderCode();
    renderPlayerSummary();
  }

  function renderPlay() {
    var done = isFinished();
    var shown = Math.min(state.index + 1, state.order.length);

    el.qIndex.textContent = String(done ? state.order.length : shown);
    el.qTotal.textContent = String(state.order.length);

    var percent = Math.round((state.index / state.order.length) * 100);
    el.qFill.style.width = percent + '%';
    el.qProgress.setAttribute('aria-valuenow', String(percent));

    if (done) {
      el.question.textContent = 'Alle ' + state.order.length + ' Fragen gespielt! 🎉';
      el.questionCard.querySelector('.question-card__lead').textContent = 'Runde vorbei';
      el.playHint.textContent = 'Punktestand ansehen oder eine neue Runde starten.';
      el.playerGrid.hidden = true;
      el.nextQuestion.disabled = true;
      return;
    }

    el.questionCard.querySelector('.question-card__lead').textContent = 'Wer würde eher …';
    el.question.textContent = currentQuestion() + '?';
    el.playHint.textContent = 'Tippt auf die Person, auf die die meisten zeigen – oder auf „Weiter“.';
    el.playerGrid.hidden = false;
    el.nextQuestion.disabled = false;

    el.questionCard.classList.remove('is-new');
    void el.questionCard.offsetWidth; // Animation neu starten
    el.questionCard.classList.add('is-new');

    renderPlayers();
  }

  function renderPlayers() {
    el.playerGrid.textContent = '';

    state.players.forEach(function (player, index) {
      var item = document.createElement('li');

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'player-btn';
      button.dataset.index = String(index);
      button.setAttribute('aria-label', player.name + ' bekommt den Punkt, Stand ' + player.score);

      var name = document.createElement('span');
      name.className = 'player-btn__name';
      name.textContent = player.name;

      var score = document.createElement('span');
      score.className = 'player-btn__score';
      score.textContent = String(player.score);

      button.appendChild(name);
      button.appendChild(score);
      item.appendChild(button);
      el.playerGrid.appendChild(item);
    });
  }

  function renderCode() {
    el.gameCode.textContent = TG.code.format(state.code);
  }

  function renderPlayerSummary() {
    el.playerSummary.textContent = state.players.length
      ? state.players.map(function (p) { return p.name; }).join(', ')
      : 'Noch keine Namen eingetragen.';
  }

  function renderScores(finished) {
    el.scoresTitle.textContent = finished ? 'Runde vorbei 🎉' : 'Punktestand';
    el.scoreList.textContent = '';

    var ranked = state.players.slice().sort(function (a, b) { return b.score - a.score; });
    var best = ranked.length ? ranked[0].score : 0;
    var medals = ['🥇', '🥈', '🥉'];

    ranked.forEach(function (player, index) {
      var row = document.createElement('li');
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
      el.scoreList.appendChild(row);
    });

    el.closeScores.textContent = finished ? 'Schließen' : 'Weiterspielen';
  }

  /* ---------------- Spielzüge ---------------- */

  function advance() {
    state.index = Math.min(state.index + 1, state.order.length);
    save();
    renderPlay();

    if (isFinished()) {
      TG.confetti(170);
      openScores(true);
    }
  }

  function award(index) {
    var player = state.players[index];
    if (!player || isFinished()) return;

    player.score++;
    TG.haptic(14);

    var button = el.playerGrid.querySelector('.player-btn[data-index="' + index + '"]');
    if (button) {
      button.classList.add('is-awarded');
      button.querySelector('.player-btn__score').textContent = String(player.score);
    }

    save();
    window.setTimeout(advance, 260);
  }

  function newRound() {
    state = buildState(undefined, state.players.map(function (p) {
      return { name: p.name, score: 0 };
    }));
    save();
    render();
    TG.toast('Neue Runde – neue Fragen!');
  }

  /* ---------------- Teilen ---------------- */

  function gameUrl() {
    return TG.pageUrl() + '#c=' + state.code;
  }

  function scoreText() {
    var ranked = state.players.slice().sort(function (a, b) { return b.score - a.score; });
    var medals = ['🥇', '🥈', '🥉'];

    var lines = ranked.map(function (player, index) {
      var mark = player.score > 0 && index < 3 ? medals[index] : (index + 1) + '.';
      return mark + ' ' + player.name + ' – ' + player.score;
    });

    return '🤔 Wer würde eher …? (Code ' + TG.code.format(state.code) + ')\n' + lines.join('\n');
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

  function openScores(finished) {
    renderScores(!!finished);
    openDialog(el.scores);
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

  function closeOnBackdrop(dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) closeDialog(dialog);
    });
  }

  /* ---------------- Verdrahtung ---------------- */

  function bindEvents() {
    el.startGame.addEventListener('click', startFromDraft);

    el.nameList.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        startFromDraft();
      }
    });

    el.playerGrid.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.player-btn') : null;
      if (!button) return;
      award(Number(button.dataset.index));
    });

    el.nextQuestion.addEventListener('click', function () {
      if (isFinished()) return;
      TG.haptic(6);
      advance();
    });

    el.openScores.addEventListener('click', function () { openScores(isFinished()); });
    el.closeScores.addEventListener('click', function () { closeDialog(el.scores); });
    closeOnBackdrop(el.scores);

    el.newRound.addEventListener('click', function () {
      askConfirm('Neue Runde?', 'Die Fragen werden neu gemischt und alle Punkte auf null gesetzt.', 'Neue Runde')
        .then(function (yes) {
          if (!yes) return;
          closeDialog(el.scores);
          newRound();
        });
    });

    el.shareScores.addEventListener('click', function () {
      TG.share({
        title: 'Wer würde eher …?',
        text: scoreText(),
        url: gameUrl()
      }).then(function (result) {
        TG.reportShare(result, 'Punktestand kopiert');
      });
    });

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    closeOnBackdrop(el.settings);

    el.shareGame.addEventListener('click', function () {
      TG.share({
        title: 'Wer würde eher …?',
        text: 'Spielt mit bei „Wer würde eher …?“ Code: ' + TG.code.format(state.code),
        url: gameUrl()
      }).then(function (result) {
        TG.reportShare(result, 'Link kopiert – jetzt einfügen und verschicken');
      });
    });

    el.showQr.addEventListener('click', function () {
      TG.showQrDialog(gameUrl(), {
        title: 'Mitspielen: Runde scannen',
        caption: TG.code.format(state.code)
      });
    });

    el.editPlayers.addEventListener('click', function () {
      closeDialog(el.settings);
      showSetup();
    });

    el.resetScores.addEventListener('click', function () {
      askConfirm('Punkte zurücksetzen?', 'Alle Punkte werden auf null gesetzt, die Fragen bleiben.', 'Zurücksetzen')
        .then(function (yes) {
          if (!yes) return;
          state.players.forEach(function (player) { player.score = 0; });
          save();
          render();
          TG.toast('Punkte zurückgesetzt');
        });
    });

    el.codeForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var typed = TG.code.clean(el.codeInput.value);
      var seed = TG.code.toNumber(typed);

      if (seed === null) {
        TG.toast('Code nicht erkannt – bitte prüfen');
        return;
      }
      if (typed === state.code) {
        el.codeInput.value = '';
        TG.toast('Das ist schon eure Runde 🙂');
        return;
      }

      function apply() {
        el.codeInput.value = '';
        applySeed(seed);
        TG.toast('Fragenrunde ' + TG.code.format(state.code) + ' geladen');
      }

      if (state.index === 0) { apply(); return; }
      askConfirm('Fragen wechseln?', 'Ihr startet bei Frage 1 der neuen Runde. Die Punkte bleiben.', 'Wechseln')
        .then(function (yes) { if (yes) apply(); });
    });

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  function applySeed(seed) {
    state = buildState(seed, state.players);
    save();
    render();
  }

  /* ---------------- Start ---------------- */

  function init() {
    var saved = TG.store.get(STATE_KEY, null);
    var sharedCode = TG.codeFromLocation();
    var sharedSeed = TG.code.toNumber(sharedCode);

    if (isValidState(saved)) {
      state = saved;
      // Deck kann gewachsen sein – Reihenfolge dann neu aus dem Startwert ableiten
      if (state.order.length !== QUESTIONS.length) {
        state.order = buildOrder(state.seed);
        state.index = Math.min(state.index, state.order.length);
      }
    } else {
      state = buildState();
    }

    if (sharedSeed !== null && sharedCode !== state.code) {
      state = buildState(sharedSeed, state.players);
      TG.toast('Gemeinsame Fragenrunde ' + TG.code.format(state.code) + ' geladen', { duration: 2600 });
    }

    save();
    TG.clearHash();

    if (!TG.store.available) {
      el.storageHint.textContent = 'Hinweis: Dieser Browser erlaubt keinen lokalen Speicher – Namen und Punkte gehen beim Schließen verloren.';
    }

    if (!ready()) showSetup();
    else render();

    bindEvents();
    TG.registerServiceWorker('../../sw.js');
  }

  init();
})(window, document);
