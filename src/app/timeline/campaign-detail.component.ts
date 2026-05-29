import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Campaign, CampaignPatch, CampaignStatus, ViewMeta } from '@wf/shared-types';
import { STATUS_COLOR } from '../shared/status-color';
import { CampaignService } from '../core/campaign.service';

const STATUS_OPTIONS: CampaignStatus[] = [
  'Not Started',
  'Planned',
  'Active',
  'Completed',
  'On Hold',
];

@Component({
  selector: 'wf-campaign-detail',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (campaign(); as c) {
      <div class="backdrop" (click)="requestClose()"></div>
      <aside class="panel" role="dialog" aria-modal="true">
        <header>
          <span class="status-chip" [style.background]="statusColor()">{{ draft().status }}</span>
          <button type="button" class="close" aria-label="Close" (click)="requestClose()">×</button>
        </header>

        @if (editing()) {
          <label class="field">
            <span>Name</span>
            <input
              type="text"
              [ngModel]="nameInput()"
              (ngModelChange)="nameInput.set($event)"
            />
          </label>
        } @else {
          <h2>{{ c.name }}</h2>
        }

        <dl>
          <dt>Start</dt>
          <dd>
            @if (editing()) {
              <input
                type="date"
                [ngModel]="startInput()"
                (ngModelChange)="startInput.set($event)"
              />
            } @else {
              {{ formatDate(c.startDate) }}
            }
          </dd>

          <dt>End</dt>
          <dd>
            @if (editing()) {
              <input
                type="date"
                [ngModel]="endInput()"
                (ngModelChange)="endInput.set($event)"
              />
            } @else {
              {{ formatDate(c.endDate) }}
            }
          </dd>

          <dt>Duration</dt>
          <dd>{{ durationDays() }} days</dd>

          <dt>Status</dt>
          <dd>
            @if (editing()) {
              <select
                [ngModel]="statusInput()"
                (ngModelChange)="statusInput.set($event)"
              >
                @for (s of statusOptions; track s) {
                  <option [value]="s">{{ s }}</option>
                }
              </select>
            } @else {
              {{ c.status }}
            }
          </dd>

          <dt>Categories</dt>
          <dd>
            @if (editing()) {
              <div class="region-chips">
                @for (r of availableRegions(); track r) {
                  <button
                    type="button"
                    class="region-toggle"
                    [class.active]="regionsInput().has(r)"
                    (click)="toggleRegion(r)"
                  >
                    {{ r }}
                  </button>
                }
                @if (availableRegions().length === 0) {
                  <em class="muted">No region list loaded</em>
                }
              </div>
            } @else if (c.regions.length) {
              <div class="tags">
                @for (region of c.regions; track region) {
                  <span class="tag">{{ region }}</span>
                }
              </div>
            } @else {
              <em class="muted">—</em>
            }
          </dd>

          <dt>Record ID</dt>
          <dd class="mono">{{ c.id }}</dd>
        </dl>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <div class="actions">
          @if (editing()) {
            <button type="button" class="ghost" [disabled]="saving()" (click)="cancel()">
              Cancel
            </button>
            <button
              type="button"
              class="primary"
              [disabled]="saving() || !isDirty()"
              (click)="save()"
            >
              @if (saving()) {
                Saving…
              } @else {
                Save to Planning
              }
            </button>
          } @else {
            <a
              class="open"
              [href]="c.deepLink ?? '#'"
              [attr.target]="c.deepLink ? '_blank' : null"
              rel="noopener"
              [title]="c.deepLink ? 'Open this record in Workfront' : 'Demo button — connect a Workfront tenant to enable'"
              (click)="onOpenClick($event, c)"
            >
              Open in Workfront ↗
            </a>
            <button type="button" class="primary" (click)="startEdit()">Edit</button>
          }
        </div>
      </aside>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.25);
        z-index: 10;
        animation: fade 120ms ease-out;
      }
      .panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(480px, 92vw);
        background: #fff;
        border-left: 2px solid #000;
        box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12);
        padding: 20px 24px;
        z-index: 11;
        overflow-y: auto;
        animation: slide 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .status-chip {
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 0;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }
      .close {
        font-size: 24px;
        line-height: 1;
        background: none;
        border: none;
        color: #6b7280;
        padding: 4px 8px;
        cursor: pointer;
      }
      .close:hover { background: #f3f4f6; color: #000; }
      h2 { margin: 0 0 20px; font-size: 20px; line-height: 1.3; }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 20px;
      }
      .field > span {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #6b7280;
      }
      input[type='text'],
      input[type='date'],
      select {
        font: inherit;
        font-size: 14px;
        padding: 8px 10px;
        border: 1px solid #000;
        border-radius: 0;
        background: #fff;
        box-sizing: border-box;
        width: 100%;
        max-width: 240px;
      }
      input[type='text']:focus,
      input[type='date']:focus,
      select:focus {
        outline: none;
        box-shadow: inset 0 -2px 0 #000;
      }
      dl {
        display: grid;
        grid-template-columns: 110px 1fr;
        gap: 12px 16px;
        margin: 0 0 24px;
        align-items: start;
      }
      dt { color: #6b7280; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.8px; padding-top: 8px; }
      dd { margin: 0; color: #000; font-size: 14px; padding-top: 6px; }
      .mono { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 12px; color: #6b7280; }
      .tags, .region-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .tag {
        background: #f3f4f6;
        color: #000;
        padding: 3px 10px;
        border-radius: 0;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .region-toggle {
        padding: 4px 10px;
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
      .region-toggle.active { background: #000; color: #fff; }
      .muted { color: #6b7280; }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 12px;
      }
      .primary,
      .ghost,
      .open {
        padding: 10px 18px;
        border-radius: 0;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid #000;
        transition: background 120ms, color 120ms;
      }
      .primary { background: #000; color: #fff; }
      .primary:disabled { opacity: 0.4; cursor: not-allowed; }
      .ghost { background: #fff; color: #000; }
      .ghost:hover:not(:disabled) { background: #000; color: #fff; }
      .open { background: #fff; color: #000; display: inline-flex; align-items: center; }
      .open:hover { background: #000; color: #fff; }
      .error {
        background: #fee2e2;
        color: #991b1b;
        padding: 8px 12px;
        font-size: 12px;
        margin: 0 0 12px;
        border-left: 3px solid #991b1b;
      }
      @keyframes slide {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      @keyframes fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `,
  ],
  host: { '(document:keydown.escape)': 'requestClose()' },
})
export class CampaignDetailComponent {
  private readonly api = inject(CampaignService);

  readonly campaign = input<Campaign | null>(null);
  readonly meta = input<ViewMeta | null>(null);

  readonly close = output<void>();
  readonly saved = output<Campaign>();

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly statusOptions = STATUS_OPTIONS;

  // Form-state signals. Initialised whenever `campaign` changes (see effect).
  readonly nameInput = signal('');
  readonly startInput = signal('');
  readonly endInput = signal('');
  readonly statusInput = signal<CampaignStatus>('Not Started');
  readonly regionsInput = signal<Set<string>>(new Set());

  readonly draft = computed<Campaign>(() => {
    const c = this.campaign();
    if (!c) return { id: '', name: '', startDate: '', endDate: '', status: 'Not Started', regions: [] };
    if (!this.editing()) return c;
    return {
      ...c,
      name: this.nameInput(),
      startDate: this.startInput(),
      endDate: this.endInput(),
      status: this.statusInput(),
      regions: Array.from(this.regionsInput()),
    };
  });

  readonly statusColor = computed(() => STATUS_COLOR[this.draft().status]);

  readonly durationDays = computed(() => {
    const c = this.draft();
    if (!c.startDate || !c.endDate) return 0;
    const ms = new Date(c.endDate).getTime() - new Date(c.startDate).getTime();
    return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
  });

  readonly availableRegions = computed(() => {
    const m = this.meta();
    const current = this.campaign()?.regions ?? [];
    const merged = new Set<string>([...(m?.regions ?? []), ...current]);
    return Array.from(merged).sort();
  });

  readonly isDirty = computed(() => {
    const c = this.campaign();
    if (!c) return false;
    if (this.nameInput() !== c.name) return true;
    if (this.startInput() !== c.startDate) return true;
    if (this.endInput() !== c.endDate) return true;
    if (this.statusInput() !== c.status) return true;
    const current = this.regionsInput();
    const before = new Set(c.regions);
    if (current.size !== before.size) return true;
    for (const r of current) if (!before.has(r)) return true;
    return false;
  });

  constructor() {
    // Reset the form whenever a new campaign is opened.
    effect(() => {
      const c = this.campaign();
      this.editing.set(false);
      this.saving.set(false);
      this.error.set(null);
      if (c) this.resetFormFrom(c);
    });
  }

  private resetFormFrom(c: Campaign): void {
    this.nameInput.set(c.name);
    this.startInput.set(c.startDate);
    this.endInput.set(c.endDate);
    this.statusInput.set(c.status);
    this.regionsInput.set(new Set(c.regions));
  }

  startEdit(): void {
    const c = this.campaign();
    if (!c) return;
    this.resetFormFrom(c);
    this.editing.set(true);
    this.error.set(null);
  }

  cancel(): void {
    const c = this.campaign();
    if (c) this.resetFormFrom(c);
    this.editing.set(false);
    this.error.set(null);
  }

  toggleRegion(r: string): void {
    this.regionsInput.update((set) => {
      const next = new Set(set);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  }

  save(): void {
    const c = this.campaign();
    if (!c) return;
    const patch: CampaignPatch = {};
    if (this.nameInput() !== c.name) patch.name = this.nameInput().trim();
    if (this.startInput() !== c.startDate) patch.startDate = this.startInput();
    if (this.endInput() !== c.endDate) patch.endDate = this.endInput();
    if (this.statusInput() !== c.status) patch.status = this.statusInput();
    const before = new Set(c.regions);
    const after = this.regionsInput();
    const changed =
      before.size !== after.size ||
      [...after].some((r) => !before.has(r)) ||
      [...before].some((r) => !after.has(r));
    if (changed) patch.regions = Array.from(after);

    if (Object.keys(patch).length === 0) {
      this.editing.set(false);
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.api.updateCampaign(c.id, patch).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.editing.set(false);
        this.saved.emit(updated);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? err?.message ?? 'Failed to save changes.');
      },
    });
  }

  requestClose(): void {
    if (this.editing() && this.isDirty()) {
      const ok = window.confirm('Discard unsaved changes?');
      if (!ok) return;
    }
    this.close.emit();
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  onOpenClick(event: MouseEvent, campaign: Campaign): void {
    if (!campaign.deepLink) {
      event.preventDefault();
      console.info('[wf-widget] Open in Workfront — demo mode, no deep-link configured for', campaign.id);
    }
  }
}
