const crypto = require('crypto');

const ACTIONS = [
  'OPEN_HATCH_MAINTENANCE_PANEL','INSPECT_LATCH','CHECK_LOCAL_POWER','TEST_LATCH',
  'OBSERVE_ACT','OBSERVE_LINK','OBSERVE_LATCH','OPEN_ACT_SERVICE_COVER',
  'REMOVE_OBSTRUCTION','CLOSE_ACT_SERVICE_COVER','OPEN_HATCH','ENTER_STATION',
  'OBSERVE_VISIBLE','OPEN_MAINTENANCE_PANEL','OPEN_LATCH_COVER','OPEN_LN','CHECK_PWR0',
  'CHECK_PWR','CHECK_LINK','CHECK_LATCH','TEST_ACT','OPEN_ACT_COVER','REMOVE_SCREW','CLOSE_ACT_COVER'
];

const physicalWorld = require('./eva-physical-world.js');
const {newWorld, getVisibleObjects, getAccessibleObjects} = physicalWorld;

function key(){
  const secret=process.env.EVA_STATE_SECRET || process.env.OPENAI_API_KEY;
  if(!secret) throw new Error('EVA_STATE_SECRET_MISSING');
  return crypto.createHash('sha256').update(`10minutes-eva-state-v1:${secret}`).digest();
}
function seal(world){
  const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(world),'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return [iv,tag,ciphertext].map(x=>x.toString('base64url')).join('.');
}
function open(token){
  if(typeof token!=='string'||token.length>12000) throw new Error('INVALID_EVA_STATE');
  const parts=token.split('.'); if(parts.length!==3) throw new Error('INVALID_EVA_STATE');
  const [iv,tag,ciphertext]=parts.map(x=>Buffer.from(x,'base64url'));
  const decipher=crypto.createDecipheriv('aes-256-gcm',key(),iv); decipher.setAuthTag(tag);
  const raw=Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString('utf8');
  const w=JSON.parse(raw); if(!w||w.faultType!=='ACT_JAM') throw new Error('INVALID_EVA_STATE');
  if(w.version!==2) throw new Error('EVA_STATE_VERSION_UNSUPPORTED');
  return w;
}
function groundObservation(w){return {pwr0:w.pwr0,pos1:w.pos[1],pos2:w.pos[2],pos3:w.pos[3],pos4:w.pos[4],hatchReady:!!w.hatchReady,hatch:w.hatch,evaSafe:!!w.evaSafe};}
function mark(w,x){if(!w.observed.includes(x))w.observed.push(x);}
function result(ok,observation,code){return {ok,observation,code};}
function requireLatch(l){return Number.isInteger(l)&&l>=1&&l<=4;}

