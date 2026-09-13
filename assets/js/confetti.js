/* Winziges Konfetti ohne Bibliothek. */
(function (window, document) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var canvas, ctx, pieces = [], running = false, dpr = 1;
  var COLORS = ['#2f6bff', '#22c55e', '#f5b301', '#ef4444', '#a855f7', '#06b6d4'];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(count) {
    var w = window.innerWidth;
    for (var i = 0; i < count; i++) {
      pieces.push({
        x: Math.random() * w,
        y: -20 - Math.random() * window.innerHeight * 0.35,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        vx: -1.2 + Math.random() * 2.4,
        vy: 2.4 + Math.random() * 3.2,
        rot: Math.random() * Math.PI,
        vr: -0.16 + Math.random() * 0.32,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1
      });
    }
  }

  function frame() {
    var h = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = pieces.length - 1; i >= 0; i--) {
      var p = pieces[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      p.rot += p.vr;
      if (p.y > h * 0.72) p.life -= 0.02;
      if (p.life <= 0 || p.y > h + 60) {
        pieces.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (pieces.length) {
      window.requestAnimationFrame(frame);
    } else {
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  TG.confetti = function (count) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    canvas = canvas || document.getElementById('confetti');
    if (!canvas || !canvas.getContext) return;
    if (!ctx) {
      ctx = canvas.getContext('2d');
      window.addEventListener('resize', resize);
    }
    resize();
    spawn(count || 90);
    if (!running) {
      running = true;
      window.requestAnimationFrame(frame);
    }
  };
})(window, document);
