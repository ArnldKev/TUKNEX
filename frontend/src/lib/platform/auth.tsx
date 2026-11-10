'use client';

import Link from 'next/link';
import { DEMO_MODE } from '../../config/environment';
import { apiAuthService } from './api-auth';
import {AuthRequestScope} from './auth-request-scope';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { platformRepository } from './repository';
import type { AuthService, RegistrationInput, User, UserRole } from './types';

export const DEMO_SESSION_KEY = 'tuknex-demo-session';
export const DEMO_PASSWORD = 'Demo123!';
export class MockAuthService implements AuthService {
  private user: User | null = null;
  async login(email: string, password: string) {
    const role =
      email.trim().toLowerCase() === 'cliente@demo.tuknex'
        ? 'client'
        : email.trim().toLowerCase() === 'admin@demo.tuknex'
          ? 'admin'
          : null;
    if (!role || password !== DEMO_PASSWORD)
      throw new Error('Usa las credenciales de ejemplo o los botones de acceso demo.');
    return this.loginDemo(role);
  }
  async loginDemo(role: UserRole) {
    if (!DEMO_MODE) throw new Error('El acceso de demostración está desactivado.');
    if (role !== 'client' && role !== 'admin') throw new Error('Elige un rol de demostración válido.');
    const user = platformRepository
      .getSnapshot()
      .users.find((u) => u.id === (role === 'admin' ? 'admin-demo' : 'client-demo'));
    if (!user) throw new Error('No pudimos cargar el usuario de demostración.');
    this.user = { ...user, role };
    this.persistIdentity();
    return this.user;
  }
  async register(input: { name: string; email: string; password: string }) {
    if (!DEMO_MODE) throw new Error('El acceso de demostración está desactivado.');
    if (
      input.name.trim().length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
      input.password.length < 8
    )
      throw new Error('Revisa el nombre, el correo de ejemplo y una contraseña de al menos 8 caracteres.');
    this.user = platformRepository.createUser({ name: input.name, email: input.email, role: 'client' });
    this.persistIdentity();
    return this.user;
  }
  private persistIdentity() {
    if (typeof window !== 'undefined' && this.user) {
      try {
        sessionStorage.setItem(
          DEMO_SESSION_KEY,
          JSON.stringify({ userId: this.user.id, role: this.user.role }),
        );
      } catch {
        /* The in-memory demonstration remains usable. */
      }
    }
  }
  async logout() {
    this.user = null;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(DEMO_SESSION_KEY);
      } catch {
        /* Session storage is optional. */
      }
    }
  }
  async getCurrentUser(_signal?:AbortSignal) {
    void _signal;
    if (!DEMO_MODE) return null;
    if (this.user) return this.user;
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(DEMO_SESSION_KEY);
      if (!raw) return null;
      const identity = JSON.parse(raw) as { userId?: string; role?: UserRole };
      if (!['client', 'admin'].includes(identity.role || '')) {
        sessionStorage.removeItem(DEMO_SESSION_KEY);
        return null;
      }
      const role = identity.role as UserRole;
      const stored = platformRepository.getSnapshot().users.find((u) => u.id === identity.userId);
      this.user = stored
        ? { ...stored, role }
        : platformRepository.getSnapshot().users.find((u) => u.id === `${role}-demo`) || null;
      this.persistIdentity();
      return this.user;
    } catch {
      return null;
    }
  }
  async resetPassword(email: string) {
    if (!DEMO_MODE) throw new Error('El acceso de demostración está desactivado.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Escribe un correo de ejemplo válido.');
    return 'Solicitud simulada. No se envió ningún correo. La recuperación real estará disponible al conectar el backend.';
  }
  hasRole(role: UserRole) {
    return this.user?.role === role;
  }
}
export const demoAuthService = new MockAuthService();
const activeAuth = DEMO_MODE ? demoAuthService : apiAuthService;
interface DemoAuthContextValue {
  user: User | null; ready: boolean; error: string;
  loginDemo(role: UserRole): Promise<void>;
  login(email: string,password: string): Promise<User>;
  register(input: RegistrationInput): Promise<User>;
  logout(): Promise<void>;
  resetPassword(email:string): Promise<string>;
  hasRole(role:UserRole): boolean;
}
const DemoAuthContext=createContext<DemoAuthContextValue|null>(null);
export function DemoAuthProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[error,setError]=useState('');
  const scope=useRef(new AuthRequestScope());
  useEffect(()=>{
    const requests=scope.current;requests.activate();
    const verify=(initial=false)=>{
      const ticket=requests.verification();if(!ticket)return;
      void activeAuth.getCurrentUser(ticket.signal).then(current=>{if(requests.current(ticket.token)){setUser(current);setError('');}})
        .catch(()=>{if(initial&&requests.current(ticket.token)&&!ticket.signal.aborted)setError('No se pudo conectar con el servidor. Comprueba que el backend esté encendido y vuelve a cargar.');})
        .finally(()=>{if(requests.current(ticket.token))setReady(true);});
    };
    verify(true);
    const expired=(event:Event)=>{if(requests.isTransitioning())return;requests.invalidate();setUser(null);setReady(true);if((event as CustomEvent<{reason?:string}>).detail?.reason==='expired')setError('Tu sesión ha caducado. Inicia sesión para continuar.');};
    const refresh=()=>verify();
    window.addEventListener('account-expired',expired);window.addEventListener('focus',refresh);window.addEventListener('account-updated',refresh);
    return ()=>{requests.dispose();window.removeEventListener('account-expired',expired);window.removeEventListener('focus',refresh);window.removeEventListener('account-updated',refresh);};
  },[]);
  async function establish(action:()=>Promise<User>){
    const token=scope.current.beginTransition();setUser(null);setReady(false);setError('');
    try{const current=await action();if(!scope.current.finishTransition(token))throw new Error('La sesión cambió mientras se comprobaba el acceso.');setUser(current);return current;}
    finally{if(scope.current.current(token)){scope.current.finishTransition(token);setReady(true);}}
  }
  return <DemoAuthContext.Provider value={{user,ready,error,
    loginDemo:role=>{if(!DEMO_MODE)return Promise.reject(new Error('El acceso demo está desactivado.'));return establish(()=>demoAuthService.loginDemo(role)).then(()=>undefined);},
    login:(email,password)=>establish(()=>activeAuth.login(email,password)),
    register:input=>establish(()=>activeAuth.register(input)),
    logout:async()=>{const token=scope.current.beginTransition();setUser(null);setError('');setReady(false);try{await activeAuth.logout();}finally{if(scope.current.finishTransition(token))setReady(true);}},
    resetPassword:email=>activeAuth.resetPassword(email),hasRole:role=>user?.role===role,
  }}>{children}</DemoAuthContext.Provider>;
}

export function useDemoAuth() {
  const context=useContext(DemoAuthContext);
  if(!context)throw new Error('El proveedor de autenticación debe estar en el layout raíz.');
  return context;
}
export function RoleGate({allowed,children}:{allowed:UserRole[];children:ReactNode}) {
  const {user,ready,error}=useDemoAuth();
  if(!ready)return <main className="platform-access-state" role="status"><span className="platform-loader"/>Verificando tu sesión…</main>;
  if(user && allowed.includes(user.role))return children;
  return <main className="platform-access-state"><div className="platform-access-icon"><LockKeyhole size={32}/></div><p className="platform-kicker">ACCESO A TU CUENTA</p><h1>{user?'No tienes permiso para entrar aquí.':'Inicia sesión para continuar.'}</h1><p>{error || (user?'Este espacio corresponde a otro rol.':'Accede con tu correo y contraseña para abrir tu espacio.')}</p><Link className="platform-button" href={user?(user.role==='admin'?'/admin':user.role==='subadmin'?'/equipo':'/mi-cuenta'):'/acceder'}>{user?'Volver a mi espacio':'Iniciar sesión'}<ArrowRight size={17}/></Link><Link className="platform-text-link" href="/">Volver a TUKNEX</Link></main>;
}
