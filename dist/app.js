'use strict';
const $=id=>document.getElementById(id);
const examples={assignment:{start:'q0',accept:'q1',word:'01010',transitions:'q0, 0, q1\nq1, 1, q1\nq1, 1, q2\nq2, 0, q0\nq2, eps, q0'},suffix:{start:'q0',accept:'q2',word:'001',transitions:'q0, 0, q0\nq0, 1, q0\nq0, 0, q1\nq1, 1, q2'},epsilon:{start:'s',accept:'f',word:'ab',transitions:'s, eps, p\ns, eps, r\np, a, p\np, b, f\nr, b, r\nr, a, f'},cycle:{start:'s',accept:'f',word:'a',transitions:'s, eps, p\np, eps, s\np, a, f'}};
function parse(start,accept,text,word){
 const valid=/^[\p{L}\p{N}_-]{1,16}$/u;
 if(!valid.test(start))throw Error('Start state: use 1–16 letters, digits, underscores or hyphens.');
 const finals=new Set(accept.split(/[\s,]+/).filter(Boolean));for(const s of finals)if(!valid.test(s))throw Error('Accepting states must use 1–16 letters, digits, underscores or hyphens.');
 const chars=Array.from(word);if(chars.length>40)throw Error('Please use a string of at most 40 characters.');
 const edges=[];const seen=new Set();const states=new Set([start,...finals]);
 text.split('\n').forEach((line,i)=>{if(!line.trim())return;const p=line.split(',').map(x=>x.trim());if(p.length!==3||!valid.test(p[0])||!valid.test(p[2]))throw Error(`Line ${i+1}: use from, symbol, to with valid state names.`);let [from,sym,to]=p;if(sym==='eps'||sym==='ε')sym='';else if(Array.from(sym).length!==1)throw Error(`Line ${i+1}: the symbol must be one character, ε, or eps.`);const key=JSON.stringify([from,sym,to]);if(!seen.has(key)){edges.push({from,sym,to});seen.add(key)}states.add(from);states.add(to)});
 if(states.size>40||edges.length>150)throw Error('Please keep the NFA to at most 40 states and 150 transitions.');
 return {start,finals,edges,chars};
}
function compute(m){
 // Each row is a consumed-input position. Fold epsilon paths into closure choices.
 const closures=new Map();
 function closure(s){
  if(closures.has(s))return closures.get(s);
  const found=new Map([[s,[]]]),queue=[s];
  for(let k=0;k<queue.length;k++)for(const e of m.edges){
   if(e.from===queue[k]&&e.sym===''&&!found.has(e.to)){
    found.set(e.to,[...found.get(e.from),e]);queue.push(e.to);
   }
  }
  closures.set(s,found);return found;
 }
 function choices(s,sym){
  const targets=new Map();
  for(const e of m.edges)if(e.from===s&&e.sym===sym){
   for(const [to,eps] of closure(e.to))if(!targets.has(to))targets.set(to,[e,...eps]);
  }
  return targets;
 }
 let reachable=new Set(closure(m.start).keys());
 for(const sym of m.chars){const next=new Set();for(const s of reachable)for(const to of choices(s,sym).keys())next.add(to);reachable=next;}
 const accepted=[...reachable].some(s=>m.finals.has(s));
 const nodes=[],roots=[];let limited=false;
 for(const [s,route] of closure(m.start)){
  const id=nodes.length;roots.push(id);nodes.push({id,s,i:0,depth:0,parent:null,children:[],route});
 }
 for(let k=0;k<nodes.length;k++){
  const n=nodes[k];n.accept=n.i===m.chars.length&&m.finals.has(n.s);
  const next=n.i<m.chars.length?choices(n.s,m.chars[n.i]):new Map();
  n.dead=!n.accept&&next.size===0;
  for(const [s,route] of next){
   if(nodes.length>=450){n.cut=true;limited=true;break;}
   const id=nodes.length;n.children.push(id);nodes.push({id,s,i:n.i+1,depth:n.i+1,parent:n.id,children:[],route});
  }
 }
 const acceptingPaths=new Set();for(const n of nodes)if(n.accept){let p=n;while(p){acceptingPaths.add(p.id);p=p.parent===null?null:nodes[p.parent];}}
 return {nodes,roots,accepted,limited,maxDepth:m.chars.length,acceptingPaths,hasEpsilon:m.edges.some(e=>e.sym==='')};
}
let model,tree,level=0,selected=0,scale=1;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const remainder=n=>model.chars.slice(n.i).join('')||'ε';
function build(){try{const m=parse($('start').value.trim(),$('accept').value,$('transitions').value,$('word').value);const t=compute(m);model=m;tree=t;level=t.maxDepth;selected=0;$('error').textContent='';$('result').textContent=t.accepted?'String accepted':'String rejected';$('result').style.color=t.accepted?'#147a64':'#a13c49';$('explanation').textContent=t.accepted?'At least one computation consumes the entire string and reaches an accepting state.':'No computation consumes the entire string and reaches an accepting state.';$('word-display').textContent=m.chars.join('')||'ε';$('notice').textContent=[t.limited?'Display limited to 450 nodes. Dashed nodes have hidden branches; the acceptance result remains exact.':'',t.hasEpsilon?'ε-moves are included in each row’s reachable states. An arrow may combine one symbol with subsequent ε-moves. Repeated ε-paths to the same state are grouped.':''].filter(Boolean).join(' ');render();return {accepted:t.accepted,displayedNodes:t.nodes.length,limited:t.limited}}catch(e){$('error').textContent=e.message;return {error:e.message}}}
function stateLabel(s){
 const match=s.match(/^(.+?)(\d+)$/u);
 return match?`${esc(match[1])}<tspan baseline-shift="sub" font-size="12">${esc(match[2])}</tspan>`:esc(s);
}
function diagram(viewLevel, selection, fullLabels=false){
 const visible=tree.nodes.filter(n=>n.i<=viewLevel),pos=new Map();let leaf=0;
 const spacing=Math.max(80,...visible.map(n=>Array.from(n.s).length*9+28));
 function layout(n){
  const children=n.children.map(id=>tree.nodes[id]).filter(c=>c.i<=viewLevel);
  let x;if(!children.length)x=220+leaf++*spacing;
  else{children.forEach(layout);x=(pos.get(children[0].id).x+pos.get(children[children.length-1].id).x)/2;}
  pos.set(n.id,{x,y:80+n.i*105});
 }
 tree.roots.forEach(id=>layout(tree.nodes[id]));
 const w=Math.max(500,220+(leaf-1)*spacing+90),h=Math.max(190,viewLevel*105+145);
 const path=new Set();let a=tree.nodes[selection];while(a){path.add(a.id);a=a.parent===null?null:tree.nodes[a.parent];}
 let out='<title>Textbook computation tree. Each row consumes one input symbol. Epsilon closure is included without consuming input.</title><defs><marker id="tree-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 L 3 5 z" fill="#111"/></marker></defs>';
 out+='<text x="24" y="40" font-size="19" fill="#111">Symbol read</text>';
 for(let i=1;i<=viewLevel;i++){
  const y=80+(i-.5)*105;
  out+=`<text x="86" y="${y+6}" text-anchor="middle" font-size="20" fill="#111">${esc(model.chars[i-1])}</text><line x1="106" x2="180" y1="${y}" y2="${y}" stroke="#777" stroke-dasharray="4 5"/>`;
 }
 const start=pos.get(tree.roots[0]);
 out+=tree.roots.length===1?`<text x="${start.x+31}" y="${start.y+6}" font-size="18" fill="#111">Start</text>`:'<text x="220" y="40" font-size="17" fill="#111">Start: ε-closure</text>';
 for(const n of visible){
  if(n.parent===null)continue;
  const p=pos.get(n.parent),v=pos.get(n.id),dx=v.x-p.x,dy=v.y-p.y,len=Math.hypot(dx,dy),r=21;
  const active=path.has(n.id),stroke=active?'#285ddd':'#111';
  out+=`<path class="tree-edge" d="M${p.x+dx*r/len} ${p.y+dy*r/len} L${v.x-dx*23/len} ${v.y-dy*23/len}" stroke="${stroke}" stroke-width="${active||tree.acceptingPaths.has(n.id)?2.4:1.1}" fill="none" marker-end="url(#tree-arrow)"/>`;
 }
 for(const n of visible){
  const p=pos.get(n.id),stroke=n.id===selection?'#285ddd':'#111';
  out+=`<g class="node" data-id="${n.id}" data-consumed="${n.i}" tabindex="0" role="button" aria-label="${esc(`${n.s}, ${n.i} symbols consumed, unread ${remainder(n)}${n.accept?', accepting endpoint':''}`)}"><title>${esc(`${n.s}; unread input: ${remainder(n)}`)}</title><circle cx="${p.x}" cy="${p.y}" r="21" fill="#fff" stroke="${stroke}" stroke-width="${n.id===selection?2:1}" ${n.cut?'stroke-dasharray="3 3"':''}/>${n.accept?`<circle class="accepting-endpoint" cx="${p.x}" cy="${p.y}" r="17" fill="none" stroke="${stroke}"/>`:''}<text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="19" font-style="italic" ${n.s.length>4?'textLength="33" lengthAdjust="spacingAndGlyphs"':''} fill="#111">${stateLabel(n.s)}</text></g>`;
 }
 return {w,h,out};
}
function render(){
 const {w,h,out}=diagram(level,selected);const svg=$('tree');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('width',w*scale);svg.setAttribute('height',h*scale);svg.innerHTML=out;$('level').textContent=`${level} / ${tree.maxDepth} symbols`;$('back').disabled=level===0;$('next').disabled=level===tree.maxDepth;$('all').disabled=level===tree.maxDepth;$('zoom').textContent=Math.round(scale*100)+'%';
 const n=tree.nodes[selected],chain=[];let c=n;
 while(c){chain.unshift(c);c=c.parent===null?null:tree.nodes[c.parent];}
 let trace=model.start;for(const item of chain)for(const edge of item.route)trace+=` —${edge.sym||'ε'}→ ${edge.to}`;
 $('detail').textContent=trace+'. '+(n.accept?'All input consumed in an accepting state. This path accepts.':n.cut?'Further branches are hidden by the display limit.':n.dead?n.i===model.chars.length?'All input consumed, but this state is not accepting.':'No transition can consume the next symbol on this branch.':`${n.i} of ${model.chars.length} symbols consumed. Unread input: ${remainder(n)}.`);

}
$('build').onclick=build;$('word').onkeydown=e=>{if(e.key==='Enter')build()};$('example').onchange=()=>{const e=examples[$('example').value];for(const k of ['start','accept','word','transitions'])$(k).value=e[k];build()};$('root').onclick=()=>{level=0;selected=0;render()};$('back').onclick=()=>{level--;if(tree.nodes[selected].depth>level)selected=0;render()};$('next').onclick=()=>{level++;render()};$('all').onclick=()=>{level=tree.maxDepth;render()};$('zoomout').onclick=()=>{scale=Math.max(.4,scale-.2);render()};$('zoomin').onclick=()=>{scale=Math.min(2,scale+.2);render()};function pick(e){const n=e.target.closest('[data-id]');if(n){selected=Number(n.dataset.id);render()}}$('tree').onclick=pick;$('tree').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(e)}};
build();
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'build_nfa_tree',description:'Set an NFA and input string and build its computation tree.',inputSchema:{type:'object',properties:{start:{type:'string'},accept:{type:'string'},transitions:{type:'string'},word:{type:'string'}},required:['start','accept','transitions','word'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||['start','accept','transitions','word'].some(k=>typeof input[k]!=='string'))throw Error('All four fields must be strings.');parse(input.start.trim(),input.accept,input.transitions,input.word);for(const k of ['start','accept','transitions','word'])$(k).value=input[k];return build()}})).catch(()=>{})}catch{}}

