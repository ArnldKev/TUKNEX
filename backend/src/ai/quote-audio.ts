import {Body,Controller,ForbiddenException,Get,HttpException,Inject,Injectable,Module,Post,Req,Res,UploadedFile,UseInterceptors,UseGuards,CanActivate,ExecutionContext} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import type {Request,Response} from 'express';
import {createHmac} from 'node:crypto';
import {Database} from '../database/database';
import {parse} from '../billing/dto';
import {quoteAiConfig} from './quote-ai';
import {AiProviderError} from './groq';
import {AUDIO_POLICY_VERSION,AUDIO_MAX_BYTES,AUDIO_MAX_SECONDS,audioPermissionSchema,audioTextRequestSchema} from '../domain/quote/audio';
import {transcribeAudio,organizeAudio,validateAudioFile,AUDIO_MODEL} from './groq-audio';
export function audioConfig(){return {enabled:quoteAiConfig().enabled&&process.env.NEXI_AUDIO_ENABLED==='true'&&(process.env.NEXI_AUDIO_MODEL||AUDIO_MODEL)===AUDIO_MODEL,policyVersion:AUDIO_POLICY_VERSION,maxSeconds:AUDIO_MAX_SECONDS,maxBytes:AUDIO_MAX_BYTES,perVisitorDailyLimit:5};}
@Injectable()
class AudioAccess implements CanActivate{
 canActivate(context:ExecutionContext){
  const req=context.switchToHttp().getRequest<Request>();
  const allowed=(process.env.CORS_ORIGINS||'http://127.0.0.1:3000,http://localhost:3000').split(',').map(s=>s.trim());
  if(!req.headers.origin||!allowed.includes(req.headers.origin))throw new ForbiddenException('Origen no autorizado.');
  if(!audioConfig().enabled)throw new HttpException('Las respuestas por audio todavía no están activadas. Puedes escribir.',503);
  return true;
 }
}
@Injectable()
export class QuoteAudioService{
 constructor(@Inject(Database)private db:Database){}
 async run<T>(req:Request,res:Response,action:'transcribe'|'organize',operation:(signal:AbortSignal)=>Promise<T>){
  const controller=new AbortController(),cancel=()=>{if(!res.writableEnded)controller.abort();};res.once('close',cancel);if(res.destroyed)cancel();
  try{
   const now=new Date(),day=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())).toISOString(),minute=new Date(Math.floor(now.getTime()/60000)*60000).toISOString();
   const actor=createHmac('sha256',process.env.GROQ_API_KEY!).update(day+':'+(req.ip||'unknown')).digest('hex');
   await this.db.transaction(async tx=>{
    for(const [scope,window,limit] of [['global-day',day,20],['global-minute',minute,2],['visitor-day:'+actor,day,5],['visitor-minute:'+actor,minute,1]] as const){
     const r=await tx.query('INSERT INTO cotizador_ia_cuotas(scope,window_start,hits) VALUES($1,$2,1) ON CONFLICT(scope,window_start) DO UPDATE SET hits=cotizador_ia_cuotas.hits+1 WHERE cotizador_ia_cuotas.hits<$3 RETURNING hits',['audio:'+action+':'+scope,window,limit]);
     if(!r.rows.length)throw new HttpException('Se alcanzó el límite gratuito de audio. Puedes continuar escribiendo y volver más tarde.',429);
    }
   });
   if(controller.signal.aborted)throw new HttpException('Consulta de audio cancelada.',503);
   return await operation(controller.signal);
  }catch(e){if(e instanceof AiProviderError)throw new HttpException(e.message,e.status);throw e;}
  finally{res.off('close',cancel);}
 }
}
@Controller('api/quote-ai/audio')
export class QuoteAudioController{
 constructor(@Inject(QuoteAudioService)private audio:QuoteAudioService){}
 @Get('config')config(){return audioConfig();}
 @Post('transcribe')
 @UseGuards(AudioAccess)
 @UseInterceptors(FileInterceptor('file',{limits:{fileSize:AUDIO_MAX_BYTES,files:1,fields:3,parts:4,fieldSize:100}}))
 async transcribe(@Req()req:Request,@Res({passthrough:true})res:Response,@Body()body:unknown,@UploadedFile()file?:Express.Multer.File){
  parse(audioPermissionSchema,body);
  try{validateAudioFile(file);return await this.audio.run(req,res,'transcribe',signal=>transcribeAudio(file!,signal));}
  catch(e){if(e instanceof AiProviderError)throw new HttpException(e.message,e.status);throw e;}
  finally{if(file)file.buffer=Buffer.alloc(0);}
 }
 @Post('organize')
 @UseGuards(AudioAccess)
 organize(@Req()req:Request,@Res({passthrough:true})res:Response,@Body()body:unknown){
  const input=parse(audioTextRequestSchema,body);return this.audio.run(req,res,'organize',signal=>organizeAudio(input.field,input.text,signal));
 }
}
@Module({providers:[QuoteAudioService,AudioAccess],controllers:[QuoteAudioController]})
export class QuoteAudioModule{}

