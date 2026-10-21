'use client';
import {useCallback,useEffect,useState} from 'react';
import {RoleGate} from '@/lib/platform/auth';
import {billingRequest} from '@/lib/billing/api';
import type {User} from '@/lib/platform/types';
import {AccountShell} from '@/components/auth/account-shell';
export function RealUsersAdmin(){return <RoleGate allowed={['admin']}><Users/></RoleGate>;}
function Users(){
  const [users,setUsers]=useState<User[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('');
  const load=useCallback(()=>billingRequest<User[]>('auth/users').then(setUsers).catch(e=>setError(e.message)),[]);
  useEffect(()=>{void load();},[load]);
  async function create(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');setNotice('');try{await billingRequest('auth/admins',{method:'POST',body:JSON.stringify({name,email,password})});setName('');setEmail('');setPassword('');await load();setNotice('Cuenta administradora creada. Ya puede iniciar sesión con su correo y contraseña.');}catch(e){setError(e instanceof Error?e.message:'No se pudo crear la cuenta.');}finally{setBusy(false);}}
  return <AccountShell admin title="Usuarios"><h1>Personas con acceso a TUKNEX</h1><p>Los clientes crean sus cuentas desde el registro público. Solo un administrador puede crear otros administradores.</p>{error&&<p className="platform-error" role="alert">{error}</p>}{notice&&<p className="platform-success" role="status">{notice}</p>}<section className="portal-panel"><h2>Cuentas registradas</h2>{users.map(user=><article className="pa-related-row" key={user.id}><div><strong>{user.name}</strong><p>{user.email}</p></div><span>{user.role==='admin'?'Administrador':'Cliente'}</span></article>)}</section><form className="portal-panel auth-form" onSubmit={create}><h2>Crear otro administrador</h2><label className="platform-field">Nombre completo<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label><label className="platform-field">Correo<input type="email" required autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="platform-field">Contraseña inicial<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="platform-button" disabled={busy}>{busy?'Creando…':'Crear administrador'}</button></form></AccountShell>;
}
