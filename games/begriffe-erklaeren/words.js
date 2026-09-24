/* Begriffe zum Erklären. Anders als die Wörter fürs Malen dürfen sie hier
   auch abstrakt sein – erklären lässt sich schließlich mehr als zeichnen.
   leicht: auch für Kinder, mittel: der Normalfall, schwer: für Fortgeschrittene. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var LEICHT = [
    'Hund', 'Katze', 'Pferd', 'Kuh', 'Schwein', 'Schaf', 'Huhn', 'Ente',
    'Maus', 'Bär', 'Löwe', 'Elefant', 'Affe', 'Giraffe', 'Pinguin', 'Fisch',
    'Vogel', 'Biene', 'Spinne', 'Frosch', 'Apfel', 'Banane', 'Brot', 'Käse',
    'Milch', 'Ei', 'Kuchen', 'Eis', 'Schokolade', 'Pizza', 'Nudeln', 'Suppe',
    'Salat', 'Wurst', 'Zucker', 'Salz', 'Honig', 'Kaffee', 'Tee', 'Butter',
    'Haus', 'Tür', 'Fenster', 'Treppe', 'Küche', 'Bett', 'Stuhl', 'Tisch',
    'Lampe', 'Teppich', 'Spiegel', 'Badewanne', 'Dusche', 'Seife', 'Handtuch', 'Zahnbürste',
    'Kamm', 'Schere', 'Löffel', 'Gabel', 'Messer', 'Teller', 'Tasse', 'Topf',
    'Kühlschrank', 'Hose', 'Jacke', 'Schuh', 'Mütze', 'Schal', 'Handschuh', 'Brille',
    'Socke', 'Kleid', 'Hemd', 'Baum', 'Blume', 'Gras', 'Wald', 'Berg',
    'See', 'Fluss', 'Strand', 'Sand', 'Stein', 'Sonne', 'Mond', 'Stern',
    'Wolke', 'Regen', 'Schnee', 'Wind', 'Feuer', 'Auto', 'Bus', 'Zug',
    'Fahrrad', 'Flugzeug', 'Schiff', 'Ampel', 'Straße', 'Brücke', 'Tunnel', 'Parkplatz',
    'Ball', 'Buch', 'Uhr', 'Schlüssel', 'Geld', 'Telefon', 'Stift', 'Papier',
    'Tasche', 'Koffer', 'Geschenk', 'Luftballon', 'Puppe', 'Schule', 'Lehrer', 'Tafel',
    'Rucksack', 'Hausaufgabe', 'Geburtstag', 'Weihnachten', 'Arzt', 'Krankenhaus', 'Polizei', 'Feuerwehr',
    'Supermarkt', 'Bäckerei', 'Zoo', 'Garten'
  ];

  var MITTEL = [
    'Tankstelle', 'Leuchtturm', 'Regenschirm', 'Schneemann', 'Gitarre', 'Klavier', 'Trommel', 'Geige',
    'Seifenblase', 'Schaukel', 'Rutsche', 'Sandburg', 'Muschel', 'Krokodil', 'Schildkröte', 'Eichhörnchen',
    'Fledermaus', 'Schmetterling', 'Marienkäfer', 'Regenbogen', 'Wasserfall', 'Vulkan', 'Wüste', 'Insel',
    'Höhle', 'Gletscher', 'Sternschnuppe', 'Nebel', 'Gewitter', 'Blitz', 'Staubsauger', 'Waschmaschine',
    'Mikrowelle', 'Bügeleisen', 'Taschenlampe', 'Feuerzeug', 'Wecker', 'Fernbedienung', 'Kopfhörer', 'Ladekabel',
    'Steckdose', 'Glühbirne', 'Batterie', 'Hammer', 'Schraube', 'Leiter', 'Besen', 'Gießkanne',
    'Rasenmäher', 'Bahnhof', 'Flughafen', 'Autobahn', 'Stau', 'Baustelle', 'Kreisverkehr', 'Fahrkarte',
    'Reisepass', 'Landkarte', 'Kompass', 'Zelt', 'Schlafsack', 'Lagerfeuer', 'Fernglas', 'Sonnencreme',
    'Liegestuhl', 'Hängematte', 'Wanderweg', 'Zahnarzt', 'Briefträger', 'Bäcker', 'Friseur', 'Kellner',
    'Pilot', 'Kapitän', 'Astronaut', 'Detektiv', 'Zauberer', 'Clown', 'Ritter', 'Pirat',
    'Wikinger', 'Dinosaurier', 'Drache', 'Roboter', 'Gespenst', 'Hexe', 'Riese', 'Zwerg',
    'Fußballplatz', 'Schwimmbad', 'Turnhalle', 'Skilift', 'Trampolin', 'Achterbahn', 'Karussell', 'Zirkus',
    'Kino', 'Theater', 'Museum', 'Bibliothek', 'Kirche', 'Schloss', 'Burg', 'Turm',
    'Windmühle', 'Scheune', 'Bauernhof', 'Markt', 'Frühstück', 'Picknick', 'Grillen', 'Rezept',
    'Backofen', 'Einkaufsliste', 'Pfannkuchen', 'Spiegelei', 'Popcorn', 'Marmelade', 'Senf', 'Kaugummi',
    'Limonade', 'Nachtisch', 'Wasserhahn', 'Regenwurm', 'Ameise', 'Igel', 'Fuchs', 'Reh',
    'Wildschwein', 'Eule', 'Storch', 'Möwe', 'Hai', 'Wal', 'Delfin', 'Qualle',
    'Seestern', 'Papagei', 'Kamel', 'Zebra', 'Nilpferd', 'Känguru', 'Faultier', 'Schnecke',
    'Libelle'
  ];

  var SCHWER = [
    'Heimweh', 'Fernweh', 'Langeweile', 'Vorfreude', 'Schadenfreude', 'Neugier', 'Geduld', 'Mut',
    'Stolz', 'Neid', 'Heimat', 'Freundschaft', 'Vertrauen', 'Ehrlichkeit', 'Gerechtigkeit', 'Freiheit',
    'Frieden', 'Zufall', 'Schicksal', 'Erinnerung', 'Gedanke', 'Geheimnis', 'Überraschung', 'Missverständnis',
    'Ausrede', 'Kompromiss', 'Versöhnung', 'Vorurteil', 'Schwerkraft', 'Elektrizität', 'Magnet', 'Schatten',
    'Echo', 'Spiegelbild', 'Horizont', 'Ebbe', 'Jahreszeit', 'Zeitzone', 'Schaltjahr', 'Sonnenfinsternis',
    'Schwerelosigkeit', 'Temperatur', 'Geschwindigkeit', 'Entfernung', 'Lautstärke', 'Verkehrsregel', 'Führerschein', 'Versicherung',
    'Quittung', 'Pfand', 'Rabatt', 'Trinkgeld', 'Wechselgeld', 'Gebrauchsanweisung', 'Termin', 'Stundenplan',
    'Feierabend', 'Überstunde', 'Bewerbung', 'Vorstellungsgespräch', 'Umzug', 'Renovierung', 'Kündigung', 'Schlange',
    'Sprichwort', 'Witz', 'Rätsel', 'Gedicht', 'Melodie', 'Refrain', 'Applaus', 'Zugabe',
    'Generalprobe', 'Kostüm', 'Kulisse', 'Drehbuch', 'Untertitel', 'Werbung', 'Schlagzeile', 'Gerücht',
    'Interview', 'Übersetzung', 'Handschrift', 'Autogramm', 'Schnappschuss', 'Passwort', 'Suchmaschine', 'Akku',
    'Aktualisierung', 'Bildschirm', 'Tastatur', 'Drucker', 'Netzwerk', 'Doppelgänger', 'Ohrwurm', 'Fingerspitzengefühl',
    'Kopfkino', 'Luftschloss', 'Lampenfieber', 'Gänsehaut', 'Herzklopfen', 'Schluckauf', 'Gähnen', 'Kitzeln',
    'Niesen', 'Augenringe', 'Sommersprossen', 'Grübchen', 'Abkürzung', 'Umleitung', 'Sackgasse', 'Rückspiegel',
    'Blinker', 'Warnweste', 'Panne', 'Ersatzrad'
  ];

  TG.begriffe = {
    leicht: LEICHT,
    mittel: MITTEL,
    schwer: SCHWER
  };
})(window);
