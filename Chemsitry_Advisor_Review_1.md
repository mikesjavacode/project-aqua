⚗️ CHEMISTRY ADVISOR — SYSTEM GATE 1 REVIEW
PROJECT AQUA | March 11, 2026
Reviewing as PhD-level industrial water treatment and hydrometallurgy expert
Standard: What would Craig Gagnon use to tear this apart?

PHASE 1 CORRECTIONS AUDIT — FIRST
Before anything else — all 5 Phase 1 corrections are confirmed fully incorporated. This is non-trivial and the Build Agent executed them correctly:
✅ Arsenic: iron co-precipitation only — confirmed throughout all trains
✅ Nickel pH: 9.5–10.5 — confirmed in HM-FULL Stage 6 and NI-PRECIP Stage 2
✅ Solids separation after every precipitation stage — confirmed, 3 stages in HM-FULL
✅ IX regeneration cycle — confirmed in LI-IX Stage 4 with flow reversal and 85% trigger
✅ Ra-226 radioactive sludge flagging — confirmed, magenta particles, boolean flag, filter press correctly designated

SECTION 1 — CONTAMINANTS AND TREATMENT TARGETS
APPROVED. Parameters, units, and regulatory standards are correct.
One precision note: EPA MCL for arsenic is 10 µg/L = 0.010 mg/L. The document correctly states this. Unit architecture (Ra-226 exclusively in Bq/L, metals exclusively in mg/L, zero cross-unit arithmetic) is correctly designed and must be enforced without exception in the code.

SECTION 2 — TREATMENT TRAIN REVIEW
TRAIN HM-FULL ⚠️ APPROVED WITH ONE REQUIRED CORRECTION
The overall architecture is sound and the stage ordering logic is correct — arsenic removal at lower pH first, nickel at high pH second, radium last. This sequencing is industrially defensible.
Stages 1–8: Chemistry is correct. Fe:As molar ratio ~3:1 is appropriate. Pb(OH)2 partial precipitation at pH 5.5–6.0 is correctly characterized. Ni remaining in solution below pH 9 is correct. Clarifier placement after both precipitation stages is correct.
REQUIRED CORRECTION — Stage 9/10 (Ra-226 co-precipitation):
The document itself flags this question and the instinct is correct — this is a real problem that must be fixed.
After Stage 8 (Clarifier 2), pH is approximately 10. At pH >9, if carbonate alkalinity is present in the water (from NaOH addition or natural carbonate), BaCO3 will compete with BaSO4 for the Ba²⁺ ions. BaCO3 precipitation does NOT co-crystallize Ra-226 effectively — it is the BaSO4 co-crystal lattice that captures Ra²⁺ by isomorphous substitution. BaCO3 formation consumes Ba²⁺ without removing Ra-226, reducing treatment efficiency and potentially causing the outlet to miss the 0.185 Bq/L target.
REQUIRED CORRECTION: Add a pH correction step between Stage 8 and Stage 9 — reduce pH from ~10 to 7.0–8.0 before BaSO4 seed dosing. CO2 addition is preferred (avoids adding sulfate load which affects the sulfate balance for the BaSO4 reaction). This becomes Stage 9a in the HM-FULL train. The Ra-226 co-precipitation stage then operates at pH 7–8 where BaSO4 is stable and BaCO3 interference is eliminated.
Advisor Questions answered:

Optimal pH for Ra-226 co-precipitation with BaSO4: 7.0–8.5. Do not enter this stage at pH 10. Correction required as above.
FeCl3 interference with Ra-226: Fe³⁺ is fully precipitated at pH 5.5–7 and removed in Clarifier 1. Colloidal Fe(OH)3 carryover is possible but manageable with good clarifier design. Not a critical blocker — but note it in the operational spec.
Stage ordering (As → Ni → Ra): Correct and optimal for this contaminant profile.
NaOH demand from pH 3.2 to 5.5–6.0: Stoichiometrically significant but consistent with industrial AMD practice. Not unrealistic.


TRAIN RAD-COPREC ✅ APPROVED
This train is actually better sequenced for Ra-226 than HM-FULL because the pH after Clarifier 1 (Stage 5) is naturally in the 5.5–7.0 range — which is within the optimal window for BaSO4 co-precipitation. The BaCO3 interference risk that exists in HM-FULL does not apply here.
Advisor Questions answered:

