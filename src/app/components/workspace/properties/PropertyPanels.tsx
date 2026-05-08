import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign, Film, Target,
  TrendingUp, ShieldCheck,
  Palette, Search, Upload, Library, Plus, Trash2, ChevronRight, X,
} from 'lucide-react';
import {
  CampaignItem, OrderLineItem, FlightItem, CreativeItem, BudgetItem,
  TargetingConfig, SelectedItem, CHANNEL_LABELS, Currency,
  BudgetType, CreativeFormat, CreativeStatus, CampaignStatus,
  WeightPoint, CAMPAIGN_COLORS,
  CreativeMediaSource,
  TARGETING_GENDER_OPTIONS,
  TARGETING_CONTEXT_OPTIONS,
  targetingRegionsLabel,
  type TargetingGender,
  type TargetingContext,
} from '../types';
import {
  Field, TextInput, NumberInput, DateRangePickerControl, SelectInput, TextareaInput, SectionLabel,
  TargetingSummary, inputStyle,
} from './PropertyFields';
import { getMediaLibraryRows, type MediaLibraryRow } from '../creativeMediaLibrary';
import { idbPutBlob } from '../../../storage/idbKvStore';
import { creativeBlobStorageKey, upsertUploadManifestEntry, type UploadManifestEntry } from '../../../storage/uploadManifest';
import { generateCreativeThumbnail } from '../creativeThumbnail';
import { CreativeThumbWithPlay } from '../CreativeMediaPreview';
import { resolveOlColor, resolveFlightColor, getCampaignMonoPair } from '../colorUtils';
import { WeightCurveEditor } from '../WeightCurveEditor';
import { NorwayRegionsMapModal } from '../NorwayRegionsMapModal';
import { CampaignPerformanceChart, PerformanceChartModal } from '../CampaignPerformanceViews';
import { campaignHasPerformanceChart, formatViewsCompact, plannedEstimatedViewsForCampaign } from '../campaignPerformance';
import { estimatedCampaignViewsTotal, estimatedFlightViews, estimatedOrderLineViews } from '../inventoryBudget';

/** Strip extension, replace underscores — used as default creative title from file names. */
function humanizeMediaFileName(fileName: string | undefined): string {
  const raw = (fileName ?? '').trim();
  const base = raw.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  return base || raw || 'Kreativ';
}

// ─── Campaign Properties ──────────────────────────────────────────────────────

