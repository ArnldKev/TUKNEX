-- No cambia roles existentes. Si hay varios administradores, conciliarlos de forma privada antes de migrar.
DO $$ BEGIN
 IF (SELECT count(*) FROM usuarios WHERE rol='admin') > 1 THEN
  RAISE EXCEPTION 'Hay varios administradores. Conserva un titular y concilia las otras cuentas antes de aplicar 009_team.';
 END IF;
END $$;
ALTER TABLE usuarios DROP CONSTRAINT usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin','client','subadmin'));
CREATE UNIQUE INDEX usuarios_un_administrador ON usuarios (rol) WHERE rol='admin';
CREATE TABLE equipo_proyectos (
 id uuid PRIMARY KEY, solicitud_id uuid UNIQUE REFERENCES solicitudes_cotizacion(id),
 cliente_id uuid NOT NULL REFERENCES clientes(id), titulo text NOT NULL,
 responsable_id uuid REFERENCES usuarios(id), revision integer NOT NULL DEFAULT 1,
 estado text NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending','working','review','completed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX equipo_responsable ON equipo_proyectos(responsable_id);
ALTER TABLE cotizaciones ADD COLUMN equipo_proyecto_id uuid REFERENCES equipo_proyectos(id);
ALTER TABLE contratos ADD COLUMN equipo_proyecto_id uuid REFERENCES equipo_proyectos(id);
ALTER TABLE auditoria ADD COLUMN actor_id uuid REFERENCES usuarios(id);
ALTER TABLE auditoria ADD COLUMN actor_nombre text;
ALTER TABLE auditoria ADD COLUMN actor_rol text;
ALTER TABLE auditoria ADD COLUMN equipo_proyecto_id uuid REFERENCES equipo_proyectos(id);
CREATE INDEX auditoria_equipo ON auditoria(equipo_proyecto_id,created_at DESC);
