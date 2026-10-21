export interface RegistrationInput {name:string;email:string;password:string;phone:string;dni:string;privacyConsent:boolean}
export type UserRole = 'client' | 'admin';
export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  isDemo: boolean;
  phone?:string;emailVerified?:boolean;phoneVerified?:boolean;profileComplete?:boolean;
  createdAt: string;
}
export interface ClientProfile {
  id: string;
  userId: string;
  business: string;
  city: string;
  phone: string;
  preferredContact: 'email' | 'message';
  marketingConsent: boolean;
}
export interface QuoteAnswer {
  id?: string;
  question: string;
  value: string;
}
export type QuoteStatus =
  | 'Nuevo'
  | 'Cotizado'
  | 'Contactado'
  | 'Negociación'
  | 'Aprobado'
  | 'En desarrollo'
  | 'Finalizado'
  | 'Pausado';
export interface Quote {
  id: string;
  userId?: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  projectType: string;
  project: string;
  features: string[];
  amount: number | null;
  status: QuoteStatus;
  date: string;
  createdAt: string;
  notes: string;
  answers: QuoteAnswer[];
  estimate?: unknown;
  version: number;
  isDemo: boolean;
  demo: boolean;
  [key: string]: unknown;
}
export interface ProjectMilestone {
  id: string;
  title: string;
  completed: boolean;
  date?: string;
}
export type ProjectStatus = 'planning' | 'development' | 'review' | 'completed' | 'paused';
export interface Project {
  id: string;
  userId: string;
  quoteId: string;
  name: string;
  type: string;
  status: ProjectStatus;
  progress: number;
  manager: string;
  description: string;
  milestones: ProjectMilestone[];
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
}
export type ReviewStatus = 'draft' | 'pending' | 'published' | 'rejected';
export type ModerationReason = 'spam' | 'insults' | 'private-data' | 'illegal';
export interface Review {
  id: string;
  userId: string;
  projectId: string;
  rating: number;
  title: string;
  comment: string;
  status: ReviewStatus;
  displayConsent: boolean;
  displayName: string;
  isDemo: boolean;
  verified: false;
  businessReply: string;
  moderationReason?: ModerationReason;
  moderationNote?: string;
  createdAt: string;
  updatedAt: string;
}
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
export interface Conversation {
  id: string;
  userId?: string;
  name: string;
  topic: string;
  messages: ConversationMessage[];
  date: string;
  isDemo: boolean;
}
export interface Lead {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  business: string;
  message: string;
  status: QuoteStatus;
  notes: string;
  date: string;
  isDemo: boolean;
}
export interface ActivityLog {
  id: string;
  entityId: string;
  action: string;
  actorId: string;
  date: string;
  isDemo: boolean;
}
export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  active: boolean;
  isDemo: boolean;
}
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  active: boolean;
}
export interface PlatformSnapshot {
  users: User[];
  profiles: ClientProfile[];
  quotes: Quote[];
  projects: Project[];
  reviews: Review[];
  conversations: Conversation[];
  leads: Lead[];
  activities: ActivityLog[];
  pricingPlans: PricingPlan[];
  faqs: FaqItem[];
}
export interface CreateQuoteInput {
  name: string;
  business: string;
  email?: string;
  phone?: string;
  projectType: string;
  project?: string;
  features?: string[];
  amount: number | null;
  estimate?: unknown;
  answers?: QuoteAnswer[];
  [key: string]: unknown;
}
export interface AuthService {
  login(email: string, password: string): Promise<User>;
  register(input: RegistrationInput): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  resetPassword(email: string): Promise<string>;
  hasRole(role: UserRole): boolean;
}
export interface PaginationParams {
  page: number;
  pageSize: number;
  query?: string;
  sort?: string;
}
export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };
