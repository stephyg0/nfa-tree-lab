'use strict';
let questionImage='',questionVersion=0,questionRequest=null,questionReady=false;
function importStatus(message){$('question-status').textContent=message;}
function invalidateQuestion(){questionVersion++;questionRequest?.abort();questionRequest=null;$('draft-review').hidden=true;$('question-read').disabled=!questionReady;}
async function loadQuestionImage(file){
 invalidateQuestion();const version=questionVersion;questionImage='';$('question-preview').hidden=true;
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)){importStatus('Choose a PNG, JPEG, or WebP screenshot.');return;}
 if(file.size>6*1024*1024){importStatus('This image is too large. Use a screenshot under 6 MB.');return;}
 importStatus('Opening screenshot…');
 try{
  const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not open this file.'));reader.readAsDataURL(file)});
  const dimensions=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve([img.naturalWidth,img.naturalHeight]);img.onerror=()=>reject(Error('This file could not be read as an image.'));img.src=image});
  if(version!==questionVersion)return;
  if(dimensions[0]*dimensions[1]>25000000)throw Error('Crop the screenshot to the question before uploading.');
  questionImage=image;$('question-preview').src=image;$('question-preview').hidden=false;$('question-filename').textContent=file.name;
  importStatus(questionReady?'Screenshot ready. Choose Read question to continue.':'Screenshot ready. Automatic reading is awaiting AI setup.');
 }catch(error){if(version===questionVersion)importStatus(error.message)}
}
$('question-open').onclick=()=>{$('question-dialog').showModal();$('chat-answer').focus();};
$('question-close').onclick=()=>{$('question-dialog').close();};
$('question-file').onchange=event=>loadQuestionImage(event.target.files[0]);
$('question-browse').onclick=()=>$('question-file').click();
$('question-remove').onclick=()=>{invalidateQuestion();questionImage='';$('question-preview').hidden=true;$('question-preview').removeAttribute('src');$('question-filename').textContent='';$('question-file').value='';importStatus('Screenshot removed.');};
const drop=$('question-drop');
for(const name of ['dragenter','dragover'])drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add('dragover')});
for(const name of ['dragleave','drop'])drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove('dragover')});
drop.addEventListener('drop',event=>{const files=event.dataTransfer.files;if(files.length!==1){importStatus('Drop one screenshot at a time.');return;}loadQuestionImage(files[0]);});
$('question-dialog').addEventListener('paste',event=>{const file=[...(event.clipboardData?.items||[])].find(item=>item.kind==='file'&&item.type.startsWith('image/'))?.getAsFile();if(file){event.preventDefault();loadQuestionImage(file)}});
$('question-text').addEventListener('input',invalidateQuestion);
$('question-read').onclick=async()=>{
 if(!questionReady){importStatus('Automatic reading needs the site’s AI connection.');return;}
 const text=$('question-text').value.trim();if(!text&&!questionImage){importStatus('Add a screenshot or paste a question first.');return;}
 invalidateQuestion();const version=questionVersion,controller=new AbortController();questionRequest=controller;
 $('question-read').disabled=true;importStatus('Reading your question and preparing a draft…');
 try{
  const response=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,image:questionImage}),signal:controller.signal});
  const result=await response.json();if(version!==questionVersion)return;
  if(!response.ok)throw Error(result.error||'Could not read this question.');
  const draft=result.draft;if(!draft||typeof draft.transcription!=='string')throw Error('The response was incomplete. Please try again.');
  showQuestionDraft(draft);
 }catch(error){if(version===questionVersion&&error.name!=='AbortError')importStatus(error.message||'Connection interrupted. Try again.');}
 finally{if(version===questionVersion){questionRequest=null;$('question-read').disabled=!questionReady;}}
};
function updateDraftFormat(){$('draft-format').textContent=$('draft-machine').value==='pda'?'from, input, pop, push, to':'from, input, to';$('draft-alphabet-label').hidden=$('draft-machine').value!=='dfa';}
$('draft-machine').onchange=updateDraftFormat;
function applyQuestionDraft(){
 if(!$('draft-confirm').checked){importStatus('Check the review box before replacing the diagram.');return;}
 const type=$('draft-machine').value,start=$('draft-start').value.trim(),accept=$('draft-accept').value,transitions=$('draft-transitions').value,word=$('draft-word').value,alphabet=$('draft-alphabet').value;
 const oldAlphabet=$('alphabet').value;
 try{
  $('alphabet').value=alphabet;
  (type==='dfa'?parseDfa:type==='pda'?parsePda:parse)(start,accept,transitions,word);
 }catch(error){importStatus(error.message);return;}finally{$('alphabet').value=oldAlphabet;}
 drafts[activeMachine]=snapshotDraft();activeMachine=type;$('machine').value=type;
 for(const [key,value]of Object.entries({start,accept,transitions,word,alphabet}))$(key).value=value;
 $('example').value='';diagramMode='states';resetTransitionEditor();machineControls();build();$('question-dialog').close();
}
$('question-apply').onclick=applyQuestionDraft;
fetch('/api/import-config').then(r=>{if(!r.ok)throw Error();return r.json()}).then(config=>{questionReady=config.ready===true;$('question-read').disabled=!questionReady;$('question-setup').hidden=questionReady;}).catch(()=>{$('question-setup').hidden=false;$('question-setup').textContent='Question reading is unavailable right now. Your diagram editor still works.';});

