import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, estimateDeliveryDate, addMonths, validDate, installmentStatus, toCents } from './finance';
import type { PlanInput } from './types';
const plan = (mode: PlanInput['mode'], rate: number, count = 3): PlanInput => ({
  mode,
  rate,
  count,
  firstDueDate: '2026-01-31',
});
test('financing applies one surcharge and reproduces the business examples exactly', () => {
  for (const [mode, rate, total] of [
    ['cash', 0, 25000],
    ['weekly', 8, 27000],
    ['fortnightly', 6, 26500],
    ['three', 5, 26250],
  ] as const) {
    const r = buildPlan(25000, plan(mode, rate));
    assert.equal(r.totalCents, total);
    assert.equal(
      r.installments.reduce((s, i) => s + i.amountCents, 0),
      total,
    );
  }
});
test('rounding leaves no lost or extra cents even for very small totals', () => {
  const r = buildPlan(100, plan('weekly', 0, 3));
  assert.deepEqual(
    r.installments.map((i) => i.amountCents),
    [33, 33, 34],
  );
  assert.deepEqual(
    buildPlan(25000, plan('three', 5)).installments.map((i) => i.amountCents),
    [10500, 7875, 7875],
  );
  assert.equal(toCents('262.50'), 26250);
});
test('fixed installments derive the count and the last installment settles the balance', () => {
  const r = buildPlan(25000, { ...plan('weekly', 8), fixedAmountCents: 5000 });
  assert.equal(r.installments.length, 6);
  assert.deepEqual(
    r.installments.map((i) => i.amountCents),
    [5000, 5000, 5000, 5000, 5000, 2000],
  );
});
test('monthly schedules preserve the original day across short months and leap years', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2026-01-31', 2), '2026-03-31');
  assert.equal(addMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(validDate('2026-02-30'), false);
  assert.deepEqual(
    buildPlan(30000, plan('monthly', 0)).installments.map((i) => i.date),
    ['2026-01-31', '2026-02-28', '2026-03-31'],
  );
});
test('custom and milestone schedules require exact totals and ordered valid dates', () => {
  assert.throws(
    () =>
      buildPlan(10000, {
        ...plan('custom', 0),
        custom: [{ label: 'A', date: '2026-01-31', amountCents: 9999 }],
      }),
    /exactamente/,
  );
  assert.throws(
    () =>
      buildPlan(10000, {
        ...plan('milestones', 0),
        custom: [
          { label: 'A', date: '2026-02-10', amountCents: 5000 },
          { label: 'B', date: '2026-02-01', amountCents: 5000 },
        ],
      }),
    /fechas/,
  );
  assert.equal(
    buildPlan(10000, {
      ...plan('milestones', 0),
      custom: [{ label: 'Entrega', date: '2026-02-01', amountCents: 10000 }],
    }).totalCents,
    10000,
  );
});
test('partial payments remain outstanding and dates determine overdue status in a bounded way', () => {
  assert.equal(installmentStatus(100, 50, '2026-10-10', '2026-10-18'), 'vencida');
  assert.equal(installmentStatus(100, 100, '2026-10-10', '2026-10-18'), 'pagada');
  assert.equal(installmentStatus(100, 50, '2026-10-18', '2026-10-18'), 'pendiente');
});
test('invalid amounts rates and schedules fail instead of creating invalid financial records', () => {
  for (const rate of [-1, 101, NaN, 1.001]) assert.throws(() => buildPlan(25000, plan('weekly', rate)));
  for (const n of [0, 121, 2.5]) assert.throws(() => buildPlan(25000, plan('weekly', 8, n)));
  assert.throws(() => buildPlan(-1, plan('cash', 0)));
  assert.throws(() => buildPlan(25000, { ...plan('half', 0), lastDueDate: '2026-01-01' }));
});

test('delivery estimates preserve business-day weekends and explicit quote terms', () => {
  assert.equal(estimateDeliveryDate('2026-10-16', '2 días hábiles desde materiales'), '2026-10-20');
  assert.equal(estimateDeliveryDate('2026-10-16', '2 semanas'), '2026-10-30');
  assert.equal(estimateDeliveryDate('2026-10-16', '15 a 20 días'), '2026-11-05');
  assert.equal(estimateDeliveryDate('2026-10-16', 'A coordinar'), '2026-11-15');
});
