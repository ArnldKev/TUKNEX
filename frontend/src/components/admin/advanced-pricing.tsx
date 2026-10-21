'use client';
import { useState } from 'react';
import { DEFAULT_PRICES, estimateQuote, money, type ProjectType } from '@/lib/pricing';
const labels: Record<string, string> = {
  gallery: 'Galería',
  bookings: 'Reservas',
  login: 'Acceso de usuarios',
  admin: 'Panel administrativo',
  clients: 'Gestión de clientes',
  inventory: 'Inventario',
  reports: 'Reportes',
  notifications: 'Notificaciones',
  'feature-catalog': 'Catálogo adicional',
  'design-custom': 'Diseño personalizado',
  'design-premium': 'Diseño premium',
  'urgent-percent': 'Recargo por urgencia (%)',
  search: 'Búsqueda y filtros',
  variations: 'Variantes de producto',
  orders: 'Gestión de pedidos',
  'limit-landing': 'Límite Landing Esencial',
  'limit-business': 'Límite Web Negocio',
  'limit-catalog': 'Límite Catálogo Digital',
  'limit-system': 'Límite Sistema Básico',
  'limit-redesign': 'Límite Rediseño',
  'validity-days': 'Vigencia de propuesta (días)',
};
export function AdvancedPricingFields({
  draft,
  onChange,
}: {
  draft: Record<string, number>;
  onChange: (key: string, value: number) => void;
}) {
  const [type, setType] = useState<ProjectType>('landing');
  const estimate = estimateQuote(
    {
      projectType: type,
      features: type === 'system' ? ['information', 'login', 'clients'] : ['information', 'whatsapp'],
      design: 'essential',
      timeline: 'standard',
    },
    draft,
  );
  return (
    <details className="adm-advanced-pricing">
      <summary>
        Extras, límites y condiciones del cotizador <span>Configuración de demostración</span>
      </summary>
      <div className="adm-rules-grid">
        {Object.entries(labels).map(([key, label]) => (
          <label key={key}>
            {label}
            <div>
              <span>{key === 'urgent-percent' ? '%' : key === 'validity-days' ? 'Días' : 'S/'}</span>
              <input
                aria-label={label}
                type="number"
                required
                min={0}
                max={key === 'urgent-percent' ? 100 : key === 'validity-days' ? 365 : 100000}
                step={1}
                value={draft[key] ?? DEFAULT_PRICES[key] ?? 0}
                onChange={(e) => onChange(key, e.target.valueAsNumber || 0)}
              />
            </div>
          </label>
        ))}
      </div>
      <div className="adm-price-preview">
        <div>
          <strong>Prueba la configuración</strong>
          <span>Alcance esencial · Casos complejos requieren evaluación</span>
        </div>
        <select
          aria-label="Tipo de solución de prueba"
          value={type}
          onChange={(e) => setType(e.target.value as ProjectType)}
        >
          <option value="landing">Landing</option>
          <option value="business">Web Negocio</option>
          <option value="catalog">Catálogo</option>
          <option value="system">Sistema Básico</option>
          <option value="store">Tienda online</option>
        </select>
        <b>
          {estimate.custom ? 'Evaluación personalizada' : `${money(estimate.min)}–${money(estimate.max)}`}
        </b>
      </div>
    </details>
  );
}
