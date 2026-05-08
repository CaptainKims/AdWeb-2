import type { CampaignItem } from './types';
import { CAMPAIGN_MONOCHROME_SCHEMES } from './types';

// ─── HSL conversion ───────────────────────────────────────────────────────────

export function hexToHsl(hex: string): [number, number, number] {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return [0, 0, 50];
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ─── Relative luminance & contrast ───────────────────────────────────────────

/** sRGB channel → linear light */
function linearise(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a hex colour (0–1) */
function luminance(hex: string): number {
  if (!hex || hex.length < 7) return 0.5;
  const r = linearise(parseInt(hex.slice(1, 3), 16) / 255);
  const g = linearise(parseInt(hex.slice(3, 5), 16) / 255);
  const b = linearise(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Returns '#ffffff' or a near-black colour depending on which gives better
 * WCAG contrast against `bgHex`. Use this to colour text/icons on timeline bars.
 */
export function getBarTextColor(bgHex: string): string {
  const L = luminance(bgHex);
  const contrastWhite = 1.05 / (L + 0.05);
  // near-black ink at approximately L≈0.007
  const contrastDark = (L + 0.05) / 0.057;
  return contrastWhite >= contrastDark ? '#ffffff' : '#1a1a2e';
}

function normalizeHex(hex: string): string {
  let h = hex.trim();
  if (!h.startsWith('#')) return h.toUpperCase();
  if (h.length === 4 && /^#[0-9a-fA-F]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return h.toUpperCase();
}

/** Resolve `{ primary, secondary }` for this campaign from stored primary `campaign.color`. */
export function getCampaignMonoPair(camp: CampaignItem): { primary: string; secondary: string } {
  const target = normalizeHex(camp.color);
  const exact = CAMPAIGN_MONOCHROME_SCHEMES.find(s => normalizeHex(s.primary) === target);
  if (exact) return exact;

  let best = CAMPAIGN_MONOCHROME_SCHEMES[0]!;
  let bestD = Infinity;
  const tr = parseInt(target.slice(1, 3), 16);
  const tg = parseInt(target.slice(3, 5), 16);
  const tb = parseInt(target.slice(5, 7), 16);
  for (const s of CAMPAIGN_MONOCHROME_SCHEMES) {
    const p = normalizeHex(s.primary);
    const dr = parseInt(p.slice(1, 3), 16) - tr;
    const dg = parseInt(p.slice(3, 5), 16) - tg;
    const db = parseInt(p.slice(5, 7), 16) - tb;
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/**
 * Order lines alternate primary / secondary so segments (e.g. Fordeling bar) stay visually distinct.
 */
export function resolveOlColor(camp: CampaignItem, olIndex: number): string {
  const { primary, secondary } = getCampaignMonoPair(camp);
  return olIndex % 2 === 0 ? primary : secondary;
}

/**
 * Flights alternate within the campaign pair so nested bars differ from sibling flights when needed.
 */
export function resolveFlightColor(
  camp: CampaignItem,
  olIndex: number,
  flightIndex: number,
  _totalFlights: number,
): string {
  const { primary, secondary } = getCampaignMonoPair(camp);
  return (olIndex + flightIndex) % 2 === 0 ? primary : secondary;
}
