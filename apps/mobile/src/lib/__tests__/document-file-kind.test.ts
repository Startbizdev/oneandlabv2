import {
  isImageFileName,
  isPdfFileName,
  resolveDocumentPreviewKind,
} from '../downloads/document-file-kind';

describe('document-file-kind', () => {
  describe('isPdfFileName', () => {
    it('detects pdf extension case-insensitively', () => {
      expect(isPdfFileName('ordonnance.PDF')).toBe(true);
      expect(isPdfFileName('scan.pdf')).toBe(true);
    });

    it('rejects non-pdf names', () => {
      expect(isPdfFileName('photo.jpg')).toBe(false);
      expect(isPdfFileName(null)).toBe(false);
    });
  });

  describe('isImageFileName', () => {
    it('accepts common image extensions', () => {
      expect(isImageFileName('a.jpeg')).toBe(true);
      expect(isImageFileName('b.PNG')).toBe(true);
      expect(isImageFileName('c.heic')).toBe(true);
    });

    it('rejects pdf and empty', () => {
      expect(isImageFileName('doc.pdf')).toBe(false);
      expect(isImageFileName(undefined)).toBe(false);
    });
  });

  describe('resolveDocumentPreviewKind', () => {
    it('prefers pdf over default image', () => {
      expect(resolveDocumentPreviewKind('x.pdf')).toBe('pdf');
    });

    it('defaults to image for non-pdf', () => {
      expect(resolveDocumentPreviewKind('x.webp')).toBe('image');
    });
  });
});
