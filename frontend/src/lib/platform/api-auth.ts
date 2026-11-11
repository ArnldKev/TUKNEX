import { API_URL } from '../../config/api';
import { billingRequest, setBillingSession } from '../billing/api';
import type { AuthService, RegistrationInput, User } from './types';
export class ApiAuthService implements AuthService {
  private user: User | null=null;
  private epoch=0;
  private requests=new Set<AbortController>();
  private transition(){this.epoch++;for(const request of this.requests)request.abort();this.requests.clear();return this.epoch;}
  private current(token:number,signal:AbortSignal){if(token!==this.epoch||signal.aborted)throw new DOMException('La sesión cambió.','AbortError');}
  private async establish(path:string,input:unknown) {
    const token=this.transition(),request=new AbortController();this.requests.add(request);const signal=AbortSignal.any([request.signal,AbortSignal.timeout(20000)]);
    try{const {user}=await billingRequest<{user:User}>(path,{method:'POST',body:JSON.stringify(input),signal});
      this.current(token,signal);this.user=user;setBillingSession(user.role==='admin');return user;
    }finally{this.requests.delete(request);}
  }
  login(email:string,password:string) {return this.establish('auth/login',{email,password});}
  register(input:RegistrationInput) {return this.establish('auth/register',input);}
  async getCurrentUser(signal?:AbortSignal) {
    const token=this.epoch,request=new AbortController();this.requests.add(request);
    const combined=AbortSignal.any([request.signal,AbortSignal.timeout(10000),...(signal?[signal]:[])]);
    try{
      const response=await fetch(API_URL+'/api/auth/me',{credentials:'include',cache:'no-store',signal:combined});
      this.current(token,combined);
      if(response.status===401) {this.user=null;setBillingSession(false);return null;}
      if(!response.ok) throw new Error('No pudimos verificar tu sesión.');
      const current=await response.json() as User;this.current(token,combined);this.user=current;setBillingSession(current.role==='admin');return current;
    }finally{this.requests.delete(request);}
  }
  async logout() {
    const token=this.transition(),request=new AbortController();this.requests.add(request);this.user=null;setBillingSession(false);
    try{await fetch(API_URL+'/api/auth/logout',{method:'POST',credentials:'include',signal:AbortSignal.any([request.signal,AbortSignal.timeout(5000)])}).catch(()=>{});
      if(token===this.epoch&&!request.signal.aborted&&typeof window!=='undefined')window.dispatchEvent(new Event('account-expired'));
    }finally{this.requests.delete(request);}
  }
  async resetPassword(): Promise<string> {throw new Error('La recuperación por correo aún no está configurada. Contacta con TUKNEX para recuperar tu acceso.');}
  hasRole(role:'client'|'admin'|'subadmin') {return this.user?.role===role;}
}
export const apiAuthService=new ApiAuthService();
