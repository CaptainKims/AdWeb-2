import { Calendar, Film, Layers, LucideIcon, Target, TrendingUp } from 'lucide-react';
import { CampaignItem, SelectedItem } from '../types';
import { resolveFlightColor, resolveOlColor } from '../colorUtils';

export interface ShelfMeta {
  accentColor: string;
  icon: LucideIcon;
  typeLabel: string;
  title: string;
  breadcrumb: string[];
}

export function deriveShelfMeta(selected: SelectedItem | null, campaigns: CampaignItem[]): ShelfMeta {
  const fb: ShelfMeta = { accentColor: 'var(--primary)', icon: Layers, typeLabel: '', title: '', breadcrumb: [] };
  if (!selected) return fb;

  const camp = 'campaignId' in selected ? campaigns.find(c => c.id === selected.campaignId) : null;
  if (!camp) return fb;
  const olIdx = 'orderLineId' in selected ? camp.orderLines.findIndex(o => o.id === selected.orderLineId) : -1;
  const ol = olIdx >= 0 ? camp.orderLines[olIdx] : null;
  const flightIdx = (ol && 'flightId' in selected) ? ol.flights.findIndex(f => f.id === selected.flightId) : -1;
  const fl = flightIdx >= 0 ? ol!.flights[flightIdx] : null;
  const resolvedOlColor = olIdx >= 0 ? resolveOlColor(camp, olIdx) : (ol?.color || camp.color);
  const resolvedFlColor = olIdx >= 0 && flightIdx >= 0 ? resolveFlightColor(camp, olIdx, flightIdx, ol!.flights.length) : 'var(--chart-3)';

  switch (selected.type) {
    case 'campaign':
      return { accentColor: camp.color, icon: Layers, typeLabel: 'Campaign', title: camp.name || 'Campaign', breadcrumb: [camp.name] };
    case 'order-line':
      return { accentColor: resolvedOlColor, icon: Calendar, typeLabel: 'Order Line', title: ol?.name || 'Order Line', breadcrumb: [camp.name, ol?.name || 'Order Line'] };
    case 'order-line-targeting':
      return { accentColor: 'var(--chart-2)', icon: Target, typeLabel: 'Targeting', title: 'Order Line Targeting', breadcrumb: [camp.name, ol?.name || 'Order Line', 'Targeting'] };
    case 'flight':
      return { accentColor: resolvedFlColor, icon: TrendingUp, typeLabel: 'Flight', title: fl?.name || 'Flight', breadcrumb: [camp.name, ol?.name || 'Order Line', fl?.name || 'Flight'] };
    case 'creative':
      return { accentColor: 'var(--muted-foreground)', icon: Film, typeLabel: 'Creative', title: fl?.creative?.name || 'Creative', breadcrumb: [camp.name, ol?.name || 'Order Line', fl?.name || 'Flight', 'Creative'] };
    default: return fb;
  }
}
