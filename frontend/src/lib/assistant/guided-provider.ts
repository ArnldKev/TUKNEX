import { DEFAULT_PRICES, FEATURES, money, PROJECT_TYPES } from '../pricing';
import { assistantKnowledge } from './knowledge';
import type { AssistantProvider, AssistantRecommendation, AssistantReply } from './contracts';

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function asksForCommerce(value: string) {
  const withoutNegatedNeeds = value.replace(
    /\b(?:no|sin)\s+(?:(?:necesito|quiero|deseo|tengo|incluir|usar|implementar)\s+)?(?:pagos?|cobros?|carrito|tienda|ecommerce|cobrar|vender)(?:\s+(?:online|en linea|por internet))?/g,
    '',
  );
  return /carrito|cobrar|pagar.*(?:online|en linea|tarjeta)|pagos?\s+(?:online|en linea)|tienda|vender.*internet|e.?commerce/.test(
    withoutNegatedNeeds,
  );
}

function systemRecommendation(text: string): AssistantReply {
  return recommend({
    projectType: 'system',
    goal: 'organize',
    features: ['login', /inventario/.test(text) ? 'inventory' : 'clients'],
    reason:
      'Quieres organizar información o una tarea interna. Conviene empezar con uno o dos módulos sencillos. Si hay más procesos o permisos, revisaremos el alcance antes de estimar.',
  });
}

function commerceRecommendation(): AssistantReply {
  return recommend({
    projectType: 'store',
    goal: 'sales',
    sector: 'commerce',
    features: ['catalog', 'cart', 'payments'],
    reason:
      'Un proceso de compra necesita definir productos, pedidos, entregas y proveedor de pagos. Lo adecuado es una evaluación personalizada, sin prometer el precio de una web sencilla.',
  });
}
function recommend(recommendation: AssistantRecommendation): AssistantReply {
  const name =
    PROJECT_TYPES.find((type) => type.id === recommendation.projectType)?.name ?? 'una solución web';
  return {
    mode: 'guided-demo',
    intent: 'recommendation',
    recommendation,
    content: `Mi sugerencia inicial es ${name}. ${recommendation.reason} Es una orientación por reglas, no un diagnóstico definitivo. Puedes corregirla o confirmar que la usemos en el cotizador.`,
  };
}

