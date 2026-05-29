import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { scaleTime, type ScaleTime } from 'd3-scale';
import { timeFormat } from 'd3-time-format';
import { timeMonth, timeYear } from 'd3-time';
import type { Campaign } from '@wf/shared-types';
import { STATUS_COLOR } from '../shared/status-color';

interface BarLabels {
  showName: boolean;
  showStatus: boolean;
  showDates: boolean;
}

interface Bar {
  campaign: Campaign;
  x: number;
  width: number;
  y: number;
  color: string;
  labels: BarLabels;
  formattedRange: string;
}

interface GroupHeader {
  category: string;
  count: number;
  y: number;
  collapsed: boolean;
}

const ROW_HEIGHT = 38;
const BAR_HEIGHT = 26;
const ROW_PAD = 6;
const LEFT_GUTTER = 200;
const AXIS_HEIGHT = 40;
const GROUP_HEADER_HEIGHT = 30;
const MIN_WIDTH = 8;
const MIN_CANVAS_WIDTH = 900;

@Component({
  selector: 'wf-timeline-canvas',
  standalone: true,
  template: `
    <div class="wrap" #wrap>
      <svg
        [attr.width]="width()"
        [attr.height]="totalHeight()"
        (wheel)="onWheel($event)"
        (mousedown)="onPanStart($event)"
        role="img"
        aria-label="Campaign timeline"
      >
        <defs>
          <clipPath id="leftGutter">
            <rect x="0" y="0" [attr.width]="LEFT_GUTTER - 8" [attr.height]="totalHeight()" />
          </clipPath>
        </defs>
        <g class="axis">
          @for (tick of yearTicks(); track tick.date) {
            <line
              [attr.x1]="tick.x"
              [attr.x2]="tick.x"
              [attr.y1]="0"
              [attr.y2]="totalHeight()"
              class="year-grid"
            />
            <text [attr.x]="tick.x + 4" [attr.y]="16" class="year-label">{{ tick.label }}</text>
          }
          @for (tick of monthTicks(); track tick.date) {
            <line
              [attr.x1]="tick.x"
              [attr.x2]="tick.x"
              [attr.y1]="AXIS_HEIGHT"
              [attr.y2]="totalHeight()"
              class="month-grid"
            />
            <text [attr.x]="tick.x + 2" [attr.y]="34" class="month-label">{{ tick.label }}</text>
          }
          <line
            [attr.x1]="LEFT_GUTTER"
            [attr.x2]="width()"
            [attr.y1]="AXIS_HEIGHT"
            [attr.y2]="AXIS_HEIGHT"
            class="axis-line"
          />
        </g>

        <g class="group-headers">
          @for (group of groups(); track group.category) {
            <g class="group-header" (click)="toggleGroup(group.category)">
              <rect
                x="0"
                [attr.y]="group.y"
                [attr.width]="width()"
                [attr.height]="GROUP_HEADER_HEIGHT"
                class="group-bg"
              />
              <line
                x1="0"
                [attr.x2]="width()"
                [attr.y1]="group.y"
                [attr.y2]="group.y"
                class="group-top"
              />
              <foreignObject
                x="0"
                [attr.y]="group.y"
                [attr.width]="width()"
                [attr.height]="GROUP_HEADER_HEIGHT"
              >
                <div xmlns="http://www.w3.org/1999/xhtml" class="group-header-inner">
                  <span class="group-arrow-html">{{ group.collapsed ? '▶' : '▼' }}</span>
                  <span class="group-label-html">Categories: {{ group.category }}</span>
                  <span class="count-badge-html">{{ group.count }}</span>
                </div>
              </foreignObject>
            </g>
          }
        </g>

        <g class="rows">
          @for (bar of bars(); track bar.campaign.id; let i = $index) {
            <g
              class="row"
              (mouseenter)="hover.set(bar)"
              (mouseleave)="hover.set(null)"
              (click)="select.emit(bar.campaign)"
            >
              @if (i % 2 === 1) {
                <rect
                  x="0"
                  [attr.y]="bar.y - ROW_PAD"
                  [attr.width]="width()"
                  [attr.height]="ROW_HEIGHT"
                  class="row-bg"
                />
              }
              <text
                [attr.x]="8"
                [attr.y]="bar.y + BAR_HEIGHT * 0.7"
                class="row-label"
                clip-path="url(#leftGutter)"
              >
                {{ bar.campaign.name }}
              </text>
              <rect
                [attr.x]="bar.x"
                [attr.y]="bar.y"
                [attr.width]="bar.width"
                [attr.height]="BAR_HEIGHT"
                [attr.fill]="bar.color"
                rx="4"
                class="bar"
              />
              @if (bar.labels.showStatus) {
                <circle
                  [attr.cx]="bar.x + 10"
                  [attr.cy]="bar.y + BAR_HEIGHT / 2"
                  r="4"
                  class="bar-status-dot"
                />
              }
              @if (bar.labels.showName) {
                <text
                  [attr.x]="bar.x + (bar.labels.showStatus ? 20 : 8)"
                  [attr.y]="bar.y + BAR_HEIGHT * 0.6"
                  class="bar-name"
                >
                  {{ bar.campaign.name }}
                </text>
              }
              @if (bar.labels.showDates) {
                <text
                  [attr.x]="bar.x + bar.width - 6"
                  [attr.y]="bar.y + BAR_HEIGHT * 0.6"
                  class="bar-dates"
                  text-anchor="end"
                >
                  {{ bar.formattedRange }}
                </text>
              }
            </g>
          }
        </g>
      </svg>

      @if (hover(); as h) {
        <div class="tooltip" [style.left.px]="tooltipX()" [style.top.px]="tooltipY()">
          <div class="tt-name">{{ h.campaign.name }}</div>
          <div class="tt-meta">
            <span class="dot" [style.background]="h.color"></span>
            {{ h.campaign.status }}
          </div>
          <div class="tt-dates">{{ h.campaign.startDate }} → {{ h.campaign.endDate }}</div>
          @if (h.campaign.regions.length) {
            <div class="tt-regions">{{ h.campaign.regions.join(', ') }}</div>
          }
        </div>
      }

      @if (campaigns().length === 0) {
        <div class="empty">No campaigns match the current filters.</div>
      }
    </div>
  `,
  styles: [
    `
      .wrap {
        position: relative;
        user-select: none;
        overflow-x: auto;
        overflow-y: hidden;
        max-width: 100%;
      }
      svg { display: block; background: #fff; cursor: grab; }
      svg:active { cursor: grabbing; }
      .year-grid { stroke: #d1d5db; stroke-width: 1; }
      .month-grid { stroke: #f0f0f0; stroke-width: 1; }
      .axis-line { stroke: #9ca3af; stroke-width: 1; }
      .year-label { font-size: 12px; font-weight: 600; fill: #374151; }
      .month-label { font-size: 10px; fill: #6b7280; }
      .row-bg { fill: #fafafa; }
      .row-label {
        font-size: 12px;
        fill: var(--text);
        dominant-baseline: middle;
      }
      .group-bg {
        fill: #f3f4f6;
      }
      .group-top {
        stroke: #d1d5db;
        stroke-width: 1;
      }
      .group-header { cursor: pointer; }
      .group-header:hover .group-bg { fill: #e5e7eb; }
      .group-header-inner {
        display: flex;
        align-items: center;
        height: 100%;
        padding: 0 12px;
        gap: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        pointer-events: none;
      }
      .group-arrow-html {
        font-size: 10px;
        color: #4b5563;
        width: 12px;
        line-height: 1;
      }
      .group-label-html {
        font-size: 12px;
        font-weight: 600;
        color: #000;
        white-space: nowrap;
      }
      .count-badge-html {
        background: #1f2937;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 3px;
        line-height: 1.3;
        min-width: 16px;
        text-align: center;
      }
      .bar { cursor: pointer; transition: opacity 120ms, filter 120ms; }
      .row:hover .bar { filter: brightness(1.05); stroke: #111; stroke-width: 1; }
      .bar-status-dot {
        fill: #fff;
        opacity: 0.85;
        pointer-events: none;
      }
      .bar-name {
        font-size: 11px;
        font-weight: 500;
        fill: #fff;
        pointer-events: none;
      }
      .bar-dates {
        font-size: 10px;
        fill: rgba(255, 255, 255, 0.85);
        pointer-events: none;
      }
      .tooltip {
        position: absolute;
        background: #111;
        color: #fff;
        padding: 8px 10px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        max-width: 280px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      }
      .tt-name { font-weight: 600; margin-bottom: 4px; }
      .tt-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
      .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
      .tt-dates { opacity: 0.85; }
      .tt-regions { opacity: 0.7; margin-top: 4px; font-size: 11px; }
      .empty {
        position: absolute;
        inset: ${AXIS_HEIGHT}px 0 0 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--muted);
        font-style: italic;
      }
    `,
  ],
})
export class TimelineCanvasComponent {
  readonly campaigns = input.required<Campaign[]>();
  readonly select = output<Campaign>();

