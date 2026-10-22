import { CheckCircle2, Clock3, CircleDashed, FileCheck2, Send, XCircle } from 'lucide-react';
import './status-badge.css';
const statuses:Record<string,{label:string;tone:string;icon:typeof Clock3}>={
  pending:{label:'Recibida',tone:'blue',icon:Send},
  reviewing:{label:'En revisión',tone:'amber',icon:Clock3},
  quoted:{label:'Cotizada',tone:'green',icon:FileCheck2},
  closed:{label:'Cerrada',tone:'muted',icon:CheckCircle2},
  draft:{label:'Borrador',tone:'muted',icon:CircleDashed},
  sent:{label:'Enviada',tone:'blue',icon:Send},
  accepted:{label:'Aceptada',tone:'green',icon:CheckCircle2},
  rejected:{label:'Requiere cambios',tone:'rose',icon:XCircle},
  published:{label:'Publicada',tone:'green',icon:CheckCircle2},
  borrador:{label:'Borrador',tone:'muted',icon:CircleDashed},
  enviado:{label:'Enviado',tone:'blue',icon:Send},
  firmado_cliente:{label:'Firmado por cliente',tone:'blue',icon:FileCheck2},
  firmado_tuknex:{label:'Firmado por TUKNEX',tone:'blue',icon:FileCheck2},
  activo:{label:'Activo',tone:'blue',icon:Clock3},
  finalizado:{label:'Finalizado',tone:'green',icon:CheckCircle2},
  cancelado:{label:'Cancelado',tone:'rose',icon:XCircle},
  pagada:{label:'Pagada',tone:'green',icon:CheckCircle2},
  pendiente:{label:'Pendiente',tone:'amber',icon:Clock3},
  vencida:{label:'Vencida',tone:'rose',icon:Clock3},
};
export function StatusBadge({status,label}:{status:string;label?:string}) {
  const item=statuses[status]||{label:status,tone:'muted',icon:CircleDashed},Icon=item.icon;
  return <span className={'account-status account-status--'+item.tone}><Icon size={16} aria-hidden="true"/>{label||item.label}</span>;
}
