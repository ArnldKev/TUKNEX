'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, Eye, Globe2, X } from 'lucide-react';
import { useAccessibleModal } from '@/components/auth/use-accessible-modal';
import { purpose, WELCOME_SESSION_KEY } from '@/data/purpose';
import './purpose.css';

let seenInMemory = false;
export const openWelcome = () => window.dispatchEvent(new Event('tuknex-welcome-open'));
export function WelcomeIntro({autoOpen=false}:{autoOpen?:boolean}) {
  const [open,setOpen]=useState(false),[step,setStep]=useState(0);
  useEffect(()=>{
    let seen=seenInMemory;
    try {seen=seen||sessionStorage.getItem(WELCOME_SESSION_KEY)==='seen';}catch { /* Memory fallback keeps browsing available. */ }
    if(autoOpen&&!seen){setOpen(true);seenInMemory=true;try{sessionStorage.setItem(WELCOME_SESSION_KEY,'seen');}catch { /* The in-memory flag covers unavailable session storage. */ }}
    const show=()=>{setStep(0);setOpen(true);};
    window.addEventListener('tuknex-welcome-open',show);
    return()=>window.removeEventListener('tuknex-welcome-open',show);
  },[autoOpen]);
  useAccessibleModal(open,()=>setOpen(false));
  if(!open)return null;
  const current=purpose[step],Icon=[Compass,Eye,Globe2][step];
  return <div className="welcome-backdrop" onClick={()=>setOpen(false)}>
    <section className="platform-modal welcome-panel" role="dialog" aria-modal="true" aria-labelledby="welcome-title" aria-describedby="welcome-description" onClick={e=>e.stopPropagation()}>
      <button className="welcome-close" type="button" aria-label="Cerrar bienvenida" onClick={()=>setOpen(false)}><X size={21}/></button>
      <div className="welcome-art" aria-hidden="true"><span className="welcome-orbit orbit-one"/><span className="welcome-orbit orbit-two"/><div className="welcome-brand"><img src="/images/brand-logo.png" alt="" width={180} height={60}/></div><span className="welcome-art-icon"><Icon size={24}/></span><span className="welcome-spark spark-one"/><span className="welcome-spark spark-two"/></div>
      <p className="purpose-eyebrow">BIENVENIDO A TUKNEX</p>
      <div className="welcome-steps" role="group" aria-label="Conoce nuestro propósito">{purpose.map((item,index)=><button type="button" key={item.id} aria-pressed={step===index} onClick={()=>setStep(index)}>{item.short}</button>)}</div>
      <div className="welcome-copy" key={current.id}><h2 id="welcome-title">{current.title}</h2><p id="welcome-description">{current.text}</p><span>{current.detail}</span></div>
      <div className="welcome-actions">{step<2?<button type="button" className="button button-primary" onClick={()=>setStep(step+1)}>Siguiente <ArrowRight size={17}/></button>:<button type="button" className="button button-primary" onClick={()=>setOpen(false)}>Explorar el sitio <ArrowRight size={17}/></button>}<Link href="/nosotros" onClick={()=>setOpen(false)}>Conocer cómo trabajamos</Link></div>
      <button className="welcome-skip" type="button" onClick={()=>setOpen(false)}>Continuar al inicio</button>
    </section>
  </div>;
}
