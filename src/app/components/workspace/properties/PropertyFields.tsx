import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { CalendarRangeModal } from '../CalendarRangeModal';
import {
  TargetingConfig,
  TARGETING_CONTEXT_OPTIONS,
  TARGETING_GENDER_OPTIONS,
  targetingContextLabel,
  targetingGenderLabel,
  targetingRegionsLabel,
  type TargetingContext,
  type TargetingGender,
} from '../types';

/** Flat “ghost” fields: editable but no boxed input chrome (underline only). */
export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 2px 6px 0',
  backgroundColor: 'transparent',
  border: 'none',
  borderBottom: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
  borderRadius: 0,
  fontFamily: 'var(--font-family-text)',
  fontSize: 13,
  fontWeight: 'var(--font-weight-light)',
  color: 'var(--foreground)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.12s ease, opacity 0.12s ease',
};
export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23696982' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 2px center',
  paddingRight: 22,
};

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className="adweb-prop-input"
      style={inputStyle}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function NumberInput({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      className="adweb-prop-input"
      style={inputStyle}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
    />
  );
}

function parseYmdLocal(s: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Read-only summary + calendar icon opening a two-month range modal (nb locale). */
export function DateRangePickerControl({
  startYmd,
  endYmd,
  onChange,
}: {
  startYmd: string;
  endYmd: string;
  onChange: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const s = parseYmdLocal(startYmd);
  const e = parseYmdLocal(endYmd);
  const display =
    s && e
      ? `${format(s, 'd. MMM yyyy', { locale: nb })} – ${format(e, 'd. MMM yyyy', { locale: nb })}`
      : 'Velg periode';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        <button
          type="button"
          className="adweb-prop-input"
          onClick={() => setOpen(true)}
          style={{
            ...inputStyle,
            flex: 1,
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {display}
        </button>
        <button
          type="button"
          aria-label="Åpne kalender"
          onClick={() => setOpen(true)}
          style={{
            flexShrink: 0,
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--secondary)',
            cursor: 'pointer',
            color: 'var(--foreground)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Calendar size={18} aria-hidden />
        </button>
      </div>
      <CalendarRangeModal
        open={open}
        onClose={() => setOpen(false)}
        startYmd={startYmd || ''}
        endYmd={endYmd || ''}
        onApply={(a, b) => {
          onChange(a, b);
          setOpen(false);
        }}
      />
    </>
  );
}

export function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  const commit = () => { if (local !== value) onChange(local); };
  return (
    <input
      type="date"
      className="adweb-date-input adweb-prop-input"
      style={inputStyle}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); } }}
    />
  );
}

export function SelectInput<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select className="adweb-prop-input" style={selectStyle} value={value} onChange={e => onChange(e.target.value as T)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function TextareaInput({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      className="adweb-prop-input"
      style={{ ...inputStyle, resize: 'vertical', minHeight: rows * 22 }}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

export function SectionLabel({ icon: Icon, label, right }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; label: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 6, paddingBottom: 7, borderBottom: '1px solid var(--border)' }}>
      <Icon size={11} style={{ color: 'var(--muted-foreground)' }} />
      <span style={{ fontFamily: 'var(--font-family-display)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>
        {label}
      </span>
      {right}
    </div>
  );
}

export function TargetingSummary({ targeting, color }: { targeting: TargetingConfig; color?: string }) {
  const accent = color || 'var(--chart-2)';
  return (
    <div style={{ padding: '10px 11px', backgroundColor: accent + '10', border: `1px solid ${accent}30`, borderRadius: 'var(--radius-md)', marginBottom: 10 }}>
      <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', color: accent, marginBottom: 4 }}>{targetingRegionsLabel(targeting.counties)}</div>
      <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
        {targetingGenderLabel(targeting.gender)} · {targetingContextLabel(targeting.context)}
      </div>
    </div>
  );
}

