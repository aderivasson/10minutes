const {test}=require('node:test');
const assert=require('node:assert/strict');
const {newWorld,executeTurn,execute,observe,safeResults,learnVocabulary}=require('../netlify/functions/scenarios/eva-ground.js');
const {mayaInstructions}=require('../netlify/functions/scenarios/eva-agent-instructions.js');
const intent=(action,latch=null)=>({action,latch});
test('F1.3 barrier snapshot blocks chained newly exposed manipulation',()=>{
 const w=newWorld({faultLatch:2});const x=executeTurn(w,[intent('OPEN_MAINTENANCE_PANEL'),intent('OPEN_LATCH_COVER',2)],'en');
 assert.equal(x.results[0].code,'PANEL_OPENED');assert.equal(x.results[1].code,'CONFIRM_NEW_LAYER');assert.equal(w.latchCover[2],'CLOSED');
});
test('F1.3 multiple actions on initially accessible objects are allowed',()=>{
 const w=newWorld({faultLatch:2});execute(w,intent('OPEN_MAINTENANCE_PANEL'),'en');execute(w,intent('OPEN_LATCH_COVER',2),'en');
 const x=executeTurn(w,[intent('CHECK_PWR',2),intent('TEST_ACT',2)],'en');assert.deepEqual(x.results.map(r=>r.code),['PWR_OBSERVED','ACT_TESTED']);
});
test('F1.3 ambiguous target does not execute or queue',()=>{
 const w=newWorld();execute(w,intent('OPEN_MAINTENANCE_PANEL'),'en');const x=executeTurn(w,[intent('OPEN_LATCH_COVER'),intent('OPEN_LATCH_COVER',1)],'en');
 assert.equal(x.results.length,1);assert.equal(x.results[0].code,'CLARIFY_TARGET');assert.equal(w.latchCover[1],'CLOSED');
});
test('F1.3 no codes or telemetry in Maya observation projection',()=>{
 const w=newWorld({faultLatch:4});const r=executeTurn(w,[intent('OPEN_HATCH')],'en').results;
 const safe=safeResults(r);assert.equal(safe[0].code,undefined);const prompt=mayaInstructions({language:'en',authorized:safe,learnedVocabulary:{}});
 assert.doesNotMatch(prompt,/HATCH_BLOCKED|faultLatch|pos4|UNCONFIRMED|remainingSeconds/);
});
test('F1.3 vocabulary persistence does not grant visibility',()=>{
 const w=newWorld({faultLatch:3});learnVocabulary(w,'ACT3 désigne l’engrenage rouge de L3.');
 assert.ok(w.learnedVocabulary.ACT3);assert.doesNotMatch(observe(w,null,'fr').observation,/ACT3/);
});
test('F1.3 visual ACT observation is not a rotation test',()=>{
 const w=newWorld({faultLatch:1});execute(w,intent('OPEN_MAINTENANCE_PANEL'),'en');execute(w,intent('OPEN_LATCH_COVER',1),'en');
 assert.equal(execute(w,intent('OBSERVE_ACT',1),'en').code,'ACT_OBSERVED');assert.equal(execute(w,intent('TEST_ACT',1),'en').code,'ACT_TESTED');
});
test('F1.3 new layer screw removal requires separate confirmation',()=>{
 const w=newWorld({faultLatch:2});execute(w,intent('OPEN_MAINTENANCE_PANEL'),'en');execute(w,intent('OPEN_LATCH_COVER',2),'en');
 const x=executeTurn(w,[intent('OPEN_ACT_COVER',2),intent('REMOVE_SCREW',2)],'en');
 assert.equal(x.results[0].code,'SCREW_REVEALED');assert.equal(x.results[1].code,'CONFIRM_NEW_LAYER');assert.equal(w.act[2],'JAMMED');
});
