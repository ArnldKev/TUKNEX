import type { Sql } from '../database/database';
import type { Contract } from '../domain/billing/types';

// Use with the contract table aliased as c. Preserve the visibility of legacy
// contracts with evidence of publication, including contracts later cancelled.
export const visibleClientContract = `(
  c.estado IN ('enviado','firmado_cliente','firmado_tuknex','activo','finalizado')
  OR (c.estado='cancelado' AND (
    c.datos ? 'delivery' OR c.datos ? 'clientSignedAt' OR c.datos ? 'issuerSignedAt'
    OR EXISTS (
      SELECT 1 FROM auditoria a
      WHERE a.accion='estado_contrato' AND a.entidad_id=c.id::text AND a.datos->>'status'='enviado'
    )
  ))
)`;

export function clientContractView(contract: Contract): Contract {
  const {delivery} = contract;
  return delivery ? {...contract, delivery:{sentAt:delivery.sentAt,sentVersion:delivery.sentVersion}} : contract;
}

export async function lockContractProject(tx: Sql, id: string, clientIds?: string[]) {
  // Team operations acquire the project first. Retain that order before inserting
  // an audit or notification that references the project from another entry point.
  await tx.query(
    'SELECT p.id FROM equipo_proyectos p JOIN contratos c ON c.equipo_proyecto_id=p.id WHERE c.id=$1'
      + (clientIds ? ' AND c.cliente_id=ANY($2::uuid[])' : '') + ' FOR KEY SHARE OF p',
    clientIds ? [id,clientIds] : [id],
  );
}
