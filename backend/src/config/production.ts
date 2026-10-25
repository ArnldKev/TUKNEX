import { validateAiConfig } from '../ai/groq';
import { verificationPolicy } from '../auth/account-fields';
export function assertProductionConfig() {
  validateAiConfig();
  if(process.env.QUOTE_DRAFTS_ENABLED==='true' && !/^(?:[7-9]|[1-8][0-9]|90)$/.test(process.env.QUOTE_DRAFTS_RETENTION_DAYS||''))throw Error('Para activar borradores configura QUOTE_DRAFTS_RETENTION_DAYS entre 7 y 90 días.');
  if(process.env.NODE_ENV!=='production')return;
  const policy=verificationPolicy();
  const required=['DATABASE_URL','CORS_ORIGINS'];
  if(policy.verificationEnabled)required.push('VERIFICATION_SECRET');
  if(policy.emailRequired)required.push('RESEND_API_KEY','EMAIL_FROM');
  if(policy.phoneRequired)required.push('TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_VERIFY_SERVICE_SID');
  const missing=required.filter(key=>!process.env[key]);
  if(missing.length)throw Error('Falta configuración de producción: '+missing.join(', '));
  if(process.env.BILLING_MODE!=='production'||process.env.SEED_DEMO_DATA==='true')throw Error('Producción requiere PostgreSQL y datos demo desactivados.');
  if(process.env.VERIFICATION_SECRET && process.env.VERIFICATION_SECRET.length<32)throw Error('VERIFICATION_SECRET debe tener al menos 32 caracteres.');
  const origins=process.env.CORS_ORIGINS!.split(',').map(value=>value.trim());
  if(origins.some(value=>{try{const url=new URL(value);return url.protocol!=='https:'||url.origin!==value||['localhost','127.0.0.1'].includes(url.hostname);}catch{return true;}}))throw Error('CORS_ORIGINS debe contener orígenes HTTPS públicos exactos, sin rutas ni asteriscos.');
  if(process.env.TRUST_PROXY_HOPS&&!/^[01]$/.test(process.env.TRUST_PROXY_HOPS))throw Error('TRUST_PROXY_HOPS admite 0 o 1; ajusta el proxy a esta topología.');
}
