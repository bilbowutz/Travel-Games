/* Katalog aller Spiele – die Startseite baut daraus ihre Kacheln. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  TG.games = [
    {
      id: 'auto-bingo',
      name: 'Auto Bingo',
      emoji: '🚗',
      description: 'Abhaken, was du unterwegs siehst',
      href: 'games/auto-bingo/',
      status: 'ready'
    },
    {
      id: 'kniffel',
      name: 'Kniffel',
      emoji: '🎲',
      description: 'Der Würfelklassiker, bis zu sechs Leute',
      href: 'games/kniffel/',
      status: 'ready'
    },
    {
      id: 'wer-wuerde-eher',
      name: 'Wer würde eher …?',
      emoji: '🤔',
      description: '124 Fragen für die ganze Familie',
      href: 'games/wer-wuerde-eher/',
      status: 'ready'
    },
    {
      id: 'schiffe-versenken',
      name: 'Schiffe versenken',
      emoji: '⚓',
      description: 'Zu zweit auf einem Handy',
      href: 'games/schiffe-versenken/',
      status: 'ready'
    },
    {
      id: 'farben-rennen',
      name: 'Farben-Rennen',
      emoji: '🎨',
      description: 'Autofarben zählen um die Wette',
      href: 'games/farben-rennen/',
      status: 'ready'
    }
  ];
})(window);
