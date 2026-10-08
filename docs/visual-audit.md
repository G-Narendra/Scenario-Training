# 🔍 Phase 0: Comprehensive Visual & Brand Identity Audit
**Platform:** ScenarioLab (Workplace Scenario Training)  
**Date:** October 2026  
**Auditors:** Principal UI/UX Designer (`/product-designer-ui`) & Brand Strategist (`/brand-strategist`)  
**Standard:** Enterprise SaaS Executive Simulation Suite (Fortune 500 Corporate L&D)

---

## 1. Executive Summary & Brand Positioning

### The Root Identity Defect
The platform was previously titled *"Flight Simulator for Difficult Conversations"*. While metaphorically referencing aviation flight simulators, in enterprise corporate training this confused users, who questioned whether the application was for pilots or airline operations. 

### Strategic Brand Re-Positioning: **ScenarioLab**
- **Brand Name:** **ScenarioLab**
- **Subtitle / Category Descriptor:** **Workplace Scenario Training**
- **Brand Archetype:** *The Sage / The Master Craftsman* — A safe, high-stakes conversational laboratory where emerging managers and sales executives develop conversational mastery before stepping into real boardrooms.
- **Tone of Voice:** Executive, supportive, tactically rigorous, modern, and confident.
- **Elimination of Confusing Jargon:**
  - ❌ *"Counterpart"* ➔  **[Character Name & Corporate Role]** (e.g., Marcus Vance · Operations Lead, Apex Logistics)
  - ❌ *"Turn 4"* ➔  **Exchange 4 of 25** (with progress indicator)
  - ❌ *"Barge-in"* ➔  **Interrupt & Speak**
  - ❌ *"VAD Handshake / Channel Dropped"* ➔  **Interactive Voice Mode / Instant Text Fallback**

---

## 2. Page-by-Page Visual & UX Flaw Catalog

| Component / Screen | Current Flaw | Severity | Target Enterprise Standard |
| :--- | :--- | :--- | :--- |
| **Global Theme & Palette** | Raw cyan-400 on slate-950; high eye strain, feels like a student hacker terminal rather than a $50k corporate simulator. | **Critical** | Curated Deep Obsidian canvas (`#090D16`), Midnight Slate panels (`#0F172A`, `#1E293B`), Royal Indigo (`#6366F1`) & Violet (`#8B5CF6`) primary accents, Emerald (`#10B981`) for mastery, Amber (`#F59E0B`) for coaching cues. |
| **Print & PDF Export (`FeedbackReportPage.tsx`)** | Cards are sliced horizontally in half across pages (`media_1791288140675.png`), backgrounds wash out, headings orphaned. | **Blocker** | `@media print` with `@page { margin: 12mm 14mm }`, `break-inside: avoid !important`, sequential flow, executive letterhead branding, zero severed text blocks. |
| **Simulation Room (`SimulationChatPage.tsx`)** | Single vertical chat stream with no character persona dossier, no visible scenario brief, no real-time goal tracking. Trainee is blind to context. | **Critical** | Split-screen executive cockpit: Left sidebar with Character Dossier (Name, Title, Emotional State pulse, Objectives, Skills assessed); Main stage with speech wave visualizer, exchange counter, and floating coaching drawer. |
| **Voice Mode Experience** | Vague "Connecting to Real-time Voice Audio..." state; fails abruptly without helpful guidance or microphone permission recovery. | **High** | Pulsating audio waveform orb; clear three-state status ("Ready", "Listening to You", "Marcus Speaking"); immediate graceful fallback pill button ("Switch to Text"). |
| **Navigation (`Navbar.tsx`)** | Generic "Flight Simulator" brand title; cyan monospace pill; plain logout icon without user avatar presence. | **Medium** | Sleek glassmorphic navigation header with ScenarioLab gradient monogram, active route highlight, trainee avatar with role pill, and clean quick-switch links. |
| **Login (`LoginPage.tsx`)** | Old title "Flight Simulator"; plain passcode field; unclear demo access instructions. | **Medium** | Luxury enterprise portal with ambient background glows, passkey input with instant demo auto-fill pills, security assurance badges. |
| **Tracks & Library (`TrackPickerPage.tsx`, `ScenarioLibraryPage.tsx`)** | Good cards, but typography is flat, difficulty indicator is basic text, tags lack visual hierarchy. | **Medium** | High-fidelity cards with difficulty rating meters (1–5 visual pills), estimated time badges, skills preview tags, and smooth hover micro-elevation. |
| **Admin Console (`AdminConsolePage.tsx`)** | Heavy layout, dense unformatted tables, basic inputs in YAML editor and cohort forms. | **Medium** | Clean tabbed telemetry suite with KPI summary cards, polished data grid, and structured YAML playground. |

---

## 3. Immediate Action Plan (Phase 1–6)
1. **Phase 1:** Design System & Token Foundation (`frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/index.html`).
2. **Phase 2:** Live Simulation Room Overhaul (`SimulationChatPage.tsx` with Character Sidebar, Floating Brief, Audio Orb, and Exchange Bar).
3. **Phase 3:** Executive Coaching & Debrief Report (`FeedbackReportPage.tsx` with PDF page-break immunity, Executive Header, Side-by-Side Pivotal Moments).
4. **Phase 4:** Track Picker, Scenario Library, and Admin Console visual unification.
5. **Phase 5:** Accessibility, keyboard navigability, and Playwright verification.
6. **Phase 6:** Production build validation (`tsc`, `vite build`, `pytest`) & Handover.
