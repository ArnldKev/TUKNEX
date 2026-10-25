import {Body,Controller,ForbiddenException,Get,HttpException,Inject,Injectable,Module,NotFoundException,Param,Post,Req,Res,ServiceUnavailableException,UseGuards,OnModuleInit,OnModuleDestroy,Logger} from '@nestjs/common';
import type {Request,Response} from 'express';
import {createHmac,randomUUID} from 'node:crypto';
import {AuthModule} from '../auth/auth.module';
import {AdminGuard} from '../auth/auth';
import {Database} from '../database/database';
import {QuoteDraftsModule,QuoteDraftsService} from '../quotes/quote-drafts';
import {parse} from '../billing/dto';
import {AI_POLICY_VERSION,AI_MAX_INPUT_BYTES,aiRequestSchema,aiAdminRequestSchema,type AiConfig} from '../domain/quote/ai';
import {createQuoteProject,type QuoteProject} from '../domain/quote/project';
import {quoteDefaults,quoteFormSchema} from '../domain/quote/form';
import {z} from 'zod';
import {AI_MODELS,requestGroqReport,AiProviderError} from './groq';

export function quoteAiConfig():AiConfig{
 return {enabled:process.env.NEXI_AI_ENABLED==='true'&&!!process.env.GROQ_API_KEY?.trim()&&(process.env.NEXI_AI_PROVIDER||'groq')==='groq'&&AI_MODELS.includes((process.env.NEXI_AI_MODEL||AI_MODELS[0]) as typeof AI_MODELS[number]),
  provider:'groq',model:AI_MODELS.includes(process.env.NEXI_AI_MODEL as typeof AI_MODELS[number])?process.env.NEXI_AI_MODEL!:AI_MODELS[0],
  policyVersion:AI_POLICY_VERSION,dailyLimit:40,perVisitorDailyLimit:5};
}
function checkOrigin(req:Request){
 const allowed=(process.env.CORS_ORIGINS||'http://127.0.0.1:3000,http://localhost:3000').split(',').map(s=>s.trim());
 if(!req.headers.origin||!allowed.includes(req.headers.origin))throw new ForbiddenException('Origen no autorizado.');
}
@Injectable()
export class QuoteAiService implements OnModuleInit,OnModuleDestroy{
 private cleanupTimer?:ReturnType<typeof setInterval>;
 async cleanup(){await this.db.query("DELETE FROM cotizador_ia_cuotas WHERE window_start<now()-interval '48 hours'");}
 async onModuleInit(){await this.cleanup();this.cleanupTimer=setInterval(()=>{void this.cleanup().catch(()=>Logger.warn('No se pudieron limpiar los contadores de IA.','NexiAI'));},3600000);this.cleanupTimer.unref();}
 onModuleDestroy(){if(this.cleanupTimer)clearInterval(this.cleanupTimer);}
 constructor(@Inject(Database)private db:Database){}
 async formalRequest(id:string){
  parse(z.uuid(),id);
  const row=(await this.db.query('SELECT respuestas FROM solicitudes_cotizacion WHERE id=$1',[id])).rows[0];
  if(!row)throw new NotFoundException('Solicitud no disponible.');
  return createQuoteProject({...quoteDefaults,...quoteFormSchema.parse(row.respuestas)},id);
 }
 async analyze(req:Request,project:QuoteProject,res:Response){
  if(!quoteAiConfig().enabled)throw new ServiceUnavailableException('La ayuda de IA todavía no está activada. Puedes seguir con el cuestionario y los controles visuales.');
  if(Buffer.byteLength(JSON.stringify(project),'utf8')>AI_MAX_INPUT_BYTES)throw new HttpException('La idea es demasiado extensa para esta prueba de IA. Resume las respuestas antes de analizar.',400);
  if(!project.answers.offering.trim()&&!project.answers.problem.trim())throw new HttpException('Cuéntanos qué ofreces o qué quieres mejorar antes de pedir ideas.',400);
  const controller=new AbortController(),cancel=()=>{if(!res.writableEnded)controller.abort();};res.once('close',cancel);
  try{
  if(res.destroyed)controller.abort();
  const now=new Date(),day=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())).toISOString(),minute=new Date(Math.floor(now.getTime()/60000)*60000).toISOString();
  const actor=createHmac('sha256',process.env.GROQ_API_KEY!).update(day+':'+(req.ip||'unknown')).digest('hex');
  await this.cleanup();
  await this.db.transaction(async tx=>{
   for(const [scope,window,limit] of [['global-day',day,40],['global-minute',minute,2],['visitor-day:'+actor,day,5],['visitor-minute:'+actor,minute,1]] as const){
    const counter=await tx.query('INSERT INTO cotizador_ia_cuotas(scope,window_start,hits) VALUES($1,$2,1) ON CONFLICT(scope,window_start) DO UPDATE SET hits=cotizador_ia_cuotas.hits+1 WHERE cotizador_ia_cuotas.hits<$3 RETURNING hits',[scope,window,limit]);
    if(!counter.rows.length)throw new HttpException('Se alcanzó el límite de consultas gratuitas. Puedes continuar sin IA y volver más tarde.',429);
   }
  });
  if(controller.signal.aborted)throw new HttpException('Consulta cancelada. Tus respuestas no cambiaron.',503);
   const report=await requestGroqReport(project,controller.signal);
   return {id:randomUUID(),projectId:project.id,baseRevision:project.revision,provider:'groq',model:quoteAiConfig().model,generatedAt:new Date().toISOString(),report};
  }catch(error){if(error instanceof AiProviderError)throw new HttpException(error.message,error.status);throw error;}
  finally{res.off('close',cancel);}
 }
}
@Controller('api/quote-ai')
class QuoteAiController{
 constructor(@Inject(QuoteAiService)private ai:QuoteAiService){}
 @Get('config')config(){return quoteAiConfig();}
 @Post('analyze')analyze(@Req()req:Request,@Res({passthrough:true})res:Response,@Body()body:unknown){
  checkOrigin(req);const input=parse(aiRequestSchema,body);return this.ai.analyze(req,input.project,res);
 }
}
@Controller('api/billing/quote-ai')
@UseGuards(AdminGuard)
class AdminQuoteAiController{
 constructor(@Inject(QuoteAiService)private ai:QuoteAiService,@Inject(QuoteDraftsService)private drafts:QuoteDraftsService){}
 @Post('requests/:id/analyze')async formal(@Req()req:Request,@Res({passthrough:true})res:Response,@Param('id')id:string,@Body()body:unknown){
  checkOrigin(req);const input=parse(aiAdminRequestSchema,body);
  if(input.version!==1)throw new NotFoundException('Versión de solicitud no disponible.');
  return this.ai.analyze(req,await this.ai.formalRequest(id),res);
 }
 @Post(':id/analyze')async analyze(@Req()req:Request,@Res({passthrough:true})res:Response,@Param('id')id:string,@Body()body:unknown){
  checkOrigin(req);const input=parse(aiAdminRequestSchema,body);
  const snapshot=await this.drafts.adminRevision(id,String(input.version));
  return this.ai.analyze(req,snapshot.project,res);
 }
}
@Module({imports:[AuthModule,QuoteDraftsModule],providers:[QuoteAiService],controllers:[QuoteAiController,AdminQuoteAiController]})
export class QuoteAiModule{}

