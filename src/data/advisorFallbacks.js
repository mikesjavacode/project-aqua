/**
 * Bundled advisories — one per site, keyed by site_id.
 *
 * The advisor panel normally posts telemetry to /api/advisor/aqua and renders
 * what comes back. With no server in front of it — `npm run dev` on its own, or
 * a dropped connection — it reads from here instead, so Layer 5 still shows a
 * real assessment rather than an error string. Same set the host site ships as
 * its server-side fallbacks (site/services/prompts_aqua.py).
 *
 * These are advisor outputs held to the same contract as the live ones: five
 * sections, units per the UNIT RULES (Ra-226 in Bq/L), STATUS LEVEL last so the
 * panel border still parses.
 */

export const BUNDLED_ADVISORIES = {
  'SITE-001': `**SITUATION**
Sudbury Basin Ni-mine drainage running the full 15-stage HM-FULL train. Inlet 48.0 mg/L Ni, 0.85 mg/L As, 0.12 mg/L Pb at pH 4.2 and 380 NTU, 310 L/s. Ca(OH)2 at 400 mg/L carries the reaction chamber into the 9.5–10.5 Ni(OH)2 window; R1 CO2 correction at 220 mg/L brings the outlet back to 7.5.
Outlet live: pH 7.48, 21.6 NTU against a 25 NTU permit, Ni 0.087 mg/L, As 0.009 mg/L, Pb 0.006 mg/L. Sludge 2190 kg/day, non-radioactive.

**NOTABLE PARAMETERS**
- As outlet 0.009 mg/L — 90% of the 0.010 mg/L EPA MCL, above the watch line.
- Fe:As mass ratio 3.00 at FeCl3 7.4 mg/L — exactly on the 3.0 advisory minimum, no headroom for an inlet excursion.
- Ni outlet 0.087 mg/L — 87% of the 0.100 mg/L WHO guideline.

**ASSESSMENT**
Ni(OH)2 precipitation is stable and the clarifier is holding; residual Ni tracks the solubility minimum for this pH rather than floc carryover. As and Pb removal is Fe(OH)3 floc adsorption, and the Fe dose sets the ceiling on both — at Fe:As 3.00 there is no reserve. Outlet turbidity of 21.6 NTU indicates the multimedia filter is capturing carryover fines effectively.

**RECOMMENDATIONS**
- Raise FeCl3 to 8.5–9.0 mg/L to restore Fe:As near 3.5 and pull As outlet clear of the MCL.
- Hold Ca(OH)2 at 400 mg/L. Reaction chamber pH is inside the operating window and no acid-side risk is present.
- Sample As at the AS_PB_CLARIFIER outlet as well as final discharge to confirm the co-precipitation stage, not the filter, is carrying the removal.

**STATUS LEVEL: WATCH**`,

  'SITE-002': `**SITUATION**
Athabasca uranium legacy water on the RAD-COPREC train. Inlet 6.80 Bq/L Ra-226, 0.62 mg/L As, 0.04 mg/L Pb at pH 5.1 and 210 NTU, 285 L/s. Inlet activity exceeds the 5.0 Bq/L threshold, so the RA_POLISH stage is in service and BaCl2 runs at 3.0 mg/L total across BA_DOSE and polishing.
Outlet live: Ra-226 0.171 Bq/L, As 0.009 mg/L, Pb 0.008 mg/L, pH 7.03, 11.4 NTU against a 15 NTU permit.

**NOTABLE PARAMETERS**
- Ra-226 outlet 0.171 Bq/L — 92% of the 0.185 Bq/L EPA MCL. Highest-priority parameter on site.
- As outlet 0.009 mg/L — 90% of the 0.010 mg/L EPA MCL; Fe:As 3.00 at FeCl3 5.4 mg/L.
- Radioactive sludge 83 kg/day alongside 103 kg/day non-radioactive.

**ASSESSMENT**
Ra-226 removal is 97.5% by (Ba,Ra)SO4 co-precipitation, which is normal for this inlet activity, but the residual sits close enough to the MCL that a BaCl2 interruption or a short RA_COPREC residence would breach it. Fe(OH)3 floc adsorption is holding As, again with no margin. The 83 kg/day (Ba,Ra)SO4 filter cake is radioactive waste and requires characterisation and classified disposal under the applicable nuclear regulation — it cannot go to the general sludge stream.

**RECOMMENDATIONS**
- Increase BaCl2 to 3.4–3.6 mg/L to drive Ra-226 outlet below 0.15 Bq/L and restore margin against the MCL.
- Verify RA_COPREC residence at 25 min actual, not design; short-circuiting there shows up as exactly this residual.
- Confirm filter-press cake activity assay is current before the next disposal consignment.

**STATUS LEVEL: WATCH**`,

  'SITE-003': `**SITUATION**
Norilsk Ni smelter effluent on the NI-PRECIP train. Inlet 87.0 mg/L Ni, 2.10 mg/L Pb at pH 3.8 and 520 NTU, 420 L/s — the heaviest Ni load on the network. Ca(OH)2 at 550 mg/L covers acid neutralisation plus the Ni hydroxide demand; CO2 at 250 mg/L handles final correction.
Reaction chamber pH is 9.08, below the 9.2 floor, and AF2 is active. Outlet live: Ni 0.104 mg/L, Pb 0.008 mg/L, pH 7.44, 26.2 NTU against a 30 NTU permit.

**NOTABLE PARAMETERS**
- AF2 ALERT ACTIVE — reaction chamber pH 9.08, 0.12 below the Ni(OH)2 floor.
- Ni outlet 0.104 mg/L — above both the 0.100 mg/L target and the WHO guideline.
- Sludge 5080 kg/day, the highest on the network; clarifier underflow is the constraint.

**ASSESSMENT**
The acid-side pH excursion has moved the chamber off the Ni(OH)2 solubility minimum and residual Ni has risen with it. This is the acid-side re-dissolution regime — Ni(OH)2 is stable above the floor, so the fault is lime deficit against a variable acid load, not overdosing. Pb removal is unaffected and remains well inside target. Clarifier performance at 26.2 NTU is acceptable but leaves only 3.8 NTU of permit margin at this solids loading.

**RECOMMENDATIONS**
- Increase Ca(OH)2 from 550 mg/L to 590–610 mg/L to recover reaction chamber pH to 9.5–10.0. Do not reduce the lime dose while AF2 is active — that deepens the excursion.
- Once chamber pH is back inside the window, expect Ni outlet to fall below 0.09 mg/L within two clarifier residence times.
- Check the inlet pH trend for a slug of acidic feed; 3.8 at 420 L/s is at the top of the neutralisation duty for this dose.

**STATUS LEVEL: ALERT**`,

  'SITE-004': `**SITUATION**
Zambian Copperbelt As/Pb discharge on the PB-AS-COPREC train. Inlet 1.45 mg/L As, 3.20 mg/L Pb at pH 4.5 and 445 NTU, 265 L/s. Ca(OH)2 at 160 mg/L lifts pH to about 6.5 for Fe floc formation — Pb is removed by adsorption onto Fe(OH)3, not as Pb(OH)2 at this pH.
Outlet live: As 0.0095 mg/L, Pb 0.009 mg/L, pH 7.18, 38 NTU against a 50 NTU permit.

**NOTABLE PARAMETERS**
- Fe:As mass ratio 2.99 at FeCl3 12.6 mg/L — below the 3.0 advisory minimum.
- As outlet 0.0095 mg/L — 95% of the 0.010 mg/L EPA MCL.
- Pb outlet 0.009 mg/L — 90% of the 0.010 mg/L EPA action level.

**ASSESSMENT**
Both target species are inside limits but neither has meaningful margin, and the common cause is the same: available Fe(OH)3 surface. At Fe:As 2.99 the floc is sorption-limited, and As and Pb are competing for it. The 296 kg/day sludge rate is consistent with the Fe dose and the neutralisation load, so solids handling is not the constraint here — reagent is.

**RECOMMENDATIONS**
- Raise FeCl3 to 15–16 mg/L. That puts Fe:As near 3.6 and gives both As and Pb adsorption capacity in reserve.
- Hold the AS_PB_COPREC pH near 6.5; higher pH favours Pb but degrades arsenate sorption onto the floc.
- Re-check outlet As two clarifier residence times after the dose change before making any further adjustment.

**STATUS LEVEL: WATCH**`,

  'SITE-005': `**SITUATION**
Salar de Atacama Li recovery on the LI-IX train. Inlet brine at 1850 mg/L Li, pH 7.1, 95 NTU — inlet turbidity is 4.75x the 20 NTU permit ceiling and drives the Al2(SO4)3 dose of 100 mg/L. Flow 199.6 L/s against a 195 L/s nominal design.
Outlet live: pH 6.87, 14.8 NTU, Li recovery 91.3% against a 90% multi-cycle target. CO2 at 15 mg/L trims final pH; HCl eluent runs at 180 mg/L feed-equivalent through the regeneration cycle. Sludge 783 kg/day, non-radioactive.

**NOTABLE PARAMETERS**
- Li recovery 91.3% — 1.3 points above target, no compliance threshold involved.
- Inlet turbidity 95 NTU — a feed-water quality issue upstream of this train, not a treatment failure.
- pH outlet 6.87 — 0.13 below the 7.0 setpoint, still well inside the discharge window.

**ASSESSMENT**
Ion-exchange selectivity and residence time are both good: recovery above target across a multi-cycle average means the resin is being loaded to breakthrough without running past it, and the regeneration cycle is stripping cleanly. Coagulation is doing the heavy lifting on the front end — 95 NTU to 14.8 NTU at 100 mg/L alum is a reasonable dose for that load, and it is protecting the resin from fouling, which is the real reason it matters.

**RECOMMENDATIONS**
- Nudge CO2 down slightly to bring outlet pH to 7.0; 6.87 is acceptable but the setpoint exists to keep the eluent-side chemistry consistent between cycles.
- Watch the loading-phase duration trend rather than the recovery figure alone — a rising cycle time at constant recovery is the first sign of resin fouling.
- Flow at 199.6 L/s is 2.4% above nominal; confirm column pressure drop is flat before treating that as sustainable.

**STATUS LEVEL: COMPLIANT**`,

  'SITE-006': `**SITUATION**
Sellafield nuclear process water on the RAD-COPREC train. Inlet 4.20 Bq/L Ra-226, 0.18 mg/L As, 0.08 mg/L Pb at pH 6.1 and 145 NTU, 302 L/s. Inlet activity is below the 5.0 Bq/L threshold so RA_POLISH is offline; BaCl2 runs at 2.0 mg/L through BA_DOSE only.
Outlet live: Ra-226 0.148 Bq/L, As 0.008 mg/L, Pb 0.008 mg/L, pH 7.47, 7.9 NTU against a 10 NTU permit.

**NOTABLE PARAMETERS**
- Ra-226 outlet 0.148 Bq/L — 80% of the 0.185 Bq/L EPA MCL, which is cited here as reference only.
- Compliance is assessed against the EA/ONR discharge consent for this site; the site consent limit governs, not the US or WHO figures.
- Radioactive sludge 58 kg/day against only 34 kg/day non-radioactive.

**ASSESSMENT**
(Ba,Ra)SO4 co-precipitation is achieving 96.5% Ra-226 removal at a modest 2.0 mg/L BaCl2 dose, which is appropriate for a sub-threshold inlet. Fe(OH)3 adsorption at FeCl3 1.6 mg/L gives Fe:As 3.06 and is comfortably sized for the low As load. The waste profile here is dominated by activity, not mass: the 58 kg/day (Ba,Ra)SO4 cake is radioactive waste requiring characterisation and classified disposal under UK nuclear regulation, and it is the majority of the total sludge stream.

**RECOMMENDATIONS**
- Maintain BaCl2 at 2.0 mg/L; the 80% MCL-equivalent figure reflects a low inlet, not underdosing, and increasing Ba adds classified waste volume for little activity benefit.
- Keep RA_POLISH available on standby — inlet activity at 4.2 Bq/L is close enough to the 5.0 Bq/L threshold that a feed excursion would call for it.
- Report the outlet against the EA/ONR consent value in the compliance record; keep the EPA MCL comparison labelled as reference.

**STATUS LEVEL: WATCH**`,

  'SITE-007': `**SITUATION**
Witwatersrand gold mine AMD on the HM-FULL train — the most acidic multi-contaminant feed on the network. Inlet 3.10 Bq/L Ra-226, 22.0 mg/L Ni, 0.95 mg/L As, 0.55 mg/L Pb at pH 3.2 and 610 NTU, 335 L/s. Ca(OH)2 at 630 mg/L is dominated by acid neutralisation; BaCl2 2.0 mg/L, FeCl3 8.3 mg/L, CO2 220 mg/L.
Outlet live: Ra-226 0.139 Bq/L, Ni 0.091 mg/L, As 0.0088 mg/L, Pb 0.007 mg/L, pH 7.52, 17.1 NTU against a 20 NTU permit.

**NOTABLE PARAMETERS**
- Ra-226 outlet 0.139 Bq/L — 75% of the 0.185 Bq/L EPA MCL.
- Ni outlet 0.091 mg/L — 91% of the 0.100 mg/L WHO guideline.
- Radioactive sludge 65 kg/day alongside 1210 kg/day non-radioactive.

**ASSESSMENT**
All four contaminants are inside targets and the sequencing is doing what it should — Ni(OH)2 precipitation and clarification first, then Fe floc for As and Pb, then Ba dosing for Ra-226 on a clarified stream. Two parameters sit above the 75% watch line at once, which is the expected consequence of running a four-contaminant feed through one train at pH 3.2: the lime demand is set by acid neutralisation, so the Ni window and the Ra stage both operate on whatever pH the neutralisation stage lands on. The (Ba,Ra)SO4 fraction of the sludge requires classified disposal despite being only 5% of total sludge mass.

**RECOMMENDATIONS**
- Trim Ni outlet by holding NI_PRECIP chamber pH at the upper half of the 9.5–10.5 window; at 22 mg/L inlet there is room to do that without over-liming.
- Fe:As is 3.01 — marginal. Take FeCl3 to 9.5 mg/L to give the As and Pb adsorption stage some reserve.
- Keep the radioactive and non-radioactive sludge streams physically separated at the filter press; cross-contamination reclassifies 1210 kg/day of ordinary sludge.

**STATUS LEVEL: WATCH**`,

  'SITE-008': `**SITUATION**
Rio Tinto Cu/As drainage on the PB-AS-COPREC train. Inlet 1.72 mg/L As, 1.85 mg/L Pb at pH 2.9 and 780 NTU, 245 L/s — the most acidic and most turbid feed on the network, consistent with pyrite oxidation producing H2SO4. Ca(OH)2 at 700 mg/L is almost entirely buffering duty; FeCl3 15.0 mg/L, CO2 25 mg/L.
Outlet live: As 0.0072 mg/L, Pb 0.0065 mg/L, pH 7.24, 18.9 NTU against a 25 NTU permit.

**NOTABLE PARAMETERS**
- As outlet 0.0072 mg/L — 72% of the 0.010 mg/L EPA MCL, below the watch line.
- Pb outlet 0.0065 mg/L — 65% of the 0.010 mg/L EPA action level.
- Fe:As mass ratio 3.00 at FeCl3 15.0 mg/L — on the advisory minimum despite the high absolute dose.

**ASSESSMENT**
The train is performing well against a difficult feed. Extended PH_ADJUST residence at 20 min is doing its job: the floc forming downstream is well conditioned, and 780 NTU to 18.9 NTU with both metals comfortably inside limits reflects that. Fe(OH)3 adsorption is the sole removal mechanism for both species here and it is not saturated. Sludge at 283 kg/day is modest for this reagent load because the mass is dominated by neutralisation products that stay in solution as CaSO4 at this concentration.

**RECOMMENDATIONS**
- Hold current doses. Nothing in the outlet data justifies a change, and Ca(OH)2 at 700 mg/L is buffering-limited rather than excessive.
- Track the Fe:As ratio against inlet As rather than the FeCl3 setpoint; at 1.72 mg/L inlet the ratio moves quickly for small feed changes.
- Confirm PH_ADJUST residence stays at 20 min at peak flow — that stage is what makes the rest of the train work at pH 2.9.

**STATUS LEVEL: COMPLIANT**`,

  'SITE-009': `**SITUATION**
Ok Tedi Cu mine drainage on the PB-AS-COPREC train at 480 L/s — the highest flow on the network. Inlet 0.88 mg/L As, 2.60 mg/L Pb at pH 4.1 and 550 NTU. Ca(OH)2 at 300 mg/L, FeCl3 7.7 mg/L, CO2 20 mg/L.
Outlet live: As 0.0079 mg/L, Pb 0.0095 mg/L, pH 7.05, 41 NTU against a 50 NTU permit. Sludge 352 kg/day, non-radioactive.

**NOTABLE PARAMETERS**
- Pb outlet 0.0095 mg/L — 95% of the 0.010 mg/L EPA action level, and the tightest margin on site.
- Outlet turbidity 41 NTU — 82% of the 50 NTU permit.
- Fe:As mass ratio 3.01 at FeCl3 7.7 mg/L, just above the advisory minimum.

**ASSESSMENT**
Pb, not As, is the binding constraint here: at 2.60 mg/L inlet it is the larger adsorption demand on the Fe(OH)3 floc, and the residual reflects that rather than any pH problem. The turbidity figure and the Pb figure are the same story — at 480 L/s the AS_PB_CLARIFIER is at the short end of its residence time, and floc carryover takes adsorbed Pb with it. Removal chemistry is sound; hydraulic loading is what is limiting it.

**RECOMMENDATIONS**
- Raise FeCl3 to 9.0–9.5 mg/L to increase floc surface available to Pb; the As ratio benefits at the same time.
- Check clarifier surface loading rate at 480 L/s against design. If it is above design, a modest flow trim will do more for outlet Pb than any reagent change.
- Verify polymer addition, if fitted, is tracking flow — carryover at this loading is usually a conditioning problem before it is a dose problem.

**STATUS LEVEL: WATCH**`,

  'SITE-010': `**SITUATION**
Pilbara iron ore and Ni process water on the NI-PRECIP train. Inlet 35.0 mg/L Ni, 0.38 mg/L Pb at pH 4.6 and 320 NTU, 360 L/s. Ca(OH)2 at 440 mg/L holds the reaction chamber at 9.9, comfortably inside the 9.5–10.5 Ni(OH)2 window; CO2 at 220 mg/L returns the outlet to 7.5.
Outlet live: Ni 0.082 mg/L, Pb 0.0068 mg/L, pH 7.53, 15.8 NTU against a 20 NTU permit. Sludge 1730 kg/day, non-radioactive.

**NOTABLE PARAMETERS**
- No parameter above 75% of its regulatory threshold. Ni outlet is at 82% of the WHO guideline of 0.100 mg/L but inside the site target.
- Reaction chamber pH 9.9 — mid-window, with margin on both the 9.2 AF2 floor and the 10.8 high-pH correction trigger.
- Outlet pH 7.53 against a 7.5 setpoint.

**ASSESSMENT**
This is the cleanest-running Ni train on the network. Ni(OH)2 precipitation sits at the solubility minimum and the clarifier is not being pushed — 15.8 NTU at 360 L/s indicates settled, well-formed floc rather than filter polishing. Pb is co-removed with the hydroxide floc and is not a limiting species at 0.38 mg/L inlet. Sludge at 1730 kg/day is consistent with the Ni load and the lime dose, and CO2 consumption at 220 mg/L is the expected cost of returning a pH 9.9 stream to discharge.

**RECOMMENDATIONS**
- No dose changes indicated. Hold Ca(OH)2 at 440 mg/L.
- Ni outlet at 82% of the WHO guideline is the parameter to trend; a rise here is the earliest indicator of chamber pH drift on this train.
- Consider trialling CO2 at 200 mg/L against outlet pH — the setpoint is being met with margin and CO2 is the larger reagent cost after lime.

**STATUS LEVEL: COMPLIANT**`,
};

// Used when a site has no bundled entry — the flagship full-train site.
export const DEFAULT_ADVISORY = BUNDLED_ADVISORIES['SITE-001'];
