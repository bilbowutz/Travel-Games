/* Begriffe für Malen & Raten und Galgenmännchen.
   Nur Hauptwörter, die sich zeichnen lassen – dann taugen sie auch zum Raten.
   leicht: für kleine Kinder, mittel: Standard, schwer: für die Großen. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var LEICHT = [
    'Hund', 'Katze', 'Haus', 'Baum', 'Auto', 'Sonne', 'Mond', 'Stern', 'Blume', 'Fisch',
    'Ball', 'Buch', 'Stuhl', 'Tisch', 'Bett', 'Tür', 'Fenster', 'Apfel', 'Banane', 'Brot',
    'Kuchen', 'Eis', 'Milch', 'Ei', 'Hut', 'Schuh', 'Hose', 'Jacke', 'Brille', 'Uhr',
    'Schlüssel', 'Löffel', 'Gabel', 'Teller', 'Tasse', 'Kanne', 'Lampe', 'Bild', 'Ampel', 'Brücke',
    'Wolke', 'Regen', 'Schnee', 'Berg', 'See', 'Boot', 'Zug', 'Bus', 'Fahrrad', 'Flugzeug',
    'Kuh', 'Pferd', 'Schaf', 'Schwein', 'Huhn', 'Ente', 'Maus', 'Bär', 'Löwe', 'Elefant'
  ];

  var MITTEL = [
    'Tankstelle', 'Leuchtturm', 'Regenschirm', 'Schneemann', 'Gitarre', 'Klavier', 'Trommel', 'Geige',
    'Zahnbürste', 'Seifenblase', 'Drachen', 'Schaukel', 'Rutsche', 'Sandburg', 'Muschel', 'Krabbe',
    'Pinguin', 'Giraffe', 'Krokodil', 'Schildkröte', 'Eichhörnchen', 'Fledermaus', 'Schmetterling', 'Marienkäfer',
    'Feuerwehr', 'Krankenwagen', 'Hubschrauber', 'Traktor', 'Segelboot', 'Rakete', 'Ballon', 'Karussell',
    'Windmühle', 'Burg', 'Zelt', 'Iglu', 'Baumhaus', 'Scheune', 'Kirche', 'Bahnhof',
    'Koffer', 'Rucksack', 'Landkarte', 'Kompass', 'Fernglas', 'Taschenlampe', 'Angel', 'Schaufel',
    'Kürbis', 'Ananas', 'Erdbeere', 'Zitrone', 'Karotte', 'Pilz', 'Popcorn', 'Spaghetti',
    'Bleistift', 'Schere', 'Briefkasten', 'Ampelmann', 'Wecker', 'Kerze', 'Geschenk', 'Krone',
    'Zauberstab', 'Roboter', 'Gespenst', 'Skelett', 'Meerjungfrau', 'Ritter', 'Pirat', 'Clown'
  ];

  var SCHWER = [
    'Achterbahn', 'Riesenrad', 'Wasserfall', 'Regenbogen', 'Vulkan', 'Wüste', 'Gletscher', 'Höhle',
    'Fahrstuhl', 'Rolltreppe', 'Waschmaschine', 'Staubsauger', 'Kühlschrank', 'Mikrowelle', 'Nähmaschine', 'Schreibmaschine',
    'Sonnenblume', 'Kaktus', 'Bonsai', 'Tannenzapfen', 'Spinnennetz', 'Ameisenhaufen', 'Bienenstock', 'Vogelnest',
    'Trampolin', 'Skateboard', 'Schlittschuh', 'Fallschirm', 'Tauchermaske', 'Schwimmreifen', 'Hängematte', 'Wanderstock',
    'Dirigent', 'Astronaut', 'Taucher', 'Imker', 'Schornsteinfeger', 'Bäcker', 'Briefträger', 'Gärtner',
    'Schatzkarte', 'Sanduhr', 'Grammofon', 'Laterne', 'Marionette', 'Kaleidoskop', 'Windrad', 'Wetterhahn',
    'Doppeldecker', 'Heißluftballon', 'Lokomotive', 'Straßenbahn', 'Seilbahn', 'Bagger', 'Betonmischer', 'Müllabfuhr'
  ];

  TG.words = {
    leicht: LEICHT,
    mittel: MITTEL,
    schwer: SCHWER,
    /* Alle Begriffe einer Stufe und leichter – so bleibt "schwer" abwechslungsreich. */
    pool: function (level) {
      if (level === 'leicht') return LEICHT.slice();
      if (level === 'schwer') return LEICHT.concat(MITTEL, SCHWER);
      return LEICHT.concat(MITTEL);
    }
  };
})(window);
