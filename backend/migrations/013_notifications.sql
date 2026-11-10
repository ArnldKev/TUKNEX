CREATE TABLE notificaciones_salida (
 id uuid PRIMARY KEY, evento_clave text NOT NULL, tipo text NOT NULL, entidad_id uuid NOT NULL,
 proyecto_nombre text NOT NULL, ruta text NOT NULL, equipo_proyecto_id uuid REFERENCES equipo_proyectos(id),
 destinatario_id uuid NOT NULL REFERENCES usuarios(id), destinatario_rol text NOT NULL CHECK(destinatario_rol IN ('admin','subadmin')),
 estado text NOT NULL DEFAULT 'pending' CHECK(estado IN ('pending','sending','sent','failed','cancelled')),
 intentos integer NOT NULL DEFAULT 0 CHECK(intentos>=0), proximo_intento timestamptz NOT NULL DEFAULT now(),
 bloqueo_hasta timestamptz, bloqueo_token uuid, proveedor_id text, error_codigo text,
 created_at timestamptz NOT NULL DEFAULT now(), enviado_at timestamptz,
 UNIQUE(evento_clave,destinatario_id)
);
CREATE INDEX notificaciones_pendientes ON notificaciones_salida(estado,proximo_intento);
