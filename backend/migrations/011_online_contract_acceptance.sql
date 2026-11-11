-- Immutable versions reviewed in the authenticated client portal.
CREATE TABLE contrato_revisiones (
 documento_id uuid PRIMARY KEY REFERENCES documentos(id),
 contrato_id uuid NOT NULL REFERENCES contratos(id),
 version integer NOT NULL CHECK(version>0),
 datos jsonb NOT NULL,
 sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(contrato_id,version)
);
CREATE TABLE contrato_aceptaciones (
 id uuid PRIMARY KEY,
 contrato_id uuid NOT NULL UNIQUE REFERENCES contratos(id),
 documento_id uuid NOT NULL UNIQUE REFERENCES contrato_revisiones(documento_id),
 usuario_id uuid NOT NULL REFERENCES usuarios(id),
 version integer NOT NULL CHECK(version>0),
 nombre text NOT NULL,
 sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 consentimiento text NOT NULL,
 accepted_at timestamptz NOT NULL DEFAULT now()
);
-- Reviewed files and acceptance evidence are append-only through the database too.
CREATE FUNCTION proteger_evidencia_contrato() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'La evidencia contractual es inmutable' USING ERRCODE='23514';
END $$;
CREATE TRIGGER revisiones_contrato_inmutables BEFORE UPDATE OR DELETE ON contrato_revisiones FOR EACH ROW EXECUTE FUNCTION proteger_evidencia_contrato();
CREATE TRIGGER aceptaciones_contrato_inmutables BEFORE UPDATE OR DELETE ON contrato_aceptaciones FOR EACH ROW EXECUTE FUNCTION proteger_evidencia_contrato();
CREATE FUNCTION proteger_pdf_revisado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM contrato_revisiones WHERE documento_id=OLD.id) THEN
  RAISE EXCEPTION 'El PDF contractual revisado es inmutable' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pdf_revisado_inmutable BEFORE UPDATE OR DELETE ON documentos FOR EACH ROW EXECUTE FUNCTION proteger_pdf_revisado();
