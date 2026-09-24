/* Fotojagd – die Punktevergabe. Jedes zusätzliche Foto kostet einen Punkt. */
'use strict';
const { load } = require('./harness.js');

exports.name = 'Fotojagd';

exports.run = function (t) {
  const F = load('games/fotojagd/rules.js').fotojagd;

  t.equal('fünf Fotos pro Versteck', F.PHOTO_COUNT, 5);
  t.equal('mit einem Foto gefunden gibt fünf', F.pointsFor(1, true), 5);
  t.equal('mit zwei Fotos vier', F.pointsFor(2, true), 4);
  t.equal('mit allen fünfen einen', F.pointsFor(5, true), 1);
  t.equal('aufgegeben gibt nichts', F.pointsFor(3, false), 0);
  t.equal('aufgegeben mit einem Foto auch nichts', F.pointsFor(1, false), 0);
  t.equal('höchstens erreichbar', F.maxPoints(), 5);

  /* Unsinnige Eingaben dürfen die Wertung nicht sprengen. */
  t.equal('null aufgedeckte zählen wie eins', F.pointsFor(0, true), 5);
  t.equal('mehr als fünf zählen wie fünf', F.pointsFor(99, true), 1);
  t.ok('jede Punktzahl liegt zwischen eins und fünf',
    [1, 2, 3, 4, 5].every((n) => F.pointsFor(n, true) >= 1 && F.pointsFor(n, true) <= 5));

  t.equal('das nächste Foto kostet einen Punkt', F.revealCost(1), 1);
  t.equal('nach dem letzten kostet nichts mehr', F.revealCost(5), 0);

  /* ---- Vollzähligkeit ---- */
  t.ok('fünf Schlüssel sind vollzählig', F.hasAllPhotos(['a', 'b', 'c', 'd', 'e']));
  t.ok('eine Lücke fällt auf', !F.hasAllPhotos(['a', 'b', null, 'd', 'e']));
  t.ok('zu wenige fallen auf', !F.hasAllPhotos(['a', 'b', 'c']));
  t.ok('zu viele fallen auf', !F.hasAllPhotos(['a', 'b', 'c', 'd', 'e', 'f']));
  t.ok('nichts ist nicht vollzählig', !F.hasAllPhotos(null));

  /* ---- Punktestand ---- */
  const spieler = [
    { name: 'Anna', hunts: [{ points: 5, found: true, revealed: 1, seconds: 95 }, { points: 0, found: false, revealed: 5, seconds: 400 }] },
    { name: 'Ben', hunts: [{ points: 3, found: true, revealed: 3, seconds: 220 }, { points: 1, found: true, revealed: 5, seconds: 61 }] }
  ];
  t.equal('Annas Punkte', F.scoreOf(spieler[0].hunts), 5);
  t.equal('Bens Punkte', F.scoreOf(spieler[1].hunts), 4);

  const stand = F.standings(spieler);
  t.ok('kein Gleichstand', !stand.tie);
  t.equal('Anna führt', stand.winner.name, 'Anna');
  t.equal('Anna hat einmal gefunden', stand.rows[0].found, 1);
  t.equal('Ben zweimal', stand.rows[1].found, 2);
  t.equal('Annas schnellster Fund', stand.rows[0].fastest, 95);
  t.equal('Bens schnellster Fund', stand.rows[1].fastest, 61);

  const nieGefunden = F.standings([{ name: 'A', hunts: [{ points: 0, found: false, revealed: 5, seconds: 300 }] },
                                   { name: 'B', hunts: [{ points: 0, found: false, revealed: 5, seconds: 300 }] }]);
  t.ok('beide ohne Fund ist Gleichstand', nieGefunden.tie);
  t.equal('ohne Fund keine Bestzeit', nieGefunden.rows[0].fastest, null);

  /* ---- Verbleibende Verstecke ---- */
  t.equal('bei einer Runde zwei Verstecke', F.huntsLeft([{ hunts: [] }, { hunts: [] }], 1), 2);
  t.equal('nach einem bleibt eins', F.huntsLeft([{ hunts: [1] }, { hunts: [] }], 1), 1);
  t.equal('nie unter null', F.huntsLeft([{ hunts: [1, 1] }, { hunts: [1, 1] }], 1), 0);

  /* ---- Zeitangabe ---- */
  t.equal('unter einer Minute', F.clockLabel(45), '0:45');
  t.equal('mit führender Null', F.clockLabel(65), '1:05');
  t.equal('glatte Minuten', F.clockLabel(120), '2:00');
  t.equal('null Sekunden', F.clockLabel(0), '0:00');
  t.equal('nichts übergeben', F.clockLabel(undefined), '0:00');
  t.equal('lange Suche', F.clockLabel(3725), '62:05');
};
