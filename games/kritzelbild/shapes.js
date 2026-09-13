/* Zufällige Startformen fürs Kritzelbild.
   Alle Punkte liegen in Bruchteilen der Kantenlänge zwischen 0.1 und 0.9,
   damit rundherum Platz zum Weiterzeichnen bleibt. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var MIN = 0.1;
  var MAX = 0.9;

  var KINDS = ['welle', 'bogen', 'zickzack', 'schlaufe', 'striche', 'kringel'];

  function clamp(value) {
    return Math.min(MAX, Math.max(MIN, value));
  }

  function point(x, y) {
    return [Math.round(clamp(x) * 10000) / 10000, Math.round(clamp(y) * 10000) / 10000];
  }

  function between(random, low, high) {
    return low + random() * (high - low);
  }

  function welle(random) {
    var y = between(random, 0.35, 0.65);
    var amplitude = between(random, 0.1, 0.22);
    var turns = between(random, 1.2, 2.6);
    var phase = random() * Math.PI * 2;
    var points = [];

    for (var i = 0; i <= 44; i++) {
      var t = i / 44;
      points.push(point(MIN + t * (MAX - MIN), y + Math.sin(phase + t * turns * Math.PI * 2) * amplitude));
    }
    return [{ p: points }];
  }

  function bogen(random) {
    var cx = between(random, 0.4, 0.6);
    var cy = between(random, 0.4, 0.6);
    var radius = between(random, 0.2, 0.32);
    var from = random() * Math.PI * 2;
    var span = between(random, 1.4, 4.4);
    var points = [];

    for (var i = 0; i <= 34; i++) {
      var angle = from + (i / 34) * span;
      points.push(point(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
    }
    return [{ p: points }];
  }

  function zickzack(random) {
    var count = Math.floor(between(random, 4, 7));
    var high = between(random, 0.25, 0.38);
    var low = between(random, 0.6, 0.75);
    var points = [];

    for (var i = 0; i < count; i++) {
      var x = MIN + (i / (count - 1)) * (MAX - MIN);
      points.push(point(x, i % 2 === 0 ? high : low));
    }
    return [{ p: points }];
  }

  function schlaufe(random) {
    var cx = between(random, 0.42, 0.58);
    var cy = between(random, 0.42, 0.58);
    var width = between(random, 0.22, 0.34);
    var height = between(random, 0.16, 0.3);
    var tilt = between(random, -0.5, 0.5);
    var points = [];

    for (var i = 0; i <= 64; i++) {
      var t = (i / 64) * Math.PI * 2;
      var x = Math.sin(t * 2) * width;
      var y = Math.sin(t) * height;
      points.push(point(
        cx + x * Math.cos(tilt) - y * Math.sin(tilt),
        cy + x * Math.sin(tilt) + y * Math.cos(tilt)
      ));
    }
    return [{ p: points }];
  }

  function striche(random) {
    var count = Math.floor(between(random, 2, 4));
    var paths = [];

    for (var i = 0; i < count; i++) {
      paths.push({
        p: [
          point(between(random, MIN, MAX), between(random, MIN, MAX)),
          point(between(random, MIN, MAX), between(random, MIN, MAX))
        ]
      });
    }
    return paths;
  }

  function kringel(random) {
    var cx = between(random, 0.42, 0.58);
    var cy = between(random, 0.42, 0.58);
    var inner = between(random, 0.04, 0.09);
    var outer = between(random, 0.24, 0.34);
    var turns = between(random, 1.8, 3.2);
    var start = random() * Math.PI * 2;
    var points = [];

    for (var i = 0; i <= 70; i++) {
      var t = i / 70;
      var angle = start + t * turns * Math.PI * 2;
      var radius = inner + t * (outer - inner);
      points.push(point(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
    }
    return [{ p: points }];
  }

  var BUILDERS = {
    welle: welle,
    bogen: bogen,
    zickzack: zickzack,
    schlaufe: schlaufe,
    striche: striche,
    kringel: kringel
  };

  TG.squiggle = {
    KINDS: KINDS,

    /* Gleicher Startwert, gleiche Form. */
    build: function (seed) {
      var random = TG.rng(seed);
      var kind = KINDS[Math.floor(random() * KINDS.length)];
      return { kind: kind, paths: BUILDERS[kind](random) };
    }
  };
})(window);
