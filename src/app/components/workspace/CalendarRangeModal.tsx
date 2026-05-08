import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const WEEK_OPTS = { weekStartsOn: 1 as const };


function parseYmd(s: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Two months side by side; pick start/end with a spanning range highlight. */
export function CalendarRangeModal({
  open,
  onClose,
  startYmd,
  endYmd,
  onApply,
  title = 'Velg periode',
}: {
  open: boolean;
  onClose: () => void;
  startYmd: string;
  endYmd: string;
  onApply: (start: string, end: string) => void;
  title?: string;
}) {
  const initialLeft = useMemo(() => {
    const s = parseYmd(startYmd);
    const e = parseYmd(endYmd);
    if (s && e) return startOfMonth(isBefore(e, s) ? e : s);
    if (s) return startOfMonth(s);
    if (e) return startOfMonth(e);
    return startOfMonth(new Date());
  }, [startYmd, endYmd, open]);

  const [leftMonth, setLeftMonth] = useState<Date>(initialLeft);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  /** First click of a new pair; second click completes range. */
  const [rangeAnchor, setRangeAnchor] = useState<Date | null>(null);

  useEffect(() => {
    if (!open) return;
    const s = parseYmd(startYmd);
    const e = parseYmd(endYmd);
    setDraftStart(s);
    setDraftEnd(e ?? s);
    setLeftMonth(initialLeft);
    setRangeAnchor(null);
  }, [open, startYmd, endYmd, initialLeft]);

  const rightMonth = addMonths(leftMonth, 1);

  const rangeInterval = useMemo(() => {
    if (!draftStart || !draftEnd) return null;
    const a = isBefore(draftEnd, draftStart) ? draftEnd : draftStart;
    const b = isAfter(draftStart, draftEnd) ? draftStart : draftEnd;
    return { start: a, end: b };
  }, [draftStart, draftEnd]);

  const handleDayClick = (day: Date) => {
    if (rangeAnchor === null) {
      setRangeAnchor(day);
      setDraftStart(day);
      setDraftEnd(day);
      return;
    }
    const lo = isBefore(day, rangeAnchor) ? day : rangeAnchor;
    const hi = isBefore(day, rangeAnchor) ? rangeAnchor : day;
    setDraftStart(lo);
    setDraftEnd(hi);
    setRangeAnchor(null);
  };

  const apply = () => {
    if (!draftStart || !draftEnd) return;
    const a = isBefore(draftEnd, draftStart) ? draftEnd : draftStart;
    const b = isAfter(draftStart, draftEnd) ? draftStart : draftEnd;
    onApply(toYmd(a), toYmd(b));
    onClose();
  };

  if (!open || typeof document === 'undefined') return null;

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 240_000,
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
          maxWidth: 720,
          width: '100%',
          padding: '18px 20px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
            {title}
          </h2>
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
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <button
            type="button"
            aria-label="Forrige måneder"
            onClick={() => setLeftMonth(m => addMonths(m, -1))}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--secondary)',
              cursor: 'pointer',
              color: 'var(--foreground)',
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 13, color: 'var(--muted-foreground)', flex: 1, textAlign: 'center' }}>
            Klikk to dager for å sette start og slutt (eller samme dag).
          </span>
          <button
            type="button"
            aria-label="Neste måneder"
            onClick={() => setLeftMonth(m => addMonths(m, 1))}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--secondary)',
              cursor: 'pointer',
              color: 'var(--foreground)',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <MonthGrid month={leftMonth} rangeInterval={rangeInterval} onDayClick={handleDayClick} />
          <MonthGrid month={rightMonth} rangeInterval={rangeInterval} onDayClick={handleDayClick} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
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
            Avbryt
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!draftStart || !draftEnd}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--primary)',
              fontFamily: 'var(--font-family-text)',
              fontSize: 13,
              fontWeight: 'var(--font-weight-semibold)',
              cursor: draftStart && draftEnd ? 'pointer' : 'not-allowed',
              color: 'var(--primary-foreground)',
              opacity: draftStart && draftEnd ? 1 : 0.5,
            }}
          >
            Bruk datoer
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function MonthGrid({
  month,
  rangeInterval,
  onDayClick,
}: {
  month: Date;
  rangeInterval: { start: Date; end: Date } | null;
  onDayClick: (d: Date) => void;
}) {
  const label = format(month, 'LLLL yyyy', { locale: nb });
  const start = startOfWeek(startOfMonth(month), WEEK_OPTS);
  const end = endOfWeek(endOfMonth(month), WEEK_OPTS);
  const days = eachDayOfInterval({ start, end });

  const weekDays = ['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'];

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', marginBottom: 8, textAlign: 'center', textTransform: 'capitalize' }}>
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {weekDays.map(w => (
          <div key={w} style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'center', padding: '4px 0' }}>
            {w}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map(day => {
          const inMonth = isSameMonth(day, month);
          const inRange =
            rangeInterval &&
            isWithinInterval(day, { start: rangeInterval.start, end: rangeInterval.end });
          const isStart = rangeInterval && isSameDay(day, rangeInterval.start);
          const isEnd = rangeInterval && isSameDay(day, rangeInterval.end);
          const solo = Boolean(isStart && isEnd);

          return (
            <button
              key={`${format(day, 'yyyy-MM-dd')}`}
              type="button"
              disabled={!inMonth}
              onClick={() => inMonth && onDayClick(day)}
              style={{
                position: 'relative',
                height: 32,
                border: 'none',
                padding: 0,
                cursor: inMonth ? 'pointer' : 'default',
                background: 'transparent',
                fontFamily: 'var(--font-family-text)',
                fontSize: 12,
                fontWeight: inRange ? 600 : 400,
                color: inMonth ? 'var(--foreground)' : 'var(--muted-foreground)',
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              {inRange && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: solo ? 3 : isStart ? 3 : 0,
                    right: solo ? 3 : isEnd ? 3 : 0,
                    top: 4,
                    bottom: 4,
                    backgroundColor: 'color-mix(in srgb, var(--primary) 38%, transparent)',
                    borderRadius: solo ? 6 : isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : 0,
                  }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
