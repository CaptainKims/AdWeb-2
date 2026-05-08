import React from 'react';
import { GanttChart, LayoutList, MessageSquare, FileDown } from 'lucide-react';
import type { WorkspacePrimaryMode } from './workspaceTypes';
import { WORKSPACE_ACTION_ACCENT, WORKSPACE_ACTION_ACCENT_FG } from './workspaceAccent';

export const WORKSPACE_TOOLBAR_H = 40;

interface WorkspaceToolbarProps {
  mode: WorkspacePrimaryMode;
  onModeChange: (m: WorkspacePrimaryMode) => void;
  onAddStickyNote: () => void;
  showListToggle: boolean;
  /** Download current workspace as `adweb-workspace.json` for committing under `public/`. */
  onExportWorkspaceJson?: () => void;
}

export function WorkspaceToolbar({ mode, onModeChange, onAddStickyNote, showListToggle, onExportWorkspaceJson }: WorkspaceToolbarProps) {
  return (
    <div
      data-adweb-workspace-toolbar
      onMouseDown={e => e.stopPropagation()}
      style={{
        flexShrink: 0,
        height: WORKSPACE_TOOLBAR_H,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--sidebar)',
      }}
    >
      {showListToggle && (
        <div
          style={{
            display: 'flex',
            borderRadius: 'var(--radius-md)',
            border: `1px solid color-mix(in srgb, ${WORKSPACE_ACTION_ACCENT} 38%, var(--border))`,
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => onModeChange('list')}
            style={mode === 'list' ? segOn : segOff}
            aria-pressed={mode === 'list'}
          >
            <LayoutList size={16} style={{ marginRight: 6 }} />
            Liste
          </button>
          <button
            type="button"
            onClick={() => onModeChange('timeline')}
            style={mode === 'timeline' ? segOn : segOff}
            aria-pressed={mode === 'timeline'}
          >
            <GanttChart size={16} style={{ marginRight: 6 }} />
            Tidslinje
          </button>
        </div>
      )}
      <div style={{ flex: 1 }} />
      {onExportWorkspaceJson && (
        <button
          type="button"
          onClick={onExportWorkspaceJson}
          title="Download workspace JSON — save as public/adweb-workspace.json and commit"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--secondary)',
            fontFamily: 'var(--font-family-text)',
            fontSize: 12,
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--foreground)',
            cursor: 'pointer',
          }}
        >
          <FileDown size={16} />
          Export JSON
        </button>
      )}
      <button
        type="button"
        onClick={onAddStickyNote}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--secondary)',
          fontFamily: 'var(--font-family-text)',
          fontSize: 12,
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--foreground)',
          cursor: 'pointer',
        }}
      >
        <MessageSquare size={16} />
        Add note
      </button>
    </div>
  );
}

const segOn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  border: 'none',
  backgroundColor: WORKSPACE_ACTION_ACCENT,
  color: WORKSPACE_ACTION_ACCENT_FG,
  fontFamily: 'var(--font-family-text)',
  fontSize: 12,
  fontWeight: 'var(--font-weight-semibold)',
  cursor: 'pointer',
};
const segOff: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  border: 'none',
  backgroundColor: 'var(--secondary)',
  color: 'var(--muted-foreground)',
  fontFamily: 'var(--font-family-text)',
  fontSize: 12,
  fontWeight: 'var(--font-weight-semibold)',
  cursor: 'pointer',
};
