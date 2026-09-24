/* Die gemeinsamen Helfer aus app.js – Codes, Zufall, Mischen. */
'use strict';
const { load } = require('./harness.js');

exports.name = 'Geteilte Helfer';

exports.run = function (t) {
  const TG = load('assets/js/app.js');

  /* ---- Rundencodes ---- */
  t.ok('Code ist sechs Zeichen lang', TG.code.LENGTH === 6);

  const seed = 123456789;
  const code = TG.code.fromNumber(seed);
  t.ok('Code hat die richtige Länge', code.length === 6, code);
  /* Crockford-Base32 lässt I, L, O und U weg – die verwechselt man zu leicht. */
  t.ok('Code nutzt nur eindeutige Zeichen', /^[0-9A-HJKMNP-TV-Z]{6}$/.test(code), code);
  t.equal('Code und zurück ergibt denselben Startwert', TG.code.toNumber(code), seed);

  /* Tippfehler verzeihen: I und L sind eine 1, O ist eine 0. */
  const mitTippfehlern = code.replace(/1/g, 'I').replace(/0/g, 'O');
  t.equal('I und O werden verziehen', TG.code.toNumber(mitTippfehlern), seed);
  t.equal('L statt 1 wird verziehen', TG.code.toNumber(code.replace(/1/g, 'L')), seed);
  t.equal('Kleinschreibung wird verziehen', TG.code.toNumber(code.toLowerCase()), seed);
  t.equal('Bindestrich und Leerzeichen stören nicht', TG.code.toNumber(' ' + TG.code.format(code) + ' '), seed);

  t.equal('zu kurz ergibt nichts', TG.code.toNumber('AB1'), null);
  t.equal('leer ergibt nichts', TG.code.toNumber(''), null);
  t.equal('nur Sonderzeichen ergibt nichts', TG.code.toNumber('!!!!!!'), null);
  t.equal('Anzeigeform setzt den Bindestrich', TG.code.format('ABC123'), 'ABC-123');

  let alleEindeutig = true;
  const gesehen = {};
  for (let i = 0; i < 2000; i++) {
    const c = TG.code.fromNumber(i);
    if (gesehen[c]) alleEindeutig = false;
    gesehen[c] = true;
    if (TG.code.toNumber(c) !== i) alleEindeutig = false;
  }
  t.ok('2000 Startwerte ergeben 2000 verschiedene Codes, alle rückrechenbar', alleEindeutig);

  /* ---- Zufall mit Startwert ---- */
  const a = TG.rng(42);
  const b = TG.rng(42);
  const folgeA = [a(), a(), a(), a(), a()];
  const folgeB = [b(), b(), b(), b(), b()];
  t.equal('gleicher Startwert, gleiche Folge', folgeA, folgeB);
  t.ok('Werte liegen zwischen 0 und 1', folgeA.every((v) => v >= 0 && v < 1), folgeA);

  const c = TG.rng(43);
  t.ok('anderer Startwert, andere Folge', c() !== folgeA[0]);

  let alleRund = true;
  for (let i = 0; i < 300; i++) {
    const s = TG.randomSeed();
    if (!Number.isInteger(s) || s < 0 || s >= 0x2000000) alleRund = false;
    if (TG.code.toNumber(TG.code.fromNumber(s)) !== s) alleRund = false;
  }
  t.ok('300 zufällige Startwerte passen alle in einen Code und zurück', alleRund);

  /* ---- Mischen ---- */
  const liste = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const gemischt = TG.shuffle(liste, TG.rng(7));
  t.equal('Mischen behält alle Einträge', gemischt.slice().sort((x, y) => x - y), liste);
  t.ok('Mischen verändert die Reihenfolge', gemischt.join() !== liste.join(), gemischt.join());
  t.equal('Mischen lässt das Original in Ruhe', liste, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  t.equal('gleicher Startwert, gleiche Mischung',
    TG.shuffle(liste, TG.rng(7)), TG.shuffle(liste, TG.rng(7)));
  t.equal('leere Liste bleibt leer', TG.shuffle([], TG.rng(1)), []);

  /* Jeder Eintrag sollte über viele Durchläufe mal vorne landen. */
  const vorne = {};
  for (let i = 0; i < 500; i++) vorne[TG.shuffle(liste, TG.rng(i))[0]] = true;
  t.equal('jeder Eintrag kann vorne landen', Object.keys(vorne).length, 10);
};
