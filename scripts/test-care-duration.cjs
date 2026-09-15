const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
function load(relative) {
  const file = path.resolve(__dirname, '..', relative);
  const compiled = new Module(file);
  compiled.require = name => name === '@oneandlab/shared-utils' ? shared : name === '@oneandlab/shared-types' ? {} : require(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
  return compiled.exports;
}
const shared = load('packages/shared-utils/src/care-duration.ts');
const cases = [[7,null,7],[' 7 ',null,7],[1,null,1],['custom','14',14],['60+',null,60],['to_define',null,null],[null,null,null],[{},null,null],['7bad',null,null],[-1,null,null],[2.5,null,null],['custom',Infinity,null],['custom','',null],['custom',{},null]];
let checks = 0;
for (const file of ['frontend/utils/passage-planning.ts','apps/mobile/src/features/nurse-passage/utils/passage-planning.ts']) {
  const planning = load(file);
  for (const [duration_days,custom_days,expected] of cases) {
    assert.equal(planning.careItemDurationDays({ duration_days, custom_days }),expected);
    checks++;
  }
  assert.equal(planning.maxCareDurationDays([{ duration_days: 7 }, { duration_days: 'custom', custom_days: '14' }]),14);
  checks++;
}
console.log(`${checks} assertions passed: web/native planning with numeric, textual, custom and invalid durations.`);
