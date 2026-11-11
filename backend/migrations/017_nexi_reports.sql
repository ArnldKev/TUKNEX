CREATE TABLE nexi_informes (
 id uuid PRIMARY KEY, tipo_fuente text NOT NULL CHECK(tipo_fuente IN ('request','formal')), fuente_id uuid NOT NULL,
 revision_fuente integer NOT NULL CHECK(revision_fuente>0), instantanea jsonb NOT NULL, generado jsonb NOT NULL,
 creado_por uuid NOT NULL REFERENCES usuarios(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nexi_informes_fuente ON nexi_informes(tipo_fuente,fuente_id,created_at DESC);
CREATE TABLE nexi_informe_revisiones (
 id uuid PRIMARY KEY,informe_id uuid NOT NULL REFERENCES nexi_informes(id),version integer NOT NULL CHECK(version>0),
 revisado jsonb NOT NULL, aprobado boolean NOT NULL,nota_interna text NOT NULL DEFAULT '',
 autor_id uuid NOT NULL REFERENCES usuarios(id),clave_idempotencia uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(informe_id,version),UNIQUE(informe_id,clave_idempotencia)
);
CREATE FUNCTION proteger_informes_nexi() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Los informes y revisiones de NEXI se conservan como historial' USING ERRCODE='23514'; END $$;
CREATE TRIGGER nexi_generado_inmutable BEFORE UPDATE OR DELETE ON nexi_informes FOR EACH ROW EXECUTE FUNCTION proteger_informes_nexi();
CREATE TRIGGER nexi_revision_inmutable BEFORE UPDATE OR DELETE ON nexi_informe_revisiones FOR EACH ROW EXECUTE FUNCTION proteger_informes_nexi();
