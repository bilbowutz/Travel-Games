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
  Flotte sieht. Beim Aufstellen liegt die Flotte schon fertig da: Schiff
  antippen, aufs Wasser tippen zum Verschieben, nochmal aufs Schiff zum
  Drehen – die übrigen Schiffe weichen von selbst aus.
- **Superhirn** – einer legt eine geheime Farbreihe, der andere knackt sie.
  Nach jedem Versuch gibt es Stifte: voll für richtige Farbe am richtigen
  Platz, hohl für richtige Farbe an falscher Stelle. Welcher Stift zu welcher
  Stelle gehört, wird nicht verraten.
- **Dame** – der Klassiker zu zweit auf einem Brett. Mit Schlagzwang,
  rückwärts schlagenden Steinen und fliegender Dame. Die ziehbaren Steine sind
  markiert, ein Mehrfachsprung zeigt am Zielfeld, wie viele dabei fallen.
- **Fotojagd** – einer geht außer Sichtweite und macht fünf Fotos von einer
  Stelle, der andere sucht sie. Gesucht wird zuerst nur mit Foto 1; jedes
  weitere Foto kostet einen Punkt. Die Bilder bleiben auf dem Gerät.
- **Begriffe erklären** – einer erklärt gegen die Uhr, der andere rät. Nur das
  Wort selbst darf nicht fallen. 393 Begriffe in drei Schwierigkeitsstufen,
  eigene lassen sich ergänzen. Auf die Uhr tippen hält die Zeit an.
- **Mäxchen** – würfeln, ansagen, bluffen. Nur wer dran ist, sieht den Wurf:
  das Handy übernimmt die Rolle des Würfelbechers.
- **Kniffel** – der Würfelklassiker für zwei bis sechs, alle auf einem Gerät.
  Das Blatt zeigt für jeden Wurf, was welches Feld bringen würde.
- **Malen und Raten** – eine Person zeichnet mit dem Finger, die anderen rufen.
- **Kritzelbild** – aus einer zufälligen Startform ein Bild machen. Alle bekommen
  dieselbe Form, danach vergleicht man. Geht auch allein.
- **Galgenmännchen** – Buchstaben raten, bevor die Rakete ohne dich startet.
  Allein gegen ein Zufallswort oder zu zweit mit selbst gedachtem Wort.
- **Käsekästchen** – Linien ziehen, Kästchen schließen, zu zweit auf einem Handy.
- **Erzählwürfel** – Symbole würfeln und daraus gemeinsam eine Geschichte bauen.
  Kooperativ, ohne Punkte und ohne Gewinner.

## Prüfen

```
node tests/run.js
```

747 Prüfungen über Regeln, Inhalte und Gerüst – ohne Installation, ohne
Browser, in unter einer Sekunde. Einzelheiten in [tests/README.md](tests/README.md).

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
  js/words.js               188 zeichenbare Hauptwörter in drei Stufen,
                            geteilt von Malen und Raten und Galgenmännchen
  js/sketch.js              Zeichenfläche: Striche in Bruchteilen der
                            Kantenlänge, dadurch in jeder Größe darstellbar
  js/dice.js                Würfelaugen im 3×3-Raster, gefärbt über currentColor
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
  superhirn/
    index.html              Spielseite
    game.css                Farbsteine, Verlauf, Ablage
    game.js                 Legen, Raten, Punkte, Speichern
    rules.js                Auswertung und Punktevergabe (getrennt testbar)
  dame/
    index.html              Spielseite
    game.css                Brett, Steine, Zielfelder
    game.js                 Auswahl, Züge, Rückgängig, Speichern
    rules.js                Regelwerk ohne Oberfläche (getrennt testbar)
  fotojagd/
    index.html              Spielseite
    game.css                Fotoplätze, Suchansicht, Vollbild
    game.js                 Phasen, Uhr, Punkte, Speichern
    rules.js                Punktevergabe (getrennt testbar)
    photos.js               Fotospeicher in IndexedDB samt Verkleinern
  begriffe-erklaeren/
    index.html              Spielseite
    game.css                Uhr, Begriffsanzeige, Rundenrückblick
    game.js                 Uhr, Züge, Punkte, eigene Begriffe, Speichern
    rules.js                Stapel und Punktezählung (getrennt testbar)
    words.js                393 Begriffe in drei Stufen
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
  malen-und-raten/
    index.html, game.css, game.js
                            Zeichenfläche, Uhr, Begriffskarte, Punkte
  galgenmaennchen/
    index.html, game.css, game.js
                            Rakete, Tastatur, Zwei-Personen-Modus
  kaesekaestchen/
    index.html, game.css, game.js
                            Linienraster und Punktestand
    rules.js                Regelwerk ohne Oberfläche (getrennt testbar)
  erzaehlwuerfel/
    index.html, game.css, game.js
                            Symbolwürfel und Satzanfänge
    symbols.js              59 bewusst mehrdeutige Symbole
  kritzelbild/
    index.html, game.css, game.js
                            Zeichenfläche mit Vorgabe und Galerie
    shapes.js               Zufallsformen aus einem Startwert (getrennt testbar)
  maexchen/
    index.html, game.css, game.js
                            Wurf, Ansage, Aufdecken, Leben
    rules.js                Rangfolge und Urteil (getrennt testbar)
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

