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
$('question-open').onclick=()=>{$('question-dialog').showModal();$('question-text').focus();};
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
  $('question-transcription').textContent=draft.transcription;$('question-explanation').textContent=draft.explanation;
  $('question-warnings').textContent=(draft.warnings||[]).join('\n');
  $('draft-review').hidden=false;$('draft-fields').hidden=draft.status!=='ready';$('question-apply').hidden=draft.status!=='ready';$('draft-confirm').checked=false;
  if(draft.status!=='ready'){importStatus(draft.clarification||'More detail is needed. Add it to your question and try again.');return;}
  for(const field of ['machine','start','accept','alphabet','transitions','word'])$('draft-'+field).value=draft[field];
  updateDraftFormat();importStatus('Review the draft against the question, then build it. AI proposals can be wrong.');
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
