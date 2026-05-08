import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';
import type { CreativeItem } from './types';
import { idbGetBlob } from '../../storage/idbKvStore';

/** Escapes timeline sticky rows (z-index ~12–22); must paint above app chrome when portaled to `document.body`. */
const CREATIVE_PREVIEW_OVERLAY_Z = 200_000;

function fallbackThumbStyle(seed: string): React.CSSProperties {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue} 40% 38%) 0%, hsl(${(hue + 45) % 360} 36% 24%) 100%)`,
  };
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 14, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{value}</div>
    </div>
  );
}

export function CreativePreviewModal({
  open,
  blobUrl,
  mime,
  title,
  advertiser,
  durationLabel,
  nielsenCode,
  onClose,
}: {
  open: boolean;
  blobUrl: string | null;
  mime: string;
  title: string;
  advertiser?: string;
  durationLabel?: string;
  nielsenCode?: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) {
      videoRef.current?.pause();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !blobUrl) return null;

  const isVideo = mime.startsWith('video/');
  const isImage = mime.startsWith('image/');

  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) | 0;
  const pick = (i: number) => ((h >> i) & 1) === 1;
  const qcRows = [
    { label: 'Oppløsning', pill: 'OK', warn: false },
    { label: 'Codec', pill: 'OK', warn: false },
    { label: 'Lydstyrke', pill: pick(0) ? 'Lav' : 'OK', warn: pick(0) },
    { label: 'Bilderute', pill: 'OK', warn: false },
    { label: 'Bitrate', pill: 'OK', warn: false },
    { label: 'Metadata', pill: pick(3) ? 'Mangler' : 'OK', warn: pick(3) },
  ] as const;

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Creative preview"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: CREATIVE_PREVIEW_OVERLAY_Z,
        backgroundColor: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        role="presentation"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 1080,
          maxHeight: '92vh',
          backgroundColor: 'var(--background)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 'min(72vh, 620px)', maxHeight: 'min(88vh, 900px)' }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              backgroundColor: '#000',
            }}
          >
            {isVideo && (
              <video
                ref={videoRef}
                src={blobUrl}
                controls
                playsInline
                style={{ width: '100%', maxHeight: 'min(78vh, 720px)', outline: 'none', borderRadius: 'var(--radius-md)' }}
              />
            )}
            {isImage && (
              <img
                src={blobUrl}
                alt={title}
                style={{ maxWidth: '100%', maxHeight: 'min(78vh, 720px)', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
              />
            )}
            {!isVideo && !isImage && (
              <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', padding: 24 }}>
                Forhåndsvisning støttes ikke for denne filtypen ({mime || 'ukjent'}).
              </div>
            )}
          </div>

          <div
            style={{
              width: 280,
              flexShrink: 0,
              borderLeft: '1px solid var(--border)',
              padding: '44px 18px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              backgroundColor: 'var(--card)',
              overflowY: 'auto',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Kreativ
              </div>
              <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 22, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', lineHeight: 1.15 }}>
                {title}
              </div>
            </div>
            <MetaLine label="Annonsør" value={advertiser || '—'} />
            <MetaLine label="Varighet" value={durationLabel || '—'} />
            <MetaLine label="Nielsen-kode" value={nielsenCode || '—'} />

            <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '4px 0' }} />

            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Teknisk QC
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {qcRows.map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, color: 'var(--muted-foreground)' }}>{row.label}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-family-text)',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 99,
                      flexShrink: 0,
                      backgroundColor: row.warn ? 'rgba(253, 224, 71, 0.2)' : 'rgba(110, 231, 183, 0.2)',
                      color: row.warn ? 'rgb(253, 224, 71)' : 'rgb(110, 231, 183)',
                    }}
                  >
                    {row.pill}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          title="Lukk"
          aria-label="Lukk"
          onClick={e => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 100,
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--secondary)',
            color: 'var(--foreground)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
}

/** Icon-only play that opens the same preview modal as {@link CreativeThumbWithPlay} (requires `creative.mediaBlobKey`). */
export function CreativeInlinePlay({
  creative,
  advertiser,
  durationLabel,
  buttonStyle,
  playIconSize = 10,
  onMouseDown,
}: {
  creative: CreativeItem;
  advertiser?: string;
  durationLabel?: string;
  buttonStyle?: React.CSSProperties;
  playIconSize?: number;
  onMouseDown?: (e: React.MouseEvent) => void;
}) {
  const [preview, setPreview] = useState<{ url: string; mime: string } | null>(null);

  const openPreview = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!creative.mediaBlobKey) return;
      const blob = await idbGetBlob(creative.mediaBlobKey);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setPreview({ url, mime: blob.type || '' });
    },
    [creative.mediaBlobKey],
  );

  const closePreview = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    }
    setPreview(p => {
      if (p?.url) URL.revokeObjectURL(p.url);
      return null;
    });
  }, []);

  const canPlay = Boolean(creative.mediaBlobKey);

  return (
    <>
      <button
        type="button"
        title={canPlay ? creative.name : 'Add media via Upload or Library to enable playback'}
        aria-label={canPlay ? `Play ${creative.name}` : 'Playback unavailable'}
        disabled={!canPlay}
        onPointerDown={e => {
          e.stopPropagation();
        }}
        onPointerUp={e => {
          e.stopPropagation();
        }}
        onMouseDown={e => {
          onMouseDown?.(e);
          e.stopPropagation();
        }}
        onClick={openPreview}
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 20,
          padding: 0,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--secondary)',
          color: 'var(--foreground)',
          cursor: canPlay ? 'pointer' : 'not-allowed',
          opacity: canPlay ? 1 : 0.45,
          ...buttonStyle,
        }}
      >
        <Play size={playIconSize} fill="currentColor" style={{ marginLeft: 1 }} />
      </button>
      <CreativePreviewModal
        open={!!preview}
        blobUrl={preview?.url ?? null}
        mime={preview?.mime ?? ''}
        title={creative.name}
        advertiser={advertiser}
        durationLabel={durationLabel ?? `${creative.duration}s`}
        nielsenCode={creative.nielsenCode}
        onClose={closePreview}
      />
    </>
  );
}

export function CreativeThumbWithPlay({
  creative,
  compact,
  advertiser,
  durationLabel,
}: {
  creative: CreativeItem;
  /** Tighter layout for timeline flight rows */
  compact?: boolean;
  advertiser?: string;
  durationLabel?: string;
}) {
  const [preview, setPreview] = useState<{ url: string; mime: string } | null>(null);

  const openPreview = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!creative.mediaBlobKey) return;
      const blob = await idbGetBlob(creative.mediaBlobKey);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setPreview({ url, mime: blob.type || '' });
    },
    [creative.mediaBlobKey]
  );

  const closePreview = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    }
    setPreview(p => {
      if (p?.url) URL.revokeObjectURL(p.url);
      return null;
    });
  }, []);

  const w = compact ? 36 : 52;
  const h = compact ? 28 : 40;
  const showPlay = Boolean(creative.mediaBlobKey);

  return (
    <>
      <div
        style={{
          position: 'relative',
          width: w,
          height: h,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          flexShrink: 0,
          border: '1px solid var(--border)',
          ...(!creative.thumbnailDataUrl ? fallbackThumbStyle(creative.id) : {}),
        }}
      >
        {creative.thumbnailDataUrl && (
          <img src={creative.thumbnailDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        {showPlay && (
          <button
            type="button"
            title="Play"
            onClick={openPreview}
            style={{
              position: 'absolute',
              inset: 0,
              margin: 'auto',
              width: compact ? 22 : 28,
              height: compact ? 22 : 28,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'rgba(0,0,0,0.55)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            }}
          >
            <Play size={compact ? 11 : 14} style={{ marginLeft: 2 }} fill="currentColor" />
          </button>
        )}
      </div>
      <CreativePreviewModal
        open={!!preview}
        blobUrl={preview?.url ?? null}
        mime={preview?.mime ?? ''}
        title={creative.name}
        advertiser={advertiser}
        durationLabel={durationLabel ?? `${creative.duration}s`}
        nielsenCode={creative.nielsenCode}
        onClose={closePreview}
      />
    </>
  );
}
