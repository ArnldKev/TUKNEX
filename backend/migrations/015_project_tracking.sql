CREATE TABLE proyecto_seguimiento (
 id uuid PRIMARY KEY, tipo text NOT NULL CHECK(tipo IN ('team','billing')),
 equipo_id uuid UNIQUE REFERENCES equipo_proyectos(id), proyecto_id uuid UNIQUE REFERENCES proyectos(id),
 datos jsonb NOT NULL, version integer NOT NULL CHECK(version>0), actualizado_por uuid NOT NULL REFERENCES usuarios(id),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((tipo='team' AND equipo_id IS NOT NULL AND proyecto_id IS NULL) OR (tipo='billing' AND proyecto_id IS NOT NULL AND equipo_id IS NULL))
);
CREATE TABLE proyecto_seguimiento_historial(id uuid PRIMARY KEY,seguimiento_id uuid NOT NULL REFERENCES proyecto_seguimiento(id),version integer NOT NULL,datos jsonb NOT NULL,autor_id uuid NOT NULL REFERENCES usuarios(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(seguimiento_id,version));
CREATE FUNCTION proteger_historial_proyecto() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'El historial de avance se conserva' USING ERRCODE='23514'; END $$;
CREATE TRIGGER historial_proyecto_inmutable BEFORE UPDATE OR DELETE ON proyecto_seguimiento_historial FOR EACH ROW EXECUTE FUNCTION proteger_historial_proyecto();
