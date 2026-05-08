import type { CampaignItem, CreativeFormat } from './types';
import type { UploadManifestEntry } from '../../storage/uploadManifest';

export interface MediaLibraryRow {
  id: string;
  fileName: string;
  advertiser: string;
  product: string;
  /** When set, preview can load from IndexedDB. */
  blobKey?: string;
  thumbnailDataUrl?: string;
}

const EXTRA_LIBRARY: MediaLibraryRow[] = [
  { id: 'lib-x-1', fileName: 'Tine_Melk_20s_master.mov', advertiser: 'Tine SA', product: 'Melk · sommerkampanje' },
  { id: 'lib-x-2', fileName: 'REMA1000_Pris_15s_H264.mov', advertiser: 'Reitan Distribution AS', product: 'Lavpris · uke 42' },
  { id: 'lib-x-3', fileName: 'Equinor_WindFarm_30s.mov', advertiser: 'Equinor ASA', product: 'Fornybar · image' },
  { id: 'lib-x-4', fileName: 'Vy_Toget_6s_bumper.mp4', advertiser: 'Vy Gruppen AS', product: 'Kollektiv · påske' },
  { id: 'lib-x-5', fileName: 'Fjordkraft_Hjem_45s.mov', advertiser: 'Fjordkraft AS', product: 'Strøm · innflytting' },
  { id: 'lib-x-6', fileName: 'NRK_Nyheter_bumper_8s.mov', advertiser: 'NRK', product: 'Nyhetsident · allment' },
];

function fileExtForCreative(format: CreativeFormat): string {
  if (format === 'display') return 'html5.zip';
  if (format === 'video') return 'mp4';
  return 'mov';
}

function manifestToRows(entries: UploadManifestEntry[]): MediaLibraryRow[] {
  return entries.map(e => ({
    id: e.id,
    fileName: e.fileName ?? '—',
    advertiser: e.advertiser ?? '—',
    product: e.product ?? '—',
    blobKey: e.blobKey,
    thumbnailDataUrl: e.thumbnailDataUrl,
  }));
}

/** Merge user uploads, creatives from campaigns, and curated dummy rows. */
export function getMediaLibraryRows(campaigns: CampaignItem[], uploads: UploadManifestEntry[]): MediaLibraryRow[] {
  const uploadedCreativeIds = new Set(uploads.map(u => u.creativeId));
  const fromCampaigns: MediaLibraryRow[] = [];
  for (const c of campaigns) {
    for (const ol of c.orderLines) {
      for (const fl of ol.flights) {
        const cr = fl.creative;
        if (!cr) continue;
        if (uploadedCreativeIds.has(cr.id)) continue;
        const ext = fileExtForCreative(cr.format);
        const safe = cr.name.replace(/\s+/g, '_').replace(/[^\w.-]+/g, '');
        fromCampaigns.push({
          id: `lib-${cr.id}`,
          fileName: `${safe || 'spot'}.${ext}`,
          advertiser: c.advertiser || '—',
          product: `${c.name} · ${fl.name}`,
          blobKey: cr.mediaBlobKey,
          thumbnailDataUrl: cr.thumbnailDataUrl,
        });
      }
    }
  }
  const seen = new Set<string>();
  const out: MediaLibraryRow[] = [];
  for (const row of [...manifestToRows(uploads), ...fromCampaigns, ...EXTRA_LIBRARY]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}
