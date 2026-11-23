import {
  Body, BadRequestException, CanActivate, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch,
  Inject, Injectable, Post, Req, Res, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Database, type Sql } from '../database/database';
import { z } from 'zod';
import { parse } from '../billing/dto';
import { credentials, clientRegistration } from './account-fields';
import { VerificationService } from './verification';
import {allowedClientIds} from './client-access';
import { activityContext } from './activity-context';
import { assertActiveOwner } from './owner-access';
import { derivePassword as derive, hashPassword as passwordHash } from './passwords';

type Role = 'admin' | 'client' | 'subadmin';
export interface Account { id: string; name: string; email: string; role: Role; clientId: string | null; allowedClientIds?:string[]; isDemo: false; createdAt: string; phone?: string; emailVerified?: boolean; phoneVerified?: boolean; profileComplete?: boolean; active?: boolean; isOwner?: boolean }
type AuthRequest = Request & { account?: Account };
const registration = credentials;
const loginSchema = z.object({ email: credentials.shape.email, password: z.string().min(1).max(128) }).strict();
const managedAccount = credentials.extend({ role: z.enum(['client','admin','subadmin']), clientId: z.uuid().optional() }).strict();
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const cookieName = 'tuknex_session';
function account(row: Record<string, any>): Account {
  return { id: row.id, name: row.nombre, email: row.correo, role: row.rol, clientId: row.cliente_id, isDemo: false, active: !!row.activo, isOwner: !!row.is_owner, createdAt: new Date(row.created_at).toISOString(), phone:row.telefono||'',emailVerified:!!row.email_verified_at,phoneVerified:!!row.phone_verified_at,profileComplete:!!(row.telefono&&row.dni) };
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
    return {id,name:input.name,email:input.email,role,clientId,isDemo:false as const,active:true,isOwner:false,createdAt,phone:input.phone||'',emailVerified:false,phoneVerified:false,profileComplete:!!(input.phone&&input.dni)};
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
    if(!row)return null;const identity=account(row);if(identity.role==='client')identity.allowedClientIds=await allowedClientIds(this.db,identity);return identity;
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
  async users() { return (await this.db.query('SELECT id,nombre,correo,rol,cliente_id,created_at,telefono,dni,email_verified_at,phone_verified_at,activo,is_owner FROM usuarios ORDER BY created_at DESC')).rows.map(account); }
  private async auditAccount(tx: Sql, actor: Account, targetId: string, action: string, data: Record<string, unknown>) {
    await tx.query('INSERT INTO auditoria(id,accion,entidad_id,datos,actor_id,actor_nombre,actor_rol) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [randomUUID(), action, targetId, JSON.stringify(data), actor.id, actor.name, actor.role]);
  }
  async createManagedUser(actor: Account, value: unknown) {
    const input = parse(managedAccount, value);
    if (input.clientId && input.role !== 'client') throw new BadRequestException('Solo una cuenta de cliente puede vincularse a una ficha comercial.');
    // Authorize before the expensive password hash; recheck under lock when writing.
    await assertActiveOwner(this.db, actor, false);
    const hash = await passwordHash(input.password);
    try {
      return await this.db.transaction(async tx => {
        await assertActiveOwner(tx, actor);
        let clientId: string | null = input.clientId || null;
        if (input.role === 'client') {
          if (clientId) {
            const client = (await tx.query('SELECT id FROM clientes WHERE id=$1 FOR UPDATE', [clientId])).rows[0];
            if (!client) throw new NotFoundException('No encontramos esa ficha de cliente.');
            const linked = (await tx.query('SELECT id FROM usuarios WHERE cliente_id=$1 UNION ALL SELECT usuario_id AS id FROM cliente_cuenta_asociaciones WHERE cliente_id=$1 AND activo=true', [clientId])).rows;
            if (linked.length) throw new ConflictException('Esa ficha de cliente ya tiene una cuenta vinculada.');
          } else {
            const existing = (await tx.query('SELECT id FROM clientes WHERE lower(trim(correo))=$1 LIMIT 1', [input.email])).rows[0];
            if (existing) throw new ConflictException('Ya existe una ficha comercial con ese correo. Selecciona el cliente existente para darle acceso sin duplicarlo.');
            clientId = randomUUID();
            const client = { id: clientId, name: input.name, taxId: '', phone: '', email: input.email, address: '', isDemo: false, createdAt: new Date().toISOString() };
            await tx.query("INSERT INTO clientes(id,nombre,correo,es_demo,datos,telefono,documento) VALUES($1,$2,$3,false,$4,'','')", [clientId,input.name,input.email,JSON.stringify(client)]);
          }
        }
        const row = (await tx.query('INSERT INTO usuarios(id,nombre,correo,password_hash,rol,cliente_id,is_owner) VALUES($1,$2,$3,$4,$5,$6,false) RETURNING *', [randomUUID(),input.name,input.email,hash,input.role,clientId])).rows[0];
        await this.auditAccount(tx, actor, row.id, 'cuenta_creada', { role: input.role, clientId, linkedExistingClient: !!input.clientId });
        return account(row);
      });
    } catch (error: any) {
      if (error.code === '23505') throw new ConflictException('Ese correo o cliente ya tiene una cuenta. No se creó ningún duplicado.');
      throw error;
    }
  }
  async managedUserStatus(actor: Account, id: string, value: unknown) {
    parse(z.uuid(), id);
    const { active } = parse(z.object({ active: z.boolean() }).strict(), value);
    return this.db.transaction(async tx => {
      await assertActiveOwner(tx, actor);
      const target = (await tx.query('SELECT * FROM usuarios WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!target) throw new NotFoundException('Cuenta no encontrada.');
      if (target.is_owner || id === actor.id) throw new ForbiddenException('La cuenta del administrador principal está protegida.');
      if (target.activo === active) return account(target);
      const row = (await tx.query('UPDATE usuarios SET activo=$2 WHERE id=$1 RETURNING *', [id, active])).rows[0];
      if (!active) {
        await tx.query('DELETE FROM sesiones WHERE usuario_id=$1', [id]);
        await tx.query('UPDATE verificaciones SET consumed_at=now() WHERE usuario_id=$1 AND consumed_at IS NULL', [id]);
      }
      await this.auditAccount(tx, actor, id, active ? 'cuenta_activada' : 'cuenta_suspendida', { active });
      return account(row);
    });
  }
  async inviteManagedUser(actor: Account, id: string) {
    parse(z.uuid(), id);
    const result = await this.verification.start(id, 'recovery', async tx => {
      await assertActiveOwner(tx, actor);
      await this.auditAccount(tx, actor, id, 'acceso_por_correo_solicitado', { method: 'recovery-code' });
    });
    return { ...result, message: 'El proveedor aceptó el correo con un código de acceso. La persona debe abrir Recuperar acceso y usarlo para elegir su contraseña. El código caduca en 10 minutos.' };
  }
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
    const activity=activityContext.getStore();if(activity)activity.actor=user;
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
@Injectable()
export class OwnerGuard extends AdminGuard {
  constructor(@Inject(AuthService) auth: AuthService) { super(auth); }
  async canActivate(context: any) {
    await super.canActivate(context);
    if (!context.switchToHttp().getRequest().account.isOwner) throw new ForbiddenException('Solo el administrador principal gestiona las cuentas.');
    return true;
  }
}
@Injectable()
export class TeamGuard extends SessionGuard {
  constructor(@Inject(AuthService) auth: AuthService) {super(auth);}
  async canActivate(context:any) {
    await super.canActivate(context);
    if(!['admin','subadmin'].includes(context.switchToHttp().getRequest().account.role))throw new ForbiddenException('Esta operación requiere una cuenta del equipo.');
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
  @Post('users') @UseGuards(OwnerGuard) createUser(@Req() req: AuthRequest, @Body() body: unknown) {return this.auth.createManagedUser(req.account!, body);}
  @Patch('users/:id/status') @UseGuards(OwnerGuard) userStatus(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) {return this.auth.managedUserStatus(req.account!, id, body);}
  @Post('users/:id/invitation') @UseGuards(OwnerGuard) inviteUser(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) {parse(z.object({}).strict(), body);return this.auth.inviteManagedUser(req.account!, id);}
}
