'use client';
import { useEffect, useState } from 'react';
import { billingBase } from './billing/api';
import { DEFAULT_PRICES, readPriceOverrides } from './pricing';

export function usePrices() {
  const [prices, setPrices] = useState({ ...DEFAULT_PRICES });
  useEffect(() => {
    const sync = () => {
      setPrices({ ...DEFAULT_PRICES, ...readPriceOverrides() });
      void fetch(billingBase + '/api/public/payment-options', { signal: AbortSignal.timeout(2000) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.prices) setPrices({ ...DEFAULT_PRICES, ...d.prices });
        })
        .catch(() => {});
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('tuknex-data', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('tuknex-data', sync);
    };
  }, []);
  return prices;
}
