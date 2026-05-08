import React, { useState } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import { StickyNoteData } from './types';

interface WorkspaceStickyNotesProps {
  notes: StickyNoteData[];
  onUpdate: (id: string, u: Partial<StickyNoteData>) => void;
  onDelete: (id: string) => void;
}

export function WorkspaceStickyNotes({ notes, onUpdate, onDelete }: WorkspaceStickyNotesProps) {
  const [open, setOpen] = useState(notes.length > 0);

  return (
    <div
      data-adweb-sticky-notes
      onMouseDown={e => e.stopPropagation()}
      style={{
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--sidebar)',
        flexShrink: 0,
        maxHeight: open ? 220 : 40,
        transition: 'max-height 0.2s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          width: '100%',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'var(--font-family-text)',
          fontSize: 12,
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--muted-foreground)',
          textAlign: 'left',
        }}
      >
        <StickyNote size={16} />
        Workspace notes {notes.length > 0 ? `(${notes.length})` : ''}
        <span style={{ marginLeft: 'auto', fontSize: 10 }}>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div style={{ overflowY: 'auto', padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.length === 0 ? (
            <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, color: 'var(--muted-foreground)' }}>No sticky notes. Use “Add note” in the toolbar.</span>
          ) : (
            notes.map(n => (
              <div
                key={n.id}
                style={{
                  padding: 10,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: n.color,
                  border: '1px solid color-mix(in srgb, var(--foreground) 10%, transparent)',
                  position: 'relative',
                }}
              >
                <textarea
                  value={n.text}
                  onChange={e => onUpdate(n.id, { text: e.target.value })}
                  placeholder="Note…"
                  style={{
                    width: '100%',
                    minHeight: 56,
                    resize: 'vertical',
                    border: 'none',
                    background: 'transparent',
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 13,
                    color: '#1a1a2e',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  title="Delete note"
                  onClick={() => onDelete(n.id)}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    padding: 4,
                    border: 'none',
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    color: '#333',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
