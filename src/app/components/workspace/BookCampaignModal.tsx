import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardCheck, X } from 'lucide-react';
import type { CampaignItem } from './types';
import { validateCampaignForBooking } from './campaignBookingValidation';

export function BookCampaignModal({
  open,
  onClose,
  campaign,
  onConfirmBook,
}: {
  open: boolean;
  onClose: () => void;
  campaign: CampaignItem;
  onConfirmBook: () => void;
}) {
  const { ok, issues } = useMemo(() => validateCampaignForBooking(campaign), [campaign]);

  if (!open || typeof document === 'undefined') return null;

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adweb-book-campaign-title"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 241_000,
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
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          maxWidth: 440,
          width: '100%',
          padding: '18px 20px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <ClipboardCheck size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} aria-hidden />
            <h2
              id="adweb-book-campaign-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-family-display)',
                fontSize: 16,
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--foreground)',
              }}
            >
              Book kampanje
            </h2>
          </div>
          <button
            type="button"
            aria-label="Lukk"
            onClick={onClose}
            style={{
              padding: 6,
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--muted-foreground)',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p
          style={{
            margin: '0 0 14px',
            fontFamily: 'var(--font-family-text)',
            fontSize: 12,
            fontWeight: 'var(--font-weight-light)',
            color: 'var(--muted-foreground)',
            lineHeight: 1.45,
          }}
        >
          «{campaign.name.trim() || 'Uten navn'}» er utkast inntil den er booket. Vi sjekker at alle obligatoriske felt er på plass før du kan bekrefte.
        </p>

        {ok ? (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(56, 185, 120, 0.1)',
              border: '1px solid rgba(56, 185, 120, 0.35)',
              fontFamily: 'var(--font-family-text)',
              fontSize: 13,
              color: 'var(--foreground)',
              marginBottom: 16,
            }}
          >
            Alle obligatoriske krav er oppfylt. Bekreft for å sette status til <strong>Booket</strong>.
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontFamily: 'var(--font-family-text)',
                fontSize: 11,
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              Mangler før booking
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontFamily: 'var(--font-family-text)',
                fontSize: 12,
                fontWeight: 'var(--font-weight-light)',
                color: 'var(--foreground)',
                lineHeight: 1.5,
              }}
            >
              {issues.map(iss => (
                <li key={iss.id}>{iss.messageNb}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--secondary)',
              fontFamily: 'var(--font-family-text)',
              fontSize: 13,
              fontWeight: 'var(--font-weight-semibold)',
              cursor: 'pointer',
              color: 'var(--foreground)',
            }}
          >
            Lukk
          </button>
          <button
            type="button"
            disabled={!ok}
            onClick={() => {
              if (!ok) return;
              onConfirmBook();
              onClose();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--primary)',
              fontFamily: 'var(--font-family-text)',
              fontSize: 13,
              fontWeight: 'var(--font-weight-semibold)',
              cursor: ok ? 'pointer' : 'not-allowed',
              color: 'var(--primary-foreground)',
              opacity: ok ? 1 : 0.45,
            }}
          >
            Bekreft booking
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
