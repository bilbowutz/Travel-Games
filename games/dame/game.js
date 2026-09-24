/* Dame – zu zweit auf einem Handy.
   Beide schauen aufs selbe Brett, es wird nicht weitergereicht. Angetippt
   wird erst ein eigener Stein, dann ein Zielfeld; Mehrfachsprünge zeigen
   direkt das Endfeld samt Anzahl der Steine, die dabei fallen.
   Die Regeln selbst stehen in rules.js. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var D = TG.dame;
  var STATE_KEY = 'dame.state';
  var STATE_VERSION = 1;
  var SIZE = D.SIZE;

  var el = {
    setup: document.getElementById('setup'),
    play: document.getElementById('play'),
    over: document.getElementById('over'),
    nameList: document.getElementById('name-list'),
    setupSummary: document.getElementById('setup-summary'),
    setupActions: document.getElementById('setup-actions'),
    playActions: document.getElementById('play-actions'),
    overActions: document.getElementById('over-actions'),
    startGame: document.getElementById('start-game'),
    turnName: document.getElementById('turn-name'),
    lastMove: document.getElementById('last-move'),
    board: document.getElementById('board'),
    hint: document.getElementById('hint'),
    tally: document.getElementById('tally'),
    undo: document.getElementById('undo'),
    offerDraw: document.getElementById('offer-draw'),
    overTitle: document.getElementById('over-title'),
    overText: document.getElementById('over-text'),
    finalBoard: document.getElementById('final-board'),
    newNames: document.getElementById('new-names'),
    rematch: document.getElementById('rematch'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
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
  var selected = null;
  var flashing = [];

  var roster = TG.nameEditor(el.nameList, { min: 2, max: 2, maxLength: 14 });

  /* ---------------- Zustand ---------------- */

  function emptyState() {
    return {
      v: STATE_VERSION,
      phase: 'setup',
      players: [],
      board: D.startBoard(),
      current: 0,
      previous: null,
      lastMove: null,
      winner: null,
      draw: false,
      moves: 0
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      Array.isArray(candidate.players) &&
      Array.isArray(candidate.board) &&
      candidate.board.length === SIZE * SIZE &&
      ['setup', 'play', 'over'].indexOf(candidate.phase) > -1;
  }

  function save() { TG.store.set(STATE_KEY, state); }

  function other(side) { return side === 0 ? 1 : 0; }

  function playerName(side) {
    var player = state.players[side];
    return player ? player.name : '–';
  }

  /* ---------------- Brett ---------------- */

  function key(x, y) { return x + ',' + y; }

  /* Zielfelder des gewählten Steins: je Endfeld der Zug mit den meisten
     geschlagenen Steinen, damit der lohnendste Weg angeboten wird. */
  function targetsFor(x, y) {
    var moves = D.movesFrom(state.board, state.current, x, y);
    var best = {};

    moves.forEach(function (move) {
      var id = key(move.to[0], move.to[1]);
      if (!best[id] || move.captures.length > best[id].captures.length) best[id] = move;
    });

    return best;
  }

  function buildBoard(container, board, options) {
    options = options || {};
    container.textContent = '';

    var targets = options.targets || {};
    var movable = options.movable || {};

    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        container.appendChild(cellNode(board, x, y, targets, movable, options));
      }
    }
  }

  function cellNode(board, x, y, targets, movable, options) {
    var dark = D.playable(x, y);
    var piece = D.at(board, x, y);
    var id = key(x, y);
    var target = targets[id];
    /* Auch gesperrte eigene Steine bleiben antippbar – sonst passiert beim
       Schlagzwang einfach nichts und niemand erfährt, warum. */
    var mine = piece && piece.side === state.current;
    var interactive = !!options.onCell && (target || movable[id] || mine);

    var cell = document.createElement(interactive ? 'button' : 'div');
    if (interactive) { cell.type = 'button'; cell.dataset.x = String(x); cell.dataset.y = String(y); }

    cell.className = 'dm-cell' + (dark ? ' is-dark' : ' is-light') +
      (selected && selected.x === x && selected.y === y ? ' is-selected' : '') +
      (target ? ' is-target' : '') +
      (movable[id] ? ' is-movable' : '') +
      (flashing.indexOf(id) > -1 ? ' is-taken' : '');

    if (piece) {
      var stone = document.createElement('span');
      stone.className = 'dm-piece' + (piece.side === 0 ? ' is-light' : ' is-dark') +
        (piece.king ? ' is-king' : '');
      stone.setAttribute('aria-hidden', 'true');
      if (piece.king) stone.textContent = '♛';
      cell.appendChild(stone);
    }

    if (target) {
      var dot = document.createElement('span');
      dot.className = 'dm-dot' + (target.captures.length ? ' is-capture' : '');
      dot.setAttribute('aria-hidden', 'true');
      if (target.captures.length > 1) dot.textContent = String(target.captures.length);
      cell.appendChild(dot);
    }

    cell.setAttribute('aria-label', describeCell(x, y, piece, target, movable[id]));
    return cell;
  }

  function describeCell(x, y, piece, target, movable) {
    var label = D.cellLabel(x, y);
    if (target) {
      return label + ' – hierher ziehen' +
        (target.captures.length ? ', schlägt ' + target.captures.length : '');
    }
    if (piece) {
      var who = playerName(piece.side);
      return label + ' – ' + (piece.king ? 'Dame' : 'Stein') + ' von ' + who +
        (movable ? ', auswählen' : '');
    }
    return label + ' – leer';
  }

  function renderPlay() {
    var board = state.board;
    var mustCapture = D.mustCapture(board, state.current);
    var moves = D.legalMoves(board, state.current);

    el.turnName.textContent = playerName(state.current) + ' ist dran';

    el.lastMove.hidden = !state.lastMove;
    if (state.lastMove) el.lastMove.textContent = state.lastMove;

    el.hint.textContent = selected
      ? 'Zielfeld antippen. Nochmal auf den Stein tippen hebt die Auswahl auf.'
      : (mustCapture
        ? 'Schlagzwang: nur die hervorgehobenen Steine dürfen ziehen.'
        : 'Tippe einen eigenen Stein an.');

    var movable = {};
    moves.forEach(function (move) { movable[key(move.from[0], move.from[1])] = true; });

    var targets = selected ? targetsFor(selected.x, selected.y) : {};

    buildBoard(el.board, board, { targets: targets, movable: movable, onCell: true });

    el.tally.textContent = '';
    [0, 1].forEach(function (side) {
      var count = D.countPieces(board, side);
      var item = document.createElement('li');
      item.className = 'dm-tally__item' + (side === state.current ? ' is-turn' : '');

      var chip = document.createElement('span');
      chip.className = 'dm-piece dm-piece--mini ' + (side === 0 ? 'is-light' : 'is-dark');
      chip.setAttribute('aria-hidden', 'true');

      var text = document.createElement('span');
      text.textContent = playerName(side) + ': ' + count.total +
        (count.kings ? ' (' + count.kings + '×♛)' : '');

      item.appendChild(chip);
      item.appendChild(text);
      el.tally.appendChild(item);
    });

    el.undo.disabled = !state.previous;
  }

  function onCell(x, y) {
    var piece = D.at(state.board, x, y);

    /* Nochmal auf den gewählten Stein: Auswahl weg. */
    if (selected && selected.x === x && selected.y === y) {
      selected = null;
      render();
      return;
    }

    if (selected) {
      var target = targetsFor(selected.x, selected.y)[key(x, y)];
      if (target) { doMove(target); return; }
    }

    if (piece && piece.side === state.current) {
      if (!D.movesFrom(state.board, state.current, x, y).length) {
        TG.toast(D.mustCapture(state.board, state.current)
          ? 'Schlagzwang – dieser Stein darf nicht'
          : 'Der kann gerade nirgendwo hin');
        return;
      }
      selected = { x: x, y: y };
      TG.haptic(6);
      render();
      return;
    }

    selected = null;
    render();
  }

  function doMove(move) {
    var result = D.applyMove(state.board, move);

    state.previous = { board: state.board, current: state.current, lastMove: state.lastMove };
    state.board = result.board;
    state.moves += 1;

    var note = playerName(state.current) + ': ' + D.moveLabel(move);
    if (move.captures.length) note += ' (' + move.captures.length + ' geschlagen)';
    if (result.promoted) note += ' – Dame!';
    state.lastMove = note;

    /* Kurz zeigen, welche Steine gefallen sind – sonst verschwinden sie
       kommentarlos, gerade bei Mehrfachsprüngen. */
    flashing = move.captures.map(function (cell) { return key(cell[0], cell[1]); });

    selected = null;
    state.current = other(state.current);

    TG.haptic(move.captures.length ? 16 : 6);
    if (result.promoted) TG.toast('Dame!', { variant: 'win' });

    var finish = D.outcome(state.board, state.current);
    if (finish.over) {
      state.phase = 'over';
      state.winner = finish.winner;
      state.reason = finish.reason;
      save();
      TG.haptic([0, 40, 60, 40]);
      TG.confetti(200);
      render();
      return;
    }

    save();
    render();

    window.setTimeout(function () {
      if (!flashing.length) return;
      flashing = [];
      if (state.phase === 'play') render();
    }, 420);
  }

  function undoMove() {
    if (!state.previous) return;

    state.board = state.previous.board;
    state.current = state.previous.current;
    state.lastMove = state.previous.lastMove;
    state.previous = null;
    state.moves = Math.max(0, state.moves - 1);
    selected = null;
    flashing = [];

    TG.haptic(8);
    save();
    render();
    TG.toast('Zug zurückgenommen');
  }

  function renderOver() {
    if (state.draw) {
      el.overTitle.textContent = '🤝 Remis';
      el.overText.textContent = 'Nach ' + state.moves + ' Zügen einigt man sich. ' +
        D.countPieces(state.board, 0).total + ' zu ' + D.countPieces(state.board, 1).total + ' Steine.';
    } else {
      var loser = other(state.winner);
      el.overTitle.textContent = '🏆 ' + playerName(state.winner) + ' gewinnt!';
      el.overText.textContent = state.reason === 'steine'
        ? playerName(loser) + ' hat keinen Stein mehr – nach ' + state.moves + ' Zügen.'
        : playerName(loser) + ' kann sich nicht mehr rühren – nach ' + state.moves + ' Zügen.';
    }

    buildBoard(el.finalBoard, state.board, {});
  }

  function render() {
    var phase = state.phase;

    el.setup.hidden = phase !== 'setup';
    el.play.hidden = phase !== 'play';
    el.over.hidden = phase !== 'over';

    el.setupActions.hidden = phase !== 'setup';
    el.playActions.hidden = phase !== 'play';
    el.overActions.hidden = phase !== 'over';

    if (phase === 'play') renderPlay(); else el.board.textContent = '';
    if (phase === 'over') renderOver(); else el.finalBoard.textContent = '';

    el.gameSummary.textContent = state.players.length === 2
      ? playerName(0) + ' (hell) gegen ' + playerName(1) + ' (dunkel) · ' + state.moves + ' Züge'
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
    if (names.length < 2) { TG.toast('Bitte zwei Namen eintragen'); return; }

    state = emptyState();
    state.players = names.slice(0, 2).map(function (name) { return { name: name }; });
    state.phase = 'play';
    selected = null;
    flashing = [];

    save();
    render();
  }

  function toSetup() {
    state = emptyState();
    roster.set(['', '']);
    selected = null;
    flashing = [];
    save();
    render();
  }

  function bindEvents() {
    el.startGame.addEventListener('click', startGame);

    el.nameList.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); startGame(); }
    });

    el.board.addEventListener('click', function (event) {
      var target = event.target.closest ? event.target.closest('.dm-cell') : null;
      if (!target || target.dataset.x == null) return;
      onCell(Number(target.dataset.x), Number(target.dataset.y));
    });

    el.undo.addEventListener('click', undoMove);

    el.offerDraw.addEventListener('click', function () {
      askConfirm('Remis?', 'Beide müssen einverstanden sein. Die Partie endet unentschieden.', 'Remis')
        .then(function (yes) {
          if (!yes) return;
          state.phase = 'over';
          state.draw = true;
          state.winner = null;
          save();
          render();
        });
    });

    el.rematch.addEventListener('click', function () {
      var names = state.players;
      state = emptyState();
      state.players = names;
      state.phase = 'play';
      selected = null;
      flashing = [];
      save();
      render();
      TG.toast('Neue Partie – hell beginnt');
    });

    el.newNames.addEventListener('click', toSetup);

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.resetGame.addEventListener('click', function () {
      askConfirm('Partie abbrechen?', 'Die Stellung geht verloren.', 'Abbrechen')
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
