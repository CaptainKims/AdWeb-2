import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react';
import { Trash2, Palette } from 'lucide-react';
import { StickyNoteData, STICKY_PALETTE, CanvasTransform } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_W      = 220;   // canvas px — note width
const NOTE_H      = 220;   // canvas px — collapsed note height
const HEADER_H    = 32;    // canvas px — drag strip + controls
const BODY_PAD    = 12;    // canvas px — text area inner padding
const MAX_FONT_PX = 48;
const MIN_FONT_PX = 11;
// All notes sit above regular canvas elements (orders use z-index 1–10)
const NOTE_BASE_Z = 100;

// ─── Props ────────────────────────────────────────────────────────────────────

interface StickyNoteItemProps {
  note: StickyNoteData;
  transform: CanvasTransform;
  onUpdate: (id: string, updates: Partial<StickyNoteData>) => void;
  onDelete: (id: string) => void;
  onBringToFront: (id: string) => void;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((n >>  8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, ( n        & 0xff) - Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StickyNoteItem({
  note,
  transform,
  onUpdate,
  onDelete,
  onBringToFront,
}: StickyNoteItemProps) {
  const [showPalette,       setShowPalette]       = useState(false);
  const [isDragging,        setIsDragging]        = useState(false);
  const [isEditing,         setIsEditing]         = useState(false);
  const [fontSize,          setFontSize]          = useState(MAX_FONT_PX);
  const [isTruncated,       setIsTruncated]       = useState(false);
  const [isExpanded,        setIsExpanded]        = useState(false);
  // Full pixel height of text content at MIN_FONT_PX (used for expanded mode)
  const [expandedContentPx, setExpandedContentPx] = useState(0);

  const noteRef     = useRef<HTMLDivElement>(null);
  const measureRef  = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const paletteRef  = useRef<HTMLDivElement>(null);
  const dragOrigin  = useRef({ mouseX: 0, mouseY: 0, noteX: 0, noteY: 0 });

  // ── Font-size fitting + truncation / expanded-height measurement ───────
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    // The measurement div has no height constraint — offsetHeight = natural text height.
    const availableBodyH = NOTE_H - HEADER_H;
    const availableTextH = availableBodyH - BODY_PAD * 2;

    // Check at MAX font first
    el.style.fontSize = MAX_FONT_PX + 'px';
    if (el.offsetHeight <= availableTextH + 1) {
      setFontSize(MAX_FONT_PX);
      setIsTruncated(false);
      setExpandedContentPx(0);
      return;
    }

    // Check at MIN font to determine whether we can fit at all
    el.style.fontSize = MIN_FONT_PX + 'px';
    const minH = el.offsetHeight;

    if (minH > availableTextH + 1) {
      // Still overflows at minimum — text is truly truncated
      setFontSize(MIN_FONT_PX);
      setIsTruncated(true);
      setExpandedContentPx(minH + BODY_PAD * 2);
      return;
    }

    // Binary search for the largest font size that still fits (10 iterations)
    let lo = MIN_FONT_PX, hi = MAX_FONT_PX;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = mid + 'px';
      if (el.offsetHeight <= availableTextH + 1) lo = mid;
      else                                        hi = mid;
    }

    setFontSize(Math.floor(lo * 10) / 10);
    setIsTruncated(false);
    setExpandedContentPx(0);
  }, [note.text]);

  // Collapse expanded mode when text no longer overflows (e.g. user deleted text)
  useEffect(() => {
    if (!isTruncated) setIsExpanded(false);
  }, [isTruncated]);

  // ── Sync textarea on edit entry ────────────────────────────────────────
  useEffect(() => {
    if (isEditing && textAreaRef.current) {
      textAreaRef.current.style.fontSize = fontSize + 'px';
      textAreaRef.current.focus();
    }
  }, [isEditing, fontSize]);

