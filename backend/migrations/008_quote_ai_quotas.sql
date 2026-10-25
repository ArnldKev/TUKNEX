-- Usage counters only: no project text, raw IP, account ID or model response.
CREATE TABLE IF NOT EXISTS cotizador_ia_cuotas (
 scope text NOT NULL,
 window_start timestamptz NOT NULL,
 hits integer NOT NULL CHECK(hits>0),
 PRIMARY KEY(scope,window_start)
);
CREATE INDEX IF NOT EXISTS cotizador_ia_cuotas_window ON cotizador_ia_cuotas(window_start);
