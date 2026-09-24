/* Fotojagd – zu zweit auf einem Handy.
   Einer geht außer Sichtweite und macht fünf Fotos von einer Stelle, der
   andere sucht sie. Gesucht wird zuerst nur mit Foto 1; jedes weitere Foto
   kostet einen Punkt. Die Bilder liegen in IndexedDB und werden nach der
   Runde gelöscht – hochgeladen wird nichts. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var F = TG.fotojagd;
  var STATE_KEY = 'fotojagd.state';
  var STATE_VERSION = 1;
  var COUNT = F.PHOTO_COUNT;

  var el = {
    main: document.querySelector('.game-main'),
    actionbar: document.querySelector('.actionbar'),
    setup: document.getElementById('setup'),
    shoot: document.getElementById('shoot'),
    hunt: document.getElementById('hunt'),
    judge: document.getElementById('judge'),
    huntover: document.getElementById('huntover'),
    over: document.getElementById('over'),
    nameList: document.getElementById('name-list'),
    setupSummary: document.getElementById('setup-summary'),
    setupActions: document.getElementById('setup-actions'),
    shootActions: document.getElementById('shoot-actions'),
    huntActions: document.getElementById('hunt-actions'),
    judgeActions: document.getElementById('judge-actions'),
    huntoverActions: document.getElementById('huntover-actions'),
    overActions: document.getElementById('over-actions'),
    startGame: document.getElementById('start-game'),
    shootTitle: document.getElementById('shoot-title'),
    shootLeft: document.getElementById('shoot-left'),
    shootHint: document.getElementById('shoot-hint'),
    slots: document.getElementById('slots'),
    clue: document.getElementById('clue'),
    picker: document.getElementById('picker'),
    shootDone: document.getElementById('shoot-done'),
    huntTitle: document.getElementById('hunt-title'),
    huntClock: document.getElementById('hunt-clock'),
    huntClue: document.getElementById('hunt-clue'),
    huntPhoto: document.getElementById('hunt-photo'),
    huntCaption: document.getElementById('hunt-caption'),
    huntDots: document.getElementById('hunt-dots'),
    huntWorth: document.getElementById('hunt-worth'),
    reveal: document.getElementById('reveal'),
    found: document.getElementById('found'),
    judgeTitle: document.getElementById('judge-title'),
    judgeText: document.getElementById('judge-text'),
    judgeThumbs: document.getElementById('judge-thumbs'),
    judgeYes: document.getElementById('judge-yes'),
    judgeNo: document.getElementById('judge-no'),
    huntoverTitle: document.getElementById('huntover-title'),
    huntoverText: document.getElementById('huntover-text'),
    huntoverThumbs: document.getElementById('huntover-thumbs'),
    nextHunt: document.getElementById('next-hunt'),
    overTitle: document.getElementById('over-title'),
    overText: document.getElementById('over-text'),
    standings: document.getElementById('standings'),
    newNames: document.getElementById('new-names'),
    rematch: document.getElementById('rematch'),
    curtain: document.getElementById('curtain'),
    curtainTitle: document.getElementById('curtain-title'),
    curtainNote: document.getElementById('curtain-note'),
    curtainGo: document.getElementById('curtain-go'),
    viewer: document.getElementById('viewer'),
    viewerImg: document.getElementById('viewer-img'),
    viewerLabel: document.getElementById('viewer-label'),
    viewerClose: document.getElementById('viewer-close'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    roundsPicker: document.getElementById('rounds-picker'),
    photoHint: document.getElementById('photo-hint'),
    clearPhotos: document.getElementById('clear-photos'),
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
  var ticker = null;
  var pickingSlot = null;
  var urls = {};
  var loading = {};

  var roster = TG.nameEditor(el.nameList, { min: 2, max: 2, maxLength: 14 });

  /* ---------------- Zustand ---------------- */

  function emptyState() {
    return {
      v: STATE_VERSION,
      phase: 'setup',
      players: [],
      hider: 0,
      rounds: 1,
      seq: 0,
      draft: null,
      hunt: null,
      curtain: null
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      Array.isArray(candidate.players) &&
      ['setup', 'shoot', 'hunt', 'judge', 'huntover', 'over'].indexOf(candidate.phase) > -1;
  }

  function save() { TG.store.set(STATE_KEY, state); }

  function other(index) { return index === 0 ? 1 : 0; }

  function playerName(index) {
    var player = state.players[index];
    return player ? player.name : '–';
  }

  /* ---------------- Bilder ---------------- */

  /* Liefert eine Adresse fürs <img>, sobald das Bild aus der Datenbank da ist.
     Beim ersten Aufruf ist sie noch leer – das Laden stößt ein Neuzeichnen an. */
  function photoUrl(key) {
    if (!key) return null;
    if (urls[key]) return urls[key];
    if (loading[key]) return null;

    loading[key] = true;
    TG.photos.get(key).then(function (blob) {
      delete loading[key];
      if (!blob) return;
      urls[key] = URL.createObjectURL(blob);
      render();
    }).catch(function () {
      delete loading[key];
    });

    return null;
  }

  function releaseUrls() {
    Object.keys(urls).forEach(function (key) {
      URL.revokeObjectURL(urls[key]);
      delete urls[key];
    });
  }

  function liveKeys() {
    var keys = [];
    if (state.draft) keys = keys.concat(state.draft.keys.filter(Boolean));
    if (state.hunt) keys = keys.concat(state.hunt.keys.filter(Boolean));
    return keys;
  }

  /* Alles wegräumen, was zu keiner laufenden Runde mehr gehört. */
  function tidyPhotos() {
    var keep = liveKeys();
    Object.keys(urls).forEach(function (key) {
      if (keep.indexOf(key) > -1) return;
      URL.revokeObjectURL(urls[key]);
      delete urls[key];
    });
    TG.photos.keepOnly(keep).then(renderSettings).catch(function () { /* egal */ });
  }

  /* ---------------- Uhr ---------------- */

  function elapsedMs() {
    var hunt = state.hunt;
    if (!hunt) return 0;
    var running = hunt.startedAt ? Date.now() - hunt.startedAt : 0;
    return (hunt.elapsed || 0) + running;
  }

  function startTicker() {
    stopTicker();
    ticker = window.setInterval(function () {
      if (state.phase !== 'hunt') { stopTicker(); return; }
      el.huntClock.textContent = F.clockLabel(elapsedMs() / 1000);
    }, 500);
  }

  function stopTicker() {
    if (ticker) { window.clearInterval(ticker); ticker = null; }
  }

  function pauseClock() {
    var hunt = state.hunt;
    if (!hunt || !hunt.startedAt) return;
    hunt.elapsed = elapsedMs();
    hunt.startedAt = null;
  }

  function resumeClock() {
    var hunt = state.hunt;
    if (!hunt || hunt.startedAt) return;
    hunt.startedAt = Date.now();
  }

  /* ---------------- Verstecken ---------------- */

  function emptyKeys() {
    var keys = [];
    for (var i = 0; i < COUNT; i++) keys.push(null);
    return keys;
  }

  function startShooting(index) {
    state.seq += 1;
    state.draft = {
      hider: index,
      keys: emptyKeys(),
      clue: ''
    };
    state.phase = 'shoot';
    state.hider = index;
    save();
  }

  function renderShoot() {
    var draft = state.draft;
    var taken = draft.keys.filter(Boolean).length;

    el.shootTitle.textContent = playerName(draft.hider) + ' versteckt sich';
    el.shootLeft.textContent = taken + ' von ' + COUNT;
    el.shootHint.textContent = taken === 0
      ? 'Foto 1 soll schwer sein – geh ganz nah ran.'
      : (taken < COUNT
        ? 'Noch ' + (COUNT - taken) + '. Je höher die Nummer, desto mehr darf man erkennen.'
        : 'Alle fünf da. Foto antippen zum Ansehen, ✕ zum Neumachen.');

    el.slots.textContent = '';
    draft.keys.forEach(function (key, index) {
      el.slots.appendChild(slotItem(key, index));
    });

    if (el.clue.value !== draft.clue) el.clue.value = draft.clue;
    el.shootDone.disabled = !F.hasAllPhotos(draft.keys);
  }

  function slotItem(key, index) {
    var item = document.createElement('li');
    item.className = 'fj-slot' + (key ? ' is-filled' : '');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'fj-slot__button';
    button.dataset.slot = String(index);

    var number = document.createElement('span');
    number.className = 'fj-slot__number';
    number.textContent = String(index + 1);

    if (key) {
      var url = photoUrl(key);
      if (url) {
        var image = document.createElement('img');
        image.className = 'fj-slot__img';
        image.src = url;
        image.alt = 'Foto ' + (index + 1);
        button.appendChild(image);
      } else {
        button.appendChild(spinner());
      }
      button.setAttribute('aria-label', 'Foto ' + (index + 1) + ' ansehen');
    } else {
      var plus = document.createElement('span');
      plus.className = 'fj-slot__plus';
      plus.setAttribute('aria-hidden', 'true');
      plus.textContent = '＋';
      button.appendChild(plus);
      button.setAttribute('aria-label', 'Foto ' + (index + 1) + ' aufnehmen');
    }

    button.appendChild(number);
    item.appendChild(button);

    if (key) {
      var clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'fj-slot__clear';
      clear.dataset.clear = String(index);
      clear.textContent = '✕';
      clear.setAttribute('aria-label', 'Foto ' + (index + 1) + ' verwerfen');
      item.appendChild(clear);
    }

    return item;
  }

  function spinner() {
    var mark = document.createElement('span');
    mark.className = 'fj-slot__wait';
    mark.setAttribute('aria-hidden', 'true');
    return mark;
  }

  function slotKey(index) {
    return 'r' + state.seq + '-' + index;
  }

  function takePhoto(index) {
    pickingSlot = index;
    el.picker.value = '';
    el.picker.click();
  }

  function onPicked() {
    var file = el.picker.files && el.picker.files[0];
    var index = pickingSlot;
    pickingSlot = null;
    if (!file || index === null) return;

    var key = slotKey(index);
    el.slots.classList.add('is-busy');

    TG.photos.put(key, file).then(function () {
      if (urls[key]) { URL.revokeObjectURL(urls[key]); delete urls[key]; }
      state.draft.keys[index] = key;
      el.slots.classList.remove('is-busy');
      TG.haptic(10);
      save();
      render();
    }).catch(function (error) {
      el.slots.classList.remove('is-busy');
      TG.toast(error && error.message ? error.message : 'Das Foto ließ sich nicht speichern');
    });
  }

  function dropPhoto(index) {
    var key = state.draft.keys[index];
    if (!key) return;

    state.draft.keys[index] = null;
    if (urls[key]) { URL.revokeObjectURL(urls[key]); delete urls[key]; }
    TG.photos.remove(key).catch(function () { /* egal */ });
    TG.haptic(6);
    save();
    render();
  }

  function finishShooting() {
    var draft = state.draft;
    if (!F.hasAllPhotos(draft.keys)) { TG.toast('Es fehlen noch Fotos'); return; }

    state.hunt = {
      hider: draft.hider,
      seeker: other(draft.hider),
      keys: draft.keys.slice(),
      clue: draft.clue,
      revealed: 1,
      viewing: 0,
      elapsed: 0,
      startedAt: null
    };
    state.draft = null;
    save();

    showCurtain(state.hunt.seeker, 'hunt',
      playerName(state.hunt.hider) + ' hat sich versteckt. Such die Stelle – die Uhr läuft ab dem Tippen.');
  }

  /* ---------------- Suchen ---------------- */

  function renderHunt() {
    var hunt = state.hunt;

    el.huntTitle.textContent = playerName(hunt.seeker) + ' sucht';
    el.huntClock.textContent = F.clockLabel(elapsedMs() / 1000);

    el.huntClue.hidden = !hunt.clue;
    if (hunt.clue) el.huntClue.textContent = '„' + hunt.clue + '“';

    var key = hunt.keys[hunt.viewing];
    var url = photoUrl(key);
    el.huntPhoto.hidden = !url;
    if (url) el.huntPhoto.src = url;
    el.huntPhoto.alt = 'Foto ' + (hunt.viewing + 1) + ' vom Versteck';
    el.huntCaption.textContent = url
      ? 'Foto ' + (hunt.viewing + 1) + ' von ' + hunt.revealed + ' aufgedeckten'
      : 'Foto wird geladen …';

    el.huntDots.textContent = '';
    for (var i = 0; i < hunt.revealed; i++) {
      var dot = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'fj-dot' + (i === hunt.viewing ? ' is-on' : '');
      button.dataset.dot = String(i);
      button.textContent = String(i + 1);
      button.setAttribute('aria-pressed', i === hunt.viewing ? 'true' : 'false');
      dot.appendChild(button);
      el.huntDots.appendChild(dot);
    }

    var worth = F.pointsFor(hunt.revealed, true);
    el.huntWorth.textContent = hunt.revealed >= COUNT
      ? 'Alle Fotos aufgedeckt – ein Punkt ist noch drin.'
      : 'Jetzt gefunden: ' + worth + ' Punkte. Noch ein Foto: ' +
        F.pointsFor(hunt.revealed + 1, true) + '.';

    el.reveal.textContent = hunt.revealed >= COUNT ? 'Aufgeben' : 'Nächstes Foto';
    el.reveal.classList.toggle('btn--danger', hunt.revealed >= COUNT);
  }

  function revealNext() {
    var hunt = state.hunt;

    if (hunt.revealed >= COUNT) { giveUp(); return; }

    hunt.revealed += 1;
    hunt.viewing = hunt.revealed - 1;
    TG.haptic(8);
    save();
    render();
  }

  function giveUp() {
    askConfirm('Aufgeben?', 'Die Runde zählt dann null Punkte.', 'Aufgeben').then(function (yes) {
      if (!yes) return;
      pauseClock();
      recordHunt(false);
    });
  }

  function claimFound() {
    pauseClock();
    state.phase = 'judge';
    save();
    showCurtain(state.hunt.hider, 'judge',
      playerName(state.hunt.seeker) + ' sagt, die Stelle ist gefunden. Schau nach – die Uhr steht so lange.');
  }

  function renderJudge() {
    var hunt = state.hunt;
    el.judgeTitle.textContent = 'Steht ' + playerName(hunt.seeker) + ' richtig?';
    el.judgeText.textContent = 'Deine Stelle nach ' + F.clockLabel(elapsedMs() / 1000) +
      ' und ' + hunt.revealed + ' Foto' + (hunt.revealed === 1 ? '' : 's') + '.';
    fillThumbs(el.judgeThumbs, hunt.keys);
  }

  function judge(correct) {
    if (correct) {
      recordHunt(true);
      return;
    }

    state.phase = 'hunt';
    save();
    showCurtain(state.hunt.seeker, 'hunt', 'Noch nicht die richtige Stelle. Weitersuchen!');
  }

  function recordHunt(found) {
    var hunt = state.hunt;
    var seconds = Math.round(elapsedMs() / 1000);

    state.players[hunt.seeker].hunts.push({
      points: F.pointsFor(hunt.revealed, found),
      found: found,
      revealed: hunt.revealed,
      seconds: seconds
    });

    hunt.startedAt = null;
    hunt.elapsed = seconds * 1000;
    hunt.found = found;
    state.phase = 'huntover';
    stopTicker();
    TG.haptic(found ? [0, 40, 60, 40] : 20);
    save();
    render();
  }

  function renderHuntover() {
    var hunt = state.hunt;
    var player = state.players[hunt.seeker];
    var last = player.hunts[player.hunts.length - 1];

    el.huntoverTitle.textContent = last.found
      ? '📍 ' + playerName(hunt.seeker) + ': ' + last.points +
        ' Punkt' + (last.points === 1 ? '' : 'e')
      : playerName(hunt.seeker) + ' hat aufgegeben';

    var detail = last.found
      ? 'Gefunden nach ' + F.clockLabel(last.seconds) + ' mit ' + last.revealed +
        ' Foto' + (last.revealed === 1 ? '' : 's') + '.'
      : 'Nach ' + F.clockLabel(last.seconds) + ' und allen Fotos. Null Punkte.';

    el.huntoverText.textContent = detail + ' Gesamt: ' + F.scoreOf(player.hunts) + '.';
    fillThumbs(el.huntoverThumbs, hunt.keys);

    el.nextHunt.textContent = F.huntsLeft(state.players, state.rounds) <= 1 ? 'Ergebnis →' : 'Weiter →';
  }

  function fillThumbs(list, keys) {
    list.textContent = '';
    keys.forEach(function (key, index) {
      var item = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'fj-thumb';
      button.dataset.thumb = key;
      button.dataset.thumbIndex = String(index);
      button.setAttribute('aria-label', 'Foto ' + (index + 1) + ' groß ansehen');

      var url = photoUrl(key);
      if (url) {
        var image = document.createElement('img');
        image.src = url;
        image.alt = 'Foto ' + (index + 1);
        button.appendChild(image);
      } else {
        button.appendChild(spinner());
      }

      var number = document.createElement('span');
      number.className = 'fj-thumb__number';
      number.textContent = String(index + 1);
      button.appendChild(number);

      item.appendChild(button);
      list.appendChild(item);
    });
  }

  function continueAfterHunt() {
    var finished = F.huntsLeft(state.players, state.rounds) === 0;

    state.hunt = null;
    tidyPhotos();

    if (finished) {
      state.phase = 'over';
      save();
      TG.confetti(200);
      render();
      return;
    }

    var nextHider = other(state.hider);
    showCurtain(nextHider, 'shoot',
      'Geh los – außer Sichtweite – und mach fünf Fotos von einer Stelle.');
  }

  function renderOver() {
    var result = F.standings(state.players);

    el.overTitle.textContent = result.tie
      ? '🤝 Unentschieden, ' + result.best + ' zu ' + result.best
      : '🏆 ' + result.winner.name + ' gewinnt!';

    var fastest = null;
    result.rows.forEach(function (row) {
      if (row.fastest !== null && (fastest === null || row.fastest < fastest.fastest)) fastest = row;
    });

    var parts = [];
    if (result.tie) {
      parts.push('Beide gleich gut gesucht.');
    } else {
      var runnerUp = result.rows.filter(function (row) { return row.index !== result.winner.index; })[0];
      parts.push(result.winner.name + ' hat ' + result.winner.points + ' Punkte, ' +
        runnerUp.name + ' ' + runnerUp.points + '.');
    }
    if (fastest) parts.push('Schnellster Fund: ' + F.clockLabel(fastest.fastest) + ' von ' + fastest.name + '.');
    el.overText.textContent = parts.join(' ');

    el.standings.textContent = '';
    result.rows.slice().sort(function (a, b) { return b.points - a.points; }).forEach(function (entry) {
      var item = document.createElement('li');
      var row = document.createElement('div');
      row.className = 'fj-row' + (!result.tie && result.winner.index === entry.index ? ' is-winner' : '');

      var name = document.createElement('span');
      name.className = 'fj-row__name';
      name.textContent = entry.name;

      var detail = document.createElement('span');
      detail.className = 'fj-row__detail';
      detail.textContent = entry.found + ' von ' + entry.hunts + ' gefunden' +
        (entry.fastest !== null ? ' · schnellster ' + F.clockLabel(entry.fastest) : '');

      var points = document.createElement('span');
      points.className = 'fj-row__points';
      points.textContent = entry.points;
      points.setAttribute('aria-label', entry.points + ' Punkte');

      row.appendChild(name);
      row.appendChild(detail);
      row.appendChild(points);
      item.appendChild(row);
      el.standings.appendChild(item);
    });
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

    if (curtain.next === 'shoot') {
      startShooting(curtain.to);
    } else if (curtain.next === 'hunt') {
      state.phase = 'hunt';
      resumeClock();
    } else {
      state.phase = 'judge';
    }

    save();
    render();
  }

  /* ---------------- Darstellung ---------------- */

  function render() {
    var phase = state.phase;
    var covered = !!state.curtain;

    el.curtain.hidden = !covered;

    /* Hinter dem Sichtschutz darf kein Foto stehen bleiben. */
    el.main.hidden = covered;
    el.actionbar.hidden = covered;

    if (covered) {
      stopTicker();
      el.huntPhoto.removeAttribute('src');
      el.slots.textContent = '';
      el.judgeThumbs.textContent = '';
      el.huntoverThumbs.textContent = '';
      renderCurtain();
      return;
    }

    el.setup.hidden = phase !== 'setup';
    el.shoot.hidden = phase !== 'shoot';
    el.hunt.hidden = phase !== 'hunt';
    el.judge.hidden = phase !== 'judge';
    el.huntover.hidden = phase !== 'huntover';
    el.over.hidden = phase !== 'over';

    el.setupActions.hidden = phase !== 'setup';
    el.shootActions.hidden = phase !== 'shoot';
    el.huntActions.hidden = phase !== 'hunt';
    el.judgeActions.hidden = phase !== 'judge';
    el.huntoverActions.hidden = phase !== 'huntover';
    el.overActions.hidden = phase !== 'over';

    if (phase === 'shoot') renderShoot();
    if (phase === 'hunt') { renderHunt(); startTicker(); } else stopTicker();
    if (phase === 'judge') renderJudge();
    if (phase === 'huntover') renderHuntover();
    if (phase === 'over') renderOver();

    renderSettings();
  }

  function renderSettings() {
    Array.prototype.forEach.call(el.roundsPicker.querySelectorAll('button'), function (button) {
      button.setAttribute('aria-pressed', button.dataset.rounds === String(state.rounds) ? 'true' : 'false');
    });

    var summary = state.rounds + ' Versteck' + (state.rounds === 1 ? '' : 'e') + ' pro Person';
    el.setupSummary.textContent = summary + ' – änderbar über das Zahnrad oben.';
    el.gameSummary.textContent = state.players.length === 2
      ? playerName(0) + ' gegen ' + playerName(1) + ' · ' + summary
      : 'Noch keine Partie begonnen. ' + summary;

    TG.photos.count().then(function (count) {
      el.photoHint.textContent = count
        ? count + ' Foto' + (count === 1 ? '' : 's') + ' auf diesem Gerät. Nach jeder Runde wird aufgeräumt.'
        : 'Gerade keine Fotos gespeichert.';
    }).catch(function () {
      el.photoHint.textContent = 'Fotospeicher nicht erreichbar.';
    });
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

  function showPhoto(key, index) {
    var url = photoUrl(key);
    if (!url) { TG.toast('Foto wird noch geladen'); return; }
    el.viewerImg.src = url;
    el.viewerImg.alt = 'Foto ' + (index + 1);
    el.viewerLabel.textContent = 'Foto ' + (index + 1) + ' von ' + COUNT;
    openDialog(el.viewer);
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

    var rounds = state.rounds;
    state = Object.assign(emptyState(), { rounds: rounds });
    state.players = names.slice(0, 2).map(function (name) {
      return { name: name, hunts: [] };
    });

    releaseUrls();
    TG.photos.clear().catch(function () { /* egal */ });

    showCurtain(0, 'shoot', 'Geh los – außer Sichtweite – und mach fünf Fotos von einer Stelle.');
  }

  function toSetup() {
    var rounds = state.rounds;
    state = Object.assign(emptyState(), { rounds: rounds });
    roster.set(['', '']);
    releaseUrls();
    TG.photos.clear().catch(function () { /* egal */ });
    stopTicker();
    save();
    render();
  }

  function bindEvents() {
    el.startGame.addEventListener('click', startGame);

    el.nameList.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); startGame(); }
    });

    el.slots.addEventListener('click', function (event) {
      var target = event.target.closest ? event.target.closest('button') : null;
      if (!target) return;
      if (target.dataset.clear != null) { dropPhoto(Number(target.dataset.clear)); return; }
      if (target.dataset.slot == null) return;

      var index = Number(target.dataset.slot);
      var key = state.draft.keys[index];
      if (key) showPhoto(key, index);
      else takePhoto(index);
    });

    el.picker.addEventListener('change', onPicked);

    el.clue.addEventListener('input', function () {
      if (!state.draft) return;
      state.draft.clue = el.clue.value.trim();
      save();
    });

    el.shootDone.addEventListener('click', finishShooting);

    el.huntDots.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-dot]') : null;
      if (!button) return;
      state.hunt.viewing = Number(button.dataset.dot);
      save();
      render();
    });

    el.huntPhoto.addEventListener('click', function () {
      showPhoto(state.hunt.keys[state.hunt.viewing], state.hunt.viewing);
    });

    el.reveal.addEventListener('click', revealNext);
    el.found.addEventListener('click', claimFound);
    el.judgeYes.addEventListener('click', function () { judge(true); });
    el.judgeNo.addEventListener('click', function () { judge(false); });
    el.nextHunt.addEventListener('click', continueAfterHunt);
    el.curtainGo.addEventListener('click', leaveCurtain);

    [el.judgeThumbs, el.huntoverThumbs].forEach(function (list) {
      list.addEventListener('click', function (event) {
        var button = event.target.closest ? event.target.closest('.fj-thumb') : null;
        if (!button) return;
        showPhoto(button.dataset.thumb, Number(button.dataset.thumbIndex));
      });
    });

    el.viewerClose.addEventListener('click', function () { closeDialog(el.viewer); });
    el.viewer.addEventListener('click', function (event) {
      if (event.target === el.viewer) closeDialog(el.viewer);
    });

    el.rematch.addEventListener('click', function () {
      state.players.forEach(function (player) { player.hunts = []; });
      state.hunt = null;
      state.draft = null;
      releaseUrls();
      TG.photos.clear().catch(function () { /* egal */ });
      showCurtain(0, 'shoot', 'Neue Runde. Such dir eine Stelle und mach fünf Fotos.');
    });

    el.newNames.addEventListener('click', toSetup);

    el.roundsPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-rounds]') : null;
      if (!button) return;
      state.rounds = Number(button.dataset.rounds);
      save();
      renderSettings();
    });

    el.clearPhotos.addEventListener('click', function () {
      askConfirm('Alle Fotos löschen?', 'Auch die der laufenden Runde. Die Partie startet dann neu.', 'Löschen')
        .then(function (yes) {
          if (!yes) return;
          closeDialog(el.settings);
          toSetup();
          TG.toast('Fotos gelöscht');
        });
    });

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.resetGame.addEventListener('click', function () {
      askConfirm('Partie abbrechen?', 'Punkte und Fotos gehen verloren.', 'Abbrechen')
        .then(function (yes) {
          if (!yes) return;
          closeDialog(el.settings);
          toSetup();
          TG.toast('Partie abgebrochen');
        });
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && state.phase === 'hunt') render();
    });

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  function init() {
    var saved = TG.store.get(STATE_KEY, null);
    state = isValidState(saved) ? saved : emptyState();

    if (state.phase === 'setup') roster.set(['', '']);

    if (!TG.photos.supported()) {
      el.storageHint.textContent = 'Dieser Browser erlaubt keinen Fotospeicher – im privaten Modus klappt die Fotojagd leider nicht.';
      el.startGame.disabled = true;
      el.setupSummary.textContent = 'Fotospeicher nicht verfügbar. Ohne ihn lässt sich die Jagd nicht spielen.';
    }

    if (!TG.store.available) {
      el.storageHint.textContent = 'Hinweis: Dieser Browser erlaubt keinen lokalen Speicher – die Partie geht beim Schließen verloren.';
    }

    /* Die Uhr darf nicht weiterlaufen, während das Handy in der Tasche steckt
       und niemand sucht – sie startet erst wieder hinter dem Sichtschutz. */
    if (state.hunt && state.phase !== 'hunt') pauseClock();

    save();
    render();
    bindEvents();
    TG.registerServiceWorker('../../sw.js');
  }

  init();
})(window, document);
