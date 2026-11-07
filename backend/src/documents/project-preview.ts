import { PDFDocument, StandardFonts, rgb, type Color, type PDFFont, type PDFPage } from 'pdf-lib';
import type { SolutionPreviewModel } from '../domain/quote/preview';

/** A printable view of the same validated model, with no remote assets or arbitrary HTML. */
export async function drawProjectPreview(doc: PDFDocument, page: PDFPage, x: number, top: number, width: number, model: SolutionPreviewModel, regular: PDFFont, bold: PDFFont) {
  const height=338, scale=width/503.28, verticalScale=scale*302/338;
  const color=(hex:string)=>rgb(...([1,3,5].map(at=>parseInt(hex.slice(at,at+2),16)/255) as [number,number,number]));
  const ink=color(model.palette.ink),accent=color(model.palette.accent),surface=color(model.palette.surface),border=color(model.palette.border),white=rgb(1,1,1),muted=rgb(.32,.39,.44);
  const editorial=model.presentation.font==='editorial';
  const heading=editorial?await doc.embedFont(StandardFonts.TimesRomanBold):bold;
  const textFont=editorial?await doc.embedFont(StandardFonts.TimesRoman):regular;
  const clean=(value:string)=>value.normalize('NFC').replace(/[\u2010-\u2015]/g,'-').replace(/→|↗/g,' / ').replace(/[^\u0020-\u00ff\u20ac]/g,'');
  const rect=(left:number,y:number,w:number,h:number,fill:Color,stroke?:Color)=>page.drawRectangle({x:x+left*scale,y:top-(y+h)*verticalScale,width:w*scale,height:h*verticalScale,color:fill,...(stroke?{borderColor:stroke,borderWidth:.55*scale}:{})});
  const line=(left:number,y:number,w:number,c=border,thickness=.5)=>page.drawLine({start:{x:x+left*scale,y:top-y*verticalScale},end:{x:x+(left+w)*scale,y:top-y*verticalScale},color:c,thickness:thickness*scale});
  function text(value:string,left:number,y:number,size:number,maxWidth:number,font=textFont,c=ink,maxLines=1){
    const words=clean(value).split(/\s+/),rows:string[]=[];let row='';
    for(const word of words){if(!word)continue;let rest=word;while(font.widthOfTextAtSize(rest,size)>maxWidth&&rest.length>1){let cut=1;while(cut<rest.length&&font.widthOfTextAtSize(rest.slice(0,cut+1),size)<=maxWidth)cut++;if(row){rows.push(row);row='';}rows.push(rest.slice(0,cut));rest=rest.slice(cut);}if(row&&font.widthOfTextAtSize(row+' '+rest,size)>maxWidth){rows.push(row);row='';}row+=(row?' ':'')+rest;}
    if(row)rows.push(row);const visible=rows.slice(0,maxLines);
    if(rows.length>maxLines&&visible.length){let last=visible[visible.length-1];while(last&&font.widthOfTextAtSize(last+'...',size)>maxWidth)last=last.slice(0,-1);visible[visible.length-1]=last+'...';}
    visible.forEach((value,i)=>page.drawText(value,{x:x+left*scale,y:top-(y+size+i*size*1.35)*verticalScale,size:size*scale,font,color:c}));
  }
  const circle=(cx:number,cy:number,r:number,c:Color)=>page.drawCircle({x:x+cx*scale,y:top-cy*verticalScale,size:r*scale,color:c});
  const frameTop=model.style==='bold'?accent:surface;
  rect(0,0,503.28,height,white,border);rect(0,0,503.28,19,frameTop);
  [10,17,24].forEach(left=>circle(left,9.5,1.6,model.style==='bold'?white:border));
  text('TU BOCETO / '+model.solutionName,42,5,6.5,340,regular,model.style==='bold'?white:muted);
  const pad=model.presentation.spacing==='compact'?16:21;
  const brandHeader=model.style==='corporate'?accent:white;
  rect(0,19,503.28,39,brandHeader);
  text(model.businessName,pad,30,12,310,bold,model.style==='corporate'?white:ink);
  text('MAQUETA',434,33,6,48,regular,model.style==='corporate'?white:muted);
  line(pad,58,503.28-pad*2,model.style==='minimal'?border:accent,model.style==='bold'?2:1);
  const sections=model.sections.slice(0,5),gap=8,available=503.28-pad*2,itemWidth=(available-gap*(Math.max(1,sections.length)-1))/Math.max(1,sections.length);
  sections.forEach((item,i)=>{const left=pad+i*(itemWidth+gap);if(i===0)rect(left,66,itemWidth,19,model.style==='minimal'?white:surface);text(item.label,left+4,71,6.3,itemWidth-8,i===0?bold:regular,i===0?accent:muted);if(i===0)line(left,86,itemWidth,accent,1.5);});
  if(model.kind==='system'){
    const left=pad,space=503.28-pad*2;
    text(model.hero.eyebrow,left,103,6.4,space,bold,accent);
    text(model.hero.title,left,117,18,space,heading,ink,2);
    const cards=model.modules.slice(0,3),cw=(space-16)/Math.max(1,cards.length);
    cards.forEach((module,i)=>{const cLeft=left+i*(cw+8);rect(cLeft,166,cw,57,surface,border);text(module.label,cLeft+10,177,8.5,cw-20,bold);text('Módulo seleccionado',cLeft+10,197,6.5,cw-20,regular,muted);});
    const first=model.modules[0];text(first?.label||'Resumen de trabajo',left,237,9.5,space,bold);
    (first?.records.slice(0,3)||['Completa tus funciones para definir el sistema.']).forEach((record,i)=>{rect(left,255+i*20,space,17,i%2?white:surface);text(record,left+8,260+i*20,6.8,space-16,regular);});
  }else{
    const centered=model.presentation.hero==='centered';
    const heroTop=100,heroHeight=130,coloredHero=model.style==='bold'&&model.presentation.surface!=='paper';
    if(model.style!=='minimal')rect(pad,heroTop,503.28-pad*2,heroHeight,coloredHero?accent:model.presentation.surface==='paper'?white:surface,model.style==='elegant'?border:undefined);
    const heroInk=coloredHero?color(model.palette.onAccent):ink;
    const heroMuted=coloredHero?color(model.palette.onAccent):muted;
    const left=pad+(model.style==='minimal'?0:14),textWidth=centered?503.28-pad*2-28:270;
    text(model.hero.eyebrow,left,heroTop+13,6.6,textWidth,bold,coloredHero?heroInk:accent);
    text(model.hero.title,left,heroTop+28,model.presentation.scale==='large'||model.style==='bold'?20:17,textWidth,heading,heroInk,2);
    text(model.hero.description,left,heroTop+78,7.5,textWidth,textFont,heroMuted,2);
    if(!centered){
      const cx=420,cy=heroTop+65;
      if(model.sector==='food'){circle(cx,cy,36,white);circle(cx,cy,27,rgb(.82,.62,.36));circle(cx-7,cy,20,rgb(.66,.32,.17));circle(cx+17,cy-13,11,rgb(.31,.47,.24));line(cx-21,cy-7,28,rgb(.44,.20,.10),2);line(cx-20,cy+2,29,rgb(.44,.20,.10),2);}
      else if(model.sector==='health'){circle(cx,cy,33,white);rect(cx-7,cy-23,14,46,accent);rect(cx-23,cy-7,46,14,accent);}
      else if(model.sector==='education'){rect(cx-29,cy-24,27,46,white,border);rect(cx+2,cy-24,27,46,white,border);[0,7,14].forEach(offset=>{line(cx-23,cy-12+offset,15,accent);line(cx+8,cy-12+offset,15,accent);});}
      else{circle(cx,cy,35,white);rect(cx-21,cy-21,42,42,surface,border);rect(cx-13,cy-13,26,11,accent);line(cx-13,cy+7,25,accent,2);line(cx-13,cy+14,18,accent,2);}
    }
    const ctaWidth=Math.min(190,Math.max(90,regular.widthOfTextAtSize(clean(model.hero.cta),7)+20));
    rect(left,heroTop+108,ctaWidth,17,model.style==='bold'?white:accent);
    text(model.hero.cta,left+8,heroTop+112,6.6,ctaWidth-16,bold,model.style==='bold'?accent:color(model.palette.onAccent));
    const items=model.kind==='catalog'?model.products.slice(0,2).map(p=>({title:p.name,note:p.note})):model.offerings.slice(0,2).map(title=>({title,note:'Sección de tu propuesta'}));
    const cardWidth=(503.28-pad*2-10)/2;
    items.forEach((item,i)=>{const cLeft=pad+i*(cardWidth+10);rect(cLeft,243,cardWidth,63,model.style==='minimal'?white:surface,model.style==='minimal'?undefined:border);if(model.style==='minimal')line(cLeft,243,cardWidth);if(model.style==='bold')rect(cLeft,243,4,63,accent);text(item.title,cLeft+11,253,9,cardWidth-22,bold);text(item.note,cLeft+11,278,6.8,cardWidth-22,regular,muted,2);});
  }
  text(model.styleName+' / '+model.palette.name+' / '+model.sectorName,pad,319,6.3,460,regular,muted);
  return height*verticalScale;
}
