CREATE TABLE pago_reportes (
 id uuid PRIMARY KEY, usuario_id uuid NOT NULL REFERENCES usuarios(id), cliente_id uuid NOT NULL REFERENCES clientes(id),
 contrato_id uuid NOT NULL REFERENCES contratos(id), cuota_id uuid REFERENCES cuotas(id), importe bigint NOT NULL CHECK(importe>0),
 fecha date NOT NULL, metodo text NOT NULL, referencia text NOT NULL DEFAULT '', observacion text NOT NULL DEFAULT '',
 comprobante_id uuid NOT NULL REFERENCES comprobantes(id), estado text NOT NULL DEFAULT 'pending' CHECK(estado IN ('pending','observed','rejected','confirmed')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0), clave_idempotencia uuid NOT NULL, entrada_hash text NOT NULL,
 huella text NOT NULL, pago_id uuid UNIQUE REFERENCES pagos(id), ultimo_motivo text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(usuario_id,clave_idempotencia), CHECK((estado='confirmed')=(pago_id IS NOT NULL))
);
CREATE UNIQUE INDEX pago_reporte_duplicado ON pago_reportes(contrato_id,huella) WHERE estado<>'rejected';
CREATE INDEX pago_reportes_contrato ON pago_reportes(contrato_id,created_at DESC);
CREATE TABLE pago_reporte_historial (
 id uuid PRIMARY KEY, reporte_id uuid NOT NULL REFERENCES pago_reportes(id), actor_id uuid NOT NULL REFERENCES usuarios(id),
 accion text NOT NULL CHECK(accion IN ('submitted','updated','confirm','observe','reject')), revision integer NOT NULL,
 motivo text NOT NULL, datos jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pago_reporte_decisiones (
 clave uuid PRIMARY KEY, reporte_id uuid NOT NULL REFERENCES pago_reportes(id), administrador_id uuid NOT NULL REFERENCES usuarios(id),
 entrada_hash text NOT NULL, resultado jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION proteger_historial_reporte_pago() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'El historial de reportes de pago es inmutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER historial_reporte_pago_inmutable BEFORE UPDATE OR DELETE ON pago_reporte_historial FOR EACH ROW EXECUTE FUNCTION proteger_historial_reporte_pago();
CREATE TRIGGER decisiones_reporte_pago_inmutables BEFORE UPDATE OR DELETE ON pago_reporte_decisiones FOR EACH ROW EXECUTE FUNCTION proteger_historial_reporte_pago();
