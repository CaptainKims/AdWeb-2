export type CampaignStatus = 'draft' | 'booked' | 'active' | 'completed' | 'paused';
export type Channel = 'tv' | 'digital' | 'radio' | 'outdoor';
export type CreativeFormat = '15s' | '30s' | '60s' | 'display' | 'video';
export type CreativeStatus = 'draft' | 'active' | 'archived';
/** How the creative master is attached in the shelf. */
export type CreativeMediaSource = 'nielsen' | 'upload' | 'library';
export type Currency = 'NOK' | 'EUR' | 'USD';
export type BudgetType = 'gross' | 'net';

/** Order-line targeting: gender. `all` = no gender restriction. */
export type TargetingGender = 'all' | 'male' | 'female' | 'other';

/** Order-line targeting: editorial / programming context. `all` = any context. */
export type TargetingContext =
  | 'all'
  | 'sport'
  | 'news'
  | 'entertainment'
  | 'reality'
  | 'living'
  | 'family';

/** Sentinel for spreadsheet / LLM imports meaning all regions. */
export const TARGETING_COUNTY_ALL = 'All' as const;

/**
 * Norwegian counties (fylker), 2024 administrative division (Kartverket).
 * Matches bundled map GeoJSON (`public/geo/norway-fylker-S.geojson`).
 */
export const NORWEGIAN_FYLKER = [
  'Agder',
  'Akershus',
  'Buskerud',
  'Finnmark',
  'Innlandet',
  'Møre og Romsdal',
  'Nordland',
  'Oslo',
  'Rogaland',
  'Telemark',
  'Troms',
  'Trøndelag',
  'Vestfold',
  'Vestland',
  'Østfold',
] as const;

export const TARGETING_CONTEXT_OPTIONS: { value: TargetingContext; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'sport', label: 'Sport' },
  { value: 'news', label: 'Nyheter' },
  { value: 'entertainment', label: 'Underholdning' },
  { value: 'reality', label: 'Reality' },
  { value: 'living', label: 'Livsstil' },
  { value: 'family', label: 'Familie' },
];

export const TARGETING_GENDER_OPTIONS: { value: TargetingGender; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'male', label: 'Mann' },
  { value: 'female', label: 'Kvinne' },
  { value: 'other', label: 'Annet' },
];

export interface TargetingConfig {
  id: string;
  /** Selected fylker; empty array = nationwide (all regions). */
  counties: string[];
  gender: TargetingGender;
  context: TargetingContext;
}

/** Short label for shelf / summaries. */
export function targetingRegionsLabel(counties: string[] | undefined | null): string {
  if (!counties?.length) return 'Alle regioner';
  const sorted = [...counties].sort((a, b) => a.localeCompare(b, 'nb'));
  if (sorted.length <= 3) return sorted.join(', ');
  return `${sorted.slice(0, 3).join(', ')} +${sorted.length - 3}`;
}

export interface CreativeItem {
  id: string;
  name: string;
  format: CreativeFormat;
  duration: number;
  status: CreativeStatus;
  nielsenCode?: string;
  mediaSource?: CreativeMediaSource;
  /** Shown after user picks a file in Upload mode (UI-only for now). */
  uploadedFileName?: string;
  /** Selected row from the media library modal. */
  libraryAssetId?: string;
  /** IndexedDB key for uploaded / library-linked binary (see `creativeBlobStorageKey`). */
  mediaBlobKey?: string;
  /** JPEG data URL for shelf / flight thumbnails. */
  thumbnailDataUrl?: string;
}

export interface BudgetItem {
  id: string;
  total: number;
  currency: Currency;
  type: BudgetType;
}

/** A keyframe on the flight's frequency/weight curve. t ∈ [0,1], v ∈ [0,1] */
export interface WeightPoint {
  t: number; // position along flight duration (0 = start, 1 = end)
  v: number; // weight/intensity value (0 = none, 1 = full)
}

export interface FlightItem {
  id: string;
  name: string;
  channel: Channel;
  startDate: string;
  endDate: string;
  budgetWeight: number;   // % of parent order line's budget allocation
  targetAudience: string;
  creative?: CreativeItem;
  weightCurve: WeightPoint[]; // frequency curve keyframes (sorted by t)
  collapsed: boolean;
}

/**
 * An OrderLine is a buying unit within a Campaign (e.g. "TV Primetime", "Digital Display").
 * It owns a share of the campaign budget and contains one or more Flights.
 */
export interface OrderLineItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  color: string;
  budgetWeight: number;   // % of parent campaign budget
  flights: FlightItem[];
  targeting?: TargetingConfig;
  /** Client / finance requisition references (zero or more free-text strings). */
  requisitionNumbers: string[];
  notes: string;
  collapsed: boolean;
}

/**
 * A Campaign is the top-level planning unit on the timeline.
 * It groups OrderLines and owns a total budget.
 */
