'use client';

import { useEffect, useRef, useState } from 'react';
import { listNexiReports, type NexiReportHistory, type NexiReportSource, type SavedNexiReport } from '@/lib/quote/nexi-reports';

type HistoryState = { key: string; data: NexiReportHistory | null; loading: boolean; error: string };

export function useSavedNexiReports(source: NexiReportSource | undefined) {
  const kind = source?.kind;
  const id = source?.id;
  const revision = source?.revision;
  const key = source ? source.kind + ':' + source.id + ':' + source.revision : '';
  const [state, setState] = useState<HistoryState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sequence = useRef(0);

  function refresh() {
    sequence.current++;
    setAttempt(value => value + 1);
  }

  function remember(report: SavedNexiReport) {
    sequence.current++;
    setState(previous => ({
      key,
      data: {
        sourceRevision: report.sourceRevision,
        reports: [report, ...(previous?.key === key ? previous.data?.reports ?? [] : []).filter(item => item.id !== report.id)].slice(0, 50),
      },
      loading: false,
      error: '',
    }));
  }

  useEffect(() => {
    if (!kind || !id || revision === undefined) return;
    const captured = ++sequence.current;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;

    setState(previous => ({ key, data: previous?.key === key ? previous.data : null, loading: true, error: '' }));
    void listNexiReports({ kind, id, revision }, controller.signal)
      .then(data => {
        if (active && captured === sequence.current) setState({ key, data, loading: false, error: '' });
      })
      .catch(error => {
        if (!active || captured !== sequence.current) return;
        setState({
          key, data: null, loading: false,
          error: controller.signal.aborted ? 'No recibimos el historial a tiempo. Puedes reintentar.'
            : error instanceof Error ? error.message : 'No se pudo cargar el historial.',
        });
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [key, kind, id, revision, attempt]);

  const current = state?.key === key ? state : null;
  return { data: current?.data ?? null, loading: Boolean(key && (current?.loading ?? true)), error: current?.error ?? '', refresh, remember };
}
