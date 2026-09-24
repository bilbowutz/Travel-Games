/* Kniffel – die Wertung. Reine Funktionen über fünf Würfeln. */
'use strict';
const { load } = require('./harness.js');

exports.name = 'Kniffel';

exports.run = function (t) {
  const K = load('games/kniffel/scoring.js').kniffel;
  const punkte = (feld, würfel, joker) => K.scoreFor(feld, würfel, joker ? { joker: true } : undefined);

  t.equal('dreizehn Felder', K.CATEGORIES.length, 13);
  t.equal('sechs davon oben', K.CATEGORIES.filter((c) => c.section === 'upper').length, 6);

  /* ---- Oberer Teil: nur die eigene Augenzahl zählt ---- */
  t.equal('Einer', punkte('einer', [1, 1, 3, 4, 1]), 3);
  t.equal('Sechser', punkte('sechser', [6, 6, 6, 2, 1]), 18);
  t.equal('Sechser ohne Sechsen', punkte('sechser', [1, 2, 3, 4, 5]), 0);

  /* ---- Unterer Teil ---- */
  t.equal('Dreierpasch zählt alle Augen', punkte('dreierpasch', [4, 4, 4, 6, 2]), 20);
  t.equal('Dreierpasch ohne drei Gleiche', punkte('dreierpasch', [1, 2, 3, 4, 5]), 0);
  t.equal('Viererpasch zählt alle Augen', punkte('viererpasch', [5, 5, 5, 5, 1]), 21);
  t.equal('Viererpasch bei fünf Gleichen', punkte('viererpasch', [3, 3, 3, 3, 3]), 15);
  t.equal('Viererpasch mit nur drei Gleichen', punkte('viererpasch', [5, 5, 5, 1, 1]), 0);

  t.equal('Full House', punkte('fullhouse', [2, 2, 2, 5, 5]), 25);
  t.equal('Full House ist nicht vier plus eins', punkte('fullhouse', [2, 2, 2, 2, 5]), 0);
  /* Fünf Gleiche sind kein Full House – dafür gibt es das Kniffel-Feld. */
  t.equal('fünf Gleiche sind kein Full House', punkte('fullhouse', [4, 4, 4, 4, 4]), 0);

  t.equal('kleine Straße', punkte('kleinestrasse', [1, 2, 3, 4, 4]), 30);
  t.equal('kleine Straße mitten drin', punkte('kleinestrasse', [6, 3, 4, 5, 6]), 30);
  t.equal('keine kleine Straße', punkte('kleinestrasse', [1, 2, 3, 5, 6]), 0);
  t.equal('große Straße unten', punkte('grossestrasse', [1, 2, 3, 4, 5]), 40);
  t.equal('große Straße oben', punkte('grossestrasse', [2, 3, 4, 5, 6]), 40);
  t.equal('vier in Folge ist keine große', punkte('grossestrasse', [1, 2, 3, 4, 6]), 0);
  t.equal('große Straße ist auch eine kleine', punkte('kleinestrasse', [1, 2, 3, 4, 5]), 30);

  t.equal('Kniffel', punkte('kniffel', [6, 6, 6, 6, 6]), 50);
  t.equal('vier Gleiche sind kein Kniffel', punkte('kniffel', [6, 6, 6, 6, 1]), 0);
  t.equal('Chance zählt immer alles', punkte('chance', [1, 2, 3, 4, 5]), 15);

  t.ok('Kniffel erkannt', K.isKniffel([2, 2, 2, 2, 2]));
  t.ok('kein Kniffel', !K.isKniffel([2, 2, 2, 2, 3]));
  t.ok('zu wenige Würfel sind kein Kniffel', !K.isKniffel([2, 2, 2, 2]));
  t.equal('unvollständiger Wurf gibt null', punkte('chance', [1, 2, 3]), 0);
  t.equal('unbekanntes Feld gibt null', punkte('gibtsnicht', [1, 2, 3, 4, 5]), 0);

  /* ---- Zusatz-Kniffel: Joker ---- */
  const blatt = K.emptySheet();
  t.ok('leeres Blatt hat nur offene Felder', K.openCategories(blatt).length === 13);
  t.ok('leeres Blatt ist nicht fertig', !K.isComplete(blatt));
  t.ok('ohne ersten Kniffel kein Joker', !K.isJoker([3, 3, 3, 3, 3], blatt));

  blatt.kniffel = 50;
  t.ok('mit Kniffel im Blatt wird es ein Joker', K.isJoker([3, 3, 3, 3, 3], blatt));
  t.ok('ohne fünf Gleiche kein Joker', !K.isJoker([3, 3, 3, 3, 1], blatt));
  t.equal('Joker füllt Full House', punkte('fullhouse', [3, 3, 3, 3, 3], true), 25);
  t.equal('Joker füllt kleine Straße', punkte('kleinestrasse', [3, 3, 3, 3, 3], true), 30);
  t.equal('Joker füllt große Straße', punkte('grossestrasse', [3, 3, 3, 3, 3], true), 40);
  t.equal('Joker ändert oben nichts', punkte('dreier', [3, 3, 3, 3, 3], true), 15);

  /* ---- Summen und Bonus ---- */
  const knapp = K.emptySheet();
  ['einer', 'zweier', 'dreier', 'vierer', 'fuenfer', 'sechser'].forEach((id, i) => {
    knapp[id] = (i + 1) * 3;          /* 3+6+9+12+15+18 = 63, genau der Bonus */
  });
  const summeKnapp = K.totals(knapp);
  t.equal('oberer Teil zusammen', summeKnapp.upper, 63);
  t.equal('Bonus ab 63', summeKnapp.bonus, K.UPPER_BONUS);

  const knappDaneben = K.emptySheet();
  ['einer', 'zweier', 'dreier', 'vierer', 'fuenfer', 'sechser'].forEach((id, i) => {
    knappDaneben[id] = (i + 1) * 3;
  });
  knappDaneben.einer = 2;             /* 62 – einer zu wenig */
  t.equal('kein Bonus bei 62', K.totals(knappDaneben).bonus, 0);

  const voll = K.emptySheet();
  K.CATEGORIES.forEach((c) => { voll[c.id] = 0; });
  voll.kniffel = 50;
  voll.kniffelBonus = K.KNIFFEL_BONUS * 2;
  const summeVoll = K.totals(voll);
  t.ok('volles Blatt ist fertig', K.isComplete(voll));
  t.equal('zwei Zusatz-Kniffel zählen mit', summeVoll.total, 50 + K.KNIFFEL_BONUS * 2);
  t.equal('keine offenen Felder mehr', K.openCategories(voll).length, 0);
};
