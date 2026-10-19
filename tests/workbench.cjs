const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements={};function element(){return {value:'',style:{},children:[],listeners:{},setAttribute(){},addEventListener(k,f){this.listeners[k]=f},replaceChildren(){this.children=[]},appendChild(e){this.children.push(e)},focus(){this.listeners.focus?.()},setRangeText(s,a,b){this.value=this.value.slice(0,a)+s+this.value.slice(b);this.selectionStart=this.selectionEnd=a+s.length},dispatchEvent(e){this.listeners[e.type]?.()}}}
const document={getElementById(id){return elements[id]??=element()},createElement:element};for(const [id,value]of Object.entries({machine:'nfa',start:'q0',accept:'q1',transitions:'q0, α, q1',word:'α'}))document.getElementById(id).value=value;
const ctx=vm.createContext({document,Event:class{constructor(type){this.type=type}}});for(const file of ['pda.js','app.js','symbol-input.js','workbench.js'])vm.runInContext(fs.readFileSync('public/'+file,'utf8'),ctx);const run=s=>vm.runInContext(s,ctx);

assert.equal(run('diagramMode'),'states');assert.equal(elements.machine.value,'dfa');assert.equal(run('model.dfa'),true);
assert.throws(()=>run("parseDfa('q0','q1','q0, eps, q1','')"),/ε-transitions/);
assert.throws(()=>run("parseDfa('q0','q1','q0, a, q0\\nq0, a, q1','')"),/more than one/);
assert.throws(()=>run("parseDfa('q0','q1','q0, a, q1','')"),/Missing/);
assert.throws(()=>run("parseDfa('q0','q1','q0, x, q1','')"),/not in the alphabet/);
for(let len=0;len<6;len++)for(let k=0;k<2**len;k++){ctx.word=len?k.toString(2).padStart(len,'0').replaceAll('0','a').replaceAll('1','b'):'';assert.equal(run("compute(parseDfa('q0','q1',examples.dfa.transitions,word)).accepted"),ctx.word.endsWith('b'));}
elements.word.value='abba';elements.machine.value='pda';elements.machine.onchange();assert.equal(run('model.pda'),true);
elements.machine.value='dfa';elements.machine.onchange();assert.equal(elements.word.value,'abba');assert.equal(elements['alphabet-controls'].hidden,false);
const original=elements.transitions.value;
elements['transition-list'].children[0].children[1].onclick();assert.equal(elements['editing-index'].value,'0');elements['edge-to'].value='q1';elements['add-transition'].onclick();assert.equal(elements.transitions.value.split('\n').length,4);assert.match(elements.transitions.value,/q0, a, q1/);
elements['new-machine'].onclick();assert.equal(elements.transitions.value,'');elements['restore-machine'].onclick();assert.match(elements.transitions.value,/q0, a, q1/);
elements.transitions.value='q0, a, q0';assert.ok(run('build().error'));assert.equal(elements.tree.hidden,true);elements.transitions.value=original;assert.equal(run('build().error'),undefined);assert.equal(elements.tree.hidden,false);
run("loadExample('palindrome');setView('tree')");assert.equal(run('tree.accepted'),true);assert.match(run('exportImage().svg'),/Stack:/);
assert.ok(!run('exportImage().svg').includes('Incoming arrow ='));
console.log('Passed DFA completeness, determinism, epsilon and alphabet validation; 63 DFA strings; draft switching; transition editing; clear/restore; invalid-result hiding; PDA traces and clean exports.');
