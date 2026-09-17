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
 const moves=(s,i)=>m.edges.filter(e=>e.from===s&&(e.sym===''||i<m.chars.length&&e.sym===m.chars[i])).map(e=>({s:e.to,i:i+(e.sym===''?0:1),sym:e.sym}));
 const key=(s,i)=>JSON.stringify([s,i]);
 const queue=[{s:m.start,i:0}],visited=new Set([key(m.start,0)]);let accepted=false;
 for(let k=0;k<queue.length;k++){const n=queue[k];if(n.i===m.chars.length&&m.finals.has(n.s))accepted=true;for(const e of moves(n.s,n.i)){const v=key(e.s,e.i);if(!visited.has(v)){visited.add(v);queue.push(e)}}}
 const root={id:0,s:m.start,i:0,depth:0,parent:null,children:[],anc:new Set([key(m.start,0)])};const nodes=[root];let limited=false;
 for(let k=0;k<nodes.length;k++){const n=nodes[k];n.accept=n.i===m.chars.length&&m.finals.has(n.s);if(n.cycle)continue;const next=moves(n.s,n.i);n.dead=!n.accept&&next.length===0;if(n.depth>=48&&next.length){n.cut=true;limited=true;continue}for(const e of next){if(nodes.length>=450){n.cut=true;limited=true;break}const v=key(e.s,e.i);const child={...e,id:nodes.length,depth:n.depth+1,parent:n.id,children:[],cycle:n.anc.has(v),anc:new Set([...n.anc,v])};nodes.push(child);n.children.push(child.id)}}
 return {nodes,accepted,limited,maxDepth:Math.max(...nodes.map(n=>n.depth))};
}
let model,tree,level=0,selected=0,scale=1;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const remainder=n=>model.chars.slice(n.i).join('')||'ε';
function build(){try{const m=parse($('start').value.trim(),$('accept').value,$('transitions').value,$('word').value);const t=compute(m);model=m;tree=t;level=t.maxDepth;selected=0;$('error').textContent='';$('result').textContent=t.accepted?'String accepted':'String rejected';$('result').style.color=t.accepted?'#147a64':'#a13c49';$('explanation').textContent=t.accepted?'At least one computation consumes the entire string and reaches an accepting state.':'No computation consumes the entire string and reaches an accepting state.';$('word-display').textContent=m.chars.join('')||'ε';$('notice').textContent=[t.limited?'Tree display limited to 450 nodes / 48 transitions per path. Dashed nodes may have hidden children. The acceptance result is still exact.':'',t.nodes.some(n=>n.cycle)?'ε-cycles are folded when a branch repeats the same (state, unread input). Unfolding would create an infinite tree; folding does not change acceptance.':''].filter(Boolean).join(' ');render();return {accepted:t.accepted,displayedNodes:t.nodes.length,limited:t.limited}}catch(e){$('error').textContent=e.message;return {error:e.message}}}
function diagram(viewLevel, selection, fullLabels=false){
 const spacing=fullLabels?Math.max(155,model.chars.length*8+40):155;
 const visible=tree.nodes.filter(n=>n.depth<=viewLevel);let leaf=0;const pos=new Map();
 function layout(n){const children=n.children.map(id=>tree.nodes[id]).filter(c=>c.depth<=viewLevel);let x;if(!children.length)x=spacing/2+leaf++*spacing;else{children.forEach(layout);x=(pos.get(children[0].id).x+pos.get(children[children.length-1].id).x)/2}pos.set(n.id,{x,y:64+n.depth*137})}layout(tree.nodes[0]);
 const w=Math.max(450,leaf*spacing),h=Math.max(250,viewLevel*137+150);
 for(const point of pos.values())point.x+=(w-leaf*spacing)/2;
 const path=new Set();let a=tree.nodes[selection];while(a){path.add(a.id);a=a.parent===null?null:tree.nodes[a.parent]}
 let out='<title>Computation tree: nodes show state and unread input; edges show transitions.</title>';
 for(const n of visible){if(n.parent===null)continue;const p=pos.get(n.parent),v=pos.get(n.id);const active=path.has(n.id);out+=`<path d="M${p.x} ${p.y+29} L${v.x} ${v.y-30}" stroke="${active?'#285ddd':'#b8c9df'}" stroke-width="${active?2.5:1.5}" fill="none"/><rect x="${(p.x+v.x)/2-13}" y="${(p.y+v.y)/2-12}" width="26" height="23" rx="4" fill="#fff"/><text x="${(p.x+v.x)/2}" y="${(p.y+v.y)/2+4}" font-size="14" text-anchor="middle" fill="#36537b">${esc(n.sym||'ε')}</text>`}
 for(const n of visible){const p=pos.get(n.id),fill=n.accept?'#147a64':n.dead?'#f9ecee':'#fff',stroke=n.id===selection?'#285ddd':n.accept?'#147a64':n.dead?'#b96c77':'#6c8dba';out+=`<g class="node" data-id="${n.id}" tabindex="0" role="button" aria-label="${esc(`${n.s}, unread ${remainder(n)}${n.accept?', accepting computation':''}${n.cycle?', repeated configuration':''}`)}"><circle cx="${p.x}" cy="${p.y}" r="31" fill="${fill}" stroke="${stroke}" stroke-width="${n.id===selection?3:1.5}" ${n.cut?'stroke-dasharray="4 3"':''}/>${model.finals.has(n.s)?`<circle cx="${p.x}" cy="${p.y}" r="26" fill="none" stroke="${n.accept?'#fff':stroke}"/>`:''}<text x="${p.x}" y="${p.y+4}" text-anchor="middle" font-size="14" ${n.s.length>6?'textLength="49" lengthAdjust="spacingAndGlyphs"':''} fill="${n.accept?'#fff':'#172847'}">${esc(fullLabels?n.s:n.s.length>9?n.s.slice(0,8)+'…':n.s)}</text><text x="${p.x}" y="${p.y+53}" text-anchor="middle" font-size="13" fill="#536981">${esc(fullLabels?remainder(n):remainder(n).length>13?remainder(n).slice(0,12)+'…':remainder(n))}</text><text x="${p.x}" y="${p.y+73}" text-anchor="middle" font-size="11" fill="${n.accept?'#147a64':'#86616a'}">${n.accept?'ACCEPT':n.cycle?'↩ ε-CYCLE':n.cut?'LIMIT':n.dead?n.i===model.chars.length?'REJECT':'STUCK':''}</text></g>`}
 return {w,h,out};
}
function render(){
 const {w,h,out}=diagram(level,selected);const svg=$('tree');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('width',w*scale);svg.setAttribute('height',h*scale);svg.innerHTML=out;$('level').textContent=`Level ${level} / ${tree.maxDepth}`;$('back').disabled=level===0;$('next').disabled=level===tree.maxDepth;$('all').disabled=level===tree.maxDepth;$('zoom').textContent=Math.round(scale*100)+'%';
 const n=tree.nodes[selected];const chain=[];let c=n;while(c){chain.unshift(`(${c.s}, ${remainder(c)})`);c=c.parent===null?null:tree.nodes[c.parent]}
 $('detail').textContent=chain.join(' → ')+'. '+(n.accept?'All input consumed in an accepting state. This path accepts.':n.cycle?'This configuration already occurs on this path. Its repeated subtree is folded.':n.dead?n.i===model.chars.length?'All input consumed, but this state is not accepting.':'No transition can continue this path with the unread input.':n.cut?'Further branches are hidden by the display limit.':`${n.i} of ${model.chars.length} input characters consumed. ${n.children.length} possible next move${n.children.length===1?'':'s'}.`);
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
 const notes=[tree.limited?'DISPLAY LIMITED: hidden branches remain (450 nodes / 48 levels).':'',tree.nodes.some(n=>n.cycle)?'Repeated ε configurations are folded; the infinite repeated subtree is omitted.':''].filter(Boolean);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><style>text{font-family:monospace}</style><text x="24" y="34" font-family="sans-serif" font-size="21" fill="#253247">NFA computation tree — ${tree.accepted?'accepted':'rejected'}</text>${lines.map((line,i)=>`<text x="24" y="${62+i*19}" font-size="13" fill="#526278">${esc(line)}</text>`).join('')}<g transform="translate(${(width-w)/2},${top})">${out}</g><text x="24" y="${height-66}" font-size="12" fill="#526278">State in circle; unread input below. Double circle = accepting state. Green = accepting computation.</text>${notes.map((n,i)=>`<text x="24" y="${height-43+i*19}" font-size="12" fill="#805c15">${esc(n)}</text>`).join('')}</svg>`;
 return {svg,width,height,filename:`nfa-tree-${(model.chars.join('')||'empty').replace(/[^a-zA-Z0-9_-]/g,'_')}`};
}
function saveImage(blob,extension,filename){
 const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${filename}.${extension}`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function downloadImage(format){
 if(build().error)return;
 const button=$(format==='png'?'download':'download-svg');button.disabled=true;$('download-status').textContent='Preparing image…';
 let url;
 try{
  const {svg,width,height,filename}=exportImage();const source=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
  if(format==='svg'){saveImage(source,'svg',filename);$('download-status').textContent='SVG download started.';return}
  const ratio=Math.min(2,16000/width,16000/height,Math.sqrt(24000000/(width*height)));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(width*ratio));canvas.height=Math.max(1,Math.floor(height*ratio));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image export is unavailable in this browser. Try SVG.');
  url=URL.createObjectURL(source);const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not create PNG. Try SVG.'));img.src=url});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('This tree is too large for PNG. Download SVG instead.');
  saveImage(blob,'png',filename);$('download-status').textContent=ratio<1?'PNG download started. Large tree scaled down; SVG preserves full detail.':'PNG download started.';
 }catch(e){$('download-status').textContent=e.message||'Download failed. Please try SVG.'}finally{if(url)URL.revokeObjectURL(url);button.disabled=false}
}
$('download').onclick=()=>downloadImage('png');$('download-svg').onclick=()=>downloadImage('svg');
