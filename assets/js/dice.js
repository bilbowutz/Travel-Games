/* Würfelaugen, von mehreren Spielen genutzt.
   Die Augen sitzen in einem 3×3-Raster; die Liste sagt, welche der neun
   Felder gefüllt sind. Gefärbt wird über currentColor, damit jedes Spiel
   selbst bestimmt, wie seine Würfel aussehen. */
(function (window, document) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var PIPS = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };

  TG.dice = {
    PIPS: PIPS,

    /* Liefert ein fertiges Element mit den Augen einer Zahl.
       0 oder Unbekanntes ergibt einen leeren Würfel. */
    build: function (value) {
      var host = document.createElement('span');
      host.className = 'die-pips';
      host.setAttribute('aria-hidden', 'true');

      var on = PIPS[value] || [];
      for (var i = 0; i < 9; i++) {
        var pip = document.createElement('i');
        if (on.indexOf(i) > -1) pip.className = 'on';
        host.appendChild(pip);
      }

      return host;
    }
  };
})(window, document);
