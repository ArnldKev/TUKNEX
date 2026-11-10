CREATE TABLE cotizacion_versiones (
 cotizacion_id uuid NOT NULL REFERENCES cotizaciones(id), version integer NOT NULL CHECK(version>0),
 datos jsonb NOT NULL, legacy_snapshot boolean NOT NULL DEFAULT false, actor_id uuid REFERENCES usuarios(id), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(cotizacion_id,version)
);
INSERT INTO cotizacion_versiones(cotizacion_id,version,datos,legacy_snapshot) SELECT id,version,datos,true FROM cotizaciones;
CREATE TABLE cotizacion_respuestas (
 id uuid PRIMARY KEY,cotizacion_id uuid NOT NULL REFERENCES cotizaciones(id),version integer NOT NULL,
 usuario_id uuid NOT NULL REFERENCES usuarios(id),autor_nombre text NOT NULL,decision text NOT NULL CHECK(decision IN ('request_changes','decline','confirm_proposal')),
 comentario text NOT NULL, idempotency_key uuid NOT NULL,datos jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(cotizacion_id,version),UNIQUE(usuario_id,idempotency_key),
 FOREIGN KEY(cotizacion_id,version) REFERENCES cotizacion_versiones(cotizacion_id,version)
);
CREATE FUNCTION conservar_revision_cotizacion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'La revisión de cotización es inmutable' USING ERRCODE='23514';END $$;
CREATE TRIGGER cotizacion_version_inmutable BEFORE UPDATE OR DELETE ON cotizacion_versiones FOR EACH ROW EXECUTE FUNCTION conservar_revision_cotizacion();
CREATE TRIGGER cotizacion_respuesta_inmutable BEFORE UPDATE OR DELETE ON cotizacion_respuestas FOR EACH ROW EXECUTE FUNCTION conservar_revision_cotizacion();
