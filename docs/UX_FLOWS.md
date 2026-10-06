# UX Flows & Interaction Design

## 1. Flow Overview & Sitemap
```mermaid
graph TD
    A[Login Screen] -->|Enter Passcode + Name| B[Track Selection: Sales vs Leadership]
    B --> C[Scenario Library]
    C -->|Select Card| D[Scenario Briefing]
    D -->|Click Start (<3 clicks from login)| E[Live Conversation Screen]
    E -->|Natural End / Time / End Button| F[Feedback & Evaluation Report]
    F -->|Drill Down / Retry / Review| C
    
    Admin[Admin Login] --> Cohorts[Cohort Management]
    Admin --> Scenarios[Scenario Studio & YAML Editor]
    Admin --> Analytics[Progress & Cost Analytics]
```

## 2. Screen Specifications

### 2.1 Login Screen
- Minimalist card with dark/light mode toggle.
- Single Passcode input (formatted e.g. `K7QM-4PXD`).
- Trainee Display Name input.
- Terms & Privacy notice: "Conversations are simulated by AI and evaluated for educational feedback."
- Clear, generic error message on invalid/expired credentials without leaking cohort existence.

### 2.2 Track Selection & Scenario Library
- High-contrast visual cards for "Sales Mastery" and "Leadership & Difficult Conversations".
- Filter by topic (objection handling, conflict, feedback, negotiation) and difficulty rating (1-5 dots).
- Status badges: Not Started, Completed, Score Pill (e.g. 84/100).
- Scenario Card displays: Title, target duration (e.g. 10m), key assessed skills.

### 2.3 Situation Briefing
- Situation Context ("Who you are", "Who you are meeting", "Background").
- Counterpart bio (Name, Role, visible communication style).
- Your Objective and Success Criteria.
- Mode Selector: Text Chat vs Voice Roleplay.
- Prominent "Start Simulation" button (reaches live session in ≤ 3 clicks from initial login).

### 2.4 Live Conversation View
- Clean split layout: Scenario objectives reminder on left (collapsible), dialogue in center.
- Timer with gentle color shift as time limit nears (green -> amber -> red).
- Turn counter.
- Counterpart typing indicator / speaking animation.
- Trainee controls: Text input with keyboard shortcuts (`Enter` to send, `Shift+Enter` for newline) or Voice mic button with real-time audio waveform and barge-in detection.
- "End Conversation" button with confirmation modal.

### 2.5 Feedback & Evaluation Report
- Hero summary banner: Overall Score (0-100) with performance badge.
- Interactive Radar Chart / Skill Bars displaying scores 1-5 across assessed dimensions.
- Key Moments Carousel: Exact transcript quotes, what occurred, better alternative phrasing, and psychological explanation ("This works because...").
- "What You Did Well" vs "What Missed the Mark".
- Counterpart Reveal: "What Dana was really thinking".
- 3 to 4 Actionable Practice Drills.
- Action controls: Print / Download PDF, "Retry Scenario", "Back to Library".

## 3. Accessibility & Design Tokens (WCAG 2.1 AA)
- High contrast color palette: Neutral Slate (`#0f172a`, `#1e293b`), Primary Indigo (`#4f46e5`), Emerald Accent (`#10b981`), Amber Warning (`#f59e0b`), Rose Error (`#f43f5e`).
- Font pairing: Inter / Outfit modern sans-serif typography.
- Keyboard navigation: Full tab order, visible focus rings, ARIA live regions for streaming chat tokens.
- Captions provided for all voice interactions.
