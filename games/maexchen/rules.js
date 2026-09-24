/* Mäxchen – reine Regeln, ohne Oberfläche.
   Zwei Würfel werden als zweistellige Zahl gelesen, größere Augenzahl zuerst:
   6 und 3 ergibt 63. Die Rangfolge ist eigen:
   erst die normalen Werte, dann alle Päsche, ganz oben das Mäxchen (21). */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var MAEXCHEN = 21;

  /* Aufsteigend vom schwächsten zum stärksten Wert. */
  var ORDER = [
    31, 32, 41, 42, 43, 51, 52, 53, 54, 61, 62, 63, 64, 65,
    11, 22, 33, 44, 55, 66,
    MAEXCHEN
  ];

  function valueOf(first, second) {
    var high = Math.max(first, second);
    var low = Math.min(first, second);
    return high * 10 + low;
  }

  function rankOf(value) {
    return ORDER.indexOf(value);
  }

  function isPasch(value) {
    return value % 11 === 0 && value !== MAEXCHEN;
  }

  function isMaexchen(value) {
    return value === MAEXCHEN;
  }

  function label(value) {
    if (isMaexchen(value)) return 'Mäxchen';
    if (isPasch(value)) return String(value) + 'er Pasch';
    return String(value);
  }

  /* Alle Werte, die über dem angesagten liegen. Ohne Ansage: alle. */
  function higherThan(value) {
    if (value === null || value === undefined) return ORDER.slice();
    var rank = rankOf(value);
    if (rank < 0) return ORDER.slice();
    return ORDER.slice(rank + 1);
  }

  /* Wer verliert wie viele Leben, wenn aufgedeckt wird?
     Beim Mäxchen steht der doppelte Einsatz auf dem Spiel. */
  function judge(announced, actual) {
    var bluff = rankOf(actual) < rankOf(announced);
    var stake = isMaexchen(announced) ? 2 : 1;
    return {
      bluff: bluff,
      stake: stake,
      /* 'announcer' hat zu hoch angesagt, 'challenger' hat zu Unrecht gezweifelt. */
      loser: bluff ? 'announcer' : 'challenger'
    };
  }

  TG.maexchen = {
    MAEXCHEN: MAEXCHEN,
    ORDER: ORDER,
    valueOf: valueOf,
    rankOf: rankOf,
    isPasch: isPasch,
    isMaexchen: isMaexchen,
    label: label,
    higherThan: higherThan,
    judge: judge
  };
})(window);
