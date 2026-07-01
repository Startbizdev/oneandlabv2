/** Compare deux versions semver (ex. 1.4.0). Retourne -1 si a < b, 0 si égal, 1 si a > b. */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string) =>
    value
      .replace(/^v/i, '')
      .split(/[.-]/)
      .map((part) => {
        const n = parseInt(part, 10);
        return Number.isFinite(n) ? n : 0;
      });

  const left = parse(a);
  const right = parse(b);
  const len = Math.max(left.length, right.length);

  for (let i = 0; i < len; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

export function isVersionLower(current: string, minimum: string): boolean {
  return compareVersions(current, minimum) < 0;
}
