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
  PlaneLanding,
} from 'lucide-react';
import {
  OrderItem,
  FlightItem,
  CreativeItem,
  BudgetItem,
  SelectedItem,
  CHANNEL_LABELS,
  FLIGHT_PALETTE,
} from './types';
import { CreativeThumbWithPlay } from './CreativeMediaPreview';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const channelIcon = (ch: FlightItem['channel']) => {
  const size = 11;
  switch (ch) {
    case 'tv':      return <Tv size={size} />;
    case 'digital': return <Globe size={size} />;
    case 'radio':   return <Radio size={size} />;
    case 'outdoor': return <MapPin size={size} />;
  }
};

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: '2-digit' });
}

function fmtMoney(n: number, currency: string) {
  return n.toLocaleString('nb-NO') + ' ' + currency;
}

const STATUS_COLORS: Record<OrderItem['status'], string> = {
  draft:     'var(--muted-foreground)',
  active:    '#22c55e',
  completed: 'var(--primary)',
  paused:    '#f59e0b',
};

// ─── Creative chip ────────────────────────────────────────────────────────────

interface CreativeChipProps {
  creative: CreativeItem;
  orderId: string;
  flightId: string;
  selected: boolean;
  onSelect: (item: SelectedItem) => void;
  onDelete: (orderId: string, flightId: string, creativeId: string) => void;
}

function CreativeChip({ creative, orderId, flightId, selected, onSelect, onDelete }: CreativeChipProps) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ type: 'creative', orderId, flightId, creativeId: creative.id });
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 8px 3px 4px',
        backgroundColor: selected ? 'var(--primary)' : 'var(--background)',
        border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-button)',
        cursor: 'pointer', transition: 'all 0.12s',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexShrink: 0 }}>
        <CreativeThumbWithPlay creative={creative} compact />
      </div>
      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: selected ? 'var(--primary-foreground)' : 'var(--foreground)' }}>
        {creative.name}
      </span>
      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, color: selected ? 'var(--primary-foreground)' : 'var(--muted-foreground)', opacity: 0.8 }}>
        {creative.format}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(orderId, flightId, creative.id); }}
        style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginLeft: 2, color: selected ? 'var(--primary-foreground)' : 'var(--muted-foreground)', opacity: 0.7 }}
      >
        <X size={10} />
      </button>
    </div>
  );
}

// ─── Flight sub-card ──────────────────────────────────────────────────────────

interface FlightCardProps {
  flight: FlightItem;
  orderId: string;
  selected: SelectedItem | null;
  onSelect: (item: SelectedItem) => void;
  onToggleCollapse: (orderId: string, flightId: string) => void;
  onDelete: (orderId: string, flightId: string) => void;
  onDeleteCreative: (orderId: string, flightId: string, creativeId: string) => void;
  onAddCreativeRequest: (orderId: string, flightId: string) => void;
  onDropCreative: (orderId: string, flightId: string) => void;
  onDropTargeting: (orderId: string, flightId: string) => void;
  onRemoveFlightTargeting: (orderId: string, flightId: string) => void;
  orderHasTargeting: boolean;
  flightIndex: number;
}