  @ViewChild('wrap', { static: true }) wrap!: ElementRef<HTMLDivElement>;

  readonly LEFT_GUTTER = LEFT_GUTTER;
  readonly AXIS_HEIGHT = AXIS_HEIGHT;
  readonly BAR_HEIGHT = BAR_HEIGHT;
  readonly ROW_PAD = ROW_PAD;
  readonly ROW_HEIGHT = ROW_HEIGHT;
  readonly GROUP_HEADER_HEIGHT = GROUP_HEADER_HEIGHT;
  readonly collapsedGroups = signal<Set<string>>(new Set());

  readonly width = signal(1200);
  readonly hover = signal<Bar | null>(null);

  private readonly domainOverride = signal<[Date, Date] | null>(null);

  private readonly dataDomain = computed<[Date, Date]>(() => {
    const items = this.campaigns();
    if (items.length === 0) {
      const now = new Date();
      return [new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear() + 1, 11, 31)];
    }
    const starts = items.map((c) => new Date(c.startDate).getTime());
    const ends = items.map((c) => new Date(c.endDate).getTime());
    const min = Math.min(...starts);
    const max = Math.max(...ends);
    const pad = (max - min) * 0.05 || 30 * 24 * 3600 * 1000;
    return [new Date(min - pad), new Date(max + pad)];
  });

  readonly scale = computed<ScaleTime<number, number>>(() => {
    return scaleTime()
      .domain(this.domainOverride() ?? this.dataDomain())
      .range([LEFT_GUTTER, this.width()]);
  });

  /**
   * Group the campaigns by Category (regions[0]) — same shape as the native
   * Workfront Planning timeline. Preserves the order in which categories
   * first appear, which matches the order coming from the BFF / Workfront API.
   */
  readonly layout = computed<{ groups: GroupHeader[]; bars: Bar[]; totalHeight: number }>(() => {
    const items = this.campaigns();
    const collapsed = this.collapsedGroups();
    const s = this.scale();
    const rangeFmt = timeFormat('%b %d');

    const byCategory = new Map<string, Campaign[]>();
    for (const c of items) {
      const cat = c.regions[0] ?? 'Uncategorized';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(c);
    }

    const groups: GroupHeader[] = [];
    const bars: Bar[] = [];
    let y = AXIS_HEIGHT;

    for (const [category, list] of byCategory) {
      const isCollapsed = collapsed.has(category);
      groups.push({ category, count: list.length, y, collapsed: isCollapsed });
      y += GROUP_HEADER_HEIGHT;

      if (!isCollapsed) {
        for (const c of list) {
          const start = new Date(c.startDate);
          const end = new Date(c.endDate);
          const x1 = s(start);
          const x2 = s(end);
          const width = Math.max(MIN_WIDTH, x2 - x1);
          bars.push({
            campaign: c,
            x: x1,
            width,
            y: y + ROW_PAD,
            color: STATUS_COLOR[c.status],
            labels: {
              showStatus: width > 20,
              showName: width > 90,
              showDates: width > 180,
            },
            formattedRange: `${rangeFmt(start)} → ${rangeFmt(end)}`,
          });
          y += ROW_HEIGHT;
        }
      }
    }

    return { groups, bars, totalHeight: y + 10 };
  });

  readonly groups = computed(() => this.layout().groups);
  readonly bars = computed(() => this.layout().bars);
  readonly totalHeight = computed(() => Math.max(this.layout().totalHeight, AXIS_HEIGHT + 60));

  toggleGroup(category: string): void {
    this.collapsedGroups.update((set) => {
      const next = new Set(set);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  }

  readonly yearTicks = computed(() => {
    const s = this.scale();
    const [d0, d1] = s.domain();
    const fmt = timeFormat('%Y');
    return timeYear.range(timeYear.floor(d0), d1).map((d) => ({
      date: d,
      x: s(d),
      label: fmt(d),
    }));
  });

  readonly monthTicks = computed(() => {
    const s = this.scale();
    const [d0, d1] = s.domain();
    const monthSpan = (d1.getTime() - d0.getTime()) / (1000 * 3600 * 24 * 30);
    if (monthSpan > 36) return [];
    const fmt = timeFormat('%b');
    return timeMonth.range(timeMonth.floor(d0), d1).map((d) => ({
      date: d,
      x: s(d),
      label: fmt(d),
    }));
  });

  readonly tooltipX = computed(() => {
    const h = this.hover();
    if (!h) return 0;
    return Math.min(h.x + h.width / 2, this.width() - 290);
  });
  readonly tooltipY = computed(() => (this.hover()?.y ?? 0) - 60);

  @HostListener('window:resize')
  onResize(): void {
    this.measureWidth();
  }

  ngOnInit(): void {
    queueMicrotask(() => this.measureWidth());
  }

  private measureWidth(): void {
    const w = this.wrap?.nativeElement?.clientWidth ?? 1200;
    this.width.set(Math.max(MIN_CANVAS_WIDTH, w));
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const s = this.scale();
    const [d0, d1] = s.domain();
    const focusDate = s.invert(event.offsetX);
    const factor = event.deltaY > 0 ? 1.15 : 1 / 1.15;
    const newD0 = new Date(focusDate.getTime() - (focusDate.getTime() - d0.getTime()) * factor);
    const newD1 = new Date(focusDate.getTime() + (d1.getTime() - focusDate.getTime()) * factor);
    this.domainOverride.set([newD0, newD1]);
  }

  private panStart: { x: number; d0: number; d1: number } | null = null;

  onPanStart(event: MouseEvent): void {
    const [d0, d1] = this.scale().domain();
    this.panStart = { x: event.clientX, d0: d0.getTime(), d1: d1.getTime() };
    const move = (e: MouseEvent) => this.onPanMove(e);
    const up = () => {
      this.panStart = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  private onPanMove(event: MouseEvent): void {
    if (!this.panStart) return;
    const dx = event.clientX - this.panStart.x;
    const s = scaleTime()
      .domain([new Date(this.panStart.d0), new Date(this.panStart.d1)])
      .range([LEFT_GUTTER, this.width()]);
    const span = this.panStart.d1 - this.panStart.d0;
    const pxSpan = this.width() - LEFT_GUTTER;
    const shiftMs = (-dx * span) / pxSpan;
    this.domainOverride.set([
      new Date(this.panStart.d0 + shiftMs),
      new Date(this.panStart.d1 + shiftMs),
    ]);
    void s;
  }
}
