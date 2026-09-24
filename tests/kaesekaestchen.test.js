/* Käsekästchen – Linien ziehen, Kästchen schließen. */
'use strict';
const { load } = require('./harness.js');

exports.name = 'Käsekästchen';

exports.run = function (t) {
  const B = load('games/kaesekaestchen/rules.js').dotsAndBoxes;

  const brett = B.createBoard(4);
  t.equal('Kantenlänge gemerkt', brett.size, 4);
  t.equal('waagerechte Linien: fünf Reihen à vier', [brett.h.length, brett.h[0].length], [5, 4]);
  t.equal('senkrechte Linien: vier Reihen à fünf', [brett.v.length, brett.v[0].length], [4, 5]);
  t.equal('sechzehn Kästchen, alle frei', brett.boxes.flat().filter((b) => b === null).length, 16);
  t.equal('vierzig Linien insgesamt', B.totalLines(4), 40);
  t.equal('gezählte Linien stimmen', brett.h.flat().length + brett.v.flat().length, B.totalLines(4));
  t.ok('am Anfang ist nichts fertig', !B.isFinished(brett));
  t.equal('am Anfang null zu null', B.scores(brett), [0, 0]);

  /* ---- Eine Linie ziehen ---- */
  const erste = B.claim(brett, 'h', 0, 0, 0);
  t.ok('Linie geht durch', erste.ok);
  t.equal('noch kein Kästchen zu', erste.closed, []);
  t.ok('kein Extrazug', !erste.again);
  t.ok('Linie gilt als belegt', B.lineTaken(brett, 'h', 0, 0));

  const nochmal = B.claim(brett, 'h', 0, 0, 1);
  t.ok('dieselbe Linie geht nicht zweimal', !nochmal.ok);
  t.ok('mit Begründung', typeof nochmal.error === 'string' && nochmal.error.length > 0, nochmal.error);

  /* ---- Ein Kästchen schließen: vier Seiten, der Letzte bekommt es ---- */
  t.equal('eine Seite gezogen', B.sidesOf(brett, 0, 0), 1);
  B.claim(brett, 'v', 0, 0, 0);
  B.claim(brett, 'v', 0, 1, 0);
  t.equal('drei Seiten gezogen', B.sidesOf(brett, 0, 0), 3);
  t.equal('immer noch niemandem', brett.boxes[0][0], null);

  const schliesst = B.claim(brett, 'h', 1, 0, 1);
  t.ok('vierte Seite schließt das Kästchen', schliesst.ok);
  t.equal('genau ein Kästchen', schliesst.closed.length, 1);
  t.ok('und es gibt einen Extrazug', schliesst.again);
  t.equal('das Kästchen gehört dem, der geschlossen hat', brett.boxes[0][0], 1);
  t.equal('Punktestand', B.scores(brett), [0, 1]);

  /* ---- Eine Linie kann zwei Kästchen auf einmal schließen ---- */
  const doppelt = B.createBoard(4);
  /* Kästchen (0,0) und (1,0) bis auf die gemeinsame Linie h/1/0 vorbereiten */
  B.claim(doppelt, 'h', 0, 0, 0);
  B.claim(doppelt, 'v', 0, 0, 0);
  B.claim(doppelt, 'v', 0, 1, 0);
  B.claim(doppelt, 'h', 2, 0, 0);
  B.claim(doppelt, 'v', 1, 0, 0);
  B.claim(doppelt, 'v', 1, 1, 0);
  t.equal('oben drei Seiten', B.sidesOf(doppelt, 0, 0), 3);
  t.equal('unten drei Seiten', B.sidesOf(doppelt, 1, 0), 3);
  const beide = B.claim(doppelt, 'h', 1, 0, 1);
  t.equal('eine Linie, zwei Kästchen', beide.closed.length, 2);
  t.equal('beide gehören demselben', B.scores(doppelt), [0, 2]);

  /* ---- Rand: außerhalb liegende Linien gelten als belegt ---- */
  t.ok('Linie außerhalb zählt als belegt', B.lineTaken(brett, 'h', 99, 0));
  t.ok('negative Linie zählt als belegt', B.lineTaken(brett, 'v', 0, 99));
  t.ok('Ziehen außerhalb geht nicht', !B.claim(brett, 'h', 99, 0, 0).ok);

  /* ---- Ein ganzes Brett vollspielen ---- */
  for (const size of B.SIZES) {
    const voll = B.createBoard(size);
    let gezogen = 0;
    let vergeben = 0;
    let spieler = 0;

    for (let r = 0; r < voll.h.length; r++) {
      for (let c = 0; c < voll.h[r].length; c++) {
        const res = B.claim(voll, 'h', r, c, spieler);
        if (res.ok) { gezogen++; vergeben += res.closed.length; if (!res.again) spieler = 1 - spieler; }
      }
    }
    for (let r = 0; r < voll.v.length; r++) {
      for (let c = 0; c < voll.v[r].length; c++) {
        const res = B.claim(voll, 'v', r, c, spieler);
        if (res.ok) { gezogen++; vergeben += res.closed.length; if (!res.again) spieler = 1 - spieler; }
      }
    }

    t.equal(`Brett ${size}: alle Linien gezogen`, gezogen, B.totalLines(size));
    t.equal(`Brett ${size}: alle Kästchen vergeben`, vergeben, size * size);
    t.ok(`Brett ${size}: gilt als fertig`, B.isFinished(voll));
    t.equal(`Brett ${size}: Punkte gehen auf`, B.scores(voll)[0] + B.scores(voll)[1], size * size);
  }
};
