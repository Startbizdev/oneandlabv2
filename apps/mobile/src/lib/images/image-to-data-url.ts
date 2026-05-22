import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const MAX_DATA_URL_BYTES = 900 * 1024;
const MAX_WIDTH = 1200;

/**
 * Compresse une image locale et la convertit en data URL JPEG (comme le web ProfileImagesBlock).
 */
export async function imageUriToDataUrl(uri: string): Promise<string> {
  let quality = 0.85;
  let width = MAX_WIDTH;

  for (let attempt = 0; attempt < 6; attempt++) {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
    );

    const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    if (dataUrl.length <= MAX_DATA_URL_BYTES) {
      return dataUrl;
    }

    quality = Math.max(0.35, quality - 0.12);
    width = Math.max(400, Math.round(width * 0.82));
  }

  const last = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 400 } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG },
  );
  const base64 = await FileSystem.readAsStringAsync(last.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
}
