import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CampaignStatus, ViewMeta } from '@wf/shared-types';
import { STATUS_COLOR } from '../shared/status-color';
import type { FilterState } from '../shared/filter';

@Component({
  selector: 'wf-filter-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <aside class="panel">
      <div class="search">
        <input
          type="search"
          placeholder="Search campaigns…"
          [ngModel]="filter().query"
          (ngModelChange)="onQuery($event)"
        />
      </div>

      <section>
        <h3>Status</h3>
        <div class="chips">
          @for (status of statuses(); track status) {
            <button
              type="button"
              class="chip"
              [class.active]="filter().statuses.has(status)"
              [style.--chip-color]="statusColor(status)"
              (click)="toggleStatus(status)"
            >
              <span class="dot"></span>{{ status }}
            </button>
          }
        </div>
      </section>

      <section>
        <h3>Categories</h3>
        <div class="chips">
          @for (region of regions(); track region) {
            <button
              type="button"
              class="chip neutral"
              [class.active]="filter().regions.has(region)"
              (click)="toggleRegion(region)"
            >
              {{ region }}
            </button>
          }
          @if (regions().length === 0) {
            <span class="empty">No categories loaded</span>
          }
        </div>
      </section>

      <section>
        <h3>Range</h3>
        <div class="range">
          <label>
            From
            <input type="date" [ngModel]="from()" (ngModelChange)="onRange($event, to())" />
          </label>
          <label>
            To
            <input type="date" [ngModel]="to()" (ngModelChange)="onRange(from(), $event)" />
          </label>
        </div>
      </section>

      <button type="button" class="reset" (click)="reset.emit()">Reset filters</button>
    </aside>
  `,
  styles: [
    `
      .panel {
        background: #fff;
        border: 1px solid #000;
        border-radius: 0;
        padding: 20px;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      h3 {
        margin: 0 0 10px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #000;
      }
      input[type='search'], input[type='date'] {
        width: 100%;
        padding: 8px 10px;
        font: inherit;
        font-size: 13px;
        border: 1px solid #000;
        border-radius: 0;
        background: #fff;
        box-sizing: border-box;
      }
      input[type='search']:focus, input[type='date']:focus {
        outline: none;
        border-color: #000;
        box-shadow: inset 0 -2px 0 #000;
      }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip {
        --chip-color: #888;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        border-radius: 0;
        border: 1px solid #000;
        background: #fff;
        color: #000;
        cursor: pointer;
      }
      .chip .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--chip-color);
      }
      .chip.active {
        background: #000;
        color: #fff;
        border-color: #000;
      }
      .chip.active .dot { background: var(--chip-color); }
      .chip.neutral.active { background: #000; color: #fff; border-color: #000; }
      .range { display: flex; flex-direction: column; gap: 10px; }
      .range label {
        display: flex;
        flex-direction: column;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #000;
        gap: 4px;
      }
      .reset {
        margin-top: 4px;
        padding: 10px 16px;
        border-radius: 0;
        border: 1px solid #000;
        background: #fff;
        color: #000;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        cursor: pointer;
        transition: background 120ms, color 120ms;
      }
      .reset:hover { background: #000; color: #fff; }
      .empty { color: var(--muted); font-size: 12px; font-style: italic; }
    `,
  ],
})
export class FilterPanelComponent {
  readonly filter = input.required<FilterState>();
  readonly meta = input<ViewMeta | null>(null);

  readonly statusChange = output<CampaignStatus>();
  readonly regionChange = output<string>();
  readonly queryChange = output<string>();
  readonly rangeChange = output<{ from?: string; to?: string }>();
  readonly reset = output<void>();

  readonly statuses = computed<CampaignStatus[]>(
    () =>
      this.meta()?.statusOptions ?? [
        'Not Started',
        'Planned',
        'Active',
        'Completed',
        'On Hold',
      ],
  );

  readonly regions = computed(() => this.meta()?.regions ?? []);
  readonly from = computed(() => this.filter().range?.from ?? '');
  readonly to = computed(() => this.filter().range?.to ?? '');

  statusColor(s: CampaignStatus): string {
    return STATUS_COLOR[s];
  }

  toggleStatus(s: CampaignStatus): void { this.statusChange.emit(s); }
  toggleRegion(r: string): void { this.regionChange.emit(r); }
  onQuery(q: string): void { this.queryChange.emit(q); }
  onRange(from: string, to: string): void {
    this.rangeChange.emit({ from: from || undefined, to: to || undefined });
  }
}
