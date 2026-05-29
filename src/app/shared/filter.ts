import type { Campaign, CampaignStatus } from '@wf/shared-types';

export interface FilterState {
  statuses: Set<CampaignStatus>;
  regions: Set<string>;
  query: string;
  range?: { from: string; to: string };
}

export function emptyFilter(): FilterState {
  return { statuses: new Set(), regions: new Set(), query: '' };
}

export function applyFilter(items: Campaign[], f: FilterState): Campaign[] {
  const q = f.query.trim().toLowerCase();
  return items.filter((c) => {
    if (f.statuses.size > 0 && !f.statuses.has(c.status)) return false;
    if (f.regions.size > 0 && !c.regions.some((r) => f.regions.has(r))) return false;
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (f.range) {
      if (c.endDate < f.range.from) return false;
      if (c.startDate > f.range.to) return false;
    }
    return true;
  });
}
