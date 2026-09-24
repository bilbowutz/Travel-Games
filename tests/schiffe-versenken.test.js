/* Schiffe versenken – Aufstellung und Schüsse.
   Hausregeln: Schiffe dürfen sich nicht berühren, auch nicht über Eck, und
   nach einem Treffer ist man nochmal dran. */
'use strict';
const { load } = require('./harness.js');

exports.name = 'Schiffe versenken';

const REIHE = [
  { shipId: 'schlachtschiff', x: 0, y: 0, horizontal: true },
  { shipId: 'kreuzer',        x: 0, y: 2, horizontal: true },
  { shipId: 'zerstoerer',     x: 0, y: 4, horizontal: true },
  { shipId: 'uboot',          x: 0, y: 6, horizontal: true },
  { shipId: 'schnellboot',    x: 0, y: 8, horizontal: true }
];

exports.run = function (t) {
  const B = load('games/schiffe-versenken/rules.js').battleship;
  const flotte = () => REIHE.map((p) => Object.assign({}, p));

  t.equal('zehn mal zehn', B.BOARD_SIZE, 10);
  t.equal('fünf Schiffe', B.FLEET.length, 5);
  t.equal('siebzehn Felder Flotte', B.FLEET.reduce((s, ship) => s + ship.size, 0), 17);
  t.ok('Schiffe dürfen sich nicht berühren', B.SHIPS_MAY_TOUCH === false);
  t.ok('Treffer gibt noch einen Zug', B.HIT_GIVES_ANOTHER_TURN === true);

  /* ---- Aufstellung ---- */
  t.ok('Reihenaufstellung ist gültig', B.validateFleet(flotte()).ok);
  t.ok('doppeltes Schiff fällt auf', !B.validateFleet(flotte().concat([REIHE[0]])).ok);
  t.ok('zu wenige Schiffe fallen auf', !B.validateFleet(flotte().slice(0, 4)).ok);
  t.ok('unbekanntes Schiff fällt auf',
    !B.validateFleet(flotte().slice(1).concat([{ shipId: 'kanu', x: 0, y: 0, horizontal: true }])).ok);

  const ueberRand = flotte();
  ueberRand[0].x = 6;
  t.ok('über den Rand geht nicht', !B.validateFleet(ueberRand).ok);
  t.ok('mit passender Meldung', /Rand/.test(B.validateFleet(ueberRand).error), B.validateFleet(ueberRand).error);

  const ecke = flotte();
  ecke[1] = { shipId: 'kreuzer', x: 5, y: 1, horizontal: true };
  t.ok('Berührung über Eck geht nicht', !B.validateFleet(ecke).ok);
  t.ok('mit passender Meldung', /berühren/.test(B.validateFleet(ecke).error), B.validateFleet(ecke).error);

  const aufeinander = flotte();
  aufeinander[1] = { shipId: 'kreuzer', x: 0, y: 0, horizontal: false };
  t.ok('übereinander geht nicht', !B.validateFleet(aufeinander).ok);

  /* Ein Feld Abstand ist erlaubt. */
  const knapp = [
    { shipId: 'schlachtschiff', x: 0, y: 0, horizontal: true },
    { shipId: 'kreuzer',        x: 0, y: 2, horizontal: true },
    { shipId: 'zerstoerer',     x: 6, y: 2, horizontal: true },
    { shipId: 'uboot',          x: 0, y: 4, horizontal: true },
    { shipId: 'schnellboot',    x: 4, y: 4, horizontal: true }
  ];
  t.ok('ein Feld Abstand reicht', B.validateFleet(knapp).ok, B.validateFleet(knapp).error);

  /* ---- Felder eines Schiffs ---- */
  t.equal('waagerecht belegt fünf Felder nebeneinander',
    B.cellsFor({ shipId: 'schlachtschiff', x: 2, y: 3, horizontal: true }),
    [[2, 3], [3, 3], [4, 3], [5, 3], [6, 3]]);
  t.equal('senkrecht belegt fünf Felder untereinander',
    B.cellsFor({ shipId: 'schlachtschiff', x: 2, y: 3, horizontal: false }),
    [[2, 3], [2, 4], [2, 5], [2, 6], [2, 7]]);
  t.equal('unbekanntes Schiff belegt nichts', B.cellsFor({ shipId: 'kanu', x: 0, y: 0, horizontal: true }), []);

  /* ---- Zufallsflotten ---- */
  let schlecht = 0;
  for (let i = 0; i < 2000; i++) {
    if (!B.validateFleet(B.randomFleet()).ok) schlecht++;
  }
  t.equal('2000 Zufallsflotten sind alle gültig', schlecht, 0);

  const gesetzt = B.randomFleet(load('assets/js/app.js').rng(99));
  const gesetzt2 = B.randomFleet(load('assets/js/app.js').rng(99));
  t.equal('gleicher Startwert, gleiche Flotte', gesetzt, gesetzt2);

  /* ---- Schießen ---- */
  const ziel = flotte();
  let schuesse = [];

  const daneben = B.fireAt(ziel, schuesse, 9, 9);
  t.ok('Schuss ins Wasser geht durch', daneben.ok);
  t.ok('und ist kein Treffer', !daneben.hit);
  t.ok('danach ist der andere dran', !daneben.keepTurn);

  const nochmal = B.fireAt(ziel, schuesse, 9, 9);
  t.ok('zweimal aufs selbe Feld geht nicht', !nochmal.ok);
  t.ok('mit Begründung', /schon/.test(nochmal.error), nochmal.error);
  t.ok('außerhalb des Bretts geht nicht', !B.fireAt(ziel, schuesse, 10, 0).ok);
  t.equal('nur der eine Schuss ist verbucht', schuesse.length, 1);

  const treffer = B.fireAt(ziel, schuesse, 0, 0);
  t.ok('Treffer erkannt', treffer.hit);
  t.ok('Treffer gibt noch einen Zug', treffer.keepTurn);
  t.equal('noch nichts versenkt', treffer.sunkShip, null);

  /* Das Schnellboot liegt auf (0,8) und (1,8) – zwei Treffer versenken es. */
  B.fireAt(ziel, schuesse, 0, 8);
  const versenkt = B.fireAt(ziel, schuesse, 1, 8);
  t.ok('zweiter Treffer versenkt das Schnellboot', versenkt.sunkShip !== null);
  t.equal('mit Namen', versenkt.sunkShip && versenkt.sunkShip.name, 'Schnellboot');
  t.ok('Partie ist noch nicht vorbei', !versenkt.finished);

  const stand = B.fleetStatus(ziel, schuesse);
  t.equal('ein Schiff versenkt', stand.filter((e) => e.sunk).length, 1);
  t.equal('Schlachtschiff hat einen Treffer',
    stand.filter((e) => e.shipId === 'schlachtschiff')[0].hits, 1);

  /* ---- Alles versenken beendet die Partie ---- */
  const alle = flotte();
  const alleSchuesse = [];
  let fertig = false;
  alle.forEach((p) => B.cellsFor(p).forEach(([x, y]) => {
    const r = B.fireAt(alle, alleSchuesse, x, y);
    fertig = r.finished;
  }));
  t.ok('nach allen siebzehn Treffern ist Schluss', fertig);
  t.equal('siebzehn Schüsse gebraucht', alleSchuesse.length, 17);
  t.ok('kein Extrazug mehr am Ende', !B.fireAt(alle, alleSchuesse, 9, 9).keepTurn);

  /* ---- Feldnamen ---- */
  t.equal('A1 oben links', B.coordLabel(0, 0), 'A1');
  t.equal('J10 unten rechts', B.coordLabel(9, 9), 'J10');
  t.equal('D5', B.coordLabel(3, 4), 'D5');
};
