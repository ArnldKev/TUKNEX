CREATE TABLE contrato_adendas (
 id uuid PRIMARY KEY,contrato_id uuid NOT NULL REFERENCES contratos(id),version integer NOT NULL CHECK(version>0),
 datos jsonb NOT NULL,pdf bytea NOT NULL,sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 estado text NOT NULL DEFAULT 'draft' CHECK(estado IN ('draft','sent','accepted','superseded')),
 creado_por uuid NOT NULL REFERENCES usuarios(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(contrato_id,version),CHECK(octet_length(pdf)<=10485760)
);
CREATE TABLE adenda_aceptaciones (
 adenda_id uuid PRIMARY KEY REFERENCES contrato_adendas(id),usuario_id uuid NOT NULL REFERENCES usuarios(id),
 modo text NOT NULL CHECK(modo IN ('online','physical')),nombre text NOT NULL,consentimiento text NOT NULL,
 sha256 text NOT NULL,comprobante_id uuid REFERENCES comprobantes(id),accepted_at timestamptz NOT NULL DEFAULT now(),
 CHECK((modo='physical' AND comprobante_id IS NOT NULL) OR (modo='online' AND comprobante_id IS NULL))
);
CREATE FUNCTION proteger_adenda() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.id IS DISTINCT FROM NEW.id OR OLD.contrato_id IS DISTINCT FROM NEW.contrato_id OR OLD.version IS DISTINCT FROM NEW.version OR OLD.datos IS DISTINCT FROM NEW.datos OR OLD.pdf IS DISTINCT FROM NEW.pdf OR OLD.sha256 IS DISTINCT FROM NEW.sha256 OR OLD.creado_por IS DISTINCT FROM NEW.creado_por OR OLD.created_at IS DISTINCT FROM NEW.created_at OR OLD.estado IN ('accepted','superseded') THEN
 RAISE EXCEPTION 'La propuesta complementaria y su evidencia se conservan' USING ERRCODE='23514'; END IF;RETURN NEW;END $$;
CREATE TRIGGER adenda_inmutable BEFORE UPDATE OR DELETE ON contrato_adendas FOR EACH ROW EXECUTE FUNCTION proteger_adenda();
CREATE TRIGGER adenda_aceptacion_inmutable BEFORE UPDATE OR DELETE ON adenda_aceptaciones FOR EACH ROW EXECUTE FUNCTION proteger_evidencia_contrato();