function CampaignProperties({ campaign, onUpdate, onUpdateBudget, onRequestDelete, onAddOrderLine }: {
  campaign: CampaignItem;
  onUpdate: (u: Partial<CampaignItem>) => void;
  onUpdateBudget: (u: Partial<BudgetItem>) => void;
  onRequestDelete?: () => void;
  onAddOrderLine?: () => void;
}) {
  const fmt = (n: number) => n.toLocaleString('nb-NO');
  const totalOlWeight = campaign.orderLines.reduce((s, ol) => s + ol.budgetWeight, 0);
  const [perfModalOpen, setPerfModalOpen] = useState(false);
  const showPerfChart = campaignHasPerformanceChart(campaign);

  return (
    <div style={{ padding: '18px 16px' }}>
      <Field label="Kampanjenavn"><TextInput value={campaign.name} onChange={v => onUpdate({ name: v })} /></Field>
      <Field label="Annonsør"><TextInput value={campaign.advertiser} onChange={v => onUpdate({ advertiser: v })} /></Field>
      <Field label="Status">
        <SelectInput<CampaignStatus> value={campaign.status} onChange={v => onUpdate({ status: v })}
          options={[
            { value: 'draft', label: 'Utkast' },
            { value: 'booked', label: 'Booket' },
            { value: 'active', label: 'Aktiv' },
            { value: 'paused', label: 'Pauset' },
            { value: 'completed', label: 'Fullført' },
          ]} />
      </Field>
      <Field label="Periode">
        <DateRangePickerControl
          startYmd={campaign.startDate}
          endYmd={campaign.endDate}
          onChange={(startDate, endDate) => onUpdate({ startDate, endDate })}
        />
      </Field>

      {campaign.inventoryLastNote && (
        <div
          role="status"
          style={{
            marginBottom: 14,
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

      <SectionLabel icon={TrendingUp} label="Levering (visninger)" />
      <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginBottom: 10, lineHeight: 1.45 }}>
        Estimat basert på budsjett, kampanjerabatt og delt ukentlig kapasitet (prototype): listepris 1 NOK = 1 visning; planlagte visninger øker lineært fra <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>0</strong> til ca.{' '}
        <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatViewsCompact(plannedEstimatedViewsForCampaign(campaign))}</strong> i løpet av kampanjen.{' '}
        <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>Levert akkumulert</strong> (mock) vises bare til og med i dag. Leveringsstatus bruker én indikator for <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>aktive</strong> kampanjer. Klikk på diagrammet for å forstørre.
      </div>
      {showPerfChart && (
        <div style={{ marginBottom: 14 }}>
          <CampaignPerformanceChart
            campaign={campaign}
            height={168}
            onClick={() => setPerfModalOpen(true)}
          />
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, color: 'var(--muted-foreground)', textAlign: 'center', marginTop: 6 }}>
            Klikk diagrammet for full størrelse
          </div>
        </div>
      )}

      <PerformanceChartModal campaign={campaign} open={perfModalOpen} onClose={() => setPerfModalOpen(false)} />

      <SectionLabel icon={Palette} label="Kampanjefarge (hoved)" />
      <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginBottom: 10, lineHeight: 1.45 }}>
        Sekundærfarge velges automatisk. Ordrelinjer veksler mellom hoved- og sekundærfarge i vektdiagrammer.
      </div>
      <Field label="Velg farge">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CAMPAIGN_COLORS.map(c => (
            <button key={c} onClick={() => onUpdate({ color: c })}
              style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: c, border: campaign.color === c ? '3px solid var(--foreground)' : '2px solid transparent', cursor: 'pointer', padding: 0, outline: 'none', transition: 'transform 0.12s', transform: campaign.color === c ? 'scale(1.15)' : 'scale(1)' }} />
          ))}
        </div>
      </Field>

      {/* Scheme preview */}
      {campaign.orderLines.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Palett forhåndsvisning</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div title="Hoved" style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: campaign.color, border: '2px solid var(--foreground)', flexShrink: 0 }} />
            <div title="Sekundær" style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: getCampaignMonoPair(campaign).secondary, flexShrink: 0 }} />
            <div style={{ width: 1, height: 10, backgroundColor: 'var(--border)' }} />
            {campaign.orderLines.map((ol, i) => (
              <div key={ol.id} title={ol.name} style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: resolveOlColor(campaign, i), flexShrink: 0 }} />
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginTop: 4 }}>
            Fordelingen veksler mellom hoved- og sekundærfarge per ordrelinje.
          </div>
        </div>
      )}

      {/* ── Budget ─────────────────────────────────────────────────── */}
      <SectionLabel icon={DollarSign} label="Budsjett" />
      <Field label="Totalbeløp"><NumberInput value={campaign.budget.total} onChange={v => onUpdateBudget({ total: v })} min={0} step={10000} /></Field>
      <Field label="Rabatt (inventar, %)">
        <NumberInput
          value={campaign.inventoryDiscountPercent ?? 0}
          onChange={v => onUpdate({ inventoryDiscountPercent: Math.min(100, Math.max(0, Math.round(v))) })}
          min={0}
          max={100}
          step={1}
        />
      </Field>
      <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginTop: -8, marginBottom: 12, lineHeight: 1.45 }}>
        Listepris i prototypen: 1 NOK = 1 visning. Rabatt senker pris per visning og øker dermed estimerte visninger per krone (delt ukentlig kapasitet med andre kampanjer).
      </div>
      <div
        style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: -4, marginBottom: 12, fontFamily: 'var(--font-family-text)' }}
        title="Prototype: estimat fra justert budsjett, rabatt og delt ukentlig kapasitet (1 NOK = 1 visning før rabatt)."
      >
        ca. {formatViewsCompact(estimatedCampaignViewsTotal(campaign))} visninger (plan)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <Field label="Valuta">
          <SelectInput<Currency> value={campaign.budget.currency} onChange={v => onUpdateBudget({ currency: v })}
            options={[{ value: 'NOK', label: 'NOK' }, { value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }]} />
        </Field>
        <Field label="Type">
          <SelectInput<BudgetType> value={campaign.budget.type} onChange={v => onUpdateBudget({ type: v })}
            options={[{ value: 'gross', label: 'Brutto' }, { value: 'net', label: 'Netto' }]} />
        </Field>
      </div>

      {campaign.orderLines.length > 0 && campaign.budget.total > 0 && (
        <>
          <div style={{ height: 8, display: 'flex', borderRadius: 99, overflow: 'hidden', backgroundColor: 'var(--secondary)', marginBottom: 10, gap: 1 }}>
            {campaign.orderLines.map((ol, i) => (
              <div key={ol.id} title={`${ol.name}: ${ol.budgetWeight}%`} style={{ width: `${ol.budgetWeight}%`, minWidth: ol.budgetWeight > 0 ? 2 : 0, backgroundColor: resolveOlColor(campaign, i), transition: 'width 0.25s', flexShrink: 0 }} />
            ))}
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 10 }}>
            {campaign.orderLines.map((ol, i) => {
              const amt = Math.round((ol.budgetWeight / 100) * campaign.budget.total);
              const olColor = resolveOlColor(campaign, i);
              return (
                <div key={ol.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderBottom: i < campaign.orderLines.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: olColor, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-light)', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ol.name}</span>
                  <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)' }}>{ol.budgetWeight}%</span>
                  <span style={{ fontFamily: 'var(--font-family-display)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{fmt(amt)} <span style={{ fontFamily: 'var(--font-family-text)', fontWeight: 'var(--font-weight-light)', fontSize: 10, color: 'var(--muted-foreground)' }}>{campaign.budget.currency}</span></span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', backgroundColor: totalOlWeight === 100 ? 'rgba(56,185,120,0.08)' : 'rgba(224,156,40,0.08)', borderRadius: 'var(--radius-md)', border: `1px solid ${totalOlWeight === 100 ? 'rgba(56,185,120,0.3)' : 'rgba(224,156,40,0.3)'}`, marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>Allokert</span>
            <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', color: totalOlWeight === 100 ? 'var(--status-success)' : 'var(--status-warning)' }}>
              {totalOlWeight}% · {fmt(campaign.budget.total)} {campaign.budget.currency}
            </span>
          </div>
        </>
      )}

      {onAddOrderLine && (
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={onAddOrderLine}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border)',
              backgroundColor: 'var(--secondary)',
              fontFamily: 'var(--font-family-text)',
              fontSize: 12,
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--foreground)',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} aria-hidden />
            Legg til ordrelinje
          </button>
        </div>
      )}

      <Field label="Notater"><TextareaInput value={campaign.notes} onChange={v => onUpdate({ notes: v })} placeholder="Kampanje-notater …" rows={3} /></Field>

      {onRequestDelete && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Faresonen
          </div>
          <p style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', lineHeight: 1.45, margin: '0 0 10px' }}>
            Sletting fjerner kampanjen, alle ordrelinjer, Flights og målretting fra planen. Du blir bedt om å bekrefte.
          </p>
          <button
            type="button"
            onClick={onRequestDelete}
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
            Slett kampanje …
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Order Line Properties ────────────────────────────────────────────────────

export function OrderLineProperties({ campaign, orderLine, olIndex, onUpdate, onOpenTargeting, embedded, onAddFlight, onDeleteOrderLine }: {
  campaign: CampaignItem;
  orderLine: OrderLineItem;
  olIndex: number;
  onUpdate: (u: Partial<OrderLineItem>) => void;
  onOpenTargeting: () => void;
  embedded?: boolean;
  onAddFlight?: () => void;
  onDeleteOrderLine?: () => void;
}) {
  const fmt        = (n: number) => n.toLocaleString('nb-NO');
  const totalBudget = campaign.budget.total;
  const currency    = campaign.budget.currency;
  const allocated   = Math.round((orderLine.budgetWeight / 100) * totalBudget);
  const isOnly      = campaign.orderLines.length === 1;
  const resolvedColor   = resolveOlColor(campaign, olIndex);

  return (
    <div style={{
      padding: embedded ? '10px 10px 12px' : '18px 16px',
      ...(embedded ? {
        borderTop: '1px solid var(--border)',
        boxSizing: 'border-box',
        backgroundColor: 'var(--secondary)',
      } : {}),
    }}>
      <Field label="Ordrelinjenavn"><TextInput value={orderLine.name} onChange={v => onUpdate({ name: v })} /></Field>
      {!embedded && (
        <Field label="Status">
          <SelectInput<CampaignStatus> value={orderLine.status} onChange={v => onUpdate({ status: v })}
            options={[
              { value: 'draft', label: 'Utkast' },
              { value: 'booked', label: 'Booket' },
              { value: 'active', label: 'Aktiv' },
              { value: 'paused', label: 'Pauset' },
              { value: 'completed', label: 'Fullført' },
            ]} />
        </Field>
      )}
      <Field label="Periode">
        <DateRangePickerControl
          startYmd={orderLine.startDate}
          endYmd={orderLine.endDate}
          onChange={(startDate, endDate) => onUpdate({ startDate, endDate })}
        />
      </Field>

      {/* ── Campaign budget (read-only strip; allocation lives under Fordeling) ─ */}
      <SectionLabel icon={DollarSign} label="Budsjettfordeling" />
      {totalBudget === 0 ? (
        <div style={{ padding: '12px', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, color: 'var(--muted-foreground)' }}>
            Sett et kampanjebudsjett for å vise fordeling på ordrelinjer.
          </span>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--muted-foreground)' }}>{embedded ? 'Tildelt beløp' : 'Kampanjetotal'}</span>
            <span style={{ fontFamily: 'var(--font-family-display)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{fmt(embedded ? allocated : totalBudget)} <span style={{ fontSize: 10, fontFamily: 'var(--font-family-text)', fontWeight: 300, color: 'var(--muted-foreground)' }}>{currency}</span></span>
          </div>
          <div style={{ height: 8, display: 'flex', borderRadius: 99, overflow: 'hidden', backgroundColor: 'var(--secondary)', gap: 1 }}>
            {campaign.orderLines.map((ol, i) => {
              const c = resolveOlColor(campaign, i);
              return (
                <div key={ol.id} title={`${ol.name}: ${ol.budgetWeight}%`} style={{ width: `${ol.budgetWeight}%`, minWidth: ol.budgetWeight > 0 ? 2 : 0, backgroundColor: ol.id === orderLine.id ? resolvedColor : c + '55', transition: 'width 0.25s', flexShrink: 0 }} />
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 8, fontFamily: 'var(--font-family-text)' }} title="Prototype: estimat fra kampanjens planlagte visninger og vektfordeling.">
            ca. {formatViewsCompact(estimatedOrderLineViews(campaign, orderLine))} visninger (plan)
          </div>
        </div>
      )}

      {/* ── Targeting section ──────────────────────────────────────── */}
      <SectionLabel icon={Target} label="Målretting" />
      {orderLine.targeting ? (
        <div style={{ marginBottom: 14 }}>
          <TargetingSummary targeting={orderLine.targeting} color={resolvedColor} />
          <button onClick={onOpenTargeting}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: 4, fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <ShieldCheck size={12} style={{ color: resolvedColor }} />
              Rediger målretting
            </span>
            <ChevronRight size={12} style={{ color: 'var(--muted-foreground)' }} />
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <button onClick={onOpenTargeting}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 11px', backgroundColor: 'var(--secondary)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)' }}>
            <Target size={13} />Legg til målretting
          </button>
        </div>
      )}

      <Field label="Rekvisisjonsnumre">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(orderLine.requisitionNumbers ?? []).length === 0 ? (
            <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginBottom: 2 }}>
              Ingen ennå. Legg til én eller flere referanser (f.eks. økonomi / trafikk-ID).
            </span>
          ) : (
            (orderLine.requisitionNumbers ?? []).map((req, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  className="adweb-prop-input"
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  value={req}
                  placeholder="f.eks. REQ-2026-00441"
                  onChange={e => {
                    const next = [...(orderLine.requisitionNumbers ?? [])];
                    next[i] = e.target.value;
                    onUpdate({ requisitionNumbers: next });
                  }}
                  aria-label={`Rekvisisjonsnummer ${i + 1}`}
                />
                <button
                  type="button"
                  title="Fjern"
                  aria-label={`Fjern rekvisisjonsnummer ${i + 1}`}
                  onClick={() => {
                    const next = (orderLine.requisitionNumbers ?? []).filter((_, j) => j !== i);
                    onUpdate({ requisitionNumbers: next });
                  }}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    padding: 0,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--secondary)',
                    color: 'var(--muted-foreground)',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={() => onUpdate({ requisitionNumbers: [...(orderLine.requisitionNumbers ?? []), ''] })}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border)',
              backgroundColor: 'var(--secondary)',
              fontFamily: 'var(--font-family-text)',
              fontSize: 12,
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Legg til rekvisisjonsnummer
          </button>
        </div>
      </Field>

      <Field label="Notater"><TextareaInput value={orderLine.notes} onChange={v => onUpdate({ notes: v })} placeholder="Notater for ordrelinjen …" rows={2} /></Field>

      {(onAddFlight || onDeleteOrderLine) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {onAddFlight && (
            <button
              type="button"
              onClick={onAddFlight}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border)',
                backgroundColor: 'var(--secondary)',
                fontFamily: 'var(--font-family-text)',
                fontSize: 12,
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--foreground)',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} aria-hidden />
              Legg til flight
            </button>
          )}
          {onDeleteOrderLine && !isOnly && (
            <button
              type="button"
              onClick={onDeleteOrderLine}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
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
              <Trash2 size={14} aria-hidden />
              Slett ordrelinje
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Flight Properties ────────────────────────────────────────────────────────

export function FlightProperties({ campaign, orderLine, flight, olIndex, flightIndex, onUpdate, onUpdateCurve, onRemoveCreative, onAddCreative, embedded, onDeleteFlight }: {
  campaign: CampaignItem;
  orderLine: OrderLineItem;
  flight: FlightItem;
  olIndex: number;
  flightIndex: number;
  onUpdate: (u: Partial<FlightItem>) => void;
  onUpdateCurve: (pts: WeightPoint[]) => void;
  onRemoveCreative?: () => void;
  /** Adds placeholder creative when flight has none */
  onAddCreative?: () => void;
  embedded?: boolean;
  onDeleteFlight?: () => void;
}) {
  const flColor   = resolveFlightColor(campaign, olIndex, flightIndex, orderLine.flights.length);
  const isOnly     = orderLine.flights.length === 1;

  const startD = new Date(flight.startDate + 'T00:00:00');
  const endD   = new Date(flight.endDate   + 'T00:00:00');
  const flDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000));

  return (
    <div style={{
      padding: embedded ? '10px 10px 12px' : '18px 16px',
      ...(embedded ? {
        borderTop: '1px solid var(--border)',
        boxSizing: 'border-box',
        backgroundColor: 'var(--background)',
      } : {}),
    }}>
      <Field label="Flight-navn"><TextInput value={flight.name} onChange={v => onUpdate({ name: v })} /></Field>
      <Field label="Kanal">
        <SelectInput<any> value={flight.channel} onChange={v => onUpdate({ channel: v })}
          options={Object.entries(CHANNEL_LABELS).map(([k, l]) => ({ value: k, label: l }))} />
      </Field>
      <Field label="Periode">
        <DateRangePickerControl
          startYmd={flight.startDate}
          endYmd={flight.endDate}
          onChange={(startDate, endDate) => onUpdate({ startDate, endDate })}
        />
      </Field>
      {campaign.budget.total > 0 && (
        <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: -4, marginBottom: 10, fontFamily: 'var(--font-family-text)' }} title="Prototype: estimat fra vekter og kampanjens planlagte visninger.">
          ca. {formatViewsCompact(estimatedFlightViews(campaign, orderLine, flight))} visninger (plan)
        </div>
      )}

      {flight.creative ? (
        <>
          <SectionLabel icon={Film} label="Kreativ" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <CreativeThumbWithPlay
              creative={flight.creative}
              advertiser={campaign.advertiser}
              durationLabel={`${flight.creative.duration}s`}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {flight.creative.name}
              </div>
              <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginTop: 2 }}>
                {flight.creative.format}
                {flight.creative.uploadedFileName ? ` · ${flight.creative.uploadedFileName}` : ''}
              </div>
            </div>
          </div>
          {onRemoveCreative && (
            <button
              type="button"
              onClick={onRemoveCreative}
              style={{
                width: '100%',
                marginBottom: 14,
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--secondary)',
                fontFamily: 'var(--font-family-text)',
                fontSize: 12,
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--destructive)',
                cursor: 'pointer',
              }}
            >
              Fjern kreativ fra Flight
            </button>
          )}
        </>
      ) : onAddCreative ? (
        <>
          <SectionLabel icon={Film} label="Kreativ" />
          <button
            type="button"
            onClick={onAddCreative}
            style={{
              width: '100%',
              marginBottom: 14,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed color-mix(in srgb, var(--foreground) 22%, var(--border))',
              backgroundColor: 'color-mix(in srgb, var(--secondary) 88%, rgba(0,0,0,0.35))',
              fontFamily: 'var(--font-family-text)',
              fontSize: 12,
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--foreground)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Film size={16} style={{ opacity: 0.9 }} aria-hidden />
            Legg til kreativ
          </button>
        </>
      ) : null}

      {!embedded && (
        <>
          <SectionLabel icon={TrendingUp} label="Frekvenskurve" />
          <WeightCurveEditor
            points={flight.weightCurve}
            onChange={onUpdateCurve}
            color={flColor}
            flightDays={flDays}
          />
        </>
      )}

      {onDeleteFlight && !isOnly && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onDeleteFlight}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
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
            <Trash2 size={14} aria-hidden />
            Slett flight
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Targeting view (editable) ────────────────────────────────────────────────

export function TargetingProperties({ targeting, onUpdate, variant = 'panel' }: {
  targeting: TargetingConfig;
  onUpdate: (u: Partial<TargetingConfig>) => void;
  /** `modal`: padding handled by dialog shell */
  variant?: 'panel' | 'modal';
}) {
  const [regionsOpen, setRegionsOpen] = useState(false);
  const pad = variant === 'modal' ? '16px 18px 20px' : '18px 16px';
  return (
    <div style={{ padding: pad }}>
      <Field label="Regioner">
        <button
          type="button"
          onClick={() => setRegionsOpen(true)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-family-text)',
            fontSize: 12,
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--foreground)',
            textAlign: 'left',
          }}
        >
          Velg regioner
        </button>
        <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginTop: 6, lineHeight: 1.45 }}>
          {targetingRegionsLabel(targeting.counties)}
        </div>
      </Field>
      <NorwayRegionsMapModal
        open={regionsOpen}
        initialCounties={targeting.counties ?? []}
        onClose={() => setRegionsOpen(false)}
        onApply={counties => onUpdate({ counties })}
      />
      <Field label="Kjønn">
        <SelectInput<TargetingGender> value={targeting.gender} onChange={v => onUpdate({ gender: v })}
          options={TARGETING_GENDER_OPTIONS} />
      </Field>
      <Field label="Kontekst">
        <SelectInput<TargetingContext> value={targeting.context} onChange={v => onUpdate({ context: v })}
          options={TARGETING_CONTEXT_OPTIONS} />
      </Field>
    </div>
  );
}

