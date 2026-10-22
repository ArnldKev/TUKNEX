CREATE TABLE IF NOT EXISTS opiniones (
 id uuid PRIMARY KEY,
 usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 tema text NOT NULL CHECK (tema IN ('application','service')),
 calificacion integer NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
 titulo text NOT NULL DEFAULT '' CHECK (char_length(titulo) <= 80),
 comentario text NOT NULL CHECK (char_length(comentario) BETWEEN 20 AND 1200),
 nombre_publico text NOT NULL CHECK (char_length(nombre_publico) BETWEEN 2 AND 50),
 consentimiento boolean NOT NULL DEFAULT false,
 estado text NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending','published','rejected')),
 nota_moderacion text NOT NULL DEFAULT '',
 respuesta text NOT NULL DEFAULT '',
 revision integer NOT NULL DEFAULT 1,
 moderado_por uuid REFERENCES usuarios(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(usuario_id,tema),
 CHECK (estado <> 'published' OR consentimiento)
);
CREATE INDEX IF NOT EXISTS opiniones_publicas ON opiniones(estado,updated_at DESC);
