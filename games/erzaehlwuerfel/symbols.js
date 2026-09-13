/* Symbole für die Erzählwürfel. Absichtlich mehrdeutig – je offener ein
   Bild ist, desto mehr Geschichten passen darauf. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  TG.storySymbols = [
    /* Figuren */
    { emoji: '🧙', name: 'Zauberer' },
    { emoji: '👑', name: 'Krone' },
    { emoji: '🦸', name: 'Held' },
    { emoji: '🏴‍☠️', name: 'Pirat' },
    { emoji: '🧜', name: 'Meerjungfrau' },
    { emoji: '👻', name: 'Gespenst' },
    { emoji: '🤖', name: 'Roboter' },
    { emoji: '👶', name: 'Baby' },
    { emoji: '🧑‍🚀', name: 'Astronaut' },

    /* Tiere */
    { emoji: '🐉', name: 'Drache' },
    { emoji: '🦊', name: 'Fuchs' },
    { emoji: '🐳', name: 'Wal' },
    { emoji: '🦉', name: 'Eule' },
    { emoji: '🐍', name: 'Schlange' },
    { emoji: '🐝', name: 'Biene' },
    { emoji: '🐘', name: 'Elefant' },
    { emoji: '🦋', name: 'Schmetterling' },

    /* Orte */
    { emoji: '🏰', name: 'Burg' },
    { emoji: '🏝️', name: 'Insel' },
    { emoji: '⛰️', name: 'Berg' },
    { emoji: '🌋', name: 'Vulkan' },
    { emoji: '🕳️', name: 'Loch' },
    { emoji: '🏚️', name: 'altes Haus' },
    { emoji: '🎪', name: 'Zirkus' },
    { emoji: '🌲', name: 'Wald' },
    { emoji: '🏜️', name: 'Wüste' },

    /* Dinge */
    { emoji: '🔑', name: 'Schlüssel' },
    { emoji: '🗺️', name: 'Landkarte' },
    { emoji: '💎', name: 'Edelstein' },
    { emoji: '📦', name: 'Paket' },
    { emoji: '🎁', name: 'Geschenk' },
    { emoji: '🕰️', name: 'Uhr' },
    { emoji: '🔭', name: 'Fernrohr' },
    { emoji: '🪜', name: 'Leiter' },
    { emoji: '🧦', name: 'Socke' },
    { emoji: '☂️', name: 'Regenschirm' },
    { emoji: '🎈', name: 'Luftballon' },
    { emoji: '📚', name: 'Bücher' },
    { emoji: '🍯', name: 'Honig' },
    { emoji: '🪞', name: 'Spiegel' },

    /* Fahrzeuge */
    { emoji: '🚀', name: 'Rakete' },
    { emoji: '⛵', name: 'Segelboot' },
    { emoji: '🎠', name: 'Karussell' },
    { emoji: '🚂', name: 'Zug' },
    { emoji: '🛸', name: 'Ufo' },

    /* Natur und Wetter */
    { emoji: '🌈', name: 'Regenbogen' },
    { emoji: '⚡', name: 'Blitz' },
    { emoji: '❄️', name: 'Schnee' },
    { emoji: '🌙', name: 'Mond' },
    { emoji: '🔥', name: 'Feuer' },
    { emoji: '🌊', name: 'Welle' },
    { emoji: '🌻', name: 'Blume' },

    /* Gefühle und Zeichen */
    { emoji: '❤️', name: 'Herz' },
    { emoji: '😴', name: 'Schlaf' },
    { emoji: '😱', name: 'Schreck' },
    { emoji: '❓', name: 'Rätsel' },
    { emoji: '💤', name: 'Traum' },
    { emoji: '🎵', name: 'Musik' },
    { emoji: '👣', name: 'Fußspuren' }
  ];

  TG.storyOpeners = [
    'Es war einmal …',
    'Eines Morgens, ganz früh …',
    'Weit hinter den Bergen …',
    'Niemand hatte damit gerechnet, aber …',
    'Als alle schon schliefen …',
    'Mitten auf der Autobahn …',
    'Vor langer, langer Zeit …',
    'Und plötzlich …'
  ];
})(window);
