/* Der eigene QR-Erzeuger. Selbst geschrieben, damit die Codes auch ohne Netz
   entstehen – also lohnt es sich, die Struktur nachzumessen.
   Gegengelesen wurde er beim Bauen mit jsQR; hier wird geprüft, was ohne
   Fremdbibliothek prüfbar ist. */
'use strict';
const { load } = require('./harness.js');

exports.name = 'QR-Code';

exports.run = function (t) {
  const TG = load('assets/js/app.js', 'assets/js/qr.js');
  const qr = TG.qr;

  const code = qr.encode('https://bilbowutz.github.io/Travel-Games/games/auto-bingo/#c=K7M2XQ');
  t.ok('liefert eine Version', code.version >= 1 && code.version <= 10, code.version);
  t.equal('Größe folgt aus der Version', code.size, 17 + code.version * 4);
  t.equal('Raster ist quadratisch', code.modules.length, code.size);
  t.ok('jede Zeile ist so lang wie das Raster', code.modules.every((r) => r.length === code.size));
  t.ok('nur Nullen und Einsen', code.modules.every((r) => r.every((v) => v === 0 || v === 1)));
  t.ok('Fehlerkorrektur ist L oder M', code.level === 'L' || code.level === 'M', code.level);

  /* Die drei Suchmuster in den Ecken: 7×7 mit schwarzem Rand, weißem Ring,
     schwarzem 3×3-Kern. Ohne sie findet kein Scanner den Code. */
  const suchmuster = (ox, oy) => {
    const soll = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1]
    ];
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if (code.modules[oy + y][ox + x] !== soll[y][x]) return false;
      }
    }
    return true;
  };

  t.ok('Suchmuster oben links', suchmuster(0, 0));
  t.ok('Suchmuster oben rechts', suchmuster(code.size - 7, 0));
  t.ok('Suchmuster unten links', suchmuster(0, code.size - 7));

  /* Die Taktzeile: abwechselnd schwarz und weiß auf Zeile und Spalte 6. */
  let taktOk = true;
  for (let i = 8; i < code.size - 8; i++) {
    if (code.modules[6][i] !== (i % 2 === 0 ? 1 : 0)) taktOk = false;
    if (code.modules[i][6] !== (i % 2 === 0 ? 1 : 0)) taktOk = false;
  }
  t.ok('Taktzeile stimmt waagerecht und senkrecht', taktOk);

  /* Das dunkle Modul, das immer gesetzt ist. */
  t.equal('dunkles Pflichtmodul', code.modules[code.size - 8][8], 1);

  /* ---- Längen und Stufen ---- */
  const kurz = qr.encode('AB');
  t.ok('kurzer Text braucht eine kleine Version', kurz.version <= 2, kurz.version);
  const lang = qr.encode('x'.repeat(200));
  t.ok('langer Text braucht eine größere Version', lang.version > kurz.version, lang.version);
  t.ok('und weicht notfalls auf L aus', lang.level === 'L' || lang.level === 'M');
  t.throws('zu langer Text wirft', () => qr.encode('x'.repeat(5000)));

  /* ---- Gleicher Text, gleiches Bild ---- */
  const a = qr.encode('Travel Games');
  const b = qr.encode('Travel Games');
  t.equal('derselbe Text ergibt dasselbe Raster', a.modules, b.modules);
  const c = qr.encode('Travel Gameß');
  t.ok('anderer Text ergibt ein anderes Raster', JSON.stringify(a.modules) !== JSON.stringify(c.modules));

  /* Umlaute und Sonderzeichen dürfen nicht abstürzen. */
  t.ok('Umlaute gehen durch', qr.encode('Käsekästchen – Straße').size > 0);
  t.ok('leerer Text geht durch', qr.encode('').size > 0);

  /* Ein gut gemischtes Raster: weder fast leer noch fast voll. */
  const schwarz = a.modules.flat().filter((v) => v === 1).length;
  const anteil = schwarz / (a.size * a.size);
  t.ok('Schwarzanteil liegt in einem sinnvollen Bereich', anteil > 0.3 && anteil < 0.7, anteil.toFixed(2));
};
