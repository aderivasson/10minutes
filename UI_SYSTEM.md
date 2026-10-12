# 10 MINUTES --- UI SYSTEM

Status: canonical HTML/CSS/UI map created from PROD V10.9.9 and current
EVA UAT. Rule: shared visual components consume shared tokens/variables.
Scenario data selects theme/content; components do not hardcode a
scenario identity.

## 1. Core visual tokens

Current base tokens in the UAT CSS:

-   `--bg: #070b0d`
-   `--panel: #0b1115`
-   `--line: #303a40`
-   `--text: #f0eee8`
-   `--muted: #8b989e`
-   legacy accent base: `#dfcd89`
-   `--danger: #ff7668`

EVA UAT introduces: - `--scenario-accent` - default/legacy scenario
accent: `#dfcd89` - EVA accent: `#79b9d6`

### Canonical rule

Every shared component whose color represents **scenario
identity/accent** must consume the scenario accent variable.

Do not hardcode yellow, blue, or a future scenario color inside a shared
component.

A future red-accent scenario should define its accent once in
scenario/theme data and inherit all equivalent accent-bearing UI
automatically.

## 2. Semantic colors are not scenario colors

Do not replace semantic colors with the scenario accent.

Independent semantic colors include: - danger / urgency red-rose; -
white primary body text; - gray secondary/muted text; - technical PWR /
ACT / LINK colors; - status colors whose meaning is independent of
scenario identity.

Example: the final sentence of briefing block 3 is danger-colored and
bold even in EVA; it does not become blue.

## 3. Scenario theme application

Current EVA UAT adds `theme:{accent:'#79b9d6'}` and an
`applyScenarioTheme(...)` path.

Canonical intent: - legacy scenarios fall back to legacy yellow/gold; -
EVA declares blue; - future scenarios declare their own accent in
scenario data; - shared components consume the variable.

Before adding a new scenario accent, search the CSS/HTML/JS for
remaining hardcoded legacy accent colors in components that are
semantically scenario-accented.

## 4. Screen structure

The SPA uses full-screen views controlled by `.screen` / `.hidden`.

Primary screens: - Home / scenario selection - About - Briefing -
Game/dialogue - EVA additionally introduces role selection before
briefing

Do not create an entirely separate visual application for a scenario.
Reuse the shared screen/component system and add optional scenario-owned
data/state.

## 5. Home / scenario selection

Key classes: - `.home` - `.brand` - `.scenarioGrid` - `.scenario` -
`.scenarioText` - `.soon`

Desktop grid: - uses a natural responsive grid with a minimum tile width; - reflows progressively 4 → 3 → 2 columns as space decreases; - mobile uses one column at the validated mobile breakpoint; - tiles must not be shrunk merely to keep a fixed column count.

EVA tile: - subtle permanent EVA-blue overlay; - small
`NOUVELLES MÉCANIQUES` / `NEW MECHANICS` badge; - no oversized
promotional treatment.

## 6. Role selection

EVA is the first multi-role scenario.

Rules: - role selection is scenario-owned and optional; - it only
appears when the scenario has more than one role; - existing scenarios
remain unchanged; - Ground Control is active; - Astronaut can be
temporarily selectable in UAT for implementation checks while retaining
`BIENTÔT DISPONIBLE / COMING SOON`.

Visual principles: - role cards are deliberately large/tall; - visual is
a major mass; - Ground hover uses scenario accent; - no separate SELECT
button; - back navigation goes to scenario selection.

## 7. Briefing DOM/responsibility map

Current conceptual structure:

`.brief` → `.briefTop` → `.shell` → `.intro` →
scenario/category/title/location → `.meta` objective block → `.board` →
`.boardBg` → `.boardContent` → `.context` SITUATION/DOSSIER → desktop
FILE elements → `.hint` → `.footer` → `.path` → `.step` → `.step` →
`.step` → `.cta` → `.primary`

Responsibilities: - `.brief` owns page scrolling. - `.board` owns the
briefing composition surface. - `.context` owns scenario
situation/dossier text. - FILE UI must stay out of the reserved
`.context` envelope. - `.footer` owns narrative steps and CTA; FILES
must not overlap it. - mobile has its own briefing FILE presentation and
must remain valid independently of desktop redesign.

## 8. Briefing narrative rule

The three-step path is shared UI.

Canonical urgency rule: **only the final sentence/tail of the third
briefing block is bold and danger-colored.**

Current class: - `.urgent`

The second block tail remains normal body styling.

This rule is universal, not EVA-specific.

## 9. Briefing breadcrumb

