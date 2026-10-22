export const opinionSubjects = {application:'La página y la aplicación',service:'El servicio de TUKNEX'} as const;
export type OpinionSubject = keyof typeof opinionSubjects;
export type OpinionStatus = 'pending'|'published'|'rejected';
export interface PublicOpinion {
  id:string; subject:OpinionSubject; rating:number; title:string; comment:string;
  displayName:string; businessReply:string; createdAt:string; updatedAt:string;
}
export interface Opinion extends PublicOpinion {
  status:OpinionStatus; displayConsent:boolean; moderationNote:string; revision:number;
  accountName?:string;
}
export const opinionStatusLabels:Record<OpinionStatus,string>={pending:'En revisión',published:'Publicada',rejected:'Requiere cambios'};
