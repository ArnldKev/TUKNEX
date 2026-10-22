'use client';
import { buildPlan, amount, addDays } from '@/lib/billing/finance';
import { paymentModes, type PlanInput, type PaymentMode } from '@/lib/billing/types';
export function PaymentPlanFields({
  baseCents,
  plan,
  onChange,
  rates,
}: {
  baseCents: number;
  plan: PlanInput;
  onChange: (value: PlanInput) => void;
  rates: Record<PaymentMode, number>;
}) {
  let total = 0,
    error = '';
  let schedule: ReturnType<typeof buildPlan>['installments'] = [];
  try {
    const preview = buildPlan(baseCents, plan);
    total = preview.totalCents;
    schedule = preview.installments;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Revisa el plan.';
  }
  const custom = ['custom', 'milestones'].includes(plan.mode),
    periodic = ['daily', 'weekly', 'fortnightly', 'monthly'].includes(plan.mode);
  return (
    <fieldset className="billing-plan">
      <legend>Precio y plan de pago</legend>
      <div className="billing-form-grid">
        <label>
          Modalidad
          <select
            value={plan.mode}
            onChange={(e) => {
              const mode = e.target.value as PaymentMode;
              onChange({
                mode,
                rate: rates[mode],
                count: mode === 'half' ? 2 : mode === 'three' ? 3 : 4,
                firstDueDate: plan.firstDueDate,
                ...(['custom', 'milestones'].includes(mode)
                  ? { custom: [{ label: 'Primer hito', date: plan.firstDueDate, amountCents: baseCents }] }
                  : {}),
              });
            }}
          >
            {Object.entries(paymentModes).map(([id, item]) => (
              <option key={id} value={id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recargo único (%)
          <input
            type="number"
            min="0"
            max="100"
            step=".01"
            value={plan.rate}
            onChange={(e) => onChange({ ...plan, rate: Number(e.target.value) })}
          />
          <small>No se capitaliza ni se aplica por cuota.</small>
        </label>
        <label>
          Primer vencimiento
          <input
            type="date"
            required
            value={plan.firstDueDate}
            onChange={(e) => onChange({ ...plan, firstDueDate: e.target.value })}
          />
        </label>
        {periodic && (
          <>
            <label>
              Número de cuotas
              <input
                type="number"
                min="1"
                max="120"
                value={plan.count}
                disabled={!!plan.fixedAmountCents}
                onChange={(e) => onChange({ ...plan, count: Number(e.target.value) })}
              />
            </label>
            <label>
              Cuota fija opcional (S/)
              <input
                type="number"
                min=".01"
                step=".01"
                value={plan.fixedAmountCents ? plan.fixedAmountCents / 100 : ''}
                placeholder="Se calcula con el número de cuotas"
                onChange={(e) =>
                  onChange({
                    ...plan,
                    fixedAmountCents: e.target.value ? Math.round(Number(e.target.value) * 100) : undefined,
                  })
                }
              />
              <small>Si la defines, calculamos la cantidad; la última cuota cubre el resto.</small>
            </label>
          </>
        )}
        {['half', 'three'].includes(plan.mode) && (
          <label>
            Último vencimiento (opcional)
            <input
              type="date"
              min={plan.firstDueDate}
              value={plan.lastDueDate || ''}
              onChange={(e) => onChange({ ...plan, lastDueDate: e.target.value || undefined })}
            />
            <small>Las cuotas intermedias se separan por 15 días.</small>
          </label>
        )}
      </div>
      {custom && (
        <div className="billing-custom-plan">
          {plan.custom?.map((row, i) => (
            <div className="billing-custom-row" key={i}>
              <label>
                Hito / cuota
                <input
                  aria-label={'Concepto cuota ' + (i + 1)}
                  value={row.label}
                  maxLength={160}
                  onChange={(e) =>
                    onChange({
                      ...plan,
                      custom: plan.custom?.map((v, n) => (n === i ? { ...v, label: e.target.value } : v)),
                    })
                  }
                />
              </label>
              <label>
                Vencimiento
                <input
                  aria-label={'Vencimiento cuota ' + (i + 1)}
                  type="date"
                  value={row.date}
                  onChange={(e) =>
                    onChange({
                      ...plan,
                      custom: plan.custom?.map((v, n) => (n === i ? { ...v, date: e.target.value } : v)),
                    })
                  }
                />
              </label>
              <label>
                Importe (S/)
                <input
                  aria-label={'Importe cuota ' + (i + 1)}
                  type="number"
                  min=".01"
                  step=".01"
                  value={row.amountCents / 100}
                  onChange={(e) =>
                    onChange({
                      ...plan,
                      custom: plan.custom?.map((v, n) =>
                        n === i ? { ...v, amountCents: Math.round(Number(e.target.value) * 100) } : v,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="platform-secondary"
                aria-label={'Eliminar cuota ' + (i + 1)}
                onClick={() => onChange({ ...plan, custom: plan.custom?.filter((_, n) => n !== i) })}
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            type="button"
            className="platform-secondary"
            onClick={() =>
              onChange({
                ...plan,
                custom: [
                  ...(plan.custom || []),
                  {
                    label: 'Cuota ' + ((plan.custom?.length || 0) + 1),
                    date: addDays(plan.custom?.at(-1)?.date || plan.firstDueDate, 15),
                    amountCents: 100,
                  },
                ],
              })
            }
          >
            Añadir cuota / hito
          </button>
        </div>
      )}
      {error ? (
        <p role="alert" className="billing-error">
          {error}
        </p>
      ) : (
        <>
          <div className="billing-plan-totals">
            <span>
              Base<strong>{amount(baseCents)}</strong>
            </span>
            <span>
              Financiamiento<strong>{amount(total - baseCents)}</strong>
            </span>
            <span>
              Total<strong>{amount(total)}</strong>
            </span>
          </div>
          <div className="billing-schedule-preview">
            <strong>
              {schedule.length} {schedule.length === 1 ? 'pago' : 'cuotas'}
            </strong>
            <ol>
              {schedule.map((row) => (
                <li key={row.number}>
                  <span>
                    {row.label} · {row.date}
                  </span>
                  <b>{amount(row.amountCents)}</b>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </fieldset>
  );
}
