# Travel Games 🚙

Kleine Reisespiele fürs Handy. Statische Website – **kein Backend, keine Anmeldung,
keine Cookies**. Spielstände liegen ausschließlich im `localStorage` des Browsers.

**Spiele**

- **Auto Bingo** – Kacheln abhaken, was man unterwegs sieht (Flugzeug, Tankstelle,
  Hund, Traktor …). Eine volle Reihe, Spalte oder Diagonale = Bingo.
- **Wer würde eher …?** – 124 Fragen, alle zeigen gleichzeitig auf eine Person,
  die Mehrheit bekommt den Punkt.
- **Farben-Rennen** – jede:r bekommt eine Autofarbe zugelost und tippt mit,
  wer zuerst das Ziel erreicht, gewinnt die Runde.
- **Schiffe versenken** – zu zweit auf einem Handy, abwechselnd. Zwischen den
  Zügen schiebt sich ein Sichtschutz davor, damit niemand die gegnerische
  Flotte sieht.
- **Kniffel** – der Würfelklassiker für zwei bis sechs, alle auf einem Gerät.
  Das Blatt zeigt für jeden Wurf, was welches Feld bringen würde.

## Features

- 📱 Mobile-first, Tap-Ziele ≥ 44 px, funktioniert ab 320 px Breite
- 🔗 Kurzer Code pro Runde: gleicher Code = gleiches Brett bzw. gleiche Fragen
- 📷 QR-Code zum Abscannen, selbst erzeugt und damit auch offline verfügbar
- 💾 Nur `localStorage` – Spielstand und Punkte bleiben nach dem Schließen erhalten
- 📴 Offline spielbar über einen Service Worker (ideal im Funkloch)
- 🏠 Als PWA installierbar („Zum Home-Bildschirm hinzufügen")
- 🌗 Hell/Dunkel/Automatisch, folgt auf Wunsch dem System
- 🍎 Oberfläche im iOS-Stil: Systemfarben, große Überschriften,
  gruppierte Listen mit Haarlinien statt bunter Karten
- 🎉 Konfetti, Haptik und Fortschrittsanzeige
- ⚙️ Keine Abhängigkeiten, kein Build-Schritt – reines HTML/CSS/JS

## Gemeinsam spielen: der Code

Ohne Server gibt es kein Live-Sync – ein Häkchen auf einem Handy kann nicht auf
einem anderen auftauchen. Geteilt wird deshalb nicht der Spielstand, sondern der
**Startwert**: aus ihm berechnet jedes Gerät dasselbe Brett bzw. dieselbe
Fragenreihenfolge.

- Der Code steht in den Einstellungen jedes Spiels, z. B. `K7M-2XQ`.
- „Teilen" verschickt Code und Link (`…/games/auto-bingo/#c=K7M2XQ`).
  Wer den Link öffnet, landet direkt in derselben Runde.
- „QR-Code zeigen" öffnet denselben Link als QR-Code: das andere Handy hält
  einfach die Kamera drauf. Praktisch im Auto, wo niemand Links tippen mag.
- Eingetippte Codes dürfen klein geschrieben sein, Bindestriche sind egal, und
  `I`, `L`, `O` werden als `1`, `1`, `0` gelesen – Vertipper beim Vorlesen fallen
  damit nicht auf.
- Abgehakt bzw. gezählt wird auf jedem Gerät selbst. Zum Vergleichen gibt es
  „Ergebnis teilen" bzw. „Punktestand teilen" – ein Text fürs Familienchat.

Technisch: `TG.rng(seed)` (Mulberry32) liefert eine reproduzierbare Zufallsfolge,
`TG.code` wandelt Startwerte in Crockford-Base32 und zurück, `TG.showQrDialog(url)`
zeigt einen Link als QR-Code. Alles steht in `assets/js/app.js` bzw.
`assets/js/qr.js` und damit jedem Spiel zur Verfügung.

Der QR-Encoder (`assets/js/qr.js`) ist bewusst selbst geschrieben statt aus einem
CDN geladen: die Seite soll offline funktionieren und keine fremden Skripte
nachladen. Er beherrscht den Byte-Modus mit Fehlerkorrektur L und M in den
Versionen 1 bis 10, also Links bis etwa 200 Zeichen.

Ein Code bleibt gültig, solange sich der Motiv- bzw. Fragenpool nicht ändert.
Kommen später Einträge dazu, ergibt derselbe Code ein anderes Brett – deshalb
trägt das Fragendeck eine `version`.

## GitHub Pages einrichten

1. Im Repository: **Settings → Pages**
2. *Source*: **Deploy from a branch**
3. Branch: `main`, Ordner: **`/ (root)`**
4. Speichern – nach ein bis zwei Minuten liegt die Seite unter
   `https://<benutzername>.github.io/Travel-Games/`

Alle Pfade sind relativ, die Seite funktioniert deshalb sowohl im Unterordner
(`/Travel-Games/`) als auch auf einer eigenen Domain. `.nojekyll` verhindert,
dass GitHub die Dateien durch Jekyll schickt.

## Lokal ausprobieren

```bash
python3 -m http.server 8000
# http://localhost:8000 öffnen
```

Ein Webserver ist nötig, weil der Service Worker über `file://` nicht läuft –
gespielt werden kann aber auch, wenn man `index.html` direkt öffnet.

## Aufbau

```
index.html                  Startseite mit den Spiele-Kacheln
manifest.webmanifest        PWA-Manifest
sw.js                       Service Worker (Offline-Cache)
assets/
  css/base.css              Design-System: Farbtokens (Apples Systempalette),
                            Buttons, gruppierte Listen, Statuszeile,
                            Aktionsleiste, Bottom-Sheets, Code-Anzeige, Toasts
  js/app.js                 Speicher, Farbschema, Toasts, Haptik,
                            Seed-Zufall, Codes, Teilen
  js/games.js               Katalog aller Spiele (Quelle der Startseiten-Kacheln)
  js/nameEditor             (in app.js) Namensliste, von mehreren Spielen genutzt
  js/confetti.js            Konfetti auf Canvas
  js/qr.js                  QR-Encoder (Byte-Modus, Level L/M, Version 1–10)
  img/                      Icons (Favicon, PWA, Apple Touch)
games/
  auto-bingo/
    index.html              Spielseite
    bingo.css               Spielbrett
    bingo.js                Spiellogik, Bingo-Erkennung, Code, Speichern
    items.js                Motivpool (56 Motive, "|" markiert Trennstellen)
  wer-wuerde-eher/
    index.html              Spielseite
    game.css                Fragekarte, Namensbuttons, Punktestand
    game.js                 Spiellogik, Punkte, Code, Speichern
    questions.js            Fragendeck (124 Fragen)
  farben-rennen/
    index.html              Spielseite
    game.css                Farbkacheln, Punktestand
    game.js                 Spiellogik, Zähler, Rückgängig, Code, Speichern
    colors.js               Autofarben mit passender Schriftfarbe
  schiffe-versenken/
    index.html              Spielseite
    game.css                Spielraster, Sichtschutz
    game.js                 Phasen, Aufstellen, Schießen, Speichern
    rules.js                Regelwerk ohne Oberfläche (getrennt testbar)
  kniffel/
    index.html              Spielseite
    game.css                Würfel, Blatt, Endstand
    game.js                 Züge, Würfeln, Halten, Eintragen, Speichern
    scoring.js              Wertung ohne Oberfläche (getrennt testbar)
```

## Ein neues Spiel ergänzen

1. Ordner `games/<spiel-id>/` mit `index.html` anlegen –
   `assets/css/base.css` und `assets/js/app.js` einbinden, dann stehen
   Design-System, Speicher, Farbschema, Toasts, Seed-Zufall und Codes bereit.
2. Eintrag in `assets/js/games.js` ergänzen und `status` auf `'ready'` setzen.
3. Die neuen Dateien in die `PRECACHE`-Liste in `sw.js` aufnehmen und
   die `CACHE`-Version hochzählen, damit die Offline-Kopie aktualisiert wird.

Für Spiele mit Mitspielerliste gibt es `TG.nameEditor(listenElement, optionen)` –
das baut die Namensfelder samt Hinzufügen und Entfernen und liefert mit
`.values()` die getrimmten Namen zurück.

## Inhalte anpassen

**Auto-Bingo-Motive** stehen in `games/auto-bingo/items.js`:

```js
{ id: 'tankstelle', emoji: '⛽', label: 'Tank|stelle' }
```

- `rare: true` markiert seltene Funde – davon landet nur rund ein Viertel
  der Kacheln auf einem Brett.
- Das `|` im Label ist eine erlaubte Trennstelle. Daraus wird ein weiches
  Trennzeichen, damit lange Wörter auf schmalen Displays sauber umbrechen.

**Fragen** stehen in `games/wer-wuerde-eher/questions.js`, jeweils ohne den
Anfang „Wer würde eher" und ohne Fragezeichen – beides setzt das Spiel selbst.
Beim Ergänzen die `version` hochzählen.

**Autofarben** stehen in `games/farben-rennen/colors.js`. `ink` sagt, ob auf der
Fläche helle oder dunkle Schrift lesbar ist – bei neuen Farben mitpflegen.

**Kniffel-Wertung** steht in `games/kniffel/scoring.js`. Gespielt wird mit
oberem Bonus ab 63 Punkten und 100 Extrapunkten für jeden weiteren Kniffel;
das Feld darf danach frei gewählt werden.

**Schiffe-versenken-Regeln** stehen in `games/schiffe-versenken/rules.js`,
bewusst getrennt von der Oberfläche. Dort liegen Flotte, Brettgröße und die
beiden Hausregeln: Schiffe dürfen sich nicht berühren, und nach einem Treffer
ist man nochmal dran.