EVA breadcrumb: `BRIEFING · EVA · GROUND CONTROL` or astronaut
equivalent.

It uses the same light gray-blue treatment as the production breadcrumb.

Do not recolor the breadcrumb with the scenario accent.

## 10. Briefing FILES --- current system

Current desktop legacy classes include: - `.evidence` - `.inner` -
`.face` - `.front` - `.caption` - `.back`

Current interaction: `recto → click/flip → verso`

Current mobile UAT also has a `.briefFiles` / `.briefFile` path.

Known problems with the current desktop system: - readable document
rectos require too much space; - varying aspect ratios create layout
pressure; - internal scrolling and card flip interaction conflict; -
repeated per-scenario placement/sizing fixes are fragile.

Do not continue solving this with arbitrary per-FILE offsets or
low-height compression.

## 11. Desktop Briefing FILE Viewer --- canonical UAT-13 direction

Desktop interaction:

`THUMBNAIL → click → LARGE FILE VIEWER`

Rules: - desktop briefing only; - dialogue FILES remain a separate renderer; - mobile briefing keeps its validated renderer; - maximum 6 FILES; - six predetermined non-overlapping slots inside a FILES-safe zone; - `.context` is a reserved no-go zone; - scenario chooses slot + presentation format through FILE data; - no arbitrary per-FILE x/y ownership; - no hover movement or hover brightness.

Thumbnail purpose: `recognize → identify → click`. Thumbnail is a static presentation asset independent from the actual recto and verso.

Viewer: - no duplicate top title/header band; only close X; - recto/media and verso/info are visible simultaneously; - PORTRAIT uses media left / info right; - LANDSCAPE uses media top / info below; - the same FILE `presentation.format` drives both thumbnail and Viewer; - non-HTML media is fully visible with `contain`; - HTML document rectos may scroll internally; - verso may scroll independently when necessary; - interactive HTML rectos remain interactive; - generic media stop/reset runs on close and before switching FILE.

FILE editorial hierarchy is `eyebrow → title → optional subtitle → body`; levels are optional and must not mechanically repeat the same information. Viewer body target is 16px and subtitle 14px. Optional `subtitle` is FILE data and must be consumed by desktop Briefing, mobile Briefing and Dialogue where that FILE is represented.

Desktop briefing retains the localized scenario hint (`CLIQUEZ SUR...`) below the board.

## 12. FILE thumbnail formats

Working format system: - `PORTRAIT` - `LANDSCAPE`

Format is a presentation choice per FILE, not a semantic content type.

Current working mapping:

### Nicolas

-   Émilie Laurent --- PORTRAIT
-   Marc Laurent --- PORTRAIT
-   Analyses biologiques --- LANDSCAPE
-   Nicolas Colin --- PORTRAIT
-   Sophie Bernard --- PORTRAIT
-   Vidéosurveillance --- PORTRAIT/cropped preview; actual video ratio
    belongs in viewer

### Morozov

-   ORPHÉE --- PORTRAIT
-   Écoutes Mercier --- LANDSCAPE
-   Alexeï Morozov --- PORTRAIT
-   Forces aériennes stratégiques --- LANDSCAPE

### Bernard

-   Claire Morel --- PORTRAIT
-   Julien Delmas --- PORTRAIT
-   Message d'Anne Delmas --- PORTRAIT
-   Parcours militaire --- LANDSCAPE candidate
-   Unité d'intervention --- LANDSCAPE candidate
-   Engin improvisé --- LANDSCAPE candidate

### EVA Ground

-   Maya Laurent --- PORTRAIT
-   Schéma du système --- PORTRAIT working choice
-   Checklist de diagnostic --- PORTRAIT working choice
-   Manuel de maintenance --- PORTRAIT working choice

The exact Bernard landscape choices remain composition choices; the
system must support them without collision.

## 13. FILE content rules

Recto may be: - image; - video/media; - HTML/localizable document.

HTML/localizable recto is a **generic engine capability**, not an EVA
exception.

EVA technical-document rectos: - sober operational-document family; - off-white; - function-first; - no sci-fi HUD; - no metal/rivet skeuomorphism; - mobile keeps its validated readable document sizing; - desktop Viewer uses enlarged operational-document typography (currently 15px body) rather than forcing the old 12px briefing-card size.

Verso: - default 10 MINUTES dark interface; - white body text; - 12px
default body; - title/accent uses scenario accent; - do not create an
EVA-specific white-background verso.

## 14. Dialogue layout

