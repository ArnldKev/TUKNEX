import { Body, Controller, Get, Inject, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { Database } from '../database/database';
import { parse } from '../billing/dto';
import { AdminGuard } from '../auth/auth';
import { AuthModule } from '../auth/auth.module';
@Controller('api/public/contact')
class ContactController {
  constructor(@Inject(Database) private db:Database) {}
  @Post() async create(@Body() body:unknown) {
    const input=parse(z.object({name:z.string().trim().min(2).max(80),email:z.string().trim().toLowerCase().pipe(z.email().max(254)),message:z.string().trim().min(10).max(2000),consent:z.literal(true),website:z.string().max(300).optional()}).strict(),body);
    if(input.website)return {accepted:true}; // Honeypot: do not store automated submissions.
    const id=randomUUID();
    await this.db.query('INSERT INTO mensajes_contacto(id,nombre,correo,mensaje) VALUES($1,$2,$3,$4)',[id,input.name,input.email,input.message]);
    return {accepted:true};
  }
}
@Controller('api/billing/contact-messages')
@UseGuards(AdminGuard)
class ContactInboxController {
  constructor(@Inject(Database) private db:Database) {}
  @Get() async list() {return (await this.db.query('SELECT id,nombre AS name,correo AS email,mensaje AS message,estado AS status,created_at AS "createdAt" FROM mensajes_contacto ORDER BY created_at DESC LIMIT 500')).rows;}
  @Patch(':id') async status(@Param('id') id:string,@Body() body:unknown) {
    parse(z.uuid(),id);const {status}=parse(z.object({status:z.enum(['new','reviewed','closed'])}).strict(),body);
    await this.db.query('UPDATE mensajes_contacto SET estado=$2 WHERE id=$1',[id,status]);return {ok:true};
  }
}
@Module({imports:[AuthModule],controllers:[ContactController,ContactInboxController]})
export class ContactModule {}
