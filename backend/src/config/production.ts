import { verificationPolicy } from '../auth/account-fields';
export function assertProductionConfig() {
  if(process.env.NODE_ENV!=='production')return;
  const missing=['DATABASE_URL','CORS_ORIGINS','RESEND_API_KEY','EMAIL_FROM','VERIFICATION_SECRET'].filter(key=>!process.env[key]);
  if(missing.length)throw Error('Falta configuración de producción: '+missing.join(', '));
  if(process.env.BILLING_MODE!=='production'||process.env.SEED_DEMO_DATA==='true')throw Error('Producción requiere PostgreSQL y datos demo desactivados.');
  if(process.env.VERIFICATION_SECRET!.length<32)throw Error('VERIFICATION_SECRET debe tener al menos 32 caracteres.');
  const origins=process.env.CORS_ORIGINS!.split(',').map(value=>value.trim());
  if(origins.some(value=>{try{const url=new URL(value);return url.protocol!=='https:'||url.origin!==value||['localhost','127.0.0.1'].includes(url.hostname);}catch{return true;}}))throw Error('CORS_ORIGINS debe contener orígenes HTTPS públicos exactos, sin rutas ni asteriscos.');
  if(process.env.TRUST_PROXY_HOPS&&!/^[01]$/.test(process.env.TRUST_PROXY_HOPS))throw Error('TRUST_PROXY_HOPS admite 0 o 1; ajusta el proxy a esta topología.');
  if(verificationPolicy().phoneRequired&& !['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_VERIFY_SERVICE_SID'].every(key=>process.env[key]))throw Error('Para exigir SMS configura las tres credenciales de Twilio Verify.');
}
