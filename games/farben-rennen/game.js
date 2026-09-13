/* Farben-Rennen – Spiellogik.
   Die Farbverteilung entsteht aus einem Startwert, der zusammen mit dem Ziel
   als kurzer Code teilbar ist. Gezählt wird lokal auf jedem Gerät. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var STATE_KEY = 'farbenrennen.state';
  var STATE_VERSION = 1;
  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 8;
  var MAX_NAME = 16;
  var TARGETS = [5, 10, 20, 0]; /* 0 = ohne Ziel */
  var DEFAULT_TARGET = 10;
  var MAX_HISTORY = 400;

  var el = {
    setup: document.getElementById('setup'),
    play: document.getElementById('play'),
    nameList: document.getElementById('name-list'),
    addPlayer: document.getElementById('add-player'),
    setupActions: document.getElementById('setup-actions'),
    playActions: document.getElementById('play-actions'),
    startGame: document.getElementById('start-game'),
    grid: document.getElementById('color-grid'),
    targetLabel: document.getElementById('target-label'),
    raceProgress: document.getElementById('race-progress'),
    raceFill: document.getElementById('race-fill'),
    leaderChip: document.getElementById('leader-chip'),
    leaderName: document.getElementById('leader-name'),
    playHint: document.getElementById('play-hint'),
    undo: document.getElementById('undo'),
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
    targetPicker: document.getElementById('target-picker'),
    gameCode: document.getElementById('game-code'),
    shareGame: document.getElementById('share-game'),
    showQr: document.getElementById('show-qr'),
    codeForm: document.getElementById('code-form'),
    codeInput: document.getElementById('code-input'),
    playerSummary: document.getElementById('player-summary'),
    redeal: document.getElementById('redeal'),
    editPlayers: document.getElementById('edit-players'),
    resetAll: document.getElementById('reset-all'),
    storageHint: document.getElementById('storage-hint'),
    confirm: document.getElementById('confirm'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmText: document.getElementById('confirm-text'),
    confirmOk: document.getElementById('confirm-ok'),
    confirmCancel: document.getElementById('confirm-cancel')
  };

  var state = null;
  var editing = false;
  var tileNodes = [];

  var roster = TG.nameEditor(el.nameList, {
    min: MIN_PLAYERS,
    max: MAX_PLAYERS,
    maxLength: MAX_NAME,
    addButton: el.addPlayer
  });

  /* ---------------- Code <-> Rennen ---------------- */

  function encodeCode(seed, target) {
    return TG.code.fromNumber(seed * 4 + TARGETS.indexOf(target));
  }

  function decodeCode(text) {
    var value = TG.code.toNumber(text);
    if (value === null) return null;
    return { seed: Math.floor(value / 4), target: TARGETS[value % 4] };
  }

  /* ---------------- Zustand ---------------- */

  /* Farben werden aus dem Startwert gezogen – gleicher Code, gleiche Verteilung. */
  function dealColors(players, seed) {
    var deck = TG.shuffle(TG.carColors, TG.rng(seed));
    players.forEach(function (player, index) {
      player.colorId = deck[index % deck.length].id;
    });
    return players;
  }

  function buildState(seed, target, players) {
    if (typeof seed !== 'number') seed = TG.randomSeed();
    if (typeof target !== 'number') target = DEFAULT_TARGET;

    var list = (players || []).map(function (player) {
      return { name: player.name, colorId: player.colorId, count: 0, wins: player.wins || 0 };
    });

    return {
      v: STATE_VERSION,
      seed: seed,
      code: encodeCode(seed, target),
      target: target,
      players: dealColors(list, seed),
      history: [],
      finished: false
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      typeof candidate.code === 'string' &&
      TARGETS.indexOf(candidate.target) > -1 &&
      Array.isArray(candidate.players) &&
      Array.isArray(candidate.history);
  }

  function save() {
    TG.store.set(STATE_KEY, state);
  }

  function ready() {
    return state.players.length >= MIN_PLAYERS;
  }

  function leaderIndex() {
    var best = -1;
    for (var i = 0; i < state.players.length; i++) {
      if (best < 0 || state.players[i].count > state.players[best].count) best = i;
    }
    return best;
  }

  function isTied() {
    var best = leaderIndex();
    if (best < 0 || state.players[best].count === 0) return true;
    return state.players.filter(function (player) {
      return player.count === state.players[best].count;
    }).length > 1;
  }

  /* ---------------- Darstellung ---------------- */

  function render() {
    var showPlay = ready() && !editing;

    el.setup.hidden = showPlay;
    el.play.hidden = !showPlay;
    el.setupActions.hidden = showPlay;
    el.playActions.hidden = !showPlay;

    if (showPlay) renderTiles();
    renderCode();
    renderTargetPicker();
    renderPlayerSummary();
  }

  function renderTiles() {
    el.grid.textContent = '';
    tileNodes = [];

    var winner = state.finished ? leaderIndex() : -1;

    state.players.forEach(function (player, index) {
      var color = TG.carColorById(player.colorId);
      var item = document.createElement('li');

      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'color-tile' + (index === winner ? ' is-winner' : '');
      tile.dataset.index = String(index);
      tile.dataset.ink = color.ink;
      tile.style.setProperty('--tile', color.hex);
      tile.disabled = state.finished;
      tile.setAttribute('aria-label',
        player.name + ', Farbe ' + color.name + ', ' + player.count +
        (player.count === 1 ? ' Auto' : ' Autos'));

      var colorName = document.createElement('span');
      colorName.className = 'color-tile__color';
      colorName.textContent = color.name;

      var name = document.createElement('span');
      name.className = 'color-tile__name';
      name.textContent = player.name;

      var count = document.createElement('span');
      count.className = 'color-tile__count';
      count.textContent = String(player.count);

      var bar = document.createElement('span');
      bar.className = 'color-tile__bar';
      bar.setAttribute('aria-hidden', 'true');
      bar.hidden = state.target === 0;
      if (state.target > 0) {
        bar.style.setProperty('--progress', Math.min(100, player.count / state.target * 100) + '%');
      }

      tile.appendChild(colorName);
      tile.appendChild(name);
      tile.appendChild(count);
      tile.appendChild(bar);
      item.appendChild(tile);
      el.grid.appendChild(item);
      tileNodes.push(tile);
    });

    renderStatus();
  }

  function renderStatus() {
    el.targetLabel.textContent = state.target === 0 ? 'Freies Zählen' : 'Ziel ' + state.target;

    var best = leaderIndex();
    var bestCount = best >= 0 ? state.players[best].count : 0;
    var percent = state.target > 0 ? Math.min(100, Math.round(bestCount / state.target * 100)) : 0;

    el.raceFill.style.width = percent + '%';
    el.raceProgress.setAttribute('aria-valuenow', String(percent));
    el.raceProgress.hidden = state.target === 0;

    if (bestCount === 0) {
      el.leaderChip.hidden = true;
    } else {
      el.leaderChip.hidden = false;
      el.leaderName.textContent = isTied()
        ? 'Gleichstand'
        : state.players[best].name + ' ' + bestCount;
    }

    el.undo.disabled = state.history.length === 0;

    el.playHint.textContent = state.finished
      ? 'Runde vorbei – „Stand“ öffnen für eine neue Runde.'
      : 'Tippt auf eure Farbe, sobald ihr so ein Auto seht.';
  }

  function renderCode() {
    el.gameCode.textContent = TG.code.format(state.code);
  }

  function renderTargetPicker() {
    Array.prototype.forEach.call(el.targetPicker.querySelectorAll('button'), function (button) {
      button.setAttribute('aria-pressed', Number(button.dataset.target) === state.target ? 'true' : 'false');
    });
  }

  function renderPlayerSummary() {
    el.playerSummary.textContent = state.players.length
      ? state.players.map(function (player) {
          return player.name + ' (' + TG.carColorById(player.colorId).name + ')';
        }).join(', ')
      : 'Noch keine Namen eingetragen.';
  }

  function renderScores(finished) {
    var best = leaderIndex();
    var bestCount = best >= 0 ? state.players[best].count : 0;

    el.scoresTitle.textContent = finished
      ? '🏁 ' + state.players[best].name + ' gewinnt!'
      : 'Zwischenstand';

    el.scoreList.textContent = '';

    state.players.slice()
      .sort(function (a, b) { return b.count - a.count; })
      .forEach(function (player) {
        var color = TG.carColorById(player.colorId);
        var row = document.createElement('li');
        row.className = 'score-row' +
          (bestCount > 0 && player.count === bestCount ? ' score-row--lead' : '');

        var dot = document.createElement('span');
        dot.className = 'score-row__dot';
        dot.style.setProperty('--tile', color.hex);
        dot.setAttribute('aria-hidden', 'true');

        var name = document.createElement('span');
        name.className = 'score-row__name';
        name.textContent = player.name + ' · ' + color.name;

        var wins = document.createElement('span');
        wins.className = 'score-row__wins';
        wins.textContent = player.wins ? player.wins + '× 🏆' : '';

        var points = document.createElement('span');
        points.className = 'score-row__points';
        points.textContent = String(player.count);

        row.appendChild(dot);
        row.appendChild(name);
        row.appendChild(wins);
        row.appendChild(points);
        el.scoreList.appendChild(row);
      });

    el.closeScores.textContent = finished ? 'Schließen' : 'Weiterspielen';
  }

  /* ---------------- Spielzüge ---------------- */

  function count(index) {
    var player = state.players[index];
    if (!player || state.finished) return;

    player.count++;
    state.history.push(index);
    if (state.history.length > MAX_HISTORY) state.history.shift();
    TG.haptic(12);

    var tile = tileNodes[index];
    if (tile) {
      tile.querySelector('.color-tile__count').textContent = String(player.count);
      tile.classList.remove('is-counting');
      void tile.offsetWidth; /* Animation neu starten */
      tile.classList.add('is-counting');
      if (state.target > 0) {
        tile.querySelector('.color-tile__bar')
          .style.setProperty('--progress', Math.min(100, player.count / state.target * 100) + '%');
      }
    }

    if (state.target > 0 && player.count >= state.target) {
      state.finished = true;
      player.wins = (player.wins || 0) + 1;
      save();
      renderTiles();
      TG.haptic([0, 40, 60, 40]);
      TG.confetti(190);
      openScores(true);
      return;
    }

    save();
    renderStatus();
  }

  function undo() {
    if (!state.history.length) return;

    var index = state.history.pop();
    var player = state.players[index];

    if (player && player.count > 0) player.count--;

    if (state.finished) {
      state.finished = false;
      if (player && player.wins) player.wins--;
    }

    TG.haptic(6);
    save();
    renderTiles();
    TG.toast('Letzter Tipp zurückgenommen');
  }

  function newRound(seed, target) {
    state = buildState(
      typeof seed === 'number' ? seed : state.seed,
      typeof target === 'number' ? target : state.target,
      state.players
    );
    save();
    render();
  }

  /* ---------------- Teilen ---------------- */

  function gameUrl() {
    return TG.pageUrl() + '#c=' + state.code;
  }

  function scoreText() {
    var lines = state.players.slice()
      .sort(function (a, b) { return b.count - a.count; })
      .map(function (player) {
        return player.name + ' (' + TG.carColorById(player.colorId).name + ') – ' + player.count;
      });

    return '🎨 Farben-Rennen ' + TG.code.format(state.code) +
      (state.target ? ' · Ziel ' + state.target : '') + '\n' + lines.join('\n');
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

  function hasProgress() {
    return state.players.some(function (player) { return player.count > 0; });
  }

  /* ---------------- Start ---------------- */

  function showSetup() {
    editing = true;
    roster.set(state.players.length
      ? state.players.map(function (player) { return player.name; })
      : ['', '', '']);
    render();
  }

  function startFromDraft() {
    var names = roster.values();

    if (names.length < MIN_PLAYERS) {
      TG.toast('Bitte mindestens zwei Namen eintragen');
      return;
    }

    var previous = {};
    state.players.forEach(function (player) { previous[player.name] = player; });

    var players = names.map(function (name) {
      var old = previous[name];
      return { name: name, count: 0, wins: old ? old.wins || 0 : 0 };
    });

    state = buildState(TG.randomSeed(), state.target, players);
    editing = false;
    save();
    render();
    TG.toast('Farben verteilt – gute Fahrt!');
  }

  function bindEvents() {
    el.startGame.addEventListener('click', startFromDraft);

    el.nameList.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        startFromDraft();
      }
    });

    el.grid.addEventListener('click', function (event) {
      var tile = event.target.closest ? event.target.closest('.color-tile') : null;
      if (!tile || tile.disabled) return;
      count(Number(tile.dataset.index));
    });

    el.undo.addEventListener('click', undo);

    el.openScores.addEventListener('click', function () { openScores(state.finished); });
    el.closeScores.addEventListener('click', function () { closeDialog(el.scores); });
    closeOnBackdrop(el.scores);

    el.newRound.addEventListener('click', function () {
      function apply() {
        closeDialog(el.scores);
        newRound();
        TG.toast('Neue Runde – Zähler auf null');
      }
      if (state.finished || !hasProgress()) { apply(); return; }
      askConfirm('Neue Runde?', 'Alle Zähler gehen auf null, die Farben bleiben.', 'Neue Runde')
        .then(function (yes) { if (yes) apply(); });
    });

    el.shareScores.addEventListener('click', function () {
      TG.share({ title: 'Farben-Rennen', text: scoreText(), url: gameUrl() })
        .then(function (result) { TG.reportShare(result, 'Stand kopiert'); });
    });

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    closeOnBackdrop(el.settings);

    el.targetPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-target]') : null;
      if (!button) return;
      var target = Number(button.dataset.target);
      if (target === state.target) return;

      function apply() {
        newRound(state.seed, target);
        TG.toast(target === 0 ? 'Freies Zählen' : 'Neues Ziel: ' + target);
      }

      if (!hasProgress()) { apply(); return; }
      askConfirm('Ziel ändern?', 'Dafür startet eine neue Runde, die Zähler gehen auf null.', 'Ändern')
        .then(function (yes) { if (yes) apply(); });
    });

    el.shareGame.addEventListener('click', function () {
      TG.share({
        title: 'Farben-Rennen',
        text: 'Fahrt mit beim Farben-Rennen! Code: ' + TG.code.format(state.code),
        url: gameUrl()
      }).then(function (result) {
        TG.reportShare(result, 'Link kopiert – jetzt einfügen und verschicken');
      });
    });

    el.showQr.addEventListener('click', function () {
      TG.showQrDialog(gameUrl(), {
        title: 'Mitspielen: Rennen scannen',
        caption: TG.code.format(state.code)
      });
    });

    el.redeal.addEventListener('click', function () {
      function apply() {
        newRound(TG.randomSeed());
        TG.toast('Farben neu verteilt');
      }
      if (!hasProgress()) { apply(); return; }
      askConfirm('Farben neu verteilen?', 'Alle Zähler gehen dabei auf null.', 'Neu verteilen')
        .then(function (yes) { if (yes) apply(); });
    });

    el.editPlayers.addEventListener('click', function () {
      closeDialog(el.settings);
      showSetup();
    });

    el.resetAll.addEventListener('click', function () {
      askConfirm('Alles löschen?', 'Zähler und gewonnene Runden werden auf null gesetzt.', 'Löschen')
        .then(function (yes) {
          if (!yes) return;
          state.players.forEach(function (player) { player.wins = 0; });
          newRound();
          TG.toast('Zähler und Siege gelöscht');
        });
    });

    el.codeForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var typed = TG.code.clean(el.codeInput.value);
      var decoded = decodeCode(typed);

      if (!decoded) {
        TG.toast('Code nicht erkannt – bitte prüfen');
        return;
      }
      if (typed === state.code) {
        el.codeInput.value = '';
        TG.toast('Das ist schon euer Rennen 🙂');
        return;
      }

      function apply() {
        el.codeInput.value = '';
        newRound(decoded.seed, decoded.target);
        TG.toast('Rennen ' + TG.code.format(state.code) + ' geladen');
      }

      if (!hasProgress()) { apply(); return; }
      askConfirm('Rennen wechseln?', 'Farben werden neu verteilt und die Zähler gehen auf null.', 'Wechseln')
        .then(function (yes) { if (yes) apply(); });
    });

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  function init() {
    var saved = TG.store.get(STATE_KEY, null);
    var shared = decodeCode(TG.codeFromLocation());

    state = isValidState(saved) ? saved : buildState(undefined, DEFAULT_TARGET, []);

    if (shared && shared.seed * 4 + TARGETS.indexOf(shared.target) !== TG.code.toNumber(state.code)) {
      state = buildState(shared.seed, shared.target, state.players);
      TG.toast('Gemeinsames Rennen ' + TG.code.format(state.code) + ' geladen', { duration: 2600 });
    }

    save();
    TG.clearHash();

    if (!TG.store.available) {
      el.storageHint.textContent = 'Hinweis: Dieser Browser erlaubt keinen lokalen Speicher – Namen und Zähler gehen beim Schließen verloren.';
    }

    if (!ready()) showSetup();
    else render();

    bindEvents();
    TG.registerServiceWorker('../../sw.js');
  }

  init();
})(window, document);
