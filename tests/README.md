# Prüfungen

```
node tests/run.js            # alles
node tests/run.js dame       # nur, was auf "dame" passt
```

Kein Installieren nötig, keine Fremdbibliotheken, kein Browser – reines Node.
Der ganze Durchlauf dauert unter einer Sekunde.

## Was hier geprüft wird

Die Spiele laufen im Browser, ihre **Regeln** liegen aber bewusst in eigenen
Dateien ohne Oberfläche (`rules.js`, `scoring.js`, die Inhaltslisten). Genau die
lassen sich hier direkt laden und durchrechnen. Für `app.js`, das ein Dokument
erwartet, stellt `harness.js` eine Attrappe bereit, die gerade genug kann.

| Datei | Inhalt |
| --- | --- |
| `geteilt.test.js` | Rundencodes, Zufall mit Startwert, Mischen |
| `qr.test.js` | Suchmuster, Taktzeile und Größen des eigenen QR-Erzeugers |
| `superhirn.test.js` | Auswertung über alle 216×216 Paare, doppelte Farben |
| `dame.test.js` | Hausregeln an gestellten Diagrammen, dazu 300 Zufallspartien |
| `schiffe-versenken.test.js` | Aufstellung, Abstandsregel, Schüsse, Versenken |
| `maexchen.test.js` | die unintuitive Rangfolge und das Urteil beim Aufdecken |
| `kniffel.test.js` | jede Wertung einzeln, Bonus, Zusatz-Kniffel |
| `kaesekaestchen.test.js` | Linien, Kästchen, Extrazug, volles Brett |
| `begriffe.test.js` | Stapel, eigene Begriffe, Punkte |
| `fotojagd.test.js` | Punkteverfall je aufgedecktem Foto, Zeitangabe |
| `inhalte.test.js` | Motive, Fragen, Farben, Wortlisten – vor allem auf Doppler |
| `projekt.test.js` | Offline-Cache, Katalog, jede Spielseite |
| `styles.test.js` | jede benutzte Klasse hat eine Regel, tragende Eigenschaften |

## Warum gerade diese

Jede Prüfung steht für einen Fehler, der wirklich passiert ist:

- Bei **Dame** lief die Suche nach Schlagfolgen im Kreis, weil das Kopieren des
  Bretts die Markierung „schon genommen" verlor. Im Browser friert das die Seite
  ein. Gefunden hat es der Dauerlauf über 300 Zufallspartien.
- Im **Offline-Cache** fehlte `icon-maskable-512.png`, obwohl es im Manifest
  steht. Die Liste im Service Worker wird von Hand gepflegt.
- Beim Umbauen einer CSS-Datei verschwanden versehentlich die Regeln für
  `.panel`. Deshalb prüft `styles.test.js` nicht nur, ob eine Klasse irgendwo
  auftaucht, sondern ob die tragende Eigenschaft wirklich gesetzt ist.
- In **Mäxchen** hatte ich die Rangfolge selbst falsch im Kopf: einen Pasch
  anzusagen und nur 65 zu haben *ist* ein Bluff.

Neue Prüfung: eine Datei `tests/<name>.test.js` anlegen, die
`exports.name` und `exports.run = function (t) { … }` setzt. `t.ok`, `t.equal`,
`t.near` und `t.throws` stehen bereit, `load('pfad/zur/datei.js')` lädt
Projektdateien in eine frische Umgebung.

## Was hier *nicht* geprüft wird

Alles, wofür man einen echten Browser braucht: Tippen, Wischen, Darstellung,
Speichern, Kamera. Dafür gibt es keine Einrichtung im Repo – das lief bisher
von Hand mit Playwright. Die Regeln, die Inhalte und das Gerüst sind aber
abgedeckt, und da stecken die Fehler, die man am schwersten sieht.
