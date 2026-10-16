const reports = {
  eva_ground: `END-OF-RUN REPORT — EVA GROUND CONTROL

PRIMARY OBJECTIVE
Bring Maya Laurent safely back aboard the station. Use primaryObjectiveReached as authoritative; do not re-judge it.

SECONDARY CONSEQUENCES
For this P0, report only significant states explicitly established in the transcript, such as the hatch being opened or a specific physical fault being observed/repaired. Do not invent hidden WORLD STATE, do not reveal the randomized faulty latch unless Maya actually observed and communicated the relevant physical evidence, and do not evaluate player performance.`,

  investigation: `END-OF-RUN REPORT — NICOLAS COLIN

PRIMARY OBJECTIVE
Determine whether the player obtained from Nicolas information that establishes without ambiguity who caused Marc Laurent's death.
The canonical successful outcome label is: ÉMILIE LAURENT.
Use the supplied primaryObjectiveReached boolean as authoritative for success/failure. Do not re-judge it.

SECONDARY CONSEQUENCES
Return only significant secondary outcomes that were actually established in THIS transcript. They must be grounded in something Nicolas communicated, admitted, agreed to, or learned during the run. Do not infer an aftermath beyond the conversation.
Relevant consequence families include, when actually established:
- Nicolas revealed or acknowledged his intimate/romantic relationship with Émilie.
- Nicolas admitted entering the Laurent apartment after Marc's death.
- Nicolas admitted removing, hiding, destroying or disposing of evidence connected to Marc's death.
- Nicolas admitted that his earlier police statement was deliberately false in a materially important way.
- Nicolas revealed materially important information about Émilie's account beyond the bare identity required by the primary objective.
Do not report minor clues, routine denials, clothing details, or every contradiction as consequences.
Do not repeat the primary objective as a secondary consequence.
Do not label consequences good/bad or evaluate player performance.`,

  espionage: `END-OF-RUN REPORT — ALEXEÏ MOROZOV

PRIMARY OBJECTIVE
Obtain from Morozov the identity of the country targeted by the Russian operation.
The canonical successful outcome label is: POLOGNE.
Use the supplied primaryObjectiveReached boolean as authoritative for success/failure. Do not re-judge it.

SECONDARY CONSEQUENCES
Return only significant changed states that were actually produced in THIS run. The trusted event log tells you what the player really presented; it is evidence for reasoning, not a checklist to reproduce.

A dossier exposure qualifies only when the conversation establishes a material downstream consequence beyond Morozov simply reading it. Examples:
- ORPHÉE qualifies if Sokolov is now materially exposed/endangered, Morozov says Moscow will act on him, or another concrete new risk is established. Prefer wording about Sokolov's changed situation, not 'the ORPHÉE card was shown'.
- FAS qualifies if Morozov commits or clearly states an intention to carry the French strategic signal to Moscow, makes transmission of that signal part of the bargain, changes his position because of it, or another concrete strategic consequence is established. Do not report merely that Morozov learned about the alert.
- Pay special attention to the final decisive exchange: if Morozov gives the objective information as part of an explicit or clearly reciprocal bargain, preserve the other side of that bargain as a consequence when it creates a meaningful commitment, intended action, or changed strategic position.
- Distinguish an established intention from a completed future event. Example: if Morozov says the warning must reach Moscow or that he can carry it, report the established intention/role in the exchange; never claim that Moscow has already received it.
- MERCIER qualifies only if the disclosure produces a concrete new commitment, threat, protective action, rupture, or other durable changed state. Morozov merely learning that Mercier was surveilled is not by itself a secondary consequence.
- Morozov explicitly agrees to a future clandestine contact, channel, meeting, cooperation, or materially significant action.
- The player makes a concrete promise or concession that Morozov explicitly accepts as part of an agreement.

Do not report the inventory of documents shown. Do not report mere reactions, threats, proposals, bluffs, possibilities, suspicions, or information receipt without a meaningful changed state.
Do not repeat Poland as a secondary consequence.
Do not label consequences good/bad or evaluate player performance.`,

  negotiation: `END-OF-RUN REPORT — BERNARD DELMAS

PRIMARY OBJECTIVE
Prevent the explosive device from detonating by obtaining Bernard's actual surrender and permission for the GIGN and bomb-disposal specialists to take control before the deadline.
Use the supplied primaryObjectiveReached boolean as authoritative for total success/failure. Do not re-judge it.
The engine separately tracks whether Claire Morel was actually released.

SECONDARY CONSEQUENCES
Return only significant changed states actually established in THIS run. Do not score, rank or coach the player.
Relevant consequence families include, only when actually established:
- Claire Morel was actually released before the end of the run. If the primary objective was not reached, this is the defining partial-resolution consequence.
- Bernard made a concrete, accepted demand, concession, commitment or agreement that materially changed the crisis.
- Bernard disclosed materially important information about the Julien Delmas case that was not already in the player's briefing.
- Bernard learned Anne's authentic message if the trusted event log confirms that FILE was actually presented; report this only if the conversation establishes a meaningful downstream change, not merely receipt of the message.
- Bernard accepted a controlled intervention, surrender process, or other concrete step toward ending the crisis.

Do not invent an aftermath beyond the transcript. Do not decide whether Thomas Vasseur killed Julien, whether the knife was the murder weapon, or whose blood was on it. Those facts are canonically unresolved.
Do not report the inventory of FILES shown. Do not repeat the primary objective as a secondary consequence.`,

};

function getReportRules(id) { return reports[id] || null; }
module.exports = { getReportRules };