Key shared structure/classes: - `.top` - `.app` - `.dossier` -
`.gameObjective` - `.dossierItem` - `.stage` - `.scene` -
`.timerBlock` - `.timer` - `.dialogue` - `.line` - `.action` -
`.speaker` - `.composer` - `.history`

Desktop grid currently uses a left dossier column plus main stage.

Rules: - telemetry, when present, belongs to the dialogue stage/top-left
area, not inside FILES scroll; - a scenario without telemetry must not
retain empty telemetry space; - scenario accent applies to equivalent
shared accent-bearing dialogue components; - history/end controls remain
shared engine UI.

## 15. Dialogue FILES

Dialogue FILES are not part of the new desktop Briefing FILE Viewer
project.

Keep the existing dossier/sidebar interaction unless addressing a
separately tracked bug.

Known EVA issues to preserve in backlog: - structured FILE
verso/editorial markup must not be flattened into duplicate/plain
text; - HTML recto → title needs approximately 8--10px spacing (current
UAT uses 9px); - mobile descriptions must remain visible.

Explicit presentation to an NPC remains a separate interaction from
merely opening/reading a FILE.

## 16. Timer

Timer is shared UI.

Normal timer accent should follow the scenario-theme rule where it is
semantically an accent.

Urgent timer: - uses danger color; - does not become scenario accent.

Timer lifecycle is architectural and must not be changed by CSS-only
work.

## 17. Telemetry

Telemetry is optional and scenario-defined.

EVA Ground fields: - O₂ consumption chart - PWR0 - POS1--POS4

Do not display: - PWR1--PWR4 - ACT1--ACT4 - LINK1--LINK4 - REL1--REL4

`UNCONFIRMED` is neutral telemetry: - no red; - no ERROR; - no FAULT.

O₂ consumption chart semantic levels: - normal: white - elevated:
yellow - critical: orange - no red

PWR/ACT/LINK technical colors remain semantic technical colors and are
not replaced by scenario accent.

## 18. Popups / overlays

Shared overlay families include: - result/end - error - abandon
confirmation - pause - report

Scenario-accent-bearing labels/borders should use the scenario accent
where they are identity accents.

Danger/error semantics remain independent.

Mobile end-of-timer report must remain compact and
content-height-driven; verify against the validated END popup behavior.

## 19. Hover and motion policy for FILES

Do not reintroduce FILE hover lift/brightness.

Reason: hover effects conflicted with internal scrolling on
Checklist/Manual and added ambiguity to FILE interaction.

Future desktop thumbnails may use a minimal non-motion affordance if
required, but no `translateY` and no content-brightness animation
without explicit validation.

## 20. Responsive ownership

Current important breakpoints include: - mobile around
`max-width: 820px`; - landscape-mobile special handling; - intermediate
desktop widths; - low-height desktop handling; - very-wide home grid at
`min-width: 1740px`.

Rules: - desktop and mobile may have different renderers/layouts; - they
must consume the same scenario/FILE data; - do not solve a desktop
problem by degrading the validated mobile renderer; - do not solve
low-height desktop by compressing content until it becomes unreadable; -
scrolling ownership must be explicit: page, viewer, or document --- not
accidental nested scroll.

## 21. CSS/DOM change checklist

Before changing shared HTML/CSS:

1.  Identify the component owner and parent.
2.  Check desktop + mobile selectors for the same class.
3.  Check whether color is scenario identity or semantic status.
4.  Check whether size/position is shared or scenario-specific.
5.  Search for JS that queries/toggles the class.
6.  Verify Nicolas, Morozov, Bernard and EVA.
7.  Check low-height desktop and mobile.
8.  Do not rename/remove a class used by JS without updating the
    runtime.
9.  If a new shared invariant is introduced, update this document.

## 22. New-scenario checklist

For a future scenario:

-   add scenario data;
-   define one scenario accent;
-   do not recolor shared components manually;
-   use semantic danger/status colors independently;
-   use existing navigation flow or declare roles if multi-role;
-   maximum six Briefing FILES;
-   assign FILES to validated slots and PORTRAIT/LANDSCAPE formats;
-   use generic media/HTML FILE capabilities;
-   define optional telemetry only if required;
-   register the scenario server-side if conversational;
-   verify all shared screens and responsive states;
-   update docs only if the engine/UI system itself changed.

## RC5 note — Claire Morel hierarchy

Claire Morel's age is body-level biography, not hierarchy metadata. Viewer hierarchy remains `CLAIRE MOREL` → `Juge d’instruction / Investigating Judge` → `Otage / Hostage`; age appears at the end of the biography paragraph.