function exportImage(){
 const {w,h,out}=diagram(tree.maxDepth,-1,true);
 const width=Math.max(800,w+48);
 const subtitle=`Input: ${model.chars.join('')||'ε'}   |   Start: ${model.start}   |   Accepting: ${[...model.finals].join(', ')||'none'}`;
 const lines=Array.from(subtitle).join('').match(/.{1,92}/gu)||[''];
 const top=85+(lines.length-1)*19,height=h+top+105;
 const notes=[tree.limited?'DISPLAY LIMITED: hidden branches remain (450 nodes).':'',tree.hasEpsilon?'ε-closure is included in each row; repeated ε-paths to the same state are grouped.':''].filter(Boolean);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><style>text{font-family:Georgia,Times New Roman,serif}</style><text x="24" y="34" font-family="sans-serif" font-size="21" fill="#253247">NFA computation tree — ${tree.accepted?'accepted':'rejected'}</text>${lines.map((line,i)=>`<text x="24" y="${62+i*19}" font-size="13" fill="#526278">${esc(line)}</text>`).join('')}<g transform="translate(${(width-w)/2},${top})">${out}</g><text x="24" y="${height-66}" font-size="12" fill="#526278">Each row consumes one symbol. Double circles mark accepting endpoints; bold paths accept.</text>${notes.map((n,i)=>`<text x="24" y="${height-43+i*19}" font-size="12" fill="#805c15">${esc(n)}</text>`).join('')}</svg>`;
 return {svg,width,height,filename:`nfa-tree-${(model.chars.join('')||'empty').replace(/[^a-zA-Z0-9_-]/g,'_')}`};
}
function saveImage(blob,extension,filename){
 const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${filename}.${extension}`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function createPng(image){
 const {svg,width,height}=image;
 const source=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
 const ratio=Math.min(2,16000/width,16000/height,Math.sqrt(24000000/(width*height)));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(width*ratio));canvas.height=Math.max(1,Math.floor(height*ratio));
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image export is unavailable in this browser. Try SVG.');
 const url=URL.createObjectURL(source);
 try{
  const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not create PNG. Try SVG.'));img.src=url});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('This tree is too large for PNG. Download SVG instead.');
  return {blob,scaledDown:ratio<1};
 }finally{URL.revokeObjectURL(url)}
}
async function downloadImage(format){
 if(build().error)return;
 const button=$(format==='png'?'download':'download-svg');button.disabled=true;$('download-status').textContent='Preparing image…';
 try{
  const image=exportImage();
  if(format==='svg'){saveImage(new Blob([image.svg],{type:'image/svg+xml;charset=utf-8'}),'svg',image.filename);$('download-status').textContent='SVG download started.';return}
  const {blob,scaledDown}=await createPng(image);
  saveImage(blob,'png',image.filename);$('download-status').textContent=scaledDown?'PNG download started. Large tree scaled down; SVG preserves full detail.':'PNG download started.';
 }catch(e){$('download-status').textContent=e.message||'Download failed. Please try SVG.'}finally{button.disabled=false}
}
async function copyImage(){
 if(build().error)return;
 if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined'){
  $('download-status').textContent='Copying images is not supported in this browser. Use Download PNG instead.';return;
 }
 const button=$('copy-image');button.disabled=true;button.textContent='Copying…';$('download-status').textContent='Preparing image…';
 try{
  const png=createPng(exportImage());const blob=png.then(result=>result.blob);
  // Start the clipboard write during the click gesture, before PNG encoding finishes.
  blob.catch(()=>{});
  await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
  const {scaledDown}=await png;
  $('download-status').textContent='Image copied. Paste it with ⌘V or Ctrl+V.'+(scaledDown?' Large tree scaled down; SVG preserves full detail.':'');
 }catch(e){
  $('download-status').textContent=e.name==='NotAllowedError'?'Clipboard access was blocked. Allow clipboard access or use Download PNG.':(e.message||'Could not copy the image. Use Download PNG instead.');
 }finally{button.disabled=false;button.textContent='Copy image'}
}
$('download').onclick=()=>downloadImage('png');$('download-svg').onclick=()=>downloadImage('svg');$('copy-image').onclick=copyImage;
