import {createRequire} from 'node:module';
process.env.NODE_ENV='production';
const require=createRequire(import.meta.url);
const {createApp}=require('../dist/main.js');
try {const app=await createApp();await app.listen(Number(process.env.PORT||4000),process.env.SERVER_HOST||'0.0.0.0');console.log('Backend TUKNEX iniciado en modo producción.');}
catch(error){console.error(error.message);process.exitCode=1;}
