import { API_URL } from '../../config/api';
import { billingLogout, billingRequest, setBillingSession } from '../billing/api';
import type { AuthService, RegistrationInput, User } from './types';
export class ApiAuthService implements AuthService {
  private user: User | null=null;
  private async establish(path:string,input:unknown) {
    const {user}=await billingRequest<{user:User}>(path,{method:'POST',body:JSON.stringify(input)});
    this.user=user;setBillingSession(user.role==='admin');return user;
  }
  login(email:string,password:string) {return this.establish('auth/login',{email,password});}
  register(input:RegistrationInput) {return this.establish('auth/register',input);}
  async getCurrentUser() {
    const response=await fetch(API_URL+'/api/auth/me',{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(response.status===401) {this.user=null;setBillingSession(false);return null;}
    if(!response.ok) throw new Error('No pudimos verificar tu sesión.');
    this.user=await response.json() as User;setBillingSession(this.user.role==='admin');return this.user;
  }
  async logout() {await billingLogout();this.user=null;}
  async resetPassword(): Promise<string> {throw new Error('La recuperación por correo aún no está configurada. Contacta con TUKNEX para recuperar tu acceso.');}
  hasRole(role:'client'|'admin') {return this.user?.role===role;}
}
export const apiAuthService=new ApiAuthService();
