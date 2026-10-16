// EVA F1.1 — deterministic physical topology and initial World V2 state.
// F1.2 will route execute()/observations through these visibility/access gates.
const crypto = require('crypto');
const ZONES = Object.freeze([1,2,3,4]);
const COMPONENTS = Object.freeze(['PWR','ACT','LINK','REL','LATCH']);
const COVER_STATES = Object.freeze(['OPEN','CLOSED']);

function newWorld({faultLatch = crypto.randomInt(1,5)} = {}) {
  if (!ZONES.includes(faultLatch)) throw new RangeError('INVALID_FAULT_LATCH');
  const indexed = value => Object.fromEntries(ZONES.map(n => [n,value]));
  const world = {
    version:2, faultType:'ACT_JAM', faultLatch,
    pwr0:'ONLINE', pwr:indexed('ONLINE'), act:indexed('OPERATIONAL'),
    link:indexed('ALIGNED'), latch:indexed('OPEN'), pos:indexed('OPEN'),
    foreignObject:'PRESENT', hatchMaintenancePanel:'CLOSED',
    latchCover:indexed('CLOSED'), actServiceCover:indexed('CLOSED'),
    hatch:'CLOSED', hatchReady:false, evaSafe:false,
    observed:[], discoveredObjects:[], completedActions:[], learnedVocabulary:{}
  };
  world.act[faultLatch]='JAMMED';
  world.latch[faultLatch]='CLOSED';
  world.pos[faultLatch]='UNCONFIRMED';
  return world;
}

// IDs are intentionally non-diagnostic: never encode the fault location.
function getVisibleObjects(w) {
  const visible=['HATCH','HATCH_CONTROLS','MAINTENANCE_PANEL'];
  if(w.hatchMaintenancePanel!=='OPEN') return visible;
  visible.push('PWR0', ...ZONES.map(n=>`L${n}_COVER`));
  for(const n of ZONES){
    if(w.latchCover?.[n]!=='OPEN') continue;
    visible.push(...COMPONENTS.map(part=>`${part}${n}`),`ACT${n}_COVER`);
    if(w.actServiceCover?.[n]==='OPEN'){
      visible.push(`ACT${n}_INTERIOR`);
      if(n===w.faultLatch&&w.foreignObject==='PRESENT') visible.push(`ACT${n}_SCREW`);
    }
  }
  return visible;
}

function getAccessibleObjects(w) {
  // Physical access is identical to line-of-sight for F1.1 topology.
  // F1.2 will distinguish observation-only objects from manipulable targets.
  return getVisibleObjects(w);
}

module.exports={newWorld,getVisibleObjects,getAccessibleObjects,ZONES,COMPONENTS,COVER_STATES};
