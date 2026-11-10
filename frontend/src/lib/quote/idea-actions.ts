import {aiSuggestion,type AiOrganizedEnvelope} from './ai';
import {ideaOriginal,protectedIdeaDetails,validateOrganizedIdea,type OrganizedIdea} from './idea';
import {redactAiText} from './ai';
import type {ProjectChange,ProjectSuggestion,QuoteProject} from './project';
export function organizedIdeaSuggestion(project:QuoteProject,envelope:AiOrganizedEnvelope,reviewed:OrganizedIdea,selected:number[],now=new Date().toISOString()):ProjectSuggestion{
 if(envelope.projectId!==project.id||envelope.baseRevision!==project.revision)throw Error('La idea cambió. Solicita una interpretación nueva.');
 const original=ideaOriginal(project.answers),redacted=Object.fromEntries(Object.entries(original).map(([key,value])=>[key,redactAiText(value)])) as typeof original;
 const validated=validateOrganizedIdea(reviewed,redacted);
 let working=project;const change:ProjectChange={answers:{approvedIdea:{id:envelope.id,sourceProjectId:project.id,sourceRevision:project.revision,approvedAt:now,original:redacted,reviewed:validated,protectedDetails:protectedIdeaDetails(redacted)}}};
 for(const index of [...new Set(selected)]){
  const item=envelope.report.suggestions[index];if(!item)throw Error('La sugerencia no está disponible.');
  const suggestion=aiSuggestion(working,item);
  change.answers={...change.answers,...suggestion.change.answers};
  if(suggestion.change.visual)change.visual={...change.visual,...suggestion.change.visual};
  working={...working,answers:{...working.answers,...suggestion.change.answers},visual:{...working.visual,...suggestion.change.visual}};
 }
 return {id:envelope.id,projectId:project.id,baseRevision:project.revision,reason:'Interpretación de NEXI revisada y aprobada explícitamente; respuestas originales conservadas.',evidenceFields:['offering','problem'],change};
}
