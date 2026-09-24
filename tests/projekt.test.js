/* Prüfungen über das ganze Projekt, keine Spielregeln.
   Die Liste im Service Worker wird von Hand gepflegt – genau hier ist schon
   ein Symbol durchgerutscht, das im Manifest steht, aber nie gecacht wurde. */
'use strict';
const path = require('path');
const fs = require('fs');
const { load, read, projectFiles, ROOT } = require('./harness.js');

exports.name = 'Projekt';

exports.run = function (t) {
  const sw = read('sw.js');
  const gecacht = new Set((sw.match(/'\.\/([^']*)'/g) || []).map((s) => s.slice(3, -1)));
  const ausgeliefert = projectFiles(['.html', '.css', '.js', '.svg', '.png', '.webmanifest'])
    .filter((f) => f !== 'sw.js');

  /* ---- Offline-Cache ---- */
  const fehlend = ausgeliefert.filter((f) => !gecacht.has(f));
  t.equal('jede ausgelieferte Datei steht im Offline-Cache', fehlend, []);

  const karteileichen = [...gecacht]
    .filter((f) => f && !f.endsWith('/'))
    .filter((f) => !fs.existsSync(path.join(ROOT, f)));
  t.equal('nichts im Cache, das es nicht gibt', karteileichen, []);

  t.ok('der Cache trägt eine Version', /const CACHE = 'travel-games-v\d+'/.test(sw), sw.split('\n')[2]);

  /* Alle Symbole aus dem Manifest müssen auch wirklich daliegen. */
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const fehlendeSymbole = manifest.icons
    .map((icon) => icon.src)
    .filter((src) => !fs.existsSync(path.join(ROOT, src)));
  t.equal('alle Symbole aus dem Manifest liegen vor', fehlendeSymbole, []);
  const ungecachteSymbole = manifest.icons.map((i) => i.src).filter((src) => !gecacht.has(src));
  t.equal('alle Symbole aus dem Manifest sind gecacht', ungecachteSymbole, []);
  t.ok('ein maskierbares Symbol für Android ist dabei',
    manifest.icons.some((i) => i.purpose === 'maskable'));

  /* ---- Katalog und Spielordner ---- */
  const TG = load('assets/js/games.js');
  const spiele = TG.games;
  t.ok('der Katalog ist nicht leer', spiele.length > 0);

  const ordner = fs.readdirSync(path.join(ROOT, 'games'), { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const imKatalog = spiele.map((g) => g.id).sort();
  t.equal('jeder Spielordner steht im Katalog und umgekehrt', imKatalog, ordner);

  spiele.forEach((spiel) => {
    t.ok(`${spiel.id}: hat eine Seite`, fs.existsSync(path.join(ROOT, 'games', spiel.id, 'index.html')));
    t.ok(`${spiel.id}: Verweis zeigt auf den Ordner`, spiel.href === `games/${spiel.id}/`, spiel.href);
    t.ok(`${spiel.id}: hat einen Namen`, typeof spiel.name === 'string' && spiel.name.length > 1);
    t.ok(`${spiel.id}: hat eine Beschreibung`, typeof spiel.description === 'string' && spiel.description.length > 8);
    t.ok(`${spiel.id}: hat ein Symbol`, typeof spiel.emoji === 'string' && spiel.emoji.length > 0);
    /* Platzhalter-Kacheln sollen gar nicht erst im Katalog stehen. */
    t.equal(`${spiel.id}: ist spielbar`, spiel.status, 'ready');
    t.ok(`${spiel.id}: Ordner ist gecacht`, gecacht.has(`games/${spiel.id}/`));
  });

  const namen = spiele.map((g) => g.name);
  t.equal('keine doppelten Spielnamen', namen.length, new Set(namen).size);

  /* ---- Jede Spielseite bindet ein, was sie braucht ---- */
  spiele.forEach((spiel) => {
    const seite = read(`games/${spiel.id}/index.html`);
    const dateien = fs.readdirSync(path.join(ROOT, 'games', spiel.id));

    t.ok(`${spiel.id}: bindet app.js ein`, seite.includes('assets/js/app.js'));
    t.ok(`${spiel.id}: bindet das eigene Stylesheet ein`, /href="[^"]*\.css"/.test(seite));
    t.ok(`${spiel.id}: hat einen Titel`, /<title>[^<]{5,}<\/title>/.test(seite));
    t.ok(`${spiel.id}: hat eine Beschreibung für die Vorschau`, /name="description"/.test(seite));
    t.ok(`${spiel.id}: setzt das Viewport-Meta`, /name="viewport"/.test(seite));
    t.ok(`${spiel.id}: verweist aufs Manifest`, seite.includes('manifest.webmanifest'));
    t.ok(`${spiel.id}: hat den Zurück-Verweis`, seite.includes('class="back-link"'));
    t.ok(`${spiel.id}: erklärt die Regeln`, seite.includes('class="rules"'));
    t.ok(`${spiel.id}: hat einen Platz für Meldungen`, seite.includes('toast-host'));

    /* Jede Datei im Ordner muss auch eingebunden sein – sonst liegt sie tot herum. */
    dateien.filter((f) => f.endsWith('.js') || f.endsWith('.css')).forEach((datei) => {
      t.ok(`${spiel.id}: ${datei} ist eingebunden`, seite.includes(datei), datei);
    });
  });

  /* ---- Startseite ---- */
  const start = read('index.html');
  t.ok('die Startseite lädt den Katalog', start.includes('assets/js/games.js'));
  t.ok('die Startseite meldet den Service Worker an',
    start.includes('registerServiceWorker') || read('assets/js/app.js').includes('registerServiceWorker'));
};
