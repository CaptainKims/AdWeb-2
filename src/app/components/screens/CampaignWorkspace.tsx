import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { OrderBuilder, type OrderBuilderHandle } from '../workspace/OrderBuilder';
import { WORKSPACE_ACTION_ACCENT, WORKSPACE_ACTION_ACCENT_FG } from '../workspace/workspaceAccent';

const headerActionBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '4px 12px',
  fontFamily: 'var(--font-family-text)',
  fontSize: 12,
  fontWeight: 'var(--font-weight-light)',
  borderRadius: 'var(--radius-button)',
  cursor: 'pointer',
  lineHeight: 1,
  minHeight: 28,
  boxSizing: 'border-box',
};

type PlannerSurface = 'planner' | 'all-campaigns';

export function CampaignWorkspace() {
  const orderBuilderRef = useRef<OrderBuilderHandle>(null);
  const [surface, setSurface] = useState<PlannerSurface>('planner');

  const tabBase: React.CSSProperties = {
    fontFamily: 'var(--font-family-text)',
    fontSize: 13,
    fontWeight: 'var(--font-weight-semibold)',
    padding: '8px 4px',
    marginRight: 20,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    color: 'var(--muted-foreground)',
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--background)',
      }}
    >
      <div
        style={{
          height: 44,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingLeft: 16,
          paddingRight: 16,
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
        }}
      >
        <button
          type="button"
          onClick={() => setSurface('planner')}
          style={{
            ...tabBase,
            color: surface === 'planner' ? 'var(--foreground)' : 'var(--muted-foreground)',
            borderBottomColor: surface === 'planner' ? 'var(--primary)' : 'transparent',
          }}
        >
          Planlegger
        </button>
        <button
          type="button"
          onClick={() => setSurface('all-campaigns')}
          style={{
            ...tabBase,
            color: surface === 'all-campaigns' ? 'var(--foreground)' : 'var(--muted-foreground)',
            borderBottomColor: surface === 'all-campaigns' ? 'var(--primary)' : 'transparent',
          }}
        >
          Alle kampanjer
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => orderBuilderRef.current?.openNewCampaignModal()}
            style={{
              ...headerActionBtn,
              color: WORKSPACE_ACTION_ACCENT_FG,
              backgroundColor: WORKSPACE_ACTION_ACCENT,
              border: `1px solid ${WORKSPACE_ACTION_ACCENT}`,
            }}
          >
            Ny kampanje
          </button>
          <button
            type="button"
            style={{
              ...headerActionBtn,
              color: 'var(--secondary-foreground)',
              backgroundColor: 'var(--secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <Share2 size={12} />
            Del
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', minHeight: 0 }}>
        <OrderBuilder ref={orderBuilderRef} surface={surface} />
      </div>
    </div>
  );
}