// F1.2: deterministic observations and access checks. Interpreter/Maya wiring is F1.3.
function observe(w, area=null, lang='fr') {
  const en=lang==='en', visible=getVisibleObjects(w);
  let ids=visible;
  if(area!==null){
    const n=Number(area);
    if(!requireLatch(n)) return result(false,en?'Specify L1, L2, L3 or L4.':'Précisez L1, L2, L3 ou L4.','LATCH_REQUIRED');
    if(!visible.includes(`L${n}_COVER`)) return result(false,en?'That area is not visible.':'Cette zone n’est pas visible.','NOT_VISIBLE');
    ids=visible.filter(id=>id===`L${n}_COVER`||id.endsWith(`${n}`)||id.startsWith(`ACT${n}_`));
  }
  ids.forEach(id=>{if(!w.discoveredObjects.includes(id))w.discoveredObjects.push(id);});
  return result(true,(en?'Visible: ':'Visibles : ')+ids.join(', ')+'.','VISIBLE_INVENTORY');
}
function execute(w,intent,lang='fr'){
  const en=lang==='en', a=intent.action, l=intent.latch===null||intent.latch===undefined?null:Number(intent.latch);
  const visible=getVisibleObjects(w), accessible=getAccessibleObjects(w);
  const response=(ok,fr,enText,code)=>result(ok,en?enText:fr,code);
  const target=(id)=>accessible.includes(id);
  const blocked=()=>response(false,'Cet élément n’est pas visible ou accessible.','That item is not visible or accessible.','NOT_ACCESSIBLE');
  const record=(action)=>{w.completedActions.push({action,latch:l});};
  if(a==='OBSERVE_VISIBLE'||a==='INSPECT_LATCH')return observe(w,a==='INSPECT_LATCH'?l:null,lang);
  if(a==='OPEN_HATCH_MAINTENANCE_PANEL'||a==='OPEN_MAINTENANCE_PANEL'){
    if(!target('MAINTENANCE_PANEL'))return blocked();
    if(w.hatchMaintenancePanel==='OPEN')return response(true,'Le panneau est déjà ouvert.','The panel is already open.','ALREADY_OPEN');
    w.hatchMaintenancePanel='OPEN';record(a);
    return response(true,'Le panneau de maintenance extérieur est ouvert.','The exterior maintenance panel is open.','PANEL_OPENED');
  }
  if(a==='OPEN_LATCH_COVER'||a==='OPEN_LN'){
    if(!requireLatch(l))return response(false,'Précisez L1, L2, L3 ou L4.','Specify L1, L2, L3 or L4.','LATCH_REQUIRED');
    if(!target(`L${l}_COVER`))return blocked();
    if(w.latchCover[l]==='OPEN')return response(true,`Le capot L${l} est déjà ouvert.`,`L${l} cover is already open.`,'ALREADY_OPEN');
    w.latchCover[l]='OPEN';record(a);
    return response(true,`Le capot L${l} est ouvert.`,`L${l} cover is open.`,'LATCH_COVER_OPENED');
  }
  if(a==='CHECK_PWR0'||(a==='CHECK_PWR'&&l===0)){
    if(!target('PWR0'))return blocked();
    mark(w,'pwr0');return response(true,'Le voyant jaune PWR0 est allumé.','The yellow PWR0 indicator is lit.','PWR_OBSERVED');
  }
  const map={CHECK_PWR:'PWR',CHECK_LOCAL_POWER:'PWR',CHECK_LINK:'LINK',OBSERVE_LINK:'LINK',CHECK_LATCH:'LATCH',OBSERVE_LATCH:'LATCH',TEST_ACT:'ACT',OBSERVE_ACT:'ACT',OPEN_ACT_COVER:'ACT',OPEN_ACT_SERVICE_COVER:'ACT',CLOSE_ACT_COVER:'ACT',CLOSE_ACT_SERVICE_COVER:'ACT',REMOVE_SCREW:'ACT',REMOVE_OBSTRUCTION:'ACT',TEST_LATCH:'LATCH'};
  if(map[a]){
    if(!requireLatch(l))return response(false,'Précisez L1, L2, L3 ou L4.','Specify L1, L2, L3 or L4.','LATCH_REQUIRED');
    if(!target(`${map[a]}${l}`))return blocked();
  }
  if(a==='CHECK_PWR'||a==='CHECK_LOCAL_POWER'){
    mark(w,`pwr${l}`);return response(true,`Le voyant jaune PWR${l} est allumé.`,`The yellow PWR${l} indicator is lit.`,'PWR_OBSERVED');
  }
  if(a==='CHECK_LINK'||a==='OBSERVE_LINK'){
    mark(w,`link${l}`);return response(true,`La tige bleue LINK${l} paraît alignée.`,`The blue LINK${l} rod appears aligned.`,'LINK_OBSERVED');
  }
  if(a==='CHECK_LATCH'||a==='OBSERVE_LATCH'){
    mark(w,`latch${l}`);return response(true,`Le verrou LATCH${l} est ${w.latch[l]==='OPEN'?'ouvert':'fermé'}.`,`LATCH${l} is ${w.latch[l]==='OPEN'?'open':'closed'}.`,'LATCH_OBSERVED');
  }
  if(a==='OBSERVE_ACT'){
    mark(w,`act${l}`);return response(true,`L’engrenage rouge ACT${l} est visible.`,`The red ACT${l} gear is visible.`,'ACT_OBSERVED');
  }
  if(a==='TEST_ACT'){
    mark(w,`act${l}`);
    const stuck=w.act[l]==='JAMMED';
    return response(true,stuck?`L’engrenage ACT${l} ne tourne pas pendant le test.`:`L’engrenage ACT${l} tourne librement pendant le test.`,stuck?`ACT${l} gear does not rotate during the test.`:`ACT${l} gear rotates freely during the test.`,'ACT_TESTED');
  }
  if(a==='OPEN_ACT_COVER'||a==='OPEN_ACT_SERVICE_COVER'){
    if(!target(`ACT${l}_COVER`))return blocked();
    if(w.actServiceCover[l]==='OPEN')return response(true,'Le capot de service est déjà ouvert.','The service cover is already open.','ALREADY_OPEN');
    w.actServiceCover[l]='OPEN';record(a);
    const screw=visible.includes(`ACT${l}_SCREW`) || getVisibleObjects(w).includes(`ACT${l}_SCREW`);
    if(screw){mark(w,'foreignObject');if(!w.discoveredObjects.includes(`ACT${l}_SCREW`))w.discoveredObjects.push(`ACT${l}_SCREW`);}
    return response(true,screw?`Le capot ACT${l} est ouvert. Une vis est visiblement coincée dans l’engrenage.`:`Le capot ACT${l} est ouvert.`,screw?`ACT${l} cover is open. A screw is visibly stuck in the gear.`:`ACT${l} cover is open.`,screw?'SCREW_REVEALED':'ACT_COVER_OPENED');
  }
  if(a==='REMOVE_SCREW'||a==='REMOVE_OBSTRUCTION'){
    if(!target(`ACT${l}_SCREW`))return blocked();
    w.foreignObject='REMOVED';w.act[l]='OPERATIONAL';record(a);
    return response(true,`Maya retire la vis de l’engrenage ACT${l}.`,`Maya removes the screw from ACT${l} gear.`,'SCREW_REMOVED');
  }
  if(a==='CLOSE_ACT_COVER'||a==='CLOSE_ACT_SERVICE_COVER'){
    if(!target(`ACT${l}_COVER`))return blocked();
    if(w.actServiceCover[l]!=='OPEN')return response(true,'Le capot est déjà fermé.','The cover is already closed.','ALREADY_CLOSED');
    w.actServiceCover[l]='CLOSED';record(a);
    return response(true,`Le capot ACT${l} est refermé.`,`ACT${l} cover is closed.`,'ACT_COVER_CLOSED');
  }
  if(a==='TEST_LATCH'){
    // Legacy latch test remains distinct from the non-mutating ACT rotation test.
    if(w.actServiceCover[l]==='OPEN')return response(false,'Le capot ACT doit être fermé pour ce test.','The ACT cover must be closed for this test.','COVER_OPEN');
    if(w.act[l]!=='OPERATIONAL')return response(true,'L’engrenage ne tourne pas ; le verrou reste fermé.','The gear does not rotate; the latch stays closed.','TEST_FAILED');
    w.latch[l]='OPEN';w.pos[l]='OPEN';w.hatchReady=Object.values(w.pos).every(x=>x==='OPEN');record(a);
    return response(true,'Le mécanisme fonctionne et le verrou s’ouvre.','The mechanism operates and the latch opens.','TEST_PASSED');
  }
  if(a==='OPEN_HATCH'){
    if(!target('HATCH_CONTROLS'))return blocked();
    // F1: close any exposed service covers before the explicit hatch attempt.
    for(const n of physicalWorld.ZONES)if(w.actServiceCover[n]==='OPEN'&&w.latchCover[n]==='OPEN')w.actServiceCover[n]='CLOSED';
    const functional=physicalWorld.ZONES.every(n=>w.pwr[n]==='ONLINE'&&w.act[n]==='OPERATIONAL'&&w.link[n]==='ALIGNED');
    if(!functional)return response(false,'La trappe résiste à la commande d’ouverture.','The hatch does not open when commanded.','HATCH_BLOCKED');
    for(const n of physicalWorld.ZONES){w.latch[n]='OPEN';w.pos[n]='OPEN';}
    w.hatchReady=true;w.hatch='OPEN';w.evaSafe=true;record(a);
    return response(true,'La trappe s’ouvre. Maya entre dans le sas et regagne la station en sécurité.','The hatch opens. Maya enters the airlock and returns safely aboard.','EVA_SAFE');
  }
  if(a==='ENTER_STATION'){
    if(w.hatch!=='OPEN')return response(false,'La trappe est fermée.','The hatch is closed.','HATCH_CLOSED');
    w.evaSafe=true;record(a);return response(true,'Maya est en sécurité dans la station.','Maya is safely inside the station.','EVA_SAFE');
  }
  return response(false,'Aucune action physique reconnue.','No recognized physical action.','NO_ACTION');
}

