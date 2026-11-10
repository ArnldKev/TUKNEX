import { previewFeedbackLabels, visualPreferenceSummary } from './visual';
import { FEATURES, PROJECT_TYPES, money } from '../pricing';
import { paymentPreferenceLabels, type QuoteFormValues } from './form';
import type { QuoteAnswer, QuoteResult } from './contracts';

import {quoteChoiceLabels,quoteChoiceLabel,quoteChoiceList,quoteOriginLabel,type QuoteAnswerSources} from './commercial-labels';
export const sectorLabels=quoteChoiceLabels.sector;
export const goalLabels=quoteChoiceLabels.goal;
export const budgetLabels=quoteChoiceLabels.budget;
export function quoteAnswers(values: QuoteFormValues,sources?:QuoteAnswerSources): QuoteAnswer[] {
  const pairs: [string, string][] = [
    ['Objetivo', goalLabels[values.goal]],
    ['Negocio', values.businessName || 'Sin indicar'],
    ['Qué ofrece', values.offering],
    ['Rubro', values.sector ? sectorLabels[values.sector] : 'Sin indicar'],
    ['Ciudad / zona', values.city || 'Por definir'],
    ['Web / redes actuales', values.website || 'Sin indicar'],
    ['Clientes', values.customers || 'Por definir'],
    ['Canales actuales', quoteChoiceList('salesChannels',values.salesChannels,'Sin canales indicados')],
    ['Venta actual', values.salesProcess || 'Sin indicar'],
    ['Problema a resolver', values.problem],
    [
      'Funciones',
      FEATURES.filter((item) => values.features.includes(item.id))
        .map((item) => item.name)
        .join(', '),
    ],
    [
      'Volumen de productos',
      ['catalog', 'store'].includes(values.projectType) ? quoteChoiceLabel('productsRange',values.productsRange) : 'No aplica',
    ],
    ['Usuarios', values.projectType === 'system' ? quoteChoiceLabel('userRange',values.userRange) : 'No aplica'],
    ['Otras funciones', values.otherFunctions || 'Ninguna adicional'],
    ['Material disponible', quoteChoiceList('materials',values.materials,'Por preparar')],
    ['Diseño', quoteChoiceLabel('design',values.design)],
    ['Estilo', quoteChoiceLabel('stylePreference',values.stylePreference)],
    ['Dirección del boceto (provisional)', visualPreferenceSummary(values.visualPreferences)],
    ['Valoración del boceto', values.previewFeedback ? previewFeedbackLabels[values.previewFeedback] : 'Sin valoración registrada'],
    ['Cambios que pide el cliente', values.previewComment || 'Sin comentarios'],
    ['Colores preferidos', values.colorsLiked || 'Por definir'],
    ['Colores a evitar', values.colorsDisliked || 'Sin indicar'],
    ['Referencias', values.references || 'Sin indicar'],
    ['Competencia / marca de referencia', values.competitor || 'Sin indicar'],
    ['Primer mensaje al visitante', values.firstImpression || 'Por definir'],
    ['Prioridad', quoteChoiceLabel('timeline',values.timeline)],
    ['Lanzamiento ideal', values.launchDate || 'Flexible'],
    ['Fecha límite real', values.hardDeadline ? values.deadlineReason || 'Sí, por confirmar' : 'No'],
    ['Presupuesto orientativo', budgetLabels[values.budget]],
    ['Frecuencia de pago preferida', paymentPreferenceLabels[values.paymentPreference||'unsure']],
    ['Dominio', values.domain === 'yes'&&values.existingDomain ? values.existingDomain : quoteChoiceLabel('domain',values.domain)],
    ['Hosting', quoteChoiceLabel('hosting',values.hosting)],
    ['Gestión del contenido', quoteChoiceLabel('management',values.management)],
    ['Capacitación', values.training ? 'Sí' : 'Por definir'],
    ['Mantenimiento', values.maintenance ? 'Interés en mantenimiento opcional' : 'No solicitado'],
    ['Correo corporativo', values.corporateEmail ? 'Evaluar proveedor' : 'No solicitado'],
    ['Responsable de aprobar', values.approver || 'Por definir'],
    [
      'Consentimiento comercial opcional',
      values.marketingConsent ? 'Autorizado para contacto comercial sobre este proyecto' : 'No otorgado',
    ],
  ];
  const provenance:Record<string,keyof QuoteFormValues>={'Objetivo':'goal','Rubro':'sector','Canales actuales':'salesChannels','Volumen de productos':'productsRange','Usuarios':'userRange','Material disponible':'materials','Diseño':'design','Estilo':'stylePreference','Prioridad':'timeline','Presupuesto orientativo':'budget','Frecuencia de pago preferida':'paymentPreference','Dominio':'domain','Hosting':'hosting','Gestión del contenido':'management'};
  // Old saved requests lack provenance; never claim that their defaults were explicitly chosen.
  return pairs.map(([question,value])=>({question,value:sources&&provenance[question]?value+' · '+quoteOriginLabel(sources[provenance[question]]):value}));
}
export function quoteProposalText(values: QuoteFormValues, result: QuoteResult): string {
  const project = PROJECT_TYPES.find((item) => item.id === values.projectType)!;
  return [
    'TUKNEX · Propuesta preliminar',
    'La base de tu siguiente nivel',
    `Fecha: ${new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}`,
    `Vigencia: ${result.validityDays} días`,
    ...(values.name ? [`Contacto: ${values.name}`] : []),
    ...(values.email ? [`Correo: ${values.email}`] : []),
    ...(values.phone ? [`WhatsApp: ${values.phone}`] : []),
    '',
    `Solución: ${project.name}`,
    result.custom
      ? 'Necesitamos conversar para darte un precio responsable.'
      : `Inversión estimada: ${money(result.min)} – ${money(result.max)}`,
    `Plazo: ${result.duration}`,
    '',
    ...quoteAnswers(values).map((answer) => `${answer.question}: ${answer.value}`),
    '',
    'DESGLOSE',
    ...(result.custom
      ? result.reasons
      : [
          `Base: ${money(result.base)}`,
          ...result.extras.map((extra) => `${extra.name}: ${money(extra.amount)}`),
          `Diseño: ${money(result.designAmount)}`,
          `Prioridad: ${money(result.urgencyAmount)}`,
        ]),
    '',
    'INCLUYE',
    ...result.scope,
    '',
    'COSTOS SEPARADOS',
    ...result.thirdPartyCosts,
    '',
    'EXCLUSIONES',
    ...result.exclusions,
    '',
    result.conditions,
    'Propuesta preliminar: requiere revisión de TUKNEX y no constituye contratación ni aceptación de un precio definitivo.',
  ].join('\n');
}
