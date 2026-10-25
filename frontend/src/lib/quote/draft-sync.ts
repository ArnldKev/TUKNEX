import { draftContentKey, type RemoteDraft } from './drafts';
import type { QuoteProject } from './project';
export type DraftSyncStatus = 'idle' | 'saved' | 'dirty' | 'saving' | 'error' | 'conflict' | 'paused';
export interface DraftSyncState { status: DraftSyncStatus; remote: RemoteDraft | null; error: string }
type Content={project:QuoteProject;step:number};
type Save=(id:string,body:Content&{expectedVersion:number})=>Promise<RemoteDraft>;
export const initialDraftSync: DraftSyncState = {status:'idle',remote:null,error:''};
/** Serializes writes. Responses can advance the server cursor, never replace newer form input. */
export class DraftSync {
  state: DraftSyncState = {...initialDraftSync};
  private desired: Content | null=null;
  private generation=0;
  private running: Promise<void> | null=null;
  private alive=true;
  constructor(private save:Save,private notify:(state:DraftSyncState)=>void){}
  private emit(next:DraftSyncState){this.state=next;if(this.alive)this.notify(next);}
  attach(remote:RemoteDraft){this.generation++;this.desired={project:remote.project,step:remote.step};this.emit({status:'saved',remote,error:''});}
  clear(){this.generation++;this.desired=null;this.emit({...initialDraftSync});}
  activate(){this.alive=true;}
  dispose(){this.alive=false;this.generation++;}
  update(project:QuoteProject,step:number){
    if(!this.state.remote||project.id!==this.state.remote.id)return;
    this.desired={project,step};
    if(['saving','paused','conflict','error'].includes(this.state.status))return;
    const status=this.dirty()?'dirty':'saved';
    if(status!==this.state.status)this.emit({...this.state,status});
  }
  private dirty(){return !!(this.desired&&this.state.remote&&draftContentKey(this.desired.project,this.desired.step)!==draftContentKey(this.state.remote.project,this.state.remote.step));}
  pause(){if(this.state.status!=='saving')this.emit({...this.state,status:'paused'});}
  resume(){if(this.state.remote&&this.state.status!=='conflict')this.emit({...this.state,status:this.dirty()?'dirty':'saved',error:''});}
  async flush():Promise<void>{
    if(this.running){const running=this.running;await running;if(this.running===running)this.running=null;return this.flush();}
    if(!this.state.remote||!this.desired||!this.dirty()||['paused','error','conflict'].includes(this.state.status))return;
    const generation=this.generation,remote=this.state.remote,content=this.desired;
    this.emit({...this.state,status:'saving',error:''});
    const request=(async()=>{try{
      const saved=await this.save(remote.id,{...content,expectedVersion:remote.version});
      if(generation!==this.generation||!this.alive)return;
      this.state={status:'saved',remote:saved,error:''};
      this.emit({...this.state,status:this.dirty()?'dirty':'saved'});
    }catch(error){
      if(generation!==this.generation||!this.alive)return;
      const status=typeof error==='object'&&error!==null&&'status'in error&&error.status===409?'conflict':'error';
      this.emit({...this.state,status,error:error instanceof Error?error.message:'No pudimos guardar el avance. Tus respuestas siguen en pantalla.'});
    }})();
    this.running=request;
    try{await request;}finally{if(this.running===request)this.running=null;}
  }
}
