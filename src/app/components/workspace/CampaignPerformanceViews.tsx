import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { CampaignItem } from './types';
import {
  buildPerformanceSeries,
  campaignHasPerformanceChart,
  formatViewsCompact,
  plannedEstimatedViewsForCampaign,
  type PerformanceTone,
} from './campaignPerformance';

const MODAL_Z = 240_000;

const STATUS_COLORS: Record<PerformanceTone, string> = {
  under: '#ef4444',
  on: '#f59e0b',
  over: '#22c55e',
};

/** Single traffic-light style indicator for the timeline bar (larger than multi-dot). */
export function PerformanceStatusLight({ tone, title }: { tone: PerformanceTone; title: string }) {
  const c = STATUS_COLORS[tone];
  return (
    <div title={title} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: c,
          boxShadow: `0 0 0 2px rgba(0,0,0,0.08), 0 0 10px ${c}55`,
        }}
      />
    </div>
  );
}

function tickShort(iso: string): string {
  const p = iso.indexOf('-', 5);
  if (p < 0) return iso;
  return `${iso.slice(5, p)}.${iso.slice(p + 1)}`;
}

export function CampaignPerformanceChart({
  campaign,
  height,
  onClick,
  norwegian,
}: {
  campaign: CampaignItem;
  height: number;
  onClick?: () => void;
  /** Norwegian copy for legend/tooltip (campaign plan). */
  norwegian?: boolean;
}) {
  const data = useMemo(() => buildPerformanceSeries(campaign), [campaign]);
  if (data.length === 0) return null;

  const linePlan = norwegian ? 'Planlagt kumulativt (mål)' : 'Est. cumulative (goal)';
  const lineDelivered = norwegian ? 'Levert kumulativt (eksempel)' : 'Delivered cumulative (mock)';

  return (
    <div
      onClick={onClick}
      onKeyDown={e => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        width: '100%',
        height,
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 'var(--radius-md)',
        border: onClick ? '1px solid var(--border)' : '1px solid transparent',
        backgroundColor: 'var(--secondary)',
        padding: onClick ? '6px 4px 2px' : '2px 0 0',
        outline: 'none',
        transition: onClick ? 'border-color 0.15s, box-shadow 0.15s' : undefined,
      }}
      onMouseEnter={onClick ? e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
      } : undefined}
      onMouseLeave={onClick ? e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      } : undefined}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
            tickFormatter={tickShort}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            domain={[0, 'auto']}
            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
            tickFormatter={v => formatViewsCompact(Number(v))}
            width={44}
          />
          <Tooltip
            formatter={(value: number | undefined) =>
              value == null || Number.isNaN(Number(value)) ? '—' : Number(value).toLocaleString('nb-NO')}
            labelFormatter={label => (norwegian ? `Dato ${label}` : `Date ${label}`)}
            contentStyle={{
              fontSize: 11,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 2 }} />
          <Line
            type="linear"
            dataKey="estimatedCumulative"
            name={linePlan}
            stroke="#64748b"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="deliveredCumulative"
            name={lineDelivered}
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PerformanceChartModal({
  campaign,
  open,
  onClose,
  norwegian,
}: {
  campaign: CampaignItem | null;
  open: boolean;
  onClose: () => void;
  norwegian?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !campaign || !campaignHasPerformanceChart(campaign)) return null;

  const planGoal = plannedEstimatedViewsForCampaign(campaign);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={norwegian ? 'Leveranse' : 'Delivery performance'}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: MODAL_Z,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
              {norwegian ? 'Leveranse' : 'Delivery performance'}
            </div>
            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginTop: 3 }}>
              {norwegian
                ? `${campaign.name} · planlagt 0→${formatViewsCompact(planGoal)} (prototype) · levert kun til og med i dag`
                : `${campaign.name} · cumulative est. 0→${formatViewsCompact(planGoal)} (prototype) · mock delivered through today only`}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={norwegian ? 'Lukk' : 'Close'}
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
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '12px 16px 20px', flex: 1, minHeight: 400 }}>
          <CampaignPerformanceChart campaign={campaign} height={400} norwegian={norwegian} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
