/* Begriffe erklären – zu zweit auf einem Handy.
   Wer dran ist, hält das Gerät und sieht den Begriff; der andere schaut weg.
   Die Uhr läuft nach echter Zeit, damit sie auch weiterläuft, wenn das Handy
   zwischendurch aus- und wieder angeht. Gespeichert wird nur lokal. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var E = TG.explain;
  var STATE_KEY = 'begriffe.state';
  var OWN_KEY = 'begriffe.eigene';
  var STATE_VERSION = 1;

  var el = {
    main: document.querySelector('.game-main'),
    actionbar: document.querySelector('.actionbar'),
    setup: document.getElementById('setup'),
    turn: document.getElementById('turn'),
    turnover: document.getElementById('turnover'),
    over: document.getElementById('over'),
    nameList: document.getElementById('name-list'),
    setupSummary: document.getElementById('setup-summary'),
    setupActions: document.getElementById('setup-actions'),
    turnActions: document.getElementById('turn-actions'),
    turnoverActions: document.getElementById('turnover-actions'),
    overActions: document.getElementById('over-actions'),
    startGame: document.getElementById('start-game'),
    clock: document.getElementById('clock'),
    clockFill: document.getElementById('clock-fill'),
    clockTime: document.getElementById('clock-time'),
    word: document.getElementById('word'),
    tally: document.getElementById('tally'),
    skip: document.getElementById('skip'),
    gotIt: document.getElementById('got-it'),
    turnoverTitle: document.getElementById('turnover-title'),
    turnoverText: document.getElementById('turnover-text'),
    recap: document.getElementById('recap'),
    nextTurn: document.getElementById('next-turn'),
    overTitle: document.getElementById('over-title'),
    overText: document.getElementById('over-text'),
    standings: document.getElementById('standings'),
    newNames: document.getElementById('new-names'),
    rematch: document.getElementById('rematch'),
    curtain: document.getElementById('curtain'),
    curtainTitle: document.getElementById('curtain-title'),
    curtainNote: document.getElementById('curtain-note'),
    curtainGo: document.getElementById('curtain-go'),
    pause: document.getElementById('pause'),
    pauseNote: document.getElementById('pause-note'),
    pauseGo: document.getElementById('pause-go'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    levelPicker: document.getElementById('level-picker'),
    levelHint: document.getElementById('level-hint'),
    secondsPicker: document.getElementById('seconds-picker'),
    roundsPicker: document.getElementById('rounds-picker'),
    ownWords: document.getElementById('own-words'),
    ownHint: document.getElementById('own-hint'),
    gameSummary: document.getElementById('game-summary'),
    resetGame: document.getElementById('reset-game'),
    storageHint: document.getElementById('storage-hint'),
    confirm: document.getElementById('confirm'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmText: document.getElementById('confirm-text'),
    confirmOk: document.getElementById('confirm-ok'),
    confirmCancel: document.getElementById('confirm-cancel')
  };

  var state = null;
  var ticker = null;

  var roster = TG.nameEditor(el.nameList, { min: 2, max: 2, maxLength: 14 });

  /* ---------------- Zustand ---------------- */

  function emptyState() {
    return {
      v: STATE_VERSION,
      phase: 'setup',
      players: [],
      current: 0,
      level: 'mittel',
      seconds: 60,
      rounds: 3,
      deck: [],
      turn: null,
      curtain: null
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      Array.isArray(candidate.players) &&
      ['setup', 'turn', 'turnover', 'over'].indexOf(candidate.phase) > -1;
  }

  function save() { TG.store.set(STATE_KEY, state); }

  function ownWords() {
    return TG.store.get(OWN_KEY, []).filter(function (word) {
      return typeof word === 'string' && word.trim();
    });
  }

  function playerName(index) {
    var player = state.players[index];
    return player ? player.name : '–';
  }

  function other(index) { return index === 0 ? 1 : 0; }

  /* ---------------- Uhr ---------------- */

  /* Die Uhr rechnet aus dem Ablaufzeitpunkt, nicht aus gezählten Ticks – so
     stimmt sie auch, wenn das Display zwischendurch aus war. */
  function msLeft() {
    var turn = state.turn;
    if (!turn) return 0;
    if (turn.pausedLeft != null) return turn.pausedLeft;
    return Math.max(0, turn.deadline - Date.now());
  }

  function startTicker() {
    stopTicker();
    ticker = window.setInterval(tick, 100);
    tick();
  }

  function stopTicker() {
    if (ticker) { window.clearInterval(ticker); ticker = null; }
  }

  function tick() {
    if (state.phase !== 'turn' || !state.turn) { stopTicker(); return; }

    var left = msLeft();
    var total = state.seconds * 1000;
    var seconds = Math.ceil(left / 1000);

    el.clockTime.textContent = seconds + ' s';
    el.clockFill.style.width = Math.max(0, Math.min(100, left / total * 100)) + '%';
    el.clock.classList.toggle('is-tight', left <= 10000 && state.turn.pausedLeft == null);

    if (left <= 0 && state.turn.pausedLeft == null) finishTurn();
  }

  function pauseTurn() {
    if (state.phase !== 'turn' || !state.turn || state.turn.pausedLeft != null) return;
    state.turn.pausedLeft = msLeft();
    stopTicker();
    TG.haptic(8);
    save();
    render();
  }

  function resumeTurn() {
    if (!state.turn || state.turn.pausedLeft == null) return;
    state.turn.deadline = Date.now() + state.turn.pausedLeft;
    state.turn.pausedLeft = null;
    save();
    render();
  }

  /* ---------------- Zug ---------------- */

  function nextWord() {
    var drawn = E.draw(state.deck, state.level, ownWords(), Math.random);
    state.deck = drawn.deck;
    state.turn.word = drawn.word;
  }

  function beginTurn() {
    state.phase = 'turn';
    state.turn = {
      player: state.current,
      deadline: Date.now() + state.seconds * 1000,
      pausedLeft: null,
      word: null,
      guessed: [],
      skipped: []
    };
    nextWord();
    save();
    render();
  }

  function scoreWord(hit) {
    if (state.phase !== 'turn' || !state.turn || state.turn.pausedLeft != null) return;
    if (msLeft() <= 0) return;

    var turn = state.turn;
    if (turn.word) (hit ? turn.guessed : turn.skipped).push(turn.word);

    TG.haptic(hit ? 14 : 5);
    nextWord();
    save();
    renderTurn();
    flashWord(hit ? 'is-hit' : 'is-skip');
  }

  function flashWord(cls) {
    el.word.classList.remove('is-hit', 'is-skip');
    void el.word.offsetWidth;
    el.word.classList.add(cls);
  }

  function finishTurn() {
    stopTicker();
    var turn = state.turn;
    if (!turn) return;

    /* Der Begriff, der beim Gongschlag noch offen war, zählt nicht – wird aber
       gezeigt, weil sonst garantiert jemand fragt. Zurück auf den Stapel. */
    state.players[turn.player].turns.push({
      guessed: turn.guessed,
      skipped: turn.skipped,
      pending: turn.word || null
    });
    if (turn.word) state.deck.push(turn.word);
    state.phase = 'turnover';
    TG.haptic([0, 60, 80, 60]);
    save();
    render();
  }

  function continueAfterTurn() {
    state.turn = null;

    if (E.turnsLeft(state.players, state.rounds) === 0) {
      state.phase = 'over';
      save();
      TG.confetti(200);
      render();
      return;
    }

    state.current = other(state.current);
    showCurtain(state.current);
  }

  /* ---------------- Sichtschutz ---------------- */

  function showCurtain(to) {
    state.curtain = { to: to };
    save();
    render();
  }

  function renderCurtain() {
    var to = state.curtain.to;
    var round = (state.players[to].turns || []).length + 1;

    el.curtainTitle.textContent = playerName(to) + ' erklärt';
    el.curtainNote.textContent = 'Runde ' + round + ' von ' + state.rounds + '. ' +
      playerName(other(to)) + ' schaut jetzt weg – die Uhr läuft ab dem Tippen.';
    el.curtainGo.textContent = 'Los!';
  }

  function leaveCurtain() {
    state.curtain = null;
    beginTurn();
  }

  /* ---------------- Darstellung ---------------- */

  function renderTurn() {
    var turn = state.turn;
    el.word.textContent = turn.word || '–';
    el.word.classList.toggle('is-long', (turn.word || '').length > 13);

    var parts = [turn.guessed.length + ' erraten'];
    if (turn.skipped.length) parts.push(turn.skipped.length + ' übersprungen');
    el.tally.textContent = playerName(turn.player) + ' · ' + parts.join(' · ');

  }

  function renderTurnover() {
    var player = state.players[state.current];
    var last = player.turns[player.turns.length - 1];
    var points = last.guessed.length;

    el.turnoverTitle.textContent = playerName(state.current) + ': ' + points +
      ' Punkt' + (points === 1 ? '' : 'e');

    var parts = [];
    if (last.skipped.length) parts.push(last.skipped.length + ' übersprungen');
    else if (last.guessed.length) parts.push('keinen einzigen ausgelassen');
    /* Der Gesamtstand lohnt sich erst, wenn es mehr als diese eine Runde gab. */
    if (player.turns.length > 1) parts.push('zusammen ' + E.scoreOf(player.turns));
    el.turnoverText.textContent = parts.length
      ? parts.join(' · ').charAt(0).toUpperCase() + parts.join(' · ').slice(1) + '.'
      : 'Nächste Runde wird besser.';

    el.recap.textContent = '';
    last.guessed.forEach(function (word) { el.recap.appendChild(recapItem(word, 'hit')); });
    last.skipped.forEach(function (word) { el.recap.appendChild(recapItem(word, 'skip')); });
    if (last.pending) el.recap.appendChild(recapItem(last.pending, 'pending'));

    if (!last.guessed.length && !last.skipped.length && !last.pending) {
      var empty = document.createElement('li');
      empty.className = 'ex-recap__empty';
      empty.textContent = 'Kein einziger Begriff – das nächste Mal klappt’s.';
      el.recap.appendChild(empty);
    }

    var left = E.turnsLeft(state.players, state.rounds);
    el.nextTurn.textContent = left <= 1 ? 'Ergebnis →' : 'Weiter →';
  }

  var RECAP = {
    hit: { mark: '✓', note: 'erraten' },
    skip: { mark: '–', note: 'übersprungen' },
    pending: { mark: '⏱', note: 'Zeit war um' }
  };

  function recapItem(word, kind) {
    var style = RECAP[kind];
    var item = document.createElement('li');
    item.className = 'ex-recap__item is-' + kind;

    var mark = document.createElement('span');
    mark.className = 'ex-recap__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = style.mark;

    var label = document.createElement('span');
    label.textContent = word;

    item.appendChild(mark);
    item.appendChild(label);
    item.setAttribute('aria-label', word + ' – ' + style.note);
    return item;
  }

  function renderOver() {
    var result = E.standings(state.players);

    el.overTitle.textContent = result.tie
      ? '🤝 Unentschieden, ' + result.best + ' zu ' + result.best
      : '🏆 ' + result.winner.name + ' gewinnt!';

    var loser = result.tie ? null : state.players[other(result.winner.index)];
    el.overText.textContent = result.tie
      ? 'Beide gleich gut erklärt. Revanche?'
      : result.winner.name + ' hat ' + result.winner.points + ' Begriffe geschafft, ' +
        loser.name + ' ' + E.scoreOf(loser.turns) + '.';

    el.standings.textContent = '';
    result.rows.slice().sort(function (a, b) { return b.points - a.points; }).forEach(function (entry) {
      var item = document.createElement('li');
      var row = document.createElement('div');
      row.className = 'ex-row' + (!result.tie && result.winner.index === entry.index ? ' is-winner' : '');

      var name = document.createElement('span');
      name.className = 'ex-row__name';
      name.textContent = entry.name;

      var detail = document.createElement('span');
      detail.className = 'ex-row__detail';
      detail.textContent = entry.skipped ? entry.skipped + ' ausgelassen' : 'nichts ausgelassen';

      var points = document.createElement('span');
      points.className = 'ex-row__points';
      points.textContent = entry.points;
      points.setAttribute('aria-label', entry.points + ' Punkte');

      row.appendChild(name);
      row.appendChild(detail);
      row.appendChild(points);
      item.appendChild(row);
      el.standings.appendChild(item);
    });
  }

  function render() {
    var phase = state.phase;
    var covered = !!state.curtain;
    var paused = !!(state.turn && state.turn.pausedLeft != null);

    el.curtain.hidden = !covered;
    el.pause.hidden = !paused;

    /* Hinter Sichtschutz und Pause bleibt kein Begriff stehen. */
    el.main.hidden = covered || paused;
    el.actionbar.hidden = covered || paused;

    if (covered || paused) document.body.classList.remove('is-playing');
    if (covered) { stopTicker(); el.word.textContent = '–'; renderCurtain(); return; }

    if (paused) {
      el.word.textContent = '–';
      el.pauseNote.textContent = 'Noch ' + Math.ceil(msLeft() / 1000) + ' Sekunden für ' +
        playerName(state.turn.player) + '.';
      return;
    }

    el.setup.hidden = phase !== 'setup';
    el.turn.hidden = phase !== 'turn';
    el.turnover.hidden = phase !== 'turnover';
    el.over.hidden = phase !== 'over';

    el.setupActions.hidden = phase !== 'setup';
    el.turnActions.hidden = phase !== 'turn';
    el.turnoverActions.hidden = phase !== 'turnover';
    el.overActions.hidden = phase !== 'over';

    document.body.classList.toggle('is-playing', phase === 'turn');

    if (phase === 'turn') { renderTurn(); startTicker(); } else stopTicker();
    if (phase === 'turnover') renderTurnover();
    if (phase === 'over') renderOver();

    renderSettings();
  }

  /* ---------------- Einstellungen ---------------- */

  function markPicker(picker, attribute, value) {
    Array.prototype.forEach.call(picker.querySelectorAll('button'), function (button) {
      button.setAttribute('aria-pressed', button.dataset[attribute] === String(value) ? 'true' : 'false');
    });
  }

  function renderSettings() {
    markPicker(el.levelPicker, 'level', state.level);
    markPicker(el.secondsPicker, 'seconds', state.seconds);
    markPicker(el.roundsPicker, 'rounds', state.rounds);

    el.levelHint.textContent = E.levelById(state.level).hint;

    /* Gezählt wird, was wirklich dazukommt: was es schon gibt, zählt nicht mit. */
    var pool = E.poolFor(state.level, ownWords()).length;
    var added = pool - E.poolFor(state.level, []).length;
    el.ownHint.textContent = added
      ? added + (added === 1 ? ' eigener Begriff' : ' eigene Begriffe') +
        ' dabei – macht ' + pool + ' auf dieser Stufe.'
      : pool + ' Begriffe auf dieser Stufe. Eigene kommen dazu und bleiben auf diesem Gerät.';

    var summary = E.levelById(state.level).name + ' · ' + state.seconds + ' s · ' +
      state.rounds + ' Runden';
    el.setupSummary.textContent = summary + ' – änderbar über das Zahnrad oben.';
    el.gameSummary.textContent = state.players.length === 2
      ? playerName(0) + ' gegen ' + playerName(1) + ' · ' + summary
      : 'Noch keine Partie begonnen. ' + summary;
  }

  /* Ein neuer Stapel, sobald sich die Wortauswahl ändert. */
  function refreshDeck() {
    state.deck = E.buildDeck(state.level, ownWords(), Math.random);
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
    if (names.length < 2) { TG.toast('Bitte zwei Namen eintragen'); return; }

    var settings = { level: state.level, seconds: state.seconds, rounds: state.rounds };
    state = Object.assign(emptyState(), settings);
    state.players = names.slice(0, 2).map(function (name) {
      return { name: name, turns: [] };
    });

    refreshDeck();
    state.current = 0;
    showCurtain(0);
  }

  function toSetup() {
    var settings = { level: state.level, seconds: state.seconds, rounds: state.rounds };
    state = Object.assign(emptyState(), settings);
    roster.set(['', '']);
    stopTicker();
    save();
    render();
  }

  function bindEvents() {
    el.startGame.addEventListener('click', startGame);

    el.nameList.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); startGame(); }
    });

    el.gotIt.addEventListener('click', function () { scoreWord(true); });
    el.skip.addEventListener('click', function () { scoreWord(false); });
    el.clock.addEventListener('click', pauseTurn);
    el.pauseGo.addEventListener('click', resumeTurn);
    el.curtainGo.addEventListener('click', leaveCurtain);
    el.nextTurn.addEventListener('click', continueAfterTurn);

    el.rematch.addEventListener('click', function () {
      state.players.forEach(function (player) { player.turns = []; });
      refreshDeck();
      state.current = 0;
      showCurtain(0);
    });

    el.newNames.addEventListener('click', toSetup);

    el.levelPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-level]') : null;
      if (!button) return;
      state.level = button.dataset.level;
      refreshDeck();
      save();
      renderSettings();
    });

    el.secondsPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-seconds]') : null;
      if (!button) return;
      state.seconds = Number(button.dataset.seconds);
      save();
      renderSettings();
    });

    el.roundsPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-rounds]') : null;
      if (!button) return;
      state.rounds = Number(button.dataset.rounds);
      save();
      renderSettings();
    });

    el.ownWords.addEventListener('change', function () {
      /* Aufräumen beim Speichern: leere Zeilen raus, doppelte nur einmal –
         sonst zählt die Anzeige Begriffe mit, die gar nicht im Stapel landen. */
      var seen = {};
      var words = [];
      el.ownWords.value.split('\n').forEach(function (line) {
        var word = line.trim();
        var key = word.toLowerCase();
        if (!word || seen[key]) return;
        seen[key] = true;
        words.push(word);
      });

      TG.store.set(OWN_KEY, words);
      el.ownWords.value = words.join('\n');
      refreshDeck();
      save();
      renderSettings();
    });

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.resetGame.addEventListener('click', function () {
      askConfirm('Partie abbrechen?', 'Alle Punkte dieser Partie gehen verloren.', 'Abbrechen')
        .then(function (yes) {
          if (!yes) return;
          closeDialog(el.settings);
          toSetup();
          TG.toast('Partie abgebrochen');
        });
    });

    /* Kommt das Handy aus der Tasche zurück, stimmt die Uhr sofort wieder. */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && state.phase === 'turn') { render(); }
    });

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  function init() {
    var saved = TG.store.get(STATE_KEY, null);
    state = isValidState(saved) ? saved : emptyState();

    if (state.phase === 'setup') roster.set(['', '']);
    if (!state.deck || !state.deck.length) refreshDeck();

    el.ownWords.value = ownWords().join('\n');

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
