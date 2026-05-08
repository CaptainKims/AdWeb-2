import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Film, Monitor, Pause, Plus, Tv, X } from 'lucide-react';
import {
  CAMPAIGN_COLORS,
  type BudgetItem,
  type CampaignItem,
  type CampaignStatus,
  type Channel,
  type FlightItem,
  type OrderLineItem,
  type SelectedItem,
  type TargetingConfig,
  type WeightPoint,
} from './types';
import { resolveFlightColor, resolveOlColor } from './colorUtils';
import { CAMPAIGN_STATUS_LABELS_NB } from './campaignTimelineChips';
import { BookCampaignModal } from './BookCampaignModal';
import { validateCampaignForBooking } from './campaignBookingValidation';
import { campaignHasPerformanceChart, formatViewsCompact, plannedEstimatedViewsForCampaign } from './campaignPerformance';
import { CampaignPerformanceChart, PerformanceChartModal } from './campaignPerformanceViews';
import { CreativeThumbWithPlay } from './CreativeMediaPreview';
import { NumberInput, TextInput, DateRangePickerControl } from './properties/PropertyFields';
import { FlightProperties, OrderLineProperties, TargetingProperties } from './properties/PropertyPanels';

const ghostUnderline: React.CSSProperties = {
  width: '100%',
  padding: '6px 0 5px 0',
  backgroundColor: 'transparent',
  border: 'none',
  borderBottom: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
  borderRadius: 0,
  fontFamily: 'var(--font-family-text)',
  fontSize: 14,
  fontWeight: 'var(--font-weight-light)',
  color: 'var(--foreground)',
  outline: 'none',
  boxSizing: 'border-box',
};

const titleInputStyle: React.CSSProperties = {
  ...ghostUnderline,
  fontFamily: 'var(--font-family-display)',
  fontSize: 26,
  fontWeight: 'var(--font-weight-semibold)',
  letterSpacing: '-0.02em',
  lineHeight: 1.15,
};

const labelMuted: React.CSSProperties = {
  fontFamily: 'var(--font-family-text)',
  fontSize: 11,
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--muted-foreground)',
  letterSpacing: '0.04em',
  marginBottom: 4,
};

function fmtNbDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

function fmtRange(start: string, end: string): string {
  return `${fmtNbDate(start)} – ${fmtNbDate(end)}`;
}

function fmtBudgetAmount(n: number): string {
  return n.toLocaleString('nb-NO');
}

/** Below NorwayRegionsMapModal (235000) so map stacks above */
const TARGETING_MODAL_Z = 220_000;