function showQuestionDraft(draft){
  $('question-transcription').textContent=draft.transcription;$('question-explanation').textContent=draft.explanation;
  $('question-warnings').textContent=(draft.warnings||[]).join('\n');
  $('draft-review').hidden=false;$('draft-fields').hidden=draft.status!=='ready';$('question-apply').hidden=draft.status!=='ready';$('draft-confirm').checked=false;
  if(draft.status!=='ready'){importStatus(draft.clarification||'More detail is needed. Add it to your question and try again.');return;}
  for(const field of ['machine','start','accept','alphabet','transitions','word'])$('draft-'+field).value=draft[field];
  updateDraftFormat();importStatus('Review the draft against the question, then build it. AI proposals can be wrong.');
}

const chatImportPrompt = `Read my question or screenshot and propose the requested DFA, NFA, or PDA. Return one JSON object for Automata Lab, with these fields:
{"machine":"nfa","start":"q0","accept":"q1","alphabet":"a, b","transitions":"q0, a, q1","word":"a","transcription":"The question as read","explanation":"Brief reasoning and assumptions","warnings":[]}
Use machine dfa, nfa, or pda. All fields except warnings are strings; warnings is an array of strings. Final states are comma-separated (empty string for none); alphabet is comma-separated single characters. State names must be 1–16 letters, digits, underscores, or hyphens. Transitions is a newline-separated string: from, input, to for DFA/NFA; from, input, pop, push, to for PDA. Use eps for epsilon. Input and stack symbols are single characters; no commas or whitespace as symbols. DFA transitions must cover every state and alphabet symbol, with no epsilon or conflicts. PDA starts with an empty stack and accepts by final state only after consuming all input; stack top is on the left. Include needed stack initialization transitions. Use an empty word if no test input is supplied. Do not invent missing or illegible details: ask me to clarify before producing JSON. The example above demonstrates the format only; build the machine for MY question.`;
$('chat-prompt').value=chatImportPrompt;
$('chat-copy-prompt').onclick=async()=>{
 try{await navigator.clipboard.writeText(chatImportPrompt);importStatus('Prompt copied. Paste it in chat with your question or screenshot.');}
 catch{$('chat-prompt').focus();$('chat-prompt').select();importStatus('Select and copy the highlighted prompt with ⌘C / Ctrl+C.');}
};
function parseChatDraft(raw){
 if(raw.length>50000)throw Error('Paste an answer under 50,000 characters.');
 let text=raw.trim();
 const fence=text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);if(fence)text=fence[1];
 let value;try{value=JSON.parse(text)}catch{throw Error('Paste only the JSON answer from chat, with or without its code block.');}
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('The answer must be a JSON object.');
 if(!['dfa','nfa','pda'].includes(value.machine))throw Error('Machine must be dfa, nfa, or pda.');
 for(const key of ['start','accept','transitions'])if(typeof value[key]!=='string')throw Error('The answer needs a '+key+' string.');
 for(const key of ['alphabet','word','transcription','explanation'])if(value[key]!==undefined&&typeof value[key]!=='string')throw Error(key+' must be a string.');
 if(value.warnings!==undefined&&(!Array.isArray(value.warnings)||value.warnings.some(w=>typeof w!=='string')))throw Error('Warnings must be a list of text strings.');
 if(value.machine==='dfa'&&!value.alphabet?.trim())throw Error('Include the alphabet for this DFA.');
 return {status:'ready',machine:value.machine,start:value.start,accept:value.accept,transitions:value.transitions,alphabet:value.alphabet||'',word:value.word||'',transcription:value.transcription||'',explanation:value.explanation||'',warnings:value.warnings||[]};
}
$('chat-answer').addEventListener('input',()=>{invalidateQuestion();importStatus('');});
$('chat-review').onclick=()=>{
 invalidateQuestion();
 try{showQuestionDraft(parseChatDraft($('chat-answer').value));importStatus('Review the imported machine and any assumptions, then build it.');}
 catch(error){importStatus(error.message);}
};
