#!/usr/bin/env node
/* Alle Prüfungen ausführen: node tests/run.js
   Mit einem Namen als Argument nur die passenden: node tests/run.js dame */
'use strict';

const fs = require('fs');
const path = require('path');
const { createChecker } = require('./harness.js');

const filter = process.argv[2] || '';
const files = fs.readdirSync(__dirname)
  .filter((name) => name.endsWith('.test.js'))
  .filter((name) => !filter || name.includes(filter))
  .sort();

if (!files.length) {
  console.log(filter ? `Keine Prüfung passt auf "${filter}".` : 'Keine Prüfungen gefunden.');
  process.exit(1);
}

let checks = 0;
let failed = 0;
const started = Date.now();

for (const file of files) {
  const suite = require(path.join(__dirname, file));
  const { t, failures, total } = createChecker();

  try {
    suite.run(t);
  } catch (error) {
    failures.push({ label: 'Prüfung abgebrochen', detail: error && error.stack ? error.stack.split('\n')[0] : String(error) });
  }

  checks += total();
  failed += failures.length;

  const name = (suite.name || file).padEnd(22);
  if (failures.length) {
    console.log(`FEHL  ${name} ${total() - failures.length}/${total()}`);
    for (const failure of failures) {
      console.log(`      · ${failure.label}${failure.detail ? ' – ' + failure.detail : ''}`);
    }
  } else {
    console.log(`ok    ${name} ${total()} Prüfungen`);
  }
}

console.log('');
console.log(failed
  ? `${failed} von ${checks} Prüfungen fehlgeschlagen (${Date.now() - started} ms)`
  : `alle ${checks} Prüfungen bestanden (${Date.now() - started} ms)`);

process.exit(failed ? 1 : 0);