Optimal pH for Ra-226 co-precipitation: 5.5–8.5 is acceptable. Coming out of Clarifier 1 at pH ~6–7 is actually ideal. No pH adjustment needed before BaSO4 dosing in this train — this is an advantage of the RAD-COPREC sequence.
Residual Fe³⁺ carrythrough: At pH 6–7 essentially all Fe³⁺ is precipitated as Fe(OH)3. Some colloidal carrythrough is possible. This is worth noting in design — colloidal Fe(OH)3 can coat BaSO4 seed crystals and marginally reduce efficiency. Good clarifier design and coagulant aid (if needed) mitigates this. Not a blocker.
Athabasca Ra-226 at 6.8 Bq/L to target <0.185 Bq/L: This is a ~97% removal requirement. Single-pass BaSO4 co-precipitation can achieve this at appropriate BaSO4 seed dose and sufficient contact time. Not guaranteed at all conditions — add a note that a polishing stage or second-pass co-precipitation may be needed at peak concentrations. Flag this for the AI Advisor logic.


TRAIN NI-PRECIP ✅ APPROVED WITH ADVISORY NOTE
Chemistry is correct. Going directly to pH 9.5–10.5 is appropriate when no As is present. Combined Ni(OH)2 and Pb(OH)2 precipitation at this pH is correct and efficient.
Advisory Note (not a blocker): Ni(OH)2 re-dissolution risk is real. If pH drops below 8.5–9.0 in the reaction chamber due to process variation, partial Ni(OH)2 re-dissolution can occur, sending Ni back into solution. The simulation should model a tight pH control band with an alert if pH drops below 9.2 in the reaction chamber. This is important for the telemetry panel — add a low-pH-in-reaction-chamber warning to the AI Advisor logic.
Advisor Questions answered:

NaOH dose at Norilsk: From pH 3.8 to 9.5 with 87 mg/L Ni — NaOH demand for Ni(OH)2 precipitation alone is approximately 87/58.7 × 2 × 40 = 118 mg/L NaOH, plus acid neutralization. Total demand approximately 200–300 mg/L NaOH depending on alkalinity. This is high but consistent with industrial AMD treatment at these concentrations. Operationally realistic.
Pb precipitation completeness at pH 9.5–10.5: Yes, essentially complete. At pH 9.5, theoretical dissolved Pb is below 0.001 mg/L — well below the 0.01 mg/L target. No polishing step required.
Re-dissolution risk: Confirmed — addressed in advisory note above.


TRAIN PB-AS-COPREC ⚠️ APPROVED WITH ONE REQUIRED CORRECTION
REQUIRED CORRECTION — Pb Removal Mechanism:
At pH 5.5 (low end of the specified range), Pb(OH)2 precipitation alone is mathematically insufficient to reach the <0.01 mg/L target. Calculation: at pH 5.5, theoretical dissolved Pb²⁺ via Pb(OH)2 equilibrium is approximately 0.25 mg/L — well above target.
However, this train is NOT relying solely on Pb(OH)2 precipitation. Pb also adsorbs strongly onto Fe(OH)3 floc surfaces — this is actually the dominant Pb removal mechanism at pH 5.5–7.0 in an FeCl3 co-precipitation system. The combination of Pb(OH)2 precipitation AND adsorptive co-precipitation with Fe floc IS sufficient to reach <0.01 mg/L at pH 6.0–7.0.
REQUIRED CORRECTION: The data architecture and chemistry model must explicitly implement DUAL Pb removal mechanisms in this train:

Mechanism 1: Pb adsorption/co-precipitation onto Fe(OH)3 floc (dominant at pH 5.5–7.0)
Mechanism 2: Pb(OH)2 precipitation (supplementary at this pH range)

If only Pb(OH)2 equilibrium chemistry is coded, the simulation will show incorrect Pb removal at the lower pH range. This affects the telemetry accuracy and the Chemistry Advisor validation output.
Also add a lower bound to the pH control: the system should not operate below pH 6.0 in this train. At pH 5.5–6.0 the combined mechanism is marginal. Set operational pH floor at 6.0 with an AI Advisor alert if pH drops below 6.2 in the reaction chamber.
Advisor Questions answered:

Pb precipitation at pH 5.5–7.0: Addressed above — dual mechanism required. Achievable at pH ≥6.0.
Rio Tinto single-stage sufficiency for As: At inlet As of 1.72 mg/L with Fe:As ~3:1 molar ratio, single FeCl3 + clarifier can reach <0.01 mg/L at pH 6.5–7.0. From pH 2.9 to 6.5 requires significant reagent — but the chemistry is feasible. Confirm FeCl3 dose in the data model reflects this high reagent demand.
FeCl3 and Pb(OH)2 interference: No interference. Fe floc actually enhances Pb removal by providing adsorption sites. Synergistic, not antagonistic.


