import { BadRequestException, Body, Controller, Get, Inject, NotFoundException, Param, Patch, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { normalizePhone } from './account-fields';
import { SessionGuard, type Account } from './auth';
import { Database } from '../database/database';
import { PdfService } from '../documents/pdf.service';
import { parse } from '../billing/dto';
type AccountRequest = Request & { account: Account };
@Controller('api/account')
@UseGuards(SessionGuard)
export class AccountController {
  constructor(@Inject(Database) private db: Database, @Inject(PdfService) private pdf: PdfService) {}
  @Get('overview') async overview(@Req() req: AccountRequest) {
    const clientId=req.account.clientId;
    const [client,quotes,contracts,installments,payments] = await Promise.all([
      this.db.query('SELECT datos FROM clientes WHERE id=$1',[clientId]),
      this.db.query("SELECT datos FROM cotizaciones WHERE cliente_id=$1 AND estado<>'draft' ORDER BY created_at DESC",[clientId]),
      this.db.query("SELECT datos FROM contratos WHERE cliente_id=$1 AND estado<>'borrador' ORDER BY created_at DESC",[clientId]),
      this.db.query("SELECT s.*,s.fecha_vencimiento::text AS due_date FROM saldo_cuotas s JOIN contratos c ON c.id=s.contrato_id WHERE c.cliente_id=$1 AND c.estado<>'borrador' ORDER BY s.fecha_vencimiento,s.numero_cuota",[clientId]),
      this.db.query("SELECT p.id,p.contrato_id,p.monto,p.fecha_pago::text AS payment_date,p.metodo_pago,p.anulado FROM pagos p JOIN contratos c ON c.id=p.contrato_id WHERE c.cliente_id=$1 AND c.estado<>'borrador' ORDER BY p.fecha_pago DESC",[clientId]),
    ]);
    return {user:req.account,client:client.rows[0]?.datos || null,quotes:quotes.rows.map(r=>r.datos),contracts:contracts.rows.map(r=>r.datos),installments:installments.rows.map(r=>({id:r.id,contractId:r.contrato_id,number:r.numero_cuota,label:r.concepto,date:r.due_date,amountCents:Number(r.monto),paidCents:Number(r.pagado),remainingCents:Number(r.monto)-Number(r.pagado)})),payments:payments.rows.map(r=>({id:r.id,contractId:r.contrato_id,amountCents:Number(r.monto),date:r.payment_date,method:r.metodo_pago,voided:r.anulado}))};
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
    const row=(await this.db.query('SELECT id FROM '+table+' WHERE id=$1 AND cliente_id=$2 AND estado<>$3',[id,req.account.clientId,hidden])).rows[0];
    if(!row) throw new NotFoundException('Documento no encontrado.');
    const document=await this.pdf.document(kind,id);
    res.set({'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="'+document.filename+'"','Cache-Control':'no-store'}).send(document.bytes);
  }
  @Get('quotes/:id/pdf') quote(@Param('id') id:string,@Req() req:AccountRequest,@Res() res:Response) {return this.document('quote',id,req,res);}
  @Get('contracts/:id/pdf') contract(@Param('id') id:string,@Req() req:AccountRequest,@Res() res:Response) {return this.document('contract',id,req,res);}
}
