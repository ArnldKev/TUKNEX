import type { ProjectType } from '../pricing';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  recommendation?: AssistantRecommendation;
}
export interface AssistantRecommendation {
  projectType: ProjectType;
  reason: string;
  features: string[];
  goal: 'visibility' | 'products' | 'sales' | 'organize';
  sector?: 'food' | 'commerce' | 'services';
}
export interface AssistantReply {
  content: string;
  intent: 'welcome' | 'knowledge' | 'pricing' | 'recommendation' | 'advisor' | 'fallback';
  recommendation?: AssistantRecommendation;
  mode: 'guided-demo';
}
export interface AssistantRequest {
  message: string;
  history: Pick<AssistantMessage, 'role' | 'content'>[];
  prices?: Record<string, number>;
}
export interface AssistantProvider {
  respond(request: AssistantRequest): Promise<AssistantReply>;
}
