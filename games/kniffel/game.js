/* Kniffel – zu mehreren auf einem Handy.
   Gewürfelt wird reihum, das Blatt rechnet mit. Gespeichert wird nur lokal. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var K = TG.kniffel;
  var STATE_KEY = 'kniffel.state';
  var STATE_VERSION = 1;
  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 6;
  var MAX_NAME = 14;
  var ROLLS_PER_TURN = 3;

  var el = {
    setup: document.getElementById('setup'),
    play: document.getElementById('play'),
    over: document.getElementById('over'),
    nameList: document.getElementById('name-list'),
    addPlayer: document.getElementById('add-player'),
    setupActions: document.getElementById('setup-actions'),
    playActions: document.getElementById('play-actions'),
    overActions: document.getElementById('over-actions'),
    startGame: document.getElementById('start-game'),
    turnName: document.getElementById('turn-name'),
    roundNumber: document.getElementById('round-number'),
    diceRow: document.getElementById('dice-row'),
    diceHint: document.getElementById('dice-hint'),
    scoreList: document.getElementById('score-list'),
    rollDice: document.getElementById('roll-dice'),
    openSheets: document.getElementById('open-sheets'),
    sheets: document.getElementById('sheets'),
    tallyList: document.getElementById('tally-list'),
    closeSheets: document.getElementById('close-sheets'),
    shareSheets: document.getElementById('share-sheets'),
    overTitle: document.getElementById('over-title'),
    rankList: document.getElementById('rank-list'),
    newNames: document.getElementById('new-names'),
    newRound: document.getElementById('new-round'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
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
      current: 0,
      dice: [0, 0, 0, 0, 0],
      held: [false, false, false, false, false],
      rollsLeft: ROLLS_PER_TURN,
      rolled: false
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      Array.isArray(candidate.players) &&
      Array.isArray(candidate.dice) &&
      candidate.dice.length === K.DICE_COUNT &&
      ['setup', 'play', 'over'].indexOf(candidate.phase) > -1;
  }

  function save() { TG.store.set(STATE_KEY, state); }

  function currentPlayer() { return state.players[state.current]; }

  function filledCount(sheet) {
    return K.CATEGORIES.filter(function (c) { return sheet[c.id] !== null; }).length;
  }

  function allComplete() {
    return state.players.every(function (player) { return K.isComplete(player.sheet); });
  }

  function ranked() {
    return state.players
      .map(function (player, index) {
        return { player: player, index: index, totals: K.totals(player.sheet) };
      })
      .sort(function (a, b) { return b.totals.total - a.totals.total; });
  }

  /* ---------------- Würfeln ---------------- */

  function roll() {
    if (state.rollsLeft <= 0) return;

    for (var i = 0; i < K.DICE_COUNT; i++) {
      if (!state.held[i] || !state.rolled) {
        state.dice[i] = 1 + Math.floor(Math.random() * 6);
      }
    }

    state.rollsLeft--;
    state.rolled = true;
    TG.haptic(12);
    save();
    renderPlay(true);

    if (K.isKniffel(state.dice)) {
      TG.confetti(120);
      TG.toast('Kniffel! 🎲', { variant: 'win' });
    }
  }

  function toggleHold(index) {
    if (!state.rolled || state.rollsLeft === 0) return;
    state.held[index] = !state.held[index];
    TG.haptic(6);
    save();
    renderDice();
    renderHint();
  }

  function scoreCategory(categoryId) {
    var player = currentPlayer();
    if (!state.rolled || player.sheet[categoryId] !== null) return;

    var joker = K.isJoker(state.dice, player.sheet);
    var value = K.scoreFor(categoryId, state.dice, { joker: joker });

    player.sheet[categoryId] = value;
    if (joker) player.sheet.kniffelBonus = (player.sheet.kniffelBonus || 0) + K.KNIFFEL_BONUS;

    var name = K.CATEGORIES.filter(function (c) { return c.id === categoryId; })[0].name;
    TG.haptic(14);
    TG.toast(joker
      ? name + ': ' + value + ' + 100 Bonus! 🎲'
      : name + ': ' + value + (value === 0 ? ' – gestrichen' : ''));

    if (allComplete()) {
      state.phase = 'over';
      save();
      TG.confetti(200);
      render();
      return;
    }

    nextTurn();
  }

  function nextTurn() {
    state.current = (state.current + 1) % state.players.length;
    state.dice = [0, 0, 0, 0, 0];
    state.held = [false, false, false, false, false];
    state.rollsLeft = ROLLS_PER_TURN;
    state.rolled = false;
    save();
    render();
  }

  /* ---------------- Darstellung ---------------- */

  function renderDice(animate) {
    el.diceRow.textContent = '';

    state.dice.forEach(function (value, index) {
      var item = document.createElement('li');
      var die = document.createElement('button');
      die.type = 'button';
      die.className = 'die' +
        (state.held[index] ? ' is-held' : '') +
        (animate && !state.held[index] ? ' is-rolling' : '');
      die.dataset.index = String(index);
      die.disabled = !state.rolled || state.rollsLeft === 0;
      die.setAttribute('aria-pressed', state.held[index] ? 'true' : 'false');
      die.setAttribute('aria-label', value
        ? 'Würfel ' + value + (state.held[index] ? ', liegt' : ', wird neu geworfen')
        : 'Würfel, noch nicht geworfen');

      die.appendChild(TG.dice.build(value));
      item.appendChild(die);
      el.diceRow.appendChild(item);
    });
  }

  function renderHint() {
    if (!state.rolled) {
      el.diceHint.textContent = 'Bis zu dreimal würfeln.';
      return;
    }
    if (state.rollsLeft === 0) {
      el.diceHint.textContent = 'Keine Würfe mehr – jetzt ein Feld aussuchen.';
      return;
    }
    var held = state.held.filter(Boolean).length;
    var left = state.rollsLeft === 1 ? 'noch ein Wurf' : 'noch ' + state.rollsLeft + ' Würfe';
    el.diceHint.textContent = held
      ? held + (held === 1 ? ' Würfel bleibt' : ' Würfel bleiben') + ' liegen, ' + left + '.'
      : 'Würfel antippen, die liegen bleiben sollen – ' + left + '.';
  }

  function scoreRow(category, player) {
    var taken = player.sheet[category.id] !== null;
    var item = document.createElement('li');
    var row;

    if (taken || !state.rolled) {
      row = document.createElement('div');
      row.className = 'score-row ' + (taken ? 'is-taken' : 'is-waiting');
    } else {
      row = document.createElement('button');
      row.type = 'button';
      row.dataset.category = category.id;
      var preview = K.scoreFor(category.id, state.dice, {
        joker: K.isJoker(state.dice, player.sheet)
      });
      row.className = 'score-row is-open ' + (preview > 0 ? 'is-good' : 'is-zero');
    }

    var name = document.createElement('span');
    name.className = 'score-row__name';
    name.textContent = category.name;

    var value = document.createElement('span');
    value.className = 'score-row__value';

    if (taken) {
      value.textContent = String(player.sheet[category.id]);
      row.setAttribute('aria-label', category.name + ': ' + player.sheet[category.id] + ' Punkte, bereits eingetragen');
    } else if (!state.rolled) {
      value.textContent = '–';
      row.setAttribute('aria-label', category.name + ': noch frei, ' + category.help);
    } else {
      var points = K.scoreFor(category.id, state.dice, { joker: K.isJoker(state.dice, player.sheet) });
      value.textContent = String(points);
      row.setAttribute('aria-label', category.name + ' eintragen: ' + points + ' Punkte');
    }

    row.appendChild(name);
    row.appendChild(value);
    item.appendChild(row);
    return item;
  }

  function sumRow(label, value, extraClass) {
    var item = document.createElement('div');
    item.className = 'score-sum ' + (extraClass || '');
    var left = document.createElement('span');
    left.textContent = label;
    var right = document.createElement('span');
    right.textContent = value;
    item.appendChild(left);
    item.appendChild(right);
    return item;
  }

  function renderSheet() {
    var player = currentPlayer();
    var totals = K.totals(player.sheet);

    el.scoreList.textContent = '';

    function group(section) {
      var list = document.createElement('ul');
      list.className = 'list-group';
      K.CATEGORIES.filter(function (c) { return c.section === section; })
        .forEach(function (category) { list.appendChild(scoreRow(category, player)); });
      return list;
    }

    el.scoreList.appendChild(group('upper'));

    el.scoreList.appendChild(sumRow('Zwischensumme', String(totals.upper)));
    el.scoreList.appendChild(sumRow(
      totals.bonus ? 'Bonus erreicht' : 'Bonus ab ' + K.UPPER_TARGET + ' (noch ' + totals.missingForBonus + ')',
      '+' + totals.bonus,
      totals.bonus ? 'score-sum--bonus is-reached' : 'score-sum--bonus'
    ));

    el.scoreList.appendChild(group('lower'));

    if (player.sheet.kniffelBonus) {
      el.scoreList.appendChild(sumRow('Kniffel-Bonus', '+' + player.sheet.kniffelBonus));
    }

    el.scoreList.appendChild(sumRow('Gesamt', String(totals.total), 'score-sum--total'));
  }

  function renderPlay(animate) {
    var player = currentPlayer();

    el.turnName.textContent = player.name + ' ist dran';
    el.roundNumber.textContent = 'Runde ' + Math.min(13, filledCount(player.sheet) + 1) + '/13';

    el.rollDice.disabled = state.rollsLeft === 0;
    el.rollDice.textContent = state.rollsLeft === ROLLS_PER_TURN
      ? 'Würfeln'
      : (state.rollsLeft > 0 ? 'Nochmal (' + state.rollsLeft + ')' : 'Keine Würfe mehr');

    renderDice(animate);
    renderHint();
    renderSheet();
  }

  function renderTally(listElement, withRank) {
    listElement.textContent = '';
    var rows = ranked();
    var best = rows.length ? rows[0].totals.total : 0;
    var medals = ['🥇', '🥈', '🥉'];

    rows.forEach(function (entry, position) {
      var item = document.createElement('li');
      item.className = 'tally-row' +
        (best > 0 && entry.totals.total === best ? ' tally-row--lead' : '') +
        (!withRank && entry.index === state.current ? ' tally-row--current' : '');

      if (withRank) {
        var rank = document.createElement('span');
        rank.className = 'tally-row__rank';
        rank.textContent = best > 0 && position < 3 ? medals[position] : String(position + 1) + '.';
        item.appendChild(rank);
      }

      var name = document.createElement('span');
      name.className = 'tally-row__name';
      name.textContent = entry.player.name;

      var detail = document.createElement('span');
      detail.className = 'tally-row__detail';
      detail.textContent = filledCount(entry.player.sheet) + '/13' +
        (entry.totals.bonus ? ' · Bonus' : '');

      var total = document.createElement('span');
      total.className = 'tally-row__total';
      total.textContent = String(entry.totals.total);

      item.appendChild(name);
      item.appendChild(detail);
      item.appendChild(total);
      listElement.appendChild(item);
    });
  }

  function renderOver() {
    var rows = ranked();
    el.overTitle.textContent = '🏆 ' + rows[0].player.name + ' gewinnt mit ' + rows[0].totals.total;
    renderTally(el.rankList, true);
  }

  function render() {
    var phase = state.phase;

    el.setup.hidden = phase !== 'setup';
    el.play.hidden = phase !== 'play';
    el.over.hidden = phase !== 'over';
    el.setupActions.hidden = phase !== 'setup';
    el.playActions.hidden = phase !== 'play';
    el.overActions.hidden = phase !== 'over';

    if (phase === 'play') renderPlay(false);
    if (phase === 'over') renderOver();

    el.gameSummary.textContent = state.players.length
      ? state.players.map(function (p) { return p.name; }).join(', ')
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
    if (names.length < MIN_PLAYERS) {
      TG.toast('Bitte mindestens zwei Namen eintragen');
      return;
    }

    var previous = {};
    state.players.forEach(function (player) { previous[player.name] = player; });

    state = emptyState();
    state.phase = 'play';
    state.players = names.map(function (name) {
      return { name: name, sheet: K.emptySheet() };
    });

    save();
    render();
    TG.toast('Los geht’s – ' + state.players[0].name + ' fängt an!');
  }

  function newRound() {
    state.players.forEach(function (player) { player.sheet = K.emptySheet(); });
    state.phase = 'play';
    state.current = 0;
    state.dice = [0, 0, 0, 0, 0];
    state.held = [false, false, false, false, false];
    state.rollsLeft = ROLLS_PER_TURN;
    state.rolled = false;
    save();
    render();
    TG.toast('Neue Runde – leere Blätter!');
  }

  function toSetup() {
    var names = state.players.map(function (player) { return player.name; });
    state = emptyState();
    roster.set(names.length ? names : ['', '', '']);
    save();
    render();
  }

  function scoreText() {
    var lines = ranked().map(function (entry, index) {
      var medals = ['🥇', '🥈', '🥉'];
      var mark = entry.totals.total > 0 && index < 3 ? medals[index] : (index + 1) + '.';
      return mark + ' ' + entry.player.name + ' – ' + entry.totals.total;
    });
    return '🎲 Kniffel\n' + lines.join('\n');
  }

  function bindEvents() {
    el.startGame.addEventListener('click', startGame);

    el.nameList.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); startGame(); }
    });

    el.rollDice.addEventListener('click', roll);

    el.diceRow.addEventListener('click', function (event) {
      var die = event.target.closest ? event.target.closest('.die') : null;
      if (!die || die.disabled) return;
      toggleHold(Number(die.dataset.index));
    });

    el.scoreList.addEventListener('click', function (event) {
      var row = event.target.closest ? event.target.closest('.score-row[data-category]') : null;
      if (!row) return;
      scoreCategory(row.dataset.category);
    });

    el.openSheets.addEventListener('click', function () {
      renderTally(el.tallyList, false);
      openDialog(el.sheets);
    });
    el.closeSheets.addEventListener('click', function () { closeDialog(el.sheets); });
    el.sheets.addEventListener('click', function (event) {
      if (event.target === el.sheets) closeDialog(el.sheets);
    });

    el.shareSheets.addEventListener('click', function () {
      TG.share({ title: 'Kniffel', text: scoreText(), url: TG.pageUrl() })
        .then(function (result) { TG.reportShare(result, 'Stand kopiert'); });
    });

    el.newRound.addEventListener('click', newRound);
    el.newNames.addEventListener('click', toSetup);

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.editPlayers.addEventListener('click', function () {
      closeDialog(el.settings);
      askConfirm('Namen bearbeiten?', 'Dafür startet eine neue Partie, alle Blätter werden leer.', 'Bearbeiten')
        .then(function (yes) { if (yes) toSetup(); });
    });

    el.resetGame.addEventListener('click', function () {
      askConfirm('Partie abbrechen?', 'Alle Blätter gehen verloren.', 'Abbrechen')
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

    if (state.phase === 'setup') roster.set(['', '', '']);

    if (!TG.store.available) {
      el.storageHint.textContent = 'Hinweis: Dieser Browser erlaubt keinen lokalen Speicher – die Blätter gehen beim Schließen verloren.';
    }

    save();
    render();
    bindEvents();
    TG.registerServiceWorker('../../sw.js');
  }

  init();
})(window, document);
