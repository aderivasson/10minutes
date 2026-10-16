const engineRules = require('./engine/rules.js');
const { getScenario } = require('./scenarios');

const headers = {'Content-Type':'application/json','Cache-Control':'no-store'};
const requestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const reply = (statusCode, body) => ({statusCode, headers, body:JSON.stringify(body)});
function sanitizeNpcOutput(text) {
  const src=String(text||'');
  const chars=[...src];
  const bad=chars.filter(ch=>!/[\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u.test(ch));
  if (!bad.length) return {ok:true,text:src,cleaned:false};
  if (bad.length<=12 && bad.length/Math.max(chars.length,1)<=0.10) {
    return {ok:true,text:src.replace(/[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]+/gu,'').replace(/[ \\t]{2,}/g,' ').trim(),cleaned:true};
  }
  return {ok:false,text:src,cleaned:false};
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-30).filter(x => x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string')
    .map(x => ({role:x.role, content:x.content.slice(0,5000)}));
}

async function fetchWithTimeout(url, options, timeoutMs=24000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, {...options, signal:controller.signal}); }
  finally { clearTimeout(timer); }
}

exports.handler = async (event) => {
  const rid = requestId();
  if (event.httpMethod !== 'POST') return reply(405,{error:'METHOD_NOT_ALLOWED',requestId:rid});
  try {
    if (!process.env.OPENAI_API_KEY) return reply(500,{error:'CONFIG_ERROR',requestId:rid});
    if (typeof event.body !== 'string' || event.body.length > 120000) return reply(413,{error:'PAYLOAD_TOO_LARGE',requestId:rid});
    const body = JSON.parse(event.body || '{}');
    const {runId,turnId,message,remainingSeconds} = body;
    const playerAction = body.playerAction && typeof body.playerAction === 'object' ? body.playerAction : null;
    const scenarioId = typeof body.scenarioId === 'string' ? body.scenarioId : 'investigation';
    const outputLanguage = body.language === 'en' ? 'English' : 'French';
    const scenario = getScenario(scenarioId);
    const authoritativeHostageReleased = scenarioId === 'negotiation' && body.hostageReleased === true;
    const spokenMessage = typeof message === 'string' ? message.trim() : '';
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof runId !== 'string' || typeof turnId !== 'string' || !uuidRe.test(runId) || !uuidRe.test(turnId)) {
      return reply(400,{error:'INVALID_RUN_OR_TURN_ID',requestId:rid});
    }
    if (spokenMessage.length > 3000) return reply(413,{error:'MESSAGE_TOO_LARGE',requestId:rid});
    const isPresentAction = playerAction?.type === 'present_dossier_item';
    const isEvaInit = scenarioId === 'eva_ground' && playerAction?.type === 'eva_init';
    if (!runId || !turnId || (!spokenMessage && !isPresentAction && !isEvaInit)) {
      return reply(400,{error:'BAD_REQUEST',requestId:rid});
    }
    if (!scenario) return reply(400,{error:'UNKNOWN_SCENARIO',requestId:rid});

    // EVA Ground extends the existing /chat endpoint with deterministic, server-authoritative world state.
    // Legacy scenarios continue through the unchanged conversational path below.
    if (scenarioId === 'eva_ground' && typeof scenario.evaHandler === 'function') {
      try {
        const evaOut = await scenario.evaHandler(body);
        return reply(200,{...evaOut,requestId:rid,turnId,historyUserContent:spokenMessage});
      } catch (e) {
        const status = e?.statusCode || (e?.status===429?429:(e?.status>=500?502:500));
        console.error(`[${rid}] EVA_GROUND_ERROR run=${runId} turn=${turnId} code=${e?.message||'unknown'}`);
        return reply(status,{error:e?.message||'EVA_GROUND_ERROR',requestId:rid,retryable:status>=500||status===429});
      }
    }

    const safeRemaining = Number.isFinite(Number(remainingSeconds))
      ? Math.max(0, Math.min(600, Math.round(Number(remainingSeconds)))) : null;
    const clockState = safeRemaining === null
      ? 'No authoritative clock value was supplied for this turn. Do not invent one.'
      : `At the moment this turn began, ${safeRemaining} seconds remained in the scenario's authoritative conversation window. This value is authoritative. The active scenario configuration defines what the deadline means to the NPC. Do not display the numeric value unless the NPC would naturally refer to the remaining time.`;
    const negotiationState = scenarioId === 'negotiation'
      ? `\nAuthoritative negotiation state: Claire Morel has ${authoritativeHostageReleased ? 'already been released from the office' : 'NOT yet been released from the office'}. This state persists and cannot revert.` : '';
    const trustedWorldState = `TRUSTED WORLD STATE\n${clockState}${negotiationState}`;

    let trustedPlayerEvent = '';
    if (isPresentAction) {
      const itemId = typeof playerAction.dossierItemId === 'string' ? playerAction.dossierItemId : '';
      const item = scenario.dossierItems?.[itemId];
      if (!item) return reply(400,{error:'INVALID_DOSSIER_ITEM',requestId:rid});
      trustedPlayerEvent = `TRUSTED PLAYER EVENT — DOSSIER ITEM PRESENTED
The player has physically presented the following dossier item to you. The GAME ENGINE now certifies the FILE's canonical observable facts. These are exactly the facts the FILE is designed to make perceptible to the player — no hidden evidence or additional interpretation. You may interpret, explain, minimize, contextualize or lie around their significance, but you may not deny the certified observable facts themselves.

${item.title}
${item.canonicalContent || item.content}

IMPORTANT: The existence of this interaction does not mean material proof is required for you to believe player claims. You do not know what other dossier items the player possesses or could present. The absence of a presented document is never evidence that the player lacks proof.`;
    }
    const instructions = `OUTPUT LANGUAGE
Write all player-visible NPC dialogue and observable action text in ${outputLanguage}. Preserve French names, institutions, places and scenario facts; translate for intelligibility, never Americanize them.

${engineRules}

${scenario.rules}

${trustedWorldState}`;
    const history = normalizeHistory(body.history);
    const currentUserContent = [spokenMessage ? `PLAYER SAYS:\n${spokenMessage}` : '', trustedPlayerEvent].filter(Boolean).join('\n\n');
    const input = [...history,{role:'user',content:currentUserContent}];

    let resp;
    try {
      resp = await fetchWithTimeout('https://api.openai.com/v1/responses',{
        method:'POST',
        headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          model:process.env.OPENAI_MODEL || 'gpt-5.6-terra',
          instructions,input,reasoning:{effort:'medium'},max_output_tokens:600,
          text:{format:{type:'json_schema',name:'npc_turn',strict:true,schema: scenarioId === 'negotiation'
            ? {type:'object',properties:{action:{type:'string',maxLength:500},dialogue:{type:'string',maxLength:1800},objectiveReached:{type:'boolean'},hostageReleased:{type:'boolean'}},required:['action','dialogue','objectiveReached','hostageReleased'],additionalProperties:false}
            : {type:'object',properties:{action:{type:'string',maxLength:500},dialogue:{type:'string',maxLength:1800},objectiveReached:{type:'boolean'}},required:['action','dialogue','objectiveReached'],additionalProperties:false}}}
        })
      },24000);
    } catch (e) {
      if (e && e.name === 'AbortError') {
        console.error(`[${rid}] OPENAI_TIMEOUT run=${runId} turn=${turnId}`);
        return reply(504,{error:'OPENAI_TIMEOUT',requestId:rid,retryable:true});
      }
      console.error(`[${rid}] NETWORK_ERROR run=${runId} turn=${turnId}`,e);
      return reply(502,{error:'UPSTREAM_NETWORK_ERROR',requestId:rid,retryable:true});
    }

    let raw={};
    try { raw=await resp.json(); } catch(e) {
      console.error(`[${rid}] INVALID_UPSTREAM_JSON status=${resp.status}`);
      return reply(502,{error:'INVALID_UPSTREAM_RESPONSE',requestId:rid,retryable:true});
    }
    if (!resp.ok) {
      const code = resp.status===429?'OPENAI_RATE_LIMIT':(resp.status>=500?'OPENAI_5XX':'OPENAI_ERROR');
      console.error(`[${rid}] ${code} status=${resp.status}: ${raw?.error?.message || 'unknown'}`);
      return reply(resp.status===429?429:502,{error:code,requestId:rid,retryable:resp.status===429||resp.status>=500});
    }

    const text = raw.output_text || (raw.output || []).flatMap(x=>x.content || []).find(x=>x.type==='output_text')?.text;
    if (!text) {
      console.error(`[${rid}] EMPTY_MODEL_OUTPUT`);
      return reply(502,{error:'EMPTY_MODEL_OUTPUT',requestId:rid,retryable:true});
    }
    let out;
    try { out=JSON.parse(text); } catch(e) {
      console.error(`[${rid}] INVALID_STRUCTURED_OUTPUT`);
      return reply(502,{error:'INVALID_STRUCTURED_OUTPUT',requestId:rid,retryable:true});
    }
    if (!out || typeof out.action!=='string' || typeof out.dialogue!=='string' || typeof out.objectiveReached!=='boolean' || (scenarioId === 'negotiation' && typeof out.hostageReleased!=='boolean')) {
      return reply(502,{error:'SCHEMA_MISMATCH',requestId:rid,retryable:true});
    }
    const cleanAction=sanitizeNpcOutput(out.action);
    const cleanDialogue=sanitizeNpcOutput(out.dialogue);
    if (!cleanAction.ok || !cleanDialogue.ok) {
      console.error(`[${rid}] UNEXPECTED_OUTPUT_SCRIPT`);
      return reply(502,{error:'OUTPUT_SCRIPT_REJECTED',requestId:rid,retryable:true});
    }
    if (cleanAction.cleaned || cleanDialogue.cleaned) console.warn(`[${rid}] OUTPUT_SCRIPT_SANITIZED`);
    out.action=cleanAction.text; out.dialogue=cleanDialogue.text;
    const visible=`${out.action}\n${out.dialogue}`.toUpperCase();
    const forbidden=['WORLD TRUTH','PRIVATE TRUTH','NPC RULES','ENGINE RULES','TRUSTED WORLD STATE','PLAYER BRIEFING','RUNTIME OUTPUT CONTRACT'];
    if (forbidden.some(x=>visible.includes(x))) {
      console.error(`[${rid}] PROMPT_LEAKAGE_BLOCKED`);
      return reply(502,{error:'OUTPUT_REJECTED',requestId:rid,retryable:true});
    }

    // V9.1.5.1: NPC response + objective signal are produced in the SAME OpenAI call.
    // No auxiliary resolution request is made, preserving V9.1.4.2's one-call stability architecture.
    return reply(200,{...out,requestId:rid,turnId,historyUserContent:currentUserContent});
  } catch(e) {
    console.error(`[${rid}] FUNCTION_ERROR`,e);
    return reply(500,{error:'FUNCTION_ERROR',requestId:rid,retryable:true});
  }
};
