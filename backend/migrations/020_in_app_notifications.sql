ALTER TABLE notificaciones_salida
 ADD COLUMN canal text NOT NULL DEFAULT 'correo_y_cuenta',
 ADD COLUMN leido_at timestamptz,
 DROP CONSTRAINT notificaciones_salida_destinatario_rol_check,
 ADD CHECK (canal IN ('correo_y_cuenta','cuenta')),
 ADD CHECK (destinatario_rol IN ('admin','subadmin') OR (destinatario_rol='client' AND canal='cuenta'));

DROP INDEX notificaciones_pendientes;
CREATE INDEX notificaciones_pendientes ON notificaciones_salida(estado,proximo_intento)
 WHERE canal='correo_y_cuenta';
CREATE INDEX notificaciones_bandeja ON notificaciones_salida(destinatario_id, created_at DESC, id DESC);

-- An old draft, or an account whose historical connection cannot be established, gets no delivery notice.
WITH envios AS (
 SELECT DISTINCT ON(c.id) c.id,c.cliente_id,c.numero_contrato,c.datos,c.equipo_proyecto_id,a.created_at
 FROM contratos c
 JOIN auditoria a ON a.entidad_id=c.id::text AND a.accion='estado_contrato' AND a.datos->>'status'='enviado'
 WHERE c.estado IN ('enviado','firmado_cliente','firmado_tuknex','activo','finalizado','cancelado')
   AND COALESCE(c.datos->>'isDemo','false')='false'
 ORDER BY c.id,a.created_at DESC,a.id DESC
), destinatarios AS (
 SELECT e.*,u.id AS usuario_id,count(*) OVER(PARTITION BY e.id) AS total
 FROM envios e
 JOIN usuarios u ON u.activo AND u.rol='client' AND u.created_at<=e.created_at
 AND (u.cliente_id=e.cliente_id OR EXISTS (
  SELECT 1 FROM cliente_cuenta_asociaciones x
  WHERE x.cliente_id=e.cliente_id AND x.usuario_id=u.id AND x.activo AND x.updated_at<=e.created_at
 ))
)
INSERT INTO notificaciones_salida
 (id,evento_clave,tipo,entidad_id,proyecto_nombre,ruta,equipo_proyecto_id,destinatario_id,destinatario_rol,canal,created_at)
SELECT gen_random_uuid(),'contract-sent:legacy:'||id,'contract_sent',id,
 left(COALESCE(NULLIF(datos->>'projectName',''),numero_contrato),200), '/mi-cuenta/proyectos?contrato='||id,
 equipo_proyecto_id,usuario_id,'client','cuenta',created_at
FROM destinatarios WHERE total=1
ON CONFLICT(evento_clave,destinatario_id) DO NOTHING;

-- Only recorded online acceptance is used to recover the acknowledgement.
INSERT INTO notificaciones_salida
 (id,evento_clave,tipo,entidad_id,proyecto_nombre,ruta,equipo_proyecto_id,destinatario_id,destinatario_rol,canal,created_at)
SELECT gen_random_uuid(),'contract-accepted:'||c.id||':'||a.version,'contract_accepted',c.id,
 left(COALESCE(NULLIF(c.datos->>'projectName',''),c.numero_contrato),200),
 CASE WHEN u.rol='subadmin' THEN '/equipo?proyecto='||p.id||'&contrato='||c.id ELSE '/admin/contratos?contrato='||c.id END,
 c.equipo_proyecto_id,u.id,u.rol,'cuenta',a.accepted_at
FROM contrato_aceptaciones a
JOIN contratos c ON c.id=a.contrato_id
LEFT JOIN equipo_proyectos p ON p.id=c.equipo_proyecto_id
JOIN usuarios u ON u.activo AND (u.rol='admin' OR (u.rol='subadmin' AND p.responsable_id=u.id))
WHERE COALESCE(c.datos->>'isDemo','false')='false'
ON CONFLICT(evento_clave,destinatario_id) DO NOTHING;
