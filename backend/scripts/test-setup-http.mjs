import assert from 'node:assert/strict';
import http from 'node:http';
process.env.TUKNEX_SETUP_PORT='4012';
process.env.TUKNEX_SETUP_PATH='/configurar/'+ 'a'.repeat(48);
const {createSetupHandler,setupRoute}=await import('../scripts/setup-postgres.mjs');
let calls=0,mode='success',checks=0;
const server=http.createServer(createSetupHandler(async input=>{
 calls++;
 assert.ok(!input._csrf);
 if(mode==='password-error')throw Object.assign(new Error('private-database-error'),{code:'28P01'});
 if(mode==='validation-error')throw Object.assign(new Error('private-input-error'),{name:'ZodError'});
}));
await new Promise(resolve=>server.listen(4012,'127.0.0.1',resolve));
const base='http://127.0.0.1:4012',url=base+setupRoute;
function check(value,message){assert.ok(value,message);checks++;}
async function post(values,origin=base){return fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values),redirect:'manual'});}
try{
 const page=await fetch(url),html=await page.text();
 check(page.status===200,'form displays as HTTP 200');
 check(page.headers.get('referrer-policy')==='same-origin','same-origin form POST retains its Origin');
 const csrf=html.match(/name="_csrf" value="([a-f0-9]{64})"/)?.[1];check(!!csrf,'form contains a CSRF token');
 let response=await post({_csrf:csrf},'null');check(response.status===403&&calls===0,'null origins remain blocked');
 response=await post({_csrf:csrf},'https://untrusted.example');check(response.status===403&&calls===0,'external origins remain blocked');
 response=await post({_csrf:'0'.repeat(64)});check(response.status===403&&calls===0,'wrong CSRF token blocked');
 response=await post({});check(response.status===403&&calls===0,'missing CSRF token blocked');
 mode='validation-error';response=await post({_csrf:csrf});check(response.status===303,'validation errors redirect to a readable GET');
 const validation=await fetch(url);check(validation.status===200&&(await validation.text()).includes('Revisa los campos'),'validation error remains visible in browser');
 mode='password-error';response=await post({_csrf:csrf});check(response.status===303,'database errors redirect');
 const failure=await fetch(url),failureHtml=await failure.text();check(failure.status===200&&failureHtml.includes('contraseña de PostgreSQL no es correcta')&&!failureHtml.includes('private-database-error'),'database failure shows a safe useful message');
 mode='success';response=await post({_csrf:csrf});check(response.status===303&&response.headers.get('location')===setupRoute,'successful POST redirects to same setup page');
 const success=await fetch(url);check(success.status===200&&(await success.text()).includes('creadas correctamente'),'success page is visible');
 const priorCalls=calls;await fetch(url);check(calls===priorCalls,'reloading does not resubmit database credentials');
 response=await post({_csrf:csrf});check(response.status===303&&calls===priorCalls,'duplicate submissions do not create duplicate database or account');
 console.log(JSON.stringify({result:'PASS',checks,postgresTouched:false}));
}finally{await new Promise(resolve=>server.close(resolve));}
