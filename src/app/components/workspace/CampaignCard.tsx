import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  Film,
  Calendar,
  DollarSign,
  Tv,
  Globe,
  Radio,
  MapPin,
  GripVertical,
  X,
  Target,
  BookmarkPlus,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  CampaignItem,
  FlightItem,
  CreativeItem,
  SelectedItem,
  CHANNEL_LABELS,
  FLIGHT_PALETTE,
} from './types';
import { CreativeThumbWithPlay } from './CreativeMediaPreview';

// ─── Helpers ────────────────────────────────────────────────────────────────

const channelIcon = (ch: FlightItem['channel']) => {
  const size = 11;
  switch (ch) {
    case 'tv':
      return <Tv size={size} />;
    case 'digital':
      return <Globe size={size} />;
    case 'radio':
      return <Radio size={size} />;
    case 'outdoor':
      return <MapPin size={size} />;
  }
};

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

function fmtMoney(n: number, currency: string) {
  return n.toLocaleString('nb-NO') + ' ' + currency;
}

const STATUS_COLORS: Record<CampaignItem['status'], string> = {
  draft: 'var(--muted-foreground)',
  active: '#22c55e',
  completed: 'var(--primary)',
  paused: '#f59e0b',
};

// ─── Creative chip ───────────────────────────────────────────────────────────

interface CreativeChipProps {
  creative: CreativeItem;
  campaignId: string;
  flightId: string;
  selected: boolean;
  onSelect: (item: SelectedItem) => void;
  onDelete: (campaignId: string, flightId: string, creativeId: string) => void;
}

function CreativeChip({ creative, campaignId, flightId, selected, onSelect, onDelete }: CreativeChipProps) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ type: 'creative', campaignId, flightId, creativeId: creative.id });
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px 3px 4px',
        backgroundColor: selected ? 'var(--primary)' : 'var(--background)',
        border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-button)',
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexShrink: 0 }}>
        <CreativeThumbWithPlay creative={creative} compact />
      </div>
      <span
        style={{
          fontFamily: 'var(--font-family-text)',
          fontSize: 11,
          fontWeight: 'var(--font-weight-light)',
          color: selected ? 'var(--primary-foreground)' : 'var(--foreground)',
        }}
      >
        {creative.name}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-family-text)',
          fontSize: 10,
          color: selected ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
          opacity: 0.8,
        }}
      >
        {creative.format}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(campaignId, flightId, creative.id);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          marginLeft: 2,
          color: selected ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
          opacity: 0.7,
        }}
      >
        <X size={10} />
      </button>
    </div>
  );
}

// ─── Flight sub-card ─────────────────────────────────────────────────────────

interface FlightCardProps {
  flight: FlightItem;
  campaignId: string;
  selected: SelectedItem | null;
  onSelect: (item: SelectedItem) => void;
  onToggleCollapse: (campaignId: string, flightId: string) => void;
  onDelete: (campaignId: string, flightId: string) => void;
  onDeleteCreative: (campaignId: string, flightId: string, creativeId: string) => void;
  onAddCreativeRequest: (campaignId: string, flightId: string) => void;
  onDropCreative: (campaignId: string, flightId: string) => void;
  onDropTargeting: (campaignId: string, flightId: string) => void;
  onRemoveFlightTargeting: (campaignId: string, flightId: string) => void;
  campaignHasTargeting: boolean;
  flightIndex: number;
}

