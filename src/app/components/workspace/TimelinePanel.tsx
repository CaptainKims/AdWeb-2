import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { OrderItem, SelectedItem, FLIGHT_PALETTE, CHANNEL_LABELS } from './types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TimelinePanelProps {
  orders: OrderItem[];
  selected: SelectedItem | null;
  onSelect: (item: SelectedItem) => void;
  onUpdateOrderDates: (orderId: string, start: string, end: string) => void;
  onUpdateFlightDates: (orderId: string, flightId: string, start: string, end: string) => void;
}

// ─── Drag state ───────────────────────────────────────────────────────────────

type DragKind = 'move' | 'resize-left' | 'resize-right';
type ItemKind = 'order' | 'flight';

interface DragState {
  kind: DragKind;
  itemKind: ItemKind;
  orderId: string;
  flightId?: string;
  startMouseX: number;
  currentMouseX: number;
  originalStart: Date;
  originalEnd: Date;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function clampDate(d: Date, min: Date, max: Date): Date {
  if (d < min) return min;
  if (d > max) return max;
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

function monthsInRange(start: Date, end: Date): { label: string; start: Date; days: number }[] {
  const result: { label: string; start: Date; days: number }[] = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const s = cur < start ? start : cur;
    const e = monthEnd > end ? end : monthEnd;
    result.push({
      label: cur.toLocaleDateString('nb-NO', { month: 'short', year: '2-digit' }),
      start: s,
      days: daysBetween(s, e) + 1,
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return result;
}

// ─── Month grid lines (shared sub-component) ──────────────────────────────────

function MonthGridLines({
  months,
  dateToX,
  opacity = 0.45,
}: {
  months: { start: Date; days: number }[];
  dateToX: (d: Date) => number;
  opacity?: number;
}) {
  return (
    <>
      {months.map((m, i) => {
        const lx = dateToX(m.start);
        if (isNaN(lx)) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: lx,
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: 'var(--border)',
              opacity,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PX_PER_DAY   = 10;
const LEFT_W       = 192;
const ROW_H        = 36;
const HEADER_H     = 30;
const ORDER_BAR_H  = 20;
const FLIGHT_BAR_H = 14;
const HANDLE_W     = 8;

// ─── Derive total campaign span from flights ──────────────────────────────────

function deriveOrderSpan(
  order: { startDate: string; endDate: string; flights: { startDate: string; endDate: string }[] },
  fallbackStart: Date,
  fallbackEnd: Date
): { start: Date; end: Date } {
  const dates: Date[] = [];
  order.flights.forEach((f) => {
    const fs = parseDate(f.startDate);
    const fe = parseDate(f.endDate);
    if (fs) dates.push(fs);
    if (fe) dates.push(fe);
  });
  if (dates.length >= 2) {
    return {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))),
      end:   new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  }
  // Fall back to order's own dates
  return {
    start: parseDate(order.startDate) ?? fallbackStart,
    end:   parseDate(order.endDate)   ?? fallbackEnd,
  };
}

// ─── TimelinePanel ────────────────────────────────────────────────────────────

export function TimelinePanel({
  orders,
  selected,
  onSelect,
  onUpdateOrderDates,
  onUpdateFlightDates,
}: TimelinePanelProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set(['camp-1']));
  const [drag, setDrag] = useState<DragState | null>(null);

  // ── Compute date range ───────────────────────────────────────────────────
  const allDates: Date[] = [];
  orders.forEach((o) => {
    const cs = parseDate(o.startDate);
    const ce = parseDate(o.endDate);
    if (cs) allDates.push(cs);
    if (ce) allDates.push(ce);
    o.flights.forEach((f) => {
      const fs = parseDate(f.startDate);
      const fe = parseDate(f.endDate);
      if (fs) allDates.push(fs);
      if (fe) allDates.push(fe);
    });
  });
  if (allDates.length === 0) {
    const now = new Date();
    allDates.push(new Date(now.getFullYear(), 0, 1));
    allDates.push(new Date(now.getFullYear(), 11, 31));
  }

  const rangeStart = addDays(new Date(Math.min(...allDates.map((d) => d.getTime()))), -7);
  const rangeEnd   = addDays(new Date(Math.max(...allDates.map((d) => d.getTime()))), 7);
  const totalDays  = daysBetween(rangeStart, rangeEnd);
  const totalWidth = Math.max(totalDays * PX_PER_DAY, 800);

  const dateToX = useCallback(
    (d: Date) => daysBetween(rangeStart, d) * PX_PER_DAY,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangeStart.getTime()]
  );

  const months = monthsInRange(rangeStart, rangeEnd);

  const today        = new Date();
  const todayX       = dateToX(today);
  const todayVisible = today >= rangeStart && today <= rangeEnd;

  // ── Drag: preview dates ──────────────────────────────────────────────────
  const getPreview = useCallback(
    (orderId: string, originalStart: Date, originalEnd: Date, flightId?: string) => {
      if (!drag || drag.orderId !== orderId || drag.flightId !== flightId) {
        return { start: originalStart, end: originalEnd };
      }
      const delta = Math.round((drag.currentMouseX - drag.startMouseX) / PX_PER_DAY);
      if (drag.kind === 'move') {
        return { start: addDays(originalStart, delta), end: addDays(originalEnd, delta) };
      } else if (drag.kind === 'resize-left') {
        const ns = addDays(originalStart, delta);
        return { start: ns < originalEnd ? ns : addDays(originalEnd, -1), end: originalEnd };
      } else {
        const ne = addDays(originalEnd, delta);
        return { start: originalStart, end: ne > originalStart ? ne : addDays(originalStart, 1) };
      }
    },
    [drag]
  );

  // ── Drag: start ──────────────────────────────────────────────────────────
  const startDrag = useCallback(
    (
      e: React.MouseEvent,
      kind: DragKind,
      itemKind: ItemKind,
      orderId: string,
      originalStart: Date,
      originalEnd: Date,
      flightId?: string
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setDrag({ kind, itemKind, orderId, flightId, startMouseX: e.clientX, currentMouseX: e.clientX, originalStart, originalEnd });
    },
    []
  );

  // ── Drag: window listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!drag) return;

    const onMove = (e: MouseEvent) =>
      setDrag((prev) => (prev ? { ...prev, currentMouseX: e.clientX } : null));

    const onUp = (e: MouseEvent) => {
      const deltaX    = e.clientX - drag.startMouseX;
      const moved     = Math.abs(deltaX) > 4;
      const deltaDays = Math.round(deltaX / PX_PER_DAY);

      if (moved) {
        let ns = drag.originalStart;
        let ne = drag.originalEnd;
        if (drag.kind === 'move') {
          ns = addDays(drag.originalStart, deltaDays);
          ne = addDays(drag.originalEnd,   deltaDays);
        } else if (drag.kind === 'resize-left') {
          ns = addDays(drag.originalStart, deltaDays);
          if (ns >= ne) ns = addDays(ne, -1);
        } else {
          ne = addDays(drag.originalEnd, deltaDays);
          if (ne <= ns) ne = addDays(ns, 1);
        }

        if (drag.itemKind === 'order') {
          onUpdateOrderDates(drag.orderId, toISO(ns), toISO(ne));
        } else if (drag.flightId) {
          onUpdateFlightDates(drag.orderId, drag.flightId, toISO(ns), toISO(ne));
        }
      } else if (drag.kind === 'move') {
        // Treat as click → select
        if (drag.itemKind === 'order') {
          onSelect({ type: 'order', orderId: drag.orderId });
        } else if (drag.flightId) {
          onSelect({ type: 'flight', orderId: drag.orderId, flightId: drag.flightId });
        }
      }
      setDrag(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, onUpdateOrderDates, onUpdateFlightDates, onSelect]);

  // ── Global cursor during drag ────────────────────────────────────────────
  useEffect(() => {
    if (!drag) { document.body.style.cursor = ''; return; }
    document.body.style.cursor = drag.kind === 'move' ? 'grabbing' : 'col-resize';
    return () => { document.body.style.cursor = ''; };
  }, [drag]);

  // ── Toggle order expansion ───────────────────────────────────────────────
  const toggleOrder = useCallback((id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Bar renderer ─────────────────────────────────────────────────────────
  const renderBar = ({
    orderId,
    flightId,
    originalStart,
    originalEnd,
    color,
    label,
    barH,
    itemKind,
    dimmed,
  }: {
    orderId: string;
    flightId?: string;
    originalStart: Date;
    originalEnd: Date;
    color: string;
    label: string;
    barH: number;
    itemKind: ItemKind;
    dimmed: boolean;
  }) => {
    const { start, end } = getPreview(orderId, originalStart, originalEnd, flightId);
    const cS  = clampDate(start, rangeStart, rangeEnd);
    const cE  = clampDate(end,   rangeStart, rangeEnd);
    const bX  = dateToX(cS);
    const bW  = Math.max(dateToX(cE) - bX + PX_PER_DAY, HANDLE_W * 2 + 6);
    const top = (ROW_H - barH) / 2;

    const isActive = drag?.orderId === orderId && drag?.flightId === flightId;

    return (
      <div
        style={{
          position: 'absolute',
          left: isNaN(bX) ? 0 : bX,
          top,
          width: isNaN(bW) ? 12 : bW,
          height: barH,
          borderRadius: 99,
          backgroundColor: color,
          opacity: isActive ? 1 : dimmed ? 0.4 : 0.85,
          zIndex: isActive ? 6 : 2,
          boxShadow: isActive ? '0 2px 14px rgba(0,0,0,0.22)' : 'none',
          transition: isActive ? 'none' : 'opacity 0.12s',
          userSelect: 'none',
        }}
      >
        {/* Date tooltip during drag */}
        {isActive && (
          <div style={{
            position: 'absolute',
            bottom: barH + 5,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '3px 8px',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-family-text)',
            fontSize: 10,
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--foreground)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
            zIndex: 20,
            pointerEvents: 'none',
          }}>
            <span style={{ color }}>{fmtDate(start)}</span>
            <span style={{ color: 'var(--muted-foreground)', margin: '0 4px' }}>→</span>
            <span style={{ color }}>{fmtDate(end)}</span>
          </div>
        )}

        {/* Left resize handle */}
        <div
          onMouseDown={(e) => startDrag(e, 'resize-left', itemKind, orderId, originalStart, originalEnd, flightId)}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: HANDLE_W, cursor: 'w-resize', zIndex: 3,
            borderRadius: '99px 0 0 99px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {bW > 32 && (
            <div style={{ width: 2, height: barH * 0.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
          )}
        </div>

        {/* Draggable body */}
        <div
          onMouseDown={(e) => startDrag(e, 'move', itemKind, orderId, originalStart, originalEnd, flightId)}
          style={{
            position: 'absolute',
            left: HANDLE_W, right: HANDLE_W, top: 0, bottom: 0,
            cursor: isActive ? 'grabbing' : 'grab',
            display: 'flex', alignItems: 'center',
            paddingLeft: 4, overflow: 'hidden',
          }}
        >
          {bW > 52 && (
            <span style={{
              fontFamily: 'var(--font-family-text)',
              fontSize: 9,
              fontWeight: 'var(--font-weight-semibold)',
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pointerEvents: 'none',
            }}>
              {label}
            </span>
          )}
        </div>

        {/* Right resize handle */}
        <div
          onMouseDown={(e) => startDrag(e, 'resize-right', itemKind, orderId, originalStart, originalEnd, flightId)}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: HANDLE_W, cursor: 'e-resize', zIndex: 3,
            borderRadius: '0 99px 99px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {bW > 32 && (
            <div style={{ width: 2, height: barH * 0.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
          )}
        </div>
      </div>
    );
  };

  // ─── Campaign-span band (non-interactive, auto-derived from flights) ─────
  const renderCampaignBand = ({
    orderId,
    start,
    end,
    color,
    label,
    isSelected,
  }: {
    orderId: string;
    start: Date;
    end: Date;
    color: string;
    label: string;
    isSelected: boolean;
  }) => {
    const cS = clampDate(start, rangeStart, rangeEnd);
    const cE = clampDate(end,   rangeStart, rangeEnd);
    const bX = dateToX(cS);
    const bW = Math.max(dateToX(cE) - bX + PX_PER_DAY, 12);
    const barH = ORDER_BAR_H;
    const top  = (ROW_H - barH) / 2;

    if (isNaN(bX) || isNaN(bW)) return null;

    return (
      <div
        title={`${label}: ${fmtDate(start)} → ${fmtDate(end)}`}
        style={{
          position: 'absolute',
          left: bX,
          top,
          width: bW,
          height: barH,
          borderRadius: 99,
          backgroundColor: color,
          opacity: isSelected ? 0.92 : 0.72,
          zIndex: 2,
          pointerEvents: 'none',
          transition: 'opacity 0.12s, left 0.1s, width 0.1s',
          boxShadow: isSelected
            ? `0 0 0 2px ${color}55, 0 2px 10px ${color}33`
            : `0 1px 4px ${color}33`,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          paddingLeft: 8,
          paddingRight: 8,
        }}
      >
        {bW > 52 && (
          <span style={{
            fontFamily: 'var(--font-family-text)',
            fontSize: 9,
            fontWeight: 'var(--font-weight-semibold)',
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
            letterSpacing: '0.02em',
          }}>
            {label}
          </span>
        )}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        backgroundColor: 'var(--card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: drag ? 'none' : undefined,
      }}
    >
      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div style={{
        height: 28,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 14,
        paddingRight: 10,
        borderBottom: '1px solid var(--border)',
        gap: 8,
        backgroundColor: 'var(--card)',
      }}>
        <span style={{
          fontFamily: 'var(--font-family-display)',
          fontSize: 11,
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--foreground)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Timeline
        </span>
        <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
        <span style={{
          fontFamily: 'var(--font-family-text)',
          fontSize: 10,
          fontWeight: 'var(--font-weight-light)',
          color: 'var(--muted-foreground)',
        }}>
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Unified scroll body (X + Y) ─────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* Content wider than viewport → horizontal scroll */}
        <div style={{ minWidth: LEFT_W + totalWidth, position: 'relative' }}>

          {/* Today full-height line (behind rows, above grid lines) */}
          {todayVisible && !isNaN(todayX) && (
            <div style={{
              position: 'absolute',
              left: LEFT_W + todayX,
              top: HEADER_H,
              bottom: 0,
              width: 1.5,
              backgroundColor: 'var(--destructive)',
              opacity: 0.22,
              zIndex: 1,
              pointerEvents: 'none',
            }} />
          )}

          {/* ── Sticky month header ──────────────────────────────────────── */}
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 18,
            height: HEADER_H,
            display: 'flex',
            backgroundColor: 'var(--card)',
            borderBottom: '1px solid var(--border)',
          }}>
            {/* Corner */}
            <div style={{
              width: LEFT_W,
              flexShrink: 0,
              position: 'sticky',
              left: 0,
              zIndex: 22,
              backgroundColor: 'var(--card)',
              borderRight: '1px solid var(--border)',
            }} />

            {/* Month cells */}
            <div style={{ width: totalWidth, flexShrink: 0, position: 'relative', display: 'flex' }}>
              {/* Today marker in header */}
              {todayVisible && !isNaN(todayX) && (
                <div style={{
                  position: 'absolute',
                  left: todayX,
                  top: 0,
                  bottom: 0,
                  width: 1.5,
                  backgroundColor: 'var(--destructive)',
                  opacity: 0.7,
                  zIndex: 5,
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 5,
                    left: 3,
                    backgroundColor: 'var(--destructive)',
                    color: '#fff',
                    borderRadius: 99,
                    padding: '1px 5px',
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 8,
                    fontWeight: 'var(--font-weight-semibold)',
                    whiteSpace: 'nowrap',
                  }}>
                    Today
                  </div>
                </div>
              )}

              {months.map((m, i) => {
                const cellW = Math.max(0, isNaN(m.days * PX_PER_DAY) ? 0 : m.days * PX_PER_DAY);
                return (
                  <div key={i} style={{
                    width: cellW,
                    flexShrink: 0,
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 7,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-family-text)',
                      fontSize: 10,
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--muted-foreground)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Rows ────────────────────────────────────────────────────── */}
          {orders.map((order) => {
            const expanded  = expandedOrders.has(order.id);
            const oStart    = parseDate(order.startDate) ?? rangeStart;
            const oEnd      = parseDate(order.endDate)   ?? rangeEnd;
            const isOrderSel = selected?.type === 'order' && (selected as any).orderId === order.id;

            // Auto-derive the campaign span bar from flights
            const campaignSpan = deriveOrderSpan(order, oStart, oEnd);

            return (
              <React.Fragment key={order.id}>
                {/* ── Order row ─────────────────────────────────────────── */}
                <div style={{ display: 'flex', height: ROW_H }}>
                  {/* Label — sticky left */}
                  <div style={{
                    width: LEFT_W,
                    flexShrink: 0,
                    position: 'sticky',
                    left: 0,
                    zIndex: 12,
                    backgroundColor: isOrderSel ? order.color + '12' : 'var(--card)',
                    borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    paddingLeft: 8,
                    paddingRight: 6,
                    transition: 'background-color 0.1s',
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleOrder(order.id); }}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: order.color, flexShrink: 0 }} />
                    <span style={{
                      flex: 1,
                      fontFamily: 'var(--font-family-text)',
                      fontSize: 11,
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--foreground)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {order.name}
                    </span>
                  </div>

                  {/* Gantt cell */}
                  <div style={{
                    width: totalWidth,
                    flexShrink: 0,
                    position: 'relative',
                    height: ROW_H,
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: isOrderSel ? order.color + '07' : 'transparent',
                  }}>
                    <MonthGridLines months={months} dateToX={dateToX} opacity={0.4} />
                    {renderCampaignBand({
                      orderId: order.id,
                      start: campaignSpan.start,
                      end: campaignSpan.end,
                      color: order.color,
                      label: order.name,
                      isSelected: isOrderSel,
                    })}
                  </div>
                </div>

                {/* ── Flight rows ──────────────────────────────────────── */}
                {expanded &&
                  order.flights.map((flight, fi) => {
                    const fColor = FLIGHT_PALETTE[fi % FLIGHT_PALETTE.length];
                    const fStart = parseDate(flight.startDate) ?? oStart;
                    const fEnd   = parseDate(flight.endDate)   ?? oEnd;
                    const isFSel =
                      selected?.type === 'flight' &&
                      (selected as any).orderId === order.id &&
                      selected.flightId === flight.id;

                    return (
                      <div key={flight.id} style={{ display: 'flex', height: ROW_H }}>
                        {/* Flight label — sticky left */}
                        <div style={{
                          width: LEFT_W,
                          flexShrink: 0,
                          position: 'sticky',
                          left: 0,
                          zIndex: 12,
                          backgroundColor: isFSel ? fColor + '12' : 'var(--sidebar)',
                          borderRight: '1px solid var(--border)',
                          borderBottom: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          paddingLeft: 24,
                          paddingRight: 6,
                          transition: 'background-color 0.1s',
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: fColor, flexShrink: 0 }} />
                          <span style={{
                            flex: 1,
                            fontFamily: 'var(--font-family-text)',
                            fontSize: 10,
                            fontWeight: 'var(--font-weight-light)',
                            color: 'var(--foreground)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {flight.name}
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-family-text)',
                            fontSize: 9,
                            color: 'var(--muted-foreground)',
                            flexShrink: 0,
                          }}>
                            {CHANNEL_LABELS[flight.channel]}
                          </span>
                        </div>

                        {/* Flight gantt cell */}
                        <div style={{
                          width: totalWidth,
                          flexShrink: 0,
                          position: 'relative',
                          height: ROW_H,
                          borderBottom: '1px solid var(--border)',
                          backgroundColor: 'var(--sidebar)',
                        }}>
                          <MonthGridLines months={months} dateToX={dateToX} opacity={0.3} />
                          {renderBar({
                            orderId: order.id,
                            flightId: flight.id,
                            originalStart: fStart,
                            originalEnd: fEnd,
                            color: fColor,
                            label: flight.name,
                            barH: FLIGHT_BAR_H,
                            itemKind: 'flight',
                            dimmed: !isFSel && selected !== null && selected.type !== null,
                          })}
                        </div>
                      </div>
                    );
                  })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}