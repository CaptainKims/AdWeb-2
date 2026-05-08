import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, forwardRef } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, Play, Tv } from 'lucide-react';
import { differenceInCalendarDays, getISOWeek, addDays, startOfMonth, endOfMonth, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { CampaignItem, Channel, FlightItem, SelectedItem, WeightPoint } from './types';
import { DEFAULT_WEIGHT_CURVE, campaignHasTimelineSchedule } from './types';
import { getCampaignMonoPair, resolveFlightColor, resolveOlColor } from './colorUtils';
import { CAMPAIGN_STATUS_LABELS_NB } from './campaignTimelineChips';
import { ymdToOrd } from './timelineDateHierarchy';
import { WeightCurveBarEditor } from './WeightCurveEditor';
import { CreativeInlinePlay } from './CreativeMediaPreview';
import { Slider } from '../ui/slider';

export const TIMELINE_LABEL_COL_W = 212;
/** Month row + week labels + day row (same height always; day labels only when zoomed in) + gap. */
const TIMELINE_MONTH_ROW_H = 17;
const TIMELINE_WEEK_LABEL_H = 15;
/** Weekday + date stack when zoomed in (tall enough for full abbreviated weekday). Row reserved at all zoom levels. */
const TIMELINE_DAY_ROW_H = 32;
/** Show per-day labels when columns are wide enough to stay readable. */
const DAY_AXIS_DETAIL_MIN_PPD = 19;
const ROW_CAMP = 40;
const ROW_OL = 30;
const ROW_FL = 48;
/** Title strip above the curve inside a flight bar (px). */
const FL_TITLE_ROW_H = 15;
const FL_CURVE_GAP = 2;

/** Below this width, hide secondary icons (play, channel). */
const ICON_HIDE_UNDER_PX = 72;
/** Narrow bars: tighter padding + ellipsis only. */
const COMPACT_UNDER_PX = 56;

function parseYmd(s: string): Date {
  return new Date(s + 'T12:00:00');
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const HANDLE_W = 6;
const DRAG_THRESHOLD_PX = 4;
/** Magnetic snap to nearby dates when dragging timeline bar edges or moving a bar. */
const SNAP_PX = 12;

function clientXContentX(scrollEl: HTMLDivElement, clientX: number): number {
  const rect = scrollEl.getBoundingClientRect();
  return scrollEl.scrollLeft + clientX - rect.left - TIMELINE_LABEL_COL_W;
}

function minYmd(a: string, b: string): string {
  return a <= b ? a : b;
}
function maxYmd(a: string, b: string): string {
  return a >= b ? a : b;
}

function shiftYmd(iso: string, days: number): string {
  return toYmd(addDays(parseYmd(iso), days));
}

/**
 * Resize from the **right** handle: keep start fixed. Map pointer X to the **inclusive** end day
 * index so the exclusive right edge stays on day boundaries (avoids right-edge creep).
 */
function resizeREndYmdFromPointer(
  scrollEl: HTMLDivElement | null,
  clientX: number,
  anchorStartYmd: string,
  rangeStart: Date,
  ppd: number,
): string {
  if (!scrollEl) return anchorStartYmd;
  const p = Math.max(ppd, 1);
  const x = clientXContentX(scrollEl, clientX);
  const nS = differenceInCalendarDays(parseYmd(anchorStartYmd), rangeStart);
  const idxEnd = Math.max(nS, Math.round(x / p) - 1);
  return toYmd(addDays(rangeStart, idxEnd));
}

/**
 * Resize from the **left** handle: keep end fixed. Map pointer X to the **inclusive** start day
 * index using floor so the left edge aligns to day columns.
 */
function resizeLStartYmdFromPointer(
  scrollEl: HTMLDivElement | null,
  clientX: number,
  anchorEndYmd: string,
  rangeStart: Date,
  ppd: number,
): string {
  if (!scrollEl) return anchorEndYmd;
  const p = Math.max(ppd, 1);
  const x = clientXContentX(scrollEl, clientX);
  const nE = differenceInCalendarDays(parseYmd(anchorEndYmd), rangeStart);
  const idxStart = Math.min(nE, Math.floor(x / p));
  return toYmd(addDays(rangeStart, idxStart));
}

function snapYmdToDates(raw: string, targets: string[], ppd: number): string {
  if (targets.length === 0) return raw;
  const ro = ymdToOrd(raw);
  let best = raw;
  let bestPx = SNAP_PX + 1;
  for (const t of targets) {
    const px = Math.abs(ymdToOrd(t) - ro) * ppd;
    if (px < bestPx) {
      bestPx = px;
      best = t;
    }
  }
  return bestPx <= SNAP_PX ? best : raw;
}

/** Adjust integer day delta so the moved start date snaps to the nearest target within SNAP_PX. */
function snapDeltaMove(s0: string, rawDelta: number, targets: string[], ppd: number): number {
  if (!targets.length || rawDelta === 0) return rawDelta;
  const candS = shiftYmd(s0, rawDelta);
  const snappedS = snapYmdToDates(candS, targets, ppd);
  return differenceInCalendarDays(parseYmd(snappedS), parseYmd(s0));
}

function flightDurationLabel(fl: FlightItem): string {
  const fmt = (sec: number) => `${sec} sek.`;
  if (fl.creative?.format && /^(\d+)s$/.test(fl.creative.format)) {
    const sec = parseInt(fl.creative.format, 10);
    return fmt(Number.isFinite(sec) ? sec : 30);
  }
  return fmt(fl.creative?.duration ?? 30);
}

function channelGlyph(ch: Channel) {
  if (ch === 'tv') return <Tv size={11} aria-hidden />;
  return <Tv size={11} aria-hidden />;
}

function isSelectedCampaign(sel: SelectedItem | null, id: string) {
  return sel?.type === 'campaign' && sel.campaignId === id;
}
function isSelectedOl(sel: SelectedItem | null, cid: string, olid: string) {
  return (sel?.type === 'order-line' || sel?.type === 'order-line-targeting') && sel.campaignId === cid && sel.orderLineId === olid;
}
function isSelectedFlight(sel: SelectedItem | null, cid: string, olid: string, fid: string) {
  return (sel?.type === 'flight' || sel?.type === 'creative') && sel.campaignId === cid && sel.orderLineId === olid && sel.flightId === fid;
}

/** Padded min/max timeline window from campaigns that have a scheduled hull (others use default month window). */
function computeTimelinePaddedBounds(campaigns: CampaignItem[], pixelsPerDay: number): { start: Date; end: Date } {
  const dates: Date[] = [];
  for (const c of campaigns) {
    if (!campaignHasTimelineSchedule(c)) continue;
    dates.push(parseYmd(c.startDate), parseYmd(c.endDate));
    for (const ol of c.orderLines) {
      dates.push(parseYmd(ol.startDate), parseYmd(ol.endDate));
      for (const fl of ol.flights) {
        dates.push(parseYmd(fl.startDate), parseYmd(fl.endDate));
      }
    }
  }
  if (dates.length === 0) {
    const n = new Date();
    const a = new Date(n.getFullYear(), n.getMonth(), 1);
    const b = new Date(n.getFullYear(), n.getMonth() + 2, 0);
    return { start: a, end: b };
  }
  const minT = Math.min(...dates.map(d => d.getTime()));
  const maxT = Math.max(...dates.map(d => d.getTime()));
  const rs = new Date(minT);
  rs.setDate(rs.getDate() - 14);
  const re = new Date(maxT);
  re.setDate(re.getDate() + 14);
  return { start: rs, end: re };
}

export interface CampaignTimelineViewProps {
  campaigns: CampaignItem[];
  pixelsPerDay: number;
  onPixelsPerDayChange: (v: number) => void;
  selected: SelectedItem | null;
  onSelect: (item: SelectedItem) => void;
  onCampaignOpen: (id: string) => void;
  onToggleCampaignCollapse: (id: string) => void;
  onUpdateCampaignDates: (id: string, start: string, end: string) => void;
  onUpdateOrderLineDates: (campaignId: string, orderLineId: string, start: string, end: string) => void;
  onUpdateFlightDates: (campaignId: string, orderLineId: string, flightId: string, start: string, end: string) => void;
  onUpdateFlightCurve: (campaignId: string, orderLineId: string, flightId: string, points: WeightPoint[]) => void;
  onMoveCampaign: (id: string, days: number) => void;
  onMoveOrderLine: (campaignId: string, orderLineId: string, days: number) => void;
}

export type CampaignTimelineViewHandle = {
  /** Zoom and scroll so the campaign’s date range fits the chart width (does not change selection). */
  focusCampaignInView: (campaignId: string) => void;
};

export const CampaignTimelineView = forwardRef<CampaignTimelineViewHandle, CampaignTimelineViewProps>(
  function CampaignTimelineView(
    {
      campaigns,
      pixelsPerDay,
      onPixelsPerDayChange,
      selected,
      onSelect,
      onCampaignOpen,
      onToggleCampaignCollapse,
      onUpdateCampaignDates,
      onUpdateOrderLineDates,
      onUpdateFlightDates,
      onUpdateFlightCurve,
      onMoveCampaign,
      onMoveOrderLine,
    },
    ref,
  ) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Campaigns hidden from the chart area only (labels stay visible); default all visible. */
  const [hiddenCampaignIds, setHiddenCampaignIds] = useState<Set<string>>(() => new Set());

  const toggleCampaignTimelineVisibility = useCallback((campId: string) => {
    setHiddenCampaignIds(prev => {
      const next = new Set(prev);
      if (next.has(campId)) next.delete(campId);
      else next.add(campId);
      return next;
    });
  }, []);

  const computedBounds = useMemo(() => computeTimelinePaddedBounds(campaigns, pixelsPerDay), [campaigns]);

  const timelineCampaigns = useMemo(
    () => campaigns.filter(campaignHasTimelineSchedule),
    [campaigns],
  );

  const campaignSig = useMemo(() => [...campaigns].map(c => c.id).sort().join('|'), [campaigns]);

  const [stableBounds, setStableBounds] = useState<{ start: Date; end: Date } | null>(null);
  const prevSigRef = useRef<string | null>(null);

  useEffect(() => {
    setStableBounds(prev => {
      if (prevSigRef.current !== campaignSig) {
        prevSigRef.current = campaignSig;
        return { start: computedBounds.start, end: computedBounds.end };
      }
      if (!prev) return { start: computedBounds.start, end: computedBounds.end };
      return {
        start: new Date(Math.min(prev.start.getTime(), computedBounds.start.getTime())),
        end: new Date(Math.max(prev.end.getTime(), computedBounds.end.getTime())),
      };
    });
  }, [computedBounds, campaignSig]);

  const rangeStart = stableBounds?.start ?? computedBounds.start;
  const rangeEnd = stableBounds?.end ?? computedBounds.end;

  const totalWidth = useMemo(() => {
    const td = differenceInCalendarDays(rangeEnd, rangeStart) + 1;
    return Math.max(td * pixelsPerDay, 800);
  }, [rangeStart, rangeEnd, pixelsPerDay]);

  /** Click–drag on empty timeline area to scroll horizontally (bars / label rows use their own handlers). */
  const timelinePanRef = useRef<{
    pointerId: number;
    originX: number;
    originScrollLeft: number;
    active: boolean;
  } | null>(null);
  const [timelinePanning, setTimelinePanning] = useState(false);
  const suppressTimelineClickRef = useRef(false);

  const onTimelineScrollPointerDownCapture = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-adweb-timeline-interactive]')) return;
    if (t.closest('[data-adweb-timeline-label-row]')) return;
    if (t.closest('button, a, input, textarea, [role="slider"], label')) return;
    const el = scrollRef.current;
    if (!el) return;
    timelinePanRef.current = {
      pointerId: e.pointerId,
      originX: e.clientX,
      originScrollLeft: el.scrollLeft,
      active: false,
    };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onTimelineScrollPointerMove = useCallback((e: React.PointerEvent) => {
    const p = timelinePanRef.current;
    if (!p || e.pointerId !== p.pointerId) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - p.originX;
    if (!p.active) {
      if (Math.abs(dx) < 6) return;
      p.active = true;
      setTimelinePanning(true);
      suppressTimelineClickRef.current = true;
    }
    el.scrollLeft = p.originScrollLeft - dx;
    e.preventDefault();
  }, []);

  const endTimelinePan = useCallback((e: React.PointerEvent) => {
    const p = timelinePanRef.current;
    if (!p || e.pointerId !== p.pointerId) return;
    timelinePanRef.current = null;
    setTimelinePanning(false);
    try {
      scrollRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onTimelineScrollLostPointerCapture = useCallback(() => {
    timelinePanRef.current = null;
    setTimelinePanning(false);
  }, []);

  const onTimelineScrollClickCapture = useCallback((e: React.MouseEvent) => {
    if (suppressTimelineClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressTimelineClickRef.current = false;
    }
  }, []);

  const dateToX = useCallback(
    (iso: string) => differenceInCalendarDays(parseYmd(iso), rangeStart) * pixelsPerDay,
    [rangeStart, pixelsPerDay],
  );

  const weekStarts = useMemo(() => {
    const weeks: { x: number; label: string }[] = [];
    let cur = new Date(rangeStart);
    cur.setHours(12, 0, 0, 0);
    const end = new Date(rangeEnd);
    end.setHours(12, 0, 0, 0);
    const dow = cur.getDay();
    const mondayDelta = dow === 0 ? -6 : 1 - dow;
    cur.setDate(cur.getDate() + mondayDelta);
    while (cur <= end) {
      const x = differenceInCalendarDays(cur, rangeStart) * pixelsPerDay;
      if (!Number.isNaN(x)) {
        weeks.push({ x, label: `W${getISOWeek(cur)}` });
      }
      cur = new Date(cur);
      cur.setDate(cur.getDate() + 7);
    }
    return weeks;
  }, [rangeStart, rangeEnd, pixelsPerDay]);

  const monthBands = useMemo(() => {
    const rs = new Date(rangeStart);
    rs.setHours(12, 0, 0, 0);
    const re = new Date(rangeEnd);
    re.setHours(12, 0, 0, 0);
    const ppd = Math.max(pixelsPerDay, 1);
    const bands: { x: number; width: number; label: string; key: string }[] = [];
    let mStart = startOfMonth(rs);
    mStart.setHours(12, 0, 0, 0);
    while (mStart <= re) {
      const mEnd = endOfMonth(mStart);
      mEnd.setHours(12, 0, 0, 0);
      const segStart = mStart < rs ? rs : mStart;
      const segEnd = mEnd > re ? re : mEnd;
      const x = differenceInCalendarDays(segStart, rangeStart) * ppd;
      const width = Math.max((differenceInCalendarDays(segEnd, segStart) + 1) * ppd, 2);
      const narrow = width < 76;
      const label = narrow
        ? mStart.toLocaleDateString('nb-NO', { month: 'short', year: '2-digit' })
        : mStart.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });
      bands.push({
        x,
        width,
        label: label.charAt(0).toLocaleUpperCase('nb-NO') + label.slice(1),
        key: `${mStart.getFullYear()}-${mStart.getMonth()}`,
      });
      mStart = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 1, 12, 0, 0, 0);
    }
    return bands;
  }, [rangeStart, rangeEnd, pixelsPerDay]);

  const showDayAxisDetail = pixelsPerDay > DAY_AXIS_DETAIL_MIN_PPD;
  const headerAxisH = TIMELINE_MONTH_ROW_H + TIMELINE_WEEK_LABEL_H + TIMELINE_DAY_ROW_H + 4;

  const dayAxisTicks = useMemo(() => {
    if (!showDayAxisDetail) return [];
    const ppd = Math.max(pixelsPerDay, 1);
    const ticks: { key: string; x: number; weekday: string; dayNum: string }[] = [];
    let cur = new Date(rangeStart);
    cur.setHours(12, 0, 0, 0);
    const end = new Date(rangeEnd);
    end.setHours(12, 0, 0, 0);
    while (cur <= end) {
      const idx = differenceInCalendarDays(cur, rangeStart);
      ticks.push({
        key: toYmd(cur),
        x: idx * ppd,
        weekday: format(cur, 'EEE', { locale: nb }),
        dayNum: format(cur, 'd'),
      });
      cur = addDays(cur, 1);
    }
    return ticks;
  }, [rangeStart, rangeEnd, pixelsPerDay, showDayAxisDetail]);

  const todayYmd = toYmd(new Date());
  const todayParse = parseYmd(todayYmd);
  const todayInRange =
    differenceInCalendarDays(todayParse, rangeStart) >= 0 &&
    differenceInCalendarDays(rangeEnd, todayParse) >= 0;
  const todayX = dateToX(todayYmd);

  /** After programmatic zoom, scroll so campaign start aligns with the chart left edge. */
  const [pendingCampaignFocus, setPendingCampaignFocus] = useState<{
    campaignId: string;
    targetPpd: number;
  } | null>(null);

  const requestFocusAndZoom = useCallback(
    (campaignId: string) => {
      const camp = campaigns.find(c => c.id === campaignId);
      if (!camp || !campaignHasTimelineSchedule(camp)) return;

      const el = scrollRef.current;
      const viewportW = el?.clientWidth ?? 0;
      const chartW = Math.max(120, viewportW - TIMELINE_LABEL_COL_W);

      const daySpan = Math.max(
        1,
        differenceInCalendarDays(parseYmd(camp.endDate), parseYmd(camp.startDate)) + 1,
      );
      const rawPpd = Math.floor(chartW / daySpan);
      const targetPpd = Math.max(4, Math.min(44, rawPpd));

      onPixelsPerDayChange(targetPpd);
      setPendingCampaignFocus({ campaignId, targetPpd });
    },
    [campaigns, onPixelsPerDayChange],
  );

  const activateCampaignView = useCallback(
    (campaignId: string) => {
      onCampaignOpen(campaignId);
      requestFocusAndZoom(campaignId);
    },
    [onCampaignOpen, requestFocusAndZoom],
  );

  useImperativeHandle(
    ref,
    () => ({
      focusCampaignInView: (id: string) => {
        requestFocusAndZoom(id);
      },
    }),
    [requestFocusAndZoom],
  );

  useLayoutEffect(() => {
    if (!pendingCampaignFocus) return;
    if (pixelsPerDay !== pendingCampaignFocus.targetPpd) return;

    const camp = campaigns.find(c => c.id === pendingCampaignFocus.campaignId);
    const el = scrollRef.current;
    setPendingCampaignFocus(null);

    if (!camp || !el) return;
    if (!campaignHasTimelineSchedule(camp)) return;

    const ppd = Math.max(pixelsPerDay, 1);
    const leftPx = differenceInCalendarDays(parseYmd(camp.startDate), rangeStart) * ppd;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollLeft = Math.max(0, Math.min(leftPx, maxScroll));
  }, [pendingCampaignFocus, pixelsPerDay, campaigns, rangeStart]);

  return (
    <div
      data-adweb-timeline-root
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--background)',
        overflow: 'hidden',
      }}
    >
      <div
        data-adweb-timeline-zoom
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '8px 12px 10px',
          borderBottom: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
          backgroundColor: 'var(--card)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
          Zoom
        </span>
        <div style={{ width: 160, flexShrink: 0 }}>
          <Slider
            min={4}
            max={44}
            step={1}
            value={[pixelsPerDay]}
            onValueChange={v => onPixelsPerDayChange(v[0] ?? pixelsPerDay)}
            aria-label="Tidslinje zoom"
          />
        </div>
        <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, color: 'var(--muted-foreground)', minWidth: 52 }}>
          {pixelsPerDay}px/d
        </span>
      </div>

      <div
        ref={scrollRef}
        onPointerDownCapture={onTimelineScrollPointerDownCapture}
        onPointerMove={onTimelineScrollPointerMove}
        onPointerUpCapture={endTimelinePan}
        onPointerCancelCapture={endTimelinePan}
        onLostPointerCapture={onTimelineScrollLostPointerCapture}
        onClickCapture={onTimelineScrollClickCapture}
        style={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
          cursor: timelinePanning ? 'grabbing' : 'default',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', minWidth: TIMELINE_LABEL_COL_W + totalWidth }}>
          <div
            style={{
              width: TIMELINE_LABEL_COL_W,
              flexShrink: 0,
              position: 'sticky',
              left: 0,
              zIndex: 4,
              backgroundColor: 'var(--background)',
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ height: headerAxisH, flexShrink: 0 }} />
            {timelineCampaigns.map(camp => {
              const expanded = !camp.collapsed;
              const chartHidden = hiddenCampaignIds.has(camp.id);
              const rows: React.ReactNode[] = [];
              rows.push(
                <TimelineLabelRow
                  key={`${camp.id}-h`}
                  height={ROW_CAMP}
                  padded
                  onClick={() => activateCampaignView(camp.id)}
                  selected={isSelectedCampaign(selected, camp.id)}
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={e => {
                      e.stopPropagation();
                      onToggleCampaignCollapse(camp.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 26,
                      height: 26,
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      background: 'transparent',
                      color: 'var(--foreground)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <button
                    type="button"
                    aria-label={chartHidden ? 'Vis kampanje i tidslinjen' : 'Skjul kampanje i tidslinjen'}
                    aria-pressed={chartHidden}
                    title={chartHidden ? 'Vis i tidslinjen' : 'Skjul fra tidslinjen'}
                    onClick={e => {
                      e.stopPropagation();
                      toggleCampaignTimelineVisibility(camp.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 26,
                      height: 26,
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      background: 'transparent',
                      color: chartHidden ? 'var(--muted-foreground)' : 'var(--foreground)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {chartHidden ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0, opacity: chartHidden ? 0.55 : 1 }}>
                    <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {camp.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {camp.advertiser || '—'}
                    </div>
                  </div>
                </TimelineLabelRow>,
              );
              if (!chartHidden && expanded) {
                camp.orderLines.forEach(ol => {
                  rows.push(
                    <TimelineLabelRow
                      key={`${camp.id}-ol-${ol.id}`}
                      height={ROW_OL}
                      padded
                      indent
                      onClick={() => onSelect({ type: 'order-line', campaignId: camp.id, orderLineId: ol.id })}
                      selected={isSelectedOl(selected, camp.id, ol.id)}
                    >
                      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ol.name}
                      </span>
                    </TimelineLabelRow>,
                  );
                  if (ol.flights.length > 0) {
                    rows.push(
                      <TimelineLabelRow
                        key={`${camp.id}-ol-fl-${ol.id}`}
                        height={ROW_FL}
                        padded
                        indent2
                        onClick={() =>
                          onSelect({
                            type: 'flight',
                            campaignId: camp.id,
                            orderLineId: ol.id,
                            flightId: ol.flights[0]!.id,
                          })
                        }
                        selected={ol.flights.some(fl => isSelectedFlight(selected, camp.id, ol.id, fl.id))}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-family-text)',
                            fontSize: 10,
                            color: 'var(--muted-foreground)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={ol.flights.map(f => f.name).join(', ')}
                        >
                          {ol.flights.map(f => f.name).join(' · ')}
                        </span>
                      </TimelineLabelRow>,
                    );
                  }
                });
              }
              return <React.Fragment key={camp.id}>{rows}</React.Fragment>;
            })}
          </div>

          <div style={{ width: totalWidth, flexShrink: 0, position: 'relative' }}>
            {/* Vertical week/month grid (behind bars); no horizontal row rules */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            >
              {weekStarts.map((w, i) => (
                <div
                  key={`wk-v-${i}`}
                  style={{
                    position: 'absolute',
                    left: w.x,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: 'color-mix(in srgb, var(--border) 22%, transparent)',
                  }}
                />
              ))}
              {monthBands.map(b => (
                <div
                  key={`mo-v-${b.key}`}
                  style={{
                    position: 'absolute',
                    left: b.x,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: 'color-mix(in srgb, var(--border) 48%, transparent)',
                  }}
                />
              ))}
              {showDayAxisDetail &&
                dayAxisTicks.map(d => (
                  <div
                    key={`day-v-${d.key}`}
                    style={{
                      position: 'absolute',
                      left: d.x,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      backgroundColor: 'color-mix(in srgb, var(--border) 14%, transparent)',
                    }}
                  />
                ))}
            </div>
            <div
              style={{
                height: headerAxisH,
                position: 'relative',
                zIndex: 1,
                backgroundColor: 'var(--card)',
              }}
            >
              {monthBands.map(b => (
                <div
                  key={b.key}
                  style={{
                    position: 'absolute',
                    left: b.x,
                    top: 0,
                    width: b.width,
                    height: TIMELINE_MONTH_ROW_H,
                    boxSizing: 'border-box',
                    backgroundColor: 'color-mix(in srgb, var(--muted) 10%, transparent)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-family-text)',
                      fontSize: 10,
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--foreground)',
                      padding: '2px 6px 0',
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                    title={b.label}
                  >
                    {b.label}
                  </div>
                </div>
              ))}
              {weekStarts.map((w, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: w.x,
                    top: TIMELINE_MONTH_ROW_H,
                    width: 7 * pixelsPerDay,
                    height: TIMELINE_WEEK_LABEL_H,
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-family-text)',
                      fontSize: 9,
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--muted-foreground)',
                      padding: '2px 6px 0',
                    }}
                  >
                    {w.label}
                  </div>
                </div>
              ))}
              {showDayAxisDetail &&
                dayAxisTicks.map(d => {
                  const ppd = Math.max(pixelsPerDay, 1);
                  const narrow = ppd < 26;
                  const wd = d.weekday.replace(/\.$/, '').trim();
                  return (
                    <div
                      key={d.key}
                      title={`${wd} ${d.dayNum}.`}
                      style={{
                        position: 'absolute',
                        left: d.x,
                        top: TIMELINE_MONTH_ROW_H + TIMELINE_WEEK_LABEL_H,
                        width: ppd,
                        height: TIMELINE_DAY_ROW_H,
                        boxSizing: 'border-box',
                        borderLeft: '1px solid color-mix(in srgb, var(--border) 35%, transparent)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        padding: '4px 2px',
                        overflow: 'visible',
                        pointerEvents: 'none',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-family-text)',
                          fontSize: narrow ? 8 : 9,
                          fontWeight: 600,
                          color: 'var(--muted-foreground)',
                          lineHeight: 1.2,
                          textTransform: 'capitalize',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                      >
                        {wd}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-family-text)',
                          fontSize: narrow ? 10 : 11,
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--foreground)',
                          lineHeight: 1,
                        }}
                      >
                        {d.dayNum}
                      </span>
                    </div>
                  );
                })}
            </div>

            {todayInRange && (
              <div
                role="img"
                aria-label={`Idag, ${todayYmd}`}
                style={{
                  position: 'absolute',
                  left: todayX,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(180deg, color-mix(in srgb, var(--primary) 55%, transparent) 0, var(--primary) ${Math.min(headerAxisH + 24, 80)}px, var(--primary) 100%)`,
                    opacity: 0.88,
                    boxShadow: '2px 0 10px color-mix(in srgb, var(--primary) 35%, transparent)',
                  }}
                />
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 1,
                    top: 3,
                    transform: 'translateX(-50%)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 9,
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--primary-foreground)',
                    backgroundColor: 'var(--primary)',
                    zIndex: 1,
                    boxShadow: '0 1px 6px color-mix(in srgb, var(--foreground) 20%, transparent)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Idag
                </span>
              </div>
            )}

            {timelineCampaigns.map(camp => (
              <CampaignBlock
                key={camp.id}
                scrollRef={scrollRef}
                rangeStart={rangeStart}
                camp={camp}
                pixelsPerDay={pixelsPerDay}
                timelineHidden={hiddenCampaignIds.has(camp.id)}
                onSelect={onSelect}
                onCampaignOpen={activateCampaignView}
                onUpdateCampaignDates={onUpdateCampaignDates}
                onUpdateOrderLineDates={onUpdateOrderLineDates}
                onUpdateFlightDates={onUpdateFlightDates}
                onUpdateFlightCurve={onUpdateFlightCurve}
                onMoveCampaign={onMoveCampaign}
                onMoveOrderLine={onMoveOrderLine}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  },
);

CampaignTimelineView.displayName = 'CampaignTimelineView';

function TimelineLabelRow({
  height,
  children,
  padded,
  indent,
  indent2,
  onClick,
  selected,
}: {
  height: number;
  children: React.ReactNode;
  padded?: boolean;
  indent?: boolean;
  indent2?: boolean;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <div
      data-adweb-timeline-label-row={onClick ? true : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={e => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        height,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        paddingLeft: padded ? 8 + (indent ? 10 : 0) + (indent2 ? 12 : 0) : 0,
        paddingRight: 8,
        backgroundColor: selected ? 'rgba(165, 180, 252, 0.08)' : 'transparent',
      }}
    >
      {children}
    </div>
  );
}

function TimelineInteractiveBar({
  scrollRef,
  rangeStart,
  pixelsPerDay,
  topPx,
  heightPx,
  borderRadius,
  barStyle,
  ariaLabel,
  startDate,
  endDate,
  snapDates,
  onMoveByDays,
  onCommitRange,
  onBodyClick,
  renderInner,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  rangeStart: Date;
  pixelsPerDay: number;
  topPx: number;
  heightPx: number;
  borderRadius: number;
  barStyle: React.CSSProperties;
  ariaLabel: string;
  startDate: string;
  endDate: string;
  snapDates?: string[];
  onMoveByDays?: (days: number) => void;
  onCommitRange?: (start: string, end: string) => void;
  onBodyClick?: () => void;
  renderInner: (innerWidthPx: number, innerHeightPx: number) => React.ReactNode;
}) {
  const [preview, setPreview] = useState<{ start: string; end: string } | null>(null);
  const drag = useRef<{
    pointerId: number;
    kind: 'move' | 'resizeL' | 'resizeR';
    x0: number;
    s0: string;
    e0: string;
  } | null>(null);
  const suppressClick = useRef(false);
  const moved = useRef(false);

  useEffect(() => {
    if (!drag.current) setPreview(null);
  }, [startDate, endDate]);

  const displayStart = preview?.start ?? startDate;
  const displayEnd = preview?.end ?? endDate;

  const { leftPx, widthPx } = useMemo(() => {
    const ppd = Math.max(pixelsPerDay, 1);
    const left = differenceInCalendarDays(parseYmd(displayStart), rangeStart) * ppd;
    const days = differenceInCalendarDays(parseYmd(displayEnd), parseYmd(displayStart)) + 1;
    const width = Math.max(days * ppd, 4);
    return { leftPx: left, widthPx: width };
  }, [displayStart, displayEnd, rangeStart, pixelsPerDay]);

  const ppd = Math.max(pixelsPerDay, 1);
  const snaps = snapDates ?? [];

  const contentXFromEvent = (clientX: number) => {
    const el = scrollRef.current;
    if (!el) return 0;
    return clientXContentX(el, clientX);
  };

  const updatePreviewFromClientX = (clientX: number) => {
    const d = drag.current;
    if (!d) return;
    const el = scrollRef.current;
    const x = contentXFromEvent(clientX);
    if (Math.abs(x - d.x0) > DRAG_THRESHOLD_PX) moved.current = true;
    if (!moved.current) return;

    if (d.kind === 'move' && onMoveByDays) {
      let delta = Math.round((x - d.x0) / ppd);
      if (snaps.length) delta = snapDeltaMove(d.s0, delta, snaps, ppd);
      setPreview({ start: shiftYmd(d.s0, delta), end: shiftYmd(d.e0, delta) });
      return;
    }
    if (!el || !onCommitRange) return;

    if (d.kind === 'resizeL') {
      let newS = resizeLStartYmdFromPointer(el, clientX, d.e0, rangeStart, ppd);
      if (snaps.length) newS = snapYmdToDates(newS, snaps, ppd);
      newS = minYmd(newS, d.e0);
      if (ymdToOrd(newS) > ymdToOrd(d.e0)) newS = d.e0;
      setPreview({ start: newS, end: d.e0 });
    } else if (d.kind === 'resizeR') {
      let newE = resizeREndYmdFromPointer(el, clientX, d.s0, rangeStart, ppd);
      if (snaps.length) newE = snapYmdToDates(newE, snaps, ppd);
      newE = maxYmd(newE, d.s0);
      if (ymdToOrd(newE) < ymdToOrd(d.s0)) newE = d.s0;
      setPreview({ start: d.s0, end: newE });
    }
  };

  const finish = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    if (!moved.current) {
      setPreview(null);
      return;
    }

    const el = scrollRef.current;

    if (d.kind === 'move' && onMoveByDays) {
      const x1 = contentXFromEvent(e.clientX);
      let delta = Math.round((x1 - d.x0) / ppd);
      if (snaps.length) delta = snapDeltaMove(d.s0, delta, snaps, ppd);
      setPreview(null);
      if (delta !== 0) {
        onMoveByDays(delta);
        suppressClick.current = true;
      }
      return;
    }

    if (!el || !onCommitRange) {
      setPreview(null);
      return;
    }

    if (d.kind === 'resizeL') {
      let newS = resizeLStartYmdFromPointer(el, e.clientX, d.e0, rangeStart, ppd);
      if (snaps.length) newS = snapYmdToDates(newS, snaps, ppd);
      newS = minYmd(newS, d.e0);
      if (ymdToOrd(newS) > ymdToOrd(d.e0)) newS = d.e0;
      setPreview(null);
      if (newS !== d.s0) {
        onCommitRange(newS, d.e0);
        suppressClick.current = true;
      }
    } else if (d.kind === 'resizeR') {
      let newE = resizeREndYmdFromPointer(el, e.clientX, d.s0, rangeStart, ppd);
      if (snaps.length) newE = snapYmdToDates(newE, snaps, ppd);
      newE = maxYmd(newE, d.s0);
      if (ymdToOrd(newE) < ymdToOrd(d.s0)) newE = d.s0;
      setPreview(null);
      if (newE !== d.e0) {
        onCommitRange(d.s0, newE);
        suppressClick.current = true;
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    e.preventDefault();
    updatePreviewFromClientX(e.clientX);
  };

  const bindDown =
    (kind: 'move' | 'resizeL' | 'resizeR') => (e: React.PointerEvent) => {
      if (kind === 'move' && !onMoveByDays) return;
      if ((kind === 'resizeL' || kind === 'resizeR') && !onCommitRange) return;
      e.stopPropagation();
      e.preventDefault();
      moved.current = false;
      setPreview(null);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = {
        pointerId: e.pointerId,
        kind,
        x0: contentXFromEvent(e.clientX),
        s0: startDate,
        e0: endDate,
      };
    };

  const onClickBody = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
      return;
    }
    onBodyClick?.();
  };

  const labelInnerW = Math.max(widthPx - 2 * HANDLE_W, 4);

  return (
    <div
      data-adweb-timeline-interactive
      style={{
        position: 'absolute',
        left: leftPx,
        top: topPx,
        width: widthPx,
        height: heightPx,
        borderRadius,
        ...barStyle,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        touchAction: 'none',
        boxSizing: 'border-box',
        zIndex: 1,
        transition: preview ? 'none' : 'left 0.12s ease-out, width 0.12s ease-out',
      }}
      role="group"
      aria-label={ariaLabel}
    >
      {onCommitRange ? (
        <div
          onPointerDown={bindDown('resizeL')}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          style={{ width: HANDLE_W, flexShrink: 0, cursor: 'ew-resize', zIndex: 2 }}
        />
      ) : (
        <div style={{ width: 0, flexShrink: 0 }} />
      )}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={onMoveByDays ? bindDown('move') : undefined}
        onPointerMove={onMoveByDays ? onPointerMove : undefined}
        onPointerUp={onMoveByDays ? finish : undefined}
        onPointerCancel={onMoveByDays ? finish : undefined}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onBodyClick?.();
          }
        }}
        onClick={onClickBody}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          cursor: onMoveByDays ? 'grab' : onBodyClick ? 'pointer' : 'default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            width: '100%',
            minWidth: 0,
            minHeight: 0,
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {renderInner(labelInnerW, heightPx)}
        </div>
      </div>
      {onCommitRange ? (
        <div
          onPointerDown={bindDown('resizeR')}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          style={{ width: HANDLE_W, flexShrink: 0, cursor: 'ew-resize', zIndex: 2 }}
        />
      ) : (
        <div style={{ width: 0, flexShrink: 0 }} />
      )}
    </div>
  );
}

function timelineSnapDatesUnique(dates: string[]): string[] {
  return [...new Set(dates.filter(Boolean))];
}

function CampaignBlock({
  scrollRef,
  rangeStart,
  camp,
  pixelsPerDay,
  timelineHidden,
  onSelect,
  onCampaignOpen,
  onUpdateCampaignDates,
  onUpdateOrderLineDates,
  onUpdateFlightDates,
  onUpdateFlightCurve,
  onMoveCampaign,
  onMoveOrderLine,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  rangeStart: Date;
  camp: CampaignItem;
  pixelsPerDay: number;
  /** When true, no bars are drawn for this campaign (spacer keeps row alignment). */
  timelineHidden: boolean;
  onSelect: (item: SelectedItem) => void;
  onCampaignOpen: (id: string) => void;
  onUpdateCampaignDates: (id: string, start: string, end: string) => void;
  onUpdateOrderLineDates: (campaignId: string, orderLineId: string, start: string, end: string) => void;
  onUpdateFlightDates: (campaignId: string, orderLineId: string, flightId: string, start: string, end: string) => void;
  onUpdateFlightCurve: (campaignId: string, orderLineId: string, flightId: string, points: WeightPoint[]) => void;
  onMoveCampaign: (id: string, days: number) => void;
  onMoveOrderLine: (campaignId: string, orderLineId: string, days: number) => void;
}) {
  if (timelineHidden) {
    return <div style={{ position: 'relative', flexShrink: 0, height: ROW_CAMP }} aria-hidden />;
  }

  const expanded = !camp.collapsed;
  const campMono = getCampaignMonoPair(camp);
  const statusNb = CAMPAIGN_STATUS_LABELS_NB[camp.status];
  const todaySnap = toYmd(new Date());

  const snapCampaign = timelineSnapDatesUnique([
    todaySnap,
    camp.startDate,
    camp.endDate,
    ...camp.orderLines.flatMap(ol => [ol.startDate, ol.endDate, ...ol.flights.flatMap(f => [f.startDate, f.endDate])]),
  ]);

  const rows: React.ReactNode[] = [
    <div key="camp" style={{ position: 'relative', height: ROW_CAMP, zIndex: 1 }}>
      <TimelineInteractiveBar
        scrollRef={scrollRef}
        rangeStart={rangeStart}
        pixelsPerDay={pixelsPerDay}
        topPx={8}
        heightPx={24}
        borderRadius={8}
        barStyle={{
          backgroundColor: campMono.primary + '55',
          border: `1px solid ${campMono.secondary}b3`,
        }}
        ariaLabel={`Kampanje ${camp.name}`}
        startDate={camp.startDate}
        endDate={camp.endDate}
        snapDates={snapCampaign}
        onMoveByDays={d => onMoveCampaign(camp.id, d)}
        onCommitRange={(s, e) => onUpdateCampaignDates(camp.id, s, e)}
        onBodyClick={() => onCampaignOpen(camp.id)}
        renderInner={(iw, _ih) => {
          const barOuter = iw + 2 * HANDLE_W;
          return (
            <TimelineBarInner
              widthPx={iw}
              title={camp.name}
              showStatus
              statusLabel={statusNb}
              showChannelIcon={barOuter >= ICON_HIDE_UNDER_PX}
              showPlay={false}
              channelNode={channelGlyph('tv')}
              compact={barOuter < COMPACT_UNDER_PX}
            />
          );
        }}
      />
    </div>,
  ];

  if (expanded) {
    camp.orderLines.forEach((ol, olIdx) => {
      const snapOl = timelineSnapDatesUnique([
        todaySnap,
        camp.startDate,
        camp.endDate,
        ...camp.orderLines.filter(o => o.id !== ol.id).flatMap(o => [o.startDate, o.endDate]),
        ...ol.flights.flatMap(f => [f.startDate, f.endDate]),
      ]);
      const olColor = resolveOlColor(camp, olIdx);
      rows.push(
        <div key={`ol-${ol.id}`} style={{ position: 'relative', height: ROW_OL, zIndex: 1 }}>
          <TimelineInteractiveBar
            scrollRef={scrollRef}
            rangeStart={rangeStart}
            pixelsPerDay={pixelsPerDay}
            topPx={5}
            heightPx={20}
            borderRadius={6}
            barStyle={{
              backgroundColor: olColor,
              opacity: 0.95,
              border: `1px solid ${campMono.secondary}55`,
            }}
            ariaLabel={`Ordrelinje ${ol.name}`}
            startDate={ol.startDate}
            endDate={ol.endDate}
            snapDates={snapOl}
            onMoveByDays={d => onMoveOrderLine(camp.id, ol.id, d)}
            onCommitRange={(s, e) => onUpdateOrderLineDates(camp.id, ol.id, s, e)}
            onBodyClick={() => onSelect({ type: 'order-line', campaignId: camp.id, orderLineId: ol.id })}
            renderInner={(iw, _ih) => {
              const barOuter = iw + 2 * HANDLE_W;
              return (
                <TimelineBarInner
                  widthPx={iw}
                  title={ol.name}
                  showStatus={false}
                  showChannelIcon={false}
                  showPlay={false}
                  compact={barOuter < COMPACT_UNDER_PX}
                />
              );
            }}
          />
        </div>,
      );

      if (ol.flights.length > 0) {
        const snapFlRow = timelineSnapDatesUnique([
          todaySnap,
          camp.startDate,
          camp.endDate,
          ol.startDate,
          ol.endDate,
          ...ol.flights.flatMap(f => [f.startDate, f.endDate]),
        ]);
        rows.push(
          <div key={`ol-flights-${ol.id}`} style={{ position: 'relative', height: ROW_FL, zIndex: 1 }}>
            {ol.flights.map((fl, flIdx) => (
            <TimelineInteractiveBar
              key={fl.id}
              scrollRef={scrollRef}
              rangeStart={rangeStart}
              pixelsPerDay={pixelsPerDay}
              topPx={2}
              heightPx={44}
              borderRadius={6}
              barStyle={{
                border: '1px dashed rgba(255,255,255,0.35)',
                backgroundColor: 'rgba(26, 22, 46, 0.9)',
              }}
              ariaLabel={`Flight ${fl.name}`}
              startDate={fl.startDate}
              endDate={fl.endDate}
              snapDates={snapFlRow}
              onMoveByDays={d => {
                if (d === 0) return;
                onUpdateFlightDates(camp.id, ol.id, fl.id, shiftYmd(fl.startDate, d), shiftYmd(fl.endDate, d));
              }}
              onCommitRange={(s, e) => onUpdateFlightDates(camp.id, ol.id, fl.id, s, e)}
              onBodyClick={() => onSelect({ type: 'flight', campaignId: camp.id, orderLineId: ol.id, flightId: fl.id })}
              renderInner={(iw, ih) => {
                const barOuter = iw + 2 * HANDLE_W;
                const curveH = Math.max(18, Math.floor(ih) - FL_TITLE_ROW_H - FL_CURVE_GAP);
                const pts =
                  Array.isArray(fl.weightCurve) && fl.weightCurve.length >= 2 ? fl.weightCurve : DEFAULT_WEIGHT_CURVE;
                const showWidePlay = barOuter >= ICON_HIDE_UNDER_PX + 16;
                const flCurveColor = resolveFlightColor(camp, olIdx, flIdx, ol.flights.length);
                return (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      minHeight: 0,
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        flex: '0 0 auto',
                        height: FL_TITLE_ROW_H,
                        minHeight: FL_TITLE_ROW_H,
                        overflow: 'hidden',
                      }}
                    >
                      <TimelineBarInner
                        widthPx={iw}
                        title={fl.name}
                        showStatus={false}
                        showChannelIcon={barOuter >= ICON_HIDE_UNDER_PX}
                        showPlay={!fl.creative && showWidePlay}
                        playSlot={
                          fl.creative && showWidePlay ? (
                            <CreativeInlinePlay
                              creative={fl.creative}
                              advertiser={camp.advertiser}
                              durationLabel={flightDurationLabel(fl)}
                              playIconSize={10}
                              buttonStyle={{
                                width: 20,
                                height: 14,
                                minHeight: 14,
                                padding: 0,
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: 'var(--muted-foreground)',
                              }}
                            />
                          ) : undefined
                        }
                        channelNode={channelGlyph(fl.channel)}
                        compact={barOuter < COMPACT_UNDER_PX}
                        flightStyle
                      />
                    </div>
                    <div
                      style={{
                        flex: '1 1 auto',
                        minHeight: 0,
                        display: 'flex',
                        alignItems: 'stretch',
                      }}
                    >
                      <WeightCurveBarEditor
                        width={iw}
                        height={curveH}
                        points={pts}
                        color={flCurveColor}
                        onChange={next => onUpdateFlightCurve(camp.id, ol.id, fl.id, next)}
                      />
                    </div>
                  </div>
                );
              }}
            />
          ))}
          </div>,
        );
      }
    });
  }

  return <>{rows}</>;
}

function TimelineBarInner({
  widthPx,
  title,
  showStatus,
  statusLabel,
  showChannelIcon,
  showPlay,
  channelNode,
  compact,
  flightStyle,
  playSlot,
}: {
  widthPx: number;
  title: string;
  showStatus?: boolean;
  statusLabel?: string;
  showChannelIcon?: boolean;
  showPlay?: boolean;
  channelNode?: React.ReactNode;
  compact?: boolean;
  flightStyle?: boolean;
  /** When set (e.g. flight with creative), opens preview modal on click; replaces static play glyph */
  playSlot?: React.ReactNode;
}) {
  const showIcons = showChannelIcon || showPlay || !!playSlot;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        height: '100%',
        padding: compact ? '0 6px' : '0 8px',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {showStatus && statusLabel && widthPx >= 120 && (
        <span
          style={{
            flexShrink: 0,
            fontSize: 9,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 99,
            backgroundColor: 'rgba(167, 243, 208, 0.22)',
            color: 'rgb(167, 243, 208)',
            fontFamily: 'var(--font-family-text)',
          }}
        >
          {statusLabel}
        </span>
      )}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'var(--font-family-text)',
          fontSize: flightStyle ? 10 : 11,
          fontWeight: 'var(--font-weight-semibold)',
          color: flightStyle ? 'var(--muted-foreground)' : 'var(--foreground)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={title}
      >
        {title}
      </span>
      {showIcons && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {playSlot ?? (showPlay ? <Play size={11} aria-hidden style={{ opacity: 0.85, flexShrink: 0 }} /> : null)}
          {showChannelIcon && channelNode}
        </div>
      )}
    </div>
  );
}
