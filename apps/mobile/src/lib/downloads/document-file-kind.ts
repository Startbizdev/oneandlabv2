export function isPdfFileName(fileName?: string | null): boolean {
  return String(fileName ?? '').toLowerCase().endsWith('.pdf');
}

export function isImageFileName(fileName?: string | null): boolean {
  const lower = String(fileName ?? '').toLowerCase();
  return /\.(jpe?g|png|webp|heic|heif|gif)$/.test(lower);
}

export function resolveDocumentPreviewKind(fileName?: string | null): 'pdf' | 'image' {
  if (isPdfFileName(fileName)) return 'pdf';
  return 'image';
}
