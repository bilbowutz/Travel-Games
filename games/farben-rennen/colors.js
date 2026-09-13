/* Autofarben fürs Farben-Rennen.
   ink sagt, ob auf der Fläche helle oder dunkle Schrift lesbar ist. */
(function (window) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  TG.carColors = [
    { id: 'rot',     name: 'Rot',     hex: '#e03131', ink: 'light' },
    { id: 'blau',    name: 'Blau',    hex: '#1c7ed6', ink: 'light' },
    { id: 'schwarz', name: 'Schwarz', hex: '#212529', ink: 'light' },
    { id: 'weiss',   name: 'Weiß',    hex: '#f8f9fa', ink: 'dark' },
    { id: 'silber',  name: 'Silber',  hex: '#ced4da', ink: 'dark' },
    { id: 'gruen',   name: 'Grün',    hex: '#2f9e44', ink: 'light' },
    { id: 'gelb',    name: 'Gelb',    hex: '#fab005', ink: 'dark' },
    { id: 'orange',  name: 'Orange',  hex: '#f76707', ink: 'light' }
  ];

  TG.carColorById = function (id) {
    for (var i = 0; i < TG.carColors.length; i++) {
      if (TG.carColors[i].id === id) return TG.carColors[i];
    }
    return TG.carColors[0];
  };
})(window);
