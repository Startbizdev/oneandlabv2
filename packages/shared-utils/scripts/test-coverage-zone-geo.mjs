/**
 * Tests geo zones carrées (Node, sans Vitest).
 * Usage: node packages/shared-utils/scripts/test-coverage-zone-geo.mjs
 */

import {
  halfSideKmToBounds,
  boundsToHalfSideKm,
  isPointInBounds,
  boundsAreSquareConsistent,
  clampHalfSideKm,
  resizeSquareFromCorner,
  resolveZoneBounds,
  MIN_HALF_SIDE_KM,
} from '../src/coverage-zone-geo.ts';

function assert(cond, msg) {
  if (!cond) {
    console.error('[FAIL]', msg);
    process.exit(1);
  }
  console.log('[OK]', msg);
}

const center = { lat: 48.8566, lng: 2.3522 };
const half = 15;

const bounds = halfSideKmToBounds(center, half);
assert(isPointInBounds(center, bounds), 'Centre dans bounds');
assert(
  isPointInBounds({ lat: center.lat + 0.05, lng: center.lng }, bounds),
  'Point proche dans bounds',
);
assert(
  !isPointInBounds({ lat: 50.0, lng: 3.0 }, bounds),
  'Lille hors bounds Paris',
);

const roundTrip = boundsToHalfSideKm(center, bounds);
assert(Math.abs(roundTrip - half) < 0.5, 'Round-trip demi-côté ~15 km');

assert(boundsAreSquareConsistent(center, bounds), 'Bounds cohérents');

assert(clampHalfSideKm(25, 20) === 20, 'Clamp max plan 20');
assert(clampHalfSideKm(3, 100) === MIN_HALF_SIDE_KM, 'Clamp min 5 km');

const resized = resizeSquareFromCorner(
  center,
  { lat: center.lat + 0.2, lng: center.lng + 0.2 },
  100,
);
assert(resized.halfSideKm >= MIN_HALF_SIDE_KM, 'Resize depuis coin');

const legacy = resolveZoneBounds('square', center, 20, null);
assert(isPointInBounds(center, legacy), 'Legacy sans bounds_json → carré depuis radius');

console.log('\n=== Tous les tests shared-utils OK ===');
