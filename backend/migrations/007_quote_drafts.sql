-- Additive: existing requests, contracts, accounts and their documents are not rewritten.
CREATE TABLE cotizador_dispositivos (
 id uuid PRIMARY KEY,
 token_hash text UNIQUE NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cotizador_borradores (
 id uuid PRIMARY KEY,
 dispositivo_id uuid REFERENCES cotizador_dispositivos(id) ON DELETE SET NULL,
 usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
 version integer NOT NULL CHECK (version > 0),
 proyecto jsonb NOT NULL,
 paso integer NOT NULL CHECK (paso BETWEEN 0 AND 5),
 contenido_hash text NOT NULL,
 politica text NOT NULL,
 autorizado_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 CHECK (usuario_id IS NOT NULL OR dispositivo_id IS NOT NULL)
);
CREATE TABLE cotizador_revisiones (
 borrador_id uuid NOT NULL REFERENCES cotizador_borradores(id) ON DELETE CASCADE,
 version integer NOT NULL,
 proyecto jsonb NOT NULL,
 paso integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (borrador_id,version)
);
CREATE INDEX cotizador_borradores_usuario ON cotizador_borradores(usuario_id);
CREATE INDEX cotizador_borradores_dispositivo ON cotizador_borradores(dispositivo_id);
CREATE INDEX cotizador_borradores_actividad ON cotizador_borradores(updated_at DESC,id DESC);
CREATE INDEX cotizador_borradores_expiracion ON cotizador_borradores(expires_at);
CREATE INDEX cotizador_dispositivos_expiracion ON cotizador_dispositivos(expires_at);
