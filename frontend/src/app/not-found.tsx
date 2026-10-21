import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        padding: 24,
        background: '#f6fafb',
      }}
    >
      <div>
        <span style={{ color: '#009c98', fontSize: 12, letterSpacing: 3 }}>TUKNEX · 404</span>
        <h1 style={{ fontSize: 38, letterSpacing: -1.5, margin: '20px 0' }}>
          Tu siguiente nivel está por aquí.
        </h1>
        <p style={{ color: '#7b8d98', marginBottom: 28 }}>No encontramos esta página. Volvamos al inicio.</p>
        <Link href="/" className="button button-primary">
          Ir al inicio ↗
        </Link>
      </div>
    </main>
  );
}
