/* Mäxchen – die Rangfolge. Sie ist unintuitiv, deshalb steht sie hier
   Stück für Stück nachgerechnet. */
'use strict';
const { load } = require('./harness.js');

exports.name = 'Mäxchen';

exports.run = function (t) {
  const M = load('games/maexchen/rules.js').maexchen;

  /* ---- Wurf lesen: die größere Augenzahl kommt zuerst ---- */
  t.equal('6 und 3 ergibt 63', M.valueOf(6, 3), 63);
  t.equal('3 und 6 ergibt auch 63', M.valueOf(3, 6), 63);
  t.equal('zwei Vieren ergeben 44', M.valueOf(4, 4), 44);
  t.equal('2 und 1 ist das Mäxchen', M.valueOf(2, 1), M.MAEXCHEN);
  t.equal('1 und 2 ist auch das Mäxchen', M.valueOf(1, 2), 21);

  /* ---- Rangfolge: erst normal, dann Päsche, ganz oben das Mäxchen ---- */
  t.equal('31 ist der schwächste Wurf', M.rankOf(31), 0);
  t.equal('Mäxchen steht ganz oben', M.rankOf(M.MAEXCHEN), M.ORDER.length - 1);
  /* higherThan liefert alle Werte, die man auf den genannten noch ansagen darf. */
  const ueber65 = M.higherThan(65);
  t.ok('über 65 stehen nur noch Päsche und das Mäxchen',
    ueber65.every((v) => M.isPasch(v) || M.isMaexchen(v)), ueber65);
  t.equal('das sind sechs Päsche plus Mäxchen', ueber65.length, 7);
  t.ok('der kleinste Pasch gehört dazu', ueber65.indexOf(11) > -1, ueber65);

  const ueber43 = M.higherThan(43);
  t.ok('der eigene Wert ist nicht mehr dabei', ueber43.indexOf(43) < 0, ueber43);
  t.ok('51 liegt über 43', ueber43.indexOf(51) > -1, ueber43);
  t.ok('42 liegt nicht über 43', ueber43.indexOf(42) < 0, ueber43);

  t.equal('über dem Mäxchen kommt nichts mehr', M.higherThan(M.MAEXCHEN), []);
  t.equal('über 66 steht nur das Mäxchen', M.higherThan(66), [M.MAEXCHEN]);
  t.equal('ohne Vorgabe stehen alle Werte offen', M.higherThan(null).length, M.ORDER.length);
  t.equal('ein unmöglicher Wert gibt auch alles frei', M.higherThan(99).length, M.ORDER.length);

  t.ok('21 ist kein Pasch', !M.isPasch(21));
  t.ok('22 ist ein Pasch', M.isPasch(22));
  t.ok('66 ist ein Pasch', M.isPasch(66));
  t.ok('43 ist kein Pasch', !M.isPasch(43));
  t.ok('Mäxchen erkannt', M.isMaexchen(21) && !M.isMaexchen(11));

  t.equal('jeder Wurf kommt genau einmal in der Rangfolge vor',
    M.ORDER.length, new Set(M.ORDER).size);
  t.equal('einundzwanzig mögliche Werte', M.ORDER.length, 21);

  /* Alle 36 Würfe müssen einen Rang haben. */
  let ohneRang = 0;
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      if (M.rankOf(M.valueOf(a, b)) < 0) ohneRang++;
    }
  }
  t.equal('alle 36 Würfe haben einen Rang', ohneRang, 0);

  /* ---- Das Urteil beim Aufdecken ---- */
  /* Wer weniger hat, als er ansagt, hat geblufft und verliert. */
  const geblufft = M.judge(54, 43);
  t.ok('zu hoch angesagt ist ein Bluff', geblufft.bluff);
  t.equal('der Lügner zahlt', geblufft.loser, 'announcer');
  t.equal('normaler Einsatz ist ein Leben', geblufft.stake, 1);

  const ehrlich = M.judge(43, 54);
  t.ok('mehr als angesagt ist kein Bluff', !ehrlich.bluff);
  t.equal('dann zahlt der Zweifler', ehrlich.loser, 'challenger');

  const genau = M.judge(43, 43);
  t.ok('genau die Ansage ist kein Bluff', !genau.bluff);
  t.equal('auch dann zahlt der Zweifler', genau.loser, 'challenger');

  /* Die Stelle, an der ich mich selbst vertan hatte: ein Pasch anzusagen und
     nur 65 zu haben IST ein Bluff, weil der kleinste Pasch alles Normale schlägt. */
  const paschGelogen = M.judge(22, 65);
  t.ok('Pasch angesagt, 65 gewürfelt, ist ein Bluff', paschGelogen.bluff);

  const maexchenEcht = M.judge(21, 21);
  t.ok('Mäxchen angesagt und gehabt', !maexchenEcht.bluff);
  t.equal('beim Mäxchen stehen zwei Leben auf dem Spiel', maexchenEcht.stake, 2);
  t.equal('Mäxchen gelogen kostet auch zwei', M.judge(21, 65).stake, 2);
  t.ok('Mäxchen gelogen ist ein Bluff', M.judge(21, 65).bluff);

  /* ---- Beschriftung ---- */
  t.equal('normaler Wurf', M.label(65), '65');
  t.ok('Mäxchen hat einen eigenen Namen', M.label(21).toLowerCase().indexOf('mäxchen') > -1, M.label(21));
};
