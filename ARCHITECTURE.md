# 10 MINUTES --- ARCHITECTURE

Status: canonical technical map created from PROD V10.9.9 and the
current EVA Ground P0 UAT. Rule: code is the source of truth. This
document records invariants and must be updated when an architectural
invariant changes.

## 1. Source-of-truth workflow

Before every build:

1.  Read `ARCHITECTURE.md` and `UI_SYSTEM.md`.
2.  Inspect the actual current UAT code.
3.  If the change touches inherited engine/backend behavior, inspect the
    current PROD reference too.
4.  Identify existing components/functions/contracts to reuse.
5.  Plan the smallest patch.
6.  Patch.
7.  Inspect the diff and search for obsolete/conflicting hacks.
8.  Run syntax/static checks.
9.  Update these docs if an invariant changed.
10. Package the build.

Never reconstruct an implementation from conversation memory when the
code is available.

## 2. Branch/reference policy

-   **PROD reference:** V10.9.9.
-   **PROD is frozen** while EVA is developed in UAT.
-   **UAT is cumulative:** every new UAT must start from the latest UAT,
    not from an older build plus remembered fixes.
-   A validated UAT may later become the new production reference.
-   Scenario-specific work must not silently fork shared engine
    behavior.

## 3. PROD runtime architecture

The production package contains:

-   `index.html` --- single-page frontend: HTML, CSS, scenario data,
    localization and client runtime.
-   `netlify/functions/chat.mjs` --- Netlify entry point.
-   `netlify/functions/chat-legacy.cjs` --- current chat request
    handler.
-   `netlify/functions/report.mjs` / `report-legacy.cjs` --- end-report
    path.
-   `netlify/functions/scenarios/index.js` --- server scenario registry.
-   `netlify/functions/scenarios/nicolas.js`
-   `netlify/functions/scenarios/morozov.js`
-   `netlify/functions/scenarios/negotiation.js`
-   `netlify/functions/scenarios/reports.js`
-   `netlify/functions/engine/rules.js`

Primary chat path:

`frontend sendPlayerTurn()` → `POST /.netlify/functions/chat` →
`chat.mjs` → `chat-legacy.cjs` → `getScenario(scenarioId)` → scenario
rules → model response → structured response returned to frontend.

## 4. Existing PROD chat contract

The frontend sends one request per normal player turn. The current
payload includes:

-   `language`
-   `runId`
-   `turnId`
-   `scenarioId`
-   `message`
-   `playerAction`
-   `remainingSeconds`
-   `hostageReleased`
-   `history`

`playerAction` is used for structured player events such as presenting a
dossier item.

The backend resolves `scenarioId` through
`netlify/functions/scenarios/index.js`. PROD V10.9.9 registers exactly:

-   `investigation`
-   `espionage`
-   `negotiation`

Unknown IDs are rejected.

The normal structured response contains at least:

-   `action`
-   `dialogue`
-   `objectiveReached`

Negotiation additionally uses authoritative `hostageReleased`.

The frontend stores the model exchange in `apiHistory`, capped to the
recent history used by the request path.

## 5. Scenario registry is the extension point

A new conversational scenario should first be considered as a new entry
in the existing server scenario architecture, not as a parallel API.

For EVA Ground, the intended direction is:

`scenarios/index.js` → register `eva_ground` → scenario-specific
rules/module → reuse the existing `/chat` transport and lifecycle
wherever possible.

Any additional EVA contract must be designed only after inspecting and
preserving the existing `/chat` contract.

## 6. Authoritative state principle

The engine already distinguishes conversational output from
authoritative state.

Existing example: - Negotiation tracks `hostageReleased` as
authoritative state. - Presented FILES can become trusted player events.

EVA extends this principle: - physical truth must be owned by
deterministic world state; - the LLM interprets language and formulates
character dialogue; - the LLM must not invent or override physical
truth; - success is derived from authoritative world state, not merely
from dialogue.

Target conceptual flow:

`PLAYER` → `language interpretation` → `WORLD validates / executes` →
`permitted observations` → `character response` → `PLAYER`

The exact server implementation is not yet canonical and must not be
invented without updating this document.

## 7. Known invalid UAT experiment --- do not preserve as architecture

The current `EVA_GROUND_P0_SERVER` UAT contains a provisional frontend
path using:

-   `evaPhase: "INTERPRET"`
-   client-side authoritative EVA world state
-   a second `evaPhase: "RESPOND"` request

This contract does **not** exist in PROD V10.9.9 and the deployed server
rejected the first Ground turn.

Therefore:

-   `INTERPRET/RESPOND` is a failed experiment, not an engine
    convention.
-   Do not build further features on it.
-   UAT-15 remains open until EVA is integrated with the real server
    contract.

The current UAT ZIP contains only frontend/static files; the supplied
PROD V10.9.9 ZIP contains the actual Netlify backend and is the backend
reference.

## 8. Frontend scenario model

