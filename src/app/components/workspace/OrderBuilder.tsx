import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import {
  CampaignItem, OrderLineItem, FlightItem, CreativeItem, BudgetItem,
  TargetingConfig, SelectedItem, WeightPoint, StickyNoteData, STICKY_PALETTE,
  CAMPAIGN_COLORS, ORDER_LINE_COLORS, DEFAULT_WEIGHT_CURVE,
} from './types';
import { INITIAL_CAMPAIGNS } from './sampleData';
import { WorkspaceDetailView, navigateSelectedBack } from './WorkspaceDetailView';
import { CampaignListView } from './CampaignListView';
import { CampaignPlanView } from './CampaignPlanView';
import { CampaignTimelineView, type CampaignTimelineViewHandle } from './CampaignTimelineView';
import { WorkspaceStickyNotes } from './WorkspaceStickyNotes';
import { WorkspaceToolbar } from './WorkspaceToolbar';
import type { WorkspacePrimaryMode } from './workspaceTypes';
import { ConfirmModal } from './ConfirmModal';
import { downloadSheetsTemplate } from './exportToSheets';
import {
  AlertTriangle, CheckCircle2, BookmarkCheck,
  Copy, LayoutTemplate, FileUp, ChevronLeft, FilePlus, MessageSquare, X,
} from 'lucide-react';
import { DescribeCampaignPanel } from './describeCampaign/DescribeCampaignPanel';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { loadUploadManifest, type UploadManifestEntry } from '../../storage/uploadManifest';
import { ImportCampaignWizard } from './import/ImportCampaignWizard';
import { applyCampaignAutoStatus } from './campaignTimelineChips';
import {
  applyCampaignDateBounds,
  expandCampaignToOrderLines,
  expandOrderLineToFlights,
  harmonizeCampaignDates,
  mergeOrderLineUserDatesWithFlights,
  needsDateHarmonize,
} from './timelineDateHierarchy';
import { localTodayYmd } from './import/dateLocal';
import { migrateCampaignsTargetingFromLegacy, migrateOrderLineRequisitionNumbers } from './import/validateImport';
import { WORKSPACE_ACTION_ACCENT } from './workspaceAccent';
import { AddCreativeModal } from './properties/AddCreativeModal';
import { distributeFlightRangesInOrderLine, resolveFlightsNoOverlapForActiveChange } from './flightOverlap';
import { migrateBudgetUserIntent, reconcileCampaignBudgetsForInventory } from './inventoryBudget';

// ─── Utilities ────────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function distributeEvenly(count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor(100 / count);
  const leftover = 100 - base * count;
  return Array.from({ length: count }, (_, i) => base + (i === 0 ? leftover : 0));
}

function newCampaignModalChoiceCard(accent: string): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
    padding: 14,
    borderRadius: 'var(--radius-md)',
    border: `1px solid color-mix(in srgb, ${accent} 30%, var(--border))`,
    backgroundColor: 'color-mix(in srgb, var(--card) 90%, var(--secondary))',
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  };
}

function newCampaignModalIconWrap(accent: string): React.CSSProperties {
  return {
    width: 38,
    height: 38,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
  };
}

const NEW_CAMPAIGN_MODAL_CLOSE_BTN: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  padding: 0,
  borderRadius: 'var(--radius-md)',
  border: `1px solid color-mix(in srgb, ${WORKSPACE_ACTION_ACCENT} 35%, var(--border))`,
  backgroundColor: 'color-mix(in srgb, var(--secondary) 94%, transparent)',
  color: 'var(--foreground)',
  cursor: 'pointer',
  flexShrink: 0,
};

function rebalanceSiblings<T extends { id: string; budgetWeight: number }>(
  items: T[], changedId: string, rawWeight: number
): T[] {
  // Guard: treat NaN/Infinity as 0 so a cleared input can never corrupt state
  const safe    = isFinite(rawWeight) ? rawWeight : 0;
  const clamped = Math.min(100, Math.max(0, Math.round(safe)));
  const others = items.filter(f => f.id !== changedId);
  if (others.length === 0) return items.map(f => ({ ...f, budgetWeight: 100 }));
  const remaining = 100 - clamped;
  const perItem = Math.floor(remaining / others.length);
  const leftover = remaining - perItem * others.length;
  return items.map(f => {
    if (f.id === changedId) return { ...f, budgetWeight: clamped };
    const idx = others.findIndex(o => o.id === f.id);
    return { ...f, budgetWeight: perItem + (idx === 0 ? leftover : 0) };
  });
}

