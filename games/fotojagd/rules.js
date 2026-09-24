/* Fotojagd – reine Regeln, ohne Oberfläche.
   Einer geht an eine Stelle und macht fünf Fotos, der andere sucht sie.
   Der Reiz steckt in der Punktevergabe: gesucht wird zuerst mit einem
   einzigen Foto, jedes weitere kostet. Wer mit wenig auskommt, bekommt mehr. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var PHOTO_COUNT = 5;
  var ROUNDS = [1, 2, 3];

  /* Ein Foto ist immer zu sehen – das ist der Einstieg, kein Zusatz. */
  function pointsFor(revealed, found) {
    if (!found) return 0;
    var used = Math.min(Math.max(revealed || 1, 1), PHOTO_COUNT);
    return PHOTO_COUNT + 1 - used;
  }

  function maxPoints() { return PHOTO_COUNT; }

  /* Wie viel ist das nächste Foto wert – und was kostet es? */
  function revealCost(revealed) {
    return revealed >= PHOTO_COUNT ? 0 : 1;
  }

  function hasAllPhotos(photos) {
    if (!Array.isArray(photos) || photos.length !== PHOTO_COUNT) return false;
    return photos.every(function (entry) { return !!entry; });
  }

  function scoreOf(hunts) {
    var points = 0;
    (hunts || []).forEach(function (hunt) { points += hunt.points || 0; });
    return points;
  }

  function standings(players) {
    var rows = (players || []).map(function (player, index) {
      var hunts = player.hunts || [];
      var found = hunts.filter(function (hunt) { return hunt.found; });
      var fastest = null;

      found.forEach(function (hunt) {
        if (fastest === null || hunt.seconds < fastest) fastest = hunt.seconds;
      });

      return {
        index: index,
        name: player.name,
        points: scoreOf(hunts),
        found: found.length,
        hunts: hunts.length,
        fastest: fastest
      };
    });

    var best = -1;
    rows.forEach(function (row) { if (row.points > best) best = row.points; });
    var leaders = rows.filter(function (row) { return row.points === best; });

    return {
      rows: rows,
      best: best,
      tie: leaders.length > 1,
      winner: leaders.length === 1 ? leaders[0] : null
    };
  }

  /* Jede:r versteckt gleich oft, also zählen wir die erledigten Jagden. */
  function huntsLeft(players, rounds) {
    var done = (players || []).reduce(function (sum, player) {
      return sum + (player.hunts || []).length;
    }, 0);
    return Math.max(0, (players || []).length * rounds - done);
  }

  /* "3:47" – so liest man eine Suchdauer schneller als in Sekunden. */
  function clockLabel(seconds) {
    var total = Math.max(0, Math.round(seconds || 0));
    var minutes = Math.floor(total / 60);
    var rest = total % 60;
    return minutes + ':' + (rest < 10 ? '0' : '') + rest;
  }

  TG.fotojagd = {
    PHOTO_COUNT: PHOTO_COUNT,
    ROUNDS: ROUNDS,
    pointsFor: pointsFor,
    maxPoints: maxPoints,
    revealCost: revealCost,
    hasAllPhotos: hasAllPhotos,
    scoreOf: scoreOf,
    standings: standings,
    huntsLeft: huntsLeft,
    clockLabel: clockLabel
  };
})(window);
