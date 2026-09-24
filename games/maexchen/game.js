/* Mäxchen – würfeln, ansagen, bluffen.
   Den eigenen Wurf sieht nur, wer gerade dran ist: das Handy übernimmt
   die Rolle des Würfelbechers. Gespeichert wird nur lokal. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var M = TG.maexchen;
  var STATE_KEY = 'maexchen.state';
  var STATE_VERSION = 1;
  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 6;
  var MAX_NAME = 14;
  var LIVES = [2, 3, 5];

  var el = {
    main: document.querySelector('.game-main'),
    actionbar: document.querySelector('.actionbar'),
    setup: document.getElementById('setup'),
    players: document.getElementById('players'),
    turn: document.getElementById('turn'),
    announce: document.getElementById('announce'),
    reveal: document.getElementById('reveal'),
    over: document.getElementById('over'),
    nameList: document.getElementById('name-list'),
    addPlayer: document.getElementById('add-player'),
    setupActions: document.getElementById('setup-actions'),
    turnActions: document.getElementById('turn-actions'),
    revealActions: document.getElementById('reveal-actions'),
    overActions: document.getElementById('over-actions'),
    startGame: document.getElementById('start-game'),
    claimLead: document.getElementById('claim-lead'),
    claimValue: document.getElementById('claim-value'),
    claimHint: document.getElementById('claim-hint'),
    doubt: document.getElementById('doubt'),
    roll: document.getElementById('roll'),
    rollerName: document.getElementById('roller-name'),
    dice: document.getElementById('dice'),
    rollValue: document.getElementById('roll-value'),
    announceHint: document.getElementById('announce-hint'),
    values: document.getElementById('values'),
    revealTitle: document.getElementById('reveal-title'),
    revealDice: document.getElementById('reveal-dice'),
    revealLine: document.getElementById('reveal-line'),
    revealCost: document.getElementById('reveal-cost'),
    nextRound: document.getElementById('next-round'),
    overTitle: document.getElementById('over-title'),
    overText: document.getElementById('over-text'),
    newNames: document.getElementById('new-names'),
    rematch: document.getElementById('rematch'),
    curtain: document.getElementById('curtain'),
    curtainTitle: document.getElementById('curtain-title'),
    curtainNote: document.getElementById('curtain-note'),
    curtainGo: document.getElementById('curtain-go'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    livesPicker: document.getElementById('lives-picker'),
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
  var freshRoll = false;

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
      startLives: 3,
      current: 0,
      previous: null,
      roll: null,
      result: null,
      curtain: null
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      Array.isArray(candidate.players) &&
      LIVES.indexOf(candidate.startLives) > -1 &&
      ['setup', 'turn', 'announce', 'reveal', 'over'].indexOf(candidate.phase) > -1;
  }

  function save() { TG.store.set(STATE_KEY, state); }

  function playerName(index) {
    var player = state.players[index];
    return player ? player.name : '–';
  }

  function alivePlayers() {
    return state.players.filter(function (player) { return player.lives > 0; });
  }

  function nextAlive(from) {
    for (var step = 1; step <= state.players.length; step++) {
      var index = (from + step) % state.players.length;
      if (state.players[index].lives > 0) return index;
    }
    return from;
  }

  /* ---------------- Ablauf ---------------- */

  function handOver(index, note) {
    state.current = index;
    state.phase = 'turn';
    state.roll = null;
    state.curtain = { title: 'Handy an ' + playerName(index), note: note || '' };
    save();
    render();
  }

  function beginRound(starter, note) {
    state.previous = null;
    state.result = null;
    handOver(starter, note || 'Neue Runde – du fängst an.');
  }

  function doRoll() {
    state.roll = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    state.phase = 'announce';
    freshRoll = true;
    TG.haptic(12);
    save();
    render();
  }

  function announce(value) {
    state.previous = {
      player: state.current,
      announced: value,
      actual: M.valueOf(state.roll[0], state.roll[1])
    };
    state.roll = null;
    TG.haptic(8);
    handOver(nextAlive(state.current), playerName(state.current) + ' sagt ' + M.label(value) + '.');
  }

  function doubt() {
    var previous = state.previous;
    var verdict = M.judge(previous.announced, previous.actual);
    var loserIndex = verdict.loser === 'announcer' ? previous.player : state.current;

    state.players[loserIndex].lives = Math.max(0, state.players[loserIndex].lives - verdict.stake);
    state.result = {
      announcer: previous.player,
      challenger: state.current,
      announced: previous.announced,
      actual: previous.actual,
      bluff: verdict.bluff,
      stake: verdict.stake,
      loser: loserIndex,
      out: state.players[loserIndex].lives === 0
    };
    state.phase = 'reveal';
    state.curtain = null;
    TG.haptic([0, 40, 60, 40]);
    save();
    render();
  }

  function afterReveal() {
    if (alivePlayers().length <= 1) {
      state.phase = 'over';
      state.curtain = null;
      save();
      TG.confetti(200);
      render();
      return;
    }

    var loser = state.result.loser;
    var starter = state.players[loser].lives > 0 ? loser : nextAlive(loser);
    beginRound(starter, state.players[loser].lives > 0
      ? 'Du hast verloren – du fängst an.'
      : playerName(loser) + ' ist raus. Du fängst an.');
  }

  /* ---------------- Darstellung ---------------- */

  function renderPlayers() {
    el.players.textContent = '';

    state.players.forEach(function (player, index) {
      var item = document.createElement('li');
      var row = document.createElement('div');
      row.className = 'mx-row' +
        (player.lives === 0 ? ' is-out' : '') +
        (index === state.current && state.phase !== 'over' && player.lives > 0 ? ' is-turn' : '');

      var name = document.createElement('span');
      name.className = 'mx-row__name';
      name.textContent = player.name;

      var lives = document.createElement('span');
      lives.className = 'mx-row__lives';
      lives.textContent = player.lives > 0 ? new Array(player.lives + 1).join('♥') : 'raus';
      lives.setAttribute('aria-label', player.lives + (player.lives === 1 ? ' Leben' : ' Leben'));

      row.appendChild(name);
      row.appendChild(lives);
      item.appendChild(row);
      el.players.appendChild(item);
    });
  }

  function renderTurn() {
    var previous = state.previous;

    if (!previous) {
      el.claimLead.textContent = 'Runde beginnt';
      el.claimValue.textContent = '–';
      el.claimValue.className = 'mx-claim__value';
      el.claimHint.textContent = 'Du würfelst und sagst an. Was du ansagst, ist deine Sache.';
      el.doubt.hidden = true;
      el.roll.hidden = false;
      return;
    }

    var top = M.isMaexchen(previous.announced);
    el.claimLead.textContent = playerName(previous.player) + ' sagt';
    el.claimValue.textContent = M.label(previous.announced);
    el.claimValue.className = 'mx-claim__value' + (top ? ' is-maexchen' : '');

    el.doubt.hidden = false;
    el.roll.hidden = top;
    el.claimHint.textContent = top
      ? 'Über dem Mäxchen geht nichts mehr – du musst aufdecken. Zwei Leben stehen auf dem Spiel.'
      : 'Glaubst du das? Dann würfle selbst und sage höher an.';
  }

  function renderDice(host, values, animate) {
    host.textContent = '';

    values.forEach(function (value, index) {
      var item = document.createElement('li');
      var die = document.createElement('span');
      die.className = 'mx-die' + (animate ? ' is-rolling' : '');
      die.style.animationDelay = animate ? (index * 60) + 'ms' : '';
      die.setAttribute('role', 'img');
      die.setAttribute('aria-label', 'Würfel zeigt ' + value);
      die.appendChild(TG.dice.build(value));
      item.appendChild(die);
      host.appendChild(item);
    });
  }

  function renderAnnounce() {
    var mine = M.valueOf(state.roll[0], state.roll[1]);
    var minimum = state.previous ? state.previous.announced : null;
    var allowed = M.higherThan(minimum);
    var canTellTruth = allowed.indexOf(mine) > -1;

    el.rollerName.textContent = playerName(state.current);
    renderDice(el.dice, state.roll, freshRoll);
    freshRoll = false;

    el.rollValue.innerHTML = '';
    el.rollValue.appendChild(document.createTextNode(M.label(mine)));
    var note = document.createElement('small');
    note.textContent = 'dein Wurf';
    el.rollValue.appendChild(note);

    el.announceHint.className = 'mx-hint' + (canTellTruth ? '' : ' is-forced');
    el.announceHint.textContent = canTellTruth
      ? 'Sag an, was du willst – die Wahrheit ist grün markiert.'
      : 'Dein Wurf reicht nicht. Du musst höher ansagen, als du hast.';

    el.values.textContent = '';

    allowed.forEach(function (value) {
      var item = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'mx-value' +
        (value === mine ? ' is-mine' : '') +
        (M.isMaexchen(value) ? ' is-top' : '');
      button.dataset.value = String(value);

      button.appendChild(document.createTextNode(M.isMaexchen(value) ? 'Mäxchen' : String(value)));

      if (value === mine || M.isPasch(value)) {
        var small = document.createElement('small');
        small.textContent = value === mine ? 'dein Wurf' : 'Pasch';
        button.appendChild(small);
      }

      button.setAttribute('aria-label', M.label(value) + ' ansagen' +
        (value === mine ? ' – das ist dein echter Wurf' : ''));

      item.appendChild(button);
      el.values.appendChild(item);
    });
  }

  function renderReveal() {
    var result = state.result;
    var dice = [Math.floor(result.actual / 10), result.actual % 10];

    el.revealTitle.textContent = playerName(result.challenger) + ' deckt auf';
    renderDice(el.revealDice, dice, false);

    el.revealLine.className = 'mx-reveal__line ' + (result.bluff ? 'is-bluff' : 'is-true');
    el.revealLine.textContent = result.bluff
      ? playerName(result.announcer) + ' hat geblufft: ' + M.label(result.announced) +
        ' angesagt, aber nur ' + M.label(result.actual) + ' gewürfelt.'
      : playerName(result.announcer) + ' hatte ' + M.label(result.actual) +
        ' – die Ansage stimmte.';

    el.revealCost.textContent = playerName(result.loser) + ' verliert ' +
      (result.stake === 1 ? 'ein Leben' : result.stake + ' Leben') +
      (result.out ? ' und ist raus.' : '.');
  }

  function renderOver() {
    var winner = alivePlayers()[0];
    el.overTitle.textContent = winner ? '🏆 ' + winner.name + ' gewinnt' : 'Vorbei';
    el.overText.textContent = winner
      ? 'Als Einzige:r noch am Leben, mit ' + winner.lives +
        (winner.lives === 1 ? ' Leben.' : ' Leben.')
      : '–';
  }

  function render() {
    var covered = !!state.curtain;
    var phase = state.phase;

    el.curtain.hidden = !covered;
    el.main.hidden = covered;
    el.actionbar.hidden = covered || phase === 'announce';
    el.main.classList.toggle('no-actionbar', phase === 'announce');

    if (covered) {
      el.curtainTitle.textContent = state.curtain.title;
      el.curtainNote.textContent = state.curtain.note;
      /* Hinter dem Sichtschutz darf kein Wurf stehen bleiben. */
      el.dice.textContent = '';
      el.values.textContent = '';
      return;
    }

    el.setup.hidden = phase !== 'setup';
    el.players.hidden = phase === 'setup';
    el.turn.hidden = phase !== 'turn';
    el.announce.hidden = phase !== 'announce';
    el.reveal.hidden = phase !== 'reveal';
    el.over.hidden = phase !== 'over';

    el.setupActions.hidden = phase !== 'setup';
    el.turnActions.hidden = phase !== 'turn';
    el.revealActions.hidden = phase !== 'reveal';
    el.overActions.hidden = phase !== 'over';

    if (phase !== 'setup') renderPlayers();
    if (phase === 'turn') renderTurn();
    if (phase === 'announce') renderAnnounce();
    if (phase === 'reveal') renderReveal();
    if (phase === 'over') renderOver();

    Array.prototype.forEach.call(el.livesPicker.querySelectorAll('button'), function (button) {
      button.setAttribute('aria-pressed', Number(button.dataset.lives) === state.startLives ? 'true' : 'false');
    });

    el.gameSummary.textContent = state.players.length
      ? state.players.map(function (p) { return p.name + ' ' + p.lives + '♥'; }).join(' · ')
      : 'Noch keine Partie begonnen.';
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

    state.players = names.map(function (name) {
      return { name: name, lives: state.startLives };
    });
    state.result = null;
    beginRound(0, 'Du fängst an.');
  }

  function toSetup() {
    state.phase = 'setup';
    state.curtain = null;
    state.previous = null;
    state.roll = null;
    state.result = null;
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

    el.curtainGo.addEventListener('click', function () {
      state.curtain = null;
      save();
      render();
    });

    el.roll.addEventListener('click', doRoll);
    el.doubt.addEventListener('click', doubt);

    el.values.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('.mx-value') : null;
      if (!button) return;
      announce(Number(button.dataset.value));
    });

    el.nextRound.addEventListener('click', afterReveal);

    el.rematch.addEventListener('click', function () {
      state.players.forEach(function (player) { player.lives = state.startLives; });
      state.result = null;
      beginRound(0, 'Revanche – du fängst an.');
      TG.toast('Revanche!');
    });

    el.newNames.addEventListener('click', toSetup);

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.livesPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-lives]') : null;
      if (!button) return;
      var lives = Number(button.dataset.lives);
      if (lives === state.startLives) return;

      function apply() {
        state.startLives = lives;
        if (state.phase === 'setup') { save(); render(); return; }
        state.players.forEach(function (player) { player.lives = lives; });
        state.result = null;
        beginRound(0, 'Neue Partie – du fängst an.');
        TG.toast(lives + ' Leben pro Person');
      }

      if (state.phase === 'setup') { apply(); return; }
      askConfirm('Leben ändern?', 'Dafür startet eine neue Partie.', 'Ändern')
        .then(function (yes) { if (yes) apply(); });
    });

    el.editPlayers.addEventListener('click', function () {
      closeDialog(el.settings);
      toSetup();
    });

    el.resetGame.addEventListener('click', function () {
      askConfirm('Partie abbrechen?', 'Leben und Runde gehen verloren.', 'Abbrechen')
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
    if (state.phase !== 'setup' && state.players.length < MIN_PLAYERS) state.phase = 'setup';
    if (state.phase === 'announce' && !state.roll) state.phase = 'turn';
    if (state.phase === 'setup') roster.set(['', '', '']);

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
