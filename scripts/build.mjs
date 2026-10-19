import fs from 'node:fs/promises';
const manifest=JSON.parse(await fs.readFile('.openai/hosting.json','utf8'));
if(manifest.static)throw Error('Worker build must not declare static hosting.');
const assets={};for(const file of await fs.readdir('public')){if(!/\.(html|js|css)$/.test(file))continue;assets['/'+file]={body:await fs.readFile('public/'+file,'utf8'),type:file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8'};}
const source=(await fs.readFile('server/import.mjs','utf8')).replaceAll('export ','');
const worker=source+'\nconst assets='+JSON.stringify(assets)+`;\nexport default {async fetch(request,env){const path=new URL(request.url).pathname;if(path==='/api/import')return handleImport(request,env);if(path==='/api/import-config')return json({ready:!!env.OPENAI_API_KEY});if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const asset=assets[path==='/'?'/index.html':path];if(!asset)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:asset.body,{headers:{'content-type':asset.type,'cache-control':'no-cache','x-content-type-options':'nosniff'}})}};`;
await fs.mkdir('dist/server',{recursive:true});await fs.mkdir('dist/.openai',{recursive:true});await fs.writeFile('dist/server/index.js',worker);await fs.writeFile('dist/.openai/hosting.json',JSON.stringify(manifest));
console.log('Built Worker with '+Object.keys(assets).length+' embedded app assets.');
