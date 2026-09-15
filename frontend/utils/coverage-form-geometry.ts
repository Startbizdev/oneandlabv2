import { ensureSixVertices, maxVertexDistanceKm, offsetPointByKm, planarBearingDeg, planarDistanceKm, type CoverageVertex } from '@oneandlab/shared-utils';

/** Preserve the drawn shape when its centre or maximum reach is edited. */
export function coverageFormVertices(
  center: CoverageVertex,
  radiusKm: number,
  vertices: CoverageVertex[] | null,
  sourceCenter: CoverageVertex | null,
): CoverageVertex[] {
  const origin = sourceCenter ?? center;
  const shape = ensureSixVertices(origin, vertices, radiusKm);
  const currentRadius = maxVertexDistanceKm(origin, shape);
  if (!(currentRadius > 0) || !(radiusKm > 0) || !Number.isFinite(radiusKm)) {
    throw new Error('Vérifiez la portée du secteur.');
  }
  return shape.map(vertex => offsetPointByKm(center,
    planarDistanceKm(origin, vertex) * radiusKm / currentRadius,
    planarBearingDeg(origin, vertex)));
}
