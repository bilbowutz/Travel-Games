/* Travel Games – gemeinsame Helfer (kein Framework, kein Backend) */
(function (window, document) {
  'use strict';

  var TG = window.TG || (window.TG = {});
  var PREFIX = 'travelgames.';

  /* ---------- localStorage mit Fallback (privater Modus, blockierte Cookies) ---------- */

  var memory = {};
  var available = (function () {
    try {
      var k = PREFIX + 'test';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  TG.store = {
    available: available,
    get: function (key, fallback) {
      var raw;
      try {
        raw = available ? localStorage.getItem(PREFIX + key) : memory[key];
      } catch (e) {
        raw = memory[key];
      }
      if (raw == null) return fallback;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      var raw = JSON.stringify(value);
      memory[key] = raw;
      if (!available) return false;
      try {
        localStorage.setItem(PREFIX + key, raw);
        return true;
      } catch (e) {
        return false;
      }
    },
    remove: function (key) {
      delete memory[key];
      if (!available) return;
      try {
        localStorage.removeItem(PREFIX + key);
      } catch (e) { /* egal */ }
    }
  };

  /* ---------- Farbschema: auto | light | dark ---------- */

  TG.theme = {
    get: function () {
      return TG.store.get('theme', 'auto');
    },
    apply: function (mode) {
      if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', mode);
    },
    set: function (mode) {
      TG.store.set('theme', mode);
      TG.theme.apply(mode);
      return mode;
    },
    cycle: function () {
      var order = ['auto', 'light', 'dark'];
      var next = order[(order.indexOf(TG.theme.get()) + 1) % order.length];
      return TG.theme.set(next);
    },
    label: function (mode) {
      return { auto: 'Automatisch', light: 'Hell', dark: 'Dunkel' }[mode] || 'Automatisch';
    },
    icon: function (mode) {
      return { auto: '🌗', light: '☀️', dark: '🌙' }[mode] || '🌗';
    }
  };

  /* Schaltet einen Button zum Theme-Umschalter um. */
  TG.bindThemeToggle = function (button) {
    if (!button) return;
    function render() {
      var mode = TG.theme.get();
      button.textContent = TG.theme.icon(mode);
      button.setAttribute('aria-label', 'Farbschema: ' + TG.theme.label(mode) + ' – umschalten');
      button.title = 'Farbschema: ' + TG.theme.label(mode);
    }
    button.addEventListener('click', function () {
      var mode = TG.theme.cycle();
      render();
      TG.toast('Farbschema: ' + TG.theme.label(mode));
    });
    render();
  };

  /* ---------- Kurzmeldungen ---------- */

  var toastHost = null;

  TG.toast = function (message, options) {
    options = options || {};
    if (!toastHost) {
      toastHost = document.querySelector('.toast-host');
      if (!toastHost) {
        toastHost = document.createElement('div');
        toastHost.className = 'toast-host';
        toastHost.setAttribute('role', 'status');
        toastHost.setAttribute('aria-live', 'polite');
        document.body.appendChild(toastHost);
      }
    }
    var el = document.createElement('div');
    el.className = 'toast' + (options.variant ? ' toast--' + options.variant : '');
    el.textContent = message;
    toastHost.appendChild(el);
    window.setTimeout(function () {
      el.classList.add('is-leaving');
      window.setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 260);
    }, options.duration || 1900);
  };

  /* ---------- Haptik (nur Android/Chrome, sonst still) ---------- */

  TG.haptic = function (pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) { /* egal */ }
  };

  /* ---------- Zufall ---------- */

  /* Mulberry32: gleicher Startwert -> gleiche Zahlenfolge.
     Damit kommt auf jedem Handy dasselbe Brett bzw. dieselbe Fragenreihenfolge heraus. */
  TG.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = a + 0x6D2B79F5 >>> 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  TG.randomSeed = function () {
    return Math.floor(Math.random() * 0x2000000); /* 25 Bit */
  };

  /* random ist optional – ohne Angabe echter Zufall, mit TG.rng(seed) reproduzierbar. */
  TG.shuffle = function (list, random) {
    var rnd = random || Math.random;
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  };

  /* ---------- Teilbare Codes (Crockford-Base32) ---------- */

  var ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

  TG.code = {
    LENGTH: 6,

    /* Tippfehler verzeihen: I und L sind eine 1, O ist eine 0. */
    clean: function (text) {
      return String(text || '')
        .toUpperCase()
        .replace(/[IL]/g, '1')
        .replace(/O/g, '0')
        .replace(/[^0-9A-Z]/g, '')
        .split('')
        .filter(function (c) { return ALPHABET.indexOf(c) > -1; })
        .join('');
    },

    fromNumber: function (value, length) {
      var len = length || TG.code.LENGTH;
      var n = Math.floor(value);
      var out = '';
      for (var i = 0; i < len; i++) {
        out = ALPHABET.charAt(n % 32) + out;
        n = Math.floor(n / 32);
      }
      return out;
    },

    toNumber: function (text) {
      var clean = TG.code.clean(text);
      if (clean.length !== TG.code.LENGTH) return null;
      var n = 0;
      for (var i = 0; i < clean.length; i++) {
        n = n * 32 + ALPHABET.indexOf(clean.charAt(i));
      }
      return n;
    },

    /* Nur zur Anzeige: ABC123 -> ABC-123 */
    format: function (code) {
      if (!code || code.length !== TG.code.LENGTH) return code || '';
      return code.slice(0, 3) + '-' + code.slice(3);
    }
  };

  /* ---------- Teilen ---------- */

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(function () { return 'copied'; })
        .catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      var field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(field);
      field.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(field);
      return ok ? 'copied' : 'failed';
    } catch (e) {
      return 'failed';
    }
  }

  /* Antwort: 'shared' | 'copied' | 'cancelled' | 'failed' */
  TG.share = function (data) {
    var fallback = data.text + (data.url ? '\n' + data.url : '');
    if (navigator.share) {
      return navigator.share(data).then(
        function () { return 'shared'; },
        function (error) {
          if (error && error.name === 'AbortError') return 'cancelled';
          return copyText(fallback);
        }
      );
    }
    return copyText(fallback);
  };

  /* Meldet das Ergebnis von TG.share passend zurück. */
  TG.reportShare = function (result, copiedMessage) {
    if (result === 'copied') TG.toast(copiedMessage || 'In die Zwischenablage kopiert');
    else if (result === 'failed') TG.toast('Teilen hat nicht geklappt');
  };

  /* ---------- Namensliste (von mehreren Spielen genutzt) ---------- */

  /* Baut eine Liste aus Namensfeldern in das übergebene Listenelement.
     options: { min, max, maxLength, addButton, onChange } */
  TG.nameEditor = function (list, options) {
    options = options || {};
    var min = options.min || 2;
    var max = options.max || 10;
    var maxLength = options.maxLength || 16;
    var names = [];

    function read() {
      return Array.prototype.map.call(list.querySelectorAll('input'), function (input) {
        return input.value;
      });
    }

    function update() {
      if (options.addButton) options.addButton.hidden = read().length >= max;
      if (options.onChange) options.onChange();
    }

    function draw(focusLast) {
      list.textContent = '';

      names.forEach(function (name, index) {
        var row = document.createElement('li');
        row.className = 'name-row';

        var number = document.createElement('span');
        number.className = 'name-row__number';
        number.setAttribute('aria-hidden', 'true');
        number.textContent = (index + 1) + '.';

        var input = document.createElement('input');
        input.className = 'text-input';
        input.type = 'text';
        input.value = name;
        input.maxLength = maxLength;
        input.placeholder = 'Name';
        input.autocomplete = 'off';
        input.setAttribute('aria-label', 'Name ' + (index + 1));

        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'name-row__remove';
        remove.textContent = '✕';
        remove.setAttribute('aria-label', 'Name ' + (index + 1) + ' entfernen');
        remove.hidden = names.length <= min;
        remove.addEventListener('click', function () {
          names = read();
          names.splice(index, 1);
          draw(false);
        });

        row.appendChild(number);
        row.appendChild(input);
        row.appendChild(remove);
        list.appendChild(row);
      });

      if (focusLast) {
        var inputs = list.querySelectorAll('input');
        if (inputs.length) inputs[inputs.length - 1].focus();
      }

      update();
    }

    function add() {
      names = read();
      if (names.length >= max) return false;
      names.push('');
      draw(true);
      return true;
    }

    if (options.addButton) options.addButton.addEventListener('click', add);

    return {
      /* Entwurf setzen; zu kurze Listen werden auf das Minimum aufgefüllt. */
      set: function (values) {
        names = (values || []).slice(0, max);
        while (names.length < min) names.push('');
        draw(false);
      },
      add: add,
      /* Getrimmte, nicht leere Namen. */
      values: function () {
        return read()
          .map(function (name) { return name.trim().slice(0, maxLength); })
          .filter(function (name) { return name.length > 0; });
      }
    };
  };

  /* Zeigt einen Link als QR-Code. Der Dialog wird beim ersten Aufruf gebaut,
     die Spielseiten brauchen dafür kein eigenes Markup. */
  TG.showQrDialog = function (url, options) {
    options = options || {};

    if (!TG.qr) {
      TG.toast('QR-Codes sind auf dieser Seite nicht verfügbar');
      return;
    }

    var svg;
    try {
      svg = TG.qr.toSvg(TG.qr.encode(url), { quiet: 2 });
    } catch (error) {
      TG.toast('Der Link ist zu lang für einen QR-Code');
      return;
    }

    var dialog = document.getElementById('tg-qr');

    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'qr-dialog';
      dialog.id = 'tg-qr';
      dialog.innerHTML =
        '<h2 class="qr-dialog__title"></h2>' +
        '<div class="qr-dialog__image"></div>' +
        '<p class="qr-dialog__caption"></p>' +
        '<p class="qr-dialog__url"></p>' +
        '<button type="button" class="btn btn--block btn--primary">Schließen</button>';
      document.body.appendChild(dialog);

      dialog.querySelector('button').addEventListener('click', function () {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      });
      dialog.addEventListener('click', function (event) {
        if (event.target !== dialog) return;
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      });
    }

    dialog.querySelector('.qr-dialog__title').textContent = options.title || 'Zum Mitspielen scannen';
    dialog.querySelector('.qr-dialog__image').innerHTML = svg;
    dialog.querySelector('.qr-dialog__caption').textContent = options.caption || '';
    dialog.querySelector('.qr-dialog__url').textContent = url.replace(/^https?:\/\//, '');

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };

  /* Adresse dieser Seite ohne #-Anhang. */
  TG.pageUrl = function () {
    return location.href.split('#')[0];
  };

  /* Liest ?/#c=CODE aus der Adresse. */
  TG.codeFromLocation = function () {
    var match = /[#&?]c=([0-9a-z]+)/i.exec(location.hash + location.search);
    return match ? TG.code.clean(match[1]) : null;
  };

  /* Entfernt den #-Anhang, ohne die Seite neu zu laden. */
  TG.clearHash = function () {
    if (window.history && history.replaceState) {
      history.replaceState(null, '', TG.pageUrl());
    }
  };

  /* ---------- Service Worker: Offline im Funkloch ---------- */

  TG.registerServiceWorker = function (path) {
    if (!('serviceWorker' in navigator)) return;
    var secure = location.protocol === 'https:' ||
      location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!secure) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(path).catch(function () { /* offline egal */ });
    });
  };

  /* ---------- Unterkante des sichtbaren Bereichs ---------- */

  /* Auf Handys ist das Layout-Viewport oft höher als der sichtbare Ausschnitt:
     die eingeblendete Browserleiste zählt mit. Eine unten fixierte Leiste rutscht
     dann aus dem Bild. --viewport-bottom hält sie an der sichtbaren Kante –
     und über der Tastatur, wenn die aufgeht. */
  TG.trackViewportBottom = function () {
    var viewport = window.visualViewport;
    if (!viewport) return;

    var pending = false;

    function sync() {
      pending = false;
      var offset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
      document.documentElement.style.setProperty('--viewport-bottom', offset + 'px');
    }

    /* Die Höhe kann sich auch ändern, ohne dass ein resize kommt – etwa wenn die
       Seite erst durch Nachladen scrollbar wird. Deshalb zusätzlich beim Scrollen. */
    function schedule() {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(sync);
    }

    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule);
    sync();
  };

  TG.theme.apply(TG.theme.get());
  TG.trackViewportBottom();
})(window, document);
