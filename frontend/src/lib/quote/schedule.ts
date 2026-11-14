// Keep identical in frontend/src/lib/quote and backend/src/domain/quote.
// A saved project is historical data; apply these rules only when advancing/submitting a new request.
export const QUOTE_TIME_ZONE='America/Lima';
const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:QUOTE_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
export type QuoteSchedule={launchDate:string;hardDeadline:boolean};
export type QuoteScheduleIssue={field:'launchDate';code:'required'|'calendar'|'past';message:string};
export function quoteToday(now:Date=new Date()):string{
 if(!Number.isFinite(now.getTime()))throw new Error('Fecha de referencia no válida.');
 const parts=dateFormat.formatToParts(now);
 const part=(type:string)=>parts.find(item=>item.type===type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
export function isQuoteCalendarDate(value:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [year,month,day]=value.split('-').map(Number);
 if(year<1||month<1||month>12||day<1||day>31)return false;
 const date=new Date(0);date.setUTCFullYear(year,month-1,day);date.setUTCHours(0,0,0,0);
 return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}
export function quoteScheduleIssue(values:QuoteSchedule,now:Date=new Date()):QuoteScheduleIssue|null{
 if(!values.launchDate)return values.hardDeadline?{field:'launchDate',code:'required',message:'Indica la fecha límite que necesitas o desmarca la fecha límite.'}:null;
 if(!isQuoteCalendarDate(values.launchDate))return {field:'launchDate',code:'calendar',message:'Selecciona una fecha válida.'};
 if(values.launchDate<quoteToday(now))return {field:'launchDate',code:'past',message:'La fecha no puede estar en el pasado. Usa la fecha actual o una posterior, según la hora de Perú.'};
 return null;
}
// String formatting avoids shifting a calendar date to the previous day in another timezone.
export function formatQuoteLaunchDate(value:string):string{
 if(!isQuoteCalendarDate(value))return value;
 const [year,month,day]=value.split('-');return `${day}/${month}/${year}`;
}
