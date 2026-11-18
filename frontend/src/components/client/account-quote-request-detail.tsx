import {useId} from 'react';
import {CalendarDays,ClipboardCheck,Globe2,LayoutTemplate,Wallet} from 'lucide-react';
import {StatusBadge} from '@/components/ui/status-badge';
import {RelatedAccountDocuments,type AccountRelatedDocuments} from './account-related-documents';
import {paymentPreferenceLabels} from '@/lib/quote/form';
import {quoteAnswersByGroup} from '@/lib/quote/presentation';
import type {QuoteAnswer} from '@/lib/quote/contracts';
import type {SavedQuoteRequest} from '@/lib/quote/requests';
import './account-document-details.css';

function AnswerList({answers}:{answers:QuoteAnswer[]}){
  return <dl className="account-doc-fields">{answers.map(({question,value})=><div key={question}><dt>{question}</dt><dd>{value||'Sin indicar'}</dd></div>)}</dl>;
}

export function AccountQuoteRequestDetail({record,estimate,date,nextStep,related}:{
  record:SavedQuoteRequest;
  estimate:string;
  date:string;
  nextStep:string;
  related:AccountRelatedDocuments;
}){
  const heading=useId();
  const answers=quoteAnswersByGroup(record.values);
  const sections=[
    {title:'Negocio y objetivo',icon:Globe2,answers:answers.business},
    {title:'Funciones solicitadas',icon:ClipboardCheck,answers:answers.functions.filter(answer=>answer.value!=='No aplica')},
    {title:'Diseño y referencias',icon:LayoutTemplate,answers:answers.design},
    {title:'Plazo y presupuesto',icon:CalendarDays,answers:answers.timing},
  ];
  return <div className="account-doc-detail">
    <section className="account-doc-overview" aria-labelledby={heading}>
      <div className="account-doc-next">
        <StatusBadge status={record.status}/>
        <h3 id={heading}>Próximo paso</h3>
        <p>{nextStep}</p>
      </div>
      <dl className="account-doc-metrics">
        <div className="account-doc-money"><dt><Wallet size={17} aria-hidden="true"/> Inversión estimada</dt><dd>{estimate}<small>Sujeta a revisión del alcance.</small></dd></div>
        <div><dt>Tipo de proyecto</dt><dd>{record.result.label}</dd></div>
        <div><dt>Preferencia de pago</dt><dd>{paymentPreferenceLabels[record.values.paymentPreference||'unsure']}</dd></div>
        <div><dt>Recibida el</dt><dd><time dateTime={record.createdAt}>{date}</time></dd></div>
      </dl>
    </section>
    <RelatedAccountDocuments {...related}/>
    <div className="account-doc-section-grid">
      {sections.map(({title,icon:Icon,answers})=><section className="account-doc-section" key={title}>
        <h3><Icon size={19} aria-hidden="true"/>{title}</h3>
        <AnswerList answers={answers}/>
      </section>)}
    </div>
    <details className="account-doc-more">
      <summary>Ver dominio, hosting y otros detalles</summary>
      <AnswerList answers={answers.details}/>
    </details>
  </div>;
}
