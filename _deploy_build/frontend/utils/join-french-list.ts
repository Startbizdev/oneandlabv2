/**
 * Joint des libellés pour affichage français : « A et B » ou « A, B et C ».
 */
export function joinFrenchAndList(items: string[]): string {
  const names = items.map((s) => String(s).trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} et ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]!}`;
}
