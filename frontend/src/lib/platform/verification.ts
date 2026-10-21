export interface VerificationStatus {
  emailRequired:boolean;phoneRequired:boolean;emailAvailable:boolean;phoneAvailable:boolean;
  emailVerified:boolean;phoneVerified:boolean;profileComplete:boolean;email:string;phone:string;dniMasked:string;identityVerified:false;
}
export function canSaveQuote(status:VerificationStatus) {
  return (!status.emailRequired||status.emailVerified)&&(!status.phoneRequired||status.phoneVerified)&&(!(status.emailRequired||status.phoneRequired)||status.profileComplete);
}
