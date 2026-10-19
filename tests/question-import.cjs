const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements={};function element(){return {value:'',style:{},children:[],listeners:{},setAttribute(){},addEventListener(k,f){this.listeners[k]=f},replaceChildren(){this.children=[]},appendChild(e){this.children.push(e)},focus(){this.listeners.focus?.()},setRangeText(s,a,b){this.value=this.value.slice(0,a)+s+this.value.slice(b);this.selectionStart=this.selectionEnd=a+s.length},dispatchEvent(e){this.listeners[e.type]?.()}}}
const document={getElementById(id){return elements[id]??=element()},createElement:element};for(const [id,value]of Object.entries({machine:'nfa',start:'q0',accept:'q1',transitions:'q0, α, q1',word:'α'}))document.getElementById(id).value=value;
const ctx=vm.createContext({document,Event:class{constructor(type){this.type=type}}});for(const file of ['pda.js','app.js','symbol-input.js','workbench.js'])vm.runInContext(fs.readFileSync('public/'+file,'utf8'),ctx);const run=s=>vm.runInContext(s,ctx);

(async()=>{
const draft={status:'ready',machine:'nfa',start:'s',accept:'f',alphabet:'a',transitions:'s, a, f',word:'a',transcription:'Read a',explanation:'One transition.',clarification:'',warnings:[]};
ctx.AbortController=AbortController;ctx.fetch=async url=>({ok:true,json:async()=>url.includes('config')?{ready:true}:{draft}});
for(const id of ['question-dialog','question-drop']){const e=document.getElementById(id);e.classList={add(){},remove(){}};e.showModal=()=>{};e.close=()=>{e.closed=true}};
vm.runInContext(fs.readFileSync('public/question-import.js','utf8'),ctx);
await new Promise(resolve=>setImmediate(resolve));
const original=elements.transitions.value;elements['question-text'].value='Read a';await elements['question-read'].onclick();
assert.equal(elements['draft-review'].hidden,false);assert.equal(elements.transitions.value,original);
elements['question-apply'].onclick();assert.equal(elements.transitions.value,original);
elements['draft-confirm'].checked=true;elements['draft-transitions'].value='invalid';elements['question-apply'].onclick();assert.equal(elements.transitions.value,original);
elements['draft-transitions'].value=draft.transitions;elements['question-apply'].onclick();assert.equal(elements.transitions.value,draft.transitions);assert.equal(elements.machine.value,'nfa');assert.equal(run('diagramMode'),'states');assert.equal(elements['question-dialog'].closed,true);
draft.status='needs_clarification';draft.clarification='Which state is final?';await elements['question-read'].onclick();assert.equal(elements['draft-fields'].hidden,true);assert.equal(elements['question-apply'].hidden,true);assert.match(elements['question-status'].textContent,/Which state/);
console.log('Passed mocked draft review, explicit confirmation, invalid-draft preservation, apply and clarification flows.');
})().catch(e=>{console.error(e);process.exitCode=1});