PROD defines scenario data in the frontend and localized FR/EN variants.

Important responsibilities include: - selector metadata; - briefing
content; - objective; - board/background media; - FILES/cards; -
dialogue scene; - speaker/opening/action; - dossier content; -
scenario-specific flags.

EVA adds optional scenario-owned concepts such as: - `theme.accent` -
roles - telemetry - HTML/localizable FILE rectos.

These additions must remain optional so legacy scenarios do not acquire
empty UI or special-case artifacts.

## 9. Navigation model

Legacy single-role flow:

`SCENARIO SELECTION → BRIEFING → DIALOGUE`

EVA multi-role flow:

`SCENARIO SELECTION → ROLE SELECTION → ROLE-SPECIFIC BRIEFING → DIALOGUE`

Rules: - one role: skip role selection; - more than one role: show role
selection; - legacy scenarios must never show role selection; - EVA
briefing back navigation returns to role selection; - legacy briefing
back navigation returns to scenario selection.

## 10. Run lifecycle and persistence

The frontend owns: - timer state; - pause/resume; - API-wait timer
freeze; - dialogue/history rendering; - end/abandon overlays; - report
gating; - run persistence/restoration.

Current historical save key: `10minutes-investigation-run-v9142`

The name is obsolete but the key is shared across scenarios through
stored `scenarioId`. Renaming/migration is a separate low-priority task
and must not be done casually.

Reload/navigation time is not charged while restoring an active run.

## 11. End-state invariants

Voluntary END: - asks for confirmation; - pauses the timer while
confirming; - NO resumes; - YES abandons and returns to scenario
selection; - no fictional timeout/report is generated for voluntary
abandonment.

Timer expiry: - run is definitively over; - no continuation of the
interview.

Scenario success: - must follow scenario-specific authoritative rules. -
Nicolas: success only when Nicolas explicitly states the required causal
accusation. - Negotiation: `hostageReleased` is distinct from full
`objectiveReached`. - EVA Ground target rule: success only when
authoritative `EVA_SAFE === true`.

## 12. FILES architecture

FILES are scenario data rendered in multiple contexts.

Core principle: **one FILE content model, multiple responsive/context
renderers.**

Do not create separate content truth for desktop/mobile.

Current contexts: - Briefing desktop - Briefing mobile - Dialogue
dossier/sidebar

Generic FILE capability may include: - image/media recto; - video/audio
where supported; - HTML/localizable recto; - structured/localized verso.

"Tell" is not "show": a FILE is only considered presented to an NPC
through the explicit dossier presentation mechanism/trusted event.

NPCs do not automatically know FILE content merely because the player
can see it.

## 13. Desktop Briefing FILES --- UAT-13 canonical direction

Desktop Briefing uses a dedicated thumbnail + Viewer renderer. Mobile Briefing keeps its validated renderer; Dialogue keeps its dossier renderer. All consume the same FILE data.

Rules: - maximum **6 FILES** per scenario; - six predetermined safe slots inside a FILES-only zone; - slots never overlap one another or the SITUATION/DOSSIER `.context` zone; - FILE presentation metadata owns `slot`, `format` and `thumbnail`; - thumbnail is independent from the actual recto/verso; - the same `format` drives both thumbnail and Viewer; - PORTRAIT Viewer = media left / info right; - LANDSCAPE Viewer = media top / info below; - recto and verso are simultaneous (no RECTO/VERSO tabs); - non-HTML media is fully visible; - HTML rectos may scroll and remain interactive; - optional FILE `subtitle` is shared data rendered across Briefing desktop/mobile and Dialogue where applicable; - media is stopped/reset on Viewer close or FILE switch.

Desktop Home scenario tiles use a minimum-width responsive grid and reflow progressively rather than shrinking a fixed 3-column layout until mobile.

## 14. Localization

FR and EN are scenario/localization data concerns, not renderer-specific
hardcoded copies.

Keep technical IDs stable where required (`PWR0`, `POS1`--`POS4`).

EVA telemetry examples: - `O₂ CONSUMPTION` / `CONSOMMATION O₂` -
`ONLINE` / `EN LIGNE` - `OPEN` / `OUVERT` - `UNCONFIRMED` /
`NON CONFIRMÉ`

## 15. Non-regression rule

When extending the engine: 1. identify the existing shared path; 2.
extend it if possible; 3. keep the extension optional; 4. verify
Nicolas, Morozov and Bernard; 5. do not introduce a scenario-only
parallel implementation unless the existing architecture genuinely
cannot represent the feature and the new invariant is documented here.

## UAT-15 — EVA Ground server-authoritative P0 (RC5)

EVA Ground now extends the existing `/.netlify/functions/chat` endpoint; it does not use the rejected `evaPhase: INTERPRET/RESPOND` browser contract.

Server path:

`frontend sendEvaGroundTurn()` → existing `/chat` → `scenarioId=eva_ground` → scenario registry → `eva-ground.js`.

