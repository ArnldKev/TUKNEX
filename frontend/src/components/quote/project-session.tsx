'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { RotateCcw, Undo2, Redo2 } from 'lucide-react';
import type { QuoteFormValues } from '@/lib/quote/form';
import {
  PROJECT_FIELDS, createProjectHistory, createQuoteProject, projectToForm, recordProjectForm,
  redoProject, restoreProjectStart, undoProject, acceptProjectSuggestion, acceptProjectSuggestionFromForm, type ProjectHistory, type ProjectChange, type ProjectField, type QuoteProject, type ProjectSuggestion,
} from '@/lib/quote/project';
import {acceptAudioAnswer,type AudioAnswer} from '@/lib/quote/audio';
import {travelProjectFromForm} from '@/lib/quote/project-actions';
import './project-session.css';

interface Session {
  history: ProjectHistory;
  noteTranscription: (field: string) => void;
  applyAudio: (answer: AudioAnswer) => boolean;
  acceptSuggestion: (suggestion: ProjectSuggestion) => boolean;
  error: string;
  undo: () => void;
  redo: () => void;
  restore: () => void;
  loadProject: (project: QuoteProject) => void;
  suggest: (change: ProjectChange, reason: string, evidenceFields: ProjectField[]) => void;
}
const ProjectContext = createContext<Session | null>(null);
const textFields = new Set(['businessName', 'offering', 'city', 'website', 'customers', 'salesProcess',
  'problem', 'otherFunctions', 'colorsLiked', 'colorsDisliked', 'firstImpression', 'references',
  'competitor', 'existingDomain', 'deadlineReason', 'launchDate', 'previewComment']);

export function QuoteProjectSession({ form, children, onRestore }: {
  form: UseFormReturn<QuoteFormValues>;
  children: ReactNode;
  onRestore: (message?: string) => void;
}) {
  const [history, setHistory] = useState(() => createProjectHistory(createQuoteProject(form.getValues())));
  const [error, setError] = useState('');
  const current = useRef(history), restoring = useRef(false), notify = useRef(onRestore);
  const pending = useRef<(() => void) | null>(null);
  const transcribed = useRef(new Set<string>());
  notify.current = onRestore;

  useEffect(() => {
    let active = true, queued = false, lastTyped = '', lastTypedAt = 0, groupNumber = 0;
    const fields = new Set<string>();
    let isTyping = true;
    const flush = () => {
      if (!queued || !active || restoring.current) return;
      queued = false;
      const changed = [...fields]; fields.clear();
      const dictated = changed.some(field => transcribed.current.has(field));
      for(const field of changed) transcribed.current.delete(field);
      const typing = !dictated && isTyping && changed.length === 1 && textFields.has(changed[0]);
      const now = Date.now();
      if (!typing || lastTyped !== changed[0] || now - lastTypedAt > 700) groupNumber++;
      const group = typing ? `typing:${changed[0]}:${groupNumber}` : null;
      lastTyped = typing ? changed[0] : ''; lastTypedAt = now; isTyping = true;
      try {
        const next = recordProjectForm(current.current, form.getValues(), {
          origin: dictated ? 'transcribed' : typing ? 'written' : changed.length ? 'selected' : 'imported', group,
        });
        current.current = next; setHistory(next); setError('');
      } catch {
        setError('Este cambio supera los límites del historial. Tus respuestas siguen en el formulario; revisa su longitud.');
      }
    };
    pending.current = flush;
    const subscription = form.watch((_values, change) => {
      if (restoring.current) return;
      const field = change.name?.split('.')[0];
      if (field && !PROJECT_FIELDS.includes(field as typeof PROJECT_FIELDS[number])) return;
      if (field) fields.add(field);
      if (change.type !== 'change') isTyping = false;
      if (!queued) { queued = true; queueMicrotask(flush); }
    });
    // Include URL prefills applied by the surrounding form's effect in one atomic change.
    queued = true; queueMicrotask(flush);
    return () => { active = false; subscription.unsubscribe(); pending.current = null; };
  }, [form]);

  function travel(action: typeof undoProject, message?: string) {
    pending.current?.();
    let next:ProjectHistory;
    try {next = travelProjectFromForm(current.current,form.getValues(),action);}
    catch {setError('Antes de recuperar un cambio, revisa la longitud de tus respuestas. Conservamos todo el texto actual.');return false;}
    if (next === current.current) return true;
    restoring.current = true;
    try {
      form.reset(projectToForm(next.present, form.getValues()), { keepDefaultValues: true });
      current.current = next; setHistory(next); setError('');
      notify.current(message);
    } finally { restoring.current = false; }
    return true;
  }

  function loadProject(project: QuoteProject) {
    pending.current?.();
    const next=createProjectHistory(project);
    restoring.current=true;
    try {
      form.reset(projectToForm(next.present,form.getValues()),{keepDefaultValues:true});
      current.current=next;setHistory(next);setError('');
      notify.current('Borrador recuperado. Los datos de contacto actuales se mantienen. El historial local empieza desde esta versión.');
    } finally {restoring.current=false;}
  }
  return <ProjectContext.Provider value={{ history, error, loadProject,
    noteTranscription: field => {if(PROJECT_FIELDS.includes(field as ProjectField))transcribed.current.add(field);},
    applyAudio: answer => {try {return travel(value=>acceptAudioAnswer(value,form.getValues(),answer),'Respuesta por audio incorporada. Puedes deshacerla.');}catch{return false;}},
    acceptSuggestion: suggestion => { try { return travel(value => acceptProjectSuggestionFromForm(value, form.getValues(), suggestion), 'Sugerencia de NEXI aplicada. Puedes deshacerla.'); } catch { setError('No se aplicó la sugerencia. Revisa las respuestas y su longitud; después solicita un análisis nuevo.'); return false; } },
    suggest: (change, reason, evidenceFields) => travel(history => acceptProjectSuggestion(history, {
      id: crypto.randomUUID(), projectId: history.present.id, baseRevision: history.present.revision,
      reason, evidenceFields, change,
    }), 'Idea visual de ejemplo aplicada. Puedes ajustarla o deshacerla.'),
    undo: () => travel(undoProject), redo: () => travel(redoProject), restore: () => travel(restoreProjectStart),
  }}>{children}</ProjectContext.Provider>;
}

export function useQuoteProjectSession() {
  const session = useContext(ProjectContext);
  if (!session) throw new Error('El proyecto necesita una sesión del cotizador.');
  return session;
}

export function QuoteProjectHistoryControls({ disabled = false }: { disabled?: boolean }) {
  const { history, error, undo, redo, restore } = useQuoteProjectSession();
  return <section className="quote-project-history" aria-label="Historial de tu idea">
    <div className="quote-project-history-heading"><strong>Tu idea, paso a paso</strong><span>Versión {history.present.revision + 1}</span></div>
    <p>Puedes deshacer tus cambios mientras esta página siga abierta.</p>
    <div className="quote-project-history-actions">
      <button type="button" onClick={undo} disabled={disabled || !history.past.length}><Undo2 size={16}/> Deshacer</button>
      <button type="button" onClick={redo} disabled={disabled || !history.future.length}><Redo2 size={16}/> Rehacer</button>
      <button type="button" onClick={restore} disabled={disabled || !history.past.length}><RotateCcw size={16}/> Volver al inicio</button>
    </div>
    {error && <p role="alert" className="quote-error">{error}</p>}
  </section>;
}
