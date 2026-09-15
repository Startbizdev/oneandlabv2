const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const file = path.resolve(__dirname, '../frontend/utils/duration-display.ts');
const compiled = new Module(file);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const { formatBloodTestSeriesDurationDays: format } = compiled.exports;
for (const [input, custom, expected] of [[14,null,'14 jours'],[' 14 ',null,'14 jours'],[1,null,'1 jour'],['custom',1,'1 jour'],['custom',15,'15 jours'],['custom',null,'Durée personnalisée'],[undefined,null,''],[null,null,''],[NaN,null,''],[Infinity,null,''],[0,null,''],[{},null,'']]) {
  assert.equal(format(input,custom),expected);
}
console.log('12 assertions passed: numeric/text legacy durations, singular day, custom duration and missing/invalid data.');
