/* Begriffe erklären – reine Regeln, ohne Oberfläche.
   Das Spiel selbst ist simpel; interessant ist nur, wie der Stapel entsteht
   und wie gezählt wird. Beides hier, damit es sich ohne Browser prüfen lässt. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var LEVELS = [
    { id: 'leicht', name: 'Leicht', hint: 'Lauter Dinge, die man anfassen kann – geht auch mit Kindern.' },
    { id: 'mittel', name: 'Mittel', hint: 'Der Normalfall: zusammengesetzte Wörter, Berufe, Orte.' },
    { id: 'schwer', name: 'Schwer', hint: 'Gefühle, Begriffe, Redewendungen. Da muss man reden.' }
  ];

  var SECONDS = [30, 60, 90];
  var ROUNDS = [2, 3, 5];

  function levelById(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return LEVELS[1];
  }

  /* Eigene Begriffe kommen zu den vorgegebenen dazu, doppelte fliegen raus. */
  function poolFor(level, custom) {
    var base = (TG.begriffe && TG.begriffe[levelById(level).id]) || [];
    var seen = {};
    var pool = [];

    base.concat(custom || []).forEach(function (word) {
      var trimmed = String(word == null ? '' : word).trim();
      var key = trimmed.toLowerCase();
      if (!trimmed || seen[key]) return;
      seen[key] = true;
      pool.push(trimmed);
    });

    return pool;
  }

  function buildDeck(level, custom, random) {
    return TG.shuffle(poolFor(level, custom), random);
  }

  /* Zieht das oberste Wort. Ist der Stapel leer, wird neu gemischt – bei fast
     vierhundert Begriffen passiert das nur mit sehr kurzen eigenen Listen. */
  function draw(deck, level, custom, random) {
    var rest = (deck || []).slice();
    if (!rest.length) rest = buildDeck(level, custom, random);
    if (!rest.length) return { word: null, deck: [] };
    return { word: rest[rest.length - 1], deck: rest.slice(0, rest.length - 1) };
  }

  /* Erraten zählt einen Punkt, Überspringen kostet nichts außer Zeit. */
  function scoreOf(turns) {
    var points = 0;
    (turns || []).forEach(function (turn) { points += (turn.guessed || []).length; });
    return points;
  }

  function standings(players) {
    var rows = (players || []).map(function (player, index) {
      return {
        index: index,
        name: player.name,
        points: scoreOf(player.turns),
        guessed: (player.turns || []).reduce(function (sum, t) { return sum + t.guessed.length; }, 0),
        skipped: (player.turns || []).reduce(function (sum, t) { return sum + t.skipped.length; }, 0)
      };
    });

    var best = -1;
    rows.forEach(function (row) { if (row.points > best) best = row.points; });
    var leaders = rows.filter(function (row) { return row.points === best; });

    return { rows: rows, best: best, tie: leaders.length > 1, winner: leaders.length === 1 ? leaders[0] : null };
  }

  /* Wie viele Runden sind noch offen? Jede:r erklärt gleich oft. */
  function turnsLeft(players, rounds) {
    var done = (players || []).reduce(function (sum, p) { return sum + (p.turns || []).length; }, 0);
    return Math.max(0, (players || []).length * rounds - done);
  }

  TG.explain = {
    LEVELS: LEVELS,
    SECONDS: SECONDS,
    ROUNDS: ROUNDS,
    levelById: levelById,
    poolFor: poolFor,
    buildDeck: buildDeck,
    draw: draw,
    scoreOf: scoreOf,
    standings: standings,
    turnsLeft: turnsLeft
  };
})(window);
