/* Jede im Markup oder im Code vergebene Klasse braucht eine CSS-Regel.
   Diese Prüfung gab es, weil beim Ersetzen eines Blocks versehentlich die
   Regeln für .panel mit verschwunden sind – im Browser fällt das erst auf,
   wenn man genau diese Seite ansieht. */
'use strict';
const { projectFiles, read } = require('./harness.js');

exports.name = 'Stylesheets';

/* Klassen, die nur in Bruchstücken vorkommen oder gar keine sind. */
const KEINE_KLASSEN = new Set(['is-', 'kk-line--', 'setup', 'play', 'turn', 'over',
  'announce', 'resolve', 'shoot', 'hunt', 'judge', 'huntover', 'place']);

exports.run = function (t) {
  const css = projectFiles(['.css']).map(read).join('\n');
  const definiert = new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]));

  const benutzt = new Map();
  for (const datei of projectFiles(['.html', '.js'])) {
    if (datei === 'sw.js') continue;
    const quelle = read(datei);
    const merke = (text) => String(text).split(/\s+/).filter(Boolean).forEach((name) => {
      if (/^[a-z][\w-]*$/i.test(name) && !benutzt.has(name)) benutzt.set(name, datei);
    });

    [...quelle.matchAll(/class="([^"]*)"/g)].forEach((m) => merke(m[1]));
    [...quelle.matchAll(/className\s*=\s*'([^']*)'/g)].forEach((m) => merke(m[1]));
    [...quelle.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)].forEach((m) =>
      [...m[1].matchAll(/'([^']+)'/g)].forEach((q) => merke(q[1])));
    [...quelle.matchAll(/classes:\s*\[([^\]]*)\]/g)].forEach((m) =>
      [...m[1].matchAll(/'([^']+)'/g)].forEach((q) => merke(q[1])));
  }

  const ohneRegel = [...benutzt.keys()]
    .filter((name) => !definiert.has(name))
    .filter((name) => !KEINE_KLASSEN.has(name))
    .sort()
    .map((name) => `${name} (${benutzt.get(name)})`);

  t.equal('jede benutzte Klasse hat eine CSS-Regel', ohneRegel, []);
  t.ok('es wurden überhaupt Klassen gefunden', benutzt.size > 100, benutzt.size);
  t.ok('es wurden überhaupt Regeln gefunden', definiert.size > 100, definiert.size);

  /* Die Prüfung oben fragt nur, ob die Klasse irgendwo auftaucht – ein
     versehentlich gelöschter Regelblock rutscht dadurch durch, solange die
     Klasse noch in einem anderen Wähler steht (.panel überlebt in .panel h2).
     Für die Grundpfeiler wird deshalb die tragende Eigenschaft selbst geprüft. */
  /* Kommentare stören die Wähler-Suche, also vorher raus. */
  const ohneKommentare = css.replace(/\/\*[\s\S]*?\*\//g, '');

  function eigenschaftVon(name, eigenschaft) {
    const wähler = new RegExp('(?<![\\w.-])\\.' + name + '(?![\\w-])[^{}]*\\{([^}]*)\\}', 'g');
    for (const treffer of ohneKommentare.matchAll(wähler)) {
      const wert = new RegExp('(?:^|;)\\s*' + eigenschaft + '\\s*:\\s*([^;]+)').exec(treffer[1]);
      if (wert) return wert[1].trim();
    }
    return null;
  }

  const TRAGEND = [
    ['btn', 'min-height'],
    ['btn', 'border-radius'],
    ['panel', 'background'],
    ['panel', 'border-radius'],
    ['actionbar', 'position'],
    ['curtain', 'position'],
    ['toast-host', 'position'],
    ['game-main', 'padding-bottom'],
    ['list-group', 'background'],
    ['segmented', 'display'],
    ['name-row', 'display'],
    ['hero', 'padding-top'],
    ['sheet', 'padding'],
    ['status', 'display']
  ];

  TRAGEND.forEach(([name, eigenschaft]) => {
    t.ok(`.${name} setzt ${eigenschaft}`, eigenschaftVon(name, eigenschaft) !== null);
  });

  /* Die Knopfleiste muss fest am unteren Rand kleben, sonst scrollt sie weg. */
  t.equal('.actionbar klebt unten', eigenschaftVon('actionbar', 'position'), 'fixed');
  t.equal('.curtain liegt über allem', eigenschaftVon('curtain', 'position'), 'fixed');
  /* Der Hauptbereich braucht unten Platz, sonst verdeckt die Leiste den Inhalt. */
  t.ok('.game-main lässt Platz für die Leiste',
    /96px|var\(/.test(eigenschaftVon('game-main', 'padding-bottom') || ''),
    eigenschaftVon('game-main', 'padding-bottom'));

  /* Jede Spielfarbe sollte im Dunkelmodus noch einmal gesetzt werden. */
  for (const datei of projectFiles(['.css'])) {
    if (!datei.startsWith('games/')) continue;
    const quelle = read(datei);
    if (!/:root\s*{/.test(quelle)) continue;
    t.ok(`${datei}: kennt den Dunkelmodus über die Einstellung`,
      quelle.includes('[data-theme="dark"]'));
    t.ok(`${datei}: kennt den Dunkelmodus des Systems`,
      quelle.includes('prefers-color-scheme: dark'));
  }

  /* Das Gerüst versteckt über [hidden] – das muss !important sein, sonst
     gewinnt ein display:flex und zwei Knopfleisten stehen übereinander. */
  const basis = read('assets/css/base.css');
  t.ok('[hidden] setzt sich durch', /\[hidden\][^{]*{[^}]*display:\s*none\s*!important/.test(basis));
};
