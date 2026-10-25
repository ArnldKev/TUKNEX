// Keep identical in frontend and backend. Drafts contain the project, never contact form fields.
import { z } from 'zod';
import { quoteProjectSchema, type QuoteProject } from './project';
export const DRAFT_POLICY_VERSION = '2026-10-25-v1';
export const DRAFT_MAX_BYTES = 64_000;
export const DRAFT_HISTORY_LIMIT = 30;
export const draftContentSchema = z.object({ project: quoteProjectSchema, step: z.number().int().min(0).max(5) }).strict();
export const draftCreateSchema = draftContentSchema.extend({
  consent: z.literal(true), policyVersion: z.literal(DRAFT_POLICY_VERSION), accountId: z.uuid().nullable(),
}).strict();
export const draftSaveSchema = draftContentSchema.extend({ expectedVersion: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) }).strict();
export const draftVersionSchema = z.object({ expectedVersion: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) }).strict();
export function draftContentKey(project: QuoteProject, step: number): string {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) :
    value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => [k, canonical(v)])) : value;
  return JSON.stringify(canonical({ project, step }));
}
export function draftProgress(project: QuoteProject): number {
  const a = project.answers;
  // Readiness of essential answers, not an administrator's delivery status or a client's claim.
  const completed = [a.goal !== 'unsure', a.offering.trim().length >= 3, !!a.sector,
    a.problem.trim().length >= 5, a.features.length > 0, !!project.visual.firstImpression.trim()];
  return Math.round(completed.filter(Boolean).length / completed.length * 100);
}
export interface DraftConfig { enabled: boolean; retentionDays: number | null; policyVersion: string }
export interface DraftSummary {
  id: string; version: number; title: string; step: number; progress: number;
  createdAt: string; updatedAt: string; expiresAt: string; policyVersion: string;
  owner: { id: string; name: string; email: string } | null;
}
export interface RemoteDraft extends DraftSummary { project: QuoteProject }
export interface DraftPage { items: DraftSummary[]; nextCursor: string | null }
export interface DraftRevision { version: number; createdAt: string; step: number }
