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
      id: 'wer-wuerde-eher',
      name: 'Wer würde eher …?',
      emoji: '🤔',
      description: '124 Fragen, alle zeigen gleichzeitig – Punkte für die Mehrheit.',
      href: 'games/wer-wuerde-eher/',
      badge: 'Spielen',
      status: 'ready'
    },
    {
      id: 'kennzeichen-jagd',
      name: 'Kennzeichen-Jagd',
      emoji: '🔠',
      description: 'Sammle Städtekürzel von Nummernschildern.',
      badge: 'Bald',
      status: 'soon'
    },
    {
      id: 'farben-rennen',
      name: 'Farben-Rennen',
      emoji: '🎨',
      description: 'Jede:r bekommt eine Autofarbe – wer zählt am meisten?',
      badge: 'Bald',
      status: 'soon'
    },
    {
      id: 'koffer-packen',
      name: 'Ich packe meinen Koffer',
      emoji: '🧳',
      description: 'Der Merk-Klassiker, mit Liste zum Mitlesen.',
      badge: 'Bald',
      status: 'soon'
    }
  ];
})(window);