  // ── Drag ──────────────────────────────────────────────────────────────
  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-note-control]')) return;
      e.preventDefault();
      e.stopPropagation();
      onBringToFront(note.id);
      setIsDragging(true);
      dragOrigin.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        noteX:  note.position.x,
        noteY:  note.position.y,
      };
    },
    [note.id, note.position, onBringToFront]
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragOrigin.current.mouseX) / transform.scale;
      const dy = (e.clientY - dragOrigin.current.mouseY) / transform.scale;
      onUpdate(note.id, {
        position: {
          x: dragOrigin.current.noteX + dx,
          y: dragOrigin.current.noteY + dy,
        },
      });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [isDragging, transform.scale, note.id, onUpdate]);

  // ── Collapse expanded note on outside click ────────────────────────────
  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: MouseEvent) => {
      if (noteRef.current && !noteRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    // Use mousedown so it fires before click handlers on other elements
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isExpanded]);

  // ── Close palette on outside click ────────────────────────────────────
  useEffect(() => {
    if (!showPalette) return;
    const handler = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setShowPalette(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [showPalette]);

  // ── Derived colours ───────────────────────────────────────────────────
  const inkColor    = darken(note.color, 0.52);
  const borderColor = darken(note.color, 0.10);

  // ── Note height: collapsed vs expanded ───────────────────────────────
  const noteHeight = isExpanded && isTruncated
    ? HEADER_H + expandedContentPx
    : NOTE_H;

  return (
    <div
      ref={noteRef}
      onMouseDown={(e) => {
        e.stopPropagation();
        onBringToFront(note.id);
      }}
      onClick={(e) => e.stopPropagation()}
      style={{
        position:        'absolute',
        left:            note.position.x,
        top:             note.position.y,
        width:           NOTE_W,
        height:          noteHeight,
        zIndex:          NOTE_BASE_Z + note.zIndex,
        backgroundColor: note.color,
        border:          `1.5px solid ${borderColor}`,
        borderRadius:    'var(--radius-md)',
        // Clean drop shadow — no coloured tint
        boxShadow:       isDragging
          ? '0 12px 36px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.16)'
          : '0 4px 16px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.08)',
        display:         'flex',
        flexDirection:   'column',
        overflow:        'hidden',
        userSelect:      isDragging ? 'none' : 'auto',
        transition:      isDragging
          ? 'box-shadow 0.12s'
          : 'height 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.15s',
      }}
    >
      {/* ── Hidden measurement div (no height constraint) ─────────────── */}
      {/*    Positioned absolutely so it doesn't affect layout.            */}
      <div
        ref={measureRef}
        aria-hidden="true"
        style={{
          position:   'absolute',
          top:        0,
          left:       BODY_PAD,
          visibility: 'hidden',
          width:      NOTE_W - BODY_PAD * 2,
          // NO explicit height — offsetHeight = natural text height
          fontFamily: 'var(--font-family-handwritten)',
          fontWeight: 400,
          fontSize:   MAX_FONT_PX + 'px',
          lineHeight: 1.35,
          whiteSpace: 'pre-wrap',
          wordBreak:  'break-word',
          padding:    0,
          margin:     0,
        }}
      >
        {note.text || ' '}
      </div>

      {/* ── Header — drag strip + controls ────────────────────────────── */}
      <div
        onMouseDown={handleHeaderMouseDown}
        style={{
          height:          HEADER_H,
          flexShrink:      0,
          display:         'flex',
          alignItems:      'center',
          paddingLeft:     8,
          paddingRight:    6,
          gap:             4,
          cursor:          isDragging ? 'grabbing' : 'grab',
          borderBottom:    `1px solid ${borderColor}`,
          backgroundColor: darken(note.color, 0.04),
        }}
      >
        {/* ── Three dots — grip indicator / expand trigger ── */}
        <button
          data-note-control=""
          title={
            isTruncated
              ? isExpanded
                ? 'Collapse note'
                : 'Expand to show all text'
              : undefined
          }
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (isTruncated) setIsExpanded((v) => !v);
          }}
          style={{
            flex:            1,
            display:         'flex',
            alignItems:      'center',
            gap:             3,
            background:      'none',
            border:          'none',
            padding:         0,
            cursor:          isTruncated ? 'pointer' : 'inherit',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width:           5,
                height:          5,
                borderRadius:    '50%',
                backgroundColor: darken(note.color, 0.22),
                opacity:         isTruncated ? (isExpanded ? 1 : 0.85) : 0.5,
                transition:      'opacity 0.15s, transform 0.15s',
                transform:       isTruncated && isExpanded ? 'scale(1.25)' : 'scale(1)',
              }}
            />
          ))}
          {/* Subtle "overflow" indicator when truncated */}
          {isTruncated && (
            <span
              style={{
                fontFamily:  'var(--font-family-text)',
                fontSize:    9,
                fontWeight:  'var(--font-weight-semibold)',
                color:       darken(note.color, 0.4),
                letterSpacing: 0.5,
                marginLeft:  2,
                opacity:     isExpanded ? 0 : 0.8,
                transition:  'opacity 0.15s',
                userSelect:  'none',
              }}
            >
              {isExpanded ? '' : '▾'}
            </span>
          )}
        </button>

        {/* ── Palette button ── */}
        <div style={{ position: 'relative' }} ref={paletteRef} data-note-control="">
          <button
            data-note-control=""
            title="Change colour"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setShowPalette((v) => !v); }}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:          20,
              height:         20,
              background:     'none',
              border:         'none',
              cursor:         'pointer',
              borderRadius:   'var(--radius-sm)',
              color:          inkColor,
              opacity:        0.65,
              transition:     'opacity 0.12s',
              padding:        0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.65')}
          >
            <Palette size={12} />
          </button>

          {/* Colour palette popover */}
          {showPalette && (
            <div
              data-note-control=""
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position:            'absolute',
                top:                 '100%',
                right:               0,
                marginTop:           4,
                padding:             8,
                backgroundColor:     'var(--card)',
                border:              '1px solid var(--border)',
                borderRadius:        'var(--radius-md)',
                boxShadow:           '0 4px 16px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.08)',
                display:             'grid',
                gridTemplateColumns: 'repeat(5, 20px)',
                gap:                 5,
                zIndex:              NOTE_BASE_Z + 200,
              }}
            >
              {STICKY_PALETTE.map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(note.id, { color: c });
                    setShowPalette(false);
                  }}
                  style={{
                    width:           20,
                    height:          20,
                    borderRadius:    '50%',
                    backgroundColor: c,
                    border:          c === note.color
                      ? '2px solid var(--foreground)'
                      : `1.5px solid ${darken(c, 0.14)}`,
                    cursor:          'pointer',
                    padding:         0,
                    transition:      'transform 0.1s',
                    transform:       c === note.color ? 'scale(1.2)' : 'scale(1)',
                  }}
                  onMouseEnter={(e) => { if (c !== note.color) e.currentTarget.style.transform = 'scale(1.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = c === note.color ? 'scale(1.2)' : 'scale(1)'; }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Delete button ── */}
        <button
          data-note-control=""
          title="Delete note"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          20,
            height:         20,
            background:     'none',
            border:         'none',
            cursor:         'pointer',
            borderRadius:   'var(--radius-sm)',
            color:          inkColor,
            opacity:        0.5,
            transition:     'opacity 0.12s',
            padding:        0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* ── Text body ─────────────────────────────────────────────────────── */}
      <div
        style={{
          flex:     1,
          position: 'relative',
          overflow: isExpanded ? 'visible' : 'hidden',
          minHeight: 0,
        }}
      >
        {isEditing ? (
          /* ── Editable textarea ── */
          <textarea
            ref={textAreaRef}
            value={note.text}
            onChange={(e) => onUpdate(note.id, { text: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onMouseDown={(e) => e.stopPropagation()}
            spellCheck={false}
            style={{
              position:    'absolute',
              inset:       0,
              padding:     BODY_PAD,
              width:       '100%',
              height:      '100%',
              resize:      'none',
              border:      'none',
              outline:     'none',
              background:  'transparent',
              fontFamily:  'var(--font-family-handwritten)',
              fontWeight:  400,
              fontSize:    fontSize + 'px',
              lineHeight:  1.35,
              color:       inkColor,
              caretColor:  inkColor,
              overflow:    'hidden',
              boxSizing:   'border-box',
            }}
          />
        ) : (
          /* ── Display view ── */
          <div
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            onClick={(e)       => { e.stopPropagation(); setIsEditing(true); }}
            style={{
              position:   'absolute',
              inset:      0,
              padding:    BODY_PAD,
              fontFamily: 'var(--font-family-handwritten)',
              fontWeight: 400,
              fontSize:   fontSize + 'px',
              lineHeight: 1.35,
              color:      inkColor,
              whiteSpace: 'pre-wrap',
              wordBreak:  'break-word',
              overflow:   'hidden',
              cursor:     isDragging ? 'grabbing' : 'text',
              boxSizing:  'border-box',
            }}
          >
            {note.text || (
              <span
                style={{
                  opacity:    0.35,
                  fontStyle:  'italic',
                  fontFamily: 'var(--font-family-handwritten)',
                }}
              >
                Click to add note…
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
