const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
function load(relative) {
  const file = path.resolve(__dirname, '..', relative);
  const compiled = new Module(file);
  compiled.require = name => name === '@oneandlab/shared-utils' ? geo : require(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
  return compiled.exports;
}
const geo = load('packages/shared-utils/src/coverage-zone-geo.ts');
const { coverageFormVertices } = load('frontend/utils/coverage-form-geometry.ts');
const center = { lat: 48.85, lng: 2.35 };
const next = { lat: 43.3, lng: 5.4 };
const source = geo.defaultSquareVertices(center, 10);
source[1] = geo.offsetPointByKm(center, 6, 5);
const original = JSON.stringify(source);
const moved = coverageFormVertices(next, 25, source, center);
assert.equal(moved.length, 6);
assert.ok(Math.abs(geo.maxVertexDistanceKm(next, moved) - 25) < 1e-8);
assert.equal(JSON.stringify(source), original);
for (let i = 0; i < source.length; i++) {
  assert.ok(Math.abs(geo.planarBearingDeg(next, moved[i]) - geo.planarBearingDeg(center, source[i])) < 1e-8);
}
const fresh = coverageFormVertices(center, 20, null, null);
assert.ok(Math.abs(geo.maxVertexDistanceKm(center, fresh) - 20) < 1e-8);
assert.throws(() => coverageFormVertices(center, NaN, source, center));
console.log('11 assertions passed: preserved polygon bearings, exact maximum reach, centre relocation and invalid range.');
