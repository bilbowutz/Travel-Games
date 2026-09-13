/* Minimaler QR-Encoder – Byte-Modus, Fehlerkorrektur L/M, Version 1 bis 10.
   Absichtlich ohne Bibliothek: die Seite soll offline funktionieren und
   keine fremden Skripte nachladen. Reicht für Links bis etwa 200 Zeichen. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  /* ---------- Rechnen in GF(256) ---------- */

  var EXP = new Array(512);
  var LOG = new Array(256);

  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function mul(a, b) {
    return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
  }

  function generatorPoly(degree) {
    var poly = [1];
    for (var i = 0; i < degree; i++) {
      var next = [];
      for (var k = 0; k <= poly.length; k++) next[k] = 0;
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= mul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function errorCodewords(data, count) {
    var gen = generatorPoly(count);
    var rem = data.slice();
    for (var i = 0; i < count; i++) rem.push(0);
    for (i = 0; i < data.length; i++) {
      var factor = rem[i];
      if (factor === 0) continue;
      for (var j = 0; j < gen.length; j++) rem[i + j] ^= mul(gen[j], factor);
    }
    return rem.slice(data.length);
  }

  /* ---------- Tabellen (ISO/IEC 18004) ---------- */

  /* [EC-Codewörter je Block, Blöcke Gruppe 1, Daten je Block, Blöcke Gruppe 2, Daten je Block] */
  var BLOCKS = {
    L: [
      null,
      [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0], [26, 1, 108, 0, 0],
      [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0], [30, 2, 116, 0, 0], [18, 2, 68, 2, 69]
    ],
    M: [
      null,
      [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
      [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]
    ]
  };

  var ALIGNMENT = [
    null, [], [6, 18], [6, 22], [6, 26], [6, 30],
    [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
  ];

  var EC_BITS = { L: 1, M: 0 };
  var MAX_VERSION = 10;

  function blockInfo(version, level) {
    var row = BLOCKS[level][version];
    return { ec: row[0], g1: row[1], d1: row[2], g2: row[3], d2: row[4] };
  }

  function dataCapacity(version, level) {
    var info = blockInfo(version, level);
    return info.g1 * info.d1 + info.g2 * info.d2;
  }

  /* ---------- Text zu Datenwörtern ---------- */

  function toBytes(text) {
    var out = [];
    var encoded = unescape(encodeURIComponent(text)); /* UTF-8, auch in alten Browsern */
    for (var i = 0; i < encoded.length; i++) out.push(encoded.charCodeAt(i) & 0xFF);
    return out;
  }

  function pickVersion(byteCount, level) {
    for (var version = 1; version <= MAX_VERSION; version++) {
      var countBits = version >= 10 ? 16 : 8;
      var needed = 4 + countBits + byteCount * 8;
      if (needed <= dataCapacity(version, level) * 8) return version;
    }
    return null;
  }

  function buildDataCodewords(bytes, version, level) {
    var capacity = dataCapacity(version, level) * 8;
    var bits = [];

    function push(value, length) {
      for (var i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
    }

    push(4, 4); /* Byte-Modus */
    push(bytes.length, version >= 10 ? 16 : 8);
    for (var i = 0; i < bytes.length; i++) push(bytes[i], 8);

    for (i = 0; i < 4 && bits.length < capacity; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    var codewords = [];
    for (i = 0; i < bits.length; i += 8) {
      var byte = 0;
      for (var j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
      codewords.push(byte);
    }

    var padding = [0xEC, 0x11];
    var p = 0;
    while (codewords.length < capacity / 8) codewords.push(padding[p++ % 2]);

    return codewords;
  }

  /* Datenblöcke und EC-Blöcke verschränken */
  function interleave(dataCodewords, info) {
    var blocks = [];
    var ecBlocks = [];
    var offset = 0;
    var i, j;

    for (i = 0; i < info.g1; i++) { blocks.push(dataCodewords.slice(offset, offset + info.d1)); offset += info.d1; }
    for (i = 0; i < info.g2; i++) { blocks.push(dataCodewords.slice(offset, offset + info.d2)); offset += info.d2; }
    for (i = 0; i < blocks.length; i++) ecBlocks.push(errorCodewords(blocks[i], info.ec));

    var result = [];
    var maxData = Math.max(info.d1, info.d2);
    for (i = 0; i < maxData; i++) {
      for (j = 0; j < blocks.length; j++) if (i < blocks[j].length) result.push(blocks[j][i]);
    }
    for (i = 0; i < info.ec; i++) {
      for (j = 0; j < ecBlocks.length; j++) result.push(ecBlocks[j][i]);
    }
    return result;
  }

  /* ---------- Raster aufbauen ---------- */

  function makeGrid(size, value) {
    var grid = [];
    for (var y = 0; y < size; y++) {
      var row = [];
      for (var x = 0; x < size; x++) row.push(value);
      grid.push(row);
    }
    return grid;
  }

  function drawFinder(modules, reserved, size, left, top) {
    for (var dy = -1; dy <= 7; dy++) {
      for (var dx = -1; dx <= 7; dx++) {
        var x = left + dx, y = top + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        var inner = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        modules[y][x] = (inner !== 2 && inner <= 3) ? 1 : 0;
        reserved[y][x] = true;
      }
    }
  }

  function drawFunctionPatterns(modules, reserved, size, version) {
    var i, j;

    drawFinder(modules, reserved, size, 0, 0);
    drawFinder(modules, reserved, size, size - 7, 0);
    drawFinder(modules, reserved, size, 0, size - 7);

    /* Taktmuster */
    for (i = 8; i < size - 8; i++) {
      modules[6][i] = i % 2 === 0 ? 1 : 0;
      modules[i][6] = i % 2 === 0 ? 1 : 0;
      reserved[6][i] = true;
      reserved[i][6] = true;
    }

    /* Ausrichtungsmuster */
    var positions = ALIGNMENT[version];
    for (i = 0; i < positions.length; i++) {
      for (j = 0; j < positions.length; j++) {
        var last = positions.length - 1;
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
        var cx = positions[j], cy = positions[i];
        for (var dy = -2; dy <= 2; dy++) {
          for (var dx = -2; dx <= 2; dx++) {
            var ring = Math.max(Math.abs(dx), Math.abs(dy));
            modules[cy + dy][cx + dx] = ring !== 1 ? 1 : 0;
            reserved[cy + dy][cx + dx] = true;
          }
        }
      }
    }

    /* Platz für Formatinformation freihalten */
    for (i = 0; i < 9; i++) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
    for (i = 0; i < 8; i++) {
      reserved[8][size - 1 - i] = true;
      reserved[size - 1 - i][8] = true;
    }

    /* Immer dunkles Modul */
    modules[size - 8][8] = 1;
    reserved[size - 8][8] = true;

    /* Versionsinformation ab Version 7 */
    if (version >= 7) {
      var rem = version;
      for (i = 0; i < 12; i++) rem = (rem << 1) ^ (((rem >>> 11) & 1) * 0x1F25);
      var bits = (version << 12) | rem;
      for (i = 0; i < 18; i++) {
        var bit = (bits >>> i) & 1;
        var a = size - 11 + i % 3;
        var b = Math.floor(i / 3);
        modules[b][a] = bit;
        modules[a][b] = bit;
        reserved[b][a] = true;
        reserved[a][b] = true;
      }
    }
  }

  function placeCodewords(modules, reserved, size, codewords) {
    var bitIndex = 0;
    var byteIndex = 0;
    var upward = true;

    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; /* Taktspalte überspringen */
      for (var step = 0; step < size; step++) {
        for (var k = 0; k < 2; k++) {
          var x = right - k;
          var y = upward ? size - 1 - step : step;
          if (reserved[y][x]) continue;
          var dark = 0;
          if (byteIndex < codewords.length) {
            dark = (codewords[byteIndex] >>> (7 - bitIndex)) & 1;
            bitIndex++;
            if (bitIndex === 8) { bitIndex = 0; byteIndex++; }
          }
          modules[y][x] = dark;
        }
      }
      upward = !upward;
    }
  }

  var MASKS = [
    function (y, x) { return (y + x) % 2 === 0; },
    function (y) { return y % 2 === 0; },
    function (y, x) { return x % 3 === 0; },
    function (y, x) { return (y + x) % 3 === 0; },
    function (y, x) { return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; },
    function (y, x) { return (y * x) % 2 + (y * x) % 3 === 0; },
    function (y, x) { return ((y * x) % 2 + (y * x) % 3) % 2 === 0; },
    function (y, x) { return ((y + x) % 2 + (y * x) % 3) % 2 === 0; }
  ];

  function applyMask(modules, reserved, size, mask) {
    var fn = MASKS[mask];
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        if (!reserved[y][x] && fn(y, x)) modules[y][x] ^= 1;
      }
    }
  }

  function placeFormat(modules, size, level, mask) {
    var data = (EC_BITS[level] << 3) | mask;
    var rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
    var bits = ((data << 10) | rem) ^ 0x5412;

    function bit(index) { return (bits >>> index) & 1; }

    for (i = 0; i <= 5; i++) modules[i][8] = bit(i);
    modules[7][8] = bit(6);
    modules[8][8] = bit(7);
    modules[8][7] = bit(8);
    for (i = 9; i < 15; i++) modules[8][14 - i] = bit(i);

    for (i = 0; i < 8; i++) modules[8][size - 1 - i] = bit(i);
    for (i = 8; i < 15; i++) modules[size - 15 + i][8] = bit(i);

    modules[size - 8][8] = 1;
  }

  /* ---------- Maske bewerten ---------- */

  function penalty(modules, size) {
    var score = 0;
    var x, y, i;

    /* Regel 1: lange gleichfarbige Ketten */
    for (y = 0; y < size; y++) {
      var runRow = 1, runCol = 1;
      for (x = 1; x < size; x++) {
        runRow = modules[y][x] === modules[y][x - 1] ? runRow + 1 : 1;
        if (runRow === 5) score += 3; else if (runRow > 5) score += 1;
        runCol = modules[x][y] === modules[x - 1][y] ? runCol + 1 : 1;
        if (runCol === 5) score += 3; else if (runCol > 5) score += 1;
      }
    }

    /* Regel 2: gleichfarbige 2x2-Blöcke */
    for (y = 0; y < size - 1; y++) {
      for (x = 0; x < size - 1; x++) {
        var v = modules[y][x];
        if (v === modules[y][x + 1] && v === modules[y + 1][x] && v === modules[y + 1][x + 1]) score += 3;
      }
    }

    /* Regel 3: finder-ähnliche Muster */
    var patternA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var patternB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];

    function matchesRow(row, start, pattern) {
      for (var k = 0; k < 11; k++) if (modules[row][start + k] !== pattern[k]) return false;
      return true;
    }

    function matchesColumn(column, start, pattern) {
      for (var k = 0; k < 11; k++) if (modules[start + k][column] !== pattern[k]) return false;
      return true;
    }

    for (i = 0; i < size; i++) {
      for (var start = 0; start + 11 <= size; start++) {
        if (matchesRow(i, start, patternA) || matchesRow(i, start, patternB)) score += 40;
        if (matchesColumn(i, start, patternA) || matchesColumn(i, start, patternB)) score += 40;
      }
    }

    /* Regel 4: Verhältnis dunkel zu hell */
    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) dark += modules[y][x];
    var percent = dark * 100 / (size * size);
    score += Math.floor(Math.abs(percent - 50) / 5) * 10;

    return score;
  }

  /* ---------- Öffentlich ---------- */

  TG.qr = {
    /* Gibt { size, modules, version, level } zurück oder wirft bei zu langem Text. */
    encode: function (text, options) {
      options = options || {};
      var level = options.level === 'L' ? 'L' : 'M';
      var bytes = toBytes(text);
      var version = pickVersion(bytes.length, level);

      if (version === null && level === 'M') {
        level = 'L';
        version = pickVersion(bytes.length, level);
      }
      if (version === null) throw new Error('Text zu lang für einen QR-Code');

      var size = 17 + version * 4;
      var info = blockInfo(version, level);
      var codewords = interleave(buildDataCodewords(bytes, version, level), info);

      var best = null;
      for (var mask = 0; mask < 8; mask++) {
        var modules = makeGrid(size, 0);
        var reserved = makeGrid(size, false);
        drawFunctionPatterns(modules, reserved, size, version);
        placeCodewords(modules, reserved, size, codewords);
        applyMask(modules, reserved, size, mask);
        placeFormat(modules, size, level, mask);

        var score = penalty(modules, size);
        if (!best || score < best.score) best = { score: score, modules: modules };
      }

      return { size: size, modules: best.modules, version: version, level: level };
    },

    /* Baut ein SVG als Zeichenkette – scharf in jeder Größe, ohne Canvas. */
    toSvg: function (result, options) {
      options = options || {};
      var quiet = options.quiet == null ? 4 : options.quiet;
      var total = result.size + quiet * 2;
      var dark = options.dark || '#000000';
      var light = options.light || '#ffffff';
      var path = [];

      for (var y = 0; y < result.size; y++) {
        for (var x = 0; x < result.size; x++) {
          if (!result.modules[y][x]) continue;
          var run = 1;
          while (x + run < result.size && result.modules[y][x + run]) run++;
          path.push('M' + (x + quiet) + ' ' + (y + quiet) + 'h' + run + 'v1h-' + run + 'z');
          x += run - 1;
        }
      }

      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" ' +
        'shape-rendering="crispEdges" role="img" aria-label="QR-Code zum Mitspielen">' +
        '<rect width="' + total + '" height="' + total + '" fill="' + light + '"/>' +
        '<path fill="' + dark + '" d="' + path.join('') + '"/></svg>';
    }
  };
})(window);
