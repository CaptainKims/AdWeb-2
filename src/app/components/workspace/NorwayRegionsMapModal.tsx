import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import L from 'leaflet';
import type { FeatureCollection, GeoJsonObject } from 'geojson';
import { NORWEGIAN_FYLKER, targetingRegionsLabel } from './types';
import 'leaflet/dist/leaflet.css';

const MODAL_Z = 235_000;
const GEO_URL = '/geo/norway-fylker-S.geojson';
const OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const FYLKE_SET = new Set<string>(NORWEGIAN_FYLKER);

function isFylkeName(n: string): n is (typeof NORWEGIAN_FYLKER)[number] {
  return FYLKE_SET.has(n);
}

function asCountyList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function pathStyle(selected: boolean): L.PathOptions {
  return {
    color: '#a1a1aa',
    weight: 1.5,
    opacity: 0.95,
    fillColor: selected ? '#827cc8' : '#71717a',
    fillOpacity: selected ? 0.45 : 0.22,
  };
}

export function NorwayRegionsMapModal({
  open,
  initialCounties,
  onClose,
  onApply,
}: {
  open: boolean;
  initialCounties?: string[] | null;
  onClose: () => void;
  onApply: (counties: string[]) => void;
}) {
  const safeInitial = useMemo(() => asCountyList(initialCounties), [initialCounties]);
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<string>>(() => new Set());

  const mapWrapRef = useRef<HTMLDivElement>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (!open) return;
    setDraft(new Set((safeInitial ?? []).filter(isFylkeName)));
    setLoadErr(null);
    let cancelled = false;
    void fetch(GEO_URL)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<FeatureCollection>;
      })
      .then(data => {
        if (!cancelled) setGeo(data);
      })
      .catch(() => {
        if (!cancelled) setLoadErr('Could not load map data.');
      });
    return () => {
      cancelled = true;
    };
  }, [open, safeInitial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const validGeoJson = useMemo((): GeoJsonObject | null => {
    if (!geo?.features?.length) return null;
    const features = geo.features.filter(
      f => f.type === 'Feature' && typeof f.properties?.name === 'string',
    );
    if (features.length === 0) return null;
    return { type: 'FeatureCollection', features } as FeatureCollection;
  }, [geo]);

  const toggle = useCallback((name: string) => {
    if (!isFylkeName(name)) return;
    setDraft(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  /** Create / destroy Leaflet map when data is ready. */
  useEffect(() => {
    if (!open || !validGeoJson || !mapWrapRef.current || !mapElRef.current) return;

    const wrap = mapWrapRef.current;
    const el = mapElRef.current;

    const map = L.map(el, {
      scrollWheelZoom: true,
      attributionControl: true,
    });

    L.tileLayer(OSM_TILE, {
      maxZoom: 19,
      attribution: OSM_ATTR,
    }).addTo(map);

    const gj = L.geoJSON(validGeoJson, {
      style: feature => {
        const name = feature?.properties?.name;
        const sel = typeof name === 'string' && draftRef.current.has(name);
        return pathStyle(sel);
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', e => {
          L.DomEvent.stopPropagation(e);
          const n = feature.properties?.name;
          if (typeof n === 'string' && isFylkeName(n)) toggle(n);
        });
      },
    }).addTo(map);

    try {
      const b = gj.getBounds();
      if (b.isValid()) {
        map.fitBounds(b, { padding: [18, 18], maxZoom: 8 });
      } else {
        map.setView([64.5, 12.5], 5);
      }
    } catch {
      map.setView([64.5, 12.5], 5);
    }

    const invalidate = () => {
      map.invalidateSize({ animate: false });
    };
    requestAnimationFrame(invalidate);
    const t1 = window.setTimeout(invalidate, 50);
    const t2 = window.setTimeout(invalidate, 250);
    const ro = new ResizeObserver(invalidate);
    ro.observe(wrap);

    mapRef.current = map;
    geoLayerRef.current = gj;

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      geoLayerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [open, validGeoJson, toggle]);

  /** Resync polygon fills when selection changes (without rebuilding the map). */
  useEffect(() => {
    const gj = geoLayerRef.current;
    if (!gj) return;
    gj.eachLayer(layer => {
      if (!(layer instanceof L.Path)) return;
      const feat = (layer as L.Path & { feature?: GeoJSON.Feature }).feature;
      const name = feat?.properties?.name;
      if (typeof name !== 'string') return;
      layer.setStyle(pathStyle(draft.has(name)));
    });
  }, [draft]);

  const selectAll = useCallback(() => {
    setDraft(new Set(NORWEGIAN_FYLKER));
  }, []);

  const clearAll = useCallback(() => {
    setDraft(new Set());
  }, []);

  if (!open) return null;

  const summary = targetingRegionsLabel([...draft]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose regions"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: MODAL_Z,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '94vh',
          overflow: 'auto',
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
              Choose regions
            </div>
            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginTop: 4, maxWidth: 640, lineHeight: 1.45 }}>
              Map: OpenStreetMap. Boundaries: Kartverket (2024), CC BY 4.0 —{' '}
              <a href="https://github.com/robhop/fylker-og-kommuner" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>robhop/fylker-og-kommuner</a>.
              Click a fylke to include or exclude it. Empty selection means <strong style={{ fontWeight: 'var(--font-weight-semibold)' }}>all of Norway</strong>.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '12px 16px 0', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={selectAll} style={chipBtnStyle}>Select all</button>
          <button type="button" onClick={clearAll} style={chipBtnStyle}>Clear (nationwide)</button>
          <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--muted-foreground)', marginLeft: 'auto' }}>
            Selected: {summary}
          </span>
        </div>

        <div style={{ padding: '12px 16px 16px', flexShrink: 0 }}>
          {loadErr && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--destructive)', fontFamily: 'var(--font-family-text)', fontSize: 13 }}>
              {loadErr}
            </div>
          )}
          {!loadErr && !geo && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted-foreground)', fontFamily: 'var(--font-family-text)', fontSize: 13 }}>
              Loading map…
            </div>
          )}
          {geo && (
            <div
              ref={mapWrapRef}
              style={{
                width: '100%',
                height: 'clamp(360px, 58vh, 580px)',
                minHeight: 340,
                boxSizing: 'border-box',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                position: 'relative',
                lineHeight: 0,
                border: '1px solid var(--border)',
              }}
            >
              <div
                ref={mapElRef}
                style={{ width: '100%', height: '100%', minHeight: 280, zIndex: 0 }}
                aria-label="Norway county map — click a county to toggle"
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px 16px', borderTop: '1px solid var(--border)' }}>
          <button type="button" onClick={onClose} style={secondaryBtnStyle}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onApply([...draft].sort((a, b) => a.localeCompare(b, 'nb')));
              onClose();
            }}
            style={primaryBtnStyle}
          >
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const chipBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--secondary)',
  cursor: 'pointer',
  fontFamily: 'var(--font-family-text)',
  fontSize: 11,
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--foreground)',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--secondary)',
  cursor: 'pointer',
  fontFamily: 'var(--font-family-text)',
  fontSize: 12,
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--foreground)',
};

const primaryBtnStyle: React.CSSProperties = {
  ...secondaryBtnStyle,
  background: 'var(--primary)',
  borderColor: 'var(--primary)',
  color: 'var(--primary-foreground)',
};
