import type { CampaignStatus } from '@wf/shared-types';

export const STATUS_COLOR: Record<CampaignStatus, string> = {
  'Not Started': 'var(--status-not-started)',
  Planned: 'var(--status-planned)',
  Active: 'var(--status-active)',
  Completed: 'var(--status-completed)',
  'On Hold': 'var(--status-on-hold)',
};
