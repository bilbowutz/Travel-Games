/* Auto Bingo – Spiellogik. Alles läuft im Browser, gespeichert wird nur lokal. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var STATE_KEY = 'autobingo.state';
  var STATS_KEY = 'autobingo.stats';
  var STATE_VERSION = 1;
  var SIZES = [3, 4, 5];
  var DEFAULT_SIZE = 5;
  var RARE_SHARE = 0.25;

  var el = {
    board: document.getElementById('board'),
    found: document.getElementById('found-count'),
    total: document.getElementById('total-count'),
    progress: document.getElementById('progress'),
    progressFill: document.getElementById('progress-fill'),
    bingoChip: document.getElementById('bingo-chip'),
    bingoCount: document.getElementById('bingo-count'),
    newGame: document.getElementById('new-game'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    sizePicker: document.getElementById('size-picker'),
    resetStats: document.getElementById('reset-stats'),
    statGames: document.getElementById('stat-games'),
    statFound: document.getElementById('stat-found'),
    statBingos: document.getElementById('stat-bingos'),
    storageHint: document.getElementById('storage-hint'),
    confirm: document.getElementById('confirm'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmText: document.getElementById('confirm-text'),
    confirmOk: document.getElementById('confirm-ok'),
    confirmCancel: document.getElementById('confirm-cancel')
  };

  var state = null;
  var stats = null;
  var tileNodes = [];

  /* ---------------- Brett bauen ---------------- */

  function pickItems(count) {
    var pool = TG.autoBingoItems;
    var rares = TG.shuffle(pool.filter(function (i) { return i.rare; }));
    var commons = TG.shuffle(pool.filter(function (i) { return !i.rare; }));
    var rareCount = Math.min(rares.length, Math.max(1, Math.round(count * RARE_SHARE)));
    var picked = rares.slice(0, rareCount).concat(commons.slice(0, count - rareCount));

    // Sicherheitsnetz, falls der Pool mal kleiner wird als das Brett.
    for (var i = picked.length; i < count; i++) picked.push(pool[i % pool.length]);

    return TG.shuffle(picked).slice(0, count);
  }

  function buildState(size) {
    var total = size * size;
    var freeIndex = size % 2 === 1 && size >= 5 ? (total - 1) / 2 : -1;
    var items = pickItems(total - (freeIndex >= 0 ? 1 : 0));
    var cells = [];
    var next = 0;

    for (var i = 0; i < total; i++) {
      if (i === freeIndex) {
        cells.push({ id: '__free', emoji: '⭐', label: 'Joker', free: true, checked: true });
      } else {
        var item = items[next++];
        cells.push({ id: item.id, emoji: item.emoji, label: item.label, checked: false });
      }
    }

    return { v: STATE_VERSION, size: size, cells: cells, lines: [], full: false, created: Date.now() };
  }

  /* ---------------- Reihen, Spalten, Diagonalen ---------------- */

  function allLines(size) {
    var lines = [], i, j, idx;

    for (i = 0; i < size; i++) {
      idx = [];
      for (j = 0; j < size; j++) idx.push(i * size + j);
      lines.push({ key: 'r' + i, idx: idx });

      idx = [];
      for (j = 0; j < size; j++) idx.push(j * size + i);
      lines.push({ key: 'c' + i, idx: idx });
    }

    idx = [];
    for (i = 0; i < size; i++) idx.push(i * size + i);
    lines.push({ key: 'd0', idx: idx });

    idx = [];
    for (i = 0; i < size; i++) idx.push(i * size + (size - 1 - i));
    lines.push({ key: 'd1', idx: idx });

    return lines;
  }

  function completedLines() {
    return allLines(state.size).filter(function (line) {
      return line.idx.every(function (i) { return state.cells[i].checked; });
    });
  }

  /* ---------------- Speichern ---------------- */

  function save() {
    TG.store.set(STATE_KEY, state);
  }

  function loadStats() {
    var raw = TG.store.get(STATS_KEY, null);
    return {
      games: raw && raw.games || 0,
      found: raw && raw.found || 0,
      bingos: raw && raw.bingos || 0
    };
  }

  function saveStats() {
    TG.store.set(STATS_KEY, stats);
    renderStats();
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      SIZES.indexOf(candidate.size) > -1 &&
      Array.isArray(candidate.cells) &&
      candidate.cells.length === candidate.size * candidate.size &&
      candidate.cells.every(function (c) { return c && typeof c.label === 'string'; });
  }

  /* ---------------- Darstellung ---------------- */

  function renderBoard() {
    el.board.textContent = '';
    el.board.dataset.size = String(state.size);
    el.board.style.setProperty('--cols', String(state.size));
    tileNodes = [];

    state.cells.forEach(function (cell, index) {
      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile' + (cell.free ? ' tile--free' : '');
      tile.dataset.index = String(index);
      if (cell.free) tile.disabled = true;

      var emoji = document.createElement('span');
      emoji.className = 'tile__emoji';
      emoji.setAttribute('aria-hidden', 'true');
      emoji.textContent = cell.emoji;

      var label = document.createElement('span');
      label.className = 'tile__label';
      label.textContent = cell.label;

      var check = document.createElement('span');
      check.className = 'tile__check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';

      tile.appendChild(emoji);
      tile.appendChild(label);
      tile.appendChild(check);
      el.board.appendChild(tile);
      tileNodes.push(tile);
    });

    renderState();
  }

  function renderState() {
    var lineKeys = state.lines || [];
    var inLine = {};

    allLines(state.size).forEach(function (line) {
      if (lineKeys.indexOf(line.key) > -1) {
        line.idx.forEach(function (i) { inLine[i] = true; });
      }
    });

    var found = 0, total = 0;

    state.cells.forEach(function (cell, index) {
      var tile = tileNodes[index];
      if (!tile) return;
      tile.classList.toggle('is-checked', !!cell.checked);
      tile.classList.toggle('is-line', !!inLine[index]);
      if (!cell.free) {
        var spoken = cell.label.replace(/\u00AD/g, '');
        tile.setAttribute('aria-pressed', cell.checked ? 'true' : 'false');
        tile.setAttribute('aria-label', spoken + (cell.checked ? ' – gefunden' : ' – noch offen'));
        total++;
        if (cell.checked) found++;
      } else {
        tile.setAttribute('aria-label', 'Joker – gratis');
      }
    });

    var percent = total ? Math.round((found / total) * 100) : 0;
    el.found.textContent = String(found);
    el.total.textContent = String(total);
    el.progressFill.style.width = percent + '%';
    el.progress.setAttribute('aria-valuenow', String(percent));

    el.bingoCount.textContent = String(lineKeys.length);
    el.bingoChip.hidden = lineKeys.length === 0;
  }

  function renderStats() {
    el.statGames.textContent = String(stats.games);
    el.statFound.textContent = String(stats.found);
    el.statBingos.textContent = String(stats.bingos);
  }

  function renderSizePicker() {
    Array.prototype.forEach.call(el.sizePicker.querySelectorAll('button'), function (button) {
      button.setAttribute('aria-pressed', Number(button.dataset.size) === state.size ? 'true' : 'false');
    });
  }

  /* ---------------- Spielzüge ---------------- */

  function toggleCell(index) {
    var cell = state.cells[index];
    if (!cell || cell.free) return;

    cell.checked = !cell.checked;

    if (cell.checked) {
      stats.found++;
      TG.haptic(12);
    } else {
      TG.haptic(6);
    }

    var before = state.lines || [];
    var now = completedLines().map(function (line) { return line.key; });
    var fresh = now.filter(function (key) { return before.indexOf(key) < 0; });
    state.lines = now;

    var playable = state.cells.filter(function (c) { return !c.free; });
    var wasFull = state.full;
    state.full = playable.every(function (c) { return c.checked; });

    renderState();
    save();
    saveStats();

    if (fresh.length) {
      stats.bingos += fresh.length;
      saveStats();
      TG.haptic([0, 40, 60, 40]);
      TG.confetti(fresh.length > 1 ? 140 : 90);
      TG.toast(fresh.length > 1 ? 'Doppel-Bingo! 🏆' : 'BINGO! 🏆', { variant: 'win', duration: 2400 });
    }

    if (state.full && !wasFull) {
      TG.confetti(200);
      TG.toast('Volles Brett – alles gefunden! 🎉', { variant: 'win', duration: 3000 });
    }
  }

  function startNewGame(size) {
    state = buildState(size || state.size);
    stats.games++;
    save();
    saveStats();
    renderBoard();
    renderSizePicker();
  }

  function hasProgress() {
    return state.cells.some(function (c) { return c.checked && !c.free; });
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

  /* Klick auf den Hintergrund schließt das Sheet. */
  function closeOnBackdrop(dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) closeDialog(dialog);
    });
  }

  /* ---------------- Verdrahtung ---------------- */

  function bindEvents() {
    el.board.addEventListener('click', function (event) {
      var tile = event.target.closest ? event.target.closest('.tile') : null;
      if (!tile || tile.disabled) return;
      toggleCell(Number(tile.dataset.index));
    });

    el.newGame.addEventListener('click', function () {
      if (!hasProgress()) {
        startNewGame();
        TG.toast('Neues Brett – viel Glück!');
        return;
      }
      askConfirm('Neues Spiel?', 'Das aktuelle Brett wird gemischt und alle Häkchen gehen verloren.', 'Neu mischen')
        .then(function (yes) {
          if (!yes) return;
          startNewGame();
          TG.toast('Neues Brett – viel Glück!');
        });
    });

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    closeOnBackdrop(el.settings);

    el.sizePicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-size]') : null;
      if (!button) return;
      var size = Number(button.dataset.size);
      if (size === state.size) return;

      function apply() {
        startNewGame(size);
        TG.toast('Neues Brett: ' + size + ' × ' + size);
      }

      if (!hasProgress()) { apply(); return; }
      askConfirm('Brettgröße ändern?', 'Dafür wird ein neues Spiel gestartet.', 'Ändern')
        .then(function (yes) { if (yes) apply(); });
    });

    el.resetStats.addEventListener('click', function () {
      askConfirm('Statistik löschen?', 'Spiele, Funde und Bingos werden auf null gesetzt.', 'Löschen')
        .then(function (yes) {
          if (!yes) return;
          stats = { games: 0, found: 0, bingos: 0 };
          saveStats();
          TG.toast('Statistik zurückgesetzt');
        });
    });

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  /* ---------------- Start ---------------- */

  function init() {
    stats = loadStats();

    var saved = TG.store.get(STATE_KEY, null);
    if (isValidState(saved)) {
      state = saved;
      state.lines = completedLines().map(function (line) { return line.key; });
      if (typeof state.full !== 'boolean') {
        state.full = state.cells.every(function (c) { return c.checked; });
      }
    } else {
      state = buildState(DEFAULT_SIZE);
      stats.games++;
      saveStats();
      save();
    }

    if (!TG.store.available) {
      el.storageHint.textContent = 'Hinweis: Dieser Browser erlaubt keinen lokalen Speicher – der Spielstand geht beim Schließen verloren.';
    }

    renderBoard();
    renderStats();
    renderSizePicker();
    bindEvents();
    TG.registerServiceWorker('../../sw.js');
  }

  init();
})(window, document);
