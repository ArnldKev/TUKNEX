CREATE TABLE IF NOT EXISTS solicitudes_cotizacion (
 id uuid PRIMARY KEY,
 numero text UNIQUE NOT NULL,
 usuario_id uuid NOT NULL REFERENCES usuarios(id),
 cliente_id uuid NOT NULL REFERENCES clientes(id),
 clave_idempotencia uuid NOT NULL,
 entrada_hash text NOT NULL,
 respuestas jsonb NOT NULL,
 estimacion jsonb NOT NULL,
 estado text NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending','reviewing','quoted','closed')),
 pdf bytea NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (usuario_id,clave_idempotencia)
);
CREATE INDEX IF NOT EXISTS solicitudes_cliente ON solicitudes_cotizacion(cliente_id,created_at DESC);
