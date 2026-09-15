const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function compile(relative,deps={}){const file=path.resolve(__dirname,'..',relative);const m=new Module(file);m.require=n=>deps[n]??require(n);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);return m.exports;}
const clock=compile('packages/shared-utils/src/booking-paris-clock.ts');
const limits=compile('packages/shared-constants/src/availability.ts');
assert.equal(limits.AVAILABILITY_MAX_HOUR_BLOOD_TEST,17);
assert.equal(limits.AVAILABILITY_MAX_HOUR_NURSING,22);
for(const TZ of ['Europe/Paris','Asia/Dubai','America/New_York']){
 process.env.TZ=TZ;
 for(const [instant,ymd,hour] of [['2026-09-15T12:30:00Z','2026-09-15',15],['2026-01-15T12:30:00Z','2026-01-15',14],['2026-09-15T22:30:00Z','2026-09-16',1]]){
  const at=Date.parse(instant);assert.deepEqual(clock.parisBookingClock(at),{date:ymd,nextHour:hour});
  assert.equal(clock.bookingSlotMinHourParis(ymd,22,6,at),Math.max(6,hour));
  assert.equal(clock.bookingSlotMinHourParis('2026-10-01',22,6,at),6);
 }
 const closed=Date.parse('2026-09-15T18:30:00Z');
 assert.equal(clock.bookingSlotMinHourParis('2026-09-15',17,6,closed),17,'No fake past 16–17 slot after closing');
 assert.equal(clock.bookingSlotMinHourParis('2026-09-15',22,6,closed),21);
}
const native=compile('apps/mobile/src/features/appointments/form/utils/booking-availability-utils.ts',{'@oneandlab/shared-utils':{...clock,isBloodTestAppointment:t=>t==='blood_test'},'@oneandlab/shared-constants':limits});
assert.equal(native.availabilityMaxHour('blood_test'),17);assert.equal(native.availabilityMaxHour('nursing'),22);
assert.equal(native.isAvailabilityRangeValid(native.clampAvailabilityRange(9,11,17,17)),false);
console.log('Paris summer/winter/midnight, 3 device timezones, original limits and closed-slot validation passed.');
