import { cachePdfFromBase64 } from './cache-pdf-base64';
import { openLocalFile } from './open-local-file';

export async function sharePdfFromBase64(
  base64: string,
  fileName: string,
): Promise<{ ok: boolean; localUri?: string; error?: string }> {
  const cached = await cachePdfFromBase64(base64, fileName);
  if (!cached.ok || !cached.localUri) {
    return { ok: false, error: cached.error };
  }

  const opened = await openLocalFile(cached.localUri, fileName);
  if (!opened.ok) {
    return { ok: false, error: opened.error };
  }
  return { ok: true, localUri: cached.localUri };
}