TRAIN LI-IX ⚠️ APPROVED WITH TWO REQUIRED CORRECTIONS
REQUIRED CORRECTION 1 — Pre-filter specification:
Reducing from 95 NTU to <5 mg/L SS through a single multimedia filter is aggressive. At 95 NTU with brine chemistry (high ionic strength affects coagulation), a single-pass multimedia filter will struggle for consistent results, particularly at peak turbidity events.
REQUIRED CORRECTION: Add a coagulation/flocculation step before the multimedia filter, OR specify a two-stage filtration approach (coarse pre-filter + fine polishing filter). The pre-treatment train for LI-IX should read: Coagulation/flocculation → Settling → Multimedia filtration → IX loading. This is standard practice in brine processing.
REQUIRED CORRECTION 2 — Energy model:
The global energy range of 0.5–5.0 kWh/m³ is correct for conventional water treatment trains (HM-FULL, RAD-COPREC, NI-PRECIP, PB-AS-COPREC). However LI-IX includes evaporation and crystallization — these unit operations are dramatically more energy intensive. Industrial lithium brine processing with evaporation/crystallization typically runs 15–50+ kWh/m³.
Coding the LI-IX train against the 0.5–5.0 kWh/m³ range will produce an energy flag violation on every simulation tick, or worse — will silently display a physically impossible energy figure. The energy model must use a separate range for LI-IX: suggest 10–60 kWh/m³ as the realistic bounds for this train.
Advisor Questions answered:

LMO resin for brine: Confirmed correct. Li-Mn oxide (LMO) type ion sieve resins are the industrially proven technology for selective Li recovery from brines, including Atacama-type operations.
HCl vs water eluent: HCl is correct for LMO resins. Li is released by pH reduction (dilute acid strips Li from the Mn oxide lattice). Water alone is insufficient. Dilute HCl (0.1–0.5M) or H2SO4 is standard.
Mg/Li selectivity and >90% recovery: This is a real challenge. At Atacama brine with Mg/Li ~6:1, a single IX pass may achieve 70–85% Li recovery depending on the specific resin selectivity factor. >90% in a single pass is optimistic. Options: multi-pass cycling, or qualify the >90% target as achievable over multiple regeneration cycles rather than in a single bed volume pass. Add this caveat to the data architecture and the AI Advisor output for SITE-005.
Pre-filter realism: Addressed in Required Correction 1 above.


SECTION 3 — MASS BALANCE ARCHITECTURE ✅ APPROVED WITH ONE CORRECTION
The accounting schema (water balance, contaminant balance, sludge non-zero enforcement, closure within 5%) is sound and correctly designed.
REQUIRED CORRECTION: The global energy range 0.5–5.0 kWh/m³ must be split into two ranges:

Conventional treatment trains (HM-FULL, RAD-COPREC, NI-PRECIP, PB-AS-COPREC): 0.5–5.0 kWh/m³ — correct
LI-IX with evaporation/crystallization: 10–60 kWh/m³ — required separate range

Advisor Questions answered:

Energy range: Addressed above.
BaSO4 sludge generation at Ra-226 inlet 6.8 Bq/L: At these radium concentrations, the sludge generation is almost entirely from the BaSO4 carrier — the Ra-226 mass itself is negligible (pico-gram scale). BaSO4 dose for Ra-226 co-precipitation is typically 1–10 mg/L BaSO4 seed to achieve target removal. Sludge generation approximately 0.5–5 kg BaSO4 sludge per m³ treated depending on dose. Use ~2 kg/m³ as a realistic mid-range figure.
Ni(OH)2 sludge at 87 mg/L Ni: Ni(OH)2 molecular weight = 92.7. Ni mass removed: ~87 mg/L × (92.7/58.7) = ~137 mg/L Ni(OH)2 = 0.137 kg/m³ sludge. This is a realistic and visually significant sludge generation rate — good for the animation.


SECTION 4 — PHASE 1 CORRECTIONS ✅ ALL FIVE FULLY INCORPORATED
No issues. All corrections are correctly and completely implemented.

