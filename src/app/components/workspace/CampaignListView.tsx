import React from 'react';
import { Plus, GanttChart } from 'lucide-react';
import { CampaignItem } from './types';

interface CampaignListViewProps {
  campaigns: CampaignItem[];
  selectedCampaignId: string | undefined;
  onSelectCampaign: (id: string) => void;
  /** From budget strip empty state */
  onAddCampaign?: () => void;
}

function fmtDateRange(start: string, end: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return 'Ingen periode satt';
  }
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: '2-digit' };
  return `${a.toLocaleDateString('nb-NO', o)} – ${b.toLocaleDateString('nb-NO', o)}`;
}

export function CampaignListView({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onAddCampaign,
}: CampaignListViewProps) {
  if (campaigns.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <GanttChart size={40} style={{ color: 'var(--muted-foreground)', marginBottom: 12 }} />
          <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', marginBottom: 6 }}>
            No campaigns yet
          </div>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16 }}>
            Create a campaign to plan order lines and flights on a schedule that fits SMB workflows.
          </div>
          {onAddCampaign && (
            <button
              type="button"
              onClick={onAddCampaign}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--secondary)',
                fontFamily: 'var(--font-family-text)',
                fontSize: 13,
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--foreground)',
                cursor: 'pointer',
              }}
            >
              <Plus size={18} />
              New campaign
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 18px 24px', boxSizing: 'border-box', maxWidth: 720, margin: '0 auto', width: '100%' }}>
      <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 15, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Campaigns
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {campaigns.map(c => {
          const isSel = selectedCampaignId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              data-adweb-campaign-row={c.id}
              onClick={() => onSelectCampaign(c.id)}
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                border: `1px solid ${isSel ? c.color + 'aa' : 'var(--border)'}`,
                backgroundColor: isSel ? c.color + '14' : 'var(--card)',
                cursor: 'pointer',
                transition: 'border-color 0.12s, background-color 0.12s',
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: c.color, marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', marginBottom: 4 }}>
                    {c.name || 'Untitled campaign'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginBottom: 6 }}>
                    {c.advertiser || 'No advertiser'}{' '}
                    · {fmtDateRange(c.startDate, c.endDate)}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>{c.status}</span>
                    <span style={{ color: 'var(--border)' }}>|</span>
                    <span style={{ fontFamily: 'var(--font-family-display)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
                      {c.budget.total > 0 ? c.budget.total.toLocaleString('nb-NO') : '—'} <span style={{ fontFamily: 'var(--font-family-text)', fontWeight: 300, fontSize: 11, color: 'var(--muted-foreground)' }}>{c.budget.currency}</span>
                    </span>
                    <span style={{ color: 'var(--border)' }}>|</span>
                    <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--muted-foreground)' }}>
                      {c.orderLines.length} order line{c.orderLines.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
