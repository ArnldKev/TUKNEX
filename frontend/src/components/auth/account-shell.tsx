'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState,type ReactNode} from 'react';
import {Menu,LogOut} from 'lucide-react';
import {useDemoAuth} from '@/lib/platform/auth';
import '@/components/auth/platform.css';
export function AccountShell({title,admin=false,children}:{title:string;admin?:boolean;children:ReactNode}) {
  const auth=useDemoAuth(),router=useRouter(),[menu,setMenu]=useState(false);
  const nav=admin?[['/admin','Vista general'],['/admin/clientes','Clientes'],['/admin/solicitudes','Solicitudes del cotizador'],['/admin/cotizaciones','Cotizaciones'],['/admin/contratos','Contratos'],['/admin/pagos','Pagos y cuotas'],['/admin/usuarios','Usuarios'],['/admin/mensajes','Mensajes de contacto']]:[['/mi-cuenta','Mi espacio'],['/mi-cuenta/cotizaciones','Mis cotizaciones'],['/mi-cuenta/proyectos','Mis contratos y cuotas'],['/mi-cuenta/perfil','Mi perfil']];
  return <div className="client-portal">{menu&&<button className="portal-scrim" aria-label="Cerrar menú" onClick={()=>setMenu(false)}/>}
    <aside className={'portal-sidebar '+(menu?'open':'')}><Link href="/" className="platform-brand"><img className="official" src="/images/brand-logo.png" alt="TUKNEX"/></Link><div className="portal-workspace"><div><strong>{admin?'Administración TUKNEX':'Mi espacio TUKNEX'}</strong><small>{auth.user?.email}</small></div></div><nav aria-label={admin?'Administración':'Mi cuenta'}>{nav.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav><div className="portal-sidebar-bottom"><Link href="/">Volver al sitio</Link><button className="portal-logout" onClick={async()=>{await auth.logout();router.replace('/acceder');}}><LogOut size={16}/>Cerrar sesión</button></div></aside>
    <main className="portal-main"><header className="portal-topbar"><button className="portal-mobile-menu" aria-label="Abrir menú" onClick={()=>setMenu(true)}><Menu/></button><strong>{title}</strong><span>{auth.user?.name}</span></header><div className="portal-content">{children}</div></main>
  </div>;
}
