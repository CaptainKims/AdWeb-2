import React, { useRef, useCallback, useState } from 'react';
import { WeightPoint } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortPoints(pts: WeightPoint[]): WeightPoint[] {
  return [...pts].sort((a, b) => a.t - b.t);
}

function buildLinePath(pts: WeightPoint[], w: number, h: number): string {
  if (pts.length < 2) return '';
  const sorted = sortPoints(pts);
  return sorted.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.t * w},${(1 - p.v) * h}`).join(' ');
}

function buildFillPath(pts: WeightPoint[], w: number, h: number): string {
  const line = buildLinePath(pts, w, h);
  if (!line) return '';
  return `${line} L${w},${h} L0,${h} Z`;
}

/** Find t on the curve closest to a click, by linear interpolation */
function tFromX(pts: WeightPoint[], clickX: number, w: number): number {
  return Math.min(1, Math.max(0, clickX / w));
}

function vFromY(clickY: number, h: number): number {
  return Math.min(1, Math.max(0, 1 - clickY / h));
}

/** Interpolate curve value at a given t */
function interpolateV(pts: WeightPoint[], t: number): number {
  const sorted = sortPoints(pts);
  if (sorted.length === 0) return 1;
  if (t <= sorted[0].t) return sorted[0].v;
  if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].v;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (t >= a.t && t <= b.t) {
      const ratio = (t - a.t) / (b.t - a.t);
      return a.v + (b.v - a.v) * ratio;
    }
  }
  return 1;
}

// ─── Sparkline (read-only preview, used inside flight bars) ──────────────────

/**
 * Inline frequency curve editor for timeline flight bars (Premiere-style).
 * Callers should wrap with pointer-event guards so timeline drag doesn’t steal input.
 */
export function WeightCurveBarEditor({
  width,
  height,
  points,
  onChange,
  color,
}: {
  width: number;
  height: number;
  points: WeightPoint[];
  onChange: (pts: WeightPoint[]) => void;
  color: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = Math.max(4, Math.floor(width));
  const H = Math.max(16, Math.floor(height));
  const PAD = Math.min(6, Math.max(3, Math.floor(H * 0.12)));
  const IW = Math.max(4, W - PAD * 2);
  const IH = Math.max(8, H - PAD * 2);

  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const sorted = sortPoints(points);

  const fromSvgX = (sx: number) => Math.min(1, Math.max(0, (sx - PAD) / IW));
  const fromSvgY = (sy: number) => Math.min(1, Math.max(0, 1 - (sy - PAD) / IH));

  const getSvgPoint = (e: React.MouseEvent | MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    const sy = ((e.clientY - rect.top) / rect.height) * H;
    return { sx, sy };
  };

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (draggingIdx !== null) return;
      e.stopPropagation();
      const { sx, sy } = getSvgPoint(e);
      const t = fromSvgX(sx);
      const v = fromSvgY(sy);
      if (sorted.some(p => Math.abs(p.t - t) < 0.05)) return;
      onChange(sortPoints([...points, { t, v }]));
    },
    [draggingIdx, points, onChange, sorted]
  );

  const handlePointMouseDown = useCallback(
    (e: React.MouseEvent<SVGCircleElement>, sortedIdx: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingIdx(sortedIdx);

      const onMove = (ev: MouseEvent) => {
        ev.stopPropagation();
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const sx = ((ev.clientX - rect.left) / rect.width) * W;
        const sy = ((ev.clientY - rect.top) / rect.height) * H;
        const t = fromSvgX(sx);
        const v = fromSvgY(sy);
        const src = sortPoints(points);
        const updated = src.map((p, j) => {
          if (j !== sortedIdx) return p;
          const isFirst = j === 0;
          const isLast = j === src.length - 1;
          return {
            t: isFirst ? 0 : isLast ? 1 : t,
            v,
          };
        });
        onChange(sortPoints(updated));
      };

      const onUp = (ev: MouseEvent) => {
        ev.stopPropagation();
        setDraggingIdx(null);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [IW, IH, PAD, W, H, points, onChange]
  );

  const handlePointDoubleClick = useCallback(
    (e: React.MouseEvent<SVGCircleElement>, sortedIdx: number) => {
      e.preventDefault();
      e.stopPropagation();
      const src = sortPoints(points);
      if (sortedIdx === 0 || sortedIdx === src.length - 1) return;
      onChange(src.filter((_, i) => i !== sortedIdx));
    },
    [points, onChange]
  );

  const fillPath = buildFillPath(sorted, IW, IH);
  const linePath = buildLinePath(sorted, IW, IH);
  const translatePath = (p: string) =>
    p.replace(/([ML])([\d.]+),([\d.]+)/g, (_, cmd, x, y) =>
      `${cmd}${parseFloat(x) + PAD},${parseFloat(y) + PAD}`
    );

  const toSvgX = (t: number) => PAD + t * IW;
  const toSvgY = (v: number) => PAD + (1 - v) * IH;

  return (
    <div
      role="presentation"
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'relative',
        width: W,
        height: H,
        flexShrink: 0,
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.35)',
        border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        title="Nullstill flat kurve"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation();
          onChange([{ t: 0, v: 1 }, { t: 1, v: 1 }]);
        }}
        style={{
          position: 'absolute',
          top: 2,
          right: 3,
          zIndex: 2,
          padding: '1px 5px',
          fontSize: 9,
          fontFamily: 'var(--font-family-text)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--muted-foreground)',
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Nullstill
      </button>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ cursor: draggingIdx !== null ? 'grabbing' : 'crosshair', display: 'block', borderRadius: 4 }}
        onClick={handleSvgClick}
      >
        {[0.25, 0.5, 0.75].map(v => (
          <line
            key={`h-${v}`}
            x1={PAD}
            x2={PAD + IW}
            y1={PAD + (1 - v) * IH}
            y2={PAD + (1 - v) * IH}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        ))}
        {fillPath && <path d={translatePath(fillPath)} fill={color + '35'} />}
        {linePath && (
          <path d={translatePath(linePath)} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
        )}
        {sorted.map((p, i) => {
          const cx = toSvgX(p.t);
          const cy = toSvgY(p.v);
          const isEndpoint = i === 0 || i === sorted.length - 1;
          const hitR = Math.min(10, Math.max(6, H / 5));
          const dotR = isEndpoint ? Math.min(4, H / 10) : Math.min(3.5, H / 11);
          return (
            <g key={`${p.t}-${p.v}-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r={hitR}
                fill="transparent"
                style={{ cursor: 'grab' }}
                onMouseDown={e => handlePointMouseDown(e, i)}
                onDoubleClick={e => handlePointDoubleClick(e, i)}
              />
              <circle
                cx={cx}
                cy={cy}
                r={dotR}
                fill={color}
                stroke="rgba(15,12,28,0.95)"
                strokeWidth={1}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function WeightCurveSparkline({
  points,
  width,
  height,
  color,
}: {
  points: WeightPoint[];
  width: number;
  height: number;
  color: string;
}) {
  const pts = sortPoints(points);
  if (pts.length < 2) return null;
  const fillPath = buildFillPath(pts, width, height);
  const linePath = buildLinePath(pts, width, height);

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', bottom: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <path d={fillPath} fill={color + '30'} />
      <path d={linePath} fill="none" stroke={color + 'BB'} strokeWidth={1.5} />
      {pts.map((p, i) => (
        <circle key={i} cx={p.t * width} cy={(1 - p.v) * height} r={2} fill={color} />
      ))}
    </svg>
  );
}