function FlightCard({
  flight, orderId, selected, onSelect, onToggleCollapse, onDelete,
  onDeleteCreative, onAddCreativeRequest, onDropCreative, onDropTargeting,
  onRemoveFlightTargeting, orderHasTargeting, flightIndex,
}: FlightCardProps) {
  const [dropOver, setDropOver] = useState(false);
  const isSelected        = selected?.type === 'flight' && selected.orderId === orderId && selected.flightId === flight.id;
  const isTargetingSelected = selected?.type === 'flight-targeting' && selected.orderId === orderId && selected.flightId === flight.id;
  const color             = FLIGHT_PALETTE[flightIndex % FLIGHT_PALETTE.length];
  const targetingAccent   = 'var(--chart-2)';
  const overrideAccent    = 'var(--chart-3)';
  const flightOverridesOrder = !!flight.targeting && orderHasTargeting;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDropOver(false);
    const type = e.dataTransfer.getData('containerType');
    if (type === 'creative')  onDropCreative(orderId, flight.id);
    if (type === 'targeting') onDropTargeting(orderId, flight.id);
  };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect({ type: 'flight', orderId, flightId: flight.id }); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropOver(true); }}
      onDragLeave={(e) => { e.stopPropagation(); setDropOver(false); }}
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
      {/* Override stripe */}
      {flightOverridesOrder && <div style={{ height: 2, backgroundColor: overrideAccent, opacity: 0.7 }} />}

      {/* Flight header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 10px',
        borderBottom: flight.collapsed ? 'none' : '1px solid var(--border)',
        backgroundColor: isSelected ? color + '10' : 'transparent',
      }}>
        <div style={{ width: 3, height: 16, borderRadius: 99, backgroundColor: color, flexShrink: 0 }} />
        <div style={{ color, flexShrink: 0 }}>{channelIcon(flight.channel)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
            {flight.name}
          </div>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>
            {CHANNEL_LABELS[flight.channel]} · {fmtDate(flight.startDate)} – {fmtDate(flight.endDate)}
          </div>
        </div>
        {/* Weight badge */}
        <div style={{ padding: '2px 7px', backgroundColor: color + '18', borderRadius: 'var(--radius-button)', fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color, flexShrink: 0 }}>
          {flight.weight}%
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggleCollapse(orderId, flight.id); }}
          style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}>
          {flight.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(orderId, flight.id); }}
          style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}>
          <Trash2 size={11} />
        </button>
      </div>

      {/* Flight body */}
      {!flight.collapsed && (
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Targeting row */}
          {flight.targeting ? (
            <div
              onClick={(e) => { e.stopPropagation(); onSelect({ type: 'flight-targeting', orderId, flightId: flight.id }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
                backgroundColor: flightOverridesOrder
                  ? isTargetingSelected ? overrideAccent + '22' : overrideAccent + '10'
                  : isTargetingSelected ? 'var(--chart-2)20' : 'var(--secondary)',
                border: `1px solid ${flightOverridesOrder
                  ? isTargetingSelected ? overrideAccent : overrideAccent + '55'
                  : isTargetingSelected ? targetingAccent : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              <ShieldCheck size={10} style={{ color: flightOverridesOrder ? overrideAccent : targetingAccent, flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
                {flight.targeting.geoScope === 'national' ? 'National'
                  : flight.targeting.regions.length > 0
                  ? flight.targeting.regions.slice(0, 2).join(', ') + (flight.targeting.regions.length > 2 ? ` +${flight.targeting.regions.length - 2}` : '')
                  : 'Targeting set'}
              </span>
              {flight.targeting.ageRanges.length > 0 && (
                <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>
                  {flight.targeting.ageRanges[0]}{flight.targeting.ageRanges.length > 1 ? '…' : ''}
                </span>
              )}
              {flightOverridesOrder && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 5px', backgroundColor: overrideAccent + '20', border: `1px solid ${overrideAccent}55`, borderRadius: 'var(--radius-button)', fontFamily: 'var(--font-family-text)', fontSize: 9, fontWeight: 'var(--font-weight-semibold)', color: overrideAccent, flexShrink: 0 }}>
                  Overrides order
                </span>
              )}
              <button onClick={(e) => { e.stopPropagation(); onRemoveFlightTargeting(orderId, flight.id); }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--muted-foreground)', opacity: 0.7 }}>
                <X size={10} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', border: `1px dashed ${dropOver ? targetingAccent : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', backgroundColor: dropOver ? 'var(--chart-2)08' : 'transparent', transition: 'all 0.12s' }}>
              <Target size={10} style={{ color: 'var(--muted-foreground)' }} />
              <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>
                Drop <strong>Targeting</strong> here
              </span>
            </div>
          )}

          {/* Creative slot */}
          {flight.creative ? (
            <CreativeChip
              creative={flight.creative} orderId={orderId} flightId={flight.id}
              selected={selected?.type === 'creative' && selected.orderId === orderId && selected.flightId === flight.id && selected.creativeId === flight.creative.id}
              onSelect={onSelect} onDelete={onDeleteCreative}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 'var(--radius-sm)', border: `1px dashed ${dropOver ? color : 'var(--border)'}`, backgroundColor: dropOver ? color + '08' : 'transparent', transition: 'all 0.12s' }}>
              <Film size={11} style={{ color: 'var(--muted-foreground)' }} />
              <span style={{ flex: 1, fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>
                Drop creative here or
              </span>
              <button onClick={(e) => { e.stopPropagation(); onAddCreativeRequest(orderId, flight.id); }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', color: 'var(--primary)' }}>
                <Plus size={10} />add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── No-flights warning chip ──────────────────────────────────────────────────

function NoFlightsWarning() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 10px',
        backgroundColor: 'var(--status-warning-subtle, rgba(245,158,11,0.08))',
        border: '1px solid var(--status-warning, #f59e0b)',
        borderRadius: 'var(--radius-md)',
        opacity: 0.95,
      }}
    >
      <AlertTriangle
        size={13}
        style={{ color: 'var(--status-warning, #f59e0b)', flexShrink: 0 }}
      />
      <span
        style={{
          flex: 1,
          fontFamily: 'var(--font-family-text)',
          fontSize: 11,
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--status-warning, #f59e0b)',
        }}
      >
        No flights added
      </span>
      <span
        style={{
          fontFamily: 'var(--font-family-text)',
          fontSize: 10,
          fontWeight: 'var(--font-weight-light)',
          color: 'var(--muted-foreground)',
        }}
      >
        Drop a flight below to activate this order
      </span>
    </div>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: OrderItem;
  allOrders: OrderItem[];
  campaignBudget?: BudgetItem;
  selected: SelectedItem | null;
  onSelect: (item: SelectedItem) => void;
  onDragStart: (orderId: string, e: React.MouseEvent) => void;
  dragJustEnded: React.MutableRefObject<boolean>;
  onToggleOrderCollapse: (id: string) => void;
  onDeleteOrder: (id: string) => void;
  onSaveAsTemplate: (id: string) => void;
  onDropOnOrder: (orderId: string, type: string) => void;
  onToggleFlightCollapse: (orderId: string, flightId: string) => void;
  onDeleteFlight: (orderId: string, flightId: string) => void;
  onDeleteCreative: (orderId: string, flightId: string, creativeId: string) => void;
  onAddCreativeRequest: (orderId: string, flightId: string) => void;
}

export function OrderCard({
  order, allOrders, campaignBudget, selected, onSelect, onDragStart,
  dragJustEnded, onToggleOrderCollapse, onDeleteOrder, onSaveAsTemplate,
  onDropOnOrder, onToggleFlightCollapse, onDeleteFlight,
  onDeleteCreative, onAddCreativeRequest,
}: OrderCardProps) {
  const [dropOver, setDropOver] = useState(false);
  const isSelected       = selected?.type === 'order' && selected.orderId === order.id;
  const isTargetingSelected = selected?.type === 'order-targeting' && selected.orderId === order.id;
  const targetingAccent  = 'var(--chart-2)';

  // Derived budget values
  const totalBudget  = campaignBudget?.total ?? 0;
  const currency     = campaignBudget?.currency ?? 'NOK';
  const orderAmount  = totalBudget > 0 ? Math.round((order.budgetWeight / 100) * totalBudget) : 0;
  const totalWeight  = allOrders.reduce((s, o) => s + o.budgetWeight, 0);
  const flightWeight = order.flights.reduce((s, f) => s + f.weight, 0);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDropOver(false);
    const type = e.dataTransfer.getData('containerType');
    if (type === 'flight' || type === 'targeting') {
      onDropOnOrder(order.id, type);
    }
  };

  // Override badge for order-level targeting
  const flightsWithTargeting = order.flights.filter(f => !!f.targeting);
  const overriddenCount = flightsWithTargeting.length;
  const isPartiallyOverridden = overriddenCount > 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: order.position.x,
        top: order.position.y,
        width: 380,
        backgroundColor: 'var(--card)',
        border: `1.5px solid ${isSelected ? order.color : dropOver ? order.color + '80' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: isSelected ? `0 0 0 2px ${order.color}30, var(--elevation-sm)` : 'var(--elevation-sm)',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        userSelect: 'none',
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (dragJustEnded.current) { dragJustEnded.current = false; return; }
        onSelect({ type: 'order', orderId: order.id });
      }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropOver(true); }}
      onDragLeave={(e) => { e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(false); }}
      onDrop={handleDrop}
    >
      {/* Color bar */}
      <div style={{ height: 3, backgroundColor: order.color }} />

      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 8px', borderBottom: order.collapsed ? 'none' : '1px solid var(--border)', cursor: 'grab' }}
        onMouseDown={(e) => { e.stopPropagation(); onDragStart(order.id, e); }}
      >
        <GripVertical size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: STATUS_COLORS[order.status], flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 14, fontWeight: 'var(--font-weight-semibold)', color: 'var(--card-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {order.name}
          </div>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>
            {order.advertiser} · {fmtDate(order.startDate)} – {fmtDate(order.endDate)}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggleOrderCollapse(order.id); }}
          style={{ background: 'none', border: 'none', padding: 3, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}>
          {order.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        <button title="Save as template" onClick={(e) => { e.stopPropagation(); onSaveAsTemplate(order.id); }}
          style={{ background: 'none', border: 'none', padding: 3, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', transition: 'color 0.12s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}>
          <BookmarkPlus size={13} />
        </button>
        <button title="Delete order" onClick={(e) => { e.stopPropagation(); onDeleteOrder(order.id); }}
          style={{ background: 'none', border: 'none', padding: 3, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', transition: 'color 0.12s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--destructive)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}>
          <Trash2 size={13} />
        </button>
      </div>

      {/* Body */}
      {!order.collapsed && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* ── Order budget allocation row ──────────────────────────── */}
          {campaignBudget && (
            <div
              onClick={(e) => { e.stopPropagation(); onSelect({ type: 'order', orderId: order.id }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                backgroundColor: isSelected ? order.color + '10' : 'var(--secondary)',
                border: `1px solid ${isSelected ? order.color + '80' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              <DollarSign size={13} style={{ color: order.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
                  {fmtMoney(orderAmount, currency)}
                </div>
                <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>
                  {order.budgetWeight}% of campaign budget
                </div>
              </div>
              {/* Mini order-allocation bar */}
              <div style={{ display: 'flex', height: 4, width: 64, borderRadius: 99, overflow: 'hidden', gap: 1, flexShrink: 0 }}>
                {allOrders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      flex: o.budgetWeight,
                      backgroundColor: o.id === order.id ? order.color : o.color + '55',
                      transition: 'flex 0.3s',
                    }}
                    title={`${o.name}: ${o.budgetWeight}%`}
                  />
                ))}
              </div>
              {/* Allocation check */}
              {totalWeight !== 100 && (
                <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 9, fontWeight: 'var(--font-weight-semibold)', color: 'var(--status-warning)', flexShrink: 0 }}>
                  {totalWeight}%
                </span>
              )}
            </div>
          )}

          {/* ── Order targeting row ──────────────────────────────────── */}
          {order.targeting ? (
            <div
              onClick={(e) => { e.stopPropagation(); onSelect({ type: 'order-targeting', orderId: order.id }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                backgroundColor: isTargetingSelected ? 'var(--chart-2)18' : 'var(--secondary)',
                border: `1px solid ${isTargetingSelected ? targetingAccent : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.12s',
                opacity: isPartiallyOverridden ? 0.75 : 1,
              }}
            >
              <Target size={13} style={{ color: targetingAccent, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
                  {order.targeting.geoScope === 'national' ? 'National reach'
                    : order.targeting.regions.length > 0
                    ? order.targeting.regions.slice(0, 3).join(', ') + (order.targeting.regions.length > 3 ? ` +${order.targeting.regions.length - 3} more` : '')
                    : 'Geo targeting'}
                </div>
                <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>
                  {order.targeting.ageRanges.length > 0 ? order.targeting.ageRanges.join(', ') : 'All ages'}{' '}
                  · {order.targeting.gender === 'all' ? 'All genders' : order.targeting.gender}
                </div>
              </div>
              {isPartiallyOverridden && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', backgroundColor: 'var(--chart-3)18', border: '1px solid var(--chart-3)55', borderRadius: 'var(--radius-button)', flexShrink: 0 }}>
                  <AlertTriangle size={9} style={{ color: 'var(--chart-3)' }} />
                  <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 9, fontWeight: 'var(--font-weight-semibold)', color: 'var(--chart-3)', whiteSpace: 'nowrap' }}>
                    {overriddenCount === order.flights.length ? 'All flights override' : `${overriddenCount} flight${overriddenCount > 1 ? 's' : ''} override`}
                  </span>
                </div>
              )}
              <button onClick={(e) => { e.stopPropagation(); onDropOnOrder(order.id, '__removeOrderTargeting__'); }}
                style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}>
                <X size={11} />
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
              border: `1px dashed ${dropOver ? targetingAccent : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              backgroundColor: dropOver ? 'var(--chart-2)08' : 'transparent',
              transition: 'all 0.12s',
            }}>
              <Target size={12} style={{ color: 'var(--muted-foreground)' }} />
              <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>
                Drop <strong>Targeting</strong> here
              </span>
            </div>
          )}

          {/* ── Flights ──────────────────────────────────────────────── */}
          {order.flights.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Flight weight allocation bar */}
              {order.flights.length > 1 && (
                <div style={{ marginBottom: 2 }}>
                  <div style={{ display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', gap: 1 }}>
                    {order.flights.map((f, index) => (
                      <div key={f.id} style={{ flex: f.weight, backgroundColor: FLIGHT_PALETTE[index % FLIGHT_PALETTE.length], transition: 'flex 0.3s' }} title={`${f.name}: ${f.weight}%`} />
                    ))}
                  </div>
                  <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: flightWeight === 100 ? 'var(--muted-foreground)' : 'var(--destructive)', marginTop: 3, textAlign: 'right' }}>
                    {flightWeight}% allocated{flightWeight !== 100 && ` (${100 - flightWeight}% remaining)`}
                  </div>
                </div>
              )}
              {order.flights.map((flight, index) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  orderId={order.id}
                  selected={selected}
                  onSelect={onSelect}
                  onToggleCollapse={onToggleFlightCollapse}
                  onDelete={onDeleteFlight}
                  onDeleteCreative={onDeleteCreative}
                  onAddCreativeRequest={onAddCreativeRequest}
                  orderHasTargeting={!!order.targeting}
                  flightIndex={index}
                  onDropCreative={(oId, fId) => onDropOnOrder(oId, '__creative__' + fId)}
                  onDropTargeting={(oId, fId) => onDropOnOrder(oId, '__flight-targeting__' + fId)}
                  onRemoveFlightTargeting={(oId, fId) => onDropOnOrder(oId, '__removeFlightTargeting__' + fId)}
                />
              ))}
            </div>
          )}

          {/* No-flights warning */}
          {order.flights.length === 0 && <NoFlightsWarning />}

          {/* Drop zone for flights */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', border: `1px dashed ${dropOver ? order.color : 'var(--border)'}`, borderRadius: 'var(--radius-md)', backgroundColor: dropOver ? order.color + '08' : 'transparent', transition: 'all 0.12s' }}>
            <Calendar size={12} style={{ color: 'var(--muted-foreground)' }} />
            <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>
              Drop a <strong>Flight</strong> here
            </span>
          </div>
        </div>
      )}
    </div>
  );
}