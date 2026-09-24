/* Kleines Prüfgerüst ohne Fremdbibliotheken.

   Die Spiele laufen im Browser, ihre Regeln sind aber bewusst in eigene
   Dateien ohne Oberfläche ausgelagert – genau die lassen sich hier direkt in
   Node laden und durchrechnen. Für app.js, das ein Dokument erwartet, steht
   eine Attrappe bereit, die gerade genug kann. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* ---------- Dokument-Attrappe ---------- */

function fakeElement(tag) {
  const children = [];
  const element = {
    tagName: String(tag || 'div').toUpperCase(),
    style: {},
    dataset: {},
    className: '',
    textContent: '',
    value: '',
    hidden: false,
    disabled: false,
    files: [],
    children,
    classList: {
      add() {}, remove() {}, toggle() {}, contains() { return false; }
    },
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    appendChild(child) { children.push(child); return child; },
    removeChild() {}, insertBefore() {}, remove() {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; },
    focus() {}, click() {}, showModal() {}, close() {}
  };
  return element;
}

function fakeDocument() {
  const document = fakeElement('document');
  document.documentElement = fakeElement('html');
  document.body = fakeElement('body');
  document.head = fakeElement('head');
  document.readyState = 'complete';
  document.hidden = false;
  document.createElement = (tag) => fakeElement(tag);
  document.createElementNS = (ns, tag) => fakeElement(tag);
  document.getElementById = () => null;
  return document;
}

function fakeWindow() {
  const document = fakeDocument();
  const window = {
    document,
    navigator: { vibrate() {}, userAgent: 'node', share: undefined },
    location: { href: 'http://localhost/', hash: '', origin: 'http://localhost' },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {} }),
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    addEventListener() {}, removeEventListener() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    indexedDB: undefined,
    console
  };
  window.window = window;
  window.self = window;
  window.globalThis = window;
  return window;
}

/* Lädt die genannten Projektdateien in eine frische Umgebung und gibt TG
   zurück. Jeder Test bekommt seine eigene – so färbt keiner auf den nächsten ab. */
function load(...files) {
  const window = fakeWindow();
  const context = vm.createContext(window);

  for (const file of files) {
    const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  }

  return window.TG || {};
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

/* Alle Dateien im Projekt, ohne .git und die Tests selbst. */
function projectFiles(extensions) {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'tests') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (!extensions || extensions.some((ext) => entry.name.endsWith(ext))) {
        out.push(path.relative(ROOT, full));
      }
    }
  })(ROOT);
  return out.sort();
}

/* ---------- Behauptungen ---------- */

function createChecker() {
  const failures = [];
  let count = 0;

  const t = {
    ok(label, condition, detail) {
      count++;
      if (!condition) failures.push({ label, detail });
    },
    equal(label, actual, expected) {
      count++;
      const same = JSON.stringify(actual) === JSON.stringify(expected);
      if (!same) failures.push({ label, detail: `erwartet ${JSON.stringify(expected)}, bekommen ${JSON.stringify(actual)}` });
    },
    near(label, actual, expected, tolerance) {
      count++;
      if (Math.abs(actual - expected) > (tolerance || 0)) {
        failures.push({ label, detail: `${actual} statt ${expected} (±${tolerance || 0})` });
      }
    },
    throws(label, fn) {
      count++;
      let threw = false;
      try { fn(); } catch (e) { threw = true; }
      if (!threw) failures.push({ label, detail: 'kein Fehler ausgelöst' });
    }
  };

  return { t, failures, total: () => count };
}

module.exports = { ROOT, load, read, projectFiles, createChecker, fakeWindow, fakeDocument, fakeElement };