// ─── Full interactive editor (used in Properties Shelf) ──────────────────────

interface WeightCurveEditorProps {
  points: WeightPoint[];
  onChange: (pts: WeightPoint[]) => void;
  color: string;
  flightDays?: number; // optional: total flight duration in days, for x-axis labels
}

export function WeightCurveEditor({
  points,
  onChange,
  color,
  flightDays,
}: WeightCurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 220;
  const H = 80;
  const PAD = 12;
  const IW = W - PAD * 2;
  const IH = H - PAD * 2;

  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const sorted = sortPoints(points);

  const toSvgX = (t: number) => PAD + t * IW;
  const toSvgY = (v: number) => PAD + (1 - v) * IH;
  const fromSvgX = (sx: number) => Math.min(1, Math.max(0, (sx - PAD) / IW));
  const fromSvgY = (sy: number) => Math.min(1, Math.max(0, 1 - (sy - PAD) / IH));

  const getSvgPoint = (e: React.MouseEvent | MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  /** Add a keyframe by clicking on the curve line area */
  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (draggingIdx !== null) return;
      const { x, y } = getSvgPoint(e);
      const t = fromSvgX(x);
      const v = fromSvgY(y);
      // Don't add if very close to existing point
      if (sorted.some(p => Math.abs(p.t - t) < 0.04)) return;
      onChange(sortPoints([...points, { t, v }]));
    },
    [draggingIdx, points, onChange, sorted]
  );

  /** Start dragging a keyframe point */
  const handlePointMouseDown = useCallback(
    (e: React.MouseEvent<SVGCircleElement>, idx: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingIdx(idx);

      const onMove = (ev: MouseEvent) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        const t = fromSvgX(x);
        const v = fromSvgY(y);

        onChange(sortPoints(points.map((p, i) => {
          if (i !== idx) return p;
          // Endpoints are locked to t=0 and t=1
          const isFirst = i === 0;
          const isLast = i === points.length - 1;
          return {
            t: isFirst ? 0 : isLast ? 1 : t,
            v,
          };
        })));
      };

      const onUp = () => {
        setDraggingIdx(null);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [points, onChange]
  );

  /** Double-click a non-endpoint point to remove it */
  const handlePointDoubleClick = useCallback(
    (e: React.MouseEvent<SVGCircleElement>, idx: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (idx === 0 || idx === points.length - 1) return; // can't remove endpoints
      onChange(points.filter((_, i) => i !== idx));
    },
    [points, onChange]
  );

  const fillPath = buildFillPath(sorted, IW, IH);
  const linePath = buildLinePath(sorted, IW, IH);
  // Translate paths to padded coordinate space
  const translatePath = (p: string) =>
    p.replace(/([ML])([\d.]+),([\d.]+)/g, (_, cmd, x, y) =>
      `${cmd}${parseFloat(x) + PAD},${parseFloat(y) + PAD}`
    );

  // X-axis labels (quarters or start/end)
  const xLabels: { t: number; label: string }[] = [];
  if (flightDays && flightDays > 0) {
    const d = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
    };
    xLabels.push({ t: 0, label: 'Start' });
    xLabels.push({ t: 0.5, label: `${Math.round(flightDays / 2)} d` });
    xLabels.push({ t: 1, label: 'Slutt' });
  }

  return (
    <div style={{ userSelect: 'none' }}>
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <span style={{
          fontFamily: 'var(--font-family-text)', fontSize: 10,
          fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Vis frekvenskurve
        </span>
        <button
          title="Tilbakestill til flat kurve"
          onClick={() => onChange([{ t: 0, v: 1 }, { t: 1, v: 1 }])}
          style={{
            background: 'none', border: 'none', padding: '1px 4px', cursor: 'pointer',
            fontFamily: 'var(--font-family-text)', fontSize: 9,
            fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          Nullstill
        </button>
      </div>

      <div
        style={{
          backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)', padding: '4px',
        }}
      >
        <svg
          ref={svgRef}
          width={W} height={H}
          style={{ cursor: draggingIdx !== null ? 'grabbing' : 'crosshair', display: 'block' }}
          onClick={handleSvgClick}
        >
          {/* Background grid */}
          {[0.25, 0.5, 0.75].map(v => (
            <line key={v}
              x1={PAD} x2={PAD + IW}
              y1={PAD + (1 - v) * IH} y2={PAD + (1 - v) * IH}
              stroke="var(--border)" strokeWidth={1}
            />
          ))}
          {[0.25, 0.5, 0.75].map(t => (
            <line key={t}
              x1={PAD + t * IW} x2={PAD + t * IW}
              y1={PAD} y2={PAD + IH}
              stroke="var(--border)" strokeWidth={1}
            />
          ))}

          {/* Y axis labels */}
          {[0, 50, 100].map(pct => (
            <text key={pct}
              x={PAD - 3} y={PAD + (1 - pct / 100) * IH + 3}
              textAnchor="end"
              style={{ fontFamily: 'var(--font-family-text)', fontSize: 7, fill: 'var(--muted-foreground)' }}
            >
              {pct}%
            </text>
          ))}

          {/* Filled area */}
          {fillPath && <path d={translatePath(fillPath)} fill={color + '25'} />}

          {/* Curve line */}
          {linePath && (
            <path d={translatePath(linePath)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
          )}

          {/* Keyframe dots */}
          {sorted.map((p, i) => {
            const cx = toSvgX(p.t);
            const cy = toSvgY(p.v);
            const isEndpoint = i === 0 || i === sorted.length - 1;
            return (
              <g key={i}>
                {/* Hit area */}
                <circle
                  cx={cx} cy={cy} r={8}
                  fill="transparent"
                  style={{ cursor: 'grab' }}
                  onMouseDown={(e) => handlePointMouseDown(e, i)}
                  onDoubleClick={(e) => handlePointDoubleClick(e, i)}
                />
                {/* Visible dot */}
                <circle
                  cx={cx} cy={cy}
                  r={isEndpoint ? 5 : 4}
                  fill={color}
                  stroke="var(--card)"
                  strokeWidth={2}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ marginTop: 5, display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: 'var(--font-family-text)', fontSize: 9,
          fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)',
        }}>
          Klikk kurven for å legge til nøkkelpunkt · Dobbeltklikk for å fjerne punkt
        </span>
        <span style={{
          fontFamily: 'var(--font-family-text)', fontSize: 9,
          fontWeight: 'var(--font-weight-semibold)', color: color,
        }}>
          {points.length} nøkkelpunkt{points.length !== 1 ? 'er' : ''}
        </span>
      </div>
    </div>
  );
}