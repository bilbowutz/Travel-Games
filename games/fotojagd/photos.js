/* Fotospeicher für die Fotojagd.
   Bilder gehören nicht in den localStorage: der fasst je nach Browser rund
   fünf Megabyte, und als Text abgelegt braucht ein Foto gut das Doppelte
   seiner Dateigröße. Also IndexedDB – genauso lokal, nur der richtige Ort
   für Binärdaten. Vorher wird jedes Bild verkleinert, damit aus einem
   12-Megapixel-Handyfoto keine vier Megabyte werden. */
(function (window, document) {
  'use strict';
  var TG = window.TG || (window.TG = {});

  var DB_NAME = 'travelgames-fotojagd';
  var DB_VERSION = 1;
  var STORE = 'fotos';
  var MAX_EDGE = 1280;
  var QUALITY = 0.72;

  var dbPromise = null;

  function supported() {
    try {
      return !!window.indexedDB;
    } catch (e) {
      return false;
    }
  }

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(function (resolve, reject) {
      if (!supported()) { reject(new Error('IndexedDB fehlt')); return; }

      var request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('IndexedDB blockiert')); };
      request.onblocked = function () { reject(new Error('IndexedDB blockiert')); };
    });

    return dbPromise;
  }

  function withStore(mode, work) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var result;
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error('Abgebrochen')); };
        work(tx.objectStore(STORE), function (value) { result = value; });
      });
    });
  }

  /* Verkleinern auf eine vernünftige Kantenlänge. Die Ausrichtung übernimmt
     der Browser beim Dekodieren, deshalb reicht das schlichte Zeichnen. */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();

      image.onload = function () {
        var scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('Bild konnte nicht umgewandelt werden'));
        }, 'image/jpeg', QUALITY);
      };

      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Das ist kein Bild, das der Browser lesen kann'));
      };

      image.src = url;
    });
  }

  TG.photos = {
    supported: supported,

    put: function (key, file) {
      return shrink(file).then(function (blob) {
        return withStore('readwrite', function (store) {
          store.put(blob, key);
        }).then(function () { return blob; });
      });
    },

    get: function (key) {
      return withStore('readonly', function (store, done) {
        var request = store.get(key);
        request.onsuccess = function () { done(request.result || null); };
      });
    },

    remove: function (key) {
      return withStore('readwrite', function (store) { store.delete(key); });
    },

    /* Alles weg, was nicht mehr zur laufenden Partie gehört. */
    keepOnly: function (keys) {
      var wanted = {};
      (keys || []).forEach(function (key) { wanted[key] = true; });

      return withStore('readwrite', function (store) {
        var request = store.getAllKeys();
        request.onsuccess = function () {
          (request.result || []).forEach(function (key) {
            if (!wanted[key]) store.delete(key);
          });
        };
      });
    },

    clear: function () {
      return withStore('readwrite', function (store) { store.clear(); });
    },

    count: function () {
      return withStore('readonly', function (store, done) {
        var request = store.count();
        request.onsuccess = function () { done(request.result || 0); };
      });
    }
  };
})(window, document);
