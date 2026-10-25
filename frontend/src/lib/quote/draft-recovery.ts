import { z } from 'zod';
import { DRAFT_POLICY_VERSION, draftContentSchema, DRAFT_MAX_BYTES } from './drafts';
export const DRAFT_RECOVERY_KEY='tuknex-shared-draft-recovery-v1';
export const recoverySchema=draftContentSchema.extend({draftId:z.uuid(),serverVersion:z.number().int().min(1),
  policyVersion:z.literal(DRAFT_POLICY_VERSION),expiresAt:z.iso.datetime()}).strict()
  .refine(value=>value.project.id===value.draftId,'La copia no corresponde al borrador.');
export type DraftRecovery=z.infer<typeof recoverySchema>;
export function parseDraftRecovery(json:string|null,now=Date.now()):DraftRecovery|null{
  if(!json||json.length>DRAFT_MAX_BYTES)return null;
  try{const parsed=recoverySchema.parse(JSON.parse(json));return new Date(parsed.expiresAt).getTime()>now?parsed:null;}catch{return null;}
}
