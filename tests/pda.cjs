const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements={};const document={getElementById(id){return elements[id]??={value:({start:'q0',accept:'q1',word:'01010',transitions:'q0, 0, q1',machine:'nfa'})[id]??'',style:{},setAttribute(){}}}};
const ctx=vm.createContext({document});vm.runInContext(fs.readFileSync('dist/pda.js','utf8')+fs.readFileSync('dist/app.js','utf8'),ctx);const run=s=>vm.runInContext(s,ctx);
run("loadExample('palindrome')");assert.equal(run('tree.accepted'),true);
const paths=run("tree.nodes.filter(n=>n.accept).map(n=>{const path=[];while(n){path.unshift([n.s,n.i,n.stack.join('')]);n=n.parent===null?null:tree.nodes[n.parent]}return path})");
assert.deepEqual(JSON.parse(JSON.stringify(paths)),[[['q1',0,''],['q2',0,'$'],['q2',1,'1$'],['q2',2,'01$'],['q3',2,'01$'],['q3',3,'1$'],['q3',4,'$'],['q4',4,'']]]);
for(let len=0;len<=7;len++)for(let k=0;k<2**len;k++){const word=len?k.toString(2).padStart(len,'0'):'';ctx.word=word;assert.equal(run("computePda(parsePda('q1','q4',examples.palindrome.transitions,word)).accepted"),len%2===0&&word===Array.from(word).reverse().join(''),word)}
assert.equal(run("computePda(parsePda('s','f','s, eps, eps, X, s','')).accepted"),null);
assert.equal(run("computePda(parsePda('s','f','s, eps, eps, eps, s','')).accepted"),false);
assert.equal(run("computePda(parsePda('s','f','s, eps, X, eps, f','')).accepted"),false);
assert.equal(run("computePda(parsePda('s','f','s, eps, eps, X, f','')).accepted"),true);
assert.equal(run("computePda(parsePda('s','f','s, eps, eps, X, p\\np, a, X, Y, f','a')).accepted"),true);
assert.match(run('exportImage().svg'),/Stack: 01\$/);assert.match(run('exportImage().filename'),/^pda-tree/);
run("setView('states')");assert.match(run('exportImage().svg'),/ε, ε → \$/);
run("setView('tree');loadExample('assignment')");assert.equal(run('tree.accepted'),true);assert.equal(run('!!model.pda'),false);
console.log('Passed 255 PDA palindrome cases, exact 1001 stack trace, pop guards, replacement, epsilon cycles and growth bounds, exports and NFA switching.');
