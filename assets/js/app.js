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

  TG.shuffle = function (list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
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

  TG.theme.apply(TG.theme.get());
})(window, document);