/** Shift an ISO date string by `days` days. */
function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function today() { return new Date().toISOString().slice(0, 10); }
function monthsLater(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function newCampaign(index: number): CampaignItem {
  return {
    id: genId(), name: 'New Campaign', advertiser: '',
    startDate: today(), endDate: monthsLater(3),
    status: 'draft', color: CAMPAIGN_COLORS[index % CAMPAIGN_COLORS.length],
    budget: { id: genId(), total: 0, currency: 'NOK', type: 'gross' },
    budgetUserIntentTotal: 0,
    inventoryDiscountPercent: 0,
    orderLines: [], notes: '', collapsed: false,
  };
}

function newOrderLine(camp: CampaignItem, index: number): OrderLineItem {
  return {
    id: genId(), name: 'New Order Line',
    startDate: camp.startDate, endDate: camp.endDate,
    status: 'draft', color: ORDER_LINE_COLORS[index % ORDER_LINE_COLORS.length],
    budgetWeight: 100, flights: [], requisitionNumbers: [], notes: '', collapsed: false,
  };
}

function newFlight(ol: OrderLineItem): FlightItem {
  return {
    id: genId(), name: 'New Flight', channel: 'tv',
    startDate: ol.startDate, endDate: ol.endDate,
    budgetWeight: 100, targetAudience: '',
    collapsed: false, weightCurve: [...DEFAULT_WEIGHT_CURVE],
  };
}

function newTargeting(): TargetingConfig {
  return {
    id: genId(),
    counties: [],
    gender: 'all',
    context: 'all',
  };
}

function newCreative(): CreativeItem {
  return {
    id: genId(), name: 'New Creative', format: '30s', duration: 30, status: 'draft',
    mediaSource: 'nielsen',
  };
}

function deepCloneCampaign(source: CampaignItem, index: number): CampaignItem {
  return {
    ...source,
    id: genId(),
    name: `${source.name} (copy)`,
    budget: { ...source.budget, id: genId() },
    budgetUserIntentTotal: source.budgetUserIntentTotal ?? source.budget.total,
    inventoryDiscountPercent: source.inventoryDiscountPercent ?? 0,
    inventoryLastNote: undefined,
    orderLines: source.orderLines.map(ol => ({
      ...ol,
      id: genId(),
      targeting: ol.targeting ? { ...ol.targeting, id: genId() } : undefined,
      flights: ol.flights.map(fl => ({
        ...fl,
        id: genId(),
        creative: fl.creative ? { ...fl.creative, id: genId() } : undefined,
        weightCurve: fl.weightCurve.map(p => ({ ...p })),
      })),
    })),
    color: CAMPAIGN_COLORS[index % CAMPAIGN_COLORS.length],
  };
}

function newCampaignFromTemplate(index: number): CampaignItem {
  const camp = newCampaign(index);
  const ol = newOrderLine(camp, 0);
  const fl = newFlight(ol);
  return {
    ...camp,
    name: 'Campaign from template',
    notes: 'Starter from template — adjust budget, dates, and structure.',
    orderLines: [{ ...ol, flights: [fl] }],
  };
}

const NEW_CAMPAIGN_MODAL_Z = 190_000;

export interface OrderBuilderHandle {
  openNewCampaignModal: () => void;
}

export interface OrderBuilderProps {
  /** `all-campaigns` forces list surface and clears selection (Alle kampanjer tab). */
  surface?: 'planner' | 'all-campaigns';
}

// ─── OrderBuilder ─────────────────────────────────────────────────────────────

export const OrderBuilder = forwardRef<OrderBuilderHandle, OrderBuilderProps>(function OrderBuilder({ surface = 'planner' }, ref) {
  const [campaigns, setCampaignsRaw, campaignsHydrated] = useLocalStorage<CampaignItem[]>('adweb_campaigns', INITIAL_CAMPAIGNS);
  const setCampaigns = useCallback(
    (action: React.SetStateAction<CampaignItem[]>) => {
      setCampaignsRaw(prev => {
        const next = typeof action === 'function' ? action(prev) : action;
        return reconcileCampaignBudgetsForInventory(migrateBudgetUserIntent(next)).campaigns;
      });
    },
    [setCampaignsRaw],
  );
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [workspaceMode, setWorkspaceMode] = useLocalStorage<WorkspacePrimaryMode>('adweb_workspace_mode', 'list');
  const [timelinePixelsPerDay, setTimelinePixelsPerDay] = useLocalStorage<number>('adweb_timeline_px_per_day', 14);
  const timelineViewRef = useRef<CampaignTimelineViewHandle | null>(null);

  const [stickyNotes, setStickyNotes, stickyHydrated] = useLocalStorage<StickyNoteData[]>('adweb_sticky_notes', []);
  const storageReady = campaignsHydrated && stickyHydrated;

  const didMigrateCalendarMode = useRef(false);
  useEffect(() => {
    if (!storageReady || didMigrateCalendarMode.current) return;
    didMigrateCalendarMode.current = true;
    setWorkspaceMode(w => ((w as unknown as string) === 'calendar' ? 'timeline' : w) as WorkspacePrimaryMode);
  }, [storageReady, setWorkspaceMode]);

  useEffect(() => {
    if (surface !== 'all-campaigns') return;
    setSelected(null);
    if (workspaceMode !== 'list') setWorkspaceMode('list');
  }, [surface, workspaceMode, setWorkspaceMode]);

  const didMigrateTargeting = useRef(false);
  useEffect(() => {
    if (!storageReady || didMigrateTargeting.current) return;
    didMigrateTargeting.current = true;
    setCampaigns(prev => migrateOrderLineRequisitionNumbers(migrateCampaignsTargetingFromLegacy(prev)));
  }, [storageReady, setCampaigns]);

  /** Keep campaign/OL bars aligned to flight hulls whenever stored data drifts (e.g. legacy, import, partial updates). */
  useEffect(() => {
    if (!storageReady) return;
    setCampaigns(prev => {
      if (!prev.some(needsDateHarmonize)) return prev;
      const next = prev.map(c => (needsDateHarmonize(c) ? harmonizeCampaignDates(c) : c));
      if (next.every((c, i) => c === prev[i])) return prev;
      return next;
    });
  }, [storageReady, campaigns, setCampaigns]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const [uploadManifest, setUploadManifest] = useState<UploadManifestEntry[]>([]);

  const refreshUploadLibrary = useCallback(() => {
    void loadUploadManifest().then(setUploadManifest);
  }, []);

  useEffect(() => {
    void loadUploadManifest().then(setUploadManifest);
  }, []);

  /** Booked → Active at campaign start; Active → Booked before start; live → Completed after end. */
  useEffect(() => {
    const tick = () => {
      const today = localTodayYmd();
      setCampaigns(prev => {
        const next = prev.map(c => applyCampaignAutoStatus(c, today));
        if (next.every((c, i) => c.status === prev[i].status)) return prev;
        return next;
      });
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [setCampaigns]);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // ── Campaign CRUD ─────────────────────────────────────────────────────────

  const [newCampaignModalOpen, setNewCampaignModalOpen] = useState(false);
  const [newCampaignModalStep, setNewCampaignModalStep] = useState<'choices' | 'copyPick' | 'describe'>('choices');
  const [describeSession, setDescribeSession] = useState(0);
  const importCampaignFileRef = useRef<HTMLInputElement>(null);
  const [importWizardFile, setImportWizardFile] = useState<File | null>(null);
  /** Briefly set after describe/import so the campaign list can scroll into view. */
  const [focusListCampaignId, setFocusListCampaignId] = useState<string | null>(null);
  /** Opens {@link AddCreativeModal} after attaching a new creative to a flight */
  const [addCreativeModal, setAddCreativeModal] = useState<{ cid: string; olid: string; fid: string } | null>(null);
  const clearListFocus = useCallback(() => setFocusListCampaignId(null), []);

  useEffect(() => {
    if (!focusListCampaignId) return;
    const tid = window.setTimeout(() => {
      document.querySelector(`[data-adweb-campaign-row="${focusListCampaignId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      clearListFocus();
    }, 80);
    return () => clearTimeout(tid);
  }, [focusListCampaignId, clearListFocus]);

  const closeNewCampaignModal = useCallback(() => {
    setNewCampaignModalOpen(false);
    setNewCampaignModalStep('choices');
  }, []);

  useImperativeHandle(ref, () => ({
    openNewCampaignModal: () => {
      setNewCampaignModalStep('choices');
      setNewCampaignModalOpen(true);
    },
  }), []);

  const handleAddCampaign = useCallback(() => {
    setCampaigns(prev => {
      const camp = newCampaign(prev.length);
      setSelected({ type: 'campaign', campaignId: camp.id });
      return [...prev, camp];
    });
  }, []);

  const handleDuplicateCampaign = useCallback((sourceId: string) => {
    setCampaigns(prev => {
      const src = prev.find(c => c.id === sourceId);
      if (!src) return prev;
      const copy = deepCloneCampaign(src, prev.length);
      setSelected({ type: 'campaign', campaignId: copy.id });
      return [...prev, copy];
    });
    closeNewCampaignModal();
  }, [closeNewCampaignModal]);

  const handleAddCampaignFromTemplate = useCallback(() => {
    setCampaigns(prev => {
      const camp = newCampaignFromTemplate(prev.length);
      setSelected({ type: 'campaign', campaignId: camp.id });
      return [...prev, camp];
    });
    closeNewCampaignModal();
    toast('Added campaign from template');
  }, [closeNewCampaignModal, toast]);

  const onImportCampaignFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    closeNewCampaignModal();
    setImportWizardFile(f);
  }, [closeNewCampaignModal]);

  const handleAddEmptyCampaignAndClose = useCallback(() => {
    handleAddCampaign();
    closeNewCampaignModal();
  }, [handleAddCampaign, closeNewCampaignModal]);

  const handleDeleteCampaign = useCallback((id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    setSelected(s => (s && 'campaignId' in s && s.campaignId === id) ? null : s);
    toast('Campaign deleted');
  }, [toast]);

  const handleToggleCampaignCollapse = useCallback((id: string) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, collapsed: !c.collapsed } : c));
  }, []);

  const handleUpdateCampaign = useCallback((id: string, u: Partial<CampaignItem>) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== id) return c;
      const next: CampaignItem = { ...c, ...u };
      if (u.budget && typeof u.budget.total === 'number') {
        next.budgetUserIntentTotal = u.budget.total;
        next.inventoryLastNote = undefined;
      }
      return next;
    }));
  }, [setCampaigns]);

  const handleUpdateCampaignBudget = useCallback((id: string, u: Partial<BudgetItem>) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== id) return c;
      const nextBudget = { ...c.budget, ...u };
      return {
        ...c,
        budget: nextBudget,
        ...(typeof u.total === 'number' ? { budgetUserIntentTotal: u.total, inventoryLastNote: undefined } : {}),
      };
    }));
  }, [setCampaigns]);

  const handleUpdateCampaignDates = useCallback((id: string, s: string, e: string) => {
    setCampaigns(prev => prev.map(c => (c.id === id ? expandCampaignToOrderLines(applyCampaignDateBounds(c, s, e)) : c)));
  }, []);

  /** Move a campaign AND all its order lines and flights by `days` days. */
  const handleMoveCampaign = useCallback((id: string, days: number) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== id) return c;
      return expandCampaignToOrderLines({
        ...c,
        startDate: shiftDate(c.startDate, days),
        endDate: shiftDate(c.endDate, days),
        orderLines: c.orderLines.map(ol => ({
          ...ol,
          startDate: shiftDate(ol.startDate, days),
          endDate: shiftDate(ol.endDate, days),
          flights: ol.flights.map(f => ({
            ...f,
            startDate: shiftDate(f.startDate, days),
            endDate: shiftDate(f.endDate, days),
          })),
        })),
      });
    }));
  }, []);

  /** Move an order line AND all its flights by `days` days. */
  const handleMoveOrderLine = useCallback((cid: string, olid: string, days: number) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== cid) return c;
      const orderLines = c.orderLines.map(ol => {
        if (ol.id !== olid) return ol;
        return {
          ...ol,
          startDate: shiftDate(ol.startDate, days),
          endDate: shiftDate(ol.endDate, days),
          flights: ol.flights.map(f => ({
            ...f,
            startDate: shiftDate(f.startDate, days),
            endDate: shiftDate(f.endDate, days),
          })),
        };
      });
      return expandCampaignToOrderLines({ ...c, orderLines });
    }));
  }, []);

  // ── Order line CRUD ───────────────────────────────────────────────────────

  const handleAddOrderLine = useCallback((cid: string) => {
    const camp = campaigns.find(c => c.id === cid);
    if (!camp) return;
    const newOl = newOrderLine(camp, camp.orderLines.length);
    const olId = newOl.id;
    setCampaigns(prev => prev.map(c => {
      if (c.id !== cid) return c;
      const total = c.orderLines.length + 1;
      const weights = distributeEvenly(total);
      const updatedOls = c.orderLines.map((ol, i) => ({ ...ol, budgetWeight: weights[i] }));
      newOl.budgetWeight = weights[total - 1];
      return { ...c, orderLines: [...updatedOls, newOl] };
    }));
    setSelected({ type: 'order-line', campaignId: cid, orderLineId: olId });
  }, [campaigns]);

  const handleDeleteOrderLine = useCallback((cid: string, olid: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== cid) return c;
      const remaining = c.orderLines.filter(ol => ol.id !== olid);
      const weights = distributeEvenly(remaining.length);
      return { ...c, orderLines: remaining.map((ol, i) => ({ ...ol, budgetWeight: weights[i] })) };
    }));
    setSelected(s => s && 'orderLineId' in s && s.orderLineId === olid ? null : s);
  }, []);

  const handleReorderOrderLines = useCallback((cid: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setCampaigns(prev => prev.map(c => {
      if (c.id !== cid) return c;
      const ols = [...c.orderLines];
      if (fromIndex < 0 || fromIndex >= ols.length || toIndex < 0 || toIndex >= ols.length) return c;
      const [removed] = ols.splice(fromIndex, 1);
      ols.splice(toIndex, 0, removed);
      return { ...c, orderLines: ols };
    }));
  }, []);

  const handleToggleOrderLineCollapse = useCallback((cid: string, olid: string) => {
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: c.orderLines.map(ol => ol.id === olid ? { ...ol, collapsed: !ol.collapsed } : ol),
    }));
  }, []);

  const handleExpandOrderLine = useCallback((cid: string, olid: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== cid) return c;
      return {
        ...c,
        orderLines: c.orderLines.map(ol => (ol.id === olid ? { ...ol, collapsed: false } : ol)),
      };
    }));
  }, []);

  const handleUpdateOrderLine = useCallback((cid: string, olid: string, u: Partial<OrderLineItem>) => {
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: c.orderLines.map(ol => ol.id === olid ? { ...ol, ...u } : ol),
    }));
  }, []);

  const handleRebalanceOrderLineWeights = useCallback((cid: string, olid: string, w: number) => {
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: rebalanceSiblings(c.orderLines, olid, w),
    }));
  }, []);

  /** Set all order-line budget weights at once (e.g. campaign plan «Fordeling» bar drag). */
  const handleSetOrderLineWeights = useCallback((cid: string, weights: number[]) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== cid) return c;
      if (weights.length !== c.orderLines.length) return c;
      return {
        ...c,
        orderLines: c.orderLines.map((ol, i) => ({ ...ol, budgetWeight: weights[i] ?? 0 })),
      };
    }));
  }, []);

  /** Set all flight budget weights within one order line (plan «fordeling» bar). */
  const handleSetFlightWeights = useCallback((cid: string, olid: string, weights: number[]) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== cid) return c;
      return {
        ...c,
        orderLines: c.orderLines.map(ol => {
          if (ol.id !== olid) return ol;
          if (weights.length !== ol.flights.length) return ol;
          return {
            ...ol,
            flights: ol.flights.map((f, i) => ({ ...f, budgetWeight: weights[i] ?? 0 })),
          };
        }),
      };
    }));
  }, []);

  const handleUpdateOrderLineDates = useCallback((cid: string, olid: string, s: string, e: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== cid) return c;
      const orderLines = c.orderLines.map(ol =>
        ol.id === olid ? mergeOrderLineUserDatesWithFlights(ol, s, e) : ol,
      );
      return expandCampaignToOrderLines({ ...c, orderLines });
    }));
  }, []);

  const ensureOrderLineTargeting = useCallback((cid: string, olid: string) => {
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: c.orderLines.map(ol => ol.id === olid ? {
        ...ol,
        targeting: ol.targeting ?? newTargeting(),
      } : ol),
    }));
  }, []);

  const handleAddTargetingToOrderLine = useCallback((cid: string, olid: string) => {
    ensureOrderLineTargeting(cid, olid);
    setSelected({ type: 'order-line-targeting', campaignId: cid, orderLineId: olid });
  }, [ensureOrderLineTargeting]);

  const handleUpdateOrderLineTargeting = useCallback((cid: string, olid: string, u: Partial<TargetingConfig>) => {
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: c.orderLines.map(ol => {
        if (ol.id !== olid) return ol;
        const next = ol.targeting ? { ...ol.targeting, ...u } : { ...newTargeting(), ...u };
        return { ...ol, targeting: next };
      }),
    }));
  }, []);

  // ── Flight CRUD ───────────────────────────────────────────────────────────

  const handleAddFlight = useCallback((cid: string, olid: string) => {
    const camp = campaigns.find(c => c.id === cid);
    const ol = camp?.orderLines.find(o => o.id === olid);
    if (!ol) return;
    const fl = newFlight(ol);
    const flId = fl.id;
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: c.orderLines.map(o => {
        if (o.id !== olid) return o;
        const total = o.flights.length + 1;
        const weights = distributeEvenly(total);
        const updatedFlights = o.flights.map((f, i) => ({ ...f, budgetWeight: weights[i] }));
        fl.budgetWeight = weights[total - 1];
        const combined = [...updatedFlights, fl];
        const ranged = distributeFlightRangesInOrderLine(combined, o.startDate, o.endDate);
        return { ...o, flights: ranged };
      }),
    }));
    setSelected({ type: 'flight', campaignId: cid, orderLineId: olid, flightId: flId });
  }, [campaigns]);

  const handleDeleteFlight = useCallback((cid: string, olid: string, fid: string) => {
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: c.orderLines.map(ol => {
        if (ol.id !== olid) return ol;
        const remaining = ol.flights.filter(f => f.id !== fid);
        if (remaining.length === 1) return { ...ol, flights: [{ ...remaining[0], budgetWeight: 100 }] };
        return { ...ol, flights: remaining };
      }),
    }));
    setSelected(s => s && 'flightId' in s && s.flightId === fid ? null : s);
  }, []);

  const handleUpdateFlight = useCallback((cid: string, olid: string, fid: string, u: Partial<FlightItem>) => {
    const touchesDates = 'startDate' in u || 'endDate' in u;
    setCampaigns(prev => prev.map(c => {
      if (c.id !== cid) return c;
      return {
        ...c,
        orderLines: c.orderLines.map(ol => {
          if (ol.id !== olid) return ol;
          if (!touchesDates) {
            return {
              ...ol,
              flights: ol.flights.map(f => f.id === fid ? { ...f, ...u } : f),
            };
          }
          const cur = ol.flights.find(f => f.id === fid);
          if (!cur) return ol;
          const ns = u.startDate ?? cur.startDate;
          const ne = u.endDate ?? cur.endDate;
          const resolved = resolveFlightsNoOverlapForActiveChange(ol.flights, fid, ns, ne, ol.startDate, ol.endDate);
          const flights = resolved.map(rf =>
            rf.id === fid ? { ...rf, ...u, startDate: rf.startDate, endDate: rf.endDate } : rf,
          );
          return expandOrderLineToFlights({ ...ol, flights });
        }),
      };
    }));
  }, []);

  const handleUpdateFlightCurve = useCallback((cid: string, olid: string, fid: string, pts: WeightPoint[]) => {
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: c.orderLines.map(ol => ol.id !== olid ? ol : {
        ...ol, flights: ol.flights.map(f => f.id === fid ? { ...f, weightCurve: pts } : f),
      }),
    }));
  }, []);

  const handleRebalanceFlightWeights = useCallback((cid: string, olid: string, fid: string, w: number) => {
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: c.orderLines.map(ol => ol.id !== olid ? ol : {
        ...ol, flights: rebalanceSiblings(ol.flights, fid, w),
      }),
    }));
  }, []);

  /**
   * Update flight dates AND propagate expansion upward:
   * – if flight grows beyond its parent OrderLine → expand the OL
   * – if OL grows beyond its parent Campaign → expand the Campaign
   */
  const handleUpdateFlightDates = useCallback((cid: string, olid: string, fid: string, s: string, e: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== cid) return c;
      const orderLines = c.orderLines.map(ol => {
        if (ol.id !== olid) return ol;
        const flights = resolveFlightsNoOverlapForActiveChange(ol.flights, fid, s, e, ol.startDate, ol.endDate);
        return expandOrderLineToFlights({ ...ol, flights });
      });
      return expandCampaignToOrderLines({ ...c, orderLines });
    }));
  }, []);

  const handleAddCreativeToFlight = useCallback((cid: string, olid: string, fid: string) => {
    const camp = campaigns.find(c => c.id === cid);
    const ol = camp?.orderLines.find(o => o.id === olid);
    const fl = ol?.flights.find(f => f.id === fid);
    const cr = fl?.creative ?? newCreative();
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: c.orderLines.map(o => o.id !== olid ? o : {
        ...o, flights: o.flights.map(f => f.id === fid ? { ...f, creative: cr } : f),
      }),
    }));
    setSelected({ type: 'flight', campaignId: cid, orderLineId: olid, flightId: fid });
    setAddCreativeModal({ cid, olid, fid });
  }, [campaigns]);

  const handleUpdateCreative = useCallback((cid: string, olid: string, fid: string, crid: string, u: Partial<CreativeItem>) => {
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: c.orderLines.map(ol => ol.id !== olid ? ol : {
        ...ol, flights: ol.flights.map(f => f.id === fid && f.creative?.id === crid ? { ...f, creative: { ...f.creative!, ...u } } : f),
      }),
    }));
  }, []);

  const handleRemoveCreativeFromFlight = useCallback((cid: string, olid: string, fid: string) => {
    setCampaigns(prev => prev.map(c => c.id !== cid ? c : {
      ...c, orderLines: c.orderLines.map(ol => ol.id !== olid ? ol : {
        ...ol, flights: ol.flights.map(f => f.id === fid ? { ...f, creative: undefined } : f),
      }),
    }));
    setSelected(s => {
      if (!s || s.type !== 'creative') return s;
      if (s.campaignId === cid && s.orderLineId === olid && s.flightId === fid) {
        return { type: 'flight', campaignId: cid, orderLineId: olid, flightId: fid };
      }
      return s;
    });
  }, []);

  // ── Sticky notes ──────────────────────────────────────────────────────────

  const handleAddStickyNote = useCallback(() => {
    const maxZ = stickyNotes.reduce((m, n) => Math.max(m, n.zIndex), 0);
    const note: StickyNoteData = {
      id: genId(), text: '',
      color: STICKY_PALETTE[stickyNotes.length % STICKY_PALETTE.length],
      position: { x: 80 + Math.random() * 60, y: 60 + Math.random() * 40 },
      zIndex: maxZ + 1,
    };
    setStickyNotes(prev => [...prev, note]);
  }, [stickyNotes]);

  const handleUpdateStickyNote = useCallback((id: string, u: Partial<StickyNoteData>) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, ...u } : n));
  }, []);

  const handleDeleteStickyNote = useCallback((id: string) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  // ── Derived budget strip data ──────────────────────────────────────────────

  const selectedCamp = selected && 'campaignId' in selected ? campaigns.find(c => c.id === selected.campaignId) : null;

  /** Keep campaign plan visible while editing OL / flight / targeting / creative (no full-screen drill-down). */
  const inlineCampaignPlan =
    workspaceMode === 'list' &&
    !!selectedCamp &&
    !!selected &&
    (selected.type === 'campaign' ||
      selected.type === 'order-line' ||
      selected.type === 'order-line-targeting' ||
      selected.type === 'flight' ||
      selected.type === 'creative');

  const detailPanel =
    selected === null || inlineCampaignPlan ? null : (
      <WorkspaceDetailView
        selected={selected}
        campaigns={campaigns}
        onBack={() => { setSelected(s => (s ? navigateSelectedBack(s) : null)); }}
        onNavigate={setSelected}
        onAddOrderLine={handleAddOrderLine}
        onAddFlight={handleAddFlight}
        onAddTargetingToOrderLine={handleAddTargetingToOrderLine}
        onAddCreativeToFlight={handleAddCreativeToFlight}
        onDeleteOrderLine={handleDeleteOrderLine}
        onDeleteFlight={handleDeleteFlight}
        onUpdateCampaign={handleUpdateCampaign}
        onUpdateCampaignBudget={handleUpdateCampaignBudget}
        onUpdateOrderLine={handleUpdateOrderLine}
        onRebalanceOrderLineWeights={handleRebalanceOrderLineWeights}
        onUpdateFlight={handleUpdateFlight}
        onUpdateFlightCurve={handleUpdateFlightCurve}
        onRebalanceFlightWeights={handleRebalanceFlightWeights}
        onUpdateOrderLineTargeting={handleUpdateOrderLineTargeting}
        onUpdateCreative={handleUpdateCreative}
        onRemoveCreativeFromFlight={handleRemoveCreativeFromFlight}
        uploadManifest={uploadManifest}
        onUploadLibraryChanged={refreshUploadLibrary}
        onRequestDeleteCampaign={id => setPendingDeleteId(id)}
      />
    );

  if (!storageReady) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--background)',
          color: 'var(--muted-foreground)',
          fontFamily: 'var(--font-family-text)',
          fontSize: 13,
        }}
      >
        Loading saved data…
      </div>
    );
  }

  return (
    <div style={{ height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--background)', position: 'relative' }}>

      {/* ── Per-campaign budget strip ─────────────────────────────────────── */}
      {campaigns.length > 0 && (
        <div
          data-adweb-budget-strip style={{
          height: 56, flexShrink: 0,
          display: 'flex', alignItems: 'stretch',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
          overflowX: 'auto', overflowY: 'hidden',
        }}>
          {campaigns.map(camp => {
            const olWeight   = camp.orderLines.reduce((s, ol) => s + ol.budgetWeight, 0);
            const isSelected = selectedCamp?.id === camp.id;
            const balanced   = olWeight === 100;
            const assignedPct = camp.orderLines.length === 0 ? 0 : Math.min(100, olWeight);
            return (
              <button
                key={camp.id}
                onClick={() => {
                  setSelected({ type: 'campaign', campaignId: camp.id });
                  if (workspaceMode === 'timeline') {
                    requestAnimationFrame(() => {
                      timelineViewRef.current?.focusCampaignInView(camp.id);
                    });
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  paddingLeft: 16, paddingRight: 18,
                  flexShrink: 0, minWidth: 220, maxWidth: 300,
                  background: 'none',
                  borderRight: '1px solid var(--border)',
                  borderTop: isSelected ? `2px solid ${camp.color}` : '2px solid transparent',
                  borderLeft: 'none', borderBottom: 'none',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(165, 180, 252, 0.08)' : 'transparent',
                  transition: 'background-color 0.12s',
                  textAlign: 'left',
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--secondary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? 'rgba(165, 180, 252, 0.08)' : 'transparent'; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {camp.budget.total > 0 ? `${camp.budget.total.toLocaleString('nb-NO')} ${camp.budget.currency}` : '—'}
                    {camp.advertiser ? (
                      <span style={{ fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)' }}>
                        {' '}— {camp.advertiser}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 10, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {camp.name}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0, width: 72 }}>
                  <div style={{ width: '100%', height: 5, borderRadius: 99, overflow: 'hidden', display: 'flex', backgroundColor: 'rgba(249, 107, 106, 0.35)' }}>
                    <div
                      style={{
                        width: `${assignedPct}%`,
                        height: '100%',
                        backgroundColor: 'var(--primary)',
                        transition: 'width 0.25s ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {balanced
                      ? <CheckCircle2 size={10} style={{ color: 'var(--status-success)' }} />
                      : <AlertTriangle size={10} style={{ color: 'var(--status-warning)' }} />}
                    <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 9, fontWeight: 'var(--font-weight-semibold)', color: balanced ? 'var(--status-success)' : 'var(--status-warning)', whiteSpace: 'nowrap' }}>
                      {assignedPct}% tildelt
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Workspace: list/timeline + drilldown + notes ─────────────────────────── */}
      <div
        data-adweb-main-workspace
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, minHeight: 0, position: 'relative' }}
        onMouseDown={e => {
          const t = e.target as HTMLElement;
          if (t.closest('[data-adweb-workspace-inner], [data-adweb-budget-strip], [data-adweb-workspace-detail], [data-adweb-workspace-toolbar], [data-adweb-sticky-notes], [data-adweb-timeline-root]')) {
            return;
          }
          setSelected(null);
        }}
      >
        <div data-adweb-workspace-inner style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <WorkspaceToolbar
            mode={workspaceMode}
            onModeChange={setWorkspaceMode}
            onAddStickyNote={handleAddStickyNote}
            showListToggle={surface === 'planner'}
          />
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {workspaceMode === 'timeline' ? (
              <CampaignTimelineView
                ref={timelineViewRef}
                campaigns={campaigns}
                pixelsPerDay={timelinePixelsPerDay}
                onPixelsPerDayChange={setTimelinePixelsPerDay}
                selected={selected}
                onSelect={setSelected}
                onCampaignOpen={id => setSelected({ type: 'campaign', campaignId: id })}
                onToggleCampaignCollapse={handleToggleCampaignCollapse}
                onUpdateCampaignDates={handleUpdateCampaignDates}
                onUpdateOrderLineDates={handleUpdateOrderLineDates}
                onUpdateFlightDates={handleUpdateFlightDates}
                onUpdateFlightCurve={handleUpdateFlightCurve}
                onMoveCampaign={handleMoveCampaign}
                onMoveOrderLine={handleMoveOrderLine}
              />
            ) : workspaceMode === 'list' && inlineCampaignPlan && selectedCamp ? (
              <CampaignPlanView
                campaign={selectedCamp}
                selected={selected}
                onClearSelection={() => setSelected(null)}
                onNavigate={setSelected}
                onUpdateCampaign={handleUpdateCampaign}
                onUpdateCampaignBudget={handleUpdateCampaignBudget}
                onUpdateCampaignDates={handleUpdateCampaignDates}
                onAddOrderLine={handleAddOrderLine}
                onAddFlight={handleAddFlight}
                onDeleteOrderLine={handleDeleteOrderLine}
                onDeleteFlight={handleDeleteFlight}
                onToggleOrderLineCollapse={handleToggleOrderLineCollapse}
                onSetOrderLineWeights={handleSetOrderLineWeights}
                onExpandOrderLine={handleExpandOrderLine}
                onUpdateOrderLine={handleUpdateOrderLine}
                onRebalanceOrderLineWeights={handleRebalanceOrderLineWeights}
                onEnsureOrderLineTargeting={ensureOrderLineTargeting}
                onUpdateOrderLineTargeting={handleUpdateOrderLineTargeting}
                onUpdateFlight={handleUpdateFlight}
                onUpdateFlightCurve={handleUpdateFlightCurve}
                onSetFlightWeights={handleSetFlightWeights}
                onRemoveCreativeFromFlight={handleRemoveCreativeFromFlight}
                onAddCreativeToFlight={handleAddCreativeToFlight}
                onRequestDeleteCampaign={id => setPendingDeleteId(id)}
              />
            ) : selected ? (
              detailPanel
            ) : workspaceMode === 'list' ? (
              <CampaignListView
                campaigns={campaigns}
                selectedCampaignId={selectedCamp?.id}
                onSelectCampaign={id => setSelected({ type: 'campaign', campaignId: id })}
                onAddCampaign={() => setNewCampaignModalOpen(true)}
              />
            ) : null}
          </div>
          <WorkspaceStickyNotes
            notes={stickyNotes}
            onUpdate={handleUpdateStickyNote}
            onDelete={handleDeleteStickyNote}
          />
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--foreground)', color: 'var(--background)', padding: '8px 18px', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-semibold)', zIndex: 9999, pointerEvents: 'none', boxShadow: '0 4px 18px rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', gap: 7 }}>
          <BookmarkCheck size={14} />
          {toastMsg}
        </div>
      )}

      {addCreativeModal && (() => {
        const m = addCreativeModal;
        const camp = campaigns.find(c => c.id === m.cid);
        const ol = camp?.orderLines.find(o => o.id === m.olid);
        const fl = ol?.flights.find(f => f.id === m.fid);
        const cr = fl?.creative;
        if (!camp || !ol || !fl || !cr) return null;
        return (
          <AddCreativeModal
            open
            onClose={() => setAddCreativeModal(null)}
            creative={cr}
            campaigns={campaigns}
            uploadManifest={uploadManifest}
            onUploadLibraryChanged={refreshUploadLibrary}
            creativeContext={{
              advertiser: camp.advertiser || '—',
              campaignName: camp.name,
              flightName: fl.name,
            }}
            onUpdate={u => handleUpdateCreative(m.cid, m.olid, m.fid, cr.id, u)}
            onRemoveFromFlight={() => {
              handleRemoveCreativeFromFlight(m.cid, m.olid, m.fid);
              setAddCreativeModal(null);
            }}
          />
        );
      })()}

      {/* Confirm delete modal */}
      {pendingDeleteId && (() => {
        const pendingCamp = campaigns.find(c => c.id === pendingDeleteId);
        const name = pendingCamp?.name ?? 'Denne kampanjen';
        return (
          <ConfirmModal
            title="Slette kampanje?"
            message={`«${name}» og all tilhørende data (ordrelinjer, flights, målgrupper og kreativer) blir permanent fjernet. Dette kan ikke angres.`}
            variant="destructive"
            confirmLabel="Slett kampanje"
            cancelLabel="Avbryt"
            onConfirm={() => {
              handleDeleteCampaign(pendingDeleteId);
              setPendingDeleteId(null);
            }}
            onCancel={() => setPendingDeleteId(null)}
          />
        );
      })()}

      {importWizardFile && (
        <ImportCampaignWizard
          key={`${importWizardFile.name}-${importWizardFile.lastModified}`}
          file={importWizardFile}
          open
          onClose={() => setImportWizardFile(null)}
          onImported={camps => {
            if (camps.length === 0) {
              toast('Import produced no campaigns');
              return;
            }
            setCampaigns(prev => [...prev, ...camps]);
            if (camps[0]) {
              setSelected({ type: 'campaign', campaignId: camps[0].id });
              setFocusListCampaignId(camps[0].id);
            }
            toast(`Imported ${camps.length} campaign(s)`);
          }}
          genId={genId}
          colorStartIndex={campaigns.length}
        />
      )}

      <input
        ref={importCampaignFileRef}
        type="file"
        accept=".xls,.xlsx,.xml,.txt,.doc,.docx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/xml,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={onImportCampaignFileChange}
      />

      {newCampaignModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            newCampaignModalStep === 'copyPick'
              ? 'Kopier eksisterende kampanje'
              : newCampaignModalStep === 'describe'
                ? 'Beskriv kampanjen'
                : 'Ny kampanje'
          }
          onMouseDown={e => e.target === e.currentTarget && closeNewCampaignModal()}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: NEW_CAMPAIGN_MODAL_Z,
            backgroundColor: 'rgba(5, 3, 14, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: newCampaignModalStep === 'describe' ? 520 : 440,
              maxHeight: newCampaignModalStep === 'describe' ? 'min(92vh, 700px)' : 'min(90vh, 560px)',
              overflow: 'auto',
              backgroundColor: 'var(--card)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid color-mix(in srgb, ${WORKSPACE_ACTION_ACCENT} 26%, var(--border))`,
              boxShadow: '0 28px 56px rgba(0,0,0,0.55)',
              padding: '20px 20px 18px',
            }}
          >
            {newCampaignModalStep === 'copyPick' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <button
                    type="button"
                    onClick={() => setNewCampaignModalStep('choices')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      background: 'none',
                      border: `1px solid color-mix(in srgb, ${WORKSPACE_ACTION_ACCENT} 28%, var(--border))`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-family-text)',
                      fontSize: 12,
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <ChevronLeft size={14} aria-hidden />
                    Tilbake
                  </button>
                  <button type="button" aria-label="Lukk" onClick={closeNewCampaignModal} style={NEW_CAMPAIGN_MODAL_CLOSE_BTN}>
                    <X size={18} strokeWidth={2} aria-hidden />
                  </button>
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-family-display)',
                    fontSize: 18,
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--foreground)',
                    margin: '0 0 6px',
                  }}
                >
                  Kopier eksisterende
                </h2>
                <p style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', margin: '0 0 14px' }}>
                  Velg en kampanje å duplisere med nye ID-er.
                </p>
                {campaigns.length === 0 ? (
                  <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 13, color: 'var(--muted-foreground)' }}>Ingen kampanjer ennå.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {campaigns.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleDuplicateCampaign(c.id)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid color-mix(in srgb, ${WORKSPACE_ACTION_ACCENT} 22%, var(--border))`,
                          backgroundColor: 'color-mix(in srgb, var(--secondary) 88%, var(--card))',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-family-text)',
                          fontSize: 13,
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--foreground)',
                        }}
                      >
                        {c.name}
                        <span style={{ display: 'block', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', marginTop: 2 }}>
                          {c.advertiser || '—'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : newCampaignModalStep === 'describe' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button type="button" aria-label="Lukk" onClick={closeNewCampaignModal} style={NEW_CAMPAIGN_MODAL_CLOSE_BTN}>
                    <X size={18} strokeWidth={2} aria-hidden />
                  </button>
                </div>
                <DescribeCampaignPanel
                  key={describeSession}
                  apiKey={import.meta.env.VITE_OPENAI_API_KEY ?? ''}
                  genId={genId}
                  colorStartIndex={campaigns.length}
                  onBack={() => setNewCampaignModalStep('choices')}
                  onSuccess={camps => {
                    if (camps.length === 0) {
                      toast('Could not add campaign (empty result).');
                      return;
                    }
                    setCampaigns(prev => [...prev, ...camps]);
                    if (camps[0]) {
                      setSelected({ type: 'campaign', campaignId: camps[0].id });
                      setFocusListCampaignId(camps[0].id);
                    }
                    closeNewCampaignModal();
                    toast(`Added “${camps[0].name}” to your plan`);
                  }}
                />
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <h2
                      style={{
                        fontFamily: 'var(--font-family-display)',
                        fontSize: 18,
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--foreground)',
                        margin: '0 0 6px',
                      }}
                    >
                      Ny kampanje
                    </h2>
                    <p style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', margin: 0 }}>
                      Velg hvordan du vil opprette kampanjen.
                    </p>
                  </div>
                  <button type="button" aria-label="Lukk" onClick={closeNewCampaignModal} style={NEW_CAMPAIGN_MODAL_CLOSE_BTN}>
                    <X size={18} strokeWidth={2} aria-hidden />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => importCampaignFileRef.current?.click()}
                    style={newCampaignModalChoiceCard(WORKSPACE_ACTION_ACCENT)}
                  >
                    <div style={newCampaignModalIconWrap(WORKSPACE_ACTION_ACCENT)}>
                      <FileUp size={18} style={{ color: WORKSPACE_ACTION_ACCENT }} aria-hidden />
                    </div>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
                        Last opp
                      </span>
                      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', lineHeight: 1.35 }}>
                        .xls, .xml, .txt, .doc — importer fra fil
                      </span>
                    </span>
                  </button>
                  <button type="button" onClick={handleAddEmptyCampaignAndClose} style={newCampaignModalChoiceCard(WORKSPACE_ACTION_ACCENT)}>
                    <div style={newCampaignModalIconWrap(WORKSPACE_ACTION_ACCENT)}>
                      <FilePlus size={18} style={{ color: WORKSPACE_ACTION_ACCENT }} aria-hidden />
                    </div>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
                        Tom kampanje
                      </span>
                      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', lineHeight: 1.35 }}>
                        Blank kampanje uten ordrelinjer
                      </span>
                    </span>
                  </button>
                  <button type="button" onClick={() => setNewCampaignModalStep('copyPick')} style={newCampaignModalChoiceCard(WORKSPACE_ACTION_ACCENT)}>
                    <div style={newCampaignModalIconWrap(WORKSPACE_ACTION_ACCENT)}>
                      <Copy size={18} style={{ color: WORKSPACE_ACTION_ACCENT }} aria-hidden />
                    </div>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
                        Kopier eksisterende
                      </span>
                      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', lineHeight: 1.35 }}>
                        Dupliser en kampanje du allerede har
                      </span>
                    </span>
                  </button>
                  <button type="button" onClick={handleAddCampaignFromTemplate} style={newCampaignModalChoiceCard(WORKSPACE_ACTION_ACCENT)}>
                    <div style={newCampaignModalIconWrap(WORKSPACE_ACTION_ACCENT)}>
                      <LayoutTemplate size={18} style={{ color: WORKSPACE_ACTION_ACCENT }} aria-hidden />
                    </div>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
                        Bruk mal
                      </span>
                      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', lineHeight: 1.35 }}>
                        Start fra en innebygd struktur
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDescribeSession(s => s + 1);
                      setNewCampaignModalStep('describe');
                    }}
                    style={newCampaignModalChoiceCard(WORKSPACE_ACTION_ACCENT)}
                  >
                    <div style={newCampaignModalIconWrap(WORKSPACE_ACTION_ACCENT)}>
                      <MessageSquare size={18} style={{ color: WORKSPACE_ACTION_ACCENT }} aria-hidden />
                    </div>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
                        Beskriv kampanjen
                      </span>
                      <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-light)', color: 'var(--muted-foreground)', lineHeight: 1.35 }}>
                        Chat med KI — du kan lagre med lite eller mye informasjon; mangler du datoer, vises kampanjen ikke på tidslinjen før periode er satt.
                      </span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
});

OrderBuilder.displayName = 'OrderBuilder';