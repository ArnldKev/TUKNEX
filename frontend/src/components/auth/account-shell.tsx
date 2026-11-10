'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {Menu,LogOut,X,ArrowUpRight,LayoutDashboard,Users,ClipboardList,FileText,FileSignature,Wallet,UserRound,MessageSquare,Star,BriefcaseBusiness,Settings2} from 'lucide-react';
import {useDemoAuth} from '@/lib/platform/auth';
import '@/components/auth/platform.css';
import './account-workspace.css';
export function AccountShell({title,admin=false,team=false,children}:{title:string;admin?:boolean;team?:boolean;children:ReactNode}) {
  const auth=useDemoAuth(),router=useRouter(),pathname=usePathname(),[menu,setMenu]=useState(false);
  const sidebarId=useId(),sidebarRef=useRef<HTMLElement>(null),menuButtonRef=useRef<HTMLButtonElement>(null);
  const [mobile,setMobile]=useState(false);
  useEffect(()=>{
    const query=window.matchMedia('(max-width: 1050px)');
    const sync=()=>{setMobile(query.matches);if(!query.matches)setMenu(false);};
    sync();query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);
  },[]);
  useEffect(()=>{setMenu(false);},[pathname]);
  useEffect(()=>{
    if(!menu||!mobile)return;
    const sidebar=sidebarRef.current;if(!sidebar)return;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const items=()=>Array.from(sidebar.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')).filter(item=>item.getClientRects().length>0);
    items()[0]?.focus({preventScroll:true});
    const keydown=(event:KeyboardEvent)=>{
      if(event.defaultPrevented)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setMenu(false);menuButtonRef.current?.focus();}
      if(event.key==='Tab'){
        const controls=items(),first=controls[0],last=controls.at(-1);
        if(!first)return;
        if(!sidebar.contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
        else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',keydown);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);if(sidebar.contains(document.activeElement))menuButtonRef.current?.focus({preventScroll:true});};
  },[menu,mobile]);
  const nav=team?[['/equipo','Mis proyectos'],['/equipo#team-requests','Cotizaciones atendidas'],['/equipo/mis-cotizaciones','Mis cotizaciones'],['/cotizar','Cotizar para un cliente'],['/equipo#project-work','Propuestas y contratos'],['/equipo#team-activity','Actividad de mis proyectos']]:admin?[['/admin','Vista general'],['/admin/clientes','Clientes'],['/admin/solicitudes','Solicitudes de clientes'],['/admin/mis-cotizaciones','Mis cotizaciones'],['/admin/cotizaciones','Cotizaciones formales'],['/admin/contratos','Contratos'],['/admin/pagos','Pagos y cuotas'],['/admin/usuarios','Usuarios'],['/admin/equipo','Equipo y actividad'],['/admin/mensajes','Mensajes de contacto'],['/admin/resenas','Opiniones de clientes'],['/admin/precios','Precios'],['/proyectos','Portafolio']]:[['/mi-cuenta','Mi espacio'],['/mi-cuenta/cotizaciones','Mis cotizaciones'],['/mi-cuenta/proyectos','Mis proyectos y pagos'],['/mi-cuenta/perfil','Mi perfil'],['/mi-cuenta/resenas','Mi opinión']];
  const roleLabel=admin?'Administrador principal':team?'Equipo de desarrollo':'Cuenta de cliente';
  const initials=(auth.user?.name||'TUKNEX').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  const icons:Record<string,typeof Menu>={'/admin':LayoutDashboard,'/admin/clientes':Users,'/admin/solicitudes':ClipboardList,'/admin/mis-cotizaciones':FileText,'/admin/cotizaciones':FileText,'/admin/contratos':FileSignature,'/admin/pagos':Wallet,'/admin/usuarios':UserRound,'/admin/equipo':BriefcaseBusiness,'/admin/mensajes':MessageSquare,'/admin/resenas':Star,'/admin/precios':Settings2,'/proyectos':LayoutDashboard,'/equipo':LayoutDashboard,'/equipo#team-requests':ClipboardList,'/equipo/mis-cotizaciones':FileText,'/equipo#project-work':FileSignature,'/equipo#team-activity':BriefcaseBusiness,'/cotizar':FileText,'/mi-cuenta':LayoutDashboard,'/mi-cuenta/cotizaciones':FileText,'/mi-cuenta/proyectos':FileSignature,'/mi-cuenta/perfil':UserRound,'/mi-cuenta/resenas':Star};
  return <div className="client-portal portal-console" data-account-role={admin?'admin':team?'subadmin':'client'}>{menu&&<button className="portal-scrim" aria-label="Cerrar menú" onClick={()=>setMenu(false)}/>}
    <aside id={sidebarId} ref={sidebarRef} className={'portal-sidebar '+(menu?'open':'')} inert={mobile&&!menu} role={mobile&&menu?'dialog':undefined} aria-modal={mobile&&menu?true:undefined} aria-label="Navegación de mi cuenta">
      <button type="button" className="portal-mobile-menu portal-close-nav" aria-label="Cerrar menú" onClick={()=>setMenu(false)}><X/></button>
      <Link href="/" className="platform-brand" onClick={()=>setMenu(false)}><img className="official" src="/images/brand-logo.webp" alt="TUKNEX"/></Link>
      <div className="portal-workspace"><span className="console-workspace-dot" aria-hidden="true"/><div><strong>{admin?'TUKNEX Studio':team?'Espacio del equipo':'Mi proyecto'}</strong><small>{roleLabel}</small></div></div>
      <p className="console-nav-label">{admin?'Centro de operaciones':team?'Tu trabajo':'Tu espacio'}</p>
      <nav aria-label={admin?'Administración':team?'Equipo':'Mi cuenta'}>{nav.map(([href,label])=>{const Icon=icons[href]||FileText;return <Link key={href} href={href} onClick={()=>setMenu(false)} aria-current={pathname===href?'page':undefined} className={pathname===href?'active':''}><Icon size={18} aria-hidden="true"/><span>{label}</span></Link>;})}</nav>
      <div className="portal-sidebar-bottom"><Link href="/" onClick={()=>setMenu(false)}>Ver sitio público <ArrowUpRight size={15} aria-hidden="true"/></Link><button className="portal-logout" onClick={async()=>{await auth.logout();router.replace('/acceder');}}><LogOut size={16} aria-hidden="true"/>Cerrar sesión</button></div>
    </aside>
    <main className="portal-main"><header className="portal-topbar"><div className="console-header-leading"><button type="button" ref={menuButtonRef} className="portal-mobile-menu" aria-label={menu?'Cerrar menú':'Abrir menú'} aria-expanded={menu} aria-controls={sidebarId} onClick={()=>setMenu(value=>!value)}><Menu/></button><div><span className="console-breadcrumb">{admin?'Administración':team?'Equipo':'Mi cuenta'}</span><strong>{title}</strong></div></div><Link className="console-new-project" href="/cotizar"><span>{admin||team?'Nueva cotización':'Crear proyecto'}</span><ArrowUpRight size={16} aria-hidden="true"/></Link><div className="console-identity"><span className="console-avatar" aria-hidden="true">{initials}</span><span><strong>{auth.user?.name}</strong><small>{roleLabel}</small></span></div></header><div className="portal-content">{children}</div></main>
  </div>;
}
