-- Explicit access links: preserve original client/document identities.
CREATE TABLE cliente_cuenta_asociaciones (
 cliente_id uuid PRIMARY KEY REFERENCES clientes(id), usuario_id uuid NOT NULL REFERENCES usuarios(id),
 activo boolean NOT NULL DEFAULT true, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 creado_por uuid NOT NULL REFERENCES usuarios(id), actualizado_por uuid NOT NULL REFERENCES usuarios(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cliente_cuenta_asociaciones_usuario ON cliente_cuenta_asociaciones(usuario_id) WHERE activo;
CREATE TABLE cliente_asociacion_revisiones (
 id uuid PRIMARY KEY, cliente_id uuid NOT NULL REFERENCES clientes(id), usuario_id uuid NOT NULL REFERENCES usuarios(id),
 administrador_id uuid NOT NULL REFERENCES usuarios(id), accion text NOT NULL CHECK(accion IN ('link','unlink')),
 version integer NOT NULL CHECK(version>=0), huella text NOT NULL, resumen jsonb NOT NULL,
 expires_at timestamptz NOT NULL, confirmado_at timestamptz, motivo text
);
CREATE TABLE cliente_asociacion_historial (
 id uuid PRIMARY KEY, revision_id uuid NOT NULL UNIQUE REFERENCES cliente_asociacion_revisiones(id),
 cliente_id uuid NOT NULL REFERENCES clientes(id), usuario_id uuid NOT NULL REFERENCES usuarios(id),
 administrador_id uuid NOT NULL REFERENCES usuarios(id), accion text NOT NULL CHECK(accion IN ('link','unlink')),
 revision integer NOT NULL CHECK(revision>0), motivo text NOT NULL, resumen jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION proteger_historial_asociacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'El historial de asociaciones es inmutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER historial_asociacion_inmutable BEFORE UPDATE OR DELETE ON cliente_asociacion_historial FOR EACH ROW EXECUTE FUNCTION proteger_historial_asociacion();
