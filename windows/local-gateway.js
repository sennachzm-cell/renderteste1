'use strict';
// Windows-only browser gateway: serves the original frontend on localhost and
// forwards authenticated API calls to the same secure Render backend.
// No PostgreSQL credentials or shop data are stored here.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const os=require('node:os');
const base=path.resolve(__dirname,'..');
const publicDir=path.join(base,'public');
const configPath=path.join(__dirname,'render-url.txt');
const port=Number(process.env.LOCAL_PORT||17879);
const tokenPath=path.join(os.tmpdir(),'lh-street-admin-local-'+(process.env.USERNAME||os.userInfo().username)+'.token');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
function getEndpoint(){
 const value=(process.env.STREET_ADMIN_RENDER_URL||fs.readFileSync(configPath,'utf8')).trim();
 const uri=new URL(value);
 if(uri.protocol!=='https:'||uri.username||uri.password||uri.search||uri.hash)throw Error('Endereço Render inválido. Informe URL HTTPS sem login, parâmetros ou fragmento.');
 if(uri.hostname==='localhost'||uri.hostname==='127.0.0.1')throw Error('Configure o URL HTTPS público do Render.');
 return uri.origin;
}
const endpoint=getEndpoint();
const secret=crypto.randomBytes(32).toString('hex');
const server=http.createServer(async(req,res)=>{
 try{
  const uri=new URL(req.url,'http://localhost');const route=uri.pathname;const upstreamPath=uri.pathname+uri.search;
  if(route==='/__stop'&&req.method==='POST'){
   if(req.headers['x-local-stop-token']!==secret){res.writeHead(403);return res.end();}
   res.writeHead(204);res.end();server.close(()=>process.exit(0));return;
  }
  if(route.startsWith('/api/')){
   // Cloud API is the only authority; never let this gateway use SQLite.
   const headers={'Accept':req.headers.accept||'application/json'};
   if(req.headers.authorization)headers.Authorization=req.headers.authorization;
   if(req.headers['content-type'])headers['Content-Type']=req.headers['content-type'];
   const chunks=[];let length=0;
   if(req.method!=='GET'&&req.method!=='HEAD')for await(const chunk of req){length+=chunk.length;if(length>25*1024*1024)throw Error('Corpo muito grande.');chunks.push(chunk);}
   const result=await fetch(endpoint+upstreamPath,{method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});
   // Never forward Location, cookies or arbitrary upstream security headers.
   res.writeHead(result.status,{'Content-Type':result.headers.get('content-type')||'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   return res.end(Buffer.from(await result.arrayBuffer()));
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
  // Local frontend assets are authoritative. API alone is forwarded to HTTPS Render.
  let filename;
  try{filename=decodeURIComponent(route==='/'?'/index.html':route);}catch{res.writeHead(400);return res.end();}
  const resolved=path.resolve(publicDir,'.'+filename);
  if(!resolved.startsWith(publicDir+path.sep)){res.writeHead(403);return res.end();}
  if(!fs.existsSync(resolved)||!fs.statSync(resolved).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':mime[path.extname(resolved)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});
  if(req.method==='HEAD')res.end();else fs.createReadStream(resolved).pipe(res);
 }catch(e){console.error(JSON.stringify({event:'local_gateway',message:e.message}));if(!res.headersSent){res.writeHead(502,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'A conexão com o servidor da loja não está disponível. Confira a internet e o endereço configurado.'}));}else res.end();}
});
server.on('close',()=>{try{fs.unlinkSync(tokenPath);}catch{}});
server.listen(port,'127.0.0.1',()=>{fs.writeFileSync(tokenPath,secret,{mode:0o600});console.log(`Street Admin Local: http://127.0.0.1:${port} -> ${endpoint}`);});
server.on('error',e=>{console.error(JSON.stringify({event:'gateway_start_failed',message:e.message}));process.exitCode=1});
