ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono text NOT NULL DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dni text NOT NULL DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz;
-- Preserve existing client contacts without declaring them verified.
UPDATE usuarios u SET telefono=CASE
 WHEN c.telefono ~ '^9[0-9]{8}$' THEN '+51'||c.telefono
 WHEN c.telefono ~ '^\+[1-9][0-9]{7,14}$' THEN c.telefono ELSE '' END,
 dni=CASE WHEN c.documento ~ '^[0-9]{8}$' THEN c.documento ELSE '' END
FROM clientes c WHERE u.cliente_id=c.id AND u.telefono='' AND u.dni='';
CREATE TABLE IF NOT EXISTS verificaciones (
 id uuid PRIMARY KEY, usuario_id uuid NOT NULL REFERENCES usuarios(id),
 proposito text NOT NULL CHECK(proposito IN ('email','phone','recovery')),
 destino text NOT NULL, codigo_hash text, proveedor_id text,
 intentos integer NOT NULL DEFAULT 0, expires_at timestamptz NOT NULL,
 consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verificaciones_usuario ON verificaciones(usuario_id,proposito,created_at DESC);
CREATE TABLE IF NOT EXISTS mensajes_contacto (
 id uuid PRIMARY KEY, nombre text NOT NULL, correo text NOT NULL, mensaje text NOT NULL,
 estado text NOT NULL DEFAULT 'new' CHECK(estado IN ('new','reviewed','closed')),
 privacy_accepted_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
