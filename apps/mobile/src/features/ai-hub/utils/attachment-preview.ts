export function isPdfMime(mimeType: string, fileName?: string): boolean {
  if (mimeType.toLowerCase().includes('pdf')) return true;
  return String(fileName ?? '').toLowerCase().endsWith('.pdf');
}
