const mockFiles = new Map<string, number>();
const mockResize = jest.fn();
const mockSaveAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  getInfoAsync: jest.fn(async (uri: string) =>
    mockFiles.has(uri) ? { exists: true, size: mockFiles.get(uri) } : { exists: false },
  ),
  copyAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    mockFiles.set(to, mockFiles.get(from) ?? 0);
  }),
  readAsStringAsync: jest.fn(async () => '/9j/4AAQSkZJRgABAQ=='),
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: jest.fn(() => {
      let size = { width: 4032, height: 3024 };
      const context = {
        resize: (target: { width?: number; height?: number }) => {
          mockResize(target);
          size = { width: target.width ?? 2560, height: target.height ?? 1920 };
          return context;
        },
        renderAsync: async () => ({
          ...size,
          saveAsync: async (options: unknown) => {
            mockSaveAsync(options);
            mockFiles.set('file:///cache/reencoded.jpg', 900_000);
            return { uri: 'file:///cache/reencoded.jpg', ...size };
          },
        }),
      };
      return context;
    }),
  },
}));

import { prepareMedicalUploadFile } from '../uploads/prepare-upload-file';

describe('prepareMedicalUploadFile', () => {
  beforeEach(() => {
    mockFiles.clear();
    mockResize.mockClear();
    mockSaveAsync.mockClear();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('converts a HEIC gallery photo to a resized JPEG', async () => {
    mockFiles.set('file:///picker/IMG_0001.HEIC', 2_000_000);

    const out = await prepareMedicalUploadFile({
      uri: 'file:///picker/IMG_0001.HEIC',
      fileName: 'IMG_0001.HEIC',
      mimeType: 'image/heic',
    });

    expect(out).toMatchObject({
      uri: 'file:///cache/reencoded.jpg',
      fileName: 'IMG_0001.jpg',
      mimeType: 'image/jpeg',
    });
    expect(mockResize).toHaveBeenCalledWith({ width: 2560 });
    expect(mockSaveAsync).toHaveBeenCalledWith({ compress: 0.8, format: 'jpeg' });
  });

  it('recompresses a JPEG heavier than 4 MB', async () => {
    mockFiles.set('file:///picker/big.jpg', 9_000_000);

    const out = await prepareMedicalUploadFile({
      uri: 'file:///picker/big.jpg',
      fileName: 'big.jpg',
      mimeType: 'image/jpeg',
    });

    expect(out.uri).toBe('file:///cache/reencoded.jpg');
    expect(mockSaveAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps a light JPEG and a PDF untouched', async () => {
    mockFiles.set('file:///picker/light.jpg', 800_000);
    mockFiles.set('file:///picker/ordonnance.pdf', 300_000);

    const photo = await prepareMedicalUploadFile({
      uri: 'file:///picker/light.jpg',
      fileName: 'light.jpg',
      mimeType: 'image/jpeg',
    });
    const pdf = await prepareMedicalUploadFile({
      uri: 'file:///picker/ordonnance.pdf',
      fileName: 'ordonnance.pdf',
      mimeType: 'application/pdf',
    });

    expect(photo.mimeType).toBe('image/jpeg');
    expect(photo.uri).toMatch(/^file:\/\/\/cache\/medical-upload-\d+-light\.jpg$/);
    expect(pdf.mimeType).toBe('application/pdf');
    expect(mockSaveAsync).not.toHaveBeenCalled();
  });
});
