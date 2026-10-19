'use strict';
function parseDfa(start,accept,text,word){
 const m=parse(start,accept,text,word),alphabet=$('alphabet').value.split(/[\s,]+/u).filter(Boolean);
 if(!alphabet.length)throw Error('DFA: enter an alphabet, such as a, b.');
 if(alphabet.some(s=>Array.from(s).length!==1||s==='ε'))throw Error('DFA alphabet: use single characters separated by commas. ε is not an input symbol.');
 const symbols=[...new Set(alphabet)],seen=new Set();
 for(const e of m.edges){
  if(!e.sym)throw Error('DFA: ε-transitions are not allowed. Choose NFA for ε-moves.');
  if(!symbols.includes(e.sym))throw Error(`DFA: “${e.sym}” is not in the alphabet.`);
  const key=JSON.stringify([e.from,e.sym]);if(seen.has(key))throw Error(`DFA: ${e.from} has more than one destination for “${e.sym}”.`);seen.add(key);
 }
 const missing=[];for(const state of m.states)for(const sym of symbols)if(!seen.has(JSON.stringify([state,sym])))missing.push(`${state} on ${sym}`);
 if(missing.length)throw Error('DFA needs exactly one transition per state and symbol. Missing: '+missing.slice(0,6).join('; ')+(missing.length>6?' …':'')+'. Add a dead state if needed.');
 m.dfa=true;return m;
}
const drafts={};let activeMachine=$('machine').value;
const descriptions={dfa:'One path. Exactly one transition per state and input symbol. No ε-moves.',nfa:'Multiple paths allowed. ε-moves consume no input. Any accepting path is enough.',pda:'A state machine with a stack. Transitions read input, pop, then push. Stack top is on the left.'};
function snapshotDraft(){return Object.fromEntries(['start','accept','word','transitions','alphabet'].map(id=>[id,$(id).value]));}
function updateWorkbench(){
 const type=$('machine').value;
 $('machine-summary').textContent=descriptions[type];$('alphabet-controls').hidden=type!=='dfa';
 $('machine-heading').textContent='Define your '+type.toUpperCase();
 $('definition-status').textContent='';
 refreshTransitionList();
}
function refreshTransitionList(){
 const list=$('transition-list');list.replaceChildren();
 const lines=$('transitions').value.split('\n').filter(s=>s.trim());
 $('transition-count').textContent=String(lines.length);
 lines.forEach((line,index)=>{
  const row=document.createElement('div');row.className='transition-row';
  const label=document.createElement('span'),p=line.split(',').map(s=>s.trim());
  const shown=p.map(s=>s==='eps'?'ε':s);
  label.textContent=p.length===5?`${shown[0]} → ${shown[4]}   ${shown[1]}, ${shown[2]} → ${shown[3]}`:p.length===3?`${shown[0]} → ${shown[2]}   ${shown[1]}`:line;
  row.appendChild(label);
  const edit=document.createElement('button');edit.textContent='Edit';edit.type='button';edit.setAttribute('aria-label',`Edit transition ${index+1}`);
  edit.onclick=()=>{const ids=p.length===5?['edge-from','edge-input','edge-pop','edge-push','edge-to']:['edge-from','edge-input','edge-to'];ids.forEach((id,i)=>$(id).value=p[i]||'');$('editing-index').value=String(index);$('add-transition').textContent='Save transition';$('edge-from').focus();};
  const remove=document.createElement('button');remove.textContent='×';remove.type='button';remove.setAttribute('aria-label',`Delete transition ${index+1}`);
  remove.onclick=()=>{lines.splice(index,1);$('transitions').value=lines.join('\n');resetTransitionEditor();refreshSymbols();markDirty();};
  row.appendChild(edit);row.appendChild(remove);list.appendChild(row);
 });
 if(!lines.length){const note=document.createElement('p');note.className='hint';note.textContent='Add your first transition below.';list.appendChild(note);}
}
function resetTransitionEditor(){$('editing-index').value='';$('add-transition').textContent='Add transition';}
function markDirty(){$('definition-status').textContent='Changes pending — update the diagram to apply them.';}
examples.dfa={dfa:true,start:'q0',accept:'q1',word:'aab',alphabet:'a, b',transitions:'q0, a, q0\nq0, b, q1\nq1, a, q0\nq1, b, q1'};
loadExample=function(name){
 drafts[activeMachine]=snapshotDraft();const e=examples[name];
 $('machine').value=e.dfa?'dfa':e.pda?'pda':'nfa';activeMachine=$('machine').value;
 $('alphabet').value=e.alphabet||'a, b';resetTransitionEditor();
 for(const id of ['start','accept','word','transitions'])$(id).value=e[id];
 machineControls();build();
};
$('machine').onchange=()=>{
 drafts[activeMachine]=snapshotDraft();activeMachine=$('machine').value;resetTransitionEditor();
 const e=drafts[activeMachine]||examples[activeMachine==='dfa'?'dfa':activeMachine==='pda'?'palindrome':'letters'];
 for(const id of ['start','accept','word','transitions','alphabet'])$(id).value=e[id]??'a, b';
 $('example').value='';machineControls();build();
};
$('cancel-transition').onclick=resetTransitionEditor;
$('new-machine').onclick=()=>{
 drafts[activeMachine]=snapshotDraft();$('start').value='q0';$('accept').value='';$('transitions').value='';$('word').value='';resetTransitionEditor();refreshSymbols();markDirty();
};
$('restore-machine').onclick=()=>{const e=drafts[activeMachine];if(e){for(const id of ['start','accept','word','transitions','alphabet'])$(id).value=e[id];resetTransitionEditor();build();}};
for(const id of ['start','accept','transitions','alphabet','word'])$(id).addEventListener('input',()=>{if(id==='transitions')resetTransitionEditor();markDirty();});
$('fit').onclick=()=>{if(!model)return;const d=diagramMode==='states'?stateDiagram():diagram(level,selected);scale=Math.min(1,Math.max(.1,($('viewport').clientWidth-24)/d.w));render();};
$('reference-toggle').onclick=()=>{const panel=$('reference-panel');panel.hidden=!panel.hidden;$('reference-toggle').setAttribute('aria-expanded',String(!panel.hidden));};
// State diagrams are the primary workspace; computation trees remain one click away.
diagramMode='states';$('machine').value='dfa';activeMachine='dfa';
for(const id of ['start','accept','word','transitions','alphabet'])$(id).value=examples.dfa[id];
$('example').value='dfa';machineControls();build();
