/* Superhirn – reine Regeln, ohne Oberfläche.
   Einer legt eine geheime Farbreihe, der andere rät. Nach jedem Versuch gibt
   es die Auswertung: schwarze Stifte für "richtige Farbe am richtigen Platz",
   weiße für "richtige Farbe, falscher Platz".

   Die Auswertung ist die einzige Stelle, an der man sich verrechnen kann, und
   zwar immer an derselben: Eine Farbe darf nur so oft gezählt werden, wie sie
   auf beiden Seiten vorkommt. Wer im Code zuerst alle weißen und dann die
   schwarzen zählt, bekommt bei doppelten Farben zu viele. Deshalb gehen hier
   erst die schwarzen weg, und nur der Rest wird auf weiße geprüft. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  /* Sechs gut unterscheidbare Farben. Jede trägt zusätzlich ein eigenes
     Zeichen – wer Rot und Grün schlecht auseinanderhält, spielt sonst blind. */
  var COLORS = [
    { id: 'rot',    name: 'Rot',    hex: '#e5484d', ink: 'light', mark: '●' },
    { id: 'orange', name: 'Orange', hex: '#f76b15', ink: 'dark',  mark: '▲' },
    { id: 'gelb',   name: 'Gelb',   hex: '#ffc53d', ink: 'dark',  mark: '■' },
    { id: 'gruen',  name: 'Grün',   hex: '#30a46c', ink: 'light', mark: '◆' },
    { id: 'blau',   name: 'Blau',   hex: '#0091ff', ink: 'light', mark: '★' },
    { id: 'lila',   name: 'Lila',   hex: '#8e4ec6', ink: 'light', mark: '✚' }
  ];

  var LENGTHS = [3, 4, 5];
  var TRIES = [8, 10, 12];

  function colorById(id) {
    for (var i = 0; i < COLORS.length; i++) if (COLORS[i].id === id) return COLORS[i];
    return null;
  }

  function colorIds() {
    return COLORS.map(function (color) { return color.id; });
  }

  /* Wie viele Möglichkeiten gibt es? Mit Wiederholungen sind es Farben hoch
     Länge, ohne entsprechend weniger – die Zahl steht in den Einstellungen,
     damit man sieht, worauf man sich einlässt. */
  function combinations(length, allowRepeats) {
    var colors = COLORS.length;
    if (allowRepeats) return Math.pow(colors, length);
    var total = 1;
    for (var i = 0; i < length; i++) total *= (colors - i);
    return total;
  }

  function randomCode(length, allowRepeats, random) {
    var rnd = random || Math.random;
    var pool = colorIds();
    var code = [];

    for (var i = 0; i < length; i++) {
      if (allowRepeats) {
        code.push(pool[Math.floor(rnd() * pool.length)]);
      } else {
        var index = Math.floor(rnd() * pool.length);
        code.push(pool[index]);
        pool.splice(index, 1);
      }
    }

    return code;
  }

  function isValidCode(code, length, allowRepeats) {
    if (!Array.isArray(code) || code.length !== length) return false;
    if (!code.every(function (id) { return !!colorById(id); })) return false;
    if (allowRepeats) return true;
    return new Set(code).size === code.length;
  }

  /* Die Auswertung. black = richtige Farbe am richtigen Platz,
     white = richtige Farbe, aber woanders. Nie mehr als die Codelänge. */
  function judge(secret, guess) {
    var black = 0;
    var restSecret = [];
    var restGuess = [];
    var i;

    for (i = 0; i < secret.length; i++) {
      if (secret[i] === guess[i]) {
        black++;
      } else {
        restSecret.push(secret[i]);
        restGuess.push(guess[i]);
      }
    }

    /* Nur was nach den schwarzen übrig bleibt, kann noch weiß werden – und
       jede Farbe höchstens so oft, wie sie auf beiden Seiten übrig ist. */
    var counts = {};
    restSecret.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });

    var white = 0;
    restGuess.forEach(function (id) {
      if (counts[id] > 0) { counts[id]--; white++; }
    });

    return { black: black, white: white, solved: black === secret.length };
  }

  /* Wie viele Möglichkeiten passen noch zu allen bisherigen Auswertungen?
     Damit lässt sich am Ende sagen, wie eng es wirklich war. */
  function remainingPossibilities(rows, length, allowRepeats) {
    var pool = colorIds();
    var count = 0;

    function passt(code) {
      for (var i = 0; i < rows.length; i++) {
        var urteil = judge(code, rows[i].guess);
        if (urteil.black !== rows[i].black || urteil.white !== rows[i].white) return false;
      }
      return true;
    }

    function walk(code) {
      if (code.length === length) {
        if (passt(code)) count++;
        return;
      }
      for (var i = 0; i < pool.length; i++) {
        if (!allowRepeats && code.indexOf(pool[i]) > -1) continue;
        walk(code.concat([pool[i]]));
      }
    }

    walk([]);
    return count;
  }

  /* Punkte für den Ratenden: je weniger Versuche, desto mehr. Ein Fehlschlag
     zählt nichts – sonst lohnt sich Raten auf gut Glück. */
  function pointsFor(usedTries, maxTries, solved) {
    if (!solved) return 0;
    return Math.max(1, maxTries - usedTries + 1);
  }

  function scoreOf(rounds) {
    return (rounds || []).reduce(function (sum, round) { return sum + (round.points || 0); }, 0);
  }

  function standings(players) {
    var rows = (players || []).map(function (player, index) {
      var rounds = player.rounds || [];
      var geloest = rounds.filter(function (r) { return r.solved; });
      var best = null;
      geloest.forEach(function (r) { if (best === null || r.tries < best) best = r.tries; });

      return {
        index: index,
        name: player.name,
        points: scoreOf(rounds),
        solved: geloest.length,
        rounds: rounds.length,
        fewest: best
      };
    });

    var top = -1;
    rows.forEach(function (row) { if (row.points > top) top = row.points; });
    var führende = rows.filter(function (row) { return row.points === top; });

    return {
      rows: rows,
      best: top,
      tie: führende.length > 1,
      winner: führende.length === 1 ? führende[0] : null
    };
  }

  function roundsLeft(players, perPlayer) {
    var done = (players || []).reduce(function (sum, p) { return sum + (p.rounds || []).length; }, 0);
    return Math.max(0, (players || []).length * perPlayer - done);
  }

  TG.superhirn = {
    COLORS: COLORS,
    LENGTHS: LENGTHS,
    TRIES: TRIES,
    colorById: colorById,
    colorIds: colorIds,
    combinations: combinations,
    randomCode: randomCode,
    isValidCode: isValidCode,
    judge: judge,
    remainingPossibilities: remainingPossibilities,
    pointsFor: pointsFor,
    scoreOf: scoreOf,
    standings: standings,
    roundsLeft: roundsLeft
  };
})(window);
