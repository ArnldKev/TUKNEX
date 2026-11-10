/** One active verification; explicit identity transitions invalidate every older response. */
export class AuthRequestScope{
 private epoch=0;private alive=false;private controller:AbortController|null=null;private transitioning=false;
 activate(){this.alive=true;}
 dispose(){this.alive=false;this.invalidate();}
 invalidate(){this.epoch++;this.controller?.abort();this.controller=null;this.transitioning=false;}
 current(token:number){return this.alive&&token===this.epoch;}
 isTransitioning(){return this.transitioning;}
 beginTransition(){this.invalidate();this.transitioning=true;return this.epoch;}
 finishTransition(token:number){if(!this.current(token))return false;this.transitioning=false;return true;}
 verification(){if(!this.alive||this.transitioning)return null;this.invalidate();const controller=new AbortController();this.controller=controller;return{token:this.epoch,signal:controller.signal};}
}
