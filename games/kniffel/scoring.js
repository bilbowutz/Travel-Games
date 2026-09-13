/* Kniffel – Wertung, getrennt von der Oberfläche.
   Alles hier sind reine Funktionen über fünf Würfeln. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var DICE_COUNT = 5;
  var UPPER_TARGET = 63;
  var UPPER_BONUS = 35;
  var KNIFFEL_BONUS = 100;

  var CATEGORIES = [
    { id: 'einer',         name: 'Einer',          section: 'upper', face: 1, help: 'Summe aller Einsen' },
    { id: 'zweier',        name: 'Zweier',         section: 'upper', face: 2, help: 'Summe aller Zweien' },
    { id: 'dreier',        name: 'Dreier',         section: 'upper', face: 3, help: 'Summe aller Dreien' },
    { id: 'vierer',        name: 'Vierer',         section: 'upper', face: 4, help: 'Summe aller Vieren' },
    { id: 'fuenfer',       name: 'Fünfer',         section: 'upper', face: 5, help: 'Summe aller Fünfen' },
    { id: 'sechser',       name: 'Sechser',        section: 'upper', face: 6, help: 'Summe aller Sechsen' },
    { id: 'dreierpasch',   name: 'Dreierpasch',    section: 'lower', help: 'Drei gleiche – alle Augen zählen' },
    { id: 'viererpasch',   name: 'Viererpasch',    section: 'lower', help: 'Vier gleiche – alle Augen zählen' },
    { id: 'fullhouse',     name: 'Full House',     section: 'lower', help: 'Drei plus zwei gleiche – 25' },
    { id: 'kleinestrasse', name: 'Kleine Straße',  section: 'lower', help: 'Vier in Folge – 30' },
    { id: 'grossestrasse', name: 'Große Straße',   section: 'lower', help: 'Fünf in Folge – 40' },
    { id: 'kniffel',       name: 'Kniffel',        section: 'lower', help: 'Fünf gleiche – 50' },
    { id: 'chance',        name: 'Chance',         section: 'lower', help: 'Summe aller Würfel' }
  ];

  function counts(dice) {
    var result = [0, 0, 0, 0, 0, 0, 0];
    dice.forEach(function (value) { result[value]++; });
    return result;
  }

  function sum(dice) {
    return dice.reduce(function (total, value) { return total + value; }, 0);
  }

  function hasRun(dice, length) {
    var seen = counts(dice);
    var run = 0;
    for (var face = 1; face <= 6; face++) {
      run = seen[face] ? run + 1 : 0;
      if (run >= length) return true;
    }
    return false;
  }

  function isKniffel(dice) {
    return dice.length === DICE_COUNT && counts(dice).some(function (n) { return n === DICE_COUNT; });
  }

  /* Zusatz-Kniffel: fünf Gleiche, obwohl oben schon ein Kniffel mit 50 steht.
     Dann gibt es 100 Bonuspunkte und das Feld darf frei gewählt werden. */
  function isJoker(dice, sheet) {
    return isKniffel(dice) && sheet && sheet.kniffel === 50;
  }

  function scoreFor(categoryId, dice, options) {
    if (!dice || dice.length !== DICE_COUNT) return 0;

    var joker = !!(options && options.joker);
    var seen = counts(dice);
    var category = CATEGORIES.filter(function (c) { return c.id === categoryId; })[0];
    if (!category) return 0;

    if (category.section === 'upper') {
      return seen[category.face] * category.face;
    }

    switch (categoryId) {
      case 'dreierpasch':
        return seen.some(function (n) { return n >= 3; }) ? sum(dice) : 0;
      case 'viererpasch':
        return seen.some(function (n) { return n >= 4; }) ? sum(dice) : 0;
      case 'fullhouse':
        if (joker) return 25;
        return seen.some(function (n) { return n === 3; }) && seen.some(function (n) { return n === 2; }) ? 25 : 0;
      case 'kleinestrasse':
        if (joker) return 30;
        return hasRun(dice, 4) ? 30 : 0;
      case 'grossestrasse':
        if (joker) return 40;
        return hasRun(dice, 5) ? 40 : 0;
      case 'kniffel':
        return isKniffel(dice) ? 50 : 0;
      case 'chance':
        return sum(dice);
      default:
        return 0;
    }
  }

  function emptySheet() {
    var sheet = {};
    CATEGORIES.forEach(function (category) { sheet[category.id] = null; });
    sheet.kniffelBonus = 0;
    return sheet;
  }

  function openCategories(sheet) {
    return CATEGORIES.filter(function (category) { return sheet[category.id] === null; });
  }

  function isComplete(sheet) {
    return openCategories(sheet).length === 0;
  }

  function totals(sheet) {
    var upper = 0;
    var lower = 0;

    CATEGORIES.forEach(function (category) {
      var value = sheet[category.id];
      if (typeof value !== 'number') return;
      if (category.section === 'upper') upper += value;
      else lower += value;
    });

    var bonus = upper >= UPPER_TARGET ? UPPER_BONUS : 0;
    var extra = sheet.kniffelBonus || 0;

    return {
      upper: upper,
      bonus: bonus,
      upperTotal: upper + bonus,
      lower: lower,
      kniffelBonus: extra,
      total: upper + bonus + lower + extra,
      missingForBonus: Math.max(0, UPPER_TARGET - upper)
    };
  }

  TG.kniffel = {
    DICE_COUNT: DICE_COUNT,
    UPPER_TARGET: UPPER_TARGET,
    UPPER_BONUS: UPPER_BONUS,
    KNIFFEL_BONUS: KNIFFEL_BONUS,
    CATEGORIES: CATEGORIES,
    scoreFor: scoreFor,
    isKniffel: isKniffel,
    isJoker: isJoker,
    emptySheet: emptySheet,
    openCategories: openCategories,
    isComplete: isComplete,
    totals: totals
  };
})(window);
