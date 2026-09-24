/* Begriffe erklären – Stapel und Punktezählung. */
'use strict';
const { load } = require('./harness.js');

exports.name = 'Begriffe erklären';

exports.run = function (t) {
  const TG = load('assets/js/app.js', 'games/begriffe-erklaeren/words.js', 'games/begriffe-erklaeren/rules.js');
  const E = TG.explain;

  t.equal('drei Schwierigkeitsstufen', E.LEVELS.length, 3);
  t.equal('unbekannte Stufe wird zu mittel', E.levelById('gibtsnicht').id, 'mittel');
  E.LEVELS.forEach((stufe) => {
    t.ok(`Stufe ${stufe.id} hat genug Begriffe`, E.poolFor(stufe.id, []).length > 100,
      E.poolFor(stufe.id, []).length);
    t.ok(`Stufe ${stufe.id} hat eine Erklärung`, typeof stufe.hint === 'string' && stufe.hint.length > 10);
  });

  /* ---- Eigene Begriffe ---- */
  const basis = E.poolFor('leicht', []);
  const erweitert = E.poolFor('leicht', ['Kaffeemaschine', ' Hund ', 'hund', '', '   ', null, 'HUND']);
  t.ok('eigener Begriff kommt dazu', erweitert.indexOf('Kaffeemaschine') > -1);
  t.equal('doppelte und leere fliegen raus', erweitert.length, basis.length + 1);
  t.ok('keine leeren Einträge', erweitert.every((w) => w.trim().length > 0));
  t.ok('nichts hat Leerraum am Rand', erweitert.every((w) => w === w.trim()));

  /* ---- Stapel ---- */
  const stapel = E.buildDeck('mittel', [], TG.rng(4711));
  t.equal('Stapel enthält den ganzen Vorrat', stapel.length, E.poolFor('mittel', []).length);
  t.ok('Stapel ist gemischt', stapel.join() !== E.poolFor('mittel', []).join());
  t.equal('gleicher Startwert, gleicher Stapel',
    E.buildDeck('mittel', [], TG.rng(4711)), E.buildDeck('mittel', [], TG.rng(4711)));

  let rest = stapel.slice();
  const gezogen = [];
  for (let i = 0; i < stapel.length; i++) {
    const zug = E.draw(rest, 'mittel', [], Math.random);
    gezogen.push(zug.word);
    rest = zug.deck;
  }
  t.equal('jeder Begriff kommt genau einmal', new Set(gezogen).size, stapel.length);
  t.equal('danach ist der Stapel leer', rest.length, 0);

  const nachgelegt = E.draw(rest, 'mittel', [], Math.random);
  t.ok('leerer Stapel mischt neu', !!nachgelegt.word);
  t.equal('und ist wieder voll', nachgelegt.deck.length, stapel.length - 1);
  t.ok('leerer Vorrat bricht nicht', E.draw([], 'gibtsnicht', [], Math.random) !== undefined);

  /* ---- Punkte ---- */
  const anna = [{ guessed: ['a', 'b', 'c'], skipped: ['x'] }, { guessed: ['d'], skipped: [] }];
  const ben = [{ guessed: ['e', 'f'], skipped: ['y', 'z'] }, { guessed: ['g', 'h'], skipped: [] }];
  t.equal('jeder erratene Begriff ein Punkt', E.scoreOf(anna), 4);
  t.equal('Überspringen kostet nichts', E.scoreOf(ben), 4);
  t.equal('keine Runden, keine Punkte', E.scoreOf([]), 0);
  t.equal('nichts übergeben, keine Punkte', E.scoreOf(undefined), 0);

  const gleich = E.standings([{ name: 'Anna', turns: anna }, { name: 'Ben', turns: ben }]);
  t.ok('Gleichstand erkannt', gleich.tie);
  t.equal('dann gibt es keinen Sieger', gleich.winner, null);
  t.equal('Übersprungene werden mitgezählt', gleich.rows[1].skipped, 2);

  anna.push({ guessed: ['i'], skipped: [] });
  const sieger = E.standings([{ name: 'Anna', turns: anna }, { name: 'Ben', turns: ben }]);
  t.ok('kein Gleichstand mehr', !sieger.tie);
  t.equal('Anna gewinnt', sieger.winner.name, 'Anna');
  t.equal('mit fünf Punkten', sieger.best, 5);

  /* ---- Verbleibende Runden ---- */
  t.equal('am Anfang alle offen', E.turnsLeft([{ turns: [] }, { turns: [] }], 3), 6);
  t.equal('nach fünf Zügen bleibt einer', E.turnsLeft([{ turns: [1, 2, 3] }, { turns: [1, 2] }], 3), 1);
  t.equal('nie unter null', E.turnsLeft([{ turns: [1, 2, 3, 4] }, { turns: [1, 2, 3, 4] }], 3), 0);
};
