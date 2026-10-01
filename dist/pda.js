'use strict';
function parsePda(start,accept,text,word){
 const epsilon=s=>s==='eps'||s==='ε'?'':s;
 const edges=[];
 text.split('\n').forEach((line,i)=>{
  if(!line.trim())return;
  const p=line.split(',').map(s=>s.trim());
  if(p.length!==5)throw Error(`Line ${i+1}: use from, input, pop, push, to.`);
  const [from,input,pop,push,to]=p, sym=epsilon(input),take=epsilon(pop),put=epsilon(push);
  if([input,pop,push].some(s=>!s)||[sym,take,put].some(s=>Array.from(s).length>1))throw Error(`Line ${i+1}: input, pop and push must each be one character or eps.`);
  edges.push({from,to,sym,pop:take,push:put});
 });
 const m=parse(start,accept,edges.map(e=>`${e.from}, ${e.sym||'eps'}, ${e.to}`).join('\n'),word);
 if(edges.length>150)throw Error('Please use at most 150 transitions.');
 m.edges=[...new Map(edges.map(e=>[JSON.stringify(e),e])).values()];m.pda=true;return m;
}
function computePda(m){
 const key=(s,i,stack)=>JSON.stringify([s,i,stack]);
 const nodes=[{id:0,s:m.start,i:0,stack:[],depth:0,parent:null,children:[],route:[],anc:new Set([key(m.start,0,[])])}];
 let limited=false;
 for(let k=0;k<nodes.length;k++){
  const n=nodes[k];n.accept=n.i===m.chars.length&&m.finals.has(n.s);
  if(n.cycle)continue;
  const next=m.edges.filter(e=>e.from===n.s&&(e.sym===''||(n.i<m.chars.length&&e.sym===m.chars[n.i]))&&(!e.pop||n.stack[0]===e.pop));
  n.dead=!n.accept&&!next.length;
  for(const edge of next){
   const stack=edge.pop?n.stack.slice(1):n.stack.slice();if(edge.push)stack.unshift(edge.push);
   if(nodes.length>=450||stack.length>60){n.cut=true;limited=true;continue;}
   const id=nodes.length,i=n.i+(edge.sym?1:0),config=key(edge.to,i,stack);
   n.children.push(id);nodes.push({id,s:edge.to,i,stack,depth:i,parent:n.id,children:[],route:[edge],cycle:n.anc.has(config),anc:new Set([...n.anc,config])});
  }
 }
 const acceptingPaths=new Set();for(const n of nodes)if(n.accept){let p=n;while(p){acceptingPaths.add(p.id);p=p.parent===null?null:nodes[p.parent];}}
 const accepted=nodes.some(n=>n.accept)?true:limited?null:false;
 return {nodes,roots:[0],accepted,limited,maxDepth:m.chars.length,acceptingPaths,hasEpsilon:m.edges.some(e=>!e.sym),hasCycles:nodes.some(n=>n.cycle)};
}
function transitionLabel(e){return model.pda?`${e.sym||'ε'}, ${e.pop||'ε'} → ${e.push||'ε'}`:e.sym||'ε';}
function pdaStatus(){return tree.accepted===null?'Search incomplete':tree.accepted?'String accepted':'String rejected';}
function machineControls(){
 const pda=$('machine').value==='pda';
 $('machine-heading').textContent=pda?'Your PDA':'Your NFA';
 $('transition-format').textContent=pda?'from, input, pop, push, to':'from, symbol, to';
 $('pda-hint').hidden=!pda;
}
function loadExample(name){
 const e=examples[name];$('machine').value=e.pda?'pda':'nfa';
 for(const k of ['start','accept','word','transitions'])$(k).value=e[k];
 machineControls();build();
}
