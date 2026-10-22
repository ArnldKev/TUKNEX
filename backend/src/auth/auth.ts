import {
  Body, CanActivate, ConflictException, Controller, ForbiddenException, Get,
  Inject, Injectable, Post, Req, Res, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Database, type Sql } from '../database/database';
import { z } from 'zod';
import { parse } from '../billing/dto';
import { credentials, clientRegistration } from './account-fields';
import { VerificationService } from './verification';
import { derivePassword as derive, hashPassword as passwordHash } from './passwords';

type Role = 'admin' | 'client';
export interface Account { id: string; name: string; email: string; role: Role; clientId: string | null; isDemo: false; createdAt: string; phone?: string; emailVerified?: boolean; phoneVerified?: boolean; profileComplete?: boolean }
type AuthRequest = Request & { account?: Account };
const registration = credentials;
const loginSchema = z.object({ email: z.email().trim().toLowerCase().max(254), password: z.string().min(1).max(128) }).strict();
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const cookieName = 'tuknex_session';
function account(row: Record<string, any>): Account {
  return { id: row.id, name: row.nombre, email: row.correo, role: row.rol, clientId: row.cliente_id, isDemo: false, createdAt: new Date(row.created_at).toISOString(), phone:row.telefono||'',emailVerified:!!row.email_verified_at,phoneVerified:!!row.phone_verified_at,profileComplete:!!(row.telefono&&row.dni) };
}
export function requestToken(req: Request) {
  if (req.headers.authorization?.startsWith('Bearer ')) return req.headers.authorization.slice(7);
  return (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';
}
function assertOrigin(req: Request) {
  const allowed = (process.env.CORS_ORIGINS || 'http://127.0.0.1:3000,http://localhost:3000').split(',').map(s => s.trim());
  if (req.headers.origin && !allowed.includes(req.headers.origin)) throw new ForbiddenException('Origen no autorizado.');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !req.headers.authorization && req.headers.cookie && !req.headers.origin)
    throw new ForbiddenException('La solicitud debe indicar su origen.');
}
@Injectable()
export class AuthService {
  constructor(@Inject(Database) private db: Database,@Inject(VerificationService) private verification:VerificationService) {}
  private async insertUser(tx: Sql, input: z.infer<typeof registration> & {phone?:string;dni?:string;privacyConsent?:boolean}, role: Role) {
    const id = randomUUID(), createdAt = new Date().toISOString();
    let clientId: string | null = null;
    if (role === 'client') {
      clientId = randomUUID();
      const client = { id: clientId, name: input.name, taxId: input.dni||'', phone: input.phone||'', email: input.email, address: '', isDemo: false, createdAt };
      await tx.query('INSERT INTO clientes(id,nombre,correo,es_demo,datos,telefono,documento) VALUES($1,$2,$3,false,$4,$5,$6)', [clientId, input.name, input.email, JSON.stringify(client),input.phone||'',input.dni||'']);
    }
    await tx.query('INSERT INTO usuarios(id,nombre,correo,password_hash,rol,cliente_id,telefono,dni,privacy_accepted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id,input.name,input.email,await passwordHash(input.password),role,clientId,input.phone||'',input.dni||'',input.privacyConsent?createdAt:null]);
    return {id,name:input.name,email:input.email,role,clientId,isDemo:false as const,createdAt,phone:input.phone||'',emailVerified:false,phoneVerified:false,profileComplete:!!(input.phone&&input.dni)};
  }
  private async session(user: Account) {
    const token = randomBytes(32).toString('base64url');
    await this.db.query('DELETE FROM sesiones WHERE expires_at < now()');
    await this.db.query("INSERT INTO sesiones(token_hash,usuario_id,expires_at) VALUES($1,$2,$3)", [digest(token),user.id,new Date(Date.now()+8*3600000).toISOString()]);
    return {user, token};
  }
  async register(value: unknown) {
    const input = parse(clientRegistration, value);
    try { return this.session(await this.db.transaction(tx => this.insertUser(tx,input,'client'))); }
    catch (error: any) { if(error.code==='23505') throw new ConflictException('No se pudo registrar este correo. Si ya tienes una cuenta, inicia sesión.'); throw error; }
  }
  async login(value: unknown) {
    const input = parse(loginSchema,value);
    const row = (await this.db.query('SELECT * FROM usuarios WHERE correo=$1 AND activo=true',[input.email])).rows[0];
    const parts = String(row?.password_hash || 'scrypt-v1$00000000000000000000000000000000$'+'0'.repeat(128)).split('$');
    const key=await derive(input.password,parts[1]);
    if (!row || !timingSafeEqual(key,Buffer.from(parts[2],'hex'))) throw new UnauthorizedException('Correo o contraseña incorrectos.');
    return this.session(account(row));
  }
  async validate(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const row=(await this.db.query('SELECT u.* FROM sesiones s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.activo=true',[digest(token)])).rows[0];
    return row ? account(row) : null;
  }
  async logout(token: string) { await this.db.query('DELETE FROM sesiones WHERE token_hash=$1',[digest(token)]); }
  async requestRecovery(value:unknown) {
    const {email}=parse(z.object({email:z.string().trim().toLowerCase().pipe(z.email().max(254))}).strict(),value);
    const user=(await this.db.query('SELECT id FROM usuarios WHERE correo=$1 AND activo=true',[email])).rows[0];
    // Same public response whether an address is registered or delivery fails.
    if(user){try{await this.verification.start(user.id,'recovery');}catch{}}
    return {message:'Si el correo está registrado y el envío está disponible, recibirás un código. Revisa también spam.'};
  }
  async finishRecovery(value:unknown) {
    const {email,code,password}=parse(z.object({email:z.string().trim().toLowerCase().pipe(z.email().max(254)),code:z.string().regex(/^\d{6}$/),password:z.string().min(12).max(128)}).strict(),value);
    return this.verification.recover(email,code,await passwordHash(password));
  }
  async users() { return (await this.db.query('SELECT id,nombre,correo,rol,cliente_id,created_at,telefono,dni,email_verified_at,phone_verified_at FROM usuarios ORDER BY created_at DESC')).rows.map(account); }
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) protected auth: AuthService) {}
  async canActivate(context: any) {
    const req=context.switchToHttp().getRequest() as AuthRequest;
    assertOrigin(req);
    const user=await this.auth.validate(requestToken(req));
    if(!user) throw new UnauthorizedException('Inicia sesión para continuar.');
    req.account=user;
    return true;
  }
}
@Injectable()
export class AdminGuard extends SessionGuard {
  constructor(@Inject(AuthService) auth: AuthService) { super(auth); }
  async canActivate(context: any) {
    await super.canActivate(context);
    if(context.switchToHttp().getRequest().account.role!=='admin') throw new ForbiddenException('Esta operación requiere una cuenta administradora.');
    return true;
  }
}
@Controller('api/auth')
export class AuthController {
  constructor(@Inject(AuthService) private auth: AuthService) {}
  private respond(result: {user: Account;token: string},res: Response) {
    const secure=process.env.NODE_ENV==='production';
    const sameSite=process.env.SESSION_SAMESITE==='none' && secure ? 'none' : 'lax';
    res.cookie(cookieName,result.token,{httpOnly:true,secure,sameSite,path:'/api',maxAge:8*3600000});
    return {user:result.user,expiresIn:28800};
  }
  @Post('register') async register(@Body() body: unknown,@Req() req: Request,@Res({passthrough:true}) res: Response) {assertOrigin(req);return this.respond(await this.auth.register(body),res);}
  @Post('login') async login(@Body() body: unknown,@Req() req: Request,@Res({passthrough:true}) res: Response) {assertOrigin(req);return this.respond(await this.auth.login(body),res);}
  @Post('recovery/request') async requestRecovery(@Body() body:unknown,@Req() req:Request) {assertOrigin(req);return this.auth.requestRecovery(body);}
  @Post('recovery/confirm') async finishRecovery(@Body() body:unknown,@Req() req:Request) {assertOrigin(req);return this.auth.finishRecovery(body);}
  @Get('me') @UseGuards(SessionGuard) me(@Req() req: AuthRequest) {return req.account;}
  @Post('logout') @UseGuards(SessionGuard) async logout(@Req() req: Request,@Res({passthrough:true}) res: Response) {await this.auth.logout(requestToken(req));res.clearCookie(cookieName,{path:'/api'});return {ok:true};}
  @Get('users') @UseGuards(AdminGuard) users() {return this.auth.users();}
}
