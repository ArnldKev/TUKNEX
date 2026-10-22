CREATE TABLE IF NOT EXISTS usuarios (
 id uuid PRIMARY KEY,
 nombre text NOT NULL,
 correo text UNIQUE NOT NULL CHECK (correo = lower(correo)),
 password_hash text NOT NULL,
 rol text NOT NULL CHECK (rol IN ('admin','client')),
 cliente_id uuid UNIQUE REFERENCES clientes(id),
 activo boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (rol <> 'client' OR cliente_id IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS sesiones (
 token_hash text PRIMARY KEY,
 usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS sesiones_expiracion ON sesiones(expires_at);
