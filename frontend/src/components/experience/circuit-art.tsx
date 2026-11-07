import type { SolutionKind } from './solution-preview';

/** TUKNEX's idea → interface → product motif. Native geometry; no network or canvas. */
export function CircuitArt() {
  return <div className="fc-circuit" aria-hidden="true">
    <svg className="fc-circuit-rails" viewBox="0 0 760 620" fill="none">
      <path className="fc-rail-shadow" d="M70 120H248Q280 120 280 152V232Q280 264 312 264H542Q574 264 574 296V436Q574 468 606 468H708"/>
      <path className="fc-rail-main" d="M70 120H248Q280 120 280 152V232Q280 264 312 264H542Q574 264 574 296V436Q574 468 606 468H708"/>
      <path className="fc-rail-fine" d="M42 150H222Q250 150 250 178V262Q250 292 280 292H510Q542 292 542 324V466Q542 496 574 496H708"/>
      <path className="fc-rail-fine" d="M100 90H280Q310 90 310 120V202Q310 232 340 232H574Q606 232 606 264V404Q606 436 638 436H736"/>
      <rect x="56" y="106" width="28" height="28" rx="5"/><rect x="694" y="454" width="28" height="28" rx="5"/>
    </svg>
    <div className="fc-circuit-plane fc-circuit-idea">
      <svg viewBox="0 0 240 150" fill="none"><path d="M22 29H90M22 43H136M22 57H116M22 100L60 74L95 104L146 67L202 91"/><rect x="15" y="15" width="210" height="120" rx="6"/><circle cx="186" cy="44" r="13"/></svg>
    </div>
    <div className="fc-circuit-plane fc-circuit-interface">
      <svg viewBox="0 0 260 170" fill="none"><path d="M20 25H62M174 25H192M202 25H220M20 50H240M20 76H112M20 90H94M20 110H70"/><rect x="140" y="65" width="98" height="76" rx="5"/><rect x="20" y="124" width="60" height="17" rx="3"/><path d="M155 123L173 101L187 113L210 84L224 98"/></svg>
    </div>
    <div className="fc-circuit-foot"/><div className="fc-circuit-joint"/>
  </div>;
}

/** Noninteractive previews distinguish the product families without duplicating demo state. */
export function ProductSilhouette({kind}:{kind:SolutionKind}) {
 return <div className={'fc-product-visual fc-product-'+kind} aria-hidden="true">
   <div className="fc-product-plane"><div className="fc-product-chrome"><i/><i/><i/><span/></div>
   {kind==='system'?<div className="fc-schematic-system"><aside><b/><i/><i/><i/></aside><div><header><i/><i/></header><section><b/><b/><b/></section><p/><p/><p/><p/></div></div>:
   kind==='catalog'?<div className="fc-schematic-catalog"><header><b/><i/></header><div>{[0,1,2].map(n=><section key={n}><span className={'fc-product-object object-'+n}/><i/><b/></section>)}</div></div>:
   <div className="fc-schematic-web"><header><b/><i/><i/></header><div><section><b/><b/><i/><em/></section><span><i/><i/><i/></span></div><footer><i/><i/><i/></footer></div>}
   </div><span className="fc-product-base"/><span className="fc-product-connector"/>
 </div>;
}
