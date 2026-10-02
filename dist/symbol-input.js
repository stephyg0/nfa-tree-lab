'use strict';
// Preserve cursor insertion for mouse and keyboard activation of symbol buttons.
let symbolTarget=$('transitions');
function insertSymbol(field,symbol){
 const start=field.selectionStart??field.value.length,end=field.selectionEnd??start;
 field.setRangeText(symbol,start,end,'end');field.focus();
 field.dispatchEvent(new Event('input',{bubbles:true}));
}
function symbolButton(symbol,action,label){
 const button=document.createElement('button');button.type='button';button.textContent=symbol;
 button.setAttribute('aria-label',label||`Insert ${symbol}`);button.onclick=action;return button;
}
function refreshSymbols(){
 const pda=$('machine').value==='pda';$('stack-fields').hidden=!pda;
 if(!pda&&(symbolTarget===$('edge-pop')||symbolTarget===$('edge-push')))symbolTarget=$('transitions');
 const symbols=new Set();
 for(const line of $('transitions').value.split('\n')){
  const parts=line.split(',').map(s=>s.trim()),sym=parts[1];
  if(parts.length===(pda?5:3)&&sym&&sym!=='eps'&&sym!=='ε'&&Array.from(sym).length===1)symbols.add(sym);
 }
 const palette=$('word-symbols');palette.replaceChildren();
 for(const sym of symbols)palette.appendChild(symbolButton(sym,()=>insertSymbol($('word'),sym),`Add ${sym} to input string`));
 $('alphabet-hint').textContent=symbols.size?'Click a symbol to insert it at the cursor, or type your string.':'Type your string using the symbols in your transitions.';
}
for(const id of ['transitions','edge-input','edge-pop','edge-push']){
 $(id).addEventListener('focus',()=>{symbolTarget=$(id)});
}
for(const symbol of ['a','b','x','y','0','1','ε','$','#','α','β']){
 $('transition-symbols').appendChild(symbolButton(symbol,()=>{
  const target=symbolTarget;
  if(target===$('transitions'))insertSymbol(target,symbol);
  else {target.value=symbol;target.focus();}
 },`Insert ${symbol==='ε'?'epsilon (no input or stack operation)':symbol} into transition`));
}
$('transitions').addEventListener('input',refreshSymbols);
$('empty-word').onclick=()=>{$('word').value='';$('word').focus();};
$('add-transition').onclick=()=>{
 const pda=$('machine').value==='pda';
 const values=['edge-from','edge-input',...(pda?['edge-pop','edge-push']:[]),'edge-to'].map(id=>$(id).value.trim());
 try{
  if(values.some(value=>!value))throw Error('Fill every transition field. Use ε or eps for no input, pop, or push.');
  const text=[$('transitions').value.trim(),values.join(', ')].filter(Boolean).join('\n');
  (pda?parsePda:parse)($('start').value.trim(),$('accept').value,text,'');
  $('transitions').value=text;refreshSymbols();$('transition-status').textContent='Transition added. Choose Build to update the diagram.';
 }catch(error){$('transition-status').textContent=error.message;}
};
examples.letters={start:'q0',accept:'q2',word:'aab',transitions:'q0, a, q1\nq1, a, q1\nq1, b, q2'};
examples.letterPda={pda:true,start:'q0',accept:'q2',word:'aabb',transitions:'q0, a, eps, a, q1\nq1, a, eps, a, q1\nq1, b, a, eps, q2\nq2, b, a, eps, q2'};
refreshSymbols();
