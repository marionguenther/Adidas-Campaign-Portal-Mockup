import { Component, computed, inject, signal } from '@angular/core';
import type { Campaign, CampaignStatus, ViewMeta } from '@wf/shared-types';
import { CampaignService } from '../core/campaign.service';
import { TimelineCanvasComponent } from './timeline-canvas.component';
import { FilterPanelComponent } from './filter-panel.component';
import { CampaignDetailComponent } from './campaign-detail.component';
import { applyFilter, emptyFilter, type FilterState } from '../shared/filter';

@Component({
  selector: 'wf-timeline',
  standalone: true,
  imports: [TimelineCanvasComponent, FilterPanelComponent, CampaignDetailComponent],
  template: `
    <div class="layout">
      <wf-filter-panel
        [filter]="filter()"
        [meta]="meta()"
        (statusChange)="toggleStatus($event)"
        (regionChange)="toggleRegion($event)"
        (queryChange)="setQuery($event)"
        (rangeChange)="setRange($event)"
        (reset)="resetFilters()"
      />
      <div class="main">
        <div class="header">
          <h2>Campaign Portal</h2>
          <span class="count">{{ filtered().length }} of {{ campaigns().length }}</span>
        </div>
        @if (loading()) {
          <div class="state">Loading…</div>
        } @else if (error()) {
          <div class="state error">{{ error() }}</div>
        } @else {
          <wf-timeline-canvas [campaigns]="filtered()" (select)="onSelect($event)" />
        }
      </div>
    </div>
    <wf-campaign-detail
      [campaign]="selected()"
      [meta]="meta()"
      (close)="selected.set(null)"
      (saved)="onCampaignSaved($event)"
    />
  `,
  styles: [
    `
      .layout {
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
        gap: 32px;
        align-items: start;
      }
      .main {
        background: #fff;
        border: 1px solid #000;
        border-radius: 0;
        overflow: hidden;
        min-width: 0;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 20px;
        border-bottom: 1px solid #000;
        background: #fff;
      }
      h2 {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #000;
      }
      .count {
        color: #6b7280;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .state { padding: 40px; text-align: center; color: var(--muted); }
      .state.error { color: #c0392b; }
    `,
  ],
})
export class TimelineComponent {
  private readonly api = inject(CampaignService);

  readonly campaigns = signal<Campaign[]>([]);
  readonly meta = signal<ViewMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<FilterState>(emptyFilter());
  readonly selected = signal<Campaign | null>(null);

  readonly filtered = computed(() => applyFilter(this.campaigns(), this.filter()));

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.getViewMeta().subscribe({
      next: (m) => this.meta.set(m),
      error: () => undefined,
    });
    this.api.getCampaigns().subscribe({
      next: (data) => {
        this.campaigns.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to load campaigns');
        this.loading.set(false);
      },
    });
  }

  toggleStatus(s: CampaignStatus): void {
    this.filter.update((f) => {
      const next = new Set(f.statuses);
      next.has(s) ? next.delete(s) : next.add(s);
      return { ...f, statuses: next };
    });
  }

  toggleRegion(r: string): void {
    this.filter.update((f) => {
      const next = new Set(f.regions);
      next.has(r) ? next.delete(r) : next.add(r);
      return { ...f, regions: next };
    });
  }

  setQuery(q: string): void {
    this.filter.update((f) => ({ ...f, query: q }));
  }

  setRange(range: { from?: string; to?: string }): void {
    this.filter.update((f) => {
      if (!range.from && !range.to) {
        const { range: _drop, ...rest } = f;
        return { ...rest };
      }
      return {
        ...f,
        range: { from: range.from ?? '1900-01-01', to: range.to ?? '2999-12-31' },
      };
    });
  }

  resetFilters(): void {
    this.filter.set(emptyFilter());
  }

  onSelect(c: Campaign): void {
    this.selected.set(c);
  }

  onCampaignSaved(updated: Campaign): void {
    this.campaigns.update((list) =>
      list.map((c) => (c.id === updated.id ? updated : c)),
    );
    this.selected.set(updated);
  }
}
