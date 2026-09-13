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

  function startPlacing(index) {
    state.phase = 'place';
    state.placing = index;
    state.draft = { player: index, placements: B.randomFleet(), horizontal: true };
    selectedShipId = null;
    save();
  }

  function placedIds() {
    return state.draft.placements.map(function (p) { return p.shipId; });
  }

  function renderPlace() {
    var draft = state.draft;
    var placed = placedIds();
    var missing = B.FLEET.filter(function (ship) { return placed.indexOf(ship.id) < 0; });

    el.placeTitle.textContent = playerName(state.placing) + ' stellt auf';
    el.placeLeft.textContent = missing.length
      ? missing.length + ' Schiff' + (missing.length === 1 ? '' : 'e') + ' übrig'
      : 'Flotte vollständig';

    el.placeHint.textContent = selectedShipId
      ? 'Tippe auf ein freies Feld – dort beginnt das Schiff.'
      : (missing.length
        ? 'Tippe unten ein Schiff an und setze es aufs Raster.'
        : 'Tippe ein Schiff im Raster an, um es zu versetzen.');

    var ships = cellMap(draft.placements);

    buildGrid(el.placeGrid, function (x, y) {
      return { classes: ships[x + ',' + y] ? ['is-ship'] : [] };
    }, onPlaceCell);

    el.shipChips.textContent = '';
    missing.forEach(function (ship) {
      var item = document.createElement('li');
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ship-chip';
      chip.dataset.ship = ship.id;
      chip.setAttribute('aria-pressed', selectedShipId === ship.id ? 'true' : 'false');

      var pips = document.createElement('span');
      pips.className = 'ship-chip__pips';
      pips.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < ship.size; i++) pips.appendChild(document.createElement('i'));

      var label = document.createElement('span');
      label.textContent = ship.name;

      chip.appendChild(label);
      chip.appendChild(pips);
      item.appendChild(chip);
      el.shipChips.appendChild(item);
    });

    el.rotateShip.textContent = draft.horizontal ? '↻ Quer' : '↻ Hoch';
    el.rotateShip.setAttribute('aria-pressed', draft.horizontal ? 'false' : 'true');
    el.placeDone.disabled = missing.length > 0;
  }

  function onPlaceCell(x, y) {
    var draft = state.draft;
    var ships = cellMap(draft.placements);
    var hitShipId = ships[x + ',' + y];

    if (hitShipId) {
      /* Schiff wieder aufnehmen */
      draft.placements = draft.placements.filter(function (p) { return p.shipId !== hitShipId; });
      selectedShipId = hitShipId;
      TG.haptic(8);
      save();
      renderPlace();
      return;
    }

    if (!selectedShipId) {
      var missing = B.FLEET.filter(function (ship) { return placedIds().indexOf(ship.id) < 0; });
      if (!missing.length) {
        TG.toast('Alle Schiffe stehen. Tippe eins an, um es zu versetzen.');
        return;
      }
      selectedShipId = missing[0].id;
    }

    var candidate = { shipId: selectedShipId, x: x, y: y, horizontal: draft.horizontal };
    var check = B.checkPlacements(draft.placements.concat([candidate]));

    if (!check.ok) {
      TG.toast(check.error);
      return;
    }

    draft.placements.push(candidate);
    selectedShipId = null;
    TG.haptic(10);
    save();
    renderPlace();
  }

  function finishPlacing() {
    var check = B.validateFleet(state.draft.placements);
    if (!check.ok) { TG.toast(check.error); return; }

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
      selectedShipId = selectedShipId === chip.dataset.ship ? null : chip.dataset.ship;
      renderPlace();
    });

    el.rotateShip.addEventListener('click', function () {
      state.draft.horizontal = !state.draft.horizontal;
      save();
      renderPlace();
    });

    el.shuffleFleet.addEventListener('click', function () {
      state.draft.placements = B.randomFleet();
      selectedShipId = null;
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
