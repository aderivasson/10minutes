const { getReportRules } = require('./scenarios/reports');

const headers = {'Content-Type':'application/json','Cache-Control':'no-store'};
const reply = (statusCode, body) => ({statusCode, headers, body:JSON.stringify(body)});
const requestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

async function fetchWithTimeout(url, options, timeoutMs=24000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, {...options, signal:controller.signal}); }
  finally { clearTimeout(timer); }
}

exports.handler = async (event) => {
  const rid=requestId();
  if(event.httpMethod!=='POST') return reply(405,{error:'METHOD_NOT_ALLOWED',requestId:rid});
  try {
    if(!process.env.OPENAI_API_KEY) return reply(500,{error:'CONFIG_ERROR',requestId:rid});
    if(typeof event.body!=='string'||event.body.length>80000) return reply(413,{error:'PAYLOAD_TOO_LARGE',requestId:rid});
    const body=JSON.parse(event.body||'{}');
    const scenarioId=typeof body.scenarioId==='string'?body.scenarioId:'';
    const rules=getReportRules(scenarioId);
    const outputLanguage=body.language==='en'?'English':'French';
    if(!rules) return reply(400,{error:'UNKNOWN_SCENARIO',requestId:rid});
    const transcript=typeof body.transcript==='string'?body.transcript.slice(0,30000):'';
    const primaryObjectiveReached=body.primaryObjectiveReached===true;
    const hostageReleased=body.hostageReleased===true;
    const trustedEvents=Array.isArray(body.trustedEvents)?body.trustedEvents.slice(0,30):[];
    if(!transcript.trim()) return reply(400,{error:'EMPTY_TRANSCRIPT',requestId:rid});

    const instructions=`10 MINUTES — END-OF-RUN REPORT ENGINE\n\nYou are not the NPC and you are not a coach. Produce a factual end-of-run report from the supplied transcript.\n\nFOUNDATIONAL RULES\n- The ENGINE judges the primary objective. The report records what else changed.\n- A secondary consequence must be grounded in an event, disclosure, commitment, agreement, or information transfer that actually occurred in this run.
- TRUSTED EVENT LOG is authoritative evidence about actions that actually happened. A spoken player claim is NOT proof that an item was shown.
- CRITICAL: A TRUSTED EVENT IS AN INPUT TO YOUR REASONING, NOT AUTOMATICALLY A CONSEQUENCE. Never turn the list of presented dossier items into a list of consequences.
- A consequence requires a meaningful change produced during the run: a new commitment, agreement, durable change of position, newly created risk/exposure, or intended action explicitly established in the conversation.
- If a presented document creates a meaningful exposure, describe the downstream changed state, not merely 'the document was shown' or a paraphrase of its contents.
- Prefer consequences that would still matter after the conversation ends. Mere receipt of information is normally not enough unless that receipt itself creates a material new risk or state.
- Re-read the final NPC turn and the immediately preceding player turn before finalizing. Objective-revealing turns often also establish a bargain, commitment, intended action, or changed position that must not be lost merely because the primary objective was reached in the same reply.
- Never invent a plausible aftermath, future event, hidden consequence, motive, or off-screen action.\n- Never score, praise, criticize, rank, or explain the player's strategy.\n- Never reveal a better strategy, missed path, hidden truth, or information the player did not obtain.\n- Do not classify consequences as positive or negative.\n- Prefer 0-4 meaningful consequences. Zero is valid.\n- Write concise ${outputLanguage} suitable for an in-game report. Preserve French institutions, names and places; translate for intelligibility, never Americanize them.\n\n${rules}\n\nAUTHORITATIVE RUN STATE\nPrimary objective reached: ${primaryObjectiveReached ? 'YES' : 'NO'}\nHostage Claire Morel released: ${hostageReleased ? 'YES' : 'NO'}`;
    const input=`AUTHORITATIVE PRIMARY OBJECTIVE STATUS: ${primaryObjectiveReached?'SUCCESS':'FAILURE'}\n\nTRUSTED EVENT LOG (engine-certified actions):\n${trustedEvents.length?JSON.stringify(trustedEvents,null,2):'No trusted dossier event recorded.'}\n\nTRANSCRIPT OF THIS RUN:\n${transcript}`;
    let resp;
    try {
      resp=await fetchWithTimeout('https://api.openai.com/v1/responses',{
        method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.6-terra',instructions,input,reasoning:{effort:'medium'},max_output_tokens:500,
          text:{format:{type:'json_schema',name:'end_run_report',strict:true,schema:{type:'object',properties:{consequences:{type:'array',items:{type:'string',maxLength:220},maxItems:4}},required:['consequences'],additionalProperties:false}}}})
      },24000);
    } catch(e) { return reply(e?.name==='AbortError'?504:502,{error:e?.name==='AbortError'?'OPENAI_TIMEOUT':'UPSTREAM_NETWORK_ERROR',requestId:rid,retryable:true}); }
    const raw=await resp.json().catch(()=>null);
    if(!resp.ok||!raw) return reply(502,{error:'OPENAI_ERROR',requestId:rid,retryable:true});
    const text=raw.output_text||(raw.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;
    let out; try{out=JSON.parse(text)}catch{return reply(502,{error:'INVALID_STRUCTURED_OUTPUT',requestId:rid,retryable:true})}
    if(!out||!Array.isArray(out.consequences)) return reply(502,{error:'SCHEMA_MISMATCH',requestId:rid,retryable:true});
    return reply(200,{primaryObjectiveReached,consequences:out.consequences.slice(0,4),requestId:rid});
  } catch(e) { console.error(`[${rid}] REPORT_FUNCTION_ERROR`,e); return reply(500,{error:'FUNCTION_ERROR',requestId:rid,retryable:true}); }
};