**Begriffe** für Malen und Raten und Galgenmännchen stehen in
`assets/js/words.js`. Nur Hauptwörter, die sich zeichnen lassen – dann taugen
sie auch zum Raten. Wichtig beim Ergänzen: keine Leerzeichen und Bindestriche,
sonst stimmen die Buchstabenfelder im Galgenmännchen nicht.

**Mäxchen-Rangfolge** steht in `games/maexchen/rules.js`. Sie ist unintuitiv und
deshalb bewusst als Liste gepflegt: 31 bis 65 aufsteigend, darüber alle Päsche,
ganz oben das Mäxchen (21). Wer einen Pasch ansagt und nur 65 hat, hat geblufft.

**Superhirn-Farben** stehen oben in `games/superhirn/rules.js`. Jede trägt
neben Name und Farbwert ein eigenes Zeichen – wer Rot und Grün schlecht
unterscheidet, spielt sonst blind. `ink` sagt, ob das Zeichen hell oder dunkel
sein muss. Die Auswertung in `judge` zieht erst die vollen Stifte ab und prüft
nur den Rest auf hohle; wer es andersherum macht, zählt bei doppelten Farben zu
viele. Genau diesen Fall deckt `tests/superhirn.test.js` über alle 216×216
Paare ab.

**Dame-Hausregeln** stehen als Schalter oben in `games/dame/rules.js`, weil sie
jede Familie ein bisschen anders kennt. Voreingestellt ist die in Deutschland
übliche Variante: Schlagzwang, Steine schlagen auch rückwärts, die Dame zieht
und schlägt beliebig weit, und es gibt keinen Zwang zum längsten Schlag.
Zwei Feinheiten, über die man sich sonst streitet, sind ebenfalls festgelegt:
Geschlagene Steine bleiben bis zum Ende des Zuges liegen und versperren den Weg,
und wer beim Springen nur durch die Grundlinie zieht, wird keine Dame.

**Fotos der Fotojagd** liegen als einziges Spiel nicht im `localStorage`,
sondern in **IndexedDB** (`games/fotojagd/photos.js`). Der localStorage fasst je
nach Browser rund fünf Megabyte, und als Text abgelegt braucht ein Foto gut das
Doppelte seiner Dateigröße – ein einziges Handyfoto sprengt das. Jedes Bild wird
vorher auf 1280 px längste Kante und JPEG-Qualität 0,72 heruntergerechnet, aus
rund vier Megabyte werden so etwa 150 Kilobyte. Nach jeder Runde wird
aufgeräumt, hochgeladen wird nichts.

**Begriffe zum Erklären** stehen in `games/begriffe-erklaeren/words.js`, getrennt
nach `LEICHT`, `MITTEL` und `SCHWER`. Anders als die Wörter fürs Malen dürfen sie
abstrakt sein – erklären lässt sich mehr als zeichnen. Doppelte über die Stufen
hinweg vermeiden: die leichtere Stufe gewinnt. Eigene Begriffe tragen die
Spielenden selbst über die Einstellungen ein, sie liegen nur auf dem Gerät.

**Schiffe-versenken-Regeln** stehen in `games/schiffe-versenken/rules.js`,
bewusst getrennt von der Oberfläche. Dort liegen Flotte, Brettgröße und die
beiden Hausregeln: Schiffe dürfen sich nicht berühren, und nach einem Treffer
ist man nochmal dran.
