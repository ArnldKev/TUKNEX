import {BadRequestException} from '@nestjs/common';
import {createHash} from 'node:crypto';
export const MAX_RECEIPT_BYTES=5*1024*1024;
export function validateReceipt(file?:{buffer:Buffer;originalname:string}){
 if(!file?.buffer?.length||file.buffer.length>MAX_RECEIPT_BYTES)throw new BadRequestException('Selecciona un comprobante PDF, PNG o JPEG de hasta 5 MB.');
 const bytes=file.buffer,mime=bytes.subarray(0,5).toString()==='%PDF-'?'application/pdf':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':null;
 if(!mime)throw new BadRequestException('El archivo debe ser un PDF, PNG o JPEG válido.');
 return {bytes,mime,name:file.originalname.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ._-]/g,'').slice(0,120)||'comprobante',sha256:createHash('sha256').update(bytes).digest('hex')};
}
