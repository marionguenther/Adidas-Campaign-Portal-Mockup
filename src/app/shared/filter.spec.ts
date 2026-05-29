import type { Campaign } from '@wf/shared-types';
import { applyFilter, emptyFilter } from './filter';

const sample: Campaign[] = [
  {
    id: '1',
    name: 'Alpha Launch',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    status: 'Active',
    regions: ['EMEA North'],
  },
  {
    id: '2',
    name: 'Beta Trial',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    status: 'Planned',
    regions: ['APAC'],
  },
];

describe('applyFilter', () => {
  it('returns all on empty filter', () => {
    expect(applyFilter(sample, emptyFilter()).length).toBe(2);
  });

  it('filters by status (OR within set)', () => {
    const f = emptyFilter();
    f.statuses.add('Active');
    expect(applyFilter(sample, f).map((c) => c.id)).toEqual(['1']);
  });

  it('combines status AND region', () => {
    const f = emptyFilter();
    f.statuses.add('Active');
    f.regions.add('APAC');
    expect(applyFilter(sample, f).length).toBe(0);
  });

  it('filters by query string', () => {
    const f = emptyFilter();
    f.query = 'beta';
    expect(applyFilter(sample, f).map((c) => c.id)).toEqual(['2']);
  });

  it('filters by date range (overlap)', () => {
    const f = emptyFilter();
    f.range = { from: '2026-05-01', to: '2026-12-31' };
    expect(applyFilter(sample, f).map((c) => c.id)).toEqual(['2']);
  });
});
