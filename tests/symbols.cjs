const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements={};function element(){return {value:'',style:{},children:[],listeners:{},setAttribute(){},addEventListener(k,f){this.listeners[k]=f},replaceChildren(){this.children=[]},appendChild(e){this.children.push(e)},focus(){this.listeners.focus?.()},setRangeText(s,a,b){this.value=this.value.slice(0,a)+s+this.value.slice(b);this.selectionStart=this.selectionEnd=a+s.length},dispatchEvent(e){this.listeners[e.type]?.()}}}
const document={getElementById(id){return elements[id]??=element()},createElement:element};for(const [id,value]of Object.entries({machine:'nfa',start:'q0',accept:'q1',transitions:'q0, α, q1',word:'α'}))document.getElementById(id).value=value;
const ctx=vm.createContext({document,Event:class{constructor(type){this.type=type}}});for(const file of ['pda.js','app.js','symbol-input.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),ctx);const run=s=>vm.runInContext(s,ctx);
assert.equal(run('tree.accepted'),true);assert.deepEqual(elements['word-symbols'].children.map(b=>b.textContent),['α']);
elements.word.value='xy';elements.word.selectionStart=1;elements.word.selectionEnd=2;elements['word-symbols'].children[0].onclick();assert.equal(elements.word.value,'xα');
for(const [id,value]of Object.entries({'edge-from':'q1','edge-input':'β','edge-to':'q2'}))document.getElementById(id).value=value;
elements['add-transition'].onclick();assert.match(elements.transitions.value,/q1, β, q2/);assert.equal(elements['word-symbols'].children.length,2);
run("loadExample('letterPda')");assert.equal(run('tree.accepted'),true);assert.equal(elements['stack-fields'].hidden,false);
elements['edge-pop'].focus();elements['transition-symbols'].children.find(b=>b.textContent==='ε').onclick();assert.equal(elements['edge-pop'].value,'ε');
run("loadExample('letters')");assert.equal(run('tree.accepted'),true);assert.equal(elements['stack-fields'].hidden,true);assert.ok(!elements['word-symbols'].children.some(b=>b.textContent==='ε'));
elements['empty-word'].onclick();assert.equal(elements.word.value,'');
console.log('Passed Unicode input, cursor insertion, transition builder, NFA/PDA letter examples, epsilon insertion, and empty input controls.');
