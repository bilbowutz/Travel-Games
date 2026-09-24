/* Die Inhaltslisten: Motive, Fragen, Wörter, Farben.
   Die pflegt man von Hand, also rutschen hier am ehesten Doppler durch. */
'use strict';
const { load, read } = require('./harness.js');

exports.name = 'Inhalte';

function doppelte(liste) {
  const gesehen = new Set();
  const doppelt = [];
  liste.forEach((eintrag) => {
    const schluessel = String(eintrag).toLowerCase().trim();
    if (gesehen.has(schluessel)) doppelt.push(eintrag);
    gesehen.add(schluessel);
  });
  return doppelt;
}

exports.run = function (t) {
  /* ---- Auto Bingo ---- */
  const motive = load('games/auto-bingo/items.js').autoBingoItems;
  t.ok('Auto Bingo hat Motive', Array.isArray(motive), typeof motive);
  /* Für ein 5×5-Brett braucht es mindestens 25 Motive, sonst wiederholt sich was. */
  t.ok('genug Motive für ein volles Brett', motive.length >= 25, motive.length);
  t.equal('keine doppelten Beschriftungen', doppelte(motive.map((m) => m.label)), []);
  t.equal('keine doppelten Kennungen', doppelte(motive.map((m) => m.id)), []);
  t.ok('jedes Motiv hat Symbol und Beschriftung',
    motive.every((m) => m.emoji && typeof m.label === 'string' && m.label.length > 1));
  /* Die Trennstellen aus der Quelle werden zu weichen Trennzeichen – der
     senkrechte Strich darf nicht mehr auftauchen. */
  t.ok('keine rohen Trennzeichen mehr in den Beschriftungen',
    motive.every((m) => m.label.indexOf('|') < 0),
    motive.filter((m) => m.label.indexOf('|') > -1).map((m) => m.label));
  t.ok('es gibt seltene Motive', motive.some((m) => m.rare));
  t.ok('aber nicht nur seltene', motive.filter((m) => !m.rare).length >= 25,
    motive.filter((m) => !m.rare).length);

  /* ---- Wer würde eher ---- */
  const pack = load('games/wer-wuerde-eher/questions.js').wwePack;
  t.ok('das Fragendeck hat eine Version', Number.isInteger(pack.version) && pack.version >= 1, pack.version);
  t.ok('es gibt genug Fragen', pack.questions.length > 50, pack.questions.length);
  t.equal('keine doppelten Fragen', doppelte(pack.questions), []);
  t.ok('keine Frage ist leer', pack.questions.every((f) => typeof f === 'string' && f.trim().length > 5));
  t.ok('keine Frage hat Leerraum am Rand', pack.questions.every((f) => f === f.trim()));
  /* Vorspann und Fragezeichen setzt die Oberfläche – in der Liste stehen sie nicht. */
  t.equal('keine Frage wiederholt den Vorspann',
    pack.questions.filter((f) => /^wer würde eher/i.test(f)), []);
  t.equal('keine Frage endet mit einem Fragezeichen',
    pack.questions.filter((f) => f.endsWith('?')), []);
  /* Groß-/Kleinschreibung am Anfang sagt nichts – im Deutschen fängt die
     Frage genauso gut mit einem Hauptwort an ("Ketchup auf alles tun"). */
  t.equal('der Vorspann steht in keiner Frage',
    pack.questions.filter((f) => /wer würde/i.test(f)), []);
  t.equal('keine Frage endet mit einem Satzzeichen',
    pack.questions.filter((f) => /[.!]$/.test(f)), []);

  /* ---- Farben-Rennen ---- */
  const farbModul = load('games/farben-rennen/colors.js');
  const farben = farbModul.carColors;
  t.ok('es gibt genug Autofarben', farben.length >= 6, farben.length);
  t.equal('keine doppelten Farbnamen', doppelte(farben.map((f) => f.name)), []);
  t.equal('keine doppelten Kennungen', doppelte(farben.map((f) => f.id)), []);
  t.ok('jede Farbe hat einen gültigen Farbwert',
    farben.every((f) => /^#[0-9a-f]{6}$/i.test(f.hex)), farben.filter((f) => !/^#[0-9a-f]{6}$/i.test(f.hex)));
  /* ink sagt, ob die Schrift auf der Kachel hell oder dunkel sein muss. */
  t.ok('jede Farbe sagt, welche Schriftfarbe darauf passt',
    farben.every((f) => f.ink === 'light' || f.ink === 'dark'), farben.filter((f) => !['light', 'dark'].includes(f.ink)));
  t.equal('Nachschlagen findet die Farbe', farbModul.carColorById('rot').name, 'Rot');
  t.ok('unbekannte Kennung liefert trotzdem eine Farbe', !!farbModul.carColorById('gibtsnicht'));

  /* ---- Wörter fürs Malen und Galgenmännchen ---- */
  const woerter = load('assets/js/words.js').words;
  const alleWoerter = [].concat(woerter.leicht, woerter.mittel, woerter.schwer);
  /* "schwer" liefert auch die leichteren mit – sonst wiederholt sich zu viel. */
  t.equal('leicht liefert nur die leichten', woerter.pool('leicht').length, woerter.leicht.length);
  t.equal('mittel liefert leicht und mittel', woerter.pool('mittel').length,
    woerter.leicht.length + woerter.mittel.length);
  t.equal('schwer liefert alles', woerter.pool('schwer').length, alleWoerter.length);
  t.ok('genug Wörter', alleWoerter.length > 100, alleWoerter.length);
  t.equal('keine doppelten Wörter über die Stufen', doppelte(alleWoerter), []);
  t.ok('alle Wörter sind Hauptwörter mit großem Anfang',
    alleWoerter.every((w) => w[0] === w[0].toUpperCase()),
    alleWoerter.filter((w) => w[0] !== w[0].toUpperCase()).slice(0, 5));
  t.ok('kein Wort hat Leerraum am Rand', alleWoerter.every((w) => w === w.trim()));

  /* ---- Begriffe zum Erklären ---- */
  const begriffe = load('games/begriffe-erklaeren/words.js').begriffe;
  const alleBegriffe = [].concat(begriffe.leicht, begriffe.mittel, begriffe.schwer);
  t.ok('fast vierhundert Begriffe', alleBegriffe.length > 350, alleBegriffe.length);
  t.equal('keine doppelten Begriffe über die Stufen', doppelte(alleBegriffe), []);
  t.ok('jede Stufe ist gut gefüllt',
    [begriffe.leicht, begriffe.mittel, begriffe.schwer].every((l) => l.length > 100),
    [begriffe.leicht.length, begriffe.mittel.length, begriffe.schwer.length]);
  t.ok('kein Begriff hat Leerraum am Rand', alleBegriffe.every((w) => w === w.trim()));
  t.ok('alle Begriffe fangen groß an', alleBegriffe.every((w) => w[0] === w[0].toUpperCase()));

  /* ---- Erzählwürfel ---- */
  const erzaehl = read('games/erzaehlwuerfel/game.js');
  t.ok('der Erzählwürfel hat Symbole', /symbol|SYMBOLE|faces/i.test(erzaehl));
};