The EVA handler performs two internal model stages inside one HTTP turn: bounded natural-language action interpretation, then Maya dialogue after deterministic WORLD validation/execution. Existing scenarios continue through the unchanged legacy conversational path.

WORLD STATE is server-authoritative. The browser never receives plaintext hidden state. It stores only an AES-GCM encrypted `evaStateToken` returned by the server plus Ground-visible telemetry. The token is authenticated/decrypted server-side using a key derived from `EVA_STATE_SECRET` when configured, otherwise from the server-only `OPENAI_API_KEY`. `FAULT_LATCH`, hidden ACT state and `FOREIGN_OBJECT` are not exposed in frontend JavaScript or telemetry.

Initial EVA state is created by a `playerAction.type = eva_init` request on the same `/chat` endpoint. Exactly one latch L1–L4 is randomized per run and remains stable because the encrypted token carries the authoritative state between turns.

Maya receives conversation history, the current Ground message, and only authorized physical observations / validated action results. She does not receive hidden WORLD STATE, Ground telemetry unless Ground says it, or FILE content merely because the player opened it.

P0 bounded actions are: `OPEN_HATCH_MAINTENANCE_PANEL`, `INSPECT_LATCH`, `CHECK_LOCAL_POWER`, `TEST_LATCH`, `OBSERVE_ACT`, `OBSERVE_LINK`, `OBSERVE_LATCH`, `OPEN_ACT_SERVICE_COVER`, `REMOVE_OBSTRUCTION`, `CLOSE_ACT_SERVICE_COVER`, `OPEN_HATCH`, `ENTER_STATION`.

Actions execute sequentially and stop at the first failed prerequisite. `EVA_SAFE === true` is the sole authoritative success condition. `HATCH_READY` does not end the run; the player must still open the hatch and instruct Maya to enter the station.

## EVA F1.1 — Physical World V2 foundation (UAT development only)

`netlify/functions/scenarios/eva-physical-world.js` owns the new initial physical topology and derives visible/access objects from the authoritative World state. `eva-ground.js` imports `newWorld`, `getVisibleObjects` and `getAccessibleObjects` from this module. The encrypted token payload now uses `version: 2`; the existing AES-GCM key derivation and token wire format are unchanged. Legacy EVA V1 tokens are rejected with `EVA_STATE_VERSION_UNSUPPORTED` (new EVA session required).

At T0 only HATCH, HATCH_CONTROLS and MAINTENANCE_PANEL are visible. Opening the main panel reveals PWR0 and four closed L1–L4 covers. Opening an Ln cover reveals its PWR/ACT/LINK/REL/LATCH components and ACT service cover. Opening that service cover reveals the interior and, only for the faulted assembly before removal, the stuck screw. The fault remains one randomized ACT_JAM per session. `discoveredObjects`, `completedActions`, and `learnedVocabulary` are initialized for later phases.

**Checkpoint boundary:** F1.1 introduces topology and read-only derived visibility, but the legacy `execute()`, Interpreter and Maya still use RC5.1 behavior. Therefore this checkpoint is NOT a deployable gameplay release and does not yet guarantee perception firewall invariants. F1.2 must route all observations and action validation through the new topology. F1.3 must enforce the Maya boundary. F2 will add timed pending actions.

Deterministic tests: `node --test tests/eva-f11-world.test.cjs`.

## EVA F1.2 — Deterministic physical actions (non-deployable checkpoint)

`eva-ground.js` now provides `observe(world, area, language)` and a gated `execute(world, intent, language)` using `getVisibleObjects`/`getAccessibleObjects` from F1.1. New physical actions include opening Ln and ACT covers, checking PWR0/PWRn/LINKn/LATCHn, testing ACT rotation without state mutation, removing a visible screw, and opening the hatch with automatic station entry on successful repair. `TEST_LATCH` remains a distinct legacy operation. Observation returns the complete currently visible inventory; inaccessible targets return non-diagnostic errors. Actions remain instantaneous.

**Checkpoint boundary:** F1.3 must update the Interpreter instructions/schema, add turn-start visibility snapshot validation for compound commands, clarify ambiguous references, filter structured results sent to Maya (including removing internal codes), and make WORLD didascalies authoritative. Do not deploy F1.2 alone. No PROD modifications.

## EVA F1.3 — Interpreter / Maya observation firewall
EVA agent instructions are server-only in `netlify/functions/scenarios/eva-agent-instructions.js`. The interpreter maps natural language to bounded intents; `executeTurn()` validates initial-turn physical visibility and invokes deterministic WORLD actions. `speakMaya()` receives only authorized textual observations (not internal codes, POS telemetry, hidden World fields or exact timer) and produces dialogue only. The `action` field returned to the UI is deterministic WORLD feedback. V2 encrypted World tokens are required; V1 tokens are unsupported. F2 pending actions and O2 are not implemented.
