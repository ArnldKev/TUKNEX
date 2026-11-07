const assert=require('node:assert/strict');
require('tsx/cjs');require.extensions['.css']=()=>{};
const React=require('react');global.React=React;
const {renderToStaticMarkup}=require('react-dom/server');
const {useForm,FormProvider}=require('react-hook-form');
const {quoteDefaults}=require('../src/lib/quote/form.ts');
const {DEFAULT_PRICES}=require('../src/lib/pricing.ts');
const {QuoteProjectSession}=require('../src/components/quote/project-session.tsx');
const {QuoteStyleStep,styleDirectionPreferences}=require('../src/components/quote/steps/style-step.tsx');
const ids=['modern','elegant','minimal','bold','corporate','unsure'];
function render(stylePreference,colorsLiked=''){
 function Page(){
  const form=useForm({defaultValues:{...quoteDefaults,stylePreference,colorsLiked}});
  return React.createElement(FormProvider,form,React.createElement(QuoteProjectSession,{form,onRestore(){}},React.createElement(QuoteStyleStep,{prices:DEFAULT_PRICES})));
 }
 return renderToStaticMarkup(React.createElement(Page));
}
for(const selected of ids){
 const html=render(selected);
 const group=html.match(/<div class="quote-style-grid"[\s\S]*?<\/div>/)?.[0];
 assert.ok(group,'The style group must remain available.');
 const buttons=[...group.matchAll(/<button\b[^>]*data-style="([^"]+)"[^>]*>/g)];
 assert.deepEqual(buttons.map(item=>item[1]),ids);
 assert.equal(buttons.filter(item=>item[0].includes('aria-pressed="true"')).length,1,'Exactly one style is selected.');
 assert.ok(buttons.find(item=>item[1]===selected)?.[0].includes('aria-pressed="true"'));
 assert.equal((group.match(/>Elegido<\/span>/g)||[]).length,1);
 for(const id of ids)assert.ok(group.includes('qstyle-preview-'+id),'Each style has a distinct miniature.');
 assert.ok(html.includes('name="colorsLiked"'),'The written/dictated color field remains present.');
 assert.ok(html.includes('name="references"'),'References remain editable.');
}
const blue=render('bold','#2254a3');
assert.equal((blue.match(/--qstyle-accent:#2254a3/g)||[]).length,6,'Samples respect the chosen accent.');
assert.ok(blue.includes('name="design"'),'Design pricing remains a separate selector.');
console.log('PASS: 6 style states have one selection, distinct miniatures, editable color/reference fields and independent design pricing.');

const current={font:'rounded',scale:'large',spacing:'compact',hero:'centered',surface:'paper',sectionOrder:'contact'};
const expected={modern:['sans','airy','split','tinted'],elegant:['editorial','airy','split','paper'],minimal:['sans','airy','centered','paper'],corporate:['sans','compact','split','tinted'],bold:['sans','compact','split','tinted']};
for(const [style,preset] of Object.entries(expected)){
 const next=styleDirectionPreferences(style,current);
 assert.deepEqual([next.font,next.spacing,next.hero,next.surface],preset);
 assert.equal(next.scale,'large');assert.equal(next.sectionOrder,'contact');
 assert.equal(current.font,'rounded','Choosing a style must not mutate the previous visual snapshot.');
}
assert.equal(styleDirectionPreferences('unsure',current),current,'Uncertainty preserves all manual preferences.');
console.log('PASS: explicit style presets match their samples and preserve title size/navigation order; unsure preserves manual choices.');
