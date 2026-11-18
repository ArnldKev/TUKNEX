import {ArrowUpRight} from 'lucide-react';
import {StatusBadge} from '@/components/ui/status-badge';
import {contractStatusLabel,type BillingQuote,type Contract} from '@/lib/billing/types';
import './account-document-details.css';

export type AccountRelatedDocuments = {quotes:readonly BillingQuote[];contracts:readonly Contract[]};

export function RelatedAccountDocuments({quotes,contracts}:AccountRelatedDocuments){
  if(!quotes.length&&!contracts.length)return null;
  return <section className="account-doc-section">
    <h3>Documentos relacionados</h3>
    <ul className="account-doc-links">
      {quotes.map(quote=><li key={quote.id}>
        <a href={'/mi-cuenta/cotizaciones?cotizacion='+encodeURIComponent(quote.id)}>
          <span><strong>Cotización formal</strong><small>{quote.number}</small></span>
          <StatusBadge status={quote.status} label={quote.status==='rejected'?'No aceptada':undefined}/>
          <ArrowUpRight size={17} aria-hidden="true"/>
        </a>
      </li>)}
      {contracts.map(contract=><li key={contract.id}>
        <a href={'/mi-cuenta/proyectos?contrato='+encodeURIComponent(contract.id)}>
          <span><strong>Contrato de servicios</strong><small>{contract.number}</small></span>
          <StatusBadge status={contract.status} label={contractStatusLabel(contract)}/>
          <ArrowUpRight size={17} aria-hidden="true"/>
        </a>
      </li>)}
    </ul>
  </section>;
}
