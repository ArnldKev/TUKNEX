import {billingBase,billingRequest} from './api';
import {RECEIPT_MAX_BYTES} from './receipts';
export const paymentReportStatuses={pending:'Por revisar',observed:'Necesita corrección',rejected:'Rechazado',confirmed:'Pago confirmado'} as const;
export type PaymentReportStatus=keyof typeof paymentReportStatuses;
export interface PaymentReport {
 id:string;clientId:string;userId:string;clientName:string;contractId:string;contractNumber:string;projectName:string;
 installmentId?:string;amountCents:number;date:string;method:string;reference:string;observation:string;
 status:PaymentReportStatus;version:number;paymentId?:string;lastReason:string;createdAt:string;updatedAt:string;
}
export interface PaymentReportDetail extends PaymentReport {history:{id:string;action:'submitted'|'updated'|'confirm'|'observe'|'reject';revision:number;reason:string;createdAt:string;actorName:string}[]}
export const reportActionLabels={submitted:'Reporte enviado',updated:'Corrección enviada',confirm:'Pago confirmado',observe:'Corrección solicitada',reject:'Reporte rechazado'} as const;
export function listPaymentReports(scope:'account'|'billing',signal?:AbortSignal){return billingRequest<PaymentReport[]>(scope+'/payment-reports',{signal});}
export function paymentReportDetail(scope:'account'|'billing',id:string,signal?:AbortSignal){return billingRequest<PaymentReportDetail>(scope+'/payment-reports/'+encodeURIComponent(id),{signal});}
export async function paymentReportReceipt(scope:'account'|'billing',id:string,signal:AbortSignal){
 const response=await fetch(billingBase+'/api/'+scope+'/payment-reports/'+encodeURIComponent(id)+'/receipt',{credentials:'include',cache:'no-store',signal});
 if(!response.ok){const body=await response.json().catch(()=>null);throw Error(body?.message||'No pudimos cargar el comprobante privado.');}
 const mime=response.headers.get('content-type')?.split(';')[0].trim();
 if(!mime||!['image/png','image/jpeg','application/pdf'].includes(mime))throw Error('El archivo recibido no es una imagen o PDF válido.');
 if(Number(response.headers.get('content-length')||0)>RECEIPT_MAX_BYTES)throw Error('El archivo supera 5 MB.');
 const blob=await response.blob();if(!blob.size||blob.size>RECEIPT_MAX_BYTES)throw Error('El archivo está vacío o supera 5 MB.');
 return {blob,filename:'reporte-'+id+(mime==='application/pdf'?'.pdf':mime==='image/png'?'.png':'.jpg')};
}

export function paymentReportError(error:unknown,fallback='La información está temporalmente no disponible. Intenta nuevamente.'){
 if(error instanceof Error){if(error.name==='TimeoutError'||error.name==='AbortError')return 'La conexión demoró más de lo esperado. Vuelve a intentarlo; tus datos no se han borrado.';if(error instanceof TypeError)return 'No pudimos conectar con el servicio. Revisa tu conexión y vuelve a intentarlo.';if(error.message&&!/^(Internal server error|Failed to fetch|fetch failed|NetworkError)/i.test(error.message))return error.message;}return fallback;
}
