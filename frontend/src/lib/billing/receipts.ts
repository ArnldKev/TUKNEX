export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const receiptMethods:Record<string,{label:string;reference:string;proof:string}> = {
  transferencia:{label:'Transferencia bancaria',reference:'Número de operación o transferencia',proof:'Adjunta la captura o el voucher de la transferencia recibida.'},
  yape:{label:'Yape',reference:'Número de operación de Yape',proof:'Adjunta una captura del pago recibido por Yape.'},
  plin:{label:'Plin',reference:'Número de operación de Plin',proof:'Adjunta una captura del pago recibido por Plin.'},
  efectivo:{label:'Efectivo',reference:'Número de recibo o referencia',proof:'Puedes adjuntar una foto del recibo o constancia del pago en efectivo.'},
  tarjeta:{label:'Tarjeta',reference:'Número de operación o voucher',proof:'Adjunta el voucher o la constancia del pago con tarjeta.'},
  otro:{label:'Otro medio de pago',reference:'Código o referencia del pago',proof:'Adjunta una imagen o documento que respalde el pago recibido.'},
};
export function receiptFileError(file:{size:number;type:string}) {
  if(file.size===0)return 'El archivo está vacío. Selecciona otra imagen o documento.';
  if(file.size>RECEIPT_MAX_BYTES)return 'El comprobante no puede superar 5 MB.';
  if(file.type&&!['image/png','image/jpeg','application/pdf'].includes(file.type))return 'Selecciona una imagen PNG o JPEG, o un PDF.';
  return '';
}
