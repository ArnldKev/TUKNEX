'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, X, MessageCircle, UserRound, LogOut } from 'lucide-react';
import { brand } from '@/config/brand';
import { DEMO_MODE } from '@/config/environment';
import { useDemoAuth } from '@/lib/platform/auth';
import { ChatbotWidget } from '@/components/chatbot-widget';
import './experience.css';
import './future.css';
import './account-projects.css';

export const openNexi = () => window.dispatchEvent(new Event('open-tuknex-chat'));
export function OfficialBrand() {
  return (
    <Link className="xp-brand" href="/" aria-label="TUKNEX, inicio">
      <img src={brand.logo} width={2172} height={724} alt="TUKNEX · La base de tu siguiente nivel" />
    </Link>
  );
}
const links = [
  ['/', 'Inicio'],
  ['/explorar', 'Explorar'],
  ['/proyectos', 'Proyectos'],
  ['/nosotros', 'Cómo trabajamos'],
  ['/resenas', 'Reseñas'],
  ['/contacto', 'Contacto'],
];
export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, logout } = useDemoAuth();
  return (
    <div className="experience">
      <a className="skip-link" href="#experiencia">
        Saltar al contenido
      </a>
      <header className="xp-header">
        <div className="xp-nav">
          <OfficialBrand />
          <nav className={open ? 'xp-links open' : 'xp-links'} aria-label="Navegación principal">
            {links.map(([url, label]) => (
              <Link
                key={url}
                href={url}
                aria-current={pathname === url ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="xp-nav-actions">
            <button className="xp-nexi-button" onClick={openNexi}>
              <MessageCircle size={17} />
              <span>NEXI</span>
              <i />
            </button>
            <Link
              className={"xp-account"+(user?" xp-account-signed":"")}
              href={user ? (user.role === 'admin' ? '/admin' : '/mi-cuenta') : '/acceder'}
              aria-label={user ? 'Ir al panel de '+user.name : 'Acceder'}
              title={user?.name}
            >
              <UserRound size={18} />{user&&<span>{user.name}</span>}
            </Link>
            <Link className="button button-primary button-sm" href="/cotizar">
              Cotizar <ArrowUpRight size={15} />
            </Link>
            <button
              className="xp-menu"
              aria-expanded={open}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>
      <main id="experiencia">{children}</main>
      <footer className="xp-footer">
        <div className="xp-container">
          <div className="xp-footer-top">
            <div>
              <OfficialBrand />
              <p>
                Tecnología que cobra forma.
                <br />
                Ideas que encuentran su siguiente nivel.
              </p>
            </div>
            <div>
              <span>CREEMOS ALGO</span>
              <Link href="/explorar">Explorar soluciones</Link>
              <Link href="/cotizar">Diseñar mi proyecto</Link>
              <button onClick={openNexi}>Preguntar a NEXI</button>
            </div>
            <div>
              <span>TUKNEX</span>
              <Link href="/proyectos">Proyectos desarrollados</Link>
              <Link href="/nosotros">Cómo trabajamos</Link>
              <Link href="/contacto">Oxapampa · Perú</Link>
            </div>
            <div>
              <span>TU ESPACIO</span>
              <Link href="/acceder">{DEMO_MODE ? 'Acceder a la demostración' : 'Acceder a mi cuenta'}</Link>
              <Link href="/resenas">Reseñas y experiencias</Link>
              <Link href="/privacidad">Uso de tus datos</Link>
              {user && (
                <button onClick={logout}>
                  <LogOut size={12} /> {DEMO_MODE ? 'Cerrar sesión demo' : 'Cerrar sesión'}
                </button>
              )}
            </div>
          </div>
          <div className="xp-footer-bottom">
            <span>© {new Date().getFullYear()} TUKNEX · La base de tu siguiente nivel</span>
            <span>
              Hecho con visión, desde Perú. <span className="xp-status-dot" />
            </span>
          </div>
        </div>
      </footer>
      <ChatbotWidget />
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  text,
  className = '',
}: {
  eyebrow: string;
  title: React.ReactNode;
  text: string;
  className?: string;
}) {
  return (
    <div className={'xp-page-intro xp-container ' + className}>
      <Link className="xp-back" href="/">
        ← Inicio
      </Link>
      <span className="xp-eyebrow">
        <i />
        {eyebrow}
      </span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
