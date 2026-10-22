'use client';
import {useCallback,useEffect,useState} from 'react';
import {RoleGate} from '@/lib/platform/auth';
import {billingRequest} from '@/lib/billing/api';
import type {User} from '@/lib/platform/types';
import {AccountShell} from '@/components/auth/account-shell';

export function RealUsersAdmin(){return <RoleGate allowed={['admin']}><Users/></RoleGate>;}
function Users(){
  const [users,setUsers]=useState<User[]>([]),[error,setError]=useState('');
  const load=useCallback(()=>billingRequest<User[]>('auth/users').then(setUsers).catch(e=>setError(e.message)),[]);
  useEffect(()=>{void load();},[load]);
  return <AccountShell admin title="Usuarios"><h1>Personas con acceso a TUKNEX</h1><p>Consulta las cuentas de clientes y del equipo. Las cuentas del equipo se gestionan de forma privada.</p>{error&&<p className="platform-error" role="alert">{error}</p>}<section className="portal-panel"><h2>Cuentas registradas</h2>{users.map(user=><article className="pa-related-row" key={user.id}><div><strong>{user.name}</strong><p>{user.email}</p></div><span>{user.role==='admin'?'Administrador':'Cliente'}</span></article>)}</section></AccountShell>;
}
