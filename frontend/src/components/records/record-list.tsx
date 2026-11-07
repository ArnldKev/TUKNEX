'use client';
import { useId, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import './records.css';

function normalized(value: string) { return value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
export function RecordList<T>({ items, getKey, getSearchText, renderItem, searchLabel = 'Buscar registros', emptyMessage = 'Aún no hay registros.', pageSize = 20 }: {
  items: readonly T[];
  getKey: (item: T) => string;
  getSearchText: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  searchLabel?: string;
  emptyMessage?: string;
  pageSize?: number;
}) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const size = Math.max(1, pageSize);
  const filtered = items.filter(item => normalized(getSearchText(item)).includes(normalized(query.trim())));
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const visible = filtered.slice(start, start + size);
  return <div className="records-list">
    <div className="records-list-tools">
      <div className="records-list-search"><label htmlFor={inputId}>{searchLabel}</label><span><Search size={17} aria-hidden="true"/><input id={inputId} type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/>{query && <button type="button" aria-label={'Limpiar ' + searchLabel.toLowerCase()} onClick={() => { setQuery(''); setPage(1); document.getElementById(inputId)?.focus(); }}><X size={17}/></button>}</span></div>
      <p role="status">{filtered.length ? `${start + 1}–${Math.min(start + size, filtered.length)} de ${filtered.length} registros` : '0 registros'}{query && ' encontrados'}</p>
    </div>
    <ul className="records-list-items">{visible.map(item => <li key={getKey(item)}>{renderItem(item)}</li>)}</ul>
    {!visible.length && <p className="records-list-empty">{query ? 'No hay resultados. Prueba con otra búsqueda.' : emptyMessage}</p>}
    {pages > 1 && <nav className="records-pagination" aria-label="Páginas de registros">
      <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={17} aria-hidden="true"/>Anterior</button>
      <span>Página {current} de {pages}</span>
      <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Siguiente<ChevronRight size={17} aria-hidden="true"/></button>
    </nav>}
  </div>;
}
