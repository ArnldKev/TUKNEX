import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { Database, type Sql } from '../database/database';
import { parse } from '../billing/dto';
import { VerificationDelivery } from './delivery';
import { dniField, phoneField, verificationPolicy } from './account-fields';
export type VerificationPurpose='email'|'phone'|'recovery';
const channelSchema=z.enum(['email','phone']);
@Injectable()
export class VerificationService {
  constructor(@Inject(Database) private db:Database,@Inject(VerificationDelivery) private delivery:VerificationDelivery) {}
  async status(userId:string) {
    const row=(await this.db.query('SELECT correo,telefono,dni,email_verified_at,phone_verified_at FROM usuarios WHERE id=$1',[userId])).rows[0];
    const policy=verificationPolicy();
    return {...policy,emailAvailable:this.delivery.emailAvailable(),phoneAvailable:this.delivery.phoneAvailable(),emailVerified:!!row.email_verified_at,phoneVerified:!!row.phone_verified_at,profileComplete:!!(row.telefono&&row.dni),email:row.correo,phone:row.telefono,dniMasked:row.dni?'••••'+row.dni.slice(-4):'',identityVerified:false};
  }
  async assertReady(userId:string) {
    const status=await this.status(userId);
    if((status.emailRequired&&!status.emailVerified)||(status.phoneRequired&&!status.phoneVerified))throw new ForbiddenException('Confirma tus datos de contacto antes de guardar la cotización. Tus respuestas se mantienen en esta pantalla.');
    if((status.emailRequired||status.phoneRequired)&&!status.profileComplete)throw new ForbiddenException('Completa tu teléfono y DNI para continuar.');
  }
  private hash(id:string,target:string,code:string) {
    if(!process.env.VERIFICATION_SECRET || process.env.VERIFICATION_SECRET.length<32)throw new ServiceUnavailableException('La verificación aún no está configurada.');
    return createHmac('sha256',process.env.VERIFICATION_SECRET).update(id+':'+target+':'+code).digest('hex');
  }
  async start(userId:string,purpose:VerificationPurpose) {
    if(purpose==='phone'?!this.delivery.phoneAvailable():!this.delivery.emailAvailable())throw new ServiceUnavailableException(purpose==='phone'?'La verificación por SMS aún no está configurada.':'El envío de correo aún no está configurado.');
    return this.db.transaction(async tx=>{
      const user=(await tx.query('SELECT * FROM usuarios WHERE id=$1 AND activo=true FOR UPDATE',[userId])).rows[0];
      if(!user)throw new BadRequestException('Cuenta no disponible.');
      const target=purpose==='phone'?user.telefono:user.correo;
      if(!target)throw new BadRequestException('Completa tus datos de contacto antes de verificar.');
      const recent=(await tx.query('SELECT created_at FROM verificaciones WHERE usuario_id=$1 AND proposito=$2 AND created_at>$3 ORDER BY created_at DESC',[userId,purpose,new Date(Date.now()-86400000).toISOString()])).rows;
      if(recent.length>=10 || recent[0]&&Date.now()-new Date(recent[0].created_at).getTime()<60000)throw new ConflictException('Espera al menos un minuto antes de reenviar. El límite diario es de 10 solicitudes por canal.');
      const id=randomUUID(),code=String(randomInt(100000,1000000)),expires=new Date(Date.now()+600000).toISOString();
      const provider=purpose==='phone'?await this.delivery.phone(target):await this.delivery.email(target,code,id,purpose==='recovery');
      await tx.query('INSERT INTO verificaciones(id,usuario_id,proposito,destino,codigo_hash,proveedor_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,userId,purpose,target,purpose==='phone'?null:this.hash(id,target,code),provider,expires]);
      return {accepted:true,expiresIn:600,retryAfter:60};
    });
  }
  // Errors are returned from the transaction so failed-attempt counters commit.
  private async consume(tx:Sql,user:Record<string,any>,purpose:VerificationPurpose,code:string):Promise<string|null> {
    const row=(await tx.query('SELECT * FROM verificaciones WHERE usuario_id=$1 AND proposito=$2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE',[user.id,purpose])).rows[0];
    const target=purpose==='phone'?user.telefono:user.correo;
    if(!row||row.consumed_at||row.intentos>=5||new Date(row.expires_at).getTime()<Date.now()||row.destino!==target)return 'Código vencido o no disponible. Solicita uno nuevo.';
    await tx.query('UPDATE verificaciones SET intentos=intentos+1 WHERE id=$1',[row.id]);
    let matches=false;
    try {matches=purpose==='phone'?await this.delivery.checkPhone(row.proveedor_id,code):timingSafeEqual(Buffer.from(row.codigo_hash,'hex'),Buffer.from(this.hash(row.id,target,code),'hex'));}
    catch {return 'No se pudo comprobar el código con el servicio. Inténtalo más tarde.';}
    if(!matches)return 'Código incorrecto. Revisa el último que recibiste.';
    await tx.query('UPDATE verificaciones SET consumed_at=now() WHERE id=$1',[row.id]);
    return null;
  }
  async confirm(userId:string,value:unknown) {
    const {channel,code}=parse(z.object({channel:channelSchema,code:z.string().regex(/^\d{6}$/)}).strict(),value);
    const error=await this.db.transaction(async tx=>{
      const user=(await tx.query('SELECT * FROM usuarios WHERE id=$1 FOR UPDATE',[userId])).rows[0];
      const error=await this.consume(tx,user,channel,code);if(error)return error;
      await tx.query('UPDATE usuarios SET '+(channel==='phone'?'phone_verified_at':'email_verified_at')+'=now() WHERE id=$1',[userId]);return null;
    });
    if(error)throw new BadRequestException(error);
    return this.status(userId);
  }
  async completeProfile(userId:string,value:unknown) {
    const {phone,dni}=parse(z.object({phone:phoneField,dni:dniField}).strict(),value);
    await this.db.transaction(async tx=>{
      const user=(await tx.query('SELECT * FROM usuarios WHERE id=$1 FOR UPDATE',[userId])).rows[0];
      await tx.query('UPDATE usuarios SET telefono=$2,dni=$3,phone_verified_at=CASE WHEN telefono=$2 THEN phone_verified_at ELSE NULL END WHERE id=$1',[userId,phone,dni]);
      if(user.telefono!==phone)await tx.query("UPDATE verificaciones SET consumed_at=now() WHERE usuario_id=$1 AND proposito='phone' AND consumed_at IS NULL",[userId]);
      if(user.cliente_id){
        const client=(await tx.query('SELECT datos FROM clientes WHERE id=$1 FOR UPDATE',[user.cliente_id])).rows[0];
        await tx.query('UPDATE clientes SET telefono=$2,documento=$3,datos=$4,updated_at=now() WHERE id=$1',[user.cliente_id,phone,dni,JSON.stringify({...client.datos,phone,taxId:dni})]);
      }
    });return this.status(userId);
  }
  async recover(email:string,code:string,passwordHash:string) {
    const error=await this.db.transaction(async tx=>{
      const user=(await tx.query('SELECT * FROM usuarios WHERE correo=$1 AND activo=true FOR UPDATE',[email])).rows[0];
      if(!user)return 'Código incorrecto o vencido.';
      const error=await this.consume(tx,user,'recovery',code);if(error)return error;
      await tx.query('UPDATE usuarios SET password_hash=$2,email_verified_at=COALESCE(email_verified_at,now()) WHERE id=$1',[user.id,passwordHash]);
      await tx.query('DELETE FROM sesiones WHERE usuario_id=$1',[user.id]);return null;
    });
    if(error)throw new BadRequestException(error);
    return {ok:true};
  }
}
