# User Stories & Acceptance Criteria

## Persona 1: Trainee (Alex - Sales Representative)
### Story US-1: Frictionless Scenario Onboarding
**As a** trainee,  
**I want to** enter my training passcode and start a simulated conversation in under 3 clicks,  
**So that** I don't waste time on complex account registrations and can practice immediately.  
- **Scenario**: Successful login and immediate scenario start
  - **Given** an active cohort with a valid passcode
  - **When** Alex enters the passcode and display name "Alex"
  - **Then** Alex is taken directly to the Track Selection view
  - **And** selecting "Sales" immediately displays available scenarios with difficulty indicators
  - **And** selecting a scenario opens the situation briefing with a 1-click "Start Roleplay" action.

### Story US-2: Realistic Counterpart Dialogue & Natural Conclusion
**As a** trainee,  
**I want** the counterpart to respond realistically, resist lazy answers, and adapt to my empathy,  
**So that** the roleplay feels genuine and develops actual emotional resilience.  
- **Scenario**: Counterpart resistance and progression
  - **Given** Dana Whitfield is skeptical about enterprise renewal pricing
  - **When** Alex offers an instant 10% discount without understanding the underlying business need
  - **Then** Dana pushes for double the discount (curveball)
  - **When** Alex instead asks clarifying discovery questions regarding budget goals
  - **Then** Dana gradually reveals her internal CFO targets.

### Story US-3: Actionable, Non-Generic Feedback
**As a** trainee,  
**I want** feedback that quotes my exact words, provides better alternative lines, and explains the psychological reasoning,  
**So that** I know exactly how to change my phrasing next time.  
- **Scenario**: Verifiable feedback generation
  - **Given** Alex completes the renewal conversation
  - **When** the evaluation report is generated
  - **Then** every quoted trainee line must match the transcript verbatim
  - **And** at least 3 key moments provide alternative phrasing with "why this works better" explanations
  - **And** exactly 3 or 4 practical drills are provided at the end.

## Persona 2: Group Admin (Sarah - Head of Sales Enablement)
### Story US-4: Cohort Management & Hard 30-Day Expiry
**As a** group admin,  
**I want to** provision a cohort with an automatic 30-day access window,  
**So that** cohorts do not maintain lingering access beyond their contracted training period.  
- **Scenario**: Cohort expiration enforcement
  - **Given** a cohort whose `expires_at` timestamp has passed
  - **When** any trainee attempts to log in with the passcode or use an existing JWT
  - **Then** access is denied with a generic authentication error
  - **And** existing sessions are rejected immediately.

### Story US-5: Passcode Rotation
**As a** group admin,  
**I want to** rotate passcodes on demand or on a schedule,  
**So that** shared passcodes cannot be distributed outside the training cohort.  
- **Scenario**: Passcode rotation invalidation
  - **Given** Sarah rotates the cohort passcode
  - **When** the new passcode is generated and displayed once
  - **Then** the previous passcode is immediately revoked and unusable for new logins
  - **And** currently active sessions remain valid until token expiry unless "Revoke active sessions" was selected.

### Story US-6: No-Code Scenario Creation & Live Preview
**As a** group admin,  
**I want to** create a custom scenario via a web form or raw YAML editor and preview it immediately,  
**So that** our organization can rapidly simulate new company-specific product launches without engineering support.  
- **Scenario**: Authoring custom scenario
  - **Given** Sarah creates a new scenario with valid YAML structure
  - **When** she validates and publishes the scenario
  - **Then** trainees in the cohort immediately see the scenario in the library
  - **And** hidden motivations are strictly withheld from trainee APIs.
