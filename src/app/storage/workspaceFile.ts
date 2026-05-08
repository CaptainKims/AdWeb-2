import type { CampaignItem, StickyNoteData } from '../components/workspace/types';
import type { WorkspacePrimaryMode } from '../components/workspace/workspaceTypes';
import type { UploadManifestEntry } from './uploadManifest';

/** Served from `public/` — commit this file so the team shares the same workspace state. */
export const WORKSPACE_JSON_PATH = '/adweb-workspace.json';

const LS_LAST_APPLIED_REVISION = 'adweb_workspace_applied_revision';

export interface WorkspaceFilePayload {
  /** Schema version for forward-compatible parsing. */
  version: number;
  /** Increases when the workspace file is saved (dev server) or edited manually. Production loads use this to decide whether to replace IndexedDB from the bundled JSON. */
  revision: number;
  campaigns: CampaignItem[];
  workspaceMode: WorkspacePrimaryMode;
  timelinePixelsPerDay: number;
  stickyNotes: StickyNoteData[];
  uploadManifest: UploadManifestEntry[];
}

function isWorkspacePrimaryMode(v: unknown): v is WorkspacePrimaryMode {
  return v === 'list' || v === 'timeline';
}

export function parseWorkspacePayload(raw: unknown): WorkspaceFilePayload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const version = o.version;
  const revision = o.revision;
  const campaigns = o.campaigns;
  const workspaceMode = o.workspaceMode;
  const timelinePixelsPerDay = o.timelinePixelsPerDay;
  const stickyNotes = o.stickyNotes;
  const uploadManifest = o.uploadManifest;
  if (typeof version !== 'number' || version < 1) return null;
  if (typeof revision !== 'number' || !Number.isFinite(revision)) return null;
  if (!Array.isArray(campaigns)) return null;
  if (!isWorkspacePrimaryMode(workspaceMode)) return null;
  if (typeof timelinePixelsPerDay !== 'number' || !Number.isFinite(timelinePixelsPerDay)) return null;
  if (!Array.isArray(stickyNotes)) return null;
  if (!Array.isArray(uploadManifest)) return null;
  return {
    version,
    revision,
    campaigns: campaigns as CampaignItem[],
    workspaceMode,
    timelinePixelsPerDay,
    stickyNotes: stickyNotes as StickyNoteData[],
    uploadManifest: uploadManifest as UploadManifestEntry[],
  };
}

export async function fetchWorkspacePayload(): Promise<WorkspaceFilePayload | null> {
  try {
    const bust = import.meta.env.DEV ? `?t=${Date.now()}` : '';
    const res = await fetch(`${WORKSPACE_JSON_PATH}${bust}`, { cache: import.meta.env.DEV ? 'no-store' : 'default' });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return parseWorkspacePayload(json);
  } catch {
    return null;
  }
}

/** In production, only apply bundled JSON when its revision is newer than what we last applied (deploy / git pull). In dev, callers should apply whenever fetch succeeds. */
export function shouldApplyBundledWorkspace(payload: WorkspaceFilePayload): boolean {
  if (import.meta.env.DEV) return true;
  const stored = Number(localStorage.getItem(LS_LAST_APPLIED_REVISION) || '0');
  return payload.revision > stored;
}

export function markBundledWorkspaceApplied(payload: WorkspaceFilePayload): void {
  try {
    localStorage.setItem(LS_LAST_APPLIED_REVISION, String(payload.revision));
  } catch {
    // ignore quota / private mode
  }
}

export function buildWorkspacePayload(input: {
  campaigns: CampaignItem[];
  workspaceMode: WorkspacePrimaryMode;
  timelinePixelsPerDay: number;
  stickyNotes: StickyNoteData[];
  uploadManifest: UploadManifestEntry[];
  revision: number;
  version?: number;
}): WorkspaceFilePayload {
  return {
    version: input.version ?? 1,
    revision: input.revision,
    campaigns: input.campaigns,
    workspaceMode: input.workspaceMode,
    timelinePixelsPerDay: input.timelinePixelsPerDay,
    stickyNotes: input.stickyNotes,
    uploadManifest: input.uploadManifest,
  };
}

export function downloadWorkspacePayload(payload: WorkspaceFilePayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'adweb-workspace.json';
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}

export async function postWorkspacePayloadToDevServer(payload: WorkspaceFilePayload): Promise<boolean> {
  try {
    const res = await fetch('/__workspace/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
