-- Solicitudes preparadas por el equipo: autor y cliente destino son identidades distintas.
ALTER TABLE solicitudes_cotizacion ADD COLUMN IF NOT EXISTS creado_por_id uuid REFERENCES usuarios(id);
ALTER TABLE solicitudes_cotizacion ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1 CHECK (revision > 0);
ALTER TABLE solicitudes_cotizacion ADD COLUMN IF NOT EXISTS vinculada_at timestamptz;
ALTER TABLE solicitudes_cotizacion ADD COLUMN IF NOT EXISTS vinculada_por_id uuid REFERENCES usuarios(id);
UPDATE solicitudes_cotizacion SET creado_por_id=usuario_id WHERE creado_por_id IS NULL;
UPDATE solicitudes_cotizacion SET vinculada_at=created_at,vinculada_por_id=usuario_id WHERE usuario_id IS NOT NULL AND vinculada_at IS NULL;
ALTER TABLE solicitudes_cotizacion ALTER COLUMN creado_por_id SET NOT NULL;
ALTER TABLE solicitudes_cotizacion ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE solicitudes_cotizacion ALTER COLUMN cliente_id DROP NOT NULL;
ALTER TABLE solicitudes_cotizacion DROP CONSTRAINT IF EXISTS solicitudes_cotizacion_usuario_id_clave_idempotencia_key;
CREATE UNIQUE INDEX IF NOT EXISTS solicitudes_creador_idempotencia ON solicitudes_cotizacion(creado_por_id,clave_idempotencia);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='solicitudes_cotizacion'::regclass AND conname='solicitudes_vinculo_completo') THEN
  ALTER TABLE solicitudes_cotizacion ADD CONSTRAINT solicitudes_vinculo_completo CHECK ((usuario_id IS NULL AND cliente_id IS NULL) OR (usuario_id IS NOT NULL AND cliente_id IS NOT NULL));
 END IF;
END $$;
ALTER TABLE equipo_proyectos ALTER COLUMN cliente_id DROP NOT NULL;
-- Compatibilidad con importaciones antiguas que solo indicaban usuario_id.
-- Una vinculación existente no puede transferirse ni borrarse accidentalmente.
CREATE OR REPLACE FUNCTION proteger_autoria_solicitud() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.creado_por_id:=COALESCE(NEW.creado_por_id,NEW.usuario_id);
 ELSIF NEW.creado_por_id IS DISTINCT FROM OLD.creado_por_id THEN
  RAISE EXCEPTION 'El creador de la solicitud es inmutable' USING ERRCODE='23514';
 ELSIF OLD.usuario_id IS NOT NULL AND (NEW.usuario_id IS DISTINCT FROM OLD.usuario_id OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id) THEN
  RAISE EXCEPTION 'La cuenta cliente vinculada no se puede transferir' USING ERRCODE='23514';
 END IF;
 IF NEW.usuario_id IS NOT NULL AND NEW.vinculada_at IS NULL THEN
  NEW.vinculada_at:=now();
  NEW.vinculada_por_id:=COALESCE(NEW.vinculada_por_id,NEW.creado_por_id);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS solicitudes_autoria_inmutable ON solicitudes_cotizacion;
CREATE TRIGGER solicitudes_autoria_inmutable BEFORE INSERT OR UPDATE ON solicitudes_cotizacion FOR EACH ROW EXECUTE FUNCTION proteger_autoria_solicitud();
