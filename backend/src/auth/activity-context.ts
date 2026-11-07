import { AsyncLocalStorage } from 'node:async_hooks';
import type { Account } from './auth';
export const activityContext = new AsyncLocalStorage<{ actor?: Account; projectId?: string }>();
