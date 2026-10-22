import { paymentModes, type PlanInput, type PlanResult, type ScheduleItem } from './types';
export function todayLima(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find((p) => p.type === type)?.value;
  return value('year') + '-' + value('month') + '-' + value('day');
}
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + 'T12:00:00Z')) &&
    new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value
  );
}
export function addDays(value: string, days: number): string {
  const d = new Date(value + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function estimateDeliveryDate(start: string, text: string): string {
  const period = text.match(/(\d{1,3})\s*(d[ií]as?|semanas?|mes(?:es)?)/i);
  if (!period) return addDays(start, 30);
  const count = Math.max(
    1,
    Math.min(1095, Number(period[1]) * (/semana/i.test(period[2]) ? 7 : /mes/i.test(period[2]) ? 30 : 1)),
  );
  if (!/h[aá]bil|laborable/i.test(text) || !/^d/i.test(period[2])) return addDays(start, count);
  let date = start,
    remaining = count;
  while (remaining) {
    date = addDays(date, 1);
    const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining--;
  }
  return date;
}
export function addMonths(value: string, months: number): string {
  const source = new Date(value + 'T12:00:00Z'),
    day = source.getUTCDate();
  const target = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1, 12));
  const end = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, end));
  return target.toISOString().slice(0, 10);
}
export function toCents(value: number | string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10000000) throw new Error('Importe no válido.');
  return Math.round((n + Number.EPSILON) * 100);
}
export function amount(cents: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
export function buildPlan(baseCents: number, plan: PlanInput): PlanResult {
  if (!Number.isSafeInteger(baseCents) || baseCents <= 0 || baseCents > 1000000000)
    throw new Error('El monto base debe ser positivo y válido.');
  if (
    !Object.hasOwn(paymentModes, plan.mode) ||
    !Number.isFinite(plan.rate) ||
    plan.rate < 0 ||
    plan.rate > 100 ||
    Math.abs(plan.rate * 100 - Math.round(plan.rate * 100)) > 0.0001
  )
    throw new Error('El recargo debe estar entre 0 y 100%, con hasta dos decimales.');
  if (!validDate(plan.firstDueDate)) throw new Error('Indica una primera fecha válida.');
  const bps = Math.round(plan.rate * 100);
  const feeCents = Number((BigInt(baseCents) * BigInt(bps) + BigInt(5000)) / BigInt(10000)),
    totalCents = baseCents + feeCents;
  let count = plan.mode === 'cash' ? 1 : plan.mode === 'half' ? 2 : plan.mode === 'three' ? 3 : plan.count;
  let weights = plan.mode === 'half' ? [50, 50] : plan.mode === 'three' ? [40, 30, 30] : null;
  let installments: ScheduleItem[];
  if (plan.mode === 'custom' || plan.mode === 'milestones') {
    if (!plan.custom?.length || plan.custom.length > 120)
      throw new Error('Define entre 1 y 120 cuotas o hitos.');
    installments = plan.custom.map((item, i) => ({ number: i + 1, ...item }));
    if (
      installments.some(
        (i, n) =>
          !validDate(i.date) ||
          !Number.isSafeInteger(i.amountCents) ||
          i.amountCents <= 0 ||
          !i.label.trim() ||
          (n > 0 && i.date < installments[n - 1].date),
      )
    )
      throw new Error('Revisa los importes, nombres y fechas ordenadas del plan.');
    if (installments.reduce((sum, i) => sum + i.amountCents, 0) !== totalCents)
      throw new Error('Las cuotas deben sumar exactamente el monto final.');
  } else {
    if (plan.fixedAmountCents !== undefined && ['daily', 'weekly', 'fortnightly', 'monthly'].includes(plan.mode)) {
      if (!Number.isSafeInteger(plan.fixedAmountCents) || plan.fixedAmountCents <= 0)
        throw new Error('La cuota fija debe ser positiva.');
      count = Math.ceil(totalCents / plan.fixedAmountCents);
      weights = null;
    }
    if (!Number.isInteger(count) || count < 1 || count > 120 || count > totalCents)
      throw new Error('Elige entre 1 y 120 cuotas con importe positivo.');
    let remaining = totalCents;
    installments = Array.from({ length: count }, (_, i) => {
      const amountCents =
        i === count - 1
          ? remaining
          : weights
            ? Math.floor((totalCents * weights[i]) / 100)
            : plan.fixedAmountCents && ['daily', 'weekly', 'fortnightly', 'monthly'].includes(plan.mode)
              ? Math.min(plan.fixedAmountCents, remaining)
              : Math.floor(totalCents / count);
      remaining -= amountCents;
      const date =
        plan.mode === 'monthly'
          ? addMonths(plan.firstDueDate, i)
          : addDays(
              plan.firstDueDate,
              i * (plan.mode === 'daily' ? 1 : plan.mode === 'weekly' ? 7 : plan.mode === 'fortnightly' ? 15 : 15),
            );
      return {
        number: i + 1,
        label: plan.mode === 'cash' ? 'Pago único' : 'Cuota ' + (i + 1),
        date: plan.lastDueDate && i === count - 1 ? plan.lastDueDate : date,
        amountCents,
      };
    });
    if (
      installments.some(
        (r, i) => r.amountCents <= 0 || !validDate(r.date) || (i > 0 && r.date < installments[i - 1].date),
      )
    )
      throw new Error('La fecha final debe ser posterior a las cuotas anteriores.');
  }
  return { baseCents, feeCents, totalCents, installments };
}
export function installmentStatus(
  amountCents: number,
  paidCents: number,
  due: string,
  today = todayLima(),
): 'pendiente' | 'pagada' | 'vencida' {
  return paidCents >= amountCents ? 'pagada' : due < today ? 'vencida' : 'pendiente';
}
