import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { CampaignItem, CreativeItem } from '../types';
import type { UploadManifestEntry } from '../../../storage/uploadManifest';
import { CreativeProperties } from './PropertyPanels';

/** Add-creative dialog backdrop. Media library is portaled at z-index 225000 in PropertyPanels. */
const ADD_CREATIVE_MODAL_Z = 55_000;

export function AddCreativeModal({
  open,
  onClose,
  creative,
  campaigns,
  uploadManifest,
  onUploadLibraryChanged,
  creativeContext,
  onUpdate,
  onRemoveFromFlight,
}: {
  open: boolean;
  onClose: () => void;
  creative: CreativeItem;
  campaigns: CampaignItem[];
  uploadManifest: UploadManifestEntry[];
  onUploadLibraryChanged: () => void;
  creativeContext: { advertiser: string; campaignName: string; flightName: string };
  onUpdate: (u: Partial<CreativeItem>) => void;
  onRemoveFromFlight: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adweb-add-creative-modal-title"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: ADD_CREATIVE_MODAL_Z,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'color-mix(in srgb, var(--card) 92%, var(--background))',
          }}
        >
          <h2
            id="adweb-add-creative-modal-title"
            style={{
              margin: 0,
              fontFamily: 'var(--font-family-display)',
              fontSize: 16,
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--foreground)',
            }}
          >
            Legg til kreativ
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <CreativeProperties
            creative={creative}
            campaigns={campaigns}
            uploadManifest={uploadManifest}
            onUploadLibraryChanged={onUploadLibraryChanged}
            creativeContext={creativeContext}
            onUpdate={onUpdate}
            onRemoveFromFlight={onRemoveFromFlight}
            embedded={false}
          />
        </div>
        <div
          style={{
            flexShrink: 0,
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'color-mix(in srgb, var(--secondary) 88%, var(--card))',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              fontFamily: 'var(--font-family-text)',
              fontSize: 13,
              fontWeight: 'var(--font-weight-semibold)',
              cursor: 'pointer',
            }}
          >
            Ferdig
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