function TargetingEditModal({
  onClose,
  targeting,
  onUpdate,
}: {
  onClose: () => void;
  targeting: TargetingConfig;
  onUpdate: (u: Partial<TargetingConfig>) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adweb-targeting-modal-title"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: TARGETING_MODAL_Z,
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
          maxWidth: 440,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
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
            id="adweb-targeting-modal-title"
            style={{
              margin: 0,
              fontFamily: 'var(--font-family-display)',
              fontSize: 16,
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--foreground)',
            }}
          >
            Rediger målgruppe
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
          <TargetingProperties targeting={targeting} onUpdate={onUpdate} variant="modal" />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function channelGlyph(ch: Channel) {
  if (ch === 'digital') return <Monitor size={14} aria-hidden style={{ opacity: 0.9 }} />;
  return <Tv size={14} aria-hidden style={{ opacity: 0.9 }} />;
}

function flightDurationLabel(fl: FlightItem): string {
  const fmt = (sec: number) => `${sec} sek.`;
  if (fl.creative?.format && /^(\d+)s$/.test(fl.creative.format)) {
    const sec = parseInt(fl.creative.format, 10);
    return fmt(Number.isFinite(sec) ? sec : 30);
  }
  return fmt(fl.creative?.duration ?? 30);
}

const KANAL_NB: Record<Channel, string> = {
  tv: 'TV',
  digital: 'Digital',
  radio: 'Radio',
  outdoor: 'Utendørs',
};

export interface CampaignPlanViewProps {
  campaign: CampaignItem;
  /** Selection driving inline detail panels (same campaign only). */
  selected: SelectedItem | null;
  onClearSelection: () => void;
  onNavigate: (item: SelectedItem) => void;
  onUpdateCampaign: (id: string, u: Partial<CampaignItem>) => void;
  onUpdateCampaignBudget: (id: string, u: Partial<BudgetItem>) => void;
  onUpdateCampaignDates: (id: string, start: string, end: string) => void;
  onAddOrderLine: (campaignId: string) => void;
  onAddFlight: (campaignId: string, orderLineId: string) => void;
  onDeleteOrderLine: (campaignId: string, orderLineId: string) => void;
  onDeleteFlight: (campaignId: string, orderLineId: string, flightId: string) => void;
  onToggleOrderLineCollapse: (campaignId: string, orderLineId: string) => void;
  onSetOrderLineWeights: (campaignId: string, weights: number[]) => void;
  onExpandOrderLine: (campaignId: string, orderLineId: string) => void;
  onUpdateOrderLine: (campaignId: string, orderLineId: string, u: Partial<OrderLineItem>) => void;
  /** Ensures OL has a targeting object (no navigation). */
  onEnsureOrderLineTargeting: (campaignId: string, orderLineId: string) => void;
  onUpdateOrderLineTargeting: (campaignId: string, orderLineId: string, u: Partial<TargetingConfig>) => void;
  onUpdateFlight: (campaignId: string, orderLineId: string, flightId: string, u: Partial<FlightItem>) => void;
  onUpdateFlightCurve: (campaignId: string, orderLineId: string, flightId: string, pts: WeightPoint[]) => void;
  onRemoveCreativeFromFlight: (campaignId: string, orderLineId: string, flightId: string) => void;
  onAddCreativeToFlight: (campaignId: string, orderLineId: string, flightId: string) => void;
  /** Split order-line budget across flights (same interaction as campaign «Fordeling»). */
  onSetFlightWeights: (campaignId: string, orderLineId: string, weights: number[]) => void;
  /** Opens parent-hosted delete confirmation (e.g. OrderBuilder ConfirmModal). */
  onRequestDeleteCampaign?: (campaignId: string) => void;
}

export function CampaignPlanView({
  campaign,
  selected,
  onClearSelection,
  onNavigate,
  onUpdateCampaign,
  onUpdateCampaignBudget,
  onUpdateCampaignDates,
  onAddOrderLine,
  onAddFlight,
  onDeleteOrderLine,
  onDeleteFlight,
  onToggleOrderLineCollapse,
  onSetOrderLineWeights,
  onExpandOrderLine,
  onUpdateOrderLine,
  onEnsureOrderLineTargeting,
  onUpdateOrderLineTargeting,
  onUpdateFlight,
  onUpdateFlightCurve,
  onRemoveCreativeFromFlight,
  onAddCreativeToFlight,
  onSetFlightWeights,
  onRequestDeleteCampaign,
}: CampaignPlanViewProps) {
  const [perfOpen, setPerfOpen] = useState(false);
  /** Inline flight editor under a row (local UX state). */
  const [openFlightDetailId, setOpenFlightDetailId] = useState<string | null>(null);
  const [targetingModalOlId, setTargetingModalOlId] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const showChart = campaignHasPerformanceChart(campaign);

  const onStatusChange = useCallback(
    (next: CampaignStatus) => {
      if (next === 'booked' && campaign.status !== 'booked') {
        const r = validateCampaignForBooking(campaign);
        if (!r.ok) {
          setBookingModalOpen(true);
          return;
        }
      }
      onUpdateCampaign(campaign.id, { status: next });
    },
    [campaign, onUpdateCampaign],
  );

  const confirmBookCampaign = useCallback(() => {
    onUpdateCampaign(campaign.id, { status: 'booked' });
  }, [campaign.id, onUpdateCampaign]);

  useEffect(() => {
    if (!selected || selected.campaignId !== campaign.id) return;
    if (selected.type === 'order-line' || selected.type === 'order-line-targeting') {
      onExpandOrderLine(campaign.id, selected.orderLineId);
      setOpenFlightDetailId(null);
    } else if (selected.type === 'flight' || selected.type === 'creative') {
      onExpandOrderLine(campaign.id, selected.orderLineId);
      setOpenFlightDetailId(selected.flightId);
    } else if (selected.type === 'campaign') {
      setOpenFlightDetailId(null);
    }
  }, [selected, campaign.id, onExpandOrderLine]);

  const statusPillStyle = (s: CampaignStatus): React.CSSProperties => ({
    flexShrink: 0,
    marginTop: 6,
    padding: '5px 12px',
    borderRadius: 99,
    fontFamily: 'var(--font-family-text)',
    fontSize: 11,
    fontWeight: 'var(--font-weight-semibold)',
    border: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    color: s === 'active' ? 'rgba(11, 8, 24, 0.92)' : 'var(--foreground)',
    backgroundColor:
      s === 'active'
        ? 'var(--status-success)'
        : s === 'paused'
          ? 'color-mix(in srgb, var(--muted) 90%, transparent)'
          : 'color-mix(in srgb, var(--primary) 32%, transparent)',
  });

  return (
    <div
      data-adweb-campaign-plan
      onMouseDown={e => e.stopPropagation()}
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: 'var(--background)',
        overflow: 'hidden',
      }}
    >
      <PerformanceChartModal campaign={campaign} open={perfOpen} onClose={() => setPerfOpen(false)} norwegian />

      <BookCampaignModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        campaign={campaign}
        onConfirmBook={confirmBookCampaign}
      />

      {targetingModalOlId && (() => {
        const ol = campaign.orderLines.find(o => o.id === targetingModalOlId);
        if (!ol?.targeting) return null;
        return (
          <TargetingEditModal
            onClose={() => setTargetingModalOlId(null)}
            targeting={ol.targeting}
            onUpdate={u => onUpdateOrderLineTargeting(campaign.id, ol.id, u)}
          />
        );
      })()}

      {/* Left: campaign summary + delivery — equal flex with right column */}
      <div
        style={{
          flex: '1 1 0%',
          minWidth: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '22px 22px 28px',
          boxSizing: 'border-box',
          borderRight: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--card) 35%, var(--background))',
        }}
      >
        <button
          type="button"
          onClick={onClearSelection}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 18,
            padding: 0,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-family-text)',
            fontSize: 12,
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--muted-foreground)',
          }}
        >
          <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} aria-hidden />
          Alle kampanjer
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <input
            className="adweb-prop-input"
            aria-label="Kampanjenavn"
            value={campaign.name}
            onChange={e => onUpdateCampaign(campaign.id, { name: e.target.value })}
            style={{ ...titleInputStyle, flex: 1, minWidth: 0 }}
          />
          <select
            aria-label="Status"
            value={campaign.status}
            onChange={e => onStatusChange(e.target.value as CampaignStatus)}
            style={statusPillStyle(campaign.status)}
          >
            {(Object.keys(CAMPAIGN_STATUS_LABELS_NB) as CampaignStatus[]).map(s => (
              <option key={s} value={s}>{CAMPAIGN_STATUS_LABELS_NB[s]}</option>
            ))}
          </select>
        </div>

        {campaign.status === 'draft' && (
          <div style={{ marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => setBookingModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid color-mix(in srgb, var(--primary) 45%, var(--border))',
                backgroundColor: 'color-mix(in srgb, var(--primary) 14%, var(--secondary))',
                fontFamily: 'var(--font-family-text)',
                fontSize: 12,
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--foreground)',
                cursor: 'pointer',
              }}
            >
              Book kampanje
            </button>
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: 'var(--font-family-text)',
                fontSize: 10,
                fontWeight: 'var(--font-weight-light)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.45,
              }}
            >
              Sjekker obligatoriske felt og setter status til Booket.
            </p>
          </div>
        )}

        <div style={{ marginBottom: 22 }}>
          <div style={labelMuted}>Annonsør</div>
          <TextInput value={campaign.advertiser} onChange={v => onUpdateCampaign(campaign.id, { advertiser: v })} placeholder="Annonsør" />
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={labelMuted}>Periode</div>
          <DateRangePickerControl
            startYmd={campaign.startDate}
            endYmd={campaign.endDate}
            onChange={(s, e) => onUpdateCampaignDates(campaign.id, s, e)}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={labelMuted}>Budsjett</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <NumberInput value={campaign.budget.total} onChange={v => onUpdateCampaignBudget(campaign.id, { total: v })} min={0} step={10000} />
            <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 13, color: 'var(--muted-foreground)' }}>{campaign.budget.currency}</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={labelMuted}>Rabatt (inventar, %)</div>
            <NumberInput
              value={campaign.inventoryDiscountPercent ?? 0}
              onChange={v => onUpdateCampaign(campaign.id, { inventoryDiscountPercent: Math.min(100, Math.max(0, Math.round(v))) })}
              min={0}
              max={100}
              step={1}
            />
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
              Listepris: 1 NOK = 1 visning. Rabatt senker pris per visning (prototype).
            </p>
          </div>
          {campaign.budget.total > 0 && (
            <div
              style={{
                marginTop: 8,
                fontFamily: 'var(--font-family-text)',
                fontSize: 10,
                fontWeight: 'var(--font-weight-light)',
                color: 'var(--muted-foreground)',
              }}
              title="Prototype: estimat fra gjeldende budsjett og rabatt etter delt ukentlig kapasitet."
            >
              ca. {formatViewsCompact(plannedEstimatedViewsForCampaign(campaign))} visninger (plan)
            </div>
          )}
        </div>

        {campaign.inventoryLastNote && (
          <div
            role="status"
            style={{
              marginBottom: 20,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid color-mix(in srgb, var(--primary) 35%, var(--border))',
              backgroundColor: 'color-mix(in srgb, var(--primary) 8%, var(--secondary))',
              fontFamily: 'var(--font-family-text)',
              fontSize: 11,
              fontWeight: 'var(--font-weight-light)',
              color: 'var(--foreground)',
              lineHeight: 1.45,
            }}
          >
            {campaign.inventoryLastNote}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={labelMuted}>Kampanjefarge (hoved)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CAMPAIGN_COLORS.map(c => (
              <button
                key={c}
                type="button"
                aria-label={`Velg farge ${c}`}
                title={c}
                onClick={() => onUpdateCampaign(campaign.id, { color: c })}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: campaign.color === c ? '3px solid var(--foreground)' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                  transition: 'transform 0.12s',
                  transform: campaign.color === c ? 'scale(1.12)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {campaign.orderLines.length > 0 && campaign.budget.total > 0 && (
          <FordelingSection campaign={campaign} onCommitWeights={weights => onSetOrderLineWeights(campaign.id, weights)} />
        )}

        <div style={{ marginTop: 4 }}>
          <div style={{ ...labelMuted, marginBottom: 6 }}>Leveranse</div>
          {showChart && (
            <p
              style={{
                margin: '0 0 10px',
                fontFamily: 'var(--font-family-text)',
                fontSize: 10,
                fontWeight: 'var(--font-weight-light)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.45,
              }}
            >
              Estimat basert på budsjett, rabatt og delt ukentlig kapasitet (prototype): listepris 1 NOK = 1 visning; planlagte visninger øker lineært fra{' '}
              <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>0</strong> til ca.{' '}
              <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatViewsCompact(plannedEstimatedViewsForCampaign(campaign))}</strong>{' '}
              i løpet av kampanjen. <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>Levert akkumulert</strong> (mock) vises bare til og med i dag.
            </p>
          )}
          {showChart ? (
            <div
              style={{
                borderRadius: 'var(--radius-lg)',
                padding: '10px 8px 4px',
                backgroundColor: 'color-mix(in srgb, var(--primary) 12%, var(--card))',
                border: 'none',
              }}
            >
              <CampaignPerformanceChart campaign={campaign} height={200} onClick={() => setPerfOpen(true)} norwegian />
            </div>
          ) : (
            <div
              style={{
                height: 160,
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'color-mix(in srgb, var(--muted) 40%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-family-text)',
                fontSize: 12,
                color: 'var(--muted-foreground)',
              }}
            >
              Legg til datoer for å vise leveransekurve
            </div>
          )}
        </div>

        {onRequestDeleteCampaign && (
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div
              style={{
                fontFamily: 'var(--font-family-text)',
                fontSize: 10,
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              Faresone
            </div>
            <p
              style={{
                fontFamily: 'var(--font-family-text)',
                fontSize: 11,
                fontWeight: 'var(--font-weight-light)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.45,
                margin: '0 0 10px',
              }}
            >
              Sletting fjerner kampanjen, alle ordrelinjer, flights og koblet data fra planen. Du får en bekreftelsesdialog.
            </p>
            <button
              type="button"
              onClick={() => onRequestDeleteCampaign(campaign.id)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--destructive)',
                backgroundColor: 'transparent',
                fontFamily: 'var(--font-family-text)',
                fontSize: 12,
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--destructive)',
                cursor: 'pointer',
              }}
            >
              Slett kampanje…
            </button>
          </div>
        )}
      </div>

      {/* Right: order lines + flights — equal flex with left column */}
      <div
        style={{
          flex: '1 1 0%',
          minWidth: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '22px 22px 32px',
          boxSizing: 'border-box',
          backgroundColor: 'var(--background)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', marginBottom: 16, letterSpacing: '0.04em' }}>
          Ordrelinjer og Flights
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {campaign.orderLines.map((ol, olIdx) => (
            <OrderLinePlanBlock
              key={ol.id}
              campaign={campaign}
              orderLine={ol}
              olIndex={olIdx}
              selected={selected}
              expanded={!ol.collapsed}
              openFlightDetailId={openFlightDetailId}
              onOpenFlightDetail={setOpenFlightDetailId}
              onToggle={() => {
                if (!ol.collapsed) setOpenFlightDetailId(null);
                onToggleOrderLineCollapse(campaign.id, ol.id);
              }}
              onNavigate={onNavigate}
              onAddFlight={() => onAddFlight(campaign.id, ol.id)}
              onDeleteOrderLine={() => onDeleteOrderLine(campaign.id, ol.id)}
              onDeleteFlight={fid => onDeleteFlight(campaign.id, ol.id, fid)}
              onUpdateOrderLine={u => onUpdateOrderLine(campaign.id, ol.id, u)}
              onOpenTargetingModal={() => {
                onEnsureOrderLineTargeting(campaign.id, ol.id);
                setTargetingModalOlId(ol.id);
              }}
              onUpdateFlight={(fid, u) => onUpdateFlight(campaign.id, ol.id, fid, u)}
              onUpdateFlightCurve={(fid, pts) => onUpdateFlightCurve(campaign.id, ol.id, fid, pts)}
              onRemoveCreativeFromFlight={fid => onRemoveCreativeFromFlight(campaign.id, ol.id, fid)}
              onAddCreativeToFlight={fid => onAddCreativeToFlight(campaign.id, ol.id, fid)}
              onSetFlightWeights={weights => onSetFlightWeights(campaign.id, ol.id, weights)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => onAddOrderLine(campaign.id)}
          style={{
            marginTop: 18,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed color-mix(in srgb, var(--primary) 55%, var(--border))',
            backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
            fontFamily: 'var(--font-family-text)',
            fontSize: 12,
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--foreground)',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} aria-hidden />
          Legg til ordrelinje
        </button>
      </div>
    </div>
  );
}

const MIN_OL_WEIGHT = 1;

function FordelingSection({
  campaign,
  onCommitWeights,
}: {
  campaign: CampaignItem;
  onCommitWeights: (weights: number[]) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number[] | null>(null);
  const drag = useRef<{
    pointerId: number;
    boundary: number;
    startClientX: number;
    initial: number[];
    widthPx: number;
  } | null>(null);

  const weightsSig = campaign.orderLines.map(ol => `${ol.id}:${ol.budgetWeight}`).join('|');
  useEffect(() => {
    if (!drag.current) setPreview(null);
  }, [weightsSig]);

  const base = preview ?? campaign.orderLines.map(ol => ol.budgetWeight);
  const totalW = Math.max(1, base.reduce((a, b) => a + b, 0));
  const totalAssignedPct = Math.round(base.reduce((a, b) => a + b, 0));

  const applyPair = (
    initial: number[],
    boundary: number,
    clientX: number,
    startX: number,
    widthPx: number,
  ): number[] => {
    const wPx = Math.max(1, widthPx);
    const dW = Math.round(((clientX - startX) / wPx) * 100);
    const i = boundary;
    const pair = initial[i]! + initial[i + 1]!;
    let left = initial[i]! + dW;
    left = Math.max(MIN_OL_WEIGHT, Math.min(pair - MIN_OL_WEIGHT, left));
    const out = [...initial];
    out[i] = left;
    out[i + 1] = pair - left;
    return out;
  };

  const onPointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const fin = applyPair(d.initial, d.boundary, e.clientX, d.startClientX, d.widthPx);
    drag.current = null;
    setPreview(null);
    const same = fin.every((v, idx) => v === campaign.orderLines[idx]!.budgetWeight);
    if (!same) onCommitWeights(fin);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    e.preventDefault();
    setPreview(applyPair(d.initial, d.boundary, e.clientX, d.startClientX, d.widthPx));
  };

  const startDrag =
    (boundary: number) =>
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const el = barRef.current;
      if (!el || campaign.orderLines.length < 2) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = {
        pointerId: e.pointerId,
        boundary,
        startClientX: e.clientX,
        initial: campaign.orderLines.map(ol => ol.budgetWeight),
        widthPx: el.offsetWidth,
      };
    };

  const n = campaign.orderLines.length;
  const budgetTotal = campaign.budget.total;
  const currency = campaign.budget.currency;

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ ...labelMuted, marginBottom: 8 }}>Fordeling</div>
      <div ref={barRef} style={{ position: 'relative', marginBottom: 4 }}>
        <div
          style={{
            height: 12,
            display: 'flex',
            borderRadius: 99,
            overflow: 'hidden',
            gap: 2,
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        >
          {campaign.orderLines.map((ol, i) => {
            const c = resolveOlColor(campaign, i);
            const w = base[i] ?? 0;
            const pct = (w / totalW) * 100;
            const pctRounded = Math.round((w / totalW) * 1000) / 10;
            const amount = Math.round((w / totalW) * budgetTotal);
            return (
              <div
                key={ol.id}
                title={`${ol.name} · ${pctRounded}% · ${fmtBudgetAmount(amount)} ${currency}`}
                style={{
                  width: `${pct}%`,
                  minWidth: pct > 0.5 ? 4 : 0,
                  backgroundColor: c,
                  transition: preview ? 'none' : 'width 0.2s ease',
                }}
              />
            );
          })}
        </div>
        {n >= 2 &&
          Array.from({ length: n - 1 }, (_, bi) => {
            let cum = 0;
            for (let k = 0; k <= bi; k++) cum += base[k] ?? 0;
            const leftPct = (cum / totalW) * 100;
            const pairMax = (base[bi] ?? 0) + (base[bi + 1] ?? 0) - MIN_OL_WEIGHT;
            return (
              <div
                key={`handle-${bi}`}
                onPointerDown={startDrag(bi)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUpOrCancel}
                onPointerCancel={onPointerUpOrCancel}
                role="slider"
                aria-valuenow={base[bi]}
                aria-valuemin={MIN_OL_WEIGHT}
                aria-valuemax={pairMax}
                aria-label={`Flytt budsjett mellom ${campaign.orderLines[bi]?.name ?? ''} og ${campaign.orderLines[bi + 1]?.name ?? ''}`}
                tabIndex={0}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: -4,
                  marginLeft: -6,
                  width: 12,
                  height: 22,
                  cursor: 'ew-resize',
                  touchAction: 'none',
                  borderRadius: 4,
                  backgroundColor: 'rgba(250,250,252,0.35)',
                  border: '1px solid rgba(250,250,252,0.55)',
                  boxSizing: 'border-box',
                  zIndex: 2,
                }}
              />
            );
          })}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: 'var(--font-family-text)',
          fontSize: 10,
          color: 'var(--muted-foreground)',
          lineHeight: 1.35,
        }}
      >
        Dra skillelinjen mellom ordrelinjer for å flytte budsjettandel.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
        {campaign.orderLines.map((ol, i) => {
          const c = resolveOlColor(campaign, i);
          const w = base[i] ?? 0;
          const pct = Math.round((w / totalW) * 1000) / 10;
          const amount = Math.round((w / totalW) * budgetTotal);
          return (
            <div
              key={ol.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-family-text)',
                fontSize: 12,
                color: 'var(--foreground)',
              }}
            >
              <span
                title={ol.name}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: c,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-light)' }}>Ordrelinje {i + 1}</span>
              <span
                style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {ol.name}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  color: 'var(--muted-foreground)',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                – {pct}% · {fmtBudgetAmount(amount)} {currency}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: 'var(--font-family-text)',
          fontSize: 11,
          color: totalAssignedPct === 100 ? 'var(--status-success)' : 'var(--status-warning)',
        }}
      >
        {totalAssignedPct}% tildelt
      </div>
    </div>
  );
}

