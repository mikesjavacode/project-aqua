# PROJECT AQUA
**Global Industrial Water Treatment Intelligence Platform**
Lead Developer: Michael Fouche | AI Collaborator: Claude AI (Anthropic)
Kickoff: March 11, 2026

*Dedicated to Craig Gagnon, Meta Valent Solutions — 40 billion litres treated, novel radium removal process developer.*

---

## What It Is

A real-time, animated, AI-powered web platform visualising industrial water treatment at ten contaminated sites worldwide. Five simultaneous animation layers run in parallel: a rotating Three.js globe, an SVG process flow schematic, a Canvas 2D molecular particle simulation, a live telemetry panel, and a Claude AI domain advisor.

Built as a LinkedIn portfolio demonstration. No military framing — water affects every human on earth.

---

## Quick Start

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build (~2.3s)
```

No API key and no environment variables. The AI Advisor posts to `/api/advisor/aqua` on the host
site, which holds the Anthropic key server-side. Run standalone and Layer 5 uses the bundled
advisories in `src/data/advisorFallbacks.js` instead.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| 3D Globe | Three.js r128 |
| Process Flow | SVG animated schematic + RAF particle engine |
| Molecular Viz | Canvas 2D particle system |
| Telemetry | JavaScript chemistry simulation (500ms tick) |
| AI Advisor | Claude claude-haiku-4-5 via the host site's cached advisory API |
| Frontend | React 18 + Tailwind CSS |

---

## The Ten Sites

| Site | Location | Treatment | Key Contaminants |
|------|----------|-----------|-----------------|
| SITE-001 | Sudbury, Canada | HM-FULL | Ni, As, Ra-226, Pb |
| SITE-002 | Athabasca, Canada | RAD-COPREC | Ra-226, As |
| SITE-003 | Norilsk, Russia | NI-PRECIP | Ni, Pb |
| SITE-004 | Zambia Copperbelt | PB-AS-COPREC | Pb, As |
| SITE-005 | Atacama, Chile | LI-IX | Li (recovery) |
| SITE-006 | Sellafield, UK | RAD-COPREC | Ra-226, As |
| SITE-007 | Witwatersrand, SA | HM-FULL | Ni, As, Ra-226, Pb |
| SITE-008 | Rio Tinto, Spain | PB-AS-COPREC | Pb, As |
| SITE-009 | Ok Tedi, PNG | PB-AS-COPREC | Pb, As |
| SITE-010 | Pilbara, Australia | NI-PRECIP | Ni, Pb |

---

## Five Animation Layers

| Layer | Description |
|-------|-------------|
| L1 — Globe | Rotating Three.js Earth; contamination plumes pulse; site markers clickable |
| L2 — Process Flow | SVG schematic with 500-particle pool; colour shifts as contaminants removed; IX regen animated |
| L3 — Molecular | Canvas 2D ion-scale particle simulation; scenes keyed by treatment train |
| L4 — Telemetry | pH bars, contaminant removal meters, sludge rates, reagent doses — all ticking at 500ms |
| L5 — AI Advisor | Claude Haiku situational assessment every 45–90s, typed out on arrival; COMPLIANT/WATCH/ALERT/CRITICAL status |

All five layers must run simultaneously. A static screen is a failure condition.

---

## Recommended Demo Sequence

1. **Norilsk** — NI-PRECIP train; watch the AF2 pH floor alert pulse
2. **Athabasca** — Ra-226 stream; radioactive sludge; radioactive sludge zone in molecular layer
3. **Atacama** — LI-IX train; ion exchange regen cycle; Li recovery meter
4. **Sudbury** — full 15-stage HM-FULL train; dual Pb mechanism; R1 CO₂ pH correction stage
5. **Sellafield** — UK nuclear site; EA/ONR regulatory regime

---

## Build Status

Phase 8 complete. Gate 4 Chemistry Advisor verdict pending before LinkedIn post goes live.
Last clean build: ✓ 2.34s

For full technical detail, chemistry rules, and session history: see `TECHNICAL_ARCHITECTURE.md` and `CLAUDE.md`.

---

*PROJECT AQUA | Michael Fouche & Claude AI | March 2026*