export const guidedAssistantProvider: AssistantProvider = {
  async respond({ message, history, prices: overrides = {} }) {
    const text = normalize(message);
    const isFollowUp =
      /^(?:y |tambien |ademas |si[, ]|quiero que |que |por whatsapp|pedidos)/.test(text) &&
      !/\b(?:no|solo|sin)\b/.test(text);
    const context = isFollowUp
      ? `${history
          .filter((item) => item.role === 'user')
          .slice(-3)
          .map((item) => normalize(item.content))
          .join(' ')} ${text}`
      : text;
    const prices = {
      ...DEFAULT_PRICES,
      ...Object.fromEntries(
        Object.entries(overrides).filter(([, value]) => Number.isFinite(value) && value >= 0),
      ),
    };
    const knowledge = assistantKnowledge.filter((item) => item.pattern.test(text));
    if (knowledge.length)
      return {
        mode: 'guided-demo',
        intent: 'knowledge',
        content: knowledge
          .slice(0, 3)
          .map((item) => item.answer)
          .join('\n\n'),
      };
    if (/tiempo|demora|tarda|plazo|urgencia/.test(text))
      return {
        mode: 'guided-demo',
        intent: 'knowledge',
        content:
          'Una web esencial suele tomar 7–12 días hábiles; un catálogo, 10–15; un sistema simple, 15–25. El plazo empieza con el alcance aprobado y el contenido entregado. La prioridad urgente depende de disponibilidad y se confirma antes de contratar.',
      };
    if (/precio|cuanto|costo|presupuesto|barato/.test(text))
      return {
        mode: 'guided-demo',
        intent: 'pricing',
        content: `Como referencia: Landing Esencial desde ${money(prices.landing)}, Web Negocio desde ${money(prices.business)} y Catálogo Digital desde ${money(prices.catalog)}. Un sistema de uno o dos módulos sencillos puede estar entre ${money(prices.system)} y ${money(prices['limit-system'])}. Tres o más módulos, pagos, roles avanzados y facturación requieren evaluación. Dominio, hosting, licencias y mantenimiento van por separado. Tu presupuesto orienta prioridades; no determina el cálculo.`,
      };
    if (/asesor|humano|telefono|numero.*whatsapp|contactar.*tuknex|hablar.*tuknex/.test(text))
      return {
        mode: 'guided-demo',
        intent: 'advisor',
        content:
          'Puedes usar el botón de WhatsApp para preparar un mensaje y conversar con TUKNEX. Este asistente es demostrativo: utiliza una base local de conocimiento y reglas; no conecta con una persona ni con una IA generativa.',
      };
    if (/no se|no estoy seguro|ayudame a elegir/.test(text))
      return {
        mode: 'guided-demo',
        intent: 'knowledge',
        content:
          'Lo descubrimos juntos. ¿Quieres recibir consultas, mostrar productos o un menú, vender y cobrar por internet, u organizar procesos internos? Cuéntame qué hace tu negocio y cuál de esas tareas te ayudaría más. Podemos empezar por la solución más sencilla suficiente.',
      };
    if (/cuotas|adelanto|forma.*pago|como.*(?:pagar|pago|se paga)|pagar.*(?:proyecto|servicio)/.test(text))
      return {
        mode: 'guided-demo',
        intent: 'knowledge',
        content:
          'La forma de pago se acuerda después de validar el alcance y queda en la propuesta formal. Esta demo no cobra, no confirma contratos y no envía datos bancarios.',
      };
    if (asksForCommerce(text)) return commerceRecommendation();
    if (/inventario|organizar|automatizar|proceso|reportes|clientes.*registr|sistema/.test(text))
      return systemRecommendation(text);
    if (/restaur|cafeter|cafe|menu|carta/.test(context) && /whatsapp|pedido|pidan|mostrar|vean/.test(context))
      return recommend({
        projectType: 'catalog',
        goal: 'products',
        sector: 'food',
        features: ['information', 'catalog', 'whatsapp'],
        reason:
          'Tus clientes necesitan ver el menú y preparar una consulta o pedido por WhatsApp. Un catálogo digital puede cubrirlo sin añadir una pasarela de pagos que todavía no necesitas.',
      });
    if (asksForCommerce(context)) return commerceRecommendation();
    if (/inventario|organizar|automatizar|proceso|reportes|clientes.*registr|sistema/.test(context))
      return systemRecommendation(context);
    if (/producto|catalogo|menu|carta/.test(context))
      return recommend({
        projectType: 'catalog',
        goal: 'products',
        features: ['catalog', 'whatsapp', 'information'],
        reason:
          'Lo principal es mostrar productos o servicios y facilitar consultas. Empezar con un catálogo suele ser suficiente si los pedidos se coordinan por WhatsApp.',
      });
    if (/redisen|modernizar|mejorar.*web|pagina.*antigua/.test(context))
      return recommend({
        projectType: 'redesign',
        goal: 'visibility',
        features: ['information', 'whatsapp'],
        reason:
          'Primero revisaremos qué funciona en tu web actual, qué quieres mejorar y qué tecnología utiliza. Así evitamos prometer cambios sin conocer su base.',
      });
    if (
      /landing|campana|promocion|una pagina|solo.*consulta|recibir.*(?:consulta|mensaje)|(?:cliente|persona).*contact|me contacten/.test(
        context,
      )
    )
      return recommend({
        projectType: 'landing',
        goal: 'visibility',
        features: ['information', 'whatsapp', 'contact'],
        reason:
          'Quieres presentar una oferta y facilitar el contacto. Una página enfocada puede ser el primer paso más sencillo.',
      });
    if (/negocio|servicio|empezar|orient|necesito.*web|presentar/.test(context))
      return recommend({
        projectType: 'business',
        goal: 'visibility',
        sector: 'services',
        features: ['information', 'whatsapp', 'contact'],
        reason:
          'Una web de negocio puede explicar quién eres, tus servicios y cómo contactarte. Si sólo necesitas una oferta puntual, podemos simplificarla a una landing.',
      });
    if (/hola|buenas|gracias|buen dia/.test(text))
      return {
        mode: 'guided-demo',
        intent: 'welcome',
        content:
          '¡Qué gusto acompañarte! Cuéntame qué hace tu negocio y qué quieres mejorar. Puedo explicarte términos sencillos o sugerir una solución inicial; tú decides si la llevamos al cotizador.',
      };
    return {
      mode: 'guided-demo',
      intent: 'fallback',
      content:
        'Esa pregunta se sale de lo que mi guía local puede resolver con seguridad. Puedo explicar dominio, hosting, landing, tienda o sistema; también orientarte si me cuentas qué hace tu negocio. Para detalles específicos, preparemos una consulta con un asesor por WhatsApp.',
    };
  },
};

export function recommendationUrl(recommendation: AssistantRecommendation): string {
  const projectType = PROJECT_TYPES.some((project) => project.id === recommendation.projectType)
    ? recommendation.projectType
    : 'landing';
  const goal = ['visibility', 'products', 'sales', 'organize'].includes(recommendation.goal)
    ? recommendation.goal
    : 'visibility';
  const features = FEATURES.filter((feature) => recommendation.features.includes(feature.id)).map(
    (feature) => feature.id,
  );
  const params = new URLSearchParams({
    tipo: projectType,
    objetivo: goal,
    funciones: features.join(','),
  });
  if (recommendation.sector && ['food', 'commerce', 'services'].includes(recommendation.sector))
    params.set('sector', recommendation.sector);
  return `/cotizar?${params.toString()}`;
}
