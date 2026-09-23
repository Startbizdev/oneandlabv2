import assert from 'node:assert/strict';
import test from 'node:test';
import { runPharmacyModuleAccessTests } from '../src/pharmacy-module-access.test.ts';

runPharmacyModuleAccessTests(
  (name, fn) => test(name, fn),
  assert,
);
