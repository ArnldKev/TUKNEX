export const paymentModes = {
  cash: { label: 'Contado', rate: 0 },
  half: { label: '50% / 50%', rate: 0 },
  three: { label: '40% / 30% / 30%', rate: 5 },
  daily: { label: 'Diario', rate: 0 },
  weekly: { label: 'Semanal', rate: 8 },
  fortnightly: { label: 'Quincenal · cada 15 días', rate: 6 },
  monthly: { label: 'Mensual', rate: 10 },
  milestones: { label: 'Por hitos', rate: 0 },
  custom: { label: 'Personalizado', rate: 0 },
} as const;
export type PaymentMode = keyof typeof paymentModes;
export const contractStatuses = [
  'borrador',
  'enviado',
  'firmado_cliente',
  'firmado_tuknex',
  'activo',
  'finalizado',
  'cancelado',
] as const;
export type ContractStatus = (typeof contractStatuses)[number];
export const statusLabels: Record<ContractStatus, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  firmado_cliente: 'Firmado por cliente',
  firmado_tuknex: 'Firmado por TUKNEX',
  activo: 'Activo',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};
export const serviceLabels: Record<string, string> = {
  landing: 'Landing page',
  business: 'Página web de negocio',
  catalog: 'Catálogo digital',
  store: 'Tienda online',
  system: 'Sistema web',
  redesign: 'Rediseño web',
  maintenance: 'Soporte y mantenimiento',
};
export interface Issuer {
  name: string;
  taxId: string;
  address: string;
  email: string;
  phone: string;
}
export interface BillingClient {
  id: string;
  name: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  isDemo: boolean;
  legacyId?: string;
  createdAt: string;
}
export interface PlanInput {
  mode: PaymentMode;
  rate: number;
  count: number;
  firstDueDate: string;
  lastDueDate?: string;
  fixedAmountCents?: number;
  custom?: { label: string; date: string; amountCents: number }[];
}
export interface ScheduleItem {
  number: number;
  label: string;
  date: string;
  amountCents: number;
}
export interface PlanResult {
  baseCents: number;
  feeCents: number;
  totalCents: number;
  installments: ScheduleItem[];
}
export interface BillingQuote {
  id: string;
  number: string;
  clientId: string;
  projectId?: string;
  client: BillingClient;
  projectName: string;
  service: string;
  scope: string;
  observations: string;
  conditions: string;
  delivery: string;
  baseCents: number;
  feeCents: number;
  totalCents: number;
  plan: PlanInput;
  schedule: ScheduleItem[];
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  issuedDate: string;
  validUntil: string;
  legacyId?: string;
  isDemo: boolean;
  issuer: Issuer;
  version: number;
}
export interface Contract {
  id: string;
  number: string;
  clientId: string;
  quoteId?: string;
  projectId?: string;
  client: BillingClient;
  issuer: Issuer;
  projectName: string;
  service: string;
  scope: string;
  observations: string;
  conditions: string;
  issuedDate: string;
  startDate: string;
  deliveryDate: string;
  baseCents: number;
  feeCents: number;
  totalCents: number;
  plan: PlanInput;
  schedule: ScheduleItem[];
  status: ContractStatus;
  version: number;
  isDemo: boolean;
  pdfUrl?: string;
}
export interface Installment extends ScheduleItem {
  id: string;
  contractId: string;
  paidCents: number;
  remainingCents: number;
  status: 'pendiente' | 'pagada' | 'vencida';
  paidDate?: string;
}
export interface Payment {
  id: string;
  contractId: string;
  installmentId?: string;
  amountCents: number;
  date: string;
  method: string;
  reference: string;
  observation: string;
  receiptId?: string;
  voidReason?: string;
  voided: boolean;
  createdAt: string;
}
export interface BillingData {
  clients: BillingClient[];
  quotes: BillingQuote[];
  contracts: Contract[];
  installments: Installment[];
  payments: Payment[];
  issuer: Issuer;
  rates: Record<PaymentMode, number>;
  mode: 'local-demo' | 'production';
  summary: {
    activeContracts: number;
    collectedCents: number;
    outstandingCents: number;
    overdueCents: number;
  };
}

export const contractTransitions: Record<ContractStatus, ContractStatus[]> = {
  borrador: ['enviado', 'cancelado'],
  enviado: ['firmado_cliente', 'firmado_tuknex', 'cancelado'],
  firmado_cliente: ['firmado_tuknex', 'activo', 'cancelado'],
  firmado_tuknex: ['firmado_cliente', 'activo', 'cancelado'],
  activo: ['finalizado', 'cancelado'],
  finalizado: [],
  cancelado: [],
};
