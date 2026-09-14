#!/usr/bin/env node

/** Smoke check aligné sur PendingOfferExpiry.php (fuseau Europe/Paris). */

const TTL = 2;
const OFF_START = 18;
const OFF_END = 6;

function computeExpiresAtParis(createdYmdHis) {
  const [datePart, timePart] = createdYmdHis.split(' ');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm, ss] = timePart.split(':').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, hh - 2, mm, ss));
  const parisHour = (utc.getUTCHours() + 2) % 24;
  const isOff = parisHour >= OFF_START || parisHour < OFF_END;
  if (!isOff) {
    const out = new Date(utc.getTime() + TTL * 3600_000);
    return `${out.getUTCFullYear()}-${String(out.getUTCMonth() + 1).padStart(2, '0')}-${String(out.getUTCDate()).padStart(2, '0')} ${String((out.getUTCHours() + 2) % 24).padStart(2, '0')}:${String(out.getUTCMinutes()).padStart(2, '0')}:00`;
  }
  let day = d;
  if (parisHour >= OFF_START) day += 1;
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(OFF_END + TTL).padStart(2, '0')}:00:00`;
}

const cases = [
  ['2026-09-10 14:00:00', '2026-09-10 16:00:00'],
  ['2026-09-10 22:00:00', '2026-09-11 08:00:00'],
  ['2026-09-10 05:30:00', '2026-09-10 08:00:00'],
];

let ok = 0;
for (const [created, expected] of cases) {
  const got = computeExpiresAtParis(created);
  const pass = got === expected;
  console.log(`${pass ? 'OK' : 'FAIL'} ${created} -> ${got} (attendu ${expected})`);
  if (pass) ok += 1;
}
process.exit(ok === cases.length ? 0 : 1);
