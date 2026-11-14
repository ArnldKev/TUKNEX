// Keep identical in frontend/src/lib/quote and backend/src/domain/quote.
import {quoteFormSchema} from './form';
import {quoteScheduleIssue} from './schedule';
// The clock is evaluated for each validation, never frozen when the server starts.
export function createQuoteSubmissionSchema(now:()=>Date=()=>new Date()){
 return quoteFormSchema.superRefine((values,context)=>{
  const issue=quoteScheduleIssue(values,now());
  if(issue)context.addIssue({code:'custom',path:[issue.field],message:issue.message});
 });
}
export const quoteSubmissionSchema=createQuoteSubmissionSchema();
