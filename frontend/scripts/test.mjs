import {readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
async function tests(directory){const out=[];for(const entry of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())out.push(...await tests(file));else if(entry.name.endsWith('.test.ts'))out.push(file);}return out;}
const files=await tests('src'),demo=files.filter(file=>file.replaceAll('\\','/').endsWith('/platform/platform.test.ts'));
for(const [mode,targets] of [['false',files.filter(file=>!demo.includes(file))],['true',demo]]){
 console.log('Frontend tests: NEXT_PUBLIC_DEMO_MODE='+mode);
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--import','tsx','--test',...targets],{env:{...process.env,NEXT_PUBLIC_DEMO_MODE:mode},stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('close',resolve);});
 if(code!==0)process.exit(code||1);
}
