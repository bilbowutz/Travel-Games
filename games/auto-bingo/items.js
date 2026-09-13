/* Motive fürs Auto Bingo.
   rare: true  = seltener Fund, davon kommt nur eine Handvoll pro Brett.
   "|" im Label = erlaubte Trennstelle; wird unten zu einem weichen
   Trennzeichen, damit lange Wörter auf schmalen Handys sauber umbrechen. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var SOFT_HYPHEN = '­';

  var RAW = [
    /* --- häufig --- */
    { id: 'tankstelle',     emoji: '⛽',   label: 'Tank|stelle' },
    { id: 'hund',           emoji: '🐕',   label: 'Hund' },
    { id: 'lkw',            emoji: '🚚',   label: 'LKW' },
    { id: 'bus',            emoji: '🚌',   label: 'Bus' },
    { id: 'fahrrad',        emoji: '🚲',   label: 'Fahr|rad' },
    { id: 'motorrad',       emoji: '🏍️',  label: 'Motor|rad' },
    { id: 'bruecke',        emoji: '🌉',   label: 'Brücke' },
    { id: 'ampel',          emoji: '🚦',   label: 'Ampel' },
    { id: 'baustelle',      emoji: '🚧',   label: 'Bau|stelle' },
    { id: 'windrad',        emoji: '🌬️',  label: 'Wind|rad' },
    { id: 'kirche',         emoji: '⛪',   label: 'Kirch|turm' },
    { id: 'kuh',            emoji: '🐄',   label: 'Kuh' },
    { id: 'schaf',          emoji: '🐑',   label: 'Schaf' },
    { id: 'traktor',        emoji: '🚜',   label: 'Traktor' },
    { id: 'rotes-auto',     emoji: '🟥',   label: 'Rotes Auto' },
    { id: 'gelbes-auto',    emoji: '🟨',   label: 'Gelbes Auto' },
    { id: 'wald',           emoji: '🌳',   label: 'Wald' },
    { id: 'supermarkt',     emoji: '🛒',   label: 'Super|markt' },
    { id: 'haltestelle',    emoji: '🚏',   label: 'Halte|stelle' },
    { id: 'stoppschild',    emoji: '🛑',   label: 'Stopp|schild' },
    { id: 'strommast',      emoji: '⚡',   label: 'Strom|mast' },
    { id: 'anhaenger',      emoji: '🛻',   label: 'An|hänger' },
    { id: 'solaranlage',    emoji: '☀️',  label: 'Solar|anlage' },
    { id: 'katze',          emoji: '🐈',   label: 'Katze' },
    { id: 'vogelschwarm',   emoji: '🐦',   label: 'Vogel|schwarm' },
    { id: 'fastfood',       emoji: '🍔',   label: 'Fast Food' },
    { id: 'parkplatz',      emoji: '🅿️',  label: 'Park|platz' },
    { id: 'kornfeld',       emoji: '🌾',   label: 'Korn|feld' },
    { id: 'jogger',         emoji: '🏃',   label: 'Jogger:in' },
    { id: 'kinderwagen',    emoji: '👶',   label: 'Kinder|wagen' },
    { id: 'flagge',         emoji: '🏳️',  label: 'Flagge' },
    { id: 'muelltonne',     emoji: '🗑️',  label: 'Müll|tonne' },
    { id: 'schule',         emoji: '🏫',   label: 'Schule' },
    { id: 'tunnel',         emoji: '🕳️',  label: 'Tunnel' },
    { id: 'fabrik',         emoji: '🏭',   label: 'Fabrik' },
    { id: 'scheune',        emoji: '🏚️',  label: 'Scheune' },

    /* --- selten --- */
    { id: 'flugzeug',       emoji: '✈️',  label: 'Flug|zeug',     rare: true },
    { id: 'polizei',        emoji: '🚓',   label: 'Polizei|auto',  rare: true },
    { id: 'krankenwagen',   emoji: '🚑',   label: 'Kranken|wagen', rare: true },
    { id: 'feuerwehr',      emoji: '🚒',   label: 'Feuer|wehr',    rare: true },
    { id: 'hubschrauber',   emoji: '🚁',   label: 'Hub|schrauber', rare: true },
    { id: 'zug',            emoji: '🚂',   label: 'Zug',           rare: true },
    { id: 'wohnmobil',      emoji: '🚐',   label: 'Wohn|mobil',    rare: true },
    { id: 'pferd',          emoji: '🐎',   label: 'Pferd',         rare: true },
    { id: 'reh',            emoji: '🦌',   label: 'Reh',           rare: true },
    { id: 'burg',           emoji: '🏰',   label: 'Burg',          rare: true },
    { id: 'regenbogen',     emoji: '🌈',   label: 'Regen|bogen',   rare: true },
    { id: 'ballon',         emoji: '🎈',   label: 'Ballon',        rare: true },
    { id: 'boot',           emoji: '⛵',   label: 'Boot',          rare: true },
    { id: 'oldtimer',       emoji: '🚗',   label: 'Old|timer',     rare: true },
    { id: 'taxi',           emoji: '🚕',   label: 'Taxi',          rare: true },
    { id: 'see',            emoji: '🏞️',  label: 'See',           rare: true },
    { id: 'berge',          emoji: '⛰️',  label: 'Berge',         rare: true },
    { id: 'stau',           emoji: '🚗🚗', label: 'Stau',          rare: true },
    { id: 'riesenrad',      emoji: '🎡',   label: 'Riesen|rad',    rare: true },
    { id: 'cabrio',         emoji: '🏎️',  label: 'Cabrio',        rare: true }
  ];

  TG.autoBingoItems = RAW.map(function (item) {
    return {
      id: item.id,
      emoji: item.emoji,
      label: item.label.replace(/\|/g, SOFT_HYPHEN),
      rare: !!item.rare
    };
  });
})(window);
