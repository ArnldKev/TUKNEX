import { Injectable, ServiceUnavailableException } from '@nestjs/common';
@Injectable()
export class VerificationDelivery {
  emailAvailable() { return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.VERIFICATION_SECRET?.length && process.env.VERIFICATION_SECRET.length>=32); }
  phoneAvailable() { return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID); }
  private async request(url:string,init:RequestInit) {
    try {
      const response=await fetch(url,{...init,signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('Provider rejected request');
      return await response.json() as Record<string,unknown>;
    } catch {throw new ServiceUnavailableException('El proveedor de verificación no respondió. Inténtalo más tarde; tu cuenta y tu cotización se conservan.');}
  }
  async email(to:string,code:string,id:string,recovery=false) {
    if(!this.emailAvailable())throw new ServiceUnavailableException('El envío de correo aún no está configurado. Contacta con TUKNEX.');
    const result=await this.request('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[to],subject:recovery?'Recupera tu acceso a TUKNEX':'Confirma tu correo en TUKNEX',text:`Tu código de ${recovery?'recuperación':'verificación'} de TUKNEX es: ${code}. Caduca en 10 minutos. No lo compartas. Si no lo solicitaste, ignora este mensaje.`})});
    if(typeof result.id!=='string')throw new ServiceUnavailableException('El proveedor no confirmó el envío del correo.');
    return result.id;
  }
  private twilioHeaders() {return {Authorization:'Basic '+Buffer.from(process.env.TWILIO_ACCOUNT_SID+':'+process.env.TWILIO_AUTH_TOKEN).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'};}
  private serviceUrl() {
    if(!this.phoneAvailable() || !/^VA[a-f0-9]{32}$/i.test(process.env.TWILIO_VERIFY_SERVICE_SID!))throw new ServiceUnavailableException('La verificación por SMS aún no está configurada.');
    return 'https://verify.twilio.com/v2/Services/'+process.env.TWILIO_VERIFY_SERVICE_SID;
  }
  async phone(to:string) {
    const data=await this.request(this.serviceUrl()+'/Verifications',{method:'POST',headers:this.twilioHeaders(),body:new URLSearchParams({To:to,Channel:'sms',Locale:'es'})});
    if(typeof data.sid!=='string'||data.status!=='pending')throw new ServiceUnavailableException('El proveedor no confirmó la solicitud del SMS.');
    return data.sid;
  }
  async checkPhone(id:string,code:string) {
    const data=await this.request(this.serviceUrl()+'/VerificationCheck',{method:'POST',headers:this.twilioHeaders(),body:new URLSearchParams({VerificationSid:id,Code:code})});
    return data.status==='approved' && data.sid===id;
  }
}
