/* Schiffe versenken – zu zweit auf einem Handy.
   Zwischen den Zügen schiebt sich ein Sichtschutz davor, damit niemand
   die gegnerische Flotte sieht. Gespeichert wird nur lokal. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var B = TG.battleship;
  var STATE_KEY = 'schiffe.state';
  var STATE_VERSION = 1;
  var SIZE = B.BOARD_SIZE;
  var LETTERS = 'ABCDEFGHIJ';

  var el = {
    main: document.querySelector('.game-main'),
    actionbar: document.querySelector('.actionbar'),
    setup: document.getElementById('setup'),
    place: document.getElementById('place'),
    play: document.getElementById('play'),
    over: document.getElementById('over'),
    nameList: document.getElementById('name-list'),
    setupActions: document.getElementById('setup-actions'),
    placeActions: document.getElementById('place-actions'),
    overActions: document.getElementById('over-actions'),
    startGame: document.getElementById('start-game'),
    placeTitle: document.getElementById('place-title'),
    placeLeft: document.getElementById('place-left'),
    placeHint: document.getElementById('place-hint'),
    placeGrid: document.getElementById('place-grid'),
    shipChips: document.getElementById('ship-chips'),
    shuffleFleet: document.getElementById('shuffle-fleet'),
    rotateShip: document.getElementById('rotate-ship'),
    placeDone: document.getElementById('place-done'),
    turnName: document.getElementById('turn-name'),
    lastShot: document.getElementById('last-shot'),
    viewPicker: document.getElementById('view-picker'),
    shotsView: document.getElementById('shots-view'),
    ownView: document.getElementById('own-view'),
    shotGrid: document.getElementById('shot-grid'),
    ownGrid: document.getElementById('own-grid'),
    enemyStatus: document.getElementById('enemy-status'),
    ownStatus: document.getElementById('own-status'),
    overTitle: document.getElementById('over-title'),
    overText: document.getElementById('over-text'),
    finalTitleA: document.getElementById('final-title-a'),
    finalTitleB: document.getElementById('final-title-b'),
    finalGridA: document.getElementById('final-grid-a'),
    finalGridB: document.getElementById('final-grid-b'),
    newNames: document.getElementById('new-names'),
    rematch: document.getElementById('rematch'),
    curtain: document.getElementById('curtain'),
    curtainTitle: document.getElementById('curtain-title'),
    curtainNote: document.getElementById('curtain-note'),
    curtainGo: document.getElementById('curtain-go'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    gameSummary: document.getElementById('game-summary'),
    resetGame: document.getElementById('reset-game'),
    storageHint: document.getElementById('storage-hint'),
    confirm: document.getElementById('confirm'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmText: document.getElementById('confirm-text'),
    confirmOk: document.getElementById('confirm-ok'),
    confirmCancel: document.getElementById('confirm-cancel')
  };

  var state = null;
  var selectedShipId = null;
  var hintOverride = null;

  var roster = TG.nameEditor(el.nameList, { min: 2, max: 2, maxLength: 14 });

  /* ---------------- Zustand ---------------- */

  function emptyState() {
    return {
      v: STATE_VERSION,
      phase: 'setup',
      players: [],
      placing: 0,
      current: 0,
      winner: null,
      curtain: null,
      draft: null,
      turnLog: []
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      Array.isArray(candidate.players) &&
      ['setup', 'place', 'play', 'over'].indexOf(candidate.phase) > -1;
  }

  function save() {
    TG.store.set(STATE_KEY, state);
  }

  function other(index) { return index === 0 ? 1 : 0; }

  function playerName(index) {
    var player = state.players[index];
    return player ? player.name : '–';
  }

  /* ---------------- Raster zeichnen ---------------- */

  /* paint(x, y) liefert { classes: [], disabled: bool, label: string }. */
  function buildGrid(container, paint, onCell) {
    container.textContent = '';

    var corner = document.createElement('span');
    corner.className = 'sea-label';
    corner.setAttribute('aria-hidden', 'true');
    container.appendChild(corner);

    for (var x = 0; x < SIZE; x++) {
      var head = document.createElement('span');
      head.className = 'sea-label';
      head.setAttribute('aria-hidden', 'true');
      head.textContent = LETTERS.charAt(x);
      container.appendChild(head);
    }

    for (var y = 0; y < SIZE; y++) {
      var side = document.createElement('span');
      side.className = 'sea-label';
      side.setAttribute('aria-hidden', 'true');
      side.textContent = String(y + 1);
      container.appendChild(side);

      for (var cx = 0; cx < SIZE; cx++) {
        var info = paint(cx, y) || {};
        var cell;

        if (onCell && !info.disabled) {
          cell = document.createElement('button');
          cell.type = 'button';
          cell.dataset.x = String(cx);
          cell.dataset.y = String(y);
          cell.className = 'sea-cell is-selectable ' + (info.classes || []).join(' ');
        } else {
          cell = document.createElement('span');
          cell.className = 'sea-cell ' + (info.classes || []).join(' ');
        }

        cell.setAttribute('aria-label', info.label || B.coordLabel(cx, y));
        container.appendChild(cell);
      }
    }

    if (onCell && !container.dataset.bound) {
      container.dataset.bound = '1';
      container.addEventListener('click', function (event) {
        var target = event.target.closest ? event.target.closest('.sea-cell') : null;
        if (!target || !target.dataset.x) return;
        onCell(Number(target.dataset.x), Number(target.dataset.y));
      });
    }
  }

  function cellMap(fleet) {
    var map = {};
    (fleet || []).forEach(function (placement) {
      B.cellsFor(placement).forEach(function (cell) {
        map[cell[0] + ',' + cell[1]] = placement.shipId;
      });
    });
    return map;
  }

  function shotMap(shots) {
    var map = {};
    (shots || []).forEach(function (shot) { map[shot.x + ',' + shot.y] = shot; });
    return map;
  }

  function sunkCellMap(fleet, shots) {
    var map = {};
    B.fleetStatus(fleet, shots).forEach(function (entry) {
      if (!entry.sunk) return;
      B.cellsFor(entry.placement).forEach(function (cell) {
        map[cell[0] + ',' + cell[1]] = true;
      });
    });
    return map;
  }

  /* ---------------- Aufstellen ---------------- */

  /* Auf dem Brett liegt immer die komplette Flotte. Man wählt ein Schiff und
     schiebt es herum – nichts muss erst "abgelegt" werden, und "Fertig" ist
     nie gesperrt. */

  function startPlacing(index) {
    state.phase = 'place';
    state.placing = index;
    state.draft = { player: index, placements: B.randomFleet() };
    selectedShipId = B.FLEET[0].id;
    save();
  }

  function shipInfo(id) {
    for (var i = 0; i < B.FLEET.length; i++) if (B.FLEET[i].id === id) return B.FLEET[i];
    return null;
  }

  function placementOf(id) {
    var list = state.draft.placements;
    for (var i = 0; i < list.length; i++) if (list[i].shipId === id) return list[i];
    return null;
  }

  function withoutShip(id) {
    return state.draft.placements.filter(function (p) { return p.shipId !== id; });
  }

  function replacePlacement(spot) {
    state.draft.placements = state.draft.placements.map(function (p) {
      return p.shipId === spot.shipId ? spot : p;
    });
  }

  /* Sucht den freundlichsten Platz für ein Schiff: am liebsten so, dass es das
     angetippte Feld bedeckt und dabei möglichst mittig darauf liegt. Geht das
     nicht, rutscht es aufs nächstgelegene freie Stück Wasser. Dadurch landet
     jeder Tipp irgendwo – auch am Rand und dicht neben anderen Schiffen. */
  function bestSpot(others, shipId, horizontal, tx, ty) {
    var ship = shipInfo(shipId);
    if (!ship) return null;

    var span = ship.size - 1;
    var maxX = horizontal ? SIZE - ship.size : SIZE - 1;
    var maxY = horizontal ? SIZE - 1 : SIZE - ship.size;
    var best = null;
    var bestCost = Infinity;

    for (var y = 0; y <= maxY; y++) {
      for (var x = 0; x <= maxX; x++) {
        var candidate = { shipId: shipId, x: x, y: y, horizontal: horizontal };
        if (!B.checkPlacements(others.concat([candidate])).ok) continue;

        var cells = B.cellsFor(candidate);
        var near = Infinity;
        for (var i = 0; i < cells.length; i++) {
          var distance = Math.abs(cells[i][0] - tx) + Math.abs(cells[i][1] - ty);
          if (distance < near) near = distance;
        }

        var midX = x + (horizontal ? span / 2 : 0);
        var midY = y + (horizontal ? 0 : span / 2);
        /* Erst: bedeckt es das Feld überhaupt? Dann: wie mittig liegt es? */
        var cost = near * 100 + Math.abs(midX - tx) + Math.abs(midY - ty);

        if (cost < bestCost) { bestCost = cost; best = candidate; }
      }
    }

    return best;
  }

  /* Das ausgewählte Schiff hat Vorfahrt: es landet da, wo getippt wurde, und
     schiebt die anderen beiseite. Ohne das wäre auf dem engen Feld – Schiffe
     dürfen sich ja nicht einmal über Eck berühren – gut die Hälfte aller
     Felder unerreichbar, und jeder zweite Tipp liefe ins Leere. */
  function placeCovering(shipId, horizontal, tx, ty) {
    var ship = shipInfo(shipId);
    var others = withoutShip(shipId);
    var span = ship.size - 1;
    var candidates = [];
    var i;

    for (i = 0; i < ship.size; i++) {
      var x = horizontal ? tx - i : tx;
      var y = horizontal ? ty : ty - i;
      if (x < 0 || y < 0) continue;
      if (horizontal ? x + span >= SIZE : y + span >= SIZE) continue;

      var spot = { shipId: shipId, x: x, y: y, horizontal: horizontal };
      candidates.push({
        spot: spot,
        pushed: others.filter(function (p) { return !B.checkPlacements([spot, p]).ok; }),
        offCentre: Math.abs(i - span / 2)
      });
    }

    /* Am liebsten so, dass niemand weichen muss – und möglichst mittig. */
    candidates.sort(function (a, b) {
      return (a.pushed.length - b.pushed.length) || (a.offCentre - b.offCentre);
    });

    for (i = 0; i < candidates.length; i++) {
      var fleet = resettle(candidates[i]);
      if (fleet && B.validateFleet(fleet).ok) return fleet;
    }

    return null;
  }

  /* Verdrängte Schiffe suchen sich den nächstgelegenen freien Platz. */
  function resettle(candidate) {
    var settled = [candidate.spot];
    var pushedIds = candidate.pushed.map(function (p) { return p.shipId; });

    state.draft.placements.forEach(function (p) {
      if (p.shipId === candidate.spot.shipId) return;
      if (pushedIds.indexOf(p.shipId) > -1) return;
      settled.push(p);
    });

    /* Die großen zuerst – für die wird es sonst am ehesten eng. */
    var queue = candidate.pushed.slice().sort(function (a, b) {
      return shipInfo(b.shipId).size - shipInfo(a.shipId).size;
    });

    for (var i = 0; i < queue.length; i++) {
      var cells = B.cellsFor(queue[i]);
      var mid = cells[Math.floor((cells.length - 1) / 2)];
      var spot = bestSpot(settled, queue[i].shipId, queue[i].horizontal, mid[0], mid[1]) ||
        bestSpot(settled, queue[i].shipId, !queue[i].horizontal, mid[0], mid[1]);
      if (!spot) return null;
      settled.push(spot);
    }

    return B.FLEET.map(function (ship) {
      for (var j = 0; j < settled.length; j++) if (settled[j].shipId === ship.id) return settled[j];
      return null;
    });
  }

  /* Ältere Spielstände können eine halb gesetzte Flotte enthalten. */
  function completeFleet() {
    var draft = state.draft;
    draft.placements = (draft.placements || []).filter(function (p) {
      return p && shipInfo(p.shipId);
    });

    for (var i = 0; i < B.FLEET.length; i++) {
      var id = B.FLEET[i].id;
      if (placementOf(id)) continue;
      var spot = bestSpot(withoutShip(id), id, true, 4, 4) ||
        bestSpot(withoutShip(id), id, false, 4, 4);
      if (!spot) { draft.placements = B.randomFleet(); return; }
      draft.placements = draft.placements.concat([spot]);
    }

    if (!B.validateFleet(draft.placements).ok) draft.placements = B.randomFleet();
  }

  function ensureSelection() {
    if (!selectedShipId || !placementOf(selectedShipId)) selectedShipId = B.FLEET[0].id;
  }

  function renderPlace() {
    completeFleet();
    ensureSelection();

    var draft = state.draft;
    var selected = shipInfo(selectedShipId);

    el.placeTitle.textContent = playerName(state.placing) + ' stellt auf';
    el.placeLeft.textContent = 'Alle fünf liegen schon';

    el.placeHint.classList.remove('is-warn');
    el.placeHint.textContent = hintOverride ||
      (selected.name + ': aufs Wasser tippen zum Verschieben, aufs Schiff zum Drehen.');
    hintOverride = null;

    var ships = cellMap(draft.placements);
    var mine = cellMap([placementOf(selectedShipId)]);

    buildGrid(el.placeGrid, function (x, y) {
      var key = x + ',' + y;
      if (mine[key]) return { classes: ['is-ship', 'is-selected'], label: B.coordLabel(x, y) + ' – ' + selected.name };
      if (ships[key]) return { classes: ['is-ship'], label: B.coordLabel(x, y) + ' – ' + shipInfo(ships[key]).name };
      return { classes: [], label: B.coordLabel(x, y) + ' – Wasser' };
    }, onPlaceCell);

    el.shipChips.textContent = '';
    B.FLEET.forEach(function (ship) {
      var item = document.createElement('li');
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ship-chip';
      chip.dataset.ship = ship.id;
      chip.setAttribute('aria-pressed', selectedShipId === ship.id ? 'true' : 'false');

      var label = document.createElement('span');
      label.textContent = ship.name;

      var pips = document.createElement('span');
      pips.className = 'ship-chip__pips';
      pips.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < ship.size; i++) pips.appendChild(document.createElement('i'));

      chip.appendChild(label);
      chip.appendChild(pips);
      item.appendChild(chip);
      el.shipChips.appendChild(item);
    });

    /* Das gewählte Schiff soll in der Wischreihe sichtbar bleiben. */
    var picked = el.shipChips.querySelector('.ship-chip[aria-pressed="true"]');
    if (picked) {
      var row = picked.parentNode;
      el.shipChips.scrollLeft = row.offsetLeft - (el.shipChips.clientWidth - row.offsetWidth) / 2;
    }

    el.placeDone.disabled = !B.validateFleet(draft.placements).ok;
  }

  /* Meldungen beim Aufstellen laufen über die feste Hinweiszeile – ein Tipp
     daneben soll nicht gleich ein Fenster aufpoppen lassen. */
  function flashHint(message) {
    hintOverride = message;
    renderPlace();
    void el.placeHint.offsetWidth;
    el.placeHint.classList.add('is-warn');
    TG.haptic(20);
  }

  function selectShip(id) {
    selectedShipId = id;
    TG.haptic(6);
    renderPlace();
  }

  /* Setzt das ausgewählte Schiff um – notfalls weicht es aufs nächste
     freie Wasser aus, statt den Tipp zu verschlucken. */
  function moveTo(horizontal, tx, ty, mayFlip, failure) {
    var fleet = placeCovering(selectedShipId, horizontal, tx, ty) ||
      (mayFlip ? placeCovering(selectedShipId, !horizontal, tx, ty) : null);

    if (fleet) {
      state.draft.placements = fleet;
    } else {
      var spot = bestSpot(withoutShip(selectedShipId), selectedShipId, horizontal, tx, ty);
      if (!spot) { flashHint(failure); return; }
      replacePlacement(spot);
    }

    TG.haptic(10);
    save();
    renderPlace();
  }

  function rotateSelected() {
    ensureSelection();
    var current = placementOf(selectedShipId);
    var ship = shipInfo(selectedShipId);
    var cells = B.cellsFor(current);
    var pivot = cells[Math.floor((ship.size - 1) / 2)];
    moveTo(!current.horizontal, pivot[0], pivot[1], false, 'Das ' + ship.name + ' lässt sich hier nicht drehen.');
  }

  function moveSelected(x, y) {
    ensureSelection();
    var current = placementOf(selectedShipId);
    moveTo(current.horizontal, x, y, true, 'Für das ' + shipInfo(selectedShipId).name + ' ist gerade nirgends Platz.');
  }

  function onPlaceCell(x, y) {
    ensureSelection();
    var ships = cellMap(state.draft.placements);
    var hitShipId = ships[x + ',' + y];

    if (hitShipId && hitShipId !== selectedShipId) { selectShip(hitShipId); return; }
    if (hitShipId) { rotateSelected(); return; }

    moveSelected(x, y);
  }

  function finishPlacing() {
    var check = B.validateFleet(state.draft.placements);
    if (!check.ok) { flashHint(check.error); return; }

    state.players[state.placing].fleet = state.draft.placements;
    state.draft = null;
    selectedShipId = null;

    if (state.placing === 0) {
      showCurtain(1, 'place', playerName(1) + ' ist mit Aufstellen dran.');
    } else {
      state.phase = 'play';
      state.current = 0;
      state.turnLog = [];
      showCurtain(0, 'play', 'Beide Flotten stehen. ' + playerName(0) + ' beginnt.');
    }
  }

  /* ---------------- Sichtschutz ---------------- */

  function showCurtain(to, next, note) {
    state.curtain = { to: to, next: next, note: note || '' };
    save();
    render();
  }

  function renderCurtain() {
    var curtain = state.curtain;
    el.curtainTitle.textContent = 'Handy an ' + playerName(curtain.to);
    el.curtainNote.textContent = curtain.note;
    el.curtainGo.textContent = 'Ich bin ' + playerName(curtain.to) + ' →';
  }

  function leaveCurtain() {
    var curtain = state.curtain;
    state.curtain = null;

    if (curtain.next === 'place') {
      startPlacing(curtain.to);
    } else {
      state.phase = 'play';
      state.current = curtain.to;
      state.turnLog = [];
    }

    save();
    render();
  }

  /* ---------------- Spielen ---------------- */

  function renderPlay() {
    var me = state.players[state.current];
    var enemy = state.players[other(state.current)];

    el.turnName.textContent = me.name + ' ist dran';

    var log = state.turnLog || [];
    el.lastShot.hidden = log.length === 0;
    if (log.length) {
      var last = log[log.length - 1];
      el.lastShot.textContent = B.coordLabel(last.x, last.y) + ' · ' +
        (last.sunkName ? last.sunkName + ' versenkt!' : (last.hit ? 'Treffer' : 'Wasser'));
    }

    /* Schussraster: nur, was schon bekannt ist – die Flotte bleibt verdeckt. */
    var shots = shotMap(me.shots);
    var sunk = sunkCellMap(enemy.fleet, me.shots);

    buildGrid(el.shotGrid, function (x, y) {
      var shot = shots[x + ',' + y];
      if (!shot) return { classes: [], label: B.coordLabel(x, y) + ' – noch offen' };
      if (!shot.hit) return { classes: ['is-miss'], disabled: true, label: B.coordLabel(x, y) + ' – Wasser' };
      return {
        classes: sunk[x + ',' + y] ? ['is-hit', 'is-sunk'] : ['is-hit'],
        disabled: true,
        label: B.coordLabel(x, y) + ' – Treffer'
      };
    }, onShotCell);

    /* Gegnerische Schiffe: nur versenkt oder nicht, keine Trefferzahlen. */
    el.enemyStatus.textContent = '';
    var enemyStatus = B.fleetStatus(enemy.fleet, me.shots);
    enemyStatus.forEach(function (entry) {
      var item = document.createElement('li');
      item.className = entry.sunk ? 'is-sunk' : 'is-unknown';
      item.textContent = entry.name;
      el.enemyStatus.appendChild(item);
    });

    /* Eigenes Feld */
    var myShips = cellMap(me.fleet);
    var incoming = shotMap(enemy.shots);
    var mySunk = sunkCellMap(me.fleet, enemy.shots);

    buildGrid(el.ownGrid, function (x, y) {
      var key = x + ',' + y;
      var classes = [];
      if (myShips[key]) classes.push('is-ship');
      if (incoming[key]) {
        if (incoming[key].hit) {
          classes.push('is-hit');
          if (mySunk[key]) classes.push('is-sunk');
        } else {
          classes.push('is-miss');
        }
      }
      return { classes: classes };
    });

    el.ownStatus.textContent = '';
    B.fleetStatus(me.fleet, enemy.shots).forEach(function (entry) {
      var item = document.createElement('li');
      item.className = entry.sunk ? 'is-sunk' : '';
      item.textContent = entry.name + ' ' + entry.hits + '/' + entry.size;
      el.ownStatus.appendChild(item);
    });
  }

  function onShotCell(x, y) {
    if (state.phase !== 'play' || state.curtain) return;

    var me = state.players[state.current];
    var enemy = state.players[other(state.current)];
    var result = B.fireAt(enemy.fleet, me.shots, x, y);

    if (!result.ok) { TG.toast(result.error); return; }

    state.turnLog.push({
      x: x, y: y, hit: result.hit,
      sunkName: result.sunkShip ? result.sunkShip.name : null
    });

    if (result.finished) {
      state.phase = 'over';
      state.winner = state.current;
      save();
      TG.haptic([0, 40, 60, 40]);
      TG.confetti(200);
      render();
      return;
    }

    if (result.sunkShip) {
      TG.haptic([0, 30, 40, 30]);
      TG.toast(result.sunkShip.name + ' versenkt! 💥', { variant: 'win' });
    } else if (result.hit) {
      TG.haptic(16);
      TG.toast('Treffer – nochmal!');
    } else {
      TG.haptic(6);
    }

    save();

    if (result.keepTurn) {
      renderPlay();
      return;
    }

    showCurtain(other(state.current), 'play', turnSummary(me.name));
  }

  function turnSummary(name) {
    var parts = (state.turnLog || []).map(function (entry) {
      return B.coordLabel(entry.x, entry.y) + ' ' +
        (entry.sunkName ? 'Treffer, ' + entry.sunkName + ' versenkt' : (entry.hit ? 'Treffer' : 'Wasser'));
    });
    return parts.length ? name + ': ' + parts.join(' · ') : '';
  }

  /* ---------------- Ende ---------------- */

  function renderOver() {
    var winner = state.winner;
    var loser = other(winner);

    el.overTitle.textContent = '🏆 ' + playerName(winner) + ' gewinnt!';
    el.overText.textContent = playerName(winner) + ' brauchte ' +
      state.players[winner].shots.length + ' Schüsse. ' +
      playerName(loser) + ' kam auf ' + state.players[loser].shots.length + '.';

    [0, 1].forEach(function (index) {
      var title = index === 0 ? el.finalTitleA : el.finalTitleB;
      var grid = index === 0 ? el.finalGridA : el.finalGridB;
      var ships = cellMap(state.players[index].fleet);
      var incoming = shotMap(state.players[other(index)].shots);

      title.textContent = 'Flotte von ' + playerName(index);
      grid.classList.add('sea-grid--small');

      buildGrid(grid, function (x, y) {
        var key = x + ',' + y;
        var classes = [];
        if (ships[key]) classes.push('is-ship');
        if (incoming[key]) classes.push(incoming[key].hit ? 'is-hit' : 'is-miss');
        return { classes: classes };
      });
    });
  }

  /* ---------------- Darstellung ---------------- */

  function render() {
    var phase = state.phase;
    var covered = !!state.curtain;

    el.curtain.hidden = !covered;

    /* Hinter dem Sichtschutz bleibt nichts stehen: die Raster werden geleert,
       nicht nur überdeckt. Sonst läge die gegnerische Flotte weiter im DOM. */
    el.main.hidden = covered;
    /* In der Schussphase gibt es keine Knöpfe – dann auch keine leere Leiste. */
    el.actionbar.hidden = covered || phase === 'play';
    el.main.classList.toggle('no-actionbar', phase === 'play');

    if (covered) {
      el.placeGrid.textContent = '';
      el.shotGrid.textContent = '';
      el.ownGrid.textContent = '';
      renderCurtain();
      return;
    }

    el.setup.hidden = phase !== 'setup';
    el.place.hidden = phase !== 'place';
    el.play.hidden = phase !== 'play';
    el.over.hidden = phase !== 'over';

    el.setupActions.hidden = phase !== 'setup';
    el.placeActions.hidden = phase !== 'place';
    el.overActions.hidden = phase !== 'over';

    if (phase === 'place' && state.draft) renderPlace();
    if (phase === 'play') renderPlay();
    if (phase === 'over') renderOver();

    el.gameSummary.textContent = state.players.length === 2
      ? playerName(0) + ' gegen ' + playerName(1)
      : 'Noch keine Partie begonnen.';
  }

  /* ---------------- Dialoge ---------------- */

  function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function askConfirm(title, text, okLabel) {
    return new Promise(function (resolve) {
      el.confirmTitle.textContent = title;
      el.confirmText.textContent = text;
      el.confirmOk.textContent = okLabel || 'Ja';

      function done(answer) {
        el.confirmOk.removeEventListener('click', onOk);
        el.confirmCancel.removeEventListener('click', onCancel);
        el.confirm.removeEventListener('close', onCancel);
        closeDialog(el.confirm);
        resolve(answer);
      }
      function onOk() { done(true); }
      function onCancel() { done(false); }

      el.confirmOk.addEventListener('click', onOk);
      el.confirmCancel.addEventListener('click', onCancel);
      el.confirm.addEventListener('close', onCancel);
      openDialog(el.confirm);
    });
  }

  /* ---------------- Verdrahtung ---------------- */

  function startGame() {
    var names = roster.values();
    if (names.length < 2) { TG.toast('Bitte zwei Namen eintragen'); return; }

    state = emptyState();
    state.players = names.slice(0, 2).map(function (name) {
      return { name: name, fleet: null, shots: [] };
    });

    startPlacing(0);
    render();
  }

  function toSetup() {
    state = emptyState();
    roster.set(['', '']);
    save();
    render();
  }

  function bindEvents() {
    el.startGame.addEventListener('click', startGame);

    el.nameList.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); startGame(); }
    });

    el.shipChips.addEventListener('click', function (event) {
      var chip = event.target.closest ? event.target.closest('.ship-chip') : null;
      if (!chip) return;
      if (chip.dataset.ship === selectedShipId) rotateSelected();
      else selectShip(chip.dataset.ship);
    });

    el.rotateShip.addEventListener('click', rotateSelected);

    el.shuffleFleet.addEventListener('click', function () {
      state.draft.placements = B.randomFleet();
      TG.haptic(10);
      save();
      renderPlace();
    });

    el.placeDone.addEventListener('click', finishPlacing);
    el.curtainGo.addEventListener('click', leaveCurtain);

    el.viewPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-view]') : null;
      if (!button) return;
      var wantShots = button.dataset.view === 'shots';
      el.shotsView.hidden = !wantShots;
      el.ownView.hidden = wantShots;
      Array.prototype.forEach.call(el.viewPicker.querySelectorAll('button'), function (other) {
        other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
      });
    });

    el.rematch.addEventListener('click', function () {
      state.players.forEach(function (player) { player.fleet = null; player.shots = []; });
      state.winner = null;
      state.turnLog = [];
      startPlacing(0);
      render();
      TG.toast('Revanche – neue Flotten!');
    });

    el.newNames.addEventListener('click', toSetup);

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.resetGame.addEventListener('click', function () {
      askConfirm('Partie abbrechen?', 'Flotten und Schüsse gehen verloren.', 'Abbrechen')
        .then(function (yes) {
          if (!yes) return;
          closeDialog(el.settings);
          toSetup();
          TG.toast('Partie abgebrochen');
        });
    });

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  function init() {
    var saved = TG.store.get(STATE_KEY, null);
    state = isValidState(saved) ? saved : emptyState();

    if (state.phase === 'setup') roster.set(['', '']);

    if (!TG.store.available) {
      el.storageHint.textContent = 'Hinweis: Dieser Browser erlaubt keinen lokalen Speicher – die Partie geht beim Schließen verloren.';
    }

    save();
    render();
    bindEvents();
    TG.registerServiceWorker('../../sw.js');
  }

  init();
})(window, document);
