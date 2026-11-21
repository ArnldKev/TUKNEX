'use client';

import { useEffect, useState, type ComponentType } from 'react';

type LoadMessages = {
  loading: string;
  error: string;
  loadingClassName?: string;
  errorClassName?: string;
  retryClassName?: string;
};

/** Optional quote panels keep a failed download local and retry the import itself. */
export function loadQuoteComponent<Props extends object>(
  load: () => Promise<ComponentType<Props>>,
  messages: LoadMessages,
): ComponentType<Props> {
  let loaded: ComponentType<Props> | null = null;
  let pending: Promise<ComponentType<Props>> | null = null;
  function request() {
    if (loaded) return Promise.resolve(loaded);
    pending ??= Promise.resolve().then(load).then(component => {
      loaded = component;
      return component;
    }).catch(error => {
      pending = null;
      throw error;
    });
    return pending;
  }

  return function QuoteComponent(props: Props) {
    const [Component, setComponent] = useState<ComponentType<Props> | null>(() => loaded);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
      let active = true;
      void request().then(component => {
        if (active) setComponent(() => component);
      }, () => {
        if (active) setFailed(true);
      });
      return () => { active = false; };
    }, [attempt]);

    if (Component) return <Component {...props} />;
    if (failed) return <div className={messages.errorClassName} role="alert">
      <p>{messages.error}</p>
      <button type="button" className={messages.retryClassName} onClick={() => {
        setFailed(false);
        setAttempt(value => value + 1);
      }}>Reintentar carga</button>
    </div>;
    return <p role="status" className={messages.loadingClassName}>{messages.loading}</p>;
  };
}
