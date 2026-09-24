# Travel Games

Kleine Reisespiele fürs Handy. Statische Website, **kein Backend, kein
Build-Schritt, keine Fremdbibliotheken**. Liegt auf GitHub Pages.

## Vor jeder Abgabe

```
node tests/run.js
```

## Wie hier gearbeitet wird

- **Alles direkt auf `main`.** So will es der Besitzer des Repos.
- **Kommentare und Oberfläche auf Deutsch.** Auch Commit-Nachrichten.
- **Kein npm, kein Bundler.** Was nicht als einzelne Datei ins `<script>` passt,
  gehört nicht ins Projekt. Auch QR-Codes und Konfetti sind selbst geschrieben.
- **ES5-Stil im Spielcode** (`var`, `function`), passend zum Bestand. In
  `tests/` darf moderneres JavaScript stehen, das läuft nur in Node.

## Aufbau

- `assets/js/app.js` – alles Geteilte unter `window.TG`: Speicher, Farbschema,
  Symbole, Zufall mit Startwert, Rundencodes, Namensliste, Meldungen.
- `assets/css/base.css` – das Gerüst im iOS-Stil. Farben als Variablen auf
  `:root`, für den Dunkelmodus zweimal überschrieben: einmal unter
  `[data-theme="dark"]`, einmal unter `prefers-color-scheme`.
- `assets/js/games.js` – der Katalog. Die Startseite baut ihre Liste daraus.
- `games/<id>/` – je `index.html`, `game.css`, `game.js` und, wo es sich lohnt,
  `rules.js` mit dem Regelwerk **ohne Oberfläche**.

## Regeln von der Oberfläche trennen

Alles, was sich ohne Browser nachrechnen lässt, gehört in eine eigene Datei
(`rules.js`, `scoring.js`, `items.js`, `words.js`). Nur so lässt es sich prüfen –
und nur deshalb gibt es überhaupt eine Testsuite. Hausregeln stehen als benannte
Schalter oben in der Datei, mit einem Satz dazu, warum sie so sind.

## Ein neues Spiel

1. `games/<id>/` anlegen, eine bestehende Seite als Vorlage nehmen.
2. Im Katalog `assets/js/games.js` eintragen.
3. **Alle neuen Dateien in `sw.js` eintragen und `CACHE` hochzählen.** Wird das
   vergessen, fehlt das Spiel im Funkloch. `projekt.test.js` merkt es.
4. Eine Prüfung in `tests/` dazuschreiben.
5. README ergänzen: Spielbeschreibung, Dateibaum, und falls es Inhalte zum
   Pflegen gibt, ein Absatz unter „Inhalte anpassen".

## Worauf es beim Bauen ankommt

- **Ab 320 px Breite** muss alles passen, ohne waagerechtes Scrollen.
- **Tap-Ziele mindestens 44 px.**
- Wird das Handy weitergereicht und darf der andere nichts sehen, kommt der
  Sichtschutz (`.curtain`) davor – und der Inhalt wird aus dem DOM genommen,
  nicht nur überdeckt.
- Fehlermeldungen nicht stapeln. `TG.toast` fasst gleiche Texte zusammen und
  zeigt höchstens zwei; wiederkehrende Hinweise gehören ohnehin in eine feste
  Zeile, nicht in ein Popup.
- Spielstände in den `localStorage`, mit Versionsnummer und einer Prüfung beim
  Laden. Ein kaputter Stand muss sauber im Setup landen, nicht abstürzen.
  Große Binärdaten gehören in IndexedDB (siehe `games/fotojagd/photos.js`).
- Uhren rechnen aus einem Ablaufzeitpunkt, nicht aus gezählten Ticks – sonst
  stimmen sie nicht mehr, wenn das Display zwischendurch aus war.
