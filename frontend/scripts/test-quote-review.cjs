const assert=require('node:assert/strict');
require('tsx/cjs');require.extensions['.css']=()=>{};
const React=require('react');global.React=React;
const {renderToStaticMarkup}=require('react-dom/server'),{useForm,FormProvider}=require('react-hook-form');
const {quoteDefaults}=require('../src/lib/quote/form.ts'),{DEFAULT_PRICES}=require('../src/lib/pricing.ts');
const {QuoteReviewStep}=require('../src/components/quote/steps/review-step.tsx');
function render(extra={}){function Page(){const form=useForm({defaultValues:{...quoteDefaults,offering:'Café artesanal',sector:'food',problem:'Mostrar la carta',colorsLiked:'Azul',...extra}});return React.createElement(FormProvider,form,React.createElement(QuoteReviewStep,{prices:DEFAULT_PRICES,onEdit(){}}));}return renderToStaticMarkup(React.createElement(Page));}
const html=render();
assert.ok(html.includes('Inversión preliminar'),'Review must show price before asking for contact');
assert.ok(html.indexOf('Inversión preliminar')<html.indexOf('name="name"'));
assert.ok(html.indexOf('Costos separados')<html.indexOf('name="name"'));
assert.ok(html.includes('name="paymentPreference"'),'Payment preference must remain available before final submission');
assert.ok(html.includes('Azul'));assert.ok(html.includes('Café artesanal'));
assert.ok(render({projectType:'system'}).includes('Evaluación personalizada'));
console.log('PASS: estimate and separate costs before contact, visual and business information, custom estimate path.');
