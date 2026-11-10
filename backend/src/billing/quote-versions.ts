import {ConflictException} from '@nestjs/common';
import type {Sql} from '../database/database';
import type {BillingQuote} from '../domain/billing/types';
function canonical(value:unknown):string{if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';return JSON.stringify(value);}
export async function saveQuoteVersion(tx:Sql,quote:BillingQuote,actorId?:string){
 const previous=(await tx.query('SELECT datos FROM cotizacion_versiones WHERE cotizacion_id=$1 AND version=$2',[quote.id,quote.version])).rows[0];
 if(previous){if(canonical(previous.datos)!==canonical(quote))throw new ConflictException('La revisión guardada no coincide con esta cotización.');return;}
 await tx.query('INSERT INTO cotizacion_versiones(cotizacion_id,version,datos,actor_id) VALUES($1,$2,$3,$4)',[quote.id,quote.version,JSON.stringify(quote),actorId||null]);
}
