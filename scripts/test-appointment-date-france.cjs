const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
function load(relative) {
  const file = path.resolve(__dirname, '..', relative);
  const compiled = new Module(file);
  compiled.require = name => name === '@oneandlab/shared-utils'
    ? { ...dates, ...passage }
    : name === './appointment-date-france' ? dates
    : name === '@oneandlab/shared-types' ? load('packages/shared-types/src/nurse-passage.ts')
    : name === '~/utils/patient-urgency-display' || name === './patient-urgency-display'
      ? { formatPatientUrgentCreneauShortFr: () => '', isPatientVipSlotShortLabel: () => false }
      : require(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, file);
  return compiled.exports;
}
const dates = load('packages/shared-utils/src/appointment-date-france.ts');
const passage = load('packages/shared-utils/src/nurse-passage-display.ts');
const display = load('frontend/utils/appointment-datetime-fr.ts');
const mobile = load('apps/mobile/src/utils/appointment-datetime-fr.ts');
const mobileParis = load('apps/mobile/src/utils/paris-datetime.ts');
let checks = 0;
const equal = (actual, expected) => { assert.equal(actual, expected); checks++; };
const previousZone = process.env.TZ;
const previousNow = Date.now;
try {
  for (const zone of ['UTC', 'Asia/Dubai', 'America/Los_Angeles']) {
    process.env.TZ = zone;
    equal(dates.appointmentDayFrance('2026-10-31T23:15:00Z'), '2026-11-01');
    equal(dates.appointmentDayFrance('2026-10-31 23:45:00'), '2026-10-31');
    equal(dates.appointmentTimeFrance('2026-10-31T23:15:00Z'), '00:15');
    for (const [input, expected] of [
      ['2026-10-15 09:15:00','2026-10-15T07:15:00.000Z'],
      ['2026-12-31 23:45:00','2026-12-31T22:45:00.000Z'],
      ['2026-07-01 23:45:00','2026-07-01T21:45:00.000Z'],
      ['2026-07-01','2026-06-30T22:00:00.000Z'],
      ['2026-10-15T09:15:00Z','2026-10-15T09:15:00.000Z'],
      ['2026-10-15T09:15:00+04:00','2026-10-15T05:15:00.000Z'],
      ['2026-10-15 09:15:00.123456','2026-10-15T07:15:00.123Z'],
    ]) equal(dates.parseAppointmentDateFrance(input).toISOString(), expected);
    for (const adapter of [display, mobile]) {
      equal(adapter.formatAvailabilityDisplayFr(null, '2026-10-15 09:15:00'), '09:15');
      equal(adapter.formatAvailabilityDisplayFr({type:'custom',start:'09:15',end:'10:45'}, '2026-10-15 09:15:00'), 'Créneau 09:15 - 10:45');
      equal(adapter.formatAvailabilityDisplayFr({type:'custom',range:[8.5,10.25]}), 'Créneau 08:30 - 10:15');
      equal(adapter.formatAvailabilityDisplayFr({type:'custom',range:[8,10]}), '8h00 - 10h00');
      equal(adapter.formatAvailabilityDisplayFr({type:'all_day'}), 'Toute la journée');
      equal(adapter.formatAvailabilityDisplayFr(null, '2026-10-15 09:15:00', { passage_source: 'nurse_passage', passage_time_slot: 'custom' }), '09h15');
      equal(adapter.formatAvailabilityDisplayFr(null, '2026-10-15T07:15:00Z', { passage_source: 'nurse_passage', passage_time_slot: 'custom' }), '09h15');
    }
    equal(mobile.formatFrenchWeekdayDate('2026-07-01 00:15:00'), 'Mercredi 1 juillet 2026');
    equal(mobile.formatFrenchWeekdayDate('2026-06-30T22:15:00Z'), 'Mercredi 1 juillet 2026');
    equal(mobile.formatAppointmentDateTime('2026-07-01 00:15:00'), 'mercredi 1 juillet 2026 · 00:15');
    equal(mobile.formatAppointmentDateShort('2026-07-01 00:15:00'), 'mer. 1 juil. · 00:15');
    equal(new Date(mobileParis.parseParisWallClock('2026-07-01')).toISOString(), '2026-06-30T22:00:00.000Z');
    equal(mobileParis.parseParisWallClock('2026-03-29 02:30:00'), null);
    const appointment = {scheduled_at:'2026-10-15 09:15:00', form_data:{availability:{type:'custom',start:'09:15',end:'10:45'}}};
    Date.now = () => Date.parse('2026-10-15T08:40:00Z');
    equal(display.isAppointmentSlotEndedForPreleveurTournee(appointment), false);
    Date.now = () => Date.parse('2026-10-15T08:46:00Z');
    equal(display.isAppointmentSlotEndedForPreleveurTournee(appointment), true);
    equal(display.formatAppointmentWhenForSms({scheduled_at:'2026-07-01 00:15:00'}).includes('1 juillet 2026 à 00:15'), true);
  }
  for (const input of ['2026-02-30 09:00:00','2026-03-29 02:30:00','2026-10-15 25:00:00','not-a-date',null]) equal(Number.isNaN(dates.parseAppointmentDateFrance(input).getTime()), true);
} finally {
  Date.now = previousNow;
  if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone;
}
console.log(`${checks} assertions passed: France wall clocks, explicit offsets, minute-preserving availability and tour end times across three device timezones.`);
