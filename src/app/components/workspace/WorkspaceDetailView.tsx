import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SelectedItem, CampaignItem } from './types';
import { deriveShelfMeta } from './properties/shelfMeta';
import { WorkspacePropertyPanelContent, WorkspacePropertyPanelCallbacks } from './properties/PropertyPanels';

export function navigateSelectedBack(selected: SelectedItem): SelectedItem | null {
  switch (selected.type) {
    case 'creative':
      return { type: 'flight', campaignId: selected.campaignId, orderLineId: selected.orderLineId, flightId: selected.flightId };
    case 'flight':
      return { type: 'order-line', campaignId: selected.campaignId, orderLineId: selected.orderLineId };
    case 'order-line-targeting':
      return { type: 'order-line', campaignId: selected.campaignId, orderLineId: selected.orderLineId };
    case 'order-line':
      return { type: 'campaign', campaignId: selected.campaignId };
    case 'campaign':
      return null;
    default:
      return null;
  }
}

interface WorkspaceDetailViewProps extends WorkspacePropertyPanelCallbacks {
  selected: SelectedItem;
  campaigns: CampaignItem[];
  onBack: () => void;
  onNavigate: (item: SelectedItem) => void;
}

export function WorkspaceDetailView({
  selected,
  campaigns,
  onBack,
  onNavigate,
  ...propertyPanelHandlers
}: WorkspaceDetailViewProps) {
  void onNavigate;

  const meta = deriveShelfMeta(selected, campaigns);

  const propertyPanel = (
    <WorkspacePropertyPanelContent selected={selected} campaigns={campaigns} {...propertyPanelHandlers} />
  );

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      data-adweb-workspace-detail
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--background)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .adweb-date-input::-webkit-calendar-picker-indicator {
          filter: brightness(0.4);
          cursor: pointer;
          opacity: 0.75;
        }
      `}</style>

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 8px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontFamily: 'var(--font-family-text)',
            fontSize: 12,
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--muted-foreground)',
          }}
        >
          <ChevronLeft size={16} />
          Tilbake
        </button>
        <div style={{ width: 3, height: 26, borderRadius: 2, backgroundColor: meta.accentColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 9, fontWeight: 'var(--font-weight-semibold)', color: meta.accentColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{meta.typeLabel}</div>
          <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 15, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.title}</div>
        </div>
        {meta.breadcrumb.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 1, gap: 2, maxWidth: 180, justifyContent: 'flex-end' }}>
            {meta.breadcrumb.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={9} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />}
                <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 9, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 72 }}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {propertyPanel}
      </div>
    </div>
  );
}
