'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tokenPath=path.join(os.tmpdir(),'lh-street-admin-local-'+(process.env.USERNAME||os.userInfo().username)+'.token');
(async()=>{
 const secret=fs.readFileSync(tokenPath,'utf8').trim();
 const result=await fetch('http://127.0.0.1:17879/__stop',{method:'POST',headers:{'x-local-stop-token':secret},signal:AbortSignal.timeout(4000)});
 if(result.status!==204)throw Error('Não foi possível encerrar o Street Admin.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
