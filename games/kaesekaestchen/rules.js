/* Käsekästchen – reine Regeln, ohne Oberfläche.
   Linien werden über Typ, Zeile und Spalte angesprochen:
   'h' = waagerecht (size+1 Zeilen, size Spalten),
   'v' = senkrecht  (size Zeilen, size+1 Spalten). */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var SIZES = [4, 5, 6];

  function grid(rows, cols, value) {
    var out = [];
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) row.push(value);
      out.push(row);
    }
    return out;
  }

  function createBoard(size) {
    return {
      size: size,
      h: grid(size + 1, size, false),
      v: grid(size, size + 1, false),
      boxes: grid(size, size, null)
    };
  }

  function lineTaken(board, type, r, c) {
    var field = type === 'h' ? board.h : board.v;
    if (!field[r] || field[r][c] === undefined) return true;
    return field[r][c];
  }

  /* Zählt, wie viele Seiten eines Kästchens schon gezogen sind. */
  function sidesOf(board, r, c) {
    return (board.h[r][c] ? 1 : 0) +
      (board.h[r + 1][c] ? 1 : 0) +
      (board.v[r][c] ? 1 : 0) +
      (board.v[r][c + 1] ? 1 : 0);
  }

  /* Zieht eine Linie. Gibt zurück, welche Kästchen dadurch fertig wurden. */
  function claim(board, type, r, c, player) {
    if (lineTaken(board, type, r, c)) {
      return { ok: false, error: 'Diese Linie gibt es schon.' };
    }

    if (type === 'h') board.h[r][c] = true;
    else board.v[r][c] = true;

    var closed = [];
    var candidates = type === 'h'
      ? [[r - 1, c], [r, c]]
      : [[r, c - 1], [r, c]];

    candidates.forEach(function (cell) {
      var br = cell[0], bc = cell[1];
      if (br < 0 || bc < 0 || br >= board.size || bc >= board.size) return;
      if (board.boxes[br][bc] !== null) return;
      if (sidesOf(board, br, bc) === 4) {
        board.boxes[br][bc] = player;
        closed.push([br, bc]);
      }
    });

    return { ok: true, closed: closed, again: closed.length > 0 };
  }

  function scores(board) {
    var result = [0, 0];
    board.boxes.forEach(function (row) {
      row.forEach(function (owner) {
        if (owner === 0 || owner === 1) result[owner]++;
      });
    });
    return result;
  }

  function isFinished(board) {
    return board.boxes.every(function (row) {
      return row.every(function (owner) { return owner !== null; });
    });
  }

  function totalLines(size) {
    return (size + 1) * size * 2;
  }

  TG.dotsAndBoxes = {
    SIZES: SIZES,
    createBoard: createBoard,
    claim: claim,
    lineTaken: lineTaken,
    sidesOf: sidesOf,
    scores: scores,
    isFinished: isFinished,
    totalLines: totalLines
  };
})(window);