async function callOpenAI({instructions,input,schema,max=900}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),24000);
  try{
    const resp=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.6-terra',instructions,input,reasoning:{effort:'medium'},max_output_tokens:max,text:{format:{type:'json_schema',name:'eva_turn',strict:true,schema}}})});
    const raw=await resp.json(); if(!resp.ok)throw Object.assign(new Error(raw?.error?.message||'OPENAI_ERROR'),{status:resp.status});
    const text=raw.output_text||(raw.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;
    if(!text)throw new Error('EMPTY_MODEL_OUTPUT'); return JSON.parse(text);
  } finally {clearTimeout(timer);}
}

function normalizeHistory(history){if(!Array.isArray(history))return [];return history.slice(-30).filter(x=>x&&(x.role==='user'||x.role==='assistant')&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,5000)}));}

// F1.3: externalized agent instructions, strict World-to-Maya observation projection.
const {interpreterInstructions,mayaInstructions}=require('./eva-agent-instructions.js');
const MANIPULATIONS=new Set(['OPEN_HATCH_MAINTENANCE_PANEL','OPEN_MAINTENANCE_PANEL','OPEN_LATCH_COVER','OPEN_LN','OPEN_ACT_COVER','OPEN_ACT_SERVICE_COVER','REMOVE_SCREW','REMOVE_OBSTRUCTION','CLOSE_ACT_COVER','CLOSE_ACT_SERVICE_COVER','OPEN_HATCH','TEST_LATCH','ENTER_STATION']);
function canonicalIntent(i){
 const alias={OPEN_HATCH_MAINTENANCE_PANEL:'OPEN_MAINTENANCE_PANEL',OPEN_LN:'OPEN_LATCH_COVER',OPEN_ACT_SERVICE_COVER:'OPEN_ACT_COVER',REMOVE_OBSTRUCTION:'REMOVE_SCREW',CLOSE_ACT_SERVICE_COVER:'CLOSE_ACT_COVER',CHECK_LOCAL_POWER:'CHECK_PWR',INSPECT_LATCH:'OBSERVE_VISIBLE'};
 return {action:alias[i.action]||i.action,latch:i.latch??null};
}
function safeResults(results){return results.map(r=>({ok:!!r.ok,observation:String(r.observation||'')}));}
function deterministicStage(results){return results.map(r=>r.observation).filter(Boolean).join(' ');}
function learnVocabulary(w,message){
 // Explicit Ground explanations only; never infer visibility or physical states.
 const pattern=/\b(?:ACT|LINK|PWR|LATCH|REL)\s*([1-4])\b/gi;
 for(const m of message.matchAll(pattern)){
  const term=m[0].replace(/\s+/g,'').toUpperCase();
  const explanation=/(?:c['’]est|signifie|désigne|correspond à|means|is the|refers to|=)/i.test(message);
  if(explanation)w.learnedVocabulary[term]=`${term} — L${m[1]}`;
 }
}
async function interpret(message,history,language){
 const schema={type:'object',properties:{intents:{type:'array',maxItems:8,items:{type:'object',properties:{action:{type:'string',enum:ACTIONS},latch:{anyOf:[{type:'integer',minimum:0,maximum:4},{type:'null'}]}},required:['action','latch'],additionalProperties:false}}},required:['intents'],additionalProperties:false};
 return callOpenAI({instructions:interpreterInstructions(ACTIONS,language),input:[...normalizeHistory(history),{role:'user',content:message}],schema,max:650});
}
async function speakMaya({message,history,results,language,world}){
 const schema={type:'object',properties:{action:{type:'string',maxLength:500},dialogue:{type:'string',maxLength:1800}},required:['action','dialogue'],additionalProperties:false};
 const authorized=safeResults(results);
 const instructions=mayaInstructions({language,authorized,learnedVocabulary:world.learnedVocabulary});
 const output=await callOpenAI({instructions,input:[...normalizeHistory(history),{role:'user',content:message}],schema,max:700});
 return {dialogue:String(output.dialogue||''),action:''}; // LLM action is never authoritative.
}
function executeTurn(world,intents,language='fr'){
 const results=[]; const executed=[]; const initialVisible=new Set(getVisibleObjects(world));
 for(const raw of (intents||[]).slice(0,8)){
  if(!raw||!ACTIONS.includes(raw.action))continue;
  const intent=canonicalIntent(raw),l=intent.latch;
  if(l===null && /^(CHECK_|TEST_|OBSERVE_ACT|OBSERVE_LINK|OBSERVE_LATCH|OPEN_LATCH_COVER|OPEN_ACT_COVER|REMOVE_SCREW|CLOSE_ACT_COVER)/.test(intent.action)){
   const r=result(false,language==='en'?'Which zone do you mean: L1, L2, L3 or L4?':'De quelle zone parlez-vous : L1, L2, L3 ou L4 ?','CLARIFY_TARGET');results.push(r);executed.push({...intent,ok:false,code:r.code});break;
  }
  // Barrier snapshot: a manipulation may not exploit visibility created earlier in this turn.
  const targets={OPEN_LATCH_COVER:`L${l}_COVER`,OPEN_ACT_COVER:`ACT${l}_COVER`,REMOVE_SCREW:`ACT${l}_SCREW`,CLOSE_ACT_COVER:`ACT${l}_COVER`,OPEN_MAINTENANCE_PANEL:'MAINTENANCE_PANEL',OPEN_HATCH:'HATCH_CONTROLS'};
  const id=targets[intent.action];
  if(MANIPULATIONS.has(intent.action)&&id&&!initialVisible.has(id)){
   const r=result(false,language==='en'?'That part was not visible when you gave the instruction. Confirm after inspecting the newly opened area.':'Cet élément n’était pas visible au moment de votre instruction. Confirmez après avoir observé la zone ouverte.','CONFIRM_NEW_LAYER');results.push(r);executed.push({...intent,ok:false,code:r.code});break;
  }
  const r=execute(world,intent,language);results.push(r);executed.push({...intent,ok:r.ok,code:r.code});if(!r.ok||world.evaSafe)break;
 }
 return {results,executed};
}
async function handleTurn(body){
 const language=body.language==='en'?'en':'fr';
 if(body.playerAction?.type==='eva_init'){
  const world=newWorld();return {action:'',dialogue:'',objectiveReached:false,evaStateToken:seal(world),groundObservation:groundObservation(world),evaInitialized:true};
 }
 const message=typeof body.message==='string'?body.message.trim():'';
 if(!message)throw Object.assign(new Error('BAD_REQUEST'),{statusCode:400});
 let world;try{world=open(body.evaStateToken);}catch(err){throw Object.assign(new Error(err.message==='EVA_STATE_VERSION_UNSUPPORTED'?'EVA_STATE_VERSION_UNSUPPORTED':'INVALID_EVA_STATE'),{statusCode:400});}
 if(world.evaSafe)throw Object.assign(new Error('EVA_ALREADY_COMPLETED'),{statusCode:400});
 learnVocabulary(world,message);
 const parsed=await interpret(message,body.history,language);
 const {results,executed}=executeTurn(world,parsed.intents,language);
 const maya=await speakMaya({message,history:body.history,results,language,world});
 return {action:deterministicStage(results),dialogue:maya.dialogue,objectiveReached:!!world.evaSafe,evaStateToken:seal(world),groundObservation:groundObservation(world),executedActions:executed};
}

module.exports={handleTurn,newWorld,groundObservation,execute,observe,executeTurn,safeResults,learnVocabulary,seal,open,ACTIONS,getVisibleObjects,getAccessibleObjects};
