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
      id: 'superhirn',
      name: 'Superhirn',
      emoji: '🧠',
      description: 'Geheime Farbreihe knacken, zu zweit',
      href: 'games/superhirn/',
      status: 'ready'
    },
    {
      id: 'dame',
      name: 'Dame',
      emoji: '⚪',
      description: 'Der Klassiker zu zweit, mit Schlagzwang',
      href: 'games/dame/',
      status: 'ready'
    },
    {
      id: 'fotojagd',
      name: 'Fotojagd',
      emoji: '📷',
      description: 'Fünf Fotos von einer Stelle – finde sie',
      href: 'games/fotojagd/',
      status: 'ready'
    },
    {
      id: 'begriffe-erklaeren',
      name: 'Begriffe erklären',
      emoji: '🗣️',
      description: 'Erklären gegen die Uhr – der andere rät',
      href: 'games/begriffe-erklaeren/',
      status: 'ready'
    },
    {
      id: 'maexchen',
      name: 'Mäxchen',
      emoji: '🤥',
      description: 'Würfeln, ansagen, bluffen – nur du siehst den Wurf',
      href: 'games/maexchen/',
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
      id: 'kritzelbild',
      name: 'Kritzelbild',
      emoji: '✏️',
      description: 'Aus einer zufälligen Form ein Bild machen',
      href: 'games/kritzelbild/',
      status: 'ready'
    },
    {
      id: 'malen-und-raten',
      name: 'Malen und Raten',
      emoji: '🎨',
      description: 'Mit dem Finger zeichnen, die anderen raten',
      href: 'games/malen-und-raten/',
      status: 'ready'
    },
    {
      id: 'galgenmaennchen',
      name: 'Galgenmännchen',
      emoji: '🚀',
      description: 'Wort erraten, bevor die Rakete fertig ist',
      href: 'games/galgenmaennchen/',
      status: 'ready'
    },
    {
      id: 'erzaehlwuerfel',
      name: 'Erzählwürfel',
      emoji: '🎴',
      description: 'Symbole würfeln, gemeinsam eine Geschichte bauen',
      href: 'games/erzaehlwuerfel/',
      status: 'ready'
    },
    {
      id: 'kaesekaestchen',
      name: 'Käsekästchen',
      emoji: '▫️',
      description: 'Linien ziehen, Kästchen schließen – zu zweit',
      href: 'games/kaesekaestchen/',
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
