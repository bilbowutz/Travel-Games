/* Superhirn – vor allem die Auswertung.
   Dort verrechnet man sich bei doppelten Farben, und zwar immer gleich:
   eine Farbe darf nur so oft zählen, wie sie auf beiden Seiten vorkommt. */
'use strict';
const { load } = require('./harness.js');

exports.name = 'Superhirn';

exports.run = function (t) {
  const TG = load('assets/js/app.js', 'games/superhirn/rules.js');
  const S = TG.superhirn;
  const u = (geheim, versuch) => {
    const r = S.judge(geheim, versuch);
    return [r.black, r.white];
  };

  t.equal('sechs Farben', S.COLORS.length, 6);
  t.equal('keine doppelten Farbkennungen', S.colorIds().length, new Set(S.colorIds()).size);
  t.ok('jede Farbe hat einen Namen und einen Farbwert',
    S.COLORS.every((c) => c.name && /^#[0-9a-f]{6}$/i.test(c.hex)));
  t.ok('jede Farbe sagt, welche Schrift darauf passt',
    S.COLORS.every((c) => c.ink === 'light' || c.ink === 'dark'));
  /* Wer Rot und Grün schlecht unterscheidet, geht nach dem Zeichen. */
  t.ok('jede Farbe trägt ein Zeichen', S.COLORS.every((c) => typeof c.mark === 'string' && c.mark.length > 0));
  t.equal('kein Zeichen kommt doppelt vor',
    S.COLORS.length, new Set(S.COLORS.map((c) => c.mark)).size);
  t.equal('kein Farbname kommt doppelt vor',
    S.COLORS.length, new Set(S.COLORS.map((c) => c.name)).size);
  t.ok('Nachschlagen findet die Farbe', S.colorById('blau').name === 'Blau');
  t.equal('unbekannte Kennung findet nichts', S.colorById('pink'), null);

  /* ---- Auswertung: die einfachen Fälle ---- */
  t.equal('alles richtig', u(['rot', 'blau', 'gelb'], ['rot', 'blau', 'gelb']), [3, 0]);
  t.equal('alles falsch', u(['rot', 'blau', 'gelb'], ['gruen', 'lila', 'orange']), [0, 0]);
  t.equal('einer am richtigen Platz', u(['rot', 'blau', 'gelb'], ['rot', 'lila', 'orange']), [1, 0]);
  t.equal('alle richtig, alle verdreht', u(['rot', 'blau', 'gelb'], ['blau', 'gelb', 'rot']), [0, 3]);
  t.equal('einer richtig, einer verdreht', u(['rot', 'blau', 'gelb'], ['rot', 'gelb', 'lila']), [1, 1]);
  t.ok('gelöst wird gemeldet', S.judge(['rot', 'blau'], ['rot', 'blau']).solved);
  t.ok('nicht gelöst wird nicht gemeldet', !S.judge(['rot', 'blau'], ['blau', 'rot']).solved);

  /* ---- Auswertung: doppelte Farben, die eigentliche Falle ---- */
  /* Der Klassiker: im Geheimnis einmal Rot, im Versuch zweimal. Nur eines
     davon darf zählen – und zwar das am richtigen Platz. */
  t.equal('zwei Rot geraten, eines im Code, richtig platziert',
    u(['rot', 'blau', 'gelb'], ['rot', 'rot', 'lila']), [1, 0]);
  t.equal('zwei Rot geraten, eines im Code, falsch platziert',
    u(['blau', 'rot', 'gelb'], ['rot', 'lila', 'rot']), [0, 1]);
  t.equal('zwei Rot im Code, eines geraten',
    u(['rot', 'rot', 'gelb'], ['rot', 'blau', 'lila']), [1, 0]);
  t.equal('zwei Rot auf beiden Seiten, eines am Platz',
    u(['rot', 'rot', 'gelb'], ['rot', 'gelb', 'rot']), [1, 2]);
  t.equal('drei Rot geraten, zwei im Code',
    u(['rot', 'rot', 'blau'], ['rot', 'rot', 'rot']), [2, 0]);
  t.equal('drei Rot im Code, zwei geraten',
    u(['rot', 'rot', 'rot'], ['rot', 'rot', 'blau']), [2, 0]);
  t.equal('alles dieselbe Farbe', u(['rot', 'rot', 'rot'], ['rot', 'rot', 'rot']), [3, 0]);
  t.equal('vier gleiche gegen vier andere gleiche',
    u(['rot', 'rot', 'rot', 'rot'], ['blau', 'blau', 'blau', 'blau']), [0, 0]);

  /* Der Fall, an dem eine naive Auswertung scheitert: erst weiße zählen und
     dann schwarze ergäbe hier 1 schwarz + 2 weiß, richtig sind 1 und 1. */
  t.equal('schwarze gehen vor weißen',
    u(['rot', 'blau', 'blau'], ['rot', 'rot', 'blau']), [2, 0]);
  t.equal('klassische Stolperstelle',
    u(['rot', 'rot', 'blau', 'gruen'], ['rot', 'blau', 'rot', 'rot']), [1, 2]);

  /* ---- Auswertung: die Summe kann nie zu groß werden ---- */
  let zuViel = 0;
  let unsymmetrisch = 0;
  const farben = S.colorIds();
  const alleCodes = [];
  for (const a of farben) for (const b of farben) for (const c of farben) alleCodes.push([a, b, c]);

  for (const geheim of alleCodes) {
    for (const versuch of alleCodes) {
      const r = S.judge(geheim, versuch);
      if (r.black + r.white > 3) zuViel++;
      if (r.black < 0 || r.white < 0) zuViel++;
      /* Vertauscht man Geheimnis und Versuch, muss dasselbe herauskommen. */
      const andersherum = S.judge(versuch, geheim);
      if (andersherum.black !== r.black || andersherum.white !== r.white) unsymmetrisch++;
    }
  }
  t.equal('bei allen 216×216 Paaren nie mehr Stifte als Stellen', zuViel, 0);
  t.equal('die Auswertung ist in beide Richtungen gleich', unsymmetrisch, 0);

  /* Genau ein Code je Versuch bekommt die volle Punktzahl. */
  let volltreffer = 0;
  for (const geheim of alleCodes) {
    if (S.judge(geheim, ['rot', 'blau', 'gelb']).solved) volltreffer++;
  }
  t.equal('nur der richtige Code löst', volltreffer, 1);

  /* ---- Codes erzeugen ---- */
  for (const länge of S.LENGTHS) {
    let schlecht = 0;
    let mitDopplern = 0;
    for (let i = 0; i < 400; i++) {
      const mit = S.randomCode(länge, true, Math.random);
      const ohne = S.randomCode(länge, false, Math.random);
      if (!S.isValidCode(mit, länge, true)) schlecht++;
      if (!S.isValidCode(ohne, länge, false)) schlecht++;
      if (new Set(mit).size < länge) mitDopplern++;
    }
    t.equal(`Länge ${länge}: 800 erzeugte Codes sind gültig`, schlecht, 0);
    t.ok(`Länge ${länge}: mit Wiederholungen kommen auch welche vor`, mitDopplern > 0, mitDopplern);
  }

  t.equal('gleicher Startwert, gleicher Code',
    S.randomCode(4, true, TG.rng(2024)), S.randomCode(4, true, TG.rng(2024)));

  t.ok('zu kurzer Code ist ungültig', !S.isValidCode(['rot', 'blau'], 3, true));
  t.ok('unbekannte Farbe ist ungültig', !S.isValidCode(['rot', 'blau', 'pink'], 3, true));
  t.ok('Doppler sind ungültig, wenn verboten', !S.isValidCode(['rot', 'rot', 'blau'], 3, false));
  t.ok('Doppler sind gültig, wenn erlaubt', S.isValidCode(['rot', 'rot', 'blau'], 3, true));
  t.ok('nichts ist ungültig', !S.isValidCode(null, 3, true));

  /* ---- Anzahl der Möglichkeiten ---- */
  t.equal('drei Stellen mit Wiederholung', S.combinations(3, true), 216);
  t.equal('vier Stellen mit Wiederholung', S.combinations(4, true), 1296);
  t.equal('drei Stellen ohne Wiederholung', S.combinations(3, false), 120);
  t.equal('vier Stellen ohne Wiederholung', S.combinations(4, false), 360);

  /* ---- Wie viele Möglichkeiten bleiben? ---- */
  t.equal('ohne Hinweise bleibt alles offen', S.remainingPossibilities([], 3, true), 216);
  const einHinweis = S.remainingPossibilities([{ guess: ['rot', 'rot', 'rot'], black: 3, white: 0 }], 3, true);
  t.equal('drei schwarze lassen genau einen übrig', einHinweis, 1);
  const keinTreffer = S.remainingPossibilities([{ guess: ['rot', 'rot', 'rot'], black: 0, white: 0 }], 3, true);
  t.equal('kein Treffer schließt Rot ganz aus', keinTreffer, 125);   /* 5^3 */
  t.ok('zwei Hinweise engen weiter ein',
    S.remainingPossibilities([
      { guess: ['rot', 'blau', 'gelb'], black: 1, white: 0 },
      { guess: ['rot', 'gruen', 'lila'], black: 1, white: 0 }
    ], 3, true) < keinTreffer);

  /* ---- Punkte ---- */
  t.equal('im ersten Versuch gelöst', S.pointsFor(1, 10, true), 10);
  t.equal('im letzten Versuch gelöst', S.pointsFor(10, 10, true), 1);
  t.equal('nicht gelöst', S.pointsFor(10, 10, false), 0);
  t.ok('nie weniger als ein Punkt bei Erfolg', S.pointsFor(99, 10, true) >= 1);

  const spieler = [
    { name: 'Anna', rounds: [{ points: 8, solved: true, tries: 3 }] },
    { name: 'Ben', rounds: [{ points: 5, solved: true, tries: 6 }] }
  ];
  t.equal('Punkte gezählt', S.scoreOf(spieler[0].rounds), 8);
  const stand = S.standings(spieler);
  t.equal('Anna führt', stand.winner.name, 'Anna');
  t.equal('mit wenigsten Versuchen', stand.rows[0].fewest, 3);
  t.ok('Gleichstand erkannt',
    S.standings([{ name: 'A', rounds: [{ points: 3, solved: true, tries: 4 }] },
                 { name: 'B', rounds: [{ points: 3, solved: true, tries: 5 }] }]).tie);
  t.equal('ohne Lösung keine Bestmarke',
    S.standings([{ name: 'A', rounds: [{ points: 0, solved: false, tries: 10 }] }]).rows[0].fewest, null);

  t.equal('zwei Runden pro Person', S.roundsLeft([{ rounds: [] }, { rounds: [] }], 2), 4);
  t.equal('nach dreien bleibt eine', S.roundsLeft([{ rounds: [1, 1] }, { rounds: [1] }], 2), 1);
  t.equal('nie unter null', S.roundsLeft([{ rounds: [1, 1, 1] }, { rounds: [1, 1] }], 2), 0);
};
