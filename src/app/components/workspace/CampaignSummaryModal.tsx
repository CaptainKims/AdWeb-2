import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { CampaignItem } from './types';
import { CAMPAIGN_STATUS_LABELS } from './campaignTimelineChips';
import { deliverySnapshot, formatViewsCompact, plannedEstimatedViewsForCampaign } from './campaignPerformance';

const MODAL_Z = 242_000;

function fmtRange(start: string, end: string): string {
  const s = (start ?? '').trim();
  const e = (end ?? '').trim();
  if (!s || !e) return 'Ingen periode satt';
  const a = new Date(`${s}T12:00:00`);
  const b = new Date(`${e}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 'Ingen periode satt';
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${a.toLocaleDateString('nb-NO', opts)} – ${b.toLocaleDateString('nb-NO', opts)}`;
}

export function CampaignSummaryModal({
  open,
  campaign,
  onClose,
}: {
  open: boolean;
  campaign: CampaignItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !campaign) return null;

  const flightCount = campaign.orderLines.reduce((n, ol) => n + ol.flights.length, 0);
  const snap = deliverySnapshot(campaign);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-summary-title"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: MODAL_Z,
        backgroundColor: 'rgba(0,0,0,0.45)',
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
          maxWidth: 420,
          maxHeight: '90vh',
          overflow: 'auto',
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ minWidth: 0 }}>
            <div id="campaign-summary-title" style={{ fontFamily: 'var(--font-family-display)', fontSize: 17, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
              {campaign.name}
            </div>
            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginTop: 4 }}>
              {campaign.advertiser}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'var(--secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--foreground)',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <dl style={{ margin: 0, padding: '14px 16px 18px', display: 'grid', gap: 12 }}>
          <div>
            <dt style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</dt>
            <dd style={{ margin: '4px 0 0', fontFamily: 'var(--font-family-text)', fontSize: 13, color: 'var(--foreground)' }}>{CAMPAIGN_STATUS_LABELS[campaign.status]}</dd>
          </div>
          <div>
            <dt style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule</dt>
            <dd style={{ margin: '4px 0 0', fontFamily: 'var(--font-family-text)', fontSize: 13, color: 'var(--foreground)' }}>{fmtRange(campaign.startDate, campaign.endDate)}</dd>
          </div>
          <div>
            <dt style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget</dt>
            <dd style={{ margin: '4px 0 0', fontFamily: 'var(--font-family-text)', fontSize: 13, color: 'var(--foreground)' }}>
              {campaign.budget.total.toLocaleString('nb-NO')} {campaign.budget.currency} ({campaign.budget.type})
            </dd>
          </div>
          <div>
            <dt style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Structure</dt>
            <dd style={{ margin: '4px 0 0', fontFamily: 'var(--font-family-text)', fontSize: 13, color: 'var(--foreground)' }}>
              {campaign.orderLines.length} order line{campaign.orderLines.length === 1 ? '' : 's'} · {flightCount} flight{flightCount === 1 ? '' : 's'}
            </dd>
          </div>
          {snap && (
            <div>
              <dt style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery (mock)</dt>
              <dd style={{ margin: '4px 0 0', fontFamily: 'var(--font-family-text)', fontSize: 13, color: 'var(--foreground)', lineHeight: 1.45 }}>
                {formatViewsCompact(snap.deliveredCumulativeToDate)} delivered vs {formatViewsCompact(snap.plannedCumulativeToDate)} planned to date. Estimated total {formatViewsCompact(plannedEstimatedViewsForCampaign(campaign))}.
              </dd>
            </div>
          )}
          {campaign.notes?.trim() && (
            <div>
              <dt style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</dt>
              <dd style={{ margin: '4px 0 0', fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-light)', color: 'var(--foreground)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{campaign.notes.trim()}</dd>
            </div>
          )}
        </dl>

        <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--primary)',
              borderColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family-text)',
              fontSize: 12,
              fontWeight: 'var(--font-weight-semibold)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
