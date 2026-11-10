// Keep identical in frontend/src/lib/quote and backend/src/domain/quote.
import type {QuoteFormValues} from './form';

/** Display-only labels. IDs remain the source of truth for validation and pricing. */
export const quoteChoiceLabels = {
 sector:{food:'Restaurante / cafetería',tourism:'Turismo y hospedaje',commerce:'Comercio y productos',services:'Servicios profesionales',health:'Salud y bienestar',education:'Educación',other:'Otro emprendimiento'},
 goal:{visibility:'Que conozcan mi negocio',products:'Mostrar productos o menú',orders:'Recibir pedidos o consultas',sales:'Vender y cobrar online',organize:'Organizar mis procesos',modernize:'Modernizar lo que tengo',unsure:'Necesito orientación'},
 budget:{unsure:'Aún no lo sé',under300:'Hasta S/ 300','300-550':'S/ 300–550','550-800':'S/ 550–800','800-1000':'S/ 800–1,000','1000+':'Más de S/ 1,000'},
 salesChannels:{whatsapp:'WhatsApp',phone:'Llamadas',social:'Redes sociales',physical:'Local físico',website:'Mi web',other:'Otro canal'},
 productsRange:{none:'Todavía no lo sé','1-20':'Hasta 20 productos o servicios','21-100':'Entre 21 y 100 productos o servicios','100+':'Más de 100 productos o servicios'},
 userRange:{'1-2':'Una o dos personas','3-5':'Entre tres y cinco personas','6+':'Seis o más personas / varios roles'},
 design:{essential:'Esencial, adaptado a mi marca',custom:'A medida',premium:'Más elaborado'},
 materials:{logo:'Logo',colors:'Colores de marca',photos:'Fotos propias',texts:'Textos',prices:'Productos y precios',help:'Necesito ayuda para preparar el contenido'},
 stylePreference:{modern:'Moderno',elegant:'Elegante',minimal:'Sencillo',corporate:'Profesional',bold:'Llamativo',unsure:'Necesito orientación'},
 timeline:{flexible:'Flexible, sin prioridad urgente',standard:'En las próximas semanas',urgent:'Fecha cercana; disponibilidad por revisar'},
 domain:{yes:'Ya tengo dominio',no:'Todavía no tengo dominio',unsure:'Necesito orientación'},
 hosting:{yes:'Ya tengo alojamiento web',no:'Todavía no tengo alojamiento web',unsure:'Necesito orientación'},
 management:{self:'Quiero administrar el contenido',tuknex:'Prefiero solicitar los cambios a TUKNEX',unsure:'Necesito orientación'},
} as const;
export type QuoteChoiceField=keyof typeof quoteChoiceLabels;
export function quoteChoiceLabel(field:QuoteChoiceField,value:unknown):string{
 const labels=quoteChoiceLabels[field] as Record<string,string>;
 return typeof value==='string'&&Object.hasOwn(labels,value)?labels[value]:'Por definir';
}
export function quoteChoiceList(field:QuoteChoiceField,values:readonly unknown[],empty='Por definir'):string{
 return values.length?values.map(value=>quoteChoiceLabel(field,value)).join(', '):empty;
}
export type QuoteAnswerOrigin='written'|'selected'|'imported'|'transcribed'|'suggested';
export type QuoteAnswerSources=Partial<Record<keyof QuoteFormValues,QuoteAnswerOrigin>>;
export function quoteOriginLabel(source:QuoteAnswerOrigin|undefined):string{
 if(!source)return 'Origen no registrado; puede ser una opción predefinida';
 return {written:'Texto escrito',selected:'Opción seleccionada',imported:'Valor importado',transcribed:'Texto dictado',suggested:'Sugerencia aplicada'}[source];
}
