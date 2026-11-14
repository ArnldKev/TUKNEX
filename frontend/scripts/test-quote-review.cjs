const assert=require('node:assert/strict');
require('tsx/cjs');require.extensions['.css']=()=>{};
const React=require('react');global.React=React;
const {renderToStaticMarkup}=require('react-dom/server'),{useForm,FormProvider}=require('react-hook-form');
const {quoteDefaults}=require('../src/lib/quote/form.ts'),{DEFAULT_PRICES}=require('../src/lib/pricing.ts');
const {QuoteReviewStep}=require('../src/components/quote/steps/review-step.tsx');
function render(extra={},staff=false){function Page(){const form=useForm({defaultValues:{...quoteDefaults,offering:'Café artesanal',sector:'food',problem:'Mostrar la carta',colorsLiked:'Azul',...extra}});return React.createElement(FormProvider,form,React.createElement(QuoteReviewStep,{prices:DEFAULT_PRICES,onEdit(){},staff}));}return renderToStaticMarkup(React.createElement(Page));}
const html=render();
assert.ok(html.includes('Inversión preliminar'),'Review must show price before asking for contact');
assert.ok(html.indexOf('Inversión preliminar')<html.indexOf('name="name"'));
assert.ok(html.indexOf('Costos separados')<html.indexOf('name="name"'));
assert.ok(html.includes('name="paymentPreference"'),'Payment preference must remain available before final submission');
assert.ok(html.includes('Azul'));assert.ok(html.includes('Café artesanal'));
assert.ok(render({projectType:'system'}).includes('Evaluación personalizada'));
console.log('PASS: estimate and separate costs before contact, visual and business information, custom estimate path.');

const staffHtml=render({},true);
assert.ok(staffHtml.includes('Datos del cliente atendido'));
assert.ok(staffHtml.includes('He informado al cliente'));
assert.ok(!staffHtml.includes('usaremos el de tu cuenta'));
assert.ok(staffHtml.includes('name="privacyAcknowledged"'));
console.log('PASS: staff intake keeps client contact distinct and requires explicit submission acknowledgement.');

const scheduled=render({timeline:'flexible',launchDate:'2099-01-15',hardDeadline:true});
assert.ok(scheduled.includes('Fecha límite solicitada: 15/01/2099'),'Review must make the fixed date visible');
assert.ok(scheduled.includes('Flexible, sin prioridad urgente'),'A future fixed date does not change commercial priority');
console.log('PASS: requested deadline is visible independently of priority.');