import * as FileSystem from 'expo-file-system/legacy';

const TAG = '[MedDoc]';

export type MedDocFileInspect = {
  label: string;
  uri: string;
  exists: boolean;
  size: number | null;
  magic: string;
  headHex: string;
};

function detectMagic(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'JPEG';
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'PNG';
  }
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'PDF';
  }
  if (bytes.length >= 12) {
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (ftyp === 'ftyp') return 'HEIC/MP4';
  }
  if (bytes.every((b) => b === 0)) return 'ALL_ZEROS';
  return 'UNKNOWN';
}

async function readHeadBytes(uri: string, max = 16): Promise<Uint8Array> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    const buf = await blob.slice(0, max).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const slice = b64.slice(0, 32);
    const bin = atob(slice);
    const out = new Uint8Array(Math.min(bin.length, max));
    for (let i = 0; i < out.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
}

/** Logs détaillés pour tracer photos noires / uploads — filtrer Metro avec `MedDoc`. */
export function logMedDoc(step: string, data?: Record<string, unknown>): void {
  if (data) {
    console.warn(TAG, step, data);
  } else {
    console.warn(TAG, step);
  }
}

export async function inspectMedDocFile(uri: string, label: string): Promise<MedDocFileInspect> {
  const info = await FileSystem.getInfoAsync(uri);
  const exists = info.exists;
  const size = exists && 'size' in info && info.size != null ? info.size : null;

  let headHex = '';
  let magic = 'NO_FILE';
  if (exists) {
    try {
      const head = await readHeadBytes(uri);
      headHex = Array.from(head)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      magic = detectMagic(head);
    } catch (e) {
      headHex = `err:${e instanceof Error ? e.message : String(e)}`;
      magic = 'READ_FAIL';
    }
  }

  const row: MedDocFileInspect = {
    label,
    uri,
    exists,
    size,
    magic,
    headHex,
  };
  logMedDoc(`inspect:${label}`, row);
  return row;
}

export async function inspectMedDocFilePair(
  beforeUri: string,
  afterUri: string,
  label: string,
): Promise<void> {
  logMedDoc(`pair:${label}:START`);
  await inspectMedDocFile(beforeUri, `${label}:before`);
  await inspectMedDocFile(afterUri, `${label}:after`);
  logMedDoc(`pair:${label}:END`);
}
