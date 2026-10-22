import { Body, Controller, Get, Inject, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { SessionGuard, type Account } from './auth';
import { VerificationService } from './verification';
import { parse } from '../billing/dto';
@Controller('api/auth/verification')
@UseGuards(SessionGuard)
export class VerificationController {
  constructor(@Inject(VerificationService) private verification:VerificationService) {}
  @Get() status(@Req() req:Request&{account:Account}) {return this.verification.status(req.account.id);}
  @Post('send') send(@Req() req:Request&{account:Account},@Body() body:unknown) {
    const input=parse(z.object({channel:z.enum(['email','phone'])}).strict(),body);
    return this.verification.start(req.account.id,input.channel);
  }
  @Post('confirm') confirm(@Req() req:Request&{account:Account},@Body() body:unknown) {return this.verification.confirm(req.account.id,body);}
  @Patch('profile') profile(@Req() req:Request&{account:Account},@Body() body:unknown) {return this.verification.completeProfile(req.account.id,body);}
}
