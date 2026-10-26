import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { BACKEND_ROOT } from './config/paths';
config({ path: resolve(BACKEND_ROOT, '.env'), quiet: true });
import { NestFactory } from '@nestjs/core';
import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { json } from 'express';
import { assertProductionConfig } from './config/production';
import { AppModule } from './app.module';
import { BillingService } from './billing/billing.service';
@Catch()
class Errors implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : error.status >= 400 && error.status < 500
          ? error.status
          : error.code === '23505'
            ? 409
            : ['22P02', '23503', '23514'].includes(error.code)
              ? 400
              : 500;
    const message =
      error instanceof HttpException
        ? error.message
        : status === 409
          ? 'Este registro ya existe.'
          : status === 400
            ? 'Revisa los datos y sus relaciones.'
            : 'No pudimos completar la operación.';
    if (status === 500) Logger.error(error?.stack || 'Error interno', 'Billing');
    res.status(status).json({ message, statusCode: status });
  }
}
export async function createApp() {
  assertProductionConfig();
  const app = await NestFactory.create(AppModule, { bodyParser: false, abortOnError: false });
  const origins = (
    process.env.CORS_ORIGINS || 'http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:4173'
  )
    .split(',')
    .map((s) => s.trim());
  if (origins.includes('*')) throw new Error('Configura orígenes CORS explícitos, sin asterisco.');
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.getHttpAdapter().getInstance().set('trust proxy',Number(process.env.TRUST_PROXY_HOPS||0));
  app.use('/api',(_req:any,res:any,next:any)=>{res.set('Cache-Control','no-store');next();});
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
  });
  app.use(json({ limit: '96kb' }));
  const publicLimit={windowMs:15*60*1000,limit:5,standardHeaders:'draft-8' as const,legacyHeaders:false,message:{message:'Demasiadas solicitudes. Espera unos minutos e inténtalo otra vez.'}};
  app.use('/api/public/contact',rateLimit(publicLimit));
  app.use('/api/quote-drafts',rateLimit({...publicLimit,limit:10,skip:req=>!(req.method==='POST' && (req.path==='/' || req.path==='/session'))}));
  app.use('/api/quote-drafts',rateLimit({...publicLimit,limit:120,skip:req=>req.method==='GET'}));
  app.use('/api/quote-drafts',rateLimit({...publicLimit,limit:500,skip:req=>req.method!=='GET'}));
  app.use('/api/quote-ai/audio/dictate',rateLimit({...publicLimit,limit:30,skip:req=>req.method==='GET'}));
  app.use('/api/quote-ai',rateLimit({...publicLimit,limit:20,skip:req=>req.method==='GET'||req.path==='/audio/dictate'}));
  app.use('/api/billing/quote-ai',rateLimit({...publicLimit,limit:20,skip:req=>req.method==='GET'}));
  app.use('/api/account/reviews',rateLimit({...publicLimit,limit:30,skip:req=>req.method==='GET'}));
  app.use('/api/auth/recovery',rateLimit({...publicLimit,limit:10}));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use(
    '/api/auth/login',
    rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }),
  );
  app.use(
    '/api/public/quote-pdf',
    rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }),
  );
  app.useGlobalFilters(new Errors());
  app.enableShutdownHooks();
  await app.init();
  await app.get(BillingService).initialize();
  return app;
}
if (require.main === module)
  void createApp()
    .then(async (app) => {
      const host = process.env.SERVER_HOST || '127.0.0.1';
      if (process.env.BILLING_MODE !== 'production' && !['127.0.0.1', 'localhost', '::1'].includes(host))
        throw new Error('El modo local-demo sólo puede escuchar en loopback.');
      await app.listen(Number(process.env.PORT || 4000), host);
      Logger.log('Documentos y pagos: http://' + host + ':' + (process.env.PORT || 4000), 'TUKNEX');
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
