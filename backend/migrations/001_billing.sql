
CREATE TABLE IF NOT EXISTS clientes (
 id uuid PRIMARY KEY, legacy_id text UNIQUE, nombre text NOT NULL, documento text NOT NULL DEFAULT '',
 telefono text NOT NULL DEFAULT '', correo text NOT NULL DEFAULT '', direccion text NOT NULL DEFAULT '',
 es_demo boolean NOT NULL DEFAULT false, datos jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS proyectos (
 id uuid PRIMARY KEY, cliente_id uuid NOT NULL REFERENCES clientes(id), legacy_id text UNIQUE, nombre text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cotizaciones (
 id uuid PRIMARY KEY, numero text UNIQUE NOT NULL, cliente_id uuid NOT NULL REFERENCES clientes(id),
 proyecto_id uuid REFERENCES proyectos(id), legacy_id text UNIQUE, estado text NOT NULL CHECK(estado IN ('draft','sent','accepted','rejected')),
 monto_base bigint NOT NULL CHECK(monto_base>0), monto_financiado bigint NOT NULL CHECK(monto_financiado>=0),
 monto_total bigint NOT NULL CHECK(monto_total=monto_base+monto_financiado), datos jsonb NOT NULL,
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS contratos (
 id uuid PRIMARY KEY, numero_contrato text UNIQUE NOT NULL, cliente_id uuid NOT NULL REFERENCES clientes(id),
 cotizacion_id uuid UNIQUE REFERENCES cotizaciones(id), proyecto_id uuid REFERENCES proyectos(id),
 fecha_emision date NOT NULL, fecha_inicio date NOT NULL, fecha_entrega date NOT NULL,
 servicio text NOT NULL, alcance text NOT NULL, monto_base bigint NOT NULL CHECK(monto_base>0),
 tipo_pago text NOT NULL, porcentaje_financiamiento numeric(5,2) NOT NULL CHECK(porcentaje_financiamiento BETWEEN 0 AND 100),
 monto_financiado bigint NOT NULL CHECK(monto_financiado>=0), monto_total bigint NOT NULL CHECK(monto_total=monto_base+monto_financiado),
 condiciones text NOT NULL DEFAULT '', estado text NOT NULL CHECK(estado IN ('borrador','enviado','firmado_cliente','firmado_tuknex','activo','finalizado','cancelado')),
 pdf_url text, datos jsonb NOT NULL,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(fecha_entrega>=fecha_inicio)
);
CREATE TABLE IF NOT EXISTS cuotas (
 id uuid PRIMARY KEY, contrato_id uuid NOT NULL REFERENCES contratos(id), numero_cuota integer NOT NULL CHECK(numero_cuota>0),
 concepto text NOT NULL,fecha_vencimiento date NOT NULL,monto bigint NOT NULL CHECK(monto>0),
 estado text NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','pagada','vencida')),
 fecha_pago date,observacion text NOT NULL DEFAULT '',comprobante_url text, created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(contrato_id,numero_cuota)
);
CREATE TABLE IF NOT EXISTS comprobantes (
 id uuid PRIMARY KEY, nombre text NOT NULL,mime text NOT NULL, contenido bytea NOT NULL, sha256 text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),CHECK(octet_length(contenido)<=5242880)
);
CREATE TABLE IF NOT EXISTS pagos (
 id uuid PRIMARY KEY,contrato_id uuid NOT NULL REFERENCES contratos(id),cuota_id uuid REFERENCES cuotas(id),
 monto bigint NOT NULL CHECK(monto>0),fecha_pago date NOT NULL,metodo_pago text NOT NULL,referencia text NOT NULL DEFAULT '',
 observacion text NOT NULL DEFAULT '',comprobante_id uuid REFERENCES comprobantes(id),idempotency_key uuid UNIQUE NOT NULL,
 anulado boolean NOT NULL DEFAULT false,motivo_anulacion text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pago_aplicaciones (
 pago_id uuid NOT NULL REFERENCES pagos(id),cuota_id uuid NOT NULL REFERENCES cuotas(id),monto bigint NOT NULL CHECK(monto>0),
 PRIMARY KEY(pago_id,cuota_id)
);
CREATE TABLE IF NOT EXISTS documentos (
 id uuid PRIMARY KEY,tipo text NOT NULL,entidad_id uuid NOT NULL,version integer NOT NULL,
 contenido bytea NOT NULL, sha256 text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS configuracion (id text PRIMARY KEY,datos jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS secuencias (prefijo text PRIMARY KEY,valor integer NOT NULL);
CREATE TABLE IF NOT EXISTS auditoria (id uuid PRIMARY KEY,accion text NOT NULL,entidad_id text NOT NULL,datos jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS cuotas_vencimiento ON cuotas(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS pagos_contrato ON pagos(contrato_id);
CREATE INDEX IF NOT EXISTS contratos_estado ON contratos(estado);
CREATE OR REPLACE VIEW saldo_cuotas AS
 SELECT c.*,COALESCE(SUM(CASE WHEN NOT p.anulado THEN a.monto ELSE 0 END),0)::bigint AS pagado,
 MAX(CASE WHEN NOT p.anulado THEN p.fecha_pago END) AS ultima_fecha_pago
 FROM cuotas c LEFT JOIN pago_aplicaciones a ON a.cuota_id=c.id LEFT JOIN pagos p ON p.id=a.pago_id GROUP BY c.id;