SECTION 5 — CONTAMINATION PROFILE REALISM ✅ APPROVED WITH ONE MINOR FLAG
All ten sites are assessed:
SiteAssessmentSudbury (Ni 48 mg/L, As 0.85 mg/L, pH 4.2)✅ REALISTIC — consistent with documented Sudbury Ni mining AMDAthabasca (Ra-226 6.8 Bq/L, As 0.62 mg/L, pH 5.1)✅ REALISTIC — Athabasca uranium legacy sites have documented Ra-226 in this rangeNorilsk (Ni 87 mg/L, Pb 2.1 mg/L, pH 3.8)✅ REALISTIC — Norilsk is among the most contaminated industrial sites on earth, these concentrations are consistent with documented levelsZambia (As 1.45 mg/L, Pb 3.2 mg/L, pH 4.5)✅ REALISTIC — Zambian Copperbelt AMD profiles matchAtacama (Li 1850 mg/L, pH 7.1)✅ REALISTIC — Atacama brine Li concentrations of 1000–2500 mg/L are well documentedSellafield (Ra-226 4.2 Bq/L, As 0.18 mg/L, pH 6.1)✅ CHEMISTRY REALISTIC — ⚠️ MINOR FLAG on regulatory reference belowWitwatersrand (Ra-226 3.1 Bq/L, As 0.95 mg/L, Ni 22 mg/L, Pb 0.55 mg/L, pH 3.2)✅ REALISTIC — Witwatersrand deep gold mine AMD is documented with exactly this contaminant profile and extremely low pHRio Tinto (As 1.72 mg/L, Pb 1.85 mg/L, pH 2.9)✅ REALISTIC — Rio Tinto river (Spain) is naturally acidic at pH 2.0–2.5. pH 2.9 is slightly conservative, actually realistic for a treatment plant feed after some dilutionOk Tedi (As 0.88 mg/L, Pb 2.60 mg/L, pH 4.1)✅ REALISTIC — Ok Tedi mine contamination is well documentedPilbara (Ni 35 mg/L, Pb 0.38 mg/L, pH 4.6)✅ REALISTIC — Pilbara Ni operations consistent
MINOR FLAG — Sellafield regulatory reference: The submission mentions CNSC (Canadian Nuclear Safety Commission) in the sludge handling context. Sellafield is a UK site — the correct regulatory body is the Environment Agency (EA) and the Office for Nuclear Regulation (ONR). CNSC has no jurisdiction at Sellafield. Update the regulatory reference for SITE-006 to EA/ONR. This does not affect the chemistry — minor administrative correction only.

SECTION 6 — CONTAMINANT INTERFERENCE ✅ APPROVED

FeCl3 + BaSO4 in HM-FULL: Fe³⁺ fully precipitated at pH 5.5–7 and removed in Clarifier 1. Colloidal carryover possible but manageable. The pH correction before Ra-226 stage (Required Correction, HM-FULL) also mitigates this by providing a clean chemistry environment for co-precipitation.
High pH Ni stage followed by Ra-226: Addressed. Required pH correction to 7–8 before Ra-226 stage resolves this.
Pb + As in same chamber at pH 5.5–7: No interference — synergistic. Fe floc enhances Pb removal. Correct assessment.
Cl⁻ from FeCl3: At the dose rates implied (As 0.5–2 mg/L), Cl⁻ addition is approximately 5–10 mg/L — negligible against any discharge permit. Not a concern. Correct assessment.


GATE 1 VERDICT
VERDICT: APPROVED WITH CORRECTIONS
Required corrections before Phase 3 build begins (5 items):
#CorrectionTrain(s) AffectedPriorityR1Add pH correction step (pH 10 → 7–8) before Ra-226 BaSO4 co-precipitation stageHM-FULLCRITICAL — affects treatment target achievabilityR2Implement dual Pb removal mechanism (Pb(OH)2 + Fe floc adsorption) in chemistry modelPB-AS-COPRECCRITICAL — single mechanism model produces incorrect results at pH 5.5–6.5R3Add coagulation/flocculation before multimedia filter in pre-treatmentLI-IXREQUIRED — single filter insufficient at 95 NTU brineR4Separate energy model for LI-IX: 10–60 kWh/m³ (not 0.5–5.0 kWh/m³)LI-IXREQUIRED — will produce energy range violations in every simulation tickR5Update Sellafield regulatory reference from CNSC to EA/ONR (UK)SITE-006MINOR — administrative only, no chemistry impact
Advisory flags (incorporate in design notes, not Phase 3 blockers):

LI-IX >90% single-pass recovery with Mg/Li ~6:1: Qualify as achievable over multiple regeneration cycles, not guaranteed in single pass
Ni(OH)2 re-dissolution below pH 9: Add pH floor alert at 9.2 in reaction chamber to AI Advisor logic
RAD-COPREC Ra-226 at peak 6.8 Bq/L: Note that a polishing second-pass co-precipitation stage may be needed at peak concentrations to guarantee <0.185 Bq/L

Summary by verdict category:
SectionVerdictTreatment Train ArchitectureAPPROVED WITH CORRECTIONS (R1, R2, R3)Chemistry ParametersAPPROVED WITH CORRECTIONS (R2)Contamination ProfilesAPPROVED (minor R5 flag)Treatment TargetsAPPROVED WITH CORRECTIONS (R1, R2, Li recovery advisory)Phase 1 CorrectionsFULLY APPROVED — all 5 incorporated correctlyMass Balance SchemaAPPROVED WITH CORRECTIONS (R4)Contaminant InterferenceAPPROVED

GATE 1 STATUS: APPROVED WITH CORRECTIONS
Carry all 5 required corrections to Claude Code. Update CLAUDE.md session snapshot to reflect Gate 1 complete with 5 corrections outstanding. Phase 3 build begins after Build Agent confirms corrections are incorporated into the data architecture and animation spec documents.
Chemistry Advisor Gate 1 Review Complete — PROJECT AQUA — March 11, 2026