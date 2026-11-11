CREATE TABLE proyecto_expedientes (
 id uuid PRIMARY KEY,tipo_proyecto text NOT NULL CHECK(tipo_proyecto IN ('team','billing')),proyecto_id uuid NOT NULL,
 cliente_id uuid NOT NULL REFERENCES clientes(id),autor_id uuid NOT NULL REFERENCES usuarios(id),clave_idempotencia uuid NOT NULL,
 visibilidad text NOT NULL CHECK(visibilidad IN ('private','client')),manifiesto jsonb NOT NULL,archivo bytea NOT NULL,sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(autor_id,clave_idempotencia),CHECK(octet_length(archivo)<=41943040)
);
CREATE INDEX expediente_proyecto ON proyecto_expedientes(tipo_proyecto,proyecto_id,created_at DESC);
CREATE TRIGGER expediente_inmutable BEFORE UPDATE OR DELETE ON proyecto_expedientes FOR EACH ROW EXECUTE FUNCTION proteger_evidencia_contrato();