export interface CampaignItem {
  id: string;
  name: string;
  advertiser: string;
  /**
   * Campaign calendar hull (YYYY-MM-DD), or `''` if no period is set yet.
   * Empty dates: shown in list / plan details, excluded from the timeline until both are valid ISO days and start ≤ end.
   */
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  color: string;
  /**
   * Legacy field from older builds; ignored. Campaign visuals use {@link CAMPAIGN_MONOCHROME_SCHEMES}
   * (primary chosen via `color`, paired secondary derived automatically).
   */
  colorScheme?: 'monochromatic' | 'custom';
  budget: BudgetItem;
  orderLines: OrderLineItem[];
  notes: string;
  collapsed: boolean;
  /**
   * User’s target total budget; inventory logic may set `budget.total` lower (or raise up to this when possible).
   * If absent, treated as `budget.total` (see migration).
   */
  budgetUserIntentTotal?: number;
  /**
   * 0–100. List price: 1 NOK = 1 view; higher discount reduces price per view and increases
   * implied views per krone (prototype inventory / pricing).
   */
  inventoryDiscountPercent?: number;
  /** Shown after automatic budget change due to shared weekly delivery capacity (prototype). */
  inventoryLastNote?: string;
}

/** Campaign appears on the timeline when both ends of the hull are set (YYYY-MM-DD) and ordered. */
export function campaignHasTimelineSchedule(c: CampaignItem): boolean {
  const s = (c.startDate ?? '').trim();
  const e = (c.endDate ?? '').trim();
  if (!s || !e) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) return false;
  return s <= e;
}

export type SelectedItem =
  | { type: 'campaign'; campaignId: string }
  | { type: 'order-line'; campaignId: string; orderLineId: string }
  | { type: 'order-line-targeting'; campaignId: string; orderLineId: string }
  | { type: 'flight'; campaignId: string; orderLineId: string; flightId: string }
  | { type: 'creative'; campaignId: string; orderLineId: string; flightId: string; creativeId: string };

// ─── Colour palettes ──────────────────────────────────────────────────────────

/** Seven fixed primary/secondary pairs; UI exposes primaries only. */
export const CAMPAIGN_MONOCHROME_SCHEMES: readonly { primary: string; secondary: string }[] = [
  { primary: '#FFEB3B', secondary: '#FFF59D' },
  { primary: '#69F0AE', secondary: '#E0F2F1' },
  { primary: '#00E5FF', secondary: '#84FFFF' },
  { primary: '#FF5252', secondary: '#FF8A80' },
  { primary: '#C2185B', secondary: '#B0526B' },
  { primary: '#2E1527', secondary: '#63475E' },
  { primary: '#D500F9', secondary: '#E1BEE7' },
];

/** Campaign colour picker = primaries only (secondary comes from the paired scheme). */
export const CAMPAIGN_COLORS = CAMPAIGN_MONOCHROME_SCHEMES.map(s => s.primary);

export const ORDER_LINE_COLORS = [
  '#5BAACC', '#78BEA0', '#E8A030', '#827CC8',
  '#DC5555', '#B48CD2', '#5CA888', '#D4845A',
];

export const FLIGHT_PALETTE = [
  '#827CC8', '#5BAACC', '#E8A030', '#78BEA0',
  '#DC5555', '#B48CD2', '#5CA888', '#D4845A',
];

export const getFlightColor = (index: number): string =>
  FLIGHT_PALETTE[index % FLIGHT_PALETTE.length];

export const CHANNEL_LABELS: Record<Channel, string> = {
  tv: 'TV', digital: 'Digital', radio: 'Radio', outdoor: 'Utendørs',
};

export const CHANNEL_COLORS: Record<Channel, string> = {
  tv: '#827CC8', digital: '#78BEA0', radio: '#E8A030', outdoor: '#B48CD2',
};

// ─── Sticky Notes ─────────────────────────────────────────────────────────────

export const STICKY_PALETTE: string[] = [
  '#FFF9C4', '#FCDDE2', '#C8E6FA', '#C8F0DC', '#E8DCFC',
  '#FFE8CC', '#FFD4D4', '#C8F4F4', '#D8F4C8', '#F4E0C0',
];

export interface StickyNoteData {
  id: string;
  text: string;
  color: string;
  position: { x: number; y: number };
  zIndex: number;
}

/** Kept for StickyNoteItem.tsx compatibility — pass { x:0, y:0, scale:1 } */
export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

/** Default flat curve (constant full weight) for new flights */
export const DEFAULT_WEIGHT_CURVE: WeightPoint[] = [
  { t: 0, v: 1 },
  { t: 1, v: 1 },
];

export function targetingContextLabel(context: TargetingContext): string {
  return TARGETING_CONTEXT_OPTIONS.find(o => o.value === context)?.label ?? context;
}

export function targetingGenderLabel(gender: TargetingGender): string {
  return TARGETING_GENDER_OPTIONS.find(o => o.value === gender)?.label ?? gender;
}