// ─── Creative properties ──────────────────────────────────────────────────────

type QualityLight = 'red' | 'yellow' | 'green';

const NIELSEN_PATTERN = /^NCS-\d{4}-\d{2,}\s*$/i;

function nielsenCodeValid(code: string | undefined): boolean {
  return NIELSEN_PATTERN.test((code || '').trim());
}

function StatusDotRow({ tone, label }: { tone: QualityLight; label: string }) {
  const bg = tone === 'red' ? '#dc2626' : tone === 'yellow' ? '#ca8a04' : '#16a34a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <span
        title={tone === 'red' ? 'Krever oppfølging' : tone === 'yellow' ? 'Vurder' : 'OK'}
        style={{
          width: 10, height: 10, borderRadius: '50%', backgroundColor: bg, flexShrink: 0,
          boxShadow: `0 0 0 2px ${bg}22`,
        }}
      />
      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-light)', color: 'var(--foreground)', lineHeight: 1.35 }}>
        {label}
      </span>
    </div>
  );
}

function uploadTechnicalRows(fileName: string | undefined): { label: string; tone: QualityLight }[] {
  if (!fileName) {
    return [
      { label: 'Oppløsning vs trafikkspesifikasjon', tone: 'red' },
      { label: 'Codec og profil (H.264 / HTML5)', tone: 'red' },
      { label: 'Lydestyrke (EBU R128)', tone: 'red' },
      { label: 'Bilderute og kadens', tone: 'red' },
      { label: 'Bitrate / vektgrenser', tone: 'red' },
      { label: 'Container, metadata og farger', tone: 'red' },
    ];
  }
  const s = fileName.length + (fileName.charCodeAt(0) | 0);
  const t = (i: number): QualityLight => {
    const m = (s + i * 7) % 6;
    if (m <= 1) return 'green';
    if (m <= 3) return 'yellow';
    return 'red';
  };
  return [
    { label: 'Oppløsning vs trafikkspesifikasjon', tone: t(0) },
    { label: 'Codec og profil (H.264 / HTML5)', tone: t(1) },
    { label: 'Lydestyrke (EBU R128)', tone: t(2) },
    { label: 'Bilderute og kadens', tone: t(3) },
    { label: 'Bitrate / vektgrenser', tone: t(4) },
    { label: 'Container, metadata og farger', tone: t(5) },
  ];
}

