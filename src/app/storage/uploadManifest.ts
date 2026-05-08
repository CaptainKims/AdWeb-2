import { idbGet, idbSet } from './idbKvStore';

const MANIFEST_KEY = 'adweb_upload_manifest';

export interface UploadManifestEntry {
  id: string;
  creativeId: string;
  blobKey: string;
  fileName: string;
  advertiser: string;
  product: string;
  thumbnailDataUrl?: string;
}

export function creativeBlobStorageKey(creativeId: string): string {
  return `media:${creativeId}`;
}

export async function loadUploadManifest(): Promise<UploadManifestEntry[]> {
  try {
    const raw = await idbGet(MANIFEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is UploadManifestEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as UploadManifestEntry).id === 'string' &&
        typeof (e as UploadManifestEntry).blobKey === 'string'
    );
  } catch {
    return [];
  }
}

export async function saveUploadManifest(entries: UploadManifestEntry[]): Promise<void> {
  await idbSet(MANIFEST_KEY, JSON.stringify(entries));
}

export async function upsertUploadManifestEntry(entry: UploadManifestEntry): Promise<void> {
  const list = await loadUploadManifest();
  const idx = list.findIndex(e => e.creativeId === entry.creativeId || e.id === entry.id);
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  await saveUploadManifest(list);
}
