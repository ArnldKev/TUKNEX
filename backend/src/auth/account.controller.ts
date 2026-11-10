import { BadRequestException, Body, Controller, Get, Inject, NotFoundException, Param, Patch, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { normalizePhone } from './account-fields';
import { SessionGuard, type Account } from './auth';
import { Database } from '../database/database';
import { PdfService } from '../documents/pdf.service';
import { parse } from '../billing/dto';
import {quoteRequestSelect,exposeQuoteRequest} from '../quotes/quote-requests';
import {allowedClientIds} from './client-access';
import { installmentStatus } from '../domain/billing/finance';
type AccountRequest = Request & { account: Account };
@Controller('api/account')
@UseGuards(SessionGuard)
export class AccountController {
  constructor(@Inject(Database) private db: Database, @Inject(PdfService) private pdf: PdfService) {}
  @Get('overview') async overview(@Req() req: AccountRequest) {
    const clientId=req.account.clientId,access=await allowedClientIds(this.db,req.account);
    // All public account sections come from one PostgreSQL statement/snapshot.
    const queries={
     client:"SELECT datos FROM clientes WHERE id=$1",
     quotes:"SELECT datos FROM cotizaciones WHERE cliente_id=ANY($2::uuid[]) AND estado<>'draft' ORDER BY created_at DESC,id",
     contracts:"SELECT datos FROM contratos WHERE cliente_id=ANY($2::uuid[]) AND estado<>'borrador' ORDER BY created_at DESC,id",
     installments:"SELECT s.*,s.fecha_vencimiento::text AS due_date FROM saldo_cuotas s JOIN contratos c ON c.id=s.contrato_id WHERE c.cliente_id=ANY($2::uuid[]) AND c.estado<>'borrador' ORDER BY s.fecha_vencimiento,s.numero_cuota,s.id",
     payments:"SELECT p.id,p.contrato_id,p.cuota_id,p.monto,p.fecha_pago::text AS payment_date,p.metodo_pago,p.referencia,p.observacion,p.comprobante_id,p.anulado,p.motivo_anulacion,p.created_at,COALESCE((SELECT jsonb_agg(jsonb_build_object('installmentId',a.cuota_id,'amountCents',a.monto) ORDER BY a.cuota_id) FROM pago_aplicaciones a WHERE a.pago_id=p.id),'[]'::jsonb) AS allocations FROM pagos p JOIN contratos c ON c.id=p.contrato_id WHERE c.cliente_id=ANY($2::uuid[]) AND c.estado<>'borrador' ORDER BY p.fecha_pago DESC,p.created_at DESC,p.id",
     requests:quoteRequestSelect+' WHERE s.usuario_id=$3 OR s.cliente_id=ANY($2::uuid[]) ORDER BY s.created_at DESC,s.id',
    };
    const collections=['quotes','contracts','installments','payments','requests'] as const;
    const sql='SELECT ('+queries.client+") AS client, now() AS updated_at,"+collections.map(key=>"(SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM ("+queries[key]+') t) AS '+key).join(',');
    const row=(await this.db.query(sql,[clientId,access,req.account.id])).rows[0];
    const installments=row.installments as Record<string,any>[],payments=row.payments as Record<string,any>[];
    return {user:req.account,client:row.client||null,updatedAt:new Date(row.updated_at).toISOString(),requests:row.requests.map(exposeQuoteRequest),quotes:row.quotes.map((r:{datos:unknown})=>r.datos),contracts:row.contracts.map((r:{datos:unknown})=>r.datos),installments:installments.map(r=>({id:r.id,contractId:r.contrato_id,number:r.numero_cuota,label:r.concepto,date:r.due_date,amountCents:Number(r.monto),paidCents:Number(r.pagado),remainingCents:Number(r.monto)-Number(r.pagado),status:installmentStatus(Number(r.monto),Number(r.pagado),r.due_date),paidDate:r.ultima_fecha_pago?String(r.ultima_fecha_pago).slice(0,10):undefined})),payments:payments.map(r=>({id:r.id,contractId:r.contrato_id,installmentId:r.cuota_id||undefined,amountCents:Number(r.monto),date:r.payment_date,method:r.metodo_pago,reference:r.referencia,observation:r.observacion,receiptId:r.comprobante_id||undefined,voided:r.anulado,voidReason:r.motivo_anulacion||undefined,createdAt:new Date(r.created_at).toISOString(),allocations:(r.allocations||[]).map((a:{installmentId:string;amountCents:unknown})=>({installmentId:a.installmentId,amountCents:Number(a.amountCents)}))}))};
  }
  @Patch('profile') async profile(@Req() req: AccountRequest,@Body() body: unknown) {
    const input=parse(z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().max(30),address:z.string().trim().max(200)}).strict(),body);
    await this.db.transaction(async tx=>{
      await tx.query('SELECT id FROM usuarios WHERE id=$1 FOR UPDATE',[req.account.id]);
      const row=(await tx.query('SELECT datos FROM clientes WHERE id=$1 FOR UPDATE',[req.account.clientId])).rows[0];
      if(!row) throw new NotFoundException('Perfil de cliente no disponible.');
      const phone=input.phone?normalizePhone(input.phone):'';
      if(phone&&!/^\+[1-9]\d{7,14}$/.test(phone))throw new BadRequestException('Escribe un teléfono con código de país válido.');
      const client={...row.datos,...input,phone};
      await tx.query('UPDATE clientes SET nombre=$2,telefono=$3,direccion=$4,datos=$5,updated_at=now() WHERE id=$1',[req.account.clientId,input.name,phone,input.address,JSON.stringify(client)]);
      await tx.query('UPDATE usuarios SET nombre=$2,telefono=$3,phone_verified_at=CASE WHEN telefono=$3 THEN phone_verified_at ELSE NULL END WHERE id=$1',[req.account.id,input.name,phone]);
      await tx.query("UPDATE verificaciones SET consumed_at=now() WHERE usuario_id=$1 AND proposito='phone' AND destino<>$2 AND consumed_at IS NULL",[req.account.id,phone]);
    });
    return {ok:true};
  }
  private async document(kind:'quote'|'contract',id:string,req:AccountRequest,res:Response) {
    const table=kind==='quote'?'cotizaciones':'contratos', hidden=kind==='quote'?'draft':'borrador';
    const row=(await this.db.query('SELECT id FROM '+table+' WHERE id=$1 AND cliente_id=ANY($2::uuid[]) AND estado<>$3',[id,await allowedClientIds(this.db,req.account),hidden])).rows[0];
    if(!row) throw new NotFoundException('Documento no encontrado.');
    const document=await this.pdf.document(kind,id);
    res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="'+document.filename+'"','Cache-Control':'no-store'}).send(document.bytes);
  }
  @Get('receipts/:id') async receipt(@Param('id') id:string,@Req() req:AccountRequest,@Res() res:Response) {
    parse(z.uuid(),id);
    const row=(await this.db.query("SELECT r.mime,r.contenido FROM comprobantes r WHERE r.id=$1 AND EXISTS (SELECT 1 FROM pagos p JOIN contratos c ON c.id=p.contrato_id WHERE p.comprobante_id=r.id AND c.cliente_id=ANY($2::uuid[]) AND c.estado<>'borrador')",[id,await allowedClientIds(this.db,req.account)])).rows[0];
    if(!row)throw new NotFoundException('Comprobante no encontrado.');
    const extension=row.mime==='application/pdf'?'.pdf':row.mime==='image/png'?'.png':'.jpg';
    res.set({'Content-Type':row.mime,'Content-Disposition':'attachment; filename="comprobante-'+id+extension+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).send(Buffer.from(row.contenido));
  }
  @Get('quotes/:id/pdf') quote(@Param('id') id:string,@Req() req:AccountRequest,@Res() res:Response) {return this.document('quote',id,req,res);}
  @Get('contracts/:id/pdf') contract(@Param('id') id:string,@Req() req:AccountRequest,@Res() res:Response) {return this.document('contract',id,req,res);}
}
