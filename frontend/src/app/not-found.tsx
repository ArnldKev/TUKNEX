import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import './not-found-editorial.css';

export default function NotFound() {
  return (
    <div className="not-found-editorial">
      <header className="not-found-masthead">
        <Link href="/" aria-label="TUKNEX, inicio">
          <img src="/images/brand-logo.webp" alt="" width={180} height={56} />
        </Link>
      </header>
      <main className="not-found-content">
        <p className="not-found-code">Error 404</p>
        <h1>No encontramos la página.</h1>
        <p>Si abriste un enlace, comprueba la dirección o vuelve al inicio.</p>
        <Link href="/" className="not-found-action">
          <ArrowLeft size={18} aria-hidden="true" /> Volver al inicio
        </Link>
      </main>
    </div>
  );
}