const MIN_FL_WEIGHT = 1;

function FlightFordelingSection({
  campaign,
  orderLine,
  olIndex,
  onCommitWeights,
}: {
  campaign: CampaignItem;
  orderLine: OrderLineItem;
  olIndex: number;
  onCommitWeights: (weights: number[]) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number[] | null>(null);
  const drag = useRef<{
    pointerId: number;
    boundary: number;
    startClientX: number;
    initial: number[];
    widthPx: number;
  } | null>(null);

  const weightsSig = orderLine.flights.map(f => `${f.id}:${f.budgetWeight}`).join('|');
  useEffect(() => {
    if (!drag.current) setPreview(null);
  }, [weightsSig]);

  const base = preview ?? orderLine.flights.map(f => f.budgetWeight);
  const totalW = Math.max(1, base.reduce((a, b) => a + b, 0));
  const totalAssignedPct = Math.round(base.reduce((a, b) => a + b, 0));

  const applyPair = (
    initial: number[],
    boundary: number,
    clientX: number,
    startX: number,
    widthPx: number,
  ): number[] => {
    const wPx = Math.max(1, widthPx);
    const dW = Math.round(((clientX - startX) / wPx) * 100);
    const i = boundary;
    const pair = initial[i]! + initial[i + 1]!;
    let left = initial[i]! + dW;
    left = Math.max(MIN_FL_WEIGHT, Math.min(pair - MIN_FL_WEIGHT, left));
    const out = [...initial];
    out[i] = left;
    out[i + 1] = pair - left;
    return out;
  };

  const onPointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const fin = applyPair(d.initial, d.boundary, e.clientX, d.startClientX, d.widthPx);
    drag.current = null;
    setPreview(null);
    const same = fin.every((v, idx) => v === orderLine.flights[idx]!.budgetWeight);
    if (!same) onCommitWeights(fin);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    e.preventDefault();
    setPreview(applyPair(d.initial, d.boundary, e.clientX, d.startClientX, d.widthPx));
  };

  const startDrag =
    (boundary: number) =>
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const el = barRef.current;
      if (!el || orderLine.flights.length < 2) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = {
        pointerId: e.pointerId,
        boundary,
        startClientX: e.clientX,
        initial: orderLine.flights.map(f => f.budgetWeight),
        widthPx: el.offsetWidth,
      };
    };

  const n = orderLine.flights.length;
  const campaignTotal = campaign.budget.total;
  const currency = campaign.budget.currency;
  const olPool = campaignTotal > 0 ? Math.round((orderLine.budgetWeight / 100) * campaignTotal) : 0;

  return (
    <div style={{ marginBottom: 14, marginTop: 6 }}>
      <div style={{ ...labelMuted, marginBottom: 8 }}>Fordeling mellom flights</div>
      {campaignTotal === 0 ? (
        <div style={{ padding: '10px 10px', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
            Sett et kampanjebudsjett for å vise beløp per flight. Du kan fortsatt fordele prosentandelene.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--muted-foreground)' }}>Ordrelinjebudsjett</span>
          <span style={{ fontFamily: 'var(--font-family-display)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
            {fmtBudgetAmount(olPool)} <span style={{ fontSize: 10, fontFamily: 'var(--font-family-text)', fontWeight: 300, color: 'var(--muted-foreground)' }}>{currency}</span>
          </span>
        </div>
      )}
      <div ref={barRef} style={{ position: 'relative', marginBottom: 4 }}>
        <div
          style={{
            height: 12,
            display: 'flex',
            borderRadius: 99,
            overflow: 'hidden',
            gap: 2,
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        >
          {orderLine.flights.map((fl, i) => {
            const c = resolveFlightColor(campaign, olIndex, i, n);
            const w = base[i] ?? 0;
            const pct = (w / totalW) * 100;
            return (
              <div
                key={fl.id}
                title={`${fl.name}: ${Math.round((w / totalW) * 1000) / 10}%`}
                style={{
                  width: `${pct}%`,
                  minWidth: pct > 0.5 ? 4 : 0,
                  backgroundColor: c,
                  transition: preview ? 'none' : 'width 0.2s ease',
                }}
              />
            );
          })}
        </div>
        {n >= 2 &&
          Array.from({ length: n - 1 }, (_, bi) => {
            let cum = 0;
            for (let k = 0; k <= bi; k++) cum += base[k] ?? 0;
            const leftPct = (cum / totalW) * 100;
            const pairMax = (base[bi] ?? 0) + (base[bi + 1] ?? 0) - MIN_FL_WEIGHT;
            return (
              <div
                key={`fl-handle-${bi}`}
                onPointerDown={startDrag(bi)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUpOrCancel}
                onPointerCancel={onPointerUpOrCancel}
                role="slider"
                aria-valuenow={base[bi]}
                aria-valuemin={MIN_FL_WEIGHT}
                aria-valuemax={pairMax}
                aria-label={`Flytt budsjett mellom ${orderLine.flights[bi]?.name ?? ''} og ${orderLine.flights[bi + 1]?.name ?? ''}`}
                tabIndex={0}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: -4,
                  marginLeft: -6,
                  width: 12,
                  height: 22,
                  cursor: 'ew-resize',
                  touchAction: 'none',
                  borderRadius: 4,
                  backgroundColor: 'rgba(250,250,252,0.35)',
                  border: '1px solid rgba(250,250,252,0.55)',
                  boxSizing: 'border-box',
                  zIndex: 2,
                }}
              />
            );
          })}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: 'var(--font-family-text)',
          fontSize: 10,
          color: 'var(--muted-foreground)',
          lineHeight: 1.35,
        }}
      >
        Dra skillelinjen mellom flights for å flytte andel av ordrelinjens budsjett.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
        {orderLine.flights.map((fl, i) => {
          const c = resolveFlightColor(campaign, olIndex, i, n);
          const w = base[i] ?? 0;
          const pct = Math.round((w / totalW) * 1000) / 10;
          const amount = campaignTotal > 0 ? Math.round((w / totalW) * olPool) : 0;
          return (
            <div
              key={fl.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-family-text)',
                fontSize: 12,
                color: 'var(--foreground)',
              }}
            >
              <span
                title={fl.name}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: c,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-light)' }}>Flight {i + 1}</span>
              <span
                style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fl.name}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  color: 'var(--muted-foreground)',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                – {pct}% · {campaignTotal > 0 ? `${fmtBudgetAmount(amount)} ${currency}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: 'var(--font-family-text)',
          fontSize: 11,
          color: totalAssignedPct === 100 ? 'var(--status-success)' : 'var(--status-warning)',
        }}
      >
        {totalAssignedPct}% tildelt (flights)
      </div>
    </div>
  );
}

function OrderLinePlanBlock({
  campaign,
  orderLine,
  olIndex,
  selected,
  expanded,
  openFlightDetailId,
  onOpenFlightDetail,
  onToggle,
  onNavigate,
  onAddFlight,
  onDeleteOrderLine,
  onDeleteFlight,
  onUpdateOrderLine,
  onOpenTargetingModal,
  onUpdateFlight,
  onUpdateFlightCurve,
  onRemoveCreativeFromFlight,
  onAddCreativeToFlight,
  onSetFlightWeights,
}: {
  campaign: CampaignItem;
  orderLine: OrderLineItem;
  olIndex: number;
  selected: SelectedItem | null;
  expanded: boolean;
  openFlightDetailId: string | null;
  onOpenFlightDetail: (id: string | null) => void;
  onToggle: () => void;
  onNavigate: (item: SelectedItem) => void;
  onAddFlight: () => void;
  onDeleteOrderLine: () => void;
  onDeleteFlight: (flightId: string) => void;
  onUpdateOrderLine: (u: Partial<OrderLineItem>) => void;
  onOpenTargetingModal: () => void;
  onUpdateFlight: (flightId: string, u: Partial<FlightItem>) => void;
  onUpdateFlightCurve: (flightId: string, pts: WeightPoint[]) => void;
  onRemoveCreativeFromFlight: (flightId: string) => void;
  onAddCreativeToFlight: (flightId: string) => void;
  onSetFlightWeights: (weights: number[]) => void;
}) {
  const olColor = resolveOlColor(campaign, olIndex);
  const nFl = orderLine.flights.length;
  const canDeleteOl = campaign.orderLines.length > 1;

  const headerActivate = () => {
    onNavigate({ type: 'order-line', campaignId: campaign.id, orderLineId: orderLine.id });
    if (!expanded) onToggle();
  };

  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--card)',
        padding: '4px 4px 12px',
        boxSizing: 'border-box',
        outline:
          selected &&
          selected.campaignId === campaign.id &&
          'orderLineId' in selected &&
          selected.orderLineId === orderLine.id &&
          (selected.type === 'order-line' || selected.type === 'order-line-targeting')
            ? `1px solid color-mix(in srgb, ${olColor} 55%, var(--border))`
            : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '12px 12px 8px',
        }}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? 'Skjul detaljer og flights' : 'Vis detaljer og flights'}
          onClick={e => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 28,
            width: 28,
            padding: 0,
            border: 'none',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'transparent',
            color: 'var(--foreground)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <div
          role="button"
          tabIndex={0}
          onClick={headerActivate}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              headerActivate();
            }
          }}
          style={{ flex: 1, minWidth: 0, cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 15, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
              Ordrelinje {olIndex + 1}{' '}
              <span style={{ fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>· {orderLine.name}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', flexShrink: 0 }}>
              {nFl} {nFl === 1 ? 'Flight' : 'Flights'}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--muted-foreground)', marginTop: 6 }}>
            <span style={{ fontWeight: 'var(--font-weight-semibold)', letterSpacing: '0.03em' }}>Startdato</span> {fmtNbDate(orderLine.startDate)}
            {'  ·  '}
            <span style={{ fontWeight: 'var(--font-weight-semibold)', letterSpacing: '0.03em' }}>Sluttdato</span> {fmtNbDate(orderLine.endDate)}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ paddingLeft: 12, paddingRight: 10 }}>
          <OrderLineProperties
            campaign={campaign}
            orderLine={orderLine}
            olIndex={olIndex}
            embedded
            onUpdate={onUpdateOrderLine}
            onOpenTargeting={onOpenTargetingModal}
          />

          {orderLine.flights.length >= 2 && (
            <FlightFordelingSection
              campaign={campaign}
              orderLine={orderLine}
              olIndex={olIndex}
              onCommitWeights={onSetFlightWeights}
            />
          )}

          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', letterSpacing: '0.08em', marginBottom: 8, marginTop: 10 }}>
            Flights
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orderLine.flights.map((fl, flIdx) => (
              <FlightPlanCard
                key={fl.id}
                campaign={campaign}
                orderLine={orderLine}
                flight={fl}
                olIndex={olIndex}
                flightIndex={flIdx}
                olColor={olColor}
                selected={selected}
                detailsOpen={openFlightDetailId === fl.id}
                onToggleDetails={() => onOpenFlightDetail(openFlightDetailId === fl.id ? null : fl.id)}
                onActivate={() => {
                  onNavigate({ type: 'flight', campaignId: campaign.id, orderLineId: orderLine.id, flightId: fl.id });
                  onOpenFlightDetail(fl.id);
                }}
                onDelete={() => onDeleteFlight(fl.id)}
                canDeleteFlight={orderLine.flights.length > 1}
                onUpdateFlight={u => onUpdateFlight(fl.id, u)}
                onUpdateFlightCurve={pts => onUpdateFlightCurve(fl.id, pts)}
                onRemoveCreativeFromFlight={fl.creative ? () => onRemoveCreativeFromFlight(fl.id) : undefined}
                onAddCreativeToFlight={fl.creative ? undefined : () => onAddCreativeToFlight(fl.id)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={onAddFlight}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 11px',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border)',
                backgroundColor: 'var(--secondary)',
                fontFamily: 'var(--font-family-text)',
                fontSize: 11,
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--foreground)',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Legg til Flight
            </button>
            {canDeleteOl && (
              <button
                type="button"
                onClick={onDeleteOrderLine}
                style={{
                  padding: '7px 11px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid color-mix(in srgb, var(--destructive) 45%, transparent)',
                  backgroundColor: 'transparent',
                  fontFamily: 'var(--font-family-text)',
                  fontSize: 11,
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--destructive)',
                  cursor: 'pointer',
                }}
              >
                Slett ordrelinje
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FlightPlanCard({
  campaign,
  orderLine,
  flight,
  olIndex,
  flightIndex,
  olColor,
  selected,
  detailsOpen,
  onToggleDetails,
  onActivate,
  onDelete,
  canDeleteFlight,
  onUpdateFlight,
  onUpdateFlightCurve,
  onRemoveCreativeFromFlight,
  onAddCreativeToFlight,
}: {
  campaign: CampaignItem;
  orderLine: OrderLineItem;
  flight: FlightItem;
  olIndex: number;
  flightIndex: number;
  olColor: string;
  selected: SelectedItem | null;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onActivate: () => void;
  onDelete: () => void;
  canDeleteFlight: boolean;
  onUpdateFlight: (u: Partial<FlightItem>) => void;
  onUpdateFlightCurve: (pts: WeightPoint[]) => void;
  onRemoveCreativeFromFlight?: () => void;
  onAddCreativeToFlight?: () => void;
}) {
  const flightHighlight =
    !!selected &&
    selected.campaignId === campaign.id &&
    'orderLineId' in selected &&
    selected.orderLineId === orderLine.id &&
    (selected.type === 'flight' || selected.type === 'creative') &&
    selected.flightId === flight.id;

  return (
    <div
      style={{
        width: '100%',
        borderRadius: 'var(--radius-md)',
        backgroundColor: flightHighlight
          ? `color-mix(in srgb, ${olColor} 12%, var(--secondary))`
          : 'color-mix(in srgb, var(--secondary) 85%, var(--background))',
        boxSizing: 'border-box',
        border: flightHighlight ? `1px solid color-mix(in srgb, ${olColor} 45%, var(--border))` : '1px solid transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 10px 10px' }}>
        <button
          type="button"
          aria-expanded={detailsOpen}
          aria-label={detailsOpen ? 'Skjul flight-detaljer' : 'Vis flight-detaljer'}
          onClick={e => {
            e.stopPropagation();
            onToggleDetails();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 26,
            width: 26,
            padding: 0,
            border: 'none',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'transparent',
            color: 'var(--foreground)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {detailsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div
          role="button"
          tabIndex={0}
          onClick={onActivate}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onActivate();
            }
          }}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-family-display)', fontSize: 14, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {flight.name}
              </span>
              <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0 }}>{flightDurationLabel(flight)}</span>
              {campaign.status === 'paused' && (
                <Pause size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} aria-hidden />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--muted-foreground)' }}>
              <span style={{ color: olColor, display: 'flex', alignItems: 'center' }}>{channelGlyph(flight.channel)}</span>
              <span>{KANAL_NB[flight.channel]}</span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span>{fmtRange(flight.startDate, flight.endDate)}</span>
            </div>
          </div>
          {flight.creative ? (
            <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
              <CreativeThumbWithPlay creative={flight.creative} advertiser={campaign.advertiser} durationLabel={flightDurationLabel(flight)} />
            </div>
          ) : onAddCreativeToFlight ? (
            <button
              type="button"
              title="Legg til kreativ"
              onClick={e => {
                e.stopPropagation();
                onAddCreativeToFlight();
              }}
              style={{
                flexShrink: 0,
                width: 108,
                minHeight: 42,
                padding: '6px 8px',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed color-mix(in srgb, var(--foreground) 22%, var(--border))',
                backgroundColor: 'color-mix(in srgb, var(--secondary) 88%, rgba(0,0,0,0.35))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                cursor: 'pointer',
                color: 'var(--muted-foreground)',
                fontFamily: 'var(--font-family-text)',
                fontSize: 9,
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: '0.02em',
              }}
            >
              <Film size={14} style={{ color: 'var(--foreground)', opacity: 0.88 }} aria-hidden />
              Legg til kreativ
            </button>
          ) : (
            <div
              style={{
                width: 52,
                height: 40,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'color-mix(in srgb, var(--muted) 50%, transparent)',
                flexShrink: 0,
              }}
            />
          )}
        </div>
        {canDeleteFlight && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              flexShrink: 0,
              fontFamily: 'var(--font-family-text)',
              fontSize: 10,
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--destructive)',
              padding: '6px 8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            Slett Flight
          </button>
        )}
      </div>
      {detailsOpen && (
        <FlightProperties
          campaign={campaign}
          orderLine={orderLine}
          flight={flight}
          olIndex={olIndex}
          flightIndex={flightIndex}
          embedded
          onUpdate={onUpdateFlight}
          onUpdateCurve={onUpdateFlightCurve}
          onRemoveCreative={onRemoveCreativeFromFlight}
          onAddCreative={onAddCreativeToFlight}
          onDeleteFlight={canDeleteFlight ? onDelete : undefined}
        />
      )}
    </div>
  );
}
