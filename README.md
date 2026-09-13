# Travel Games 🚙

Kleine Reisespiele fürs Handy. Statische Website – **kein Backend, keine Anmeldung,
keine Cookies**. Der Spielstand liegt ausschließlich im `localStorage` des Browsers.

Erstes Spiel: **Auto Bingo** – Kacheln abhaken, was man unterwegs sieht
(Flugzeug, Tankstelle, Hund, Traktor …). Eine volle Reihe, Spalte oder Diagonale = Bingo.

## Features

- 📱 Mobile-first, Tap-Ziele ≥ 44 px, funktioniert ab 320 px Breite
- 💾 Nur `localStorage` – Spielstand und Statistik bleiben nach dem Schließen erhalten
- 📴 Offline spielbar über einen Service Worker (ideal im Funkloch)
- 🏠 Als PWA installierbar („Zum Home-Bildschirm hinzufügen")
- 🌗 Hell/Dunkel/Automatisch, folgt auf Wunsch dem System
- 🎯 Brettgrößen 3 × 3, 4 × 4 und 5 × 5 (mit Joker in der Mitte)
- 🎉 Konfetti, Haptik und Fortschrittsanzeige
- ⚙️ Keine Abhängigkeiten, kein Build-Schritt – reines HTML/CSS/JS

## GitHub Pages einrichten

1. Im Repository: **Settings → Pages**
2. *Source*: **Deploy from a branch**
3. Branch: `main` (oder der gewünschte Branch), Ordner: **`/ (root)`**
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
  css/base.css              Design-System: Farbtokens, Buttons, Kacheln, Toasts
  js/app.js                 Speicher, Farbschema, Toasts, Haptik, Zufall
  js/games.js               Katalog aller Spiele (Quelle der Startseiten-Kacheln)
  img/                      Icons (Favicon, PWA, Apple Touch)
games/
  auto-bingo/
    index.html              Spielseite
    bingo.css               Spielbrett und Bottom-Sheet
    bingo.js                Spiellogik, Bingo-Erkennung, Speichern
    items.js                Motivpool (56 Motive, "|" markiert Trennstellen)
    confetti.js             Konfetti auf Canvas
```

## Ein neues Spiel ergänzen

1. Ordner `games/<spiel-id>/` mit `index.html` anlegen –
   `assets/css/base.css` und `assets/js/app.js` einbinden, dann steht das
   Design-System inklusive Speicher, Farbschema und Toasts bereit.
2. Eintrag in `assets/js/games.js` ergänzen und `status` auf `'ready'` setzen.
3. Die neuen Dateien in die `PRECACHE`-Liste in `sw.js` aufnehmen und
   die `CACHE`-Version hochzählen, damit die Offline-Kopie aktualisiert wird.

Auf der Startseite sind bereits drei weitere Spiele als „Bald" vorgemerkt:
Kennzeichen-Jagd, Farben-Rennen und „Ich packe meinen Koffer".

## Motive fürs Auto Bingo anpassen

Alles steht in `games/auto-bingo/items.js`. Ein Eintrag sieht so aus:

```js
{ id: 'tankstelle', emoji: '⛽', label: 'Tank|stelle' }
```

- `rare: true` markiert seltene Funde – davon landet nur rund ein Viertel
  der Kacheln auf einem Brett.
- Das `|` im Label ist eine erlaubte Trennstelle. Daraus wird ein weiches
  Trennzeichen, damit lange Wörter auf schmalen Displays sauber umbrechen.