/** Above AddCreativeModal (55k) / targeting (220k); below NorwayRegionsMapModal (235k) */
const MEDIA_LIBRARY_MODAL_Z = 225_000;

function thumbStyle(id: string): React.CSSProperties {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return {
    width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0,
    background: `linear-gradient(135deg, hsl(${hue} 42% 42%) 0%, hsl(${(hue + 40) % 360} 38% 28%) 100%)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border)',
  };
}

function MediaLibraryModal({
  open, rows, onClose, onPick,
}: {
  open: boolean;
  rows: MediaLibraryRow[];
  onClose: () => void;
  onPick: (row: MediaLibraryRow) => void;
}) {
  const [q, setQ] = useState('');
  useEffect(() => { if (!open) setQ(''); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      r =>
        (r.fileName || '').toLowerCase().includes(t) ||
        (r.advertiser || '').toLowerCase().includes(t) ||
        (r.product || '').toLowerCase().includes(t)
    );
  }, [rows, q]);

  if (!open) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mediebibliotek"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: MEDIA_LIBRARY_MODAL_Z,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, maxHeight: 'min(86vh, 640px)',
          backgroundColor: 'var(--card)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Library size={18} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 15, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Mediebibliotek</div>
            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>Velg en godkjent master — eksempelkatalog</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ width: 32, height: 32, border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--secondary)', cursor: 'pointer', color: 'var(--foreground)' }}
          >
            <X size={16} style={{ margin: 'auto', display: 'block' }} />
          </button>
        </div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input
              className="adweb-prop-input"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Søk fil, annonsør, produkt …"
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px 10px 12px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--font-family-text)', fontSize: 13, color: 'var(--muted-foreground)' }}>Ingen treff</div>
          ) : (
            filtered.map(row => (
              <button
                key={row.id}
                type="button"
                onClick={() => { onPick(row); onClose(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 10px', marginBottom: 6, textAlign: 'left',
                  backgroundColor: 'var(--secondary)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  transition: 'background-color 0.12s, border-color 0.12s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--secondary)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                }}
              >
                <div style={{ ...thumbStyle(row.id), position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {row.thumbnailDataUrl ? (
                    <img src={row.thumbnailDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <Film size={18} color="rgba(255,255,255,0.88)" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.fileName || '—'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginTop: 2 }}>
                    {row.advertiser || '—'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.product || '—'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

export function CreativeProperties({
  creative, campaigns, uploadManifest, onUploadLibraryChanged, creativeContext, onUpdate, onRemoveFromFlight, embedded,
}: {
  creative: CreativeItem;
  campaigns: CampaignItem[];
  uploadManifest: UploadManifestEntry[];
  onUploadLibraryChanged: () => void;
  creativeContext: { advertiser: string; campaignName: string; flightName: string };
  onUpdate: (u: Partial<CreativeItem>) => void;
  onRemoveFromFlight?: () => void;
  embedded?: boolean;
}) {
  const source: CreativeMediaSource = creative.mediaSource ?? 'nielsen';
  const [libOpen, setLibOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const libraryRows = useMemo(
    () => getMediaLibraryRows(campaigns, uploadManifest),
    [campaigns, uploadManifest]
  );
  const selectedLib = useMemo(
    () => libraryRows.find(r => r.id === creative.libraryAssetId),
    [libraryRows, creative.libraryAssetId]
  );

  const nielsenOk = nielsenCodeValid(creative.nielsenCode);

  const onFileChosen = useCallback(
    async (fileList: FileList | null) => {
      const f = fileList?.[0];
      if (!f) return;
      const blobKey = creativeBlobStorageKey(creative.id);
      await idbPutBlob(blobKey, f);
      const thumb = await generateCreativeThumbnail(f);
      await upsertUploadManifestEntry({
        id: `upload-${creative.id}`,
        creativeId: creative.id,
        blobKey,
        fileName: f.name,
        advertiser: creativeContext.advertiser,
        product: `${creativeContext.campaignName} · ${creativeContext.flightName}`,
        thumbnailDataUrl: thumb,
      });
      onUpdate({
        uploadedFileName: f.name,
        mediaSource: 'upload',
        libraryAssetId: undefined,
        mediaBlobKey: blobKey,
        thumbnailDataUrl: thumb,
        name: humanizeMediaFileName(f.name),
      });
      onUploadLibraryChanged();
    },
    [creative.id, creativeContext, onUpdate, onUploadLibraryChanged]
  );

  const handleLibraryPick = useCallback(
    (row: MediaLibraryRow) => {
      onUpdate({
        libraryAssetId: row.id,
        mediaSource: 'library',
        uploadedFileName: undefined,
        name: humanizeMediaFileName(row.fileName),
        mediaBlobKey: row.blobKey,
        thumbnailDataUrl: row.thumbnailDataUrl,
      });
    },
    [onUpdate]
  );

  const sourceBtn = (s: CreativeMediaSource, label: string) => {
    const active = source === s;
    return (
      <button
        key={s}
        type="button"
        onClick={() => onUpdate({ mediaSource: s })}
        style={{
          flex: 1, padding: '8px 6px', borderRadius: 'var(--radius-md)',
          border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
          backgroundColor: active ? 'var(--primary)' + '18' : 'var(--secondary)',
          color: active ? 'var(--primary)' : 'var(--muted-foreground)',
          fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)',
          cursor: 'pointer', lineHeight: 1.25, textAlign: 'center',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{
      padding: embedded ? '10px 10px 12px' : '18px 16px',
      ...(embedded ? {
        borderTop: '1px solid var(--border)',
        boxSizing: 'border-box',
        backgroundColor: 'var(--secondary)',
      } : {}),
    }}>
      {onRemoveFromFlight && (
        <button
          type="button"
          onClick={onRemoveFromFlight}
          style={{
            width: '100%',
            marginBottom: 14,
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--secondary)',
            fontFamily: 'var(--font-family-text)',
            fontSize: 12,
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--destructive)',
            cursor: 'pointer',
          }}
        >
          Fjern kreativ fra Flight
        </button>
      )}
      <Field label="Kreativnavn"><TextInput value={creative.name} onChange={v => onUpdate({ name: v })} /></Field>
      <Field label="Format">
        <SelectInput<CreativeFormat> value={creative.format} onChange={v => onUpdate({ format: v })}
          options={[{ value: '15s', label: '15s' }, { value: '30s', label: '30s' }, { value: '60s', label: '60s' }, { value: 'display', label: 'Display' }, { value: 'video', label: 'Video' }]} />
      </Field>
      <Field label="Varighet (sekunder)"><NumberInput value={creative.duration} onChange={v => onUpdate({ duration: v })} min={0} step={1} /></Field>
      <Field label="Status">
        <SelectInput<CreativeStatus> value={creative.status} onChange={v => onUpdate({ status: v })}
          options={[{ value: 'draft', label: 'Utkast' }, { value: 'active', label: 'Aktiv' }, { value: 'archived', label: 'Arkivert' }]} />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <CreativeThumbWithPlay
          creative={creative}
          advertiser={creativeContext.advertiser}
          durationLabel={`${creative.duration}s`}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Forhåndsvisning
          </div>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {creative.name}
          </div>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', lineHeight: 1.35, marginTop: 2 }}>
            {creative.mediaBlobKey ? 'Opplastet eller bibliotek-ressurs med lokal fil.' : 'Legg til media via Opplasting eller Bibliotek for avspilling.'}
          </div>
        </div>
      </div>

      <SectionLabel icon={Film} label="Kreativ (master)" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {sourceBtn('nielsen', 'Jeg har Nielsen-kode')}
          {sourceBtn('upload', 'Last opp')}
          {sourceBtn('library', 'Legg til fra bibliotek')}
        </div>
      </div>

      {source === 'nielsen' && (
        <>
          <Field label="Nielsen-kode">
            <TextInput
              value={creative.nielsenCode || ''}
              onChange={v => onUpdate({ nielsenCode: v })}
              placeholder="f.eks. NCS-2026-0441"
            />
          </Field>
          <div style={{ marginBottom: 14, padding: '10px 11px', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Leveringsstatus
            </div>
            <StatusDotRow tone={nielsenOk ? 'green' : 'red'} label="Media OK (Nielsen-koblet master)" />
            <StatusDotRow tone={nielsenOk ? 'green' : 'red'} label="Trafikk / logger (avstem kreativ-ID)" />
          </div>
        </>
      )}

      {source === 'upload' && (
        <>
          <input ref={fileRef} type="file" accept="video/*,image/*,.zip,.html,.mp4,.mov,.mxf" style={{ display: 'none' }} onChange={e => { void onFileChosen(e.target.files); e.target.value = ''; }} />
          <div
            onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              void onFileChosen(e.dataTransfer.files);
            }}
            style={{
              marginBottom: 12,
              padding: '18px 14px',
              borderRadius: 'var(--radius-md)',
              border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
              backgroundColor: dragOver ? 'var(--primary)' + '0c' : 'var(--secondary)',
              textAlign: 'center',
              transition: 'border-color 0.15s, background-color 0.15s',
            }}
          >
            <Upload size={22} style={{ color: 'var(--muted-foreground)', marginBottom: 8 }} />
            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', marginBottom: 4 }}>
              Slipp fil her
            </div>
            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginBottom: 10 }}>
              eller{' '}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary)', cursor: 'pointer', fontWeight: 'var(--font-weight-semibold)', textDecoration: 'underline' }}
              >
                velg fil
              </button>
            </div>
            {creative.uploadedFileName && (
              <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--foreground)', wordBreak: 'break-all' }}>
                Valgt: {creative.uploadedFileName}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 14, padding: '10px 11px', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Teknisk QA (dummy)
            </div>
            {uploadTechnicalRows(creative.uploadedFileName).map(row => (
              <StatusDotRow key={row.label} tone={row.tone} label={row.label} />
            ))}
          </div>
        </>
      )}

      {source === 'library' && (
        <>
          <div style={{ marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setLibOpen(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: '1px solid var(--border)', backgroundColor: 'var(--secondary)',
                fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)',
              }}
            >
              <Library size={16} style={{ color: 'var(--muted-foreground)' }} />
              Åpne mediebibliotek
            </button>
          </div>
          {selectedLib ? (
            <div style={{ padding: '10px 11px', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CreativeThumbWithPlay
                  creative={creative}
                  advertiser={selectedLib.advertiser}
                  durationLabel={`${creative.duration}s`}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{creative.name}</div>
                  <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginTop: 3, wordBreak: 'break-all' }}>{selectedLib.fileName}</div>
                  <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{selectedLib.advertiser}</div>
                  <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, color: 'var(--muted-foreground)', marginTop: 2 }}>{selectedLib.product}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginBottom: 14 }}>
              Ingen ressurs valgt ennå.
            </div>
          )}
          <MediaLibraryModal open={libOpen} rows={libraryRows} onClose={() => setLibOpen(false)} onPick={handleLibraryPick} />
        </>
      )}
    </div>
  );
}

// ─── Inline property body (campaign / OL / flight / targeting / creative) ───

export interface WorkspacePropertyPanelCallbacks {
  onUpdateCampaign: (id: string, u: Partial<CampaignItem>) => void;
  onUpdateCampaignBudget: (id: string, u: Partial<BudgetItem>) => void;
  onAddTargetingToOrderLine: (cid: string, olid: string) => void;
  onUpdateOrderLine: (cid: string, olid: string, u: Partial<OrderLineItem>) => void;
  onRebalanceOrderLineWeights: (cid: string, olid: string, w: number) => void;
  onUpdateFlight: (cid: string, olid: string, fid: string, u: Partial<FlightItem>) => void;
  onUpdateFlightCurve: (cid: string, olid: string, fid: string, pts: WeightPoint[]) => void;
  onRebalanceFlightWeights: (cid: string, olid: string, fid: string, w: number) => void;
  onUpdateOrderLineTargeting: (cid: string, olid: string, u: Partial<TargetingConfig>) => void;
  onUpdateCreative: (cid: string, olid: string, fid: string, crid: string, u: Partial<CreativeItem>) => void;
  onRemoveCreativeFromFlight: (cid: string, olid: string, fid: string) => void;
  onAddCreativeToFlight: (cid: string, olid: string, fid: string) => void;
  uploadManifest: UploadManifestEntry[];
  onUploadLibraryChanged: () => void;
  onRequestDeleteCampaign?: (campaignId: string) => void;
  onAddOrderLine?: (campaignId: string) => void;
  onAddFlight?: (campaignId: string, orderLineId: string) => void;
  onDeleteOrderLine?: (campaignId: string, orderLineId: string) => void;
  onDeleteFlight?: (campaignId: string, orderLineId: string, flightId: string) => void;
}

export function WorkspacePropertyPanelContent({
  selected,
  campaigns,
  ...handlers
}: { selected: SelectedItem; campaigns: CampaignItem[] } & WorkspacePropertyPanelCallbacks): React.ReactNode {
  const {
    onUpdateCampaign, onUpdateCampaignBudget,
    onAddTargetingToOrderLine,
    onUpdateOrderLine,
    onUpdateFlight, onUpdateFlightCurve,
    onUpdateOrderLineTargeting,
    onUpdateCreative,
    onRemoveCreativeFromFlight,
    onAddCreativeToFlight,
    uploadManifest,
    onUploadLibraryChanged,
    onRequestDeleteCampaign,
    onAddOrderLine,
    onAddFlight,
    onDeleteOrderLine,
    onDeleteFlight,
  } = handlers;

  const camp  = 'campaignId' in selected ? campaigns.find(c => c.id === selected.campaignId) : null;
  const olIdx = (camp && 'orderLineId' in selected) ? camp.orderLines.findIndex(o => o.id === selected.orderLineId) : -1;
  const ol    = olIdx >= 0 ? camp!.orderLines[olIdx] : null;
  const flIdx = (ol && 'flightId' in selected) ? ol.flights.findIndex(f => f.id === selected.flightId) : -1;
  const fl    = flIdx >= 0 ? ol!.flights[flIdx] : null;

  const renderContent = () => {
    if (!camp) return null;
    switch (selected.type) {
      case 'campaign':
        return (
          <CampaignProperties
            campaign={camp}
            onUpdate={u => onUpdateCampaign(camp.id, u)}
            onUpdateBudget={u => onUpdateCampaignBudget(camp.id, u)}
            onRequestDelete={onRequestDeleteCampaign ? () => onRequestDeleteCampaign(camp.id) : undefined}
            onAddOrderLine={onAddOrderLine ? () => onAddOrderLine(camp.id) : undefined}
          />
        );
      case 'order-line':
        if (!ol || olIdx < 0) return null;
        return (
          <OrderLineProperties
            campaign={camp}
            orderLine={ol}
            olIndex={olIdx}
            onUpdate={u => onUpdateOrderLine(camp.id, ol.id, u)}
            onOpenTargeting={() => onAddTargetingToOrderLine(camp.id, ol.id)}
            onAddFlight={onAddFlight ? () => onAddFlight(camp.id, ol.id) : undefined}
            onDeleteOrderLine={onDeleteOrderLine ? () => onDeleteOrderLine(camp.id, ol.id) : undefined}
          />
        );
      case 'order-line-targeting':
        if (!ol || olIdx < 0) return null;
        if (!ol.targeting) {
          return (
            <div style={{ padding: '18px 16px' }}>
              <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginBottom: 12 }}>
                Målretting er ikke satt for denne ordrelinjen ennå.
              </div>
              <button
                type="button"
                onClick={() => onAddTargetingToOrderLine(camp.id, ol.id)}
                style={{
                  width: '100%', padding: '9px 11px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: '1px solid var(--border)', backgroundColor: 'var(--secondary)',
                  fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)',
                }}
              >
                Sett opp målretting
              </button>
            </div>
          );
        }
        return (
          <TargetingProperties
            targeting={ol.targeting}
            onUpdate={u => onUpdateOrderLineTargeting(camp.id, ol.id, u)}
          />
        );
      case 'flight':
        if (!fl || !ol || olIdx < 0 || flIdx < 0) return null;
        return (
          <FlightProperties
            campaign={camp} orderLine={ol} flight={fl} olIndex={olIdx} flightIndex={flIdx}
            onUpdate={u => onUpdateFlight(camp.id, ol.id, fl.id, u)}
            onUpdateCurve={pts => onUpdateFlightCurve(camp.id, ol.id, fl.id, pts)}
            onRemoveCreative={fl.creative ? () => onRemoveCreativeFromFlight(camp.id, ol.id, fl.id) : undefined}
            onAddCreative={!fl.creative ? () => onAddCreativeToFlight(camp.id, ol.id, fl.id) : undefined}
            onDeleteFlight={onDeleteFlight ? () => onDeleteFlight(camp.id, ol.id, fl.id) : undefined}
          />
        );
      case 'creative':
        if (!fl?.creative || !ol) return null;
        return (
          <CreativeProperties
            creative={fl.creative}
            campaigns={campaigns}
            uploadManifest={uploadManifest}
            onUploadLibraryChanged={onUploadLibraryChanged}
            creativeContext={{
              advertiser: camp.advertiser || '—',
              campaignName: camp.name,
              flightName: fl.name,
            }}
            onUpdate={u => onUpdateCreative(camp.id, ol.id, fl.id, fl.creative!.id, u)}
            onRemoveFromFlight={() => onRemoveCreativeFromFlight(camp.id, ol.id, fl.id)}
          />
        );
      default: return null;
    }
  };

  return renderContent();
}
