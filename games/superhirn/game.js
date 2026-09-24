/* Superhirn – zu zweit auf einem Handy.
   Einer legt hinter dem Sichtschutz eine Farbreihe, der andere rät. Nach jedem
   Versuch gibt es Stifte: voll = richtige Farbe am richtigen Platz, hohl =
   richtige Farbe an falscher Stelle. Welcher Stift zu welcher Stelle gehört,
   verrät das Spiel nicht – sonst wäre es keins.
   Die Auswertung selbst steht in rules.js. */
(function (window, document) {
  'use strict';

  var TG = window.TG;
  var S = TG.superhirn;
  var STATE_KEY = 'superhirn.state';
  var STATE_VERSION = 1;

  var el = {
    main: document.querySelector('.game-main'),
    actionbar: document.querySelector('.actionbar'),
    setup: document.getElementById('setup'),
    set: document.getElementById('set'),
    guess: document.getElementById('guess'),
    round: document.getElementById('round'),
    over: document.getElementById('over'),
    nameList: document.getElementById('name-list'),
    setupSummary: document.getElementById('setup-summary'),
    setupActions: document.getElementById('setup-actions'),
    setActions: document.getElementById('set-actions'),
    guessActions: document.getElementById('guess-actions'),
    roundActions: document.getElementById('round-actions'),
    overActions: document.getElementById('over-actions'),
    startGame: document.getElementById('start-game'),
    setTitle: document.getElementById('set-title'),
    setLeft: document.getElementById('set-left'),
    setHint: document.getElementById('set-hint'),
    draft: document.getElementById('draft'),
    shuffleCode: document.getElementById('shuffle-code'),
    setDone: document.getElementById('set-done'),
    guessTitle: document.getElementById('guess-title'),
    guessLeft: document.getElementById('guess-left'),
    guessHint: document.getElementById('guess-hint'),
    rows: document.getElementById('rows'),
    current: document.getElementById('current'),
    clearGuess: document.getElementById('clear-guess'),
    submitGuess: document.getElementById('submit-guess'),
    roundTitle: document.getElementById('round-title'),
    roundText: document.getElementById('round-text'),
    reveal: document.getElementById('reveal'),
    roundRows: document.getElementById('round-rows'),
    nextRound: document.getElementById('next-round'),
    overTitle: document.getElementById('over-title'),
    overText: document.getElementById('over-text'),
    standings: document.getElementById('standings'),
    newNames: document.getElementById('new-names'),
    rematch: document.getElementById('rematch'),
    tray: document.getElementById('tray'),
    paletteList: document.getElementById('palette-list'),
    curtain: document.getElementById('curtain'),
    curtainTitle: document.getElementById('curtain-title'),
    curtainNote: document.getElementById('curtain-note'),
    curtainGo: document.getElementById('curtain-go'),
    settings: document.getElementById('settings'),
    openSettings: document.getElementById('open-settings'),
    closeSettings: document.getElementById('close-settings'),
    lengthPicker: document.getElementById('length-picker'),
    triesPicker: document.getElementById('tries-picker'),
    repeatsPicker: document.getElementById('repeats-picker'),
    combosHint: document.getElementById('combos-hint'),
    roundsPicker: document.getElementById('rounds-picker'),
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

  var roster = TG.nameEditor(el.nameList, { min: 2, max: 2, maxLength: 14 });

  /* ---------------- Zustand ---------------- */

  function emptyState() {
    return {
      v: STATE_VERSION,
      phase: 'setup',
      players: [],
      setter: 0,
      length: 4,
      maxTries: 10,
      repeats: true,
      rounds: 1,
      draft: [],
      round: null,
      curtain: null
    };
  }

  function isValidState(candidate) {
    return !!candidate &&
      candidate.v === STATE_VERSION &&
      Array.isArray(candidate.players) &&
      ['setup', 'set', 'guess', 'round', 'over'].indexOf(candidate.phase) > -1;
  }

  function save() { TG.store.set(STATE_KEY, state); }

  function other(index) { return index === 0 ? 1 : 0; }

  function playerName(index) {
    var player = state.players[index];
    return player ? player.name : '–';
  }

  function settingsSummary() {
    return state.length + ' Stellen · ' + state.maxTries + ' Versuche · ' +
      (state.repeats ? 'mit' : 'ohne') + ' Wiederholung';
  }

  /* ---------------- Bausteine ---------------- */

  function pegNode(colorId, options) {
    options = options || {};
    var color = S.colorById(colorId);
    var node = document.createElement(options.button ? 'button' : 'span');
    if (options.button) node.type = 'button';

    node.className = 'sh-peg' + (color ? '' : ' is-empty') + (options.small ? ' sh-peg--small' : '');
    if (color) {
      node.style.background = color.hex;
      /* Auf Gelb und Orange braucht das Zeichen dunkle Schrift, sonst helle. */
      if (color.ink === 'dark') node.classList.add('has-dark-ink');
      else node.classList.add('has-light-ink');
      node.textContent = color.mark;
      node.setAttribute('aria-label', color.name);
    } else {
      node.setAttribute('aria-label', 'leer');
    }
    return node;
  }

  /* Die Auswertung als Stifte: volle zuerst, dann hohle. Die Reihenfolge sagt
     nichts über die Stellen aus – das ist Absicht. */
  function judgeNode(black, white, length) {
    var box = document.createElement('span');
    box.className = 'sh-judge';
    box.setAttribute('aria-label', black + ' richtig am Platz, ' + white + ' richtige Farbe woanders');

    for (var i = 0; i < length; i++) {
      var pin = document.createElement('i');
      pin.className = 'sh-pin' + (i < black ? ' is-black' : (i < black + white ? ' is-white' : ''));
      box.appendChild(pin);
    }

    return box;
  }

  function codeList(container, code, options) {
    options = options || {};
    container.textContent = '';
    container.style.setProperty('--stellen', state.length);

    for (var i = 0; i < state.length; i++) {
      var item = document.createElement('li');
      var peg = pegNode(code[i] || null, { button: !!options.onSlot, small: options.small });
      if (options.onSlot) peg.dataset.slot = String(i);
      item.appendChild(peg);
      container.appendChild(item);
    }
  }

  /* Knopfleiste und Ablage sind unterschiedlich hoch – je nach Gerät, Schrift
     und sicherem Bereich. Geraten stimmt das nie, also wird gemessen. */
  function measureBars() {
    var leiste = el.actionbar.hidden ? 0 : el.actionbar.getBoundingClientRect().height;
    var ablage = el.tray.hidden ? 0 : el.tray.getBoundingClientRect().height;
    var wurzel = document.documentElement.style;
    if (leiste) wurzel.setProperty('--leiste', Math.round(leiste) + 'px');
    if (ablage) wurzel.setProperty('--ablage', Math.round(ablage) + 'px');
  }

  function renderPalette(visible) {
    el.tray.hidden = !visible;
    document.body.classList.toggle('has-tray', visible);
    if (!visible) { el.paletteList.textContent = ''; el.current.textContent = ''; return; }

    var used = {};
    var aktuell = state.phase === 'set' ? state.draft : (state.round ? state.round.current : []);
    (aktuell || []).forEach(function (id) { used[id] = (used[id] || 0) + 1; });

    el.paletteList.textContent = '';
    S.COLORS.forEach(function (color) {
      var item = document.createElement('li');
      var button = pegNode(color.id, { button: true });
      button.dataset.color = color.id;
      /* Ohne Wiederholung ist eine schon gelegte Farbe nicht mehr zu haben. */
      if (!state.repeats && used[color.id]) button.classList.add('is-spent');
      button.setAttribute('aria-label', color.name + (used[color.id] ? ', schon gelegt' : ''));
      item.appendChild(button);
      el.paletteList.appendChild(item);
    });
  }

  /* Farbe anhängen: sie landet auf der ersten freien Stelle. */
  function addColor(target, colorId) {
    if (target.length >= state.length) { TG.toast('Die Reihe ist voll'); return false; }
    if (!state.repeats && target.indexOf(colorId) > -1) {
      TG.toast('Jede Farbe nur einmal – so ist es eingestellt');
      return false;
    }
    target.push(colorId);
    TG.haptic(6);
    return true;
  }

  function removeAt(target, index) {
    if (index >= target.length) return false;
    target.splice(index, 1);
    TG.haptic(5);
    return true;
  }

  /* ---------------- Code legen ---------------- */

  function startSetting(index) {
    state.phase = 'set';
    state.setter = index;
    state.draft = [];
    save();
  }

  function renderSet() {
    el.setTitle.textContent = playerName(state.setter) + ' legt den Code';
    el.setLeft.textContent = state.draft.length + ' von ' + state.length;
    el.setHint.textContent = state.draft.length < state.length
      ? 'Farbe antippen zum Anlegen, gelegte Farbe antippen zum Entfernen.'
      : 'Steht. „Würfeln“ wirft alles neu.';

    renderPalette(true);
    codeList(el.current, state.draft, { onSlot: true });
    el.guessHint.textContent = el.setHint.textContent;
    el.setDone.disabled = !S.isValidCode(state.draft, state.length, state.repeats);
  }

  function finishSetting() {
    if (!S.isValidCode(state.draft, state.length, state.repeats)) {
      TG.toast('Der Code ist noch nicht vollständig');
      return;
    }

    state.round = {
      setter: state.setter,
      guesser: other(state.setter),
      secret: state.draft.slice(),
      rows: [],
      current: [],
      solved: false
    };
    state.draft = [];
    save();

    showCurtain(state.round.guesser, 'guess',
      playerName(state.round.setter) + ' hat gelegt. Du hast ' + state.maxTries + ' Versuche.');
  }

  /* ---------------- Raten ---------------- */

  function renderGuess() {
    var runde = state.round;
    var übrig = state.maxTries - runde.rows.length;

    el.guessTitle.textContent = playerName(runde.guesser) + ' rät';
    el.guessLeft.textContent = 'Versuch ' + (runde.rows.length + 1) + ' von ' + state.maxTries;

    renderRows(el.rows, runde.rows, false);

    renderPalette(true);
    codeList(el.current, runde.current, { onSlot: true });

    var vollständig = S.isValidCode(runde.current, state.length, state.repeats);
    el.guessHint.textContent = vollständig
      ? 'Tippe auf „Raten“.'
      : (übrig === 1
        ? 'Letzter Versuch – Farbe antippen zum Anlegen.'
        : 'Farbe antippen zum Anlegen, gelegte Farbe antippen zum Entfernen.');

    el.submitGuess.disabled = !vollständig;
    el.clearGuess.disabled = runde.current.length === 0;
  }

  function renderRows(container, rows, small) {
    container.textContent = '';

    rows.forEach(function (row, index) {
      var item = document.createElement('li');
      item.className = 'sh-row';

      var nummer = document.createElement('span');
      nummer.className = 'sh-row__number';
      nummer.textContent = String(index + 1);

      var pegs = document.createElement('ol');
      pegs.className = 'sh-code sh-code--row';
      pegs.style.setProperty('--stellen', state.length);
      row.guess.forEach(function (id) {
        var li = document.createElement('li');
        li.appendChild(pegNode(id, { small: true }));
        pegs.appendChild(li);
      });

      item.appendChild(nummer);
      item.appendChild(pegs);
      item.appendChild(judgeNode(row.black, row.white, state.length));
      container.appendChild(item);
    });

    if (!rows.length && !small) {
      var leer = document.createElement('li');
      leer.className = 'sh-rows__empty';
      leer.textContent = 'Noch kein Versuch. Leg eine Reihe und tippe auf „Raten“.';
      container.appendChild(leer);
    }
  }

  function submitGuess() {
    var runde = state.round;
    if (!S.isValidCode(runde.current, state.length, state.repeats)) return;

    var urteil = S.judge(runde.secret, runde.current);
    runde.rows.push({ guess: runde.current.slice(), black: urteil.black, white: urteil.white });
    runde.current = [];

    if (urteil.solved) {
      runde.solved = true;
      finishRound();
      return;
    }

    if (runde.rows.length >= state.maxTries) {
      finishRound();
      return;
    }

    TG.haptic(urteil.black ? 12 : 5);
    save();
    render();
  }

  function finishRound() {
    var runde = state.round;
    var versuche = runde.rows.length;

    state.players[runde.guesser].rounds.push({
      points: S.pointsFor(versuche, state.maxTries, runde.solved),
      solved: runde.solved,
      tries: versuche
    });

    state.phase = 'round';
    TG.haptic(runde.solved ? [0, 40, 60, 40] : 20);
    if (runde.solved) TG.confetti(160);
    save();
    render();
  }

  function renderRound() {
    var runde = state.round;
    var spieler = state.players[runde.guesser];
    var letzte = spieler.rounds[spieler.rounds.length - 1];

    el.roundTitle.textContent = runde.solved
      ? '🧠 ' + playerName(runde.guesser) + ': ' + letzte.points +
        ' Punkt' + (letzte.points === 1 ? '' : 'e')
      : playerName(runde.guesser) + ' knackt ihn nicht';

    if (runde.solved) {
      var möglich = S.combinations(state.length, state.repeats);
      el.roundText.textContent = 'Geknackt im ' + letzte.tries + '. Versuch – von ' +
        möglich.toLocaleString('de-DE') + ' möglichen Reihen. Gesamt: ' + S.scoreOf(spieler.rounds) + '.';
    } else {
      /* Am Ende darf man wissen, wie nah man dran war. */
      var rest = S.remainingPossibilities(runde.rows, state.length, state.repeats);
      el.roundText.textContent = 'Nach ' + letzte.tries + ' Versuchen ' +
        (rest === 1
          ? 'war nur noch diese eine Reihe möglich – so knapp!'
          : 'waren noch ' + rest + ' Reihen möglich.') +
        ' Keine Punkte. Gesamt: ' + S.scoreOf(spieler.rounds) + '.';
    }

    codeList(el.reveal, runde.secret, {});
    renderRows(el.roundRows, runde.rows, true);

    el.nextRound.textContent = S.roundsLeft(state.players, state.rounds) <= 1 ? 'Ergebnis →' : 'Weiter →';
  }

  function continueAfterRound() {
    var fertig = S.roundsLeft(state.players, state.rounds) === 0;
    state.round = null;

    if (fertig) {
      state.phase = 'over';
      save();
      TG.confetti(200);
      render();
      return;
    }

    showCurtain(other(state.setter), 'set', 'Du bist dran mit Legen.');
  }

  /* ---------------- Ergebnis ---------------- */

  function renderOver() {
    var ergebnis = S.standings(state.players);

    el.overTitle.textContent = ergebnis.tie
      ? '🤝 Unentschieden, ' + ergebnis.best + ' zu ' + ergebnis.best
      : '🏆 ' + ergebnis.winner.name + ' gewinnt!';

    var teile = [];
    if (ergebnis.tie) {
      teile.push('Beide gleich schlau.');
    } else {
      var zweiter = ergebnis.rows.filter(function (r) { return r.index !== ergebnis.winner.index; })[0];
      teile.push(ergebnis.winner.name + ' hat ' + ergebnis.winner.points + ' Punkte, ' +
        zweiter.name + ' ' + zweiter.points + '.');
    }

    var schnellste = null;
    ergebnis.rows.forEach(function (row) {
      if (row.fewest !== null && (schnellste === null || row.fewest < schnellste.fewest)) schnellste = row;
    });
    if (schnellste) {
      teile.push('Schnellste Lösung: ' + schnellste.fewest +
        (schnellste.fewest === 1 ? '. Versuch' : ' Versuche') + ' von ' + schnellste.name + '.');
    }
    el.overText.textContent = teile.join(' ');

    el.standings.textContent = '';
    ergebnis.rows.slice().sort(function (a, b) { return b.points - a.points; }).forEach(function (eintrag) {
      var item = document.createElement('li');
      var row = document.createElement('div');
      row.className = 'sh-standing' +
        (!ergebnis.tie && ergebnis.winner.index === eintrag.index ? ' is-winner' : '');

      var name = document.createElement('span');
      name.className = 'sh-standing__name';
      name.textContent = eintrag.name;

      var detail = document.createElement('span');
      detail.className = 'sh-standing__detail';
      detail.textContent = eintrag.solved + ' von ' + eintrag.rounds + ' geknackt' +
        (eintrag.fewest !== null ? ' · bestes ' + eintrag.fewest + '. Versuch' : '');

      var punkte = document.createElement('span');
      punkte.className = 'sh-standing__points';
      punkte.textContent = eintrag.points;
      punkte.setAttribute('aria-label', eintrag.points + ' Punkte');

      row.appendChild(name);
      row.appendChild(detail);
      row.appendChild(punkte);
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

    if (curtain.next === 'set') startSetting(curtain.to);
    else state.phase = 'guess';

    save();
    render();
  }

  /* ---------------- Darstellung ---------------- */

  function render() {
    var phase = state.phase;
    var covered = !!state.curtain;

    el.curtain.hidden = !covered;

    /* Hinter dem Sichtschutz darf der Code nicht im DOM stehen bleiben. */
    el.main.hidden = covered;
    el.actionbar.hidden = covered;

    if (covered) {
      el.reveal.textContent = '';
      renderPalette(false);
      renderCurtain();
      return;
    }

    el.setup.hidden = phase !== 'setup';
    el.set.hidden = phase !== 'set';
    el.guess.hidden = phase !== 'guess';
    el.round.hidden = phase !== 'round';
    el.over.hidden = phase !== 'over';

    el.setupActions.hidden = phase !== 'setup';
    el.setActions.hidden = phase !== 'set';
    el.guessActions.hidden = phase !== 'guess';
    el.roundActions.hidden = phase !== 'round';
    el.overActions.hidden = phase !== 'over';

    if (phase === 'set') renderSet();
    else if (phase === 'guess') renderGuess();
    else renderPalette(false);

    if (phase === 'round') renderRound();
    if (phase === 'over') renderOver();

    renderSettings();
    measureBars();
  }

  function markPicker(picker, attribute, value) {
    Array.prototype.forEach.call(picker.querySelectorAll('button'), function (button) {
      button.setAttribute('aria-pressed', button.dataset[attribute] === String(value) ? 'true' : 'false');
    });
  }

  function renderSettings() {
    markPicker(el.lengthPicker, 'length', state.length);
    markPicker(el.triesPicker, 'tries', state.maxTries);
    markPicker(el.repeatsPicker, 'repeats', state.repeats ? 'ja' : 'nein');
    markPicker(el.roundsPicker, 'rounds', state.rounds);

    var möglich = S.combinations(state.length, state.repeats);
    el.combosHint.textContent = möglich.toLocaleString('de-DE') + ' mögliche Reihen bei ' +
      state.length + ' Stellen.';

    el.setupSummary.textContent = settingsSummary() + ' – änderbar über das Zahnrad oben.';
    el.gameSummary.textContent = state.players.length === 2
      ? playerName(0) + ' gegen ' + playerName(1) + ' · ' + settingsSummary()
      : 'Noch keine Partie begonnen. ' + settingsSummary();
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

    var einstellungen = {
      length: state.length, maxTries: state.maxTries,
      repeats: state.repeats, rounds: state.rounds
    };
    state = Object.assign(emptyState(), einstellungen);
    state.players = names.slice(0, 2).map(function (name) { return { name: name, rounds: [] }; });

    showCurtain(0, 'set', 'Denk dir eine Farbreihe aus – der andere schaut weg.');
  }

  function toSetup() {
    var einstellungen = {
      length: state.length, maxTries: state.maxTries,
      repeats: state.repeats, rounds: state.rounds
    };
    state = Object.assign(emptyState(), einstellungen);
    roster.set(['', '']);
    save();
    render();
  }

  /* Eine Einstellung ändern wirft eine laufende Runde über den Haufen. */
  function applySetting(change) {
    Object.assign(state, change);

    if (state.round || state.draft.length) {
      state.draft = state.draft.filter(function (id, i) { return i < state.length; });
      if (state.round) {
        state.round = null;
        state.phase = state.phase === 'setup' ? 'setup' : 'set';
        state.draft = [];
        TG.toast('Einstellung geändert – die Runde beginnt neu');
        if (state.phase === 'set') startSetting(state.setter);
      }
    }

    save();
    render();
  }

  function bindEvents() {
    el.startGame.addEventListener('click', startGame);

    el.nameList.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); startGame(); }
    });

    el.paletteList.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('[data-color]') : null;
      if (!button) return;

      var ziel = state.phase === 'set' ? state.draft : (state.round ? state.round.current : null);
      if (!ziel) return;
      if (addColor(ziel, button.dataset.color)) { save(); render(); }
    });

    [el.current].forEach(function (liste) {
      liste.addEventListener('click', function (event) {
        var button = event.target.closest ? event.target.closest('[data-slot]') : null;
        if (!button) return;

        var ziel = state.phase === 'set' ? state.draft : (state.round ? state.round.current : null);
        if (!ziel) return;
        if (removeAt(ziel, Number(button.dataset.slot))) { save(); render(); }
      });
    });

    el.shuffleCode.addEventListener('click', function () {
      state.draft = S.randomCode(state.length, state.repeats, Math.random);
      TG.haptic(10);
      save();
      render();
    });

    el.setDone.addEventListener('click', finishSetting);
    el.submitGuess.addEventListener('click', submitGuess);

    el.clearGuess.addEventListener('click', function () {
      if (!state.round) return;
      state.round.current = [];
      TG.haptic(5);
      save();
      render();
    });

    el.nextRound.addEventListener('click', continueAfterRound);
    el.curtainGo.addEventListener('click', leaveCurtain);

    el.rematch.addEventListener('click', function () {
      state.players.forEach(function (player) { player.rounds = []; });
      state.round = null;
      state.draft = [];
      showCurtain(0, 'set', 'Neue Partie. Denk dir eine Farbreihe aus.');
    });

    el.newNames.addEventListener('click', toSetup);

    el.lengthPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-length]') : null;
      if (button) applySetting({ length: Number(button.dataset.length) });
    });

    el.triesPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-tries]') : null;
      if (button) applySetting({ maxTries: Number(button.dataset.tries) });
    });

    el.repeatsPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-repeats]') : null;
      if (button) applySetting({ repeats: button.dataset.repeats === 'ja' });
    });

    el.roundsPicker.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('button[data-rounds]') : null;
      if (button) { state.rounds = Number(button.dataset.rounds); save(); renderSettings(); }
    });

    el.openSettings.addEventListener('click', function () { openDialog(el.settings); });
    el.closeSettings.addEventListener('click', function () { closeDialog(el.settings); });
    el.settings.addEventListener('click', function (event) {
      if (event.target === el.settings) closeDialog(el.settings);
    });

    el.resetGame.addEventListener('click', function () {
      askConfirm('Partie abbrechen?', 'Punkte und der laufende Code gehen verloren.', 'Abbrechen')
        .then(function (yes) {
          if (!yes) return;
          closeDialog(el.settings);
          toSetup();
          TG.toast('Partie abgebrochen');
        });
    });

    window.addEventListener('resize', measureBars);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', measureBars);

    TG.bindThemeToggle(document.getElementById('theme-toggle'));
  }

  function init() {
    var saved = TG.store.get(STATE_KEY, null);
    state = isValidState(saved) ? saved : emptyState();

    if (state.phase === 'setup') roster.set(['', '']);
    if (!Array.isArray(state.draft)) state.draft = [];
    if (state.round && !Array.isArray(state.round.current)) state.round.current = [];

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
