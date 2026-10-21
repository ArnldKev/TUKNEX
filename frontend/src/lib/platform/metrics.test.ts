import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteChartPeriods } from './metrics';

test('weekly metrics include today and cross month boundaries in Lima time', () => {
  const chart = quoteChartPeriods(
    ['2026-10-31T23:30:00-05:00', '2026-11-01T08:00:00-05:00', '2026-10-20T12:00:00Z', 'invalid'],
    'week',
    new Date('2026-11-01T14:00:00Z'),
  );
  assert.equal(chart.periods.length, 7);
  assert.equal(chart.periods[5].count, 1);
  assert.equal(chart.periods[6].count, 1);
  assert.equal(
    chart.periods.reduce((sum, period) => sum + period.count, 0),
    2,
  );
});

test('monthly metrics exclude other years and months and normalize Lima dates', () => {
  const chart = quoteChartPeriods(
    ['2025-10-17T12:00:00Z', '2026-09-17T12:00:00Z', '2026-10-17T12:00:00Z', '2026-11-01T02:00:00Z'],
    'month',
    new Date('2026-10-17T14:00:00Z'),
  );
  assert.deepEqual(
    chart.periods.map((period) => period.count),
    [0, 0, 1, 1],
  );
});