function FlightCard({
  flight,
  campaignId,
  selected,
  onSelect,
  onToggleCollapse,
  onDelete,
  onDeleteCreative,
  onAddCreativeRequest,
  onDropCreative,
  onDropTargeting,
  onRemoveFlightTargeting,
  campaignHasTargeting,
  flightIndex,
}: FlightCardProps) {
  const [dropOver, setDropOver] = useState(false);
  const isSelected =
    selected?.type === 'flight' && selected.campaignId === campaignId && selected.flightId === flight.id;
  const isTargetingSelected =
    selected?.type === 'flight-targeting' && selected.campaignId === campaignId && selected.flightId === flight.id;
  const color = FLIGHT_PALETTE[flightIndex % FLIGHT_PALETTE.length];
  const targetingAccent = 'var(--chart-2)';
  // Amber override accent — used when flight targeting overrides campaign targeting
  const overrideAccent = 'var(--chart-3)';
  const flightOverridesOrder = !!flight.targeting && campaignHasTargeting;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropOver(false);
    const type = e.dataTransfer.getData('containerType');
    if (type === 'creative') {
      onDropCreative(campaignId, flight.id);
    } else if (type === 'targeting') {
      onDropTargeting(campaignId, flight.id);
    }
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ type: 'flight', campaignId, flightId: flight.id });
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDropOver(true);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        setDropOver(false);
      }}
      onDrop={handleDrop}
      style={{
        backgroundColor: dropOver ? color + '10' : 'var(--background)',
        border: `1px solid ${
          flightOverridesOrder
            ? isSelected ? overrideAccent : overrideAccent + '60'
            : isSelected ? color : dropOver ? color : 'var(--border)'
        }`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'border-color 0.12s, background-color 0.12s',
        cursor: 'pointer',
      }}
    >
      {/* Override indicator stripe — only when flight targeting overrides order */}
      {flightOverridesOrder && (
        <div
          style={{
            height: 2,
            backgroundColor: overrideAccent,
            opacity: 0.7,
          }}
        />
      )}

      {/* Flight header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 10px',
          borderBottom: flight.collapsed ? 'none' : '1px solid var(--border)',
          backgroundColor: isSelected ? color + '10' : 'transparent',
        }}
      >
        {/* Channel color stripe */}
        <div
          style={{
            width: 3,
            height: 16,
            borderRadius: 99,
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        {/* Channel icon */}
        <div style={{ color, flexShrink: 0 }}>{channelIcon(flight.channel)}</div>
        {/* Name */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-family-text)',
              fontSize: 12,
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--foreground)',
            }}
          >
            {flight.name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-family-text)',
              fontSize: 10,
              fontWeight: 'var(--font-weight-light)',
              color: 'var(--muted-foreground)',
            }}
          >
            {CHANNEL_LABELS[flight.channel]} · {fmtDate(flight.startDate)} – {fmtDate(flight.endDate)}
          </div>
        </div>
        {/* Weight badge */}
        <div
          style={{
            padding: '2px 7px',
            backgroundColor: color + '18',
            borderRadius: 'var(--radius-button)',
            fontFamily: 'var(--font-family-text)',
            fontSize: 10,
            fontWeight: 'var(--font-weight-semibold)',
            color: color,
            flexShrink: 0,
          }}
        >
          {flight.weight}%
        </div>
        {/* Collapse toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(campaignId, flight.id);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 2,
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {flight.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>
        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(campaignId, flight.id);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 2,
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Flight body */}
      {!flight.collapsed && (
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Targeting row */}
          {flight.targeting ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: 'flight-targeting', campaignId, flightId: flight.id });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 8px',
                backgroundColor: flightOverridesOrder
                  ? isTargetingSelected ? overrideAccent + '22' : overrideAccent + '10'
                  : isTargetingSelected ? 'var(--chart-2)' + '20' : 'var(--secondary)',
                border: `1px solid ${
                  flightOverridesOrder
                    ? isTargetingSelected ? overrideAccent : overrideAccent + '55'
                    : isTargetingSelected ? targetingAccent : 'var(--border)'
                }`,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              <ShieldCheck
                size={10}
                style={{
                  color: flightOverridesOrder ? overrideAccent : targetingAccent,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-family-text)',
                  fontSize: 10,
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--foreground)',
                }}
              >
                {flight.targeting.geoScope === 'national'
                  ? 'National'
                  : flight.targeting.regions.length > 0
                  ? flight.targeting.regions.slice(0, 2).join(', ') +
                    (flight.targeting.regions.length > 2 ? ` +${flight.targeting.regions.length - 2}` : '')
                  : 'Targeting set'}
              </span>
              {flight.targeting.ageRanges.length > 0 && (
                <span
                  style={{
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 10,
                    fontWeight: 'var(--font-weight-light)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  {flight.targeting.ageRanges[0]}
                  {flight.targeting.ageRanges.length > 1 ? `…` : ''}
                </span>
              )}
              {/* "Overrides order" badge */}
              {flightOverridesOrder && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '1px 5px',
                    backgroundColor: overrideAccent + '20',
                    border: `1px solid ${overrideAccent}55`,
                    borderRadius: 'var(--radius-button)',
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 9,
                    fontWeight: 'var(--font-weight-semibold)',
                    color: overrideAccent,
                    flexShrink: 0,
                  }}
                >
                  Overrides order
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFlightTargeting(campaignId, flight.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--muted-foreground)',
                  opacity: 0.7,
                }}
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 8px',
                border: `1px dashed ${dropOver ? targetingAccent : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: dropOver ? 'var(--chart-2)' + '08' : 'transparent',
                transition: 'all 0.12s',
              }}
            >
              <Target size={10} style={{ color: 'var(--muted-foreground)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-family-text)',
                  fontSize: 10,
                  fontWeight: 'var(--font-weight-light)',
                  color: 'var(--muted-foreground)',
                }}
              >
                Drop <strong>Targeting</strong> here
              </span>
            </div>
          )}

          {/* ── Single creative slot ──────────────────────────────────── */}
          {flight.creative ? (
            /* Creative is set — show the chip */
            <CreativeChip
              creative={flight.creative}
              campaignId={campaignId}
              flightId={flight.id}
              selected={
                selected?.type === 'creative' &&
                selected.campaignId === campaignId &&
                selected.flightId === flight.id &&
                selected.creativeId === flight.creative.id
              }
              onSelect={onSelect}
              onDelete={onDeleteCreative}
            />
          ) : (
            /* No creative yet — show drop/add zone */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                border: `1px dashed ${dropOver ? color : 'var(--border)'}`,
                backgroundColor: dropOver ? color + '08' : 'transparent',
                transition: 'all 0.12s',
              }}
            >
              <Film size={11} style={{ color: 'var(--muted-foreground)' }} />
              <span
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-family-text)',
                  fontSize: 11,
                  fontWeight: 'var(--font-weight-light)',
                  color: 'var(--muted-foreground)',
                }}
              >
                Drop creative here or
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddCreativeRequest(campaignId, flight.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontFamily: 'var(--font-family-text)',
                  fontSize: 11,
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--primary)',
                }}
              >
                <Plus size={10} />
                add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Campaign card ────────────────────────────────────────────────────────────

interface CampaignCardProps {
  campaign: CampaignItem;
  selected: SelectedItem | null;
  onSelect: (item: SelectedItem) => void;
  onDragStart: (campaignId: string, e: React.MouseEvent) => void;
  dragJustEnded: React.MutableRefObject<boolean>;
  onToggleCampaignCollapse: (id: string) => void;
  onDeleteCampaign: (id: string) => void;
  onSaveAsTemplate: (id: string) => void;
  onDropOnCampaign: (campaignId: string, type: string) => void;
  onToggleFlightCollapse: (campaignId: string, flightId: string) => void;
  onDeleteFlight: (campaignId: string, flightId: string) => void;
  onDeleteCreative: (campaignId: string, flightId: string, creativeId: string) => void;
  onAddCreativeRequest: (campaignId: string, flightId: string) => void;
}

export function CampaignCard({
  campaign,
  selected,
  onSelect,
  onDragStart,
  dragJustEnded,
  onToggleCampaignCollapse,
  onDeleteCampaign,
  onSaveAsTemplate,
  onDropOnCampaign,
  onToggleFlightCollapse,
  onDeleteFlight,
  onDeleteCreative,
  onAddCreativeRequest,
}: CampaignCardProps) {
  const [dropOver, setDropOver] = useState(false);
  const isSelected = selected?.type === 'campaign' && selected.campaignId === campaign.id;
  const isBudgetSelected = selected?.type === 'budget' && selected.campaignId === campaign.id;
  const isCampaignTargetingSelected =
    selected?.type === 'campaign-targeting' && selected.campaignId === campaign.id;
  const targetingAccent = 'var(--chart-2)';

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropOver(false);
    const type = e.dataTransfer.getData('containerType');
    if (type === 'budget' || type === 'flight' || type === 'targeting') {
      onDropOnCampaign(campaign.id, type);
    }
  };

  const totalWeight = campaign.flights.reduce((s, f) => s + f.weight, 0);

  return (
    <div
      style={{
        position: 'absolute',
        left: campaign.position.x,
        top: campaign.position.y,
        width: 380,
        backgroundColor: 'var(--card)',
        border: `1.5px solid ${isSelected ? campaign.color : dropOver ? campaign.color + '80' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: isSelected ? `0 0 0 2px ${campaign.color}30, var(--elevation-sm)` : 'var(--elevation-sm)',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        userSelect: 'none',
      }}
      onClick={(e) => {
        e.stopPropagation();
        // Swallow the click that fires at the end of a drag operation
        if (dragJustEnded.current) {
          dragJustEnded.current = false;
          return;
        }
        onSelect({ type: 'campaign', campaignId: campaign.id });
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDropOver(true);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDropOver(false);
        }
      }}
      onDrop={handleDrop}
    >
      {/* Color bar at top */}
      <div style={{ height: 3, backgroundColor: campaign.color }} />

      {/* Campaign header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px 8px',
          borderBottom: campaign.collapsed ? 'none' : '1px solid var(--border)',
          cursor: 'grab',
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(campaign.id, e);
        }}
      >
        <GripVertical size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />

        {/* Status dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: STATUS_COLORS[campaign.status],
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-family-display)',
              fontSize: 14,
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--card-foreground)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {campaign.name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-family-text)',
              fontSize: 11,
              fontWeight: 'var(--font-weight-light)',
              color: 'var(--muted-foreground)',
            }}
          >
            {campaign.advertiser} · {fmtDate(campaign.startDate)} – {fmtDate(campaign.endDate)}
          </div>
        </div>

        {/* Collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCampaignCollapse(campaign.id);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 3,
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
            display: 'flex',
          }}
        >
          {campaign.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Save as template */}
        <button
          title="Save as template"
          onClick={(e) => {
            e.stopPropagation();
            onSaveAsTemplate(campaign.id);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 3,
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.12s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
        >
          <BookmarkPlus size={13} />
        </button>

        {/* Delete */}
        <button
          title="Delete campaign"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteCampaign(campaign.id);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 3,
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.12s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--destructive)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Campaign body */}
      {!campaign.collapsed && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Budget section */}
          {campaign.budget ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: 'budget', campaignId: campaign.id });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                backgroundColor: isBudgetSelected ? 'var(--chart-4)' + '18' : 'var(--secondary)',
                border: `1px solid ${isBudgetSelected ? 'var(--chart-4)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              <DollarSign size={13} style={{ color: 'var(--chart-4)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 11,
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--foreground)',
                  }}
                >
                  {fmtMoney(campaign.budget.total, campaign.budget.currency)}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 10,
                    fontWeight: 'var(--font-weight-light)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  {campaign.budget.type === 'gross' ? 'Gross' : 'Net'} budget
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDropOnCampaign(campaign.id, '__removeBudget__');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 2,
                  cursor: 'pointer',
                  color: 'var(--muted-foreground)',
                  display: 'flex',
                }}
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 10px',
                border: `1px dashed ${dropOver ? 'var(--chart-4)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                backgroundColor: dropOver ? 'var(--chart-4)' + '08' : 'transparent',
                transition: 'all 0.12s',
              }}
            >
              <DollarSign size={12} style={{ color: 'var(--muted-foreground)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-family-text)',
                  fontSize: 11,
                  fontWeight: 'var(--font-weight-light)',
                  color: 'var(--muted-foreground)',
                }}
              >
                Drop a <strong>Budget</strong> here
              </span>
            </div>
          )}

          {/* Campaign targeting row */}
          {campaign.targeting ? (() => {
            const flightsWithTargeting = campaign.flights.filter(f => !!f.targeting);
            const overriddenCount = flightsWithTargeting.length;
            const isPartiallyOverridden = overriddenCount > 0;
            return (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: 'campaign-targeting', campaignId: campaign.id });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                backgroundColor: isCampaignTargetingSelected ? 'var(--chart-2)' + '18' : 'var(--secondary)',
                border: `1px solid ${isCampaignTargetingSelected ? targetingAccent : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.12s',
                opacity: isPartiallyOverridden ? 0.75 : 1,
              }}
            >
              <Target size={13} style={{ color: targetingAccent, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 11,
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--foreground)',
                  }}
                >
                  {campaign.targeting.geoScope === 'national'
                    ? 'National reach'
                    : campaign.targeting.regions.length > 0
                    ? campaign.targeting.regions.slice(0, 3).join(', ') +
                      (campaign.targeting.regions.length > 3
                        ? ` +${campaign.targeting.regions.length - 3} more`
                        : '')
                    : 'Geo targeting'}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 10,
                    fontWeight: 'var(--font-weight-light)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  {campaign.targeting.ageRanges.length > 0
                    ? campaign.targeting.ageRanges.join(', ')
                    : 'All ages'}{' '}
                  · {campaign.targeting.gender === 'all' ? 'All genders' : campaign.targeting.gender}
                </div>
              </div>
              {/* Partially-overridden warning badge */}
              {isPartiallyOverridden && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '2px 6px',
                    backgroundColor: 'var(--chart-3)' + '18',
                    border: '1px solid var(--chart-3)' + '55',
                    borderRadius: 'var(--radius-button)',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={9} style={{ color: 'var(--chart-3)' }} />
                  <span
                    style={{
                      fontFamily: 'var(--font-family-text)',
                      fontSize: 9,
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--chart-3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {overriddenCount === campaign.flights.length
                      ? 'All flights override'
                      : `${overriddenCount} flight${overriddenCount > 1 ? 's' : ''} override`}
                  </span>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDropOnCampaign(campaign.id, '__removeCampaignTargeting__');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 2,
                  cursor: 'pointer',
                  color: 'var(--muted-foreground)',
                  display: 'flex',
                }}
              >
                <X size={11} />
              </button>
            </div>
            );
          })() : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 10px',
                border: `1px dashed ${dropOver ? targetingAccent : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                backgroundColor: dropOver ? 'var(--chart-2)' + '08' : 'transparent',
                transition: 'all 0.12s',
              }}
            >
              <Target size={12} style={{ color: 'var(--muted-foreground)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-family-text)',
                  fontSize: 11,
                  fontWeight: 'var(--font-weight-light)',
                  color: 'var(--muted-foreground)',
                }}
              >
                Drop <strong>Targeting</strong> here
              </span>
            </div>
          )}

          {/* Flights */}
          {campaign.flights.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Weight bar */}
              {campaign.flights.length > 1 && (
                <div style={{ marginBottom: 2 }}>
                  <div
                    style={{
                      display: 'flex',
                      height: 6,
                      borderRadius: 99,
                      overflow: 'hidden',
                      gap: 1,
                    }}
                  >
                    {campaign.flights.map((f, index) => (
                      <div
                        key={f.id}
                        style={{
                          flex: f.weight,
                          backgroundColor: FLIGHT_PALETTE[index % FLIGHT_PALETTE.length],
                          transition: 'flex 0.3s',
                        }}
                        title={`${f.name}: ${f.weight}%`}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-family-text)',
                      fontSize: 10,
                      fontWeight: 'var(--font-weight-light)',
                      color: totalWeight === 100 ? 'var(--muted-foreground)' : 'var(--destructive)',
                      marginTop: 3,
                      textAlign: 'right',
                    }}
                  >
                    {totalWeight}% allocated {totalWeight !== 100 && `(${100 - totalWeight}% remaining)`}
                  </div>
                </div>
              )}

              {campaign.flights.map((flight, index) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  campaignId={campaign.id}
                  selected={selected}
                  onSelect={onSelect}
                  onToggleCollapse={onToggleFlightCollapse}
                  onDelete={onDeleteFlight}
                  onDeleteCreative={onDeleteCreative}
                  onAddCreativeRequest={onAddCreativeRequest}
                  campaignHasTargeting={!!campaign.targeting}
                  flightIndex={index}
                  onDropCreative={(cId, fId) => {
                    onDropOnCampaign(cId, '__creative__' + fId);
                  }}
                  onDropTargeting={(cId, fId) => {
                    onDropOnCampaign(cId, '__flight-targeting__' + fId);
                  }}
                  onRemoveFlightTargeting={(cId, fId) => {
                    onDropOnCampaign(cId, '__removeFlightTargeting__' + fId);
                  }}
                />
              ))}
            </div>
          )}

          {/* Drop zone for flights */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 10px',
              border: `1px dashed ${dropOver ? campaign.color : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              backgroundColor: dropOver ? campaign.color + '08' : 'transparent',
              transition: 'all 0.12s',
            }}
          >
            <Calendar size={12} style={{ color: 'var(--muted-foreground)' }} />
            <span
              style={{
                fontFamily: 'var(--font-family-text)',
                fontSize: 11,
                fontWeight: 'var(--font-weight-light)',
                color: 'var(--muted-foreground)',
              }}
            >
              Drop a <strong>Flight</strong> here
            </span>
          </div>
        </div>
      )}
    </div>
  );
}