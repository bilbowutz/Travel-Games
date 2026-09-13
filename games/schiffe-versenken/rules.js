/* Schiffe versenken – reine Regeln, ohne Oberfläche.
   Getrennt gehalten, damit sich das Regelwerk ohne Browser prüfen lässt. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var BOARD_SIZE = 10;

  var FLEET = [
    { id: 'schlachtschiff', name: 'Schlachtschiff', size: 5 },
    { id: 'kreuzer',        name: 'Kreuzer',        size: 4 },
    { id: 'zerstoerer',     name: 'Zerstörer',      size: 3 },
    { id: 'uboot',          name: 'U-Boot',         size: 3 },
    { id: 'schnellboot',    name: 'Schnellboot',    size: 2 }
  ];

  /* Deutsche Hausregeln: Schiffe dürfen sich nicht berühren, auch nicht über Eck,
     und nach einem Treffer ist man nochmal dran. */
  var SHIPS_MAY_TOUCH = false;
  var HIT_GIVES_ANOTHER_TURN = true;

  function shipById(id) {
    for (var i = 0; i < FLEET.length; i++) if (FLEET[i].id === id) return FLEET[i];
    return null;
  }

  function key(x, y) { return x + ',' + y; }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
  }

  function cellsFor(placement) {
    var ship = shipById(placement && placement.shipId);
    if (!ship) return [];
    var cells = [];
    for (var i = 0; i < ship.size; i++) {
      cells.push(placement.horizontal
        ? [placement.x + i, placement.y]
        : [placement.x, placement.y + i]);
    }
    return cells;
  }

  /* Prüft auch unvollständige Aufstellungen – beim Setzen ist das der Normalfall. */
  function checkPlacements(placements) {
    var occupied = {};
    var i, j, cells, x, y, dx, dy, neighbour;

    for (i = 0; i < placements.length; i++) {
      if (!placements[i] || !shipById(placements[i].shipId)) {
        return { ok: false, error: 'Unbekanntes Schiff.' };
      }
      if (!Number.isInteger(placements[i].x) || !Number.isInteger(placements[i].y) ||
          typeof placements[i].horizontal !== 'boolean') {
        return { ok: false, error: 'Ungültige Schiffsangabe.' };
      }

      cells = cellsFor(placements[i]);
      for (j = 0; j < cells.length; j++) {
        x = cells[j][0];
        y = cells[j][1];
        if (!inBounds(x, y)) return { ok: false, error: 'Das Schiff ragt über den Rand.' };
        if (occupied[key(x, y)]) return { ok: false, error: 'Da liegt schon ein Schiff.' };
        occupied[key(x, y)] = placements[i].shipId;
      }
    }

    if (!SHIPS_MAY_TOUCH) {
      for (i = 0; i < placements.length; i++) {
        cells = cellsFor(placements[i]);
        for (j = 0; j < cells.length; j++) {
          for (dy = -1; dy <= 1; dy++) {
            for (dx = -1; dx <= 1; dx++) {
              neighbour = occupied[key(cells[j][0] + dx, cells[j][1] + dy)];
              if (neighbour && neighbour !== placements[i].shipId) {
                return { ok: false, error: 'Schiffe dürfen sich nicht berühren.' };
              }
            }
          }
        }
      }
    }

    return { ok: true };
  }

  function validateFleet(placements) {
    if (!Array.isArray(placements) || placements.length !== FLEET.length) {
      return { ok: false, error: 'Es fehlen noch Schiffe.' };
    }

    var expected = FLEET.map(function (ship) { return ship.id; }).sort().join('|');
    var got = placements.map(function (p) { return p && p.shipId; }).sort().join('|');
    if (expected !== got) return { ok: false, error: 'Jedes Schiff genau einmal.' };

    return checkPlacements(placements);
  }

  function randomFleet(random) {
    var rnd = random || Math.random;

    for (var attempt = 0; attempt < 500; attempt++) {
      var placements = [];
      var failed = false;

      for (var f = 0; f < FLEET.length; f++) {
        var ship = FLEET[f];
        var placed = false;

        for (var tries = 0; tries < 200 && !placed; tries++) {
          var horizontal = rnd() < 0.5;
          var span = ship.size - 1;
          var candidate = {
            shipId: ship.id,
            horizontal: horizontal,
            x: Math.floor(rnd() * (BOARD_SIZE - (horizontal ? span : 0))),
            y: Math.floor(rnd() * (BOARD_SIZE - (horizontal ? 0 : span)))
          };
          if (checkPlacements(placements.concat([candidate])).ok) {
            placements.push(candidate);
            placed = true;
          }
        }

        if (!placed) { failed = true; break; }
      }

      if (!failed && validateFleet(placements).ok) return placements;
    }

    throw new Error('Keine gültige Aufstellung gefunden');
  }

  /* Trefferstand je Schiff, abgeleitet aus den gegnerischen Schüssen. */
  function fleetStatus(fleet, incomingShots) {
    var hits = {};
    (incomingShots || []).forEach(function (shot) {
      if (shot.hit) hits[key(shot.x, shot.y)] = true;
    });

    return (fleet || []).map(function (placement) {
      var cells = cellsFor(placement);
      var ship = shipById(placement.shipId);
      var hitCount = cells.filter(function (cell) { return hits[key(cell[0], cell[1])]; }).length;
      return {
        shipId: placement.shipId,
        name: ship.name,
        size: ship.size,
        hits: hitCount,
        sunk: hitCount === cells.length,
        placement: placement
      };
    });
  }

  /* Schuss auf die gegnerische Flotte.
     Gibt { ok, hit, sunkShip, finished } zurück; shots wird ergänzt. */
  function fireAt(enemyFleet, shots, x, y) {
    if (!inBounds(x, y)) return { ok: false, error: 'Dieses Feld gibt es nicht.' };

    for (var i = 0; i < shots.length; i++) {
      if (shots[i].x === x && shots[i].y === y) {
        return { ok: false, error: 'Dorthin hast du schon geschossen.' };
      }
    }

    var occupied = {};
    enemyFleet.forEach(function (placement) {
      cellsFor(placement).forEach(function (cell) {
        occupied[key(cell[0], cell[1])] = placement.shipId;
      });
    });

    var hitShipId = occupied[key(x, y)] || null;
    var shot = { x: x, y: y, hit: !!hitShipId };
    shots.push(shot);

    var sunkShip = null;
    var status = fleetStatus(enemyFleet, shots);

    if (hitShipId) {
      status.forEach(function (entry) {
        if (entry.shipId === hitShipId && entry.sunk) {
          shot.sunkShipId = hitShipId;
          sunkShip = { shipId: entry.shipId, name: entry.name, size: entry.size };
        }
      });
    }

    var finished = status.every(function (entry) { return entry.sunk; });

    return {
      ok: true,
      hit: shot.hit,
      sunkShip: sunkShip,
      finished: finished,
      keepTurn: shot.hit && HIT_GIVES_ANOTHER_TURN && !finished
    };
  }

  /* "D5" – so ruft man es sich im Auto zu. */
  function coordLabel(x, y) {
    return 'ABCDEFGHIJ'.charAt(x) + (y + 1);
  }

  TG.battleship = {
    BOARD_SIZE: BOARD_SIZE,
    FLEET: FLEET,
    SHIPS_MAY_TOUCH: SHIPS_MAY_TOUCH,
    HIT_GIVES_ANOTHER_TURN: HIT_GIVES_ANOTHER_TURN,
    cellsFor: cellsFor,
    checkPlacements: checkPlacements,
    validateFleet: validateFleet,
    randomFleet: randomFleet,
    fleetStatus: fleetStatus,
    fireAt: fireAt,
    coordLabel: coordLabel
  };
})(window);
