import Link from 'next/link';
import { FileSignature, Wallet, Inbox, BriefcaseBusiness } from 'lucide-react';
export function BillingLinks() {
  return (
    <>
      <Link href="/admin/contratos">
        <FileSignature size={17} />
        Contratos
      </Link>
      <Link href="/admin/pagos">
        <Wallet size={17} />
        Pagos
      </Link>
      <Link href="/admin/solicitudes">
        <Inbox size={17} />
        Solicitudes
      </Link>
      <Link href="/proyectos">
        <BriefcaseBusiness size={17} />
        Portafolio
      </Link>
    </>
  );
}
