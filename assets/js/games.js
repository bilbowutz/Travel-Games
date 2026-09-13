/* Katalog aller Spiele – die Startseite baut daraus ihre Kacheln. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  TG.games = [
    {
      id: 'auto-bingo',
      name: 'Auto Bingo',
      emoji: '🚗',
      description: 'Hake ab, was du unterwegs siehst – Flugzeug, Tankstelle, Hund …',
      href: 'games/auto-bingo/',
      badge: 'Spielen',
      status: 'ready'
    },
    {
      id: 'kniffel',
      name: 'Kniffel',
      emoji: '🎲',
      description: 'Der Würfelklassiker – zu sechst auf einem Handy, das Blatt rechnet mit.',
      href: 'games/kniffel/',
      badge: 'Spielen',
      status: 'ready'
    },
    {
      id: 'wer-wuerde-eher',
      name: 'Wer würde eher …?',
      emoji: '🤔',
      description: '124 Fragen, alle zeigen gleichzeitig – Punkte für die Mehrheit.',
      href: 'games/wer-wuerde-eher/',
      badge: 'Spielen',
      status: 'ready'
    },
    {
      id: 'schiffe-versenken',
      name: 'Schiffe versenken',
      emoji: '⚓',
      description: 'Zu zweit auf einem Handy – abwechselnd, mit Sichtschutz dazwischen.',
      href: 'games/schiffe-versenken/',
      badge: 'Spielen',
      status: 'ready'
    },
    {
      id: 'farben-rennen',
      name: 'Farben-Rennen',
      emoji: '🎨',
      description: 'Jede:r bekommt eine Autofarbe – wer zuerst am Ziel ist, gewinnt.',
      href: 'games/farben-rennen/',
      badge: 'Spielen',
      status: 'ready'
    }
  ];
})(window);
