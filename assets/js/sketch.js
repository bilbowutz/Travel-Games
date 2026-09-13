/* Zeichenfläche, von mehreren Spielen genutzt.
   Striche werden in Bruchteilen der Kantenlänge (0 bis 1) gespeichert –
   dadurch lassen sie sich in jeder Größe neu zeichnen und sind klein genug
   für den lokalen Speicher. */
(function (window, document) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var PRECISION = 10000;

  function round(value) {
    return Math.round(value * PRECISION) / PRECISION;
  }

  function drawPath(context, points, box, strokeColor, strokeWidth) {
    if (!points || !points.length) return;

    context.strokeStyle = strokeColor;
    context.lineWidth = strokeWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(points[0][0] * box.w, points[0][1] * box.h);

    for (var i = 1; i < points.length; i++) {
      var previous = points[i - 1];
      var point = points[i];
      context.quadraticCurveTo(
        previous[0] * box.w, previous[1] * box.h,
        (previous[0] + point[0]) / 2 * box.w, (previous[1] + point[1]) / 2 * box.h
      );
    }

    if (points.length === 1) {
      context.lineTo(points[0][0] * box.w + 0.1, points[0][1] * box.h);
    }

    context.stroke();
  }

  /* Malt Hintergrund, Vorgabe und Striche in einen beliebigen Kontext. */
  function paint(context, box, style, backdrop, strokes) {
    context.clearRect(0, 0, box.w, box.h);
    context.fillStyle = style.background;
    context.fillRect(0, 0, box.w, box.h);

    (backdrop || []).forEach(function (path) {
      drawPath(context, path.p, box, style.backdropColor, (path.w || style.width) * 1.15);
    });

    (strokes || []).forEach(function (stroke) {
      drawPath(context, stroke.p, box, stroke.c || style.color, stroke.w || style.width);
    });
  }

  /* Bereitet ein Canvas auf die Anzeigeauflösung vor und liefert seine Maße. */
  function prepare(canvas) {
    var rect = canvas.getBoundingClientRect();
    var box = { w: rect.width || canvas.width, h: rect.height || canvas.height };
    if (!box.w) return null;

    var ratio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(box.w * ratio);
    canvas.height = Math.round(box.h * ratio);
    canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
    return box;
  }

  TG.sketch = {
    /* Zeichnet eine gespeicherte Zeichnung in ein anderes Canvas, etwa für die Galerie. */
    render: function (canvas, backdrop, strokes, style) {
      var box = prepare(canvas);
      if (!box) return;
      paint(canvas.getContext('2d'), box, {
        background: (style && style.background) || '#ffffff',
        backdropColor: (style && style.backdropColor) || '#8e8e93',
        color: (style && style.color) || '#1c1c1e',
        width: (style && style.width) || 5
      }, backdrop, strokes);
    },

    /* options: { background, backdropColor, color, width, onChange } */
    create: function (canvas, options) {
      options = options || {};

      var strokes = [];
      var backdrop = [];
      var active = null;
      var locked = false;

      var style = {
        background: options.background || '#ffffff',
        backdropColor: options.backdropColor || '#8e8e93',
        color: options.color || '#1c1c1e',
        width: options.width || 5
      };

      function repaint() {
        var rect = canvas.getBoundingClientRect();
        var box = { w: rect.width, h: rect.height };
        if (!box.w) return;
        paint(canvas.getContext('2d'), box, style, backdrop, strokes);
      }

      function resize() {
        if (prepare(canvas)) repaint();
      }

      function pointFrom(event) {
        var rect = canvas.getBoundingClientRect();
        return [
          round(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))),
          round(Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)))
        ];
      }

      function changed() {
        if (options.onChange) options.onChange();
      }

      canvas.addEventListener('pointerdown', function (event) {
        if (locked) return;
        event.preventDefault();
        if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
        active = { c: style.color, w: style.width, p: [pointFrom(event)] };
        strokes.push(active);
        repaint();
        changed();
      });

      canvas.addEventListener('pointermove', function (event) {
        if (!active || locked) return;
        event.preventDefault();
        active.p.push(pointFrom(event));
        repaint();
      });

      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
        canvas.addEventListener(type, function () { active = null; });
      });

      window.addEventListener('resize', resize);

      return {
        canvas: canvas,

        setColor: function (value) { style.color = value; },
        getColor: function () { return style.color; },
        setWidth: function (value) { style.width = value; },

        lock: function (value) { locked = !!value; active = null; },
        isLocked: function () { return locked; },

        isEmpty: function () { return strokes.length === 0; },
        count: function () { return strokes.length; },

        getStrokes: function () { return JSON.parse(JSON.stringify(strokes)); },
        setStrokes: function (list) { strokes = Array.isArray(list) ? list : []; repaint(); changed(); },

        setBackdrop: function (list) { backdrop = Array.isArray(list) ? list : []; repaint(); },
        getBackdrop: function () { return backdrop.slice(); },

        undo: function () { strokes.pop(); active = null; repaint(); changed(); },
        clear: function () { strokes = []; active = null; repaint(); changed(); },

        resize: resize,
        repaint: repaint
      };
    }
  };
})(window, document);
