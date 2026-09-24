/* Dame – reine Regeln, ohne Oberfläche.
   Gespielt wird nach den in Deutschland üblichen Hausregeln; sie stehen als
   Schalter oben, weil jede Familie sie ein bisschen anders kennt:

   - 8×8 Felder, je 12 Steine, gespielt wird nur auf den dunklen Feldern.
   - Steine ziehen ein Feld schräg vorwärts.
   - SCHLAGZWANG: Wer schlagen kann, muss schlagen.
   - Steine schlagen auch rückwärts (anders als im englischen Draughts).
   - Mehrfachsprünge müssen zu Ende geführt werden.
   - Eine Dame zieht und schlägt beliebig weit diagonal ("fliegende Dame").
   - Kein Mehrschlagzwang: Man muss schlagen, aber nicht den längsten Weg.
   - Wer die Grundlinie erreicht, wird Dame – aber nicht mitten im Sprung:
     Zieht ein Stein beim Schlagen nur durch, bleibt er Stein und springt
     weiter. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var SIZE = 8;
  var PER_SIDE = 12;

  var MEN_CAPTURE_BACKWARDS = true;
  var FLYING_KINGS = true;
  var MUST_TAKE_MAXIMUM = false;

  /* Ein Feld ist entweder leer (null) oder { side: 0|1, king: bool }. */
  function inside(x, y) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
  }

  /* Gespielt wird auf den dunklen Feldern – das sind die mit ungerader Summe. */
  function playable(x, y) {
    return (x + y) % 2 === 1;
  }

  function at(board, x, y) {
    return inside(x, y) ? board[y * SIZE + x] : undefined;
  }

  function setAt(board, x, y, piece) {
    board[y * SIZE + x] = piece;
  }

  function startBoard() {
    var board = [];
    for (var i = 0; i < SIZE * SIZE; i++) board.push(null);

    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        if (!playable(x, y)) continue;
        if (y < 3) setAt(board, x, y, { side: 1, king: false });
        if (y > SIZE - 4) setAt(board, x, y, { side: 0, king: false });
      }
    }

    return board;
  }

  function cloneBoard(board) {
    return board.map(function (piece) {
      if (!piece) return null;
      var copy = { side: piece.side, king: piece.king };
      /* Während einer Schlagfolge bleiben genommene Steine liegen und
         versperren den Weg. Diese Markierung muss das Kopieren überstehen –
         sonst ließen sie sich im selben Zug wieder und wieder schlagen, und
         die Suche nach Schlagfolgen läuft im Kreis. */
      if (piece.taken) copy.taken = true;
      return copy;
    });
  }

  /* Spieler 0 zieht nach oben (kleiner werdendes y), Spieler 1 nach unten. */
  function forward(side) { return side === 0 ? -1 : 1; }

  function homeRow(side) { return side === 0 ? 0 : SIZE - 1; }

  var DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  /* Alle einfachen Züge eines Steins – nur wenn niemand schlagen kann. */
  function stepsFrom(board, x, y) {
    var piece = at(board, x, y);
    if (!piece) return [];

    var moves = [];
    var reach = piece.king && FLYING_KINGS ? SIZE : 1;

    DIRS.forEach(function (dir) {
      if (!piece.king && dir[1] !== forward(piece.side)) return;

      for (var step = 1; step <= reach; step++) {
        var tx = x + dir[0] * step;
        var ty = y + dir[1] * step;
        if (!inside(tx, ty) || at(board, tx, ty)) break;
        moves.push({ from: [x, y], to: [tx, ty], captures: [], path: [[tx, ty]] });
      }
    });

    return moves;
  }

  /* Ein einzelner Sprung. Die Dame darf anlaufen und hinter dem geschlagenen
     Stein beliebig weit landen – deshalb kommen mehrere Ziele je Richtung. */
  function jumpsFrom(board, x, y) {
    var piece = at(board, x, y);
    if (!piece) return [];

    var jumps = [];
    var reach = piece.king && FLYING_KINGS ? SIZE : 1;

    DIRS.forEach(function (dir) {
      if (!piece.king && !MEN_CAPTURE_BACKWARDS && dir[1] !== forward(piece.side)) return;

      var victim = null;
      var step;

      for (step = 1; step <= reach; step++) {
        var cx = x + dir[0] * step;
        var cy = y + dir[1] * step;
        if (!inside(cx, cy)) return;

        var here = at(board, cx, cy);
        if (!here) continue;
        if (here.side === piece.side) return;   /* eigener Stein blockiert */
        victim = [cx, cy];
        break;
      }

      if (!victim) return;

      /* Hinter dem Opfer weiterlaufen, solange frei. */
      for (var after = step + 1; after <= step + reach; after++) {
        var tx = x + dir[0] * after;
        var ty = y + dir[1] * after;
        if (!inside(tx, ty) || at(board, tx, ty)) break;
        jumps.push({ from: [x, y], to: [tx, ty], captures: [victim] });
        if (!piece.king || !FLYING_KINGS) break;
      }
    });

    return jumps;
  }

  /* Vollständige Schlagfolgen: ein Sprung, dann weiter, solange es geht.
     Geschlagene Steine bleiben bis zum Ende der Folge liegen, dürfen aber
     nicht zweimal genommen werden – deshalb wird mit Platzhaltern gerechnet. */
  function captureSequences(board, x, y) {
    var piece = at(board, x, y);
    if (!piece) return [];

    var sequences = [];

    function walk(state, cx, cy, taken, path) {
      /* Mehr als alle gegnerischen Steine kann eine Folge nie nehmen. */
      if (taken.length > PER_SIDE) return;

      var jumps = jumpsFrom(state, cx, cy).filter(function (jump) {
        var victim = at(state, jump.captures[0][0], jump.captures[0][1]);
        return victim && !victim.taken;
      });

      if (!jumps.length) {
        if (taken.length) {
          sequences.push({
            from: [x, y],
            to: [cx, cy],
            captures: taken.slice(),
            path: path.slice()
          });
        }
        return;
      }

      jumps.forEach(function (jump) {
        var next = cloneBoard(state);
        var victim = jump.captures[0];
        var mover = at(next, cx, cy);

        /* Als genommen markieren, aber liegen lassen: der Springer darf im
           selben Zug nicht über denselben Stein zurück. */
        at(next, victim[0], victim[1]).taken = true;
        setAt(next, cx, cy, null);
        setAt(next, jump.to[0], jump.to[1], mover);

        walk(next, jump.to[0], jump.to[1], taken.concat([victim]), path.concat([jump.to]));
      });
    }

    walk(cloneBoard(board), x, y, [], []);
    return sequences;
  }

  /* Alle erlaubten Züge einer Seite – Schlagzwang inklusive. */
  function legalMoves(board, side) {
    var captures = [];
    var steps = [];

    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var piece = at(board, x, y);
        if (!piece || piece.side !== side) continue;
        captures = captures.concat(captureSequences(board, x, y));
        steps = steps.concat(stepsFrom(board, x, y));
      }
    }

    if (!captures.length) return steps;
    if (!MUST_TAKE_MAXIMUM) return captures;

    var most = 0;
    captures.forEach(function (move) { most = Math.max(most, move.captures.length); });
    return captures.filter(function (move) { return move.captures.length === most; });
  }

  function movesFrom(board, side, x, y) {
    return legalMoves(board, side).filter(function (move) {
      return move.from[0] === x && move.from[1] === y;
    });
  }

  function mustCapture(board, side) {
    return legalMoves(board, side).some(function (move) { return move.captures.length > 0; });
  }

  /* Führt einen Zug aus und gibt das neue Brett zurück. */
  function applyMove(board, move) {
    var next = cloneBoard(board);
    var piece = at(next, move.from[0], move.from[1]);
    if (!piece) return { board: next, promoted: false };

    setAt(next, move.from[0], move.from[1], null);
    move.captures.forEach(function (cell) { setAt(next, cell[0], cell[1], null); });

    /* Erst am Ende des Zuges wird umgewandelt, nicht im Durchsprung. */
    var promoted = !piece.king && move.to[1] === homeRow(piece.side);
    if (promoted) piece.king = true;

    setAt(next, move.to[0], move.to[1], piece);
    return { board: next, promoted: promoted };
  }

  function countPieces(board, side) {
    var men = 0;
    var kings = 0;
    board.forEach(function (piece) {
      if (!piece || piece.side !== side) return;
      if (piece.king) kings++; else men++;
    });
    return { men: men, kings: kings, total: men + kings };
  }

  /* Verloren hat, wer keine Steine mehr hat oder sich nicht mehr rühren kann. */
  function outcome(board, side) {
    if (countPieces(board, side).total === 0) return { over: true, winner: side === 0 ? 1 : 0, reason: 'steine' };
    if (!legalMoves(board, side).length) return { over: true, winner: side === 0 ? 1 : 0, reason: 'zugunfaehig' };
    return { over: false };
  }

  /* "d3" – so notiert man sich einen Zug im Kopf. */
  function cellLabel(x, y) {
    return 'abcdefgh'.charAt(x) + (SIZE - y);
  }

  function moveLabel(move) {
    return cellLabel(move.from[0], move.from[1]) +
      (move.captures.length ? 'x' : '–') +
      cellLabel(move.to[0], move.to[1]);
  }

  TG.dame = {
    SIZE: SIZE,
    PER_SIDE: PER_SIDE,
    MEN_CAPTURE_BACKWARDS: MEN_CAPTURE_BACKWARDS,
    FLYING_KINGS: FLYING_KINGS,
    MUST_TAKE_MAXIMUM: MUST_TAKE_MAXIMUM,
    playable: playable,
    at: at,
    startBoard: startBoard,
    cloneBoard: cloneBoard,
    legalMoves: legalMoves,
    movesFrom: movesFrom,
    mustCapture: mustCapture,
    applyMove: applyMove,
    countPieces: countPieces,
    outcome: outcome,
    cellLabel: cellLabel,
    moveLabel: moveLabel
  };
})(window);
