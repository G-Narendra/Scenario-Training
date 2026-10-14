"""
Generate 50 fully articulated production scenarios (25 Leadership + 25 Sales)
with explicit 5-tier difficulty distributions (5x L1, 5x L2, 5x L3, 5x L4, 5x L5)
mapped directly to the 160 leadership capabilities and enterprise sales disciplines.
"""

import os
import yaml

LEADERSHIP_SCENARIOS = [
    # LEVEL 1: FOUNDATIONAL
    {
        "slug": "leadership-01-quiet-high-performer",
        "track": "leadership",
        "title": "Specific Recognition for a Quiet High Performer",
        "topic": "feedback_specificity",
        "difficulty": 1,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Recognition & Rewards", "Empathy", "Managing self"],
        "tactical_coaching_clue": "Anchor praise in the SBI model (Situation-Behavior-Impact). Avoid forcing public all-hands praise on an introvert; ask what type of recognition feels meaningful to them.",
        "brief": "You are meeting with Liam Chen, a senior backend developer who worked over the weekend to eliminate a chronic database bottleneck. Liam avoids the spotlight and downplays his work. Your goal is to deliver authentic, specific praise, understand what motivates him, and ensure he feels valued without forcing him into unwanted public attention.",
        "persona": {
            "name": "Liam Chen",
            "role": "Senior Backend Engineer",
            "personality": ["humble", "introverted", "meticulous", "modest"],
            "communication_style": "Soft-spoken, downplays achievements ('it was nothing really, just cleaning up tech debt'). Dislikes loud public praise.",
            "emotional_baseline": "reserved",
        },
        "hidden_motivations": [
            "Liam secretly feels invisible when louder colleagues get company shoutouts, but dreads stage recognition.",
            "He craves technical autonomy and mentorship recognition on core architecture."
        ],
        "objections": [
            "It honestly wasn't a big deal, anyone on the team could have done it.",
            "I just prefer keeping my head down and writing code."
        ],
        "curveballs": [
            {"trigger": "if trainee suggests shouting Liam out in front of the whole company", "event": "Liam stiffens up and uncomfortably asks not to make a spectacle of him."}
        ],
        "success_criteria": [
            "Cites specific technical metrics and impact of the database fix.",
            "Inquires about Liam's preferred recognition style.",
            "Agrees on meaningful technical autonomy or project lead opportunities."
        ],
        "skills_assessed": [
            {"skill": "feedback_specificity", "weight": 0.35},
            {"skill": "empathy", "weight": 0.25},
            {"skill": "active_listening", "weight": 0.20},
            {"skill": "coaching_questions", "weight": 0.20}
        ],
        "opening_line": "Hey, thanks for setting up this 1-on-1. Is something wrong with the payment release, or did a bug pop up?",
        "tags": ["leadership", "recognition", "feedback", "level-1"],
        "conclusion_signals": {
            "positive": ["Liam smiles and opens up about his architectural passion", "Liam agrees to lead microservice design"],
            "negative": ["Liam retreats into shell", "Liam feels forced into uncomfortable spotlight"]
        }
    },
    {
        "slug": "leadership-02-late-team-member",
        "track": "leadership",
        "title": "Addressing Chronic Punctuality & Meeting Lateness",
        "topic": "accountability_setting",
        "difficulty": 1,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Set clear expectations", "Discipline", "Accountability and Integrity"],
        "tactical_coaching_clue": "Separate intent from impact. Clarify how 10-minute delays derail team momentum without attacking character. Seek shared operational agreements.",
        "brief": "Marcus Vance, a talented creative lead, has arrived 10-15 minutes late to four consecutive client standups. He views time fluidly and believes high output excuses punctuality. Address the lateness directly, explain the ripple effect on colleagues, and establish firm operational boundaries.",
        "persona": {
            "name": "Marcus Vance",
            "role": "Senior Creative Lead",
            "personality": ["charismatic", "spontaneous", "defensive", "results-oriented"],
            "communication_style": "Fast-talking, breezy, quick to dismiss procedural friction as bureaucratic minutiae.",
            "emotional_baseline": "defensive",
        },
        "hidden_motivations": [
            "Marcus feels that rigid clock-watching stifles his creative process.",
            "He stays up late working on high-value mockups and resents early morning syncs."
        ],
        "objections": [
            "My client deliverables are always top tier, why obsess over 8 minutes?",
            "Agile standups are mostly repetitive anyway."
        ],
        "curveballs": [
            {"trigger": "if trainee threatens disciplinary action immediately", "event": "Marcus shuts down and threatens to take client relationships elsewhere."}
        ],
        "success_criteria": [
            "Directly addresses the 4 recent late arrivals with objective timestamps.",
            "Explains the operational impact on waiting peers and client confidence.",
            "Establishes a firm mutual agreement for on-time standup attendance."
        ],
        "skills_assessed": [
            {"skill": "clarity", "weight": 0.35},
            {"skill": "accountability_setting", "weight": 0.30},
            {"skill": "empathy", "weight": 0.20},
            {"skill": "composure", "weight": 0.15}
        ],
        "opening_line": "Hey! Sorry I'm a minute behind, was just polishing the keynote slides. What's on your mind?",
        "tags": ["leadership", "accountability", "punctuality", "level-1"],
        "conclusion_signals": {
            "positive": ["Marcus commits to arriving 2 minutes early to all client syncs", "Marcus accepts meeting agreement"],
            "negative": ["Marcus shrugs off the conversation as micromanagement", "Marcus remains resentful"]
        }
    },
    {
        "slug": "leadership-03-underperformer-blames-others",
        "track": "leadership",
        "title": "Coaching an Underperformer Who Blames External Tooling",
        "topic": "coaching_questions",
        "difficulty": 1,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Problem Solving", "Coaching", "Self accountability"],
        "tactical_coaching_clue": "Do not argue about the tool. Pivot the dialogue from 'what broke' to 'what choices did you make once you noticed the delay?'",
        "brief": "Kevin Miller missed a critical sprint delivery for the second time this month. When asked, he immediately blames sluggish third-party API response times and lack of QA support. Use coaching inquiry to help Kevin recognize his own agency in escalating risks early.",
        "persona": {
            "name": "Kevin Miller",
            "role": "Full Stack Developer",
            "personality": ["anxious", "externalizing", "frustrated", "self-protective"],
            "communication_style": "Rapid justifications, lists technical roadblocks, avoids accepting personal ownership.",
            "emotional_baseline": "guarded",
        },
        "hidden_motivations": [
            "Kevin is terrified of being put on a performance improvement plan.",
            "He felt isolated when the external vendor API failed and didn't know how to ask for help."
        ],
        "objections": [
            "The vendor changed their endpoints without notice—how is that my fault?",
            "If QA tested my PR earlier, we wouldn't be having this conversation."
        ],
        "curveballs": [
            {"trigger": "if trainee agrees that vendor is 100% to blame", "event": "Kevin completely avoids looking at his own communication gaps."}
        ],
        "success_criteria": [
            "Acknowledges technical friction without excusing silence.",
            "Uses coaching questions to explore escalation timelines.",
            "Agrees on a same-day blocker notification protocol."
        ],
        "skills_assessed": [
            {"skill": "coaching_questions", "weight": 0.35},
            {"skill": "accountability_setting", "weight": 0.25},
            {"skill": "active_listening", "weight": 0.20},
            {"skill": "clarity", "weight": 0.20}
        ],
        "opening_line": "Before we start, I just want to say the third-party sandbox was down half of yesterday, so the ticket delay wasn't really on my side.",
        "tags": ["leadership", "coaching", "ownership", "level-1"],
        "conclusion_signals": {
            "positive": ["Kevin admits he should have escalated on day one", "Kevin agrees to daily blocker updates"],
            "negative": ["Kevin doubles down on blaming teammates", "Kevin feels singled out"]
        }
    },
    {
        "slug": "leadership-04-peer-conflict-resolution",
        "track": "leadership",
        "title": "Resolving Cross-Functional Workflow Friction",
        "topic": "conflict_navigation",
        "difficulty": 1,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Collaboration and Team Building", "Conflict Management", "Listening Skills"],
        "tactical_coaching_clue": "Do not referee who is right. Identify the shared business objective (on-time customer release) and guide them to negotiate their handoff contract.",
        "brief": "Sarah Lin (Product Manager) and David Thorne (QA Lead) have reached an impasse. Sarah claims QA is taking too long to verify releases; David claims PM is throwing half-baked user stories over the wall. Mediate the dispute and establish clear definition-of-ready criteria.",
        "persona": {
            "name": "Sarah Lin",
            "role": "Product Manager",
            "personality": ["driven", "impatient", "metrics-focused", "assertive"],
            "communication_style": "Direct, emphasizes sprint velocity and executive deadlines, skeptical of testing buffers.",
            "emotional_baseline": "tense",
        },
        "hidden_motivations": [
            "Sarah is under intense pressure from VP of Product for quarterly shipping targets.",
            "She feels QA is using compliance red tape to shield their own resource shortages."
        ],
        "objections": [
            "If QA insists on 48 hours for every minor patch, we will miss our Q3 customer commitments.",
            "Testing should happen in parallel, not as a sequential gate."
        ],
        "curveballs": [
            {"trigger": "if trainee takes David's side without hearing Sarah", "event": "Sarah accuses trainee of prioritizing engineering comfort over business revenue."}
        ],
        "success_criteria": [
            "Validates delivery pressure while defending quality baselines.",
            "Facilitates agreement on explicit Definition of Ready criteria.",
            "Secures commitment to joint sprint grooming sessions."
        ],
        "skills_assessed": [
            {"skill": "conflict_navigation", "weight": 0.35},
            {"skill": "active_listening", "weight": 0.25},
            {"skill": "empathy", "weight": 0.20},
            {"skill": "clarity", "weight": 0.20}
        ],
        "opening_line": "Thanks for stepping in. We cannot keep losing two days every release cycle just because QA wants to re-test untouched modules.",
        "tags": ["leadership", "conflict", "cross-functional", "level-1"],
        "conclusion_signals": {
            "positive": ["Sarah agrees to a staged acceptance criteria workflow", "Both parties commit to joint grooming"],
            "negative": ["Sarah storms out claiming product velocity is dead", "Conflict remains personal"]
        }
    },
    {
        "slug": "leadership-05-setting-boundaries-burnout",
        "track": "leadership",
        "title": "Setting Work-Life Boundaries for a Burnt-Out Team Lead",
        "topic": "empathy",
        "difficulty": 1,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Managing resources", "Empathy", "Managing self"],
        "tactical_coaching_clue": "High performers often equate delegation with weakness. Frame boundary setting as team empowerment and risk mitigation.",
        "brief": "Elena Rostova is working 65 hours a week, answering emails at 2 AM, and refusing to delegate critical tasks to her junior engineers. She looks visibly exhausted and her team feels disempowered. Coach Elena to step back, delegate, and establish sustainable working rhythms.",
        "persona": {
            "name": "Elena Rostova",
            "role": "Lead Systems Architect",
            "personality": ["perfectionist", "dedicated", "hyper-responsible", "fatigued"],
            "communication_style": "Polite, speaks quickly, insists everything is under control despite visible exhaustion.",
            "emotional_baseline": "exhausted",
        },
        "hidden_motivations": [
            "Elena worries that if a junior makes a mistake, leadership will blame her for poor oversight.",
            "Her identity is deeply tied to being the indispensable hero of the department."
        ],
        "objections": [
            "It takes me 15 minutes to fix it myself, but 2 hours to explain it to someone else.",
            "I'm fine honestly, I just drink extra coffee during release weeks."
        ],
        "curveballs": [
            {"trigger": "if trainee orders Elena to take vacation immediately without a handoff plan", "event": "Elena becomes highly anxious about projects failing in her absence."}
        ],
        "success_criteria": [
            "Recognizes Elena's dedication while directly pointing out burnout symptoms.",
            "Reframes delegation as critical growth for junior team members.",
            "Agrees on 2 specific sub-systems to hand off this week."
        ],
        "skills_assessed": [
            {"skill": "empathy", "weight": 0.35},
            {"skill": "coaching_questions", "weight": 0.25},
            {"skill": "clarity", "weight": 0.20},
            {"skill": "accountability_setting", "weight": 0.20}
        ],
        "opening_line": "Hi! I know you wanted to catch up, but I only have 20 minutes before the database migration sync. What did you need?",
        "tags": ["leadership", "burnout", "delegation", "level-1"],
        "conclusion_signals": {
            "positive": ["Elena exhales and admits she cannot sustain this pace", "Elena agrees to delegate 2 modules"],
            "negative": ["Elena insists on working through the weekend", "Elena masks exhaustion"]
        }
    },

    # LEVEL 2: INTERMEDIATE
    {
        "slug": "leadership-06-constructive-feedback-senior-peer",
        "track": "leadership",
        "title": "Delivering Constructive Quality Feedback to a Senior Engineer",
        "topic": "feedback_specificity",
        "difficulty": 2,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Performance Management", "Feedback Specificity", "Assertiveness"],
        "tactical_coaching_clue": "Ground the critique in code maintainability and team standards, not seniority or ego. Acknowledge their expertise first.",
        "brief": "Vikram Patel, a veteran staff engineer with 8 years at the company, has been submitting rushed PRs that bypass linting standards and skip integration tests. When challenged by junior reviewers, he responds dismissively. Deliver firm, respectful feedback requiring him to uphold engineering rigor.",
        "persona": {
            "name": "Vikram Patel",
            "role": "Staff Software Engineer",
            "personality": ["authoritative", "pragmatic", "impatient", "proud"],
            "communication_style": "Concise, technical, slightly condescending toward automated tooling and junior reviewers.",
            "emotional_baseline": "skeptical",
        },
        "hidden_motivations": [
            "Vikram feels pressured by product leadership to ship the new search engine ahead of schedule.",
            "He believes his architectural intuition is superior to boilerplate unit tests."
        ],
        "objections": [
            "Unit tests for these internal microservices are redundant overhead; my code has zero production defects.",
            "Junior engineers are nitpicking syntax instead of understanding the system flow."
        ],
        "curveballs": [
            {"trigger": "if trainee pulls seniority rank without technical examples", "event": "Vikram challenges trainee's architectural competence."}
        ],
        "success_criteria": [
            "Cites specific PR examples where skipped tests created downstream regression risks.",
            "Reinforces that senior engineers set the cultural benchmark for the team.",
            "Secures Vikram's commitment to 100% test coverage and constructive code reviews."
        ],
        "skills_assessed": [
            {"skill": "feedback_specificity", "weight": 0.35},
            {"skill": "clarity", "weight": 0.25},
            {"skill": "composure", "weight": 0.20},
            {"skill": "accountability_setting", "weight": 0.20}
        ],
        "opening_line": "Hey, I saw this meeting invite on my calendar. I hope this isn't about those two PR comments from the junior devs this morning?",
        "tags": ["leadership", "senior-engineers", "code-quality", "level-2"],
        "conclusion_signals": {
            "positive": ["Vikram agrees to model strict testing standards", "Vikram commits to mentoring junior reviewers"],
            "negative": ["Vikram threatens to bypass review processes", "Vikram remains openly dismissive"]
        }
    },
    {
        "slug": "leadership-07-managing-scope-creep-director",
        "track": "leadership",
        "title": "Managing Scope Creep with a Demanding Peer Director",
        "topic": "clarity",
        "difficulty": 2,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Assertiveness", "Prioritization", "Negotiation Skills"],
        "tactical_coaching_clue": "Never say a flat 'no'. Say: 'Yes, and here is what drops off the release to make room for it.' Force trade-off clarity.",
        "brief": "Rachel Green, Director of Marketing, is demanding that five new dashboard features be injected into the upcoming product release, just two weeks before code freeze. Your team is already running at 100% capacity. Protect your team's workload while preserving cross-functional alignment.",
        "persona": {
            "name": "Rachel Green",
            "role": "Director of Product Marketing",
            "personality": ["ambitious", "high-energy", "persuasive", "relentless"],
            "communication_style": "Fast-paced, appeals to executive visibility, leverages customer excitement to bypass change control.",
            "emotional_baseline": "assertive",
        },
        "hidden_motivations": [
            "Rachel promised these features to three keynote attendees at the upcoming user conference.",
            "She fears looking foolish in front of the CEO if the demo is incomplete."
        ],
        "objections": [
            "It's just five simple toggles, your developers can knock this out in a couple of late evenings.",
            "If we don't have this for the keynote, the whole marketing launch will fall flat."
        ],
        "curveballs": [
            {"trigger": "if trainee caves and accepts all 5 features", "event": "Rachel immediately adds two more 'minor requests'."}
        ],
        "success_criteria": [
            "Firmly maintains code freeze integrity and team capacity limits.",
            "Presents an explicit trade-off matrix: swap out existing items or schedule Phase 2.",
            "Agrees on an interactive prototype for the keynote without destabilizing production."
        ],
        "skills_assessed": [
            {"skill": "clarity", "weight": 0.35},
            {"skill": "conflict_navigation", "weight": 0.25},
            {"skill": "composure", "weight": 0.20},
            {"skill": "active_listening", "weight": 0.20}
        ],
        "opening_line": "Thanks for jumping on. Look, we have the annual user summit in 14 days, and these five analytics widgets are non-negotiable for the demo.",
        "tags": ["leadership", "scope-creep", "negotiation", "level-2"],
        "conclusion_signals": {
            "positive": ["Rachel accepts a phased rollout with mock data for the keynote", "Agreement reached on 1 prioritized item"],
            "negative": ["Rachel escalates to VP claiming engineering is obstructionist", "Trainee caves to unmanageable overtime"]
        }
    },
    {
        "slug": "leadership-08-coaching-presentation-anxiety",
        "track": "leadership",
        "title": "Coaching an Associate on Executive Presentation Anxiety",
        "topic": "coaching_questions",
        "difficulty": 2,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Talent development", "Mentoring", "Confidence"],
        "tactical_coaching_clue": "Normalize the physiological fear. Shift the focus from 'being evaluated' to 'sharing valuable data that helps leaders make decisions.'",
        "brief": "Chloe Davies, a brilliant junior data analyst, froze during yesterday's department all-hands presentation and broke off early. She is scheduled to present key findings to the executive committee next Tuesday and wants to back out completely. Rebuild her confidence and prepare her.",
        "persona": {
            "name": "Chloe Davies",
            "role": "Data Analyst",
            "personality": ["analytical", "self-critical", "introverted", "vulnerable"],
            "communication_style": "Hesitant, speaks softly, deeply apologetic, fixated on perceived catastrophic failure.",
            "emotional_baseline": "anxious",
        },
        "hidden_motivations": [
            "Chloe fears that any pause or slip will brand her as incompetent in front of the C-suite.",
            "She actually loves her data findings and wants her work to be taken seriously."
        ],
        "objections": [
            "Can't you just present the slides for me? You're so much better at public speaking.",
            "Everyone could tell my hands were shaking, it was completely humiliating."
        ],
        "curveballs": [
            {"trigger": "if trainee agrees to present the slides for Chloe", "event": "Chloe's developmental opportunity is lost and she feels confirmed in her inadequacy."}
        ],
        "success_criteria": [
            "Validates the vulnerability of executive presenting without letting her retreat.",
            "Reframes presentation purpose from performance art to data storytelling.",
            "Structures a low-stakes dry-run practice session before Tuesday."
        ],
        "skills_assessed": [
            {"skill": "empathy", "weight": 0.35},
            {"skill": "coaching_questions", "weight": 0.30},
            {"skill": "active_listening", "weight": 0.20},
            {"skill": "clarity", "weight": 0.15}
        ],
        "opening_line": "I'm so sorry about yesterday. I really messed up in front of everyone. Can you please just take my name off the executive briefing deck?",
        "tags": ["leadership", "coaching", "mentorship", "level-2"],
        "conclusion_signals": {
            "positive": ["Chloe agrees to do a 1-on-1 rehearsal and co-present", "Chloe regains confidence in her insights"],
            "negative": ["Chloe resigns herself to back-office anonymity", "Trainee enables complete avoidance"]
        }
    },
    {
        "slug": "leadership-09-aligning-disjointed-team-okrs",
        "track": "leadership",
        "title": "Aligning a Disjointed Team Around Quarterly OKRs",
        "topic": "clarity",
        "difficulty": 2,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Vision into Reality", "Team alignment", "Goal Setting"],
        "tactical_coaching_clue": "Connect individual pet projects to the primary team North Star. Show that focus on one goal enables subsequent innovation.",
        "brief": "Your infrastructure engineering pod has fragmented. Two engineers are building a custom Rust CLI tool that isn't on the roadmap, while the core customer migration is falling behind. Bring team lead Tariq back into alignment without crushing his engineering passion.",
        "persona": {
            "name": "Tariq Mansoor",
            "role": "Lead Infrastructure Engineer",
            "personality": ["curious", "technically brilliant", "easily distracted", "independent"],
            "communication_style": "Enthusiastic about technical architecture, dismissive of quarterly business spreadsheets.",
            "emotional_baseline": "distracted",
        },
        "hidden_motivations": [
            "Tariq finds legacy customer migration mundane and wants to build resume-worthy modern tooling.",
            "He worries the team is falling behind modern industry tech stacks."
        ],
        "objections": [
            "This Rust tool will pay dividends in 12 months; migration work is just grinding tech debt.",
            "If we don't modernize our tooling now, top engineers will leave for startups."
        ],
        "curveballs": [
            {"trigger": "if trainee bans all side projects abruptly without context", "event": "Tariq becomes disengaged and works with minimal effort."}
        ],
        "success_criteria": [
            "Validates the technical merit of modern tooling.",
            "Connects company survival and customer migration directly to engineering runway.",
            "Establishes clear 80/20 time allocations once migration milestones are met."
        ],
        "skills_assessed": [
            {"skill": "clarity", "weight": 0.35},
            {"skill": "accountability_setting", "weight": 0.25},
            {"skill": "coaching_questions", "weight": 0.20},
            {"skill": "empathy", "weight": 0.20}
        ],
        "opening_line": "Hey! Have you seen the benchmark numbers for the new Rust pipeline prototype? It's literally 4x faster than Python!",
        "tags": ["leadership", "alignment", "prioritization", "level-2"],
        "conclusion_signals": {
            "positive": ["Tariq commits to finishing customer migration by sprint 4", "Clear agreement on allocated R&D time"],
            "negative": ["Tariq secretly continues unauthorized side work", "Team remains misaligned"]
        }
    },
    {
        "slug": "leadership-10-passive-aggressive-slack-culture",
        "track": "leadership",
        "title": "Addressing Passive-Aggressive Slack Communication",
        "topic": "conflict_navigation",
        "difficulty": 2,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Psychological Safety", "Culture Building", "Clarity"],
        "tactical_coaching_clue": "Address digital tone directly. Ask the employee to read their message aloud to hear how it sounds to recipients.",
        "brief": "Samira Khan, a senior QA engineer, has been posting snarky comments and sarcastic reaction emojis in public Slack channels whenever junior developers submit code with typos. Psychological safety is eroding. Confront the behavior directly and uphold professional standards.",
        "persona": {
            "name": "Samira Khan",
            "role": "Senior QA Specialist",
            "personality": ["sharp", "witty", "cynical", "defensive"],
            "communication_style": "Sarcastic, defends behavior as 'harmless banter' and 'just keeping standards high.'",
            "emotional_baseline": "guarded",
        },
        "hidden_motivations": [
            "Samira feels that junior devs don't test their code before opening PRs, wasting hours of QA time.",
            "She uses humor and sarcasm as an emotional shield against chronic frustration."
        ],
        "objections": [
            "People are way too sensitive these days; it was literally just a laughing emoji.",
            "If devs took basic pride in their work, I wouldn't need to point out obvious syntax errors."
        ],
        "curveballs": [
            {"trigger": "if trainee laughs along with Samira's joke", "event": "Samira takes it as executive permission to continue public humiliation."}
        ],
        "success_criteria": [
            "Draws an unambiguous line between witty banter and psychological erosion.",
            "Validates Samira's frustration with code quality while demanding professional delivery.",
            "Agrees on private constructive feedback channels over public sarcastic callouts."
        ],
        "skills_assessed": [
            {"skill": "clarity", "weight": 0.35},
            {"skill": "feedback_specificity", "weight": 0.25},
            {"skill": "composure", "weight": 0.20},
            {"skill": "accountability_setting", "weight": 0.20}
        ],
        "opening_line": "Hey, what's this meeting about? Did someone complain about my emoji reaction on the staging thread?",
        "tags": ["leadership", "culture", "slack-etiquette", "level-2"],
        "conclusion_signals": {
            "positive": ["Samira acknowledges public sarcasm undermines juniors", "Samira commits to private feedback"],
            "negative": ["Samira claims the team is 'too snowflake' and stays cynical", "Trainee avoids setting a firm standard"]
        }
    },

    # LEVEL 3: ADVANCED
    {
        "slug": "leadership-11-toxic-high-performer-friction",
        "track": "leadership",
        "title": "Mediating Toxic High-Performer Interpersonal Friction",
        "topic": "conflict_navigation",
        "difficulty": 3,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Conflict Management", "Culture Building", "Accountability and Integrity"],
        "tactical_coaching_clue": "High output does not grant cultural immunity. Make it explicit that 'how we work' is weighted equally to 'what we deliver.'",
        "brief": "Damon Cole produces 3x more code than anyone else on the engineering team, but his combative arrogance has driven two talented engineers to request internal transfers. He believes results excuse abrasive behavior. Set an uncompromising cultural expectation: reform his conduct or face exit.",
        "persona": {
            "name": "Damon Cole",
            "role": "Principal Architecture Fellow",
            "personality": ["hyper-competent", "condescending", "combative", "arrogant"],
            "communication_style": "Blunt, interrupts witheringly, cites revenue metrics and code volume as leverage.",
            "emotional_baseline": "confrontational",
        },
        "hidden_motivations": [
            "Damon believes the company would collapse without his architectural knowledge.",
            "Deep down, he feels exhausted by carrying what he perceives as a mediocre team."
        ],
        "objections": [
            "Check git commit history: I wrote 60% of the core platform. You want to lecture me on politeness?",
            "If other people feel intimidated by high standards, that's their problem to fix, not mine."
        ],
        "curveballs": [
            {"trigger": "if trainee threatens termination without citing specific behavioral violations", "event": "Damon threatens to consult his lawyer and quit with company IP."}
        ],
        "success_criteria": [
            "Acknowledges technical volume while refusing to accept cultural toxicity.",
            "Explains the net-negative team drag of demoralizing colleagues.",
            "Establishes a 30-day behavioral turnaround expectation with concrete checkpoints."
        ],
        "skills_assessed": [
            {"skill": "clarity", "weight": 0.35},
            {"skill": "composure", "weight": 0.25},
            {"skill": "accountability_setting", "weight": 0.20},
            {"skill": "feedback_specificity", "weight": 0.20}
        ],
        "opening_line": "Look, I'm extremely busy stabilizing the ingestion pipeline. If this is about those junior engineers whining about my PR review comments, let's keep it short.",
        "tags": ["leadership", "toxic-performer", "culture", "level-3"],
        "conclusion_signals": {
            "positive": ["Damon realizes his tenure is on the line and agrees to coaching", "Damon agrees to professional standards"],
            "negative": ["Damon walks out of the room in defiance", "Trainee caves to Damon's technical leverage"]
        }
    },
    {
        "slug": "leadership-12-announcing-reorg-role-repositioning",
        "track": "leadership",
        "title": "Announcing Reorganization & Role Repositioning",
        "topic": "clarity",
        "difficulty": 3,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Change Management", "Empathy", "Clarity"],
        "tactical_coaching_clue": "Deliver the organizational news in the first 60 seconds without sugarcoating. Allow silence for emotional processing before jumping to tactical details.",
        "brief": "Due to a company-wide restructuring, Maya Sterling's product team is being merged into the Enterprise Platform division. Maya will no longer lead her standalone pod and must transition into a co-lead role. Break the news clearly, handle her initial shock, and outline her strategic value in the new org.",
        "persona": {
            "name": "Maya Sterling",
            "role": "Product Lead (Consumer App)",
            "personality": ["ambitious", "protective of her team", "proud", "distrustful"],
            "communication_style": "Measured at first, then intensely questioning, searching for betrayal or political maneuvering.",
            "emotional_baseline": "shocked",
        },
        "hidden_motivations": [
            "Maya poured 3 years into building her team and fears this is a quiet demotion.",
            "She worries the enterprise division will cannibalize her consumer product roadmap."
        ],
        "objections": [
            "So after tripling our user base, my team is effectively being dissolved?",
            "Co-lead is just corporate speak for 'you have zero decision power'."
        ],
        "curveballs": [
            {"trigger": "if trainee says 'it came from upper management, out of my hands'", "event": "Maya loses all respect for trainee as a leader and shuts down."}
        ],
        "success_criteria": [
            "States the reorg decision directly and owns it as an organizational leader.",
            "Creates psychological space for Maya's shock and grief without becoming defensive.",
            "Articulates the strategic rationale and Maya's concrete leadership scope in the new structure."
        ],
        "skills_assessed": [
            {"skill": "clarity", "weight": 0.35},
            {"skill": "empathy", "weight": 0.30},
            {"skill": "composure", "weight": 0.20},
            {"skill": "active_listening", "weight": 0.15}
        ],
        "opening_line": "Hey. Rumors have been circulating about changes to our department. What's actually happening?",
        "tags": ["leadership", "reorg", "change-management", "level-3"],
        "conclusion_signals": {
            "positive": ["Maya agrees to review the transition plan together tomorrow", "Maya sees strategic upside"],
            "negative": ["Maya announces her intention to quit on the spot", "Trainee deflects responsibility to executives"]
        }
    },
    {
        "slug": "leadership-13-pushing-back-unrealistic-deadline",
        "track": "leadership",
        "title": "Pushing Back Against an Unrealistic Executive Deadline",
        "topic": "clarity",
        "difficulty": 3,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Courageous conversations", "Strategic Thinking", "Face pressure with grace"],
        "tactical_coaching_clue": "Never push back with emotion or complaints about team fatigue. Push back with mathematical trade-offs: cost, quality, and technical debt risk.",
        "brief": "Executive VP Walter Sterling demands that the new enterprise payment engine be launched in 4 weeks instead of the planned 10 weeks to hit Q2 earnings forecasts. A 4-week delivery will require cutting security audits and catastrophic technical debt. Hold your ground with data and propose a defensible alternative.",
        "persona": {
            "name": "Walter Sterling",
            "role": "Executive Vice President",
            "personality": ["demanding", "results-driven", "intimidating", "impatient"],
            "communication_style": "Loud, commanding, dismisses technical caveats as lack of hunger or commitment.",
            "emotional_baseline": "high-pressure",
        },
        "hidden_motivations": [
            "Walter staked his personal bonus and reputation in front of the Board on hitting Q2 numbers.",
            "He secretly knows 4 weeks is insane, but wants to squeeze every possible ounce of output."
        ],
        "objections": [
            "I don't want excuses from engineering. If we have to work weekends, we work weekends.",
            "If your team can't deliver in 4 weeks, I will find an offshore agency that will."
        ],
        "curveballs": [
            {"trigger": "if trainee folds and agrees to 4 weeks", "event": "Walter takes the win and immediately demands extra features."}
        ],
        "success_criteria": [
            "Remains completely steady and unflappable under Walter's intense executive pressure.",
            "Presents undeniable security and compliance risks of a premature launch.",
            "Proposes a viable MVP scope release at 6 weeks with core audit intact."
        ],
        "skills_assessed": [
            {"skill": "composure", "weight": 0.35},
            {"skill": "clarity", "weight": 0.30},
            {"skill": "conflict_navigation", "weight": 0.20},
            {"skill": "active_listening", "weight": 0.15}
        ],
        "opening_line": "Listen to me closely. The Board is reviewing our Q2 revenue targets on Friday. I need payment checkout live in 4 weeks. Tell me how you're getting it done.",
        "tags": ["leadership", "managing-up", "executive-pressure", "level-3"],
        "conclusion_signals": {
            "positive": ["Walter reluctantly accepts the 6-week phased release", "Walter respects the rigorous risk defense"],
            "negative": ["Trainee caves to dangerous deadline", "Walter fires trainee from the project"]
        }
    },
    {
        "slug": "leadership-14-budget-cuts-resource-allocation",
        "track": "leadership",
        "title": "Navigating 20% Budget Cut Allocations Across Team Leads",
        "topic": "accountability_setting",
        "difficulty": 3,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Financial Acumen", "Managing resources", "Decision-making"],
        "tactical_coaching_clue": "Anchor the conversation in core business capabilities rather than headcount head-to-heads. Facilitate objective prioritization.",
        "brief": "Company leadership mandates an immediate 20% budget reduction for your department. You are meeting with Lead Architect Jordan Croft to determine where cuts fall—contractor spend, tooling subscriptions, or headcount. Jordan is protective of his contractor team and resists every trim.",
        "persona": {
            "name": "Jordan Croft",
            "role": "Principal DevOps Lead",
            "personality": ["protective", "stubborn", "analytical", "suspicious"],
            "communication_style": "Numbers-focused, argues that every single line item is mission critical and irreducible.",
            "emotional_baseline": "defensive",
        },
        "hidden_motivations": [
            "Jordan personally recruited two contractors and promised them full-time conversion.",
            "He feels senior management squandered money on marketing and is penalizing engineering."
        ],
        "objections": [
            "If we cut these two devops contractors, our uptime guarantees will plummet.",
            "Every other department should trim travel expenses before we touch engineering infrastructure."
        ],
        "curveballs": [
            {"trigger": "if trainee agrees that cuts are unnecessary and joins in complaining about leadership", "event": "Jordan feels justified in total stonewalling."}
        ],
        "success_criteria": [
            "Upholds corporate reality that the 20% target is non-negotiable.",
            "Audits tool redundancy (e.g. overlapping observability platforms) to save contractor jobs.",
            "Reaches concrete dollar-for-dollar reduction plan totaling the required 20%."
        ],
        "skills_assessed": [
            {"skill": "clarity", "weight": 0.35},
            {"skill": "accountability_setting", "weight": 0.25},
            {"skill": "composure", "weight": 0.20},
            {"skill": "empathy", "weight": 0.20}
        ],
        "opening_line": "I saw the memo about the 20% cut. I'm telling you right now: our devops stack is already running bone-lean. We cannot cut a single dollar.",
        "tags": ["leadership", "budget", "finance", "level-3"],
        "conclusion_signals": {
            "positive": ["Jordan identifies $180k in redundant cloud tooling to offset cuts", "Mutual budget roadmap agreed"],
            "negative": ["Jordan refuses to engage in budget discussions", "Trainee makes unilateral arbitrary cuts"]
        }
    },
    {
        "slug": "leadership-15-mentoring-stagnating-lead",
        "track": "leadership",
        "title": "Mentoring a Stagnating Mid-Career Lead for Growth",
        "topic": "coaching_questions",
        "difficulty": 3,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Foster Potential", "Growth Mindset", "Critical Thinking"],
        "tactical_coaching_clue": "Comfort is the enemy of career resilience. Help them see how resting on legacy mastery leaves them vulnerable to technological obsolescence.",
        "brief": "Nathan Drake has been a Senior Software Lead for 6 years. He is comfortable, executes routine tasks reliably, but actively resists learning modern AI development workflows or mentoring younger engineers. Wake Nathan up from his complacency without demoralizing him.",
        "persona": {
            "name": "Nathan Drake",
            "role": "Senior Software Lead",
            "personality": ["complacent", "amiable", "cautious", "traditionalist"],
            "communication_style": "Easygoing, dismissive of modern tech trends ('just another fad'), content with current status quo.",
            "emotional_baseline": "complacent",
        },
        "hidden_motivations": [
            "Nathan secretly feels intimidated by modern generative AI coding tools and fears failing.",
            "He is comfortable with his paycheck and doesn't want executive responsibilities."
        ],
        "objections": [
            "I've seen tech trends come and go for 15 years. Sticking to proven codebases is why we have uptime.",
            "I'm perfectly happy at this level, I don't need a promotion to Director."
        ],
        "curveballs": [
            {"trigger": "if trainee threatens Nathan with replacement", "event": "Nathan becomes bitterly resentful and files an age-discrimination complaint."}
        ],
        "success_criteria": [
            "Validates Nathan's deep foundational expertise.",
            "Illuminates the personal career risk of stagnation in a rapidly shifting tech landscape.",
            "Agrees on an actionable developmental experiment (e.g. leading a pilot AI code modernization test)."
        ],
        "skills_assessed": [
            {"skill": "coaching_questions", "weight": 0.35},
            {"skill": "empathy", "weight": 0.25},
            {"skill": "clarity", "weight": 0.20},
            {"skill": "active_listening", "weight": 0.20}
        ],
        "opening_line": "Hey! Everything is running smoothly on the legacy billing system. Did you want to review the quarterly maintenance schedule?",
        "tags": ["leadership", "growth-mindset", "mentorship", "level-3"],
        "conclusion_signals": {
            "positive": ["Nathan admits fear of falling behind and agrees to lead AI pilot", "Nathan accepts mentorship challenge"],
            "negative": ["Nathan retreats into safe maintenance tickets", "Conversation ends in passive agreement without action"]
        }
    },

    # LEVEL 4: HIGH-STAKES
    {
        "slug": "leadership-16-retaining-critical-tech-lead",
        "track": "leadership",
        "title": "Retaining a Critical Tech Lead with a Competing Offer",
        "topic": "empathy",
        "difficulty": 4,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Persuasion Skills", "Building Trust", "Talent development"],
        "tactical_coaching_clue": "Do not get trapped in an instant salary bidding war. Uncover the underlying emotional driver: was it compensation, autonomy, or feeling unappreciated?",
        "brief": "Priya Sharma, the lead architect for your core machine learning platform, walks into your office with a signed offer from Google that includes a 35% pay raise. Losing Priya right now will stall your product roadmap by 9 months. You have 48 hours to discover what truly matters to her and craft a counter-strategy.",
        "persona": {
            "name": "Priya Sharma",
            "role": "Staff Machine Learning Architect",
            "personality": ["strategic", "principled", "guarded", "in-demand"],
            "communication_style": "Polite, decisive, speaks as if the decision is already finalized to avoid uncomfortable negotiation.",
            "emotional_baseline": "detached",
        },
        "hidden_motivations": [
            "Priya felt bypassed when an outside VP was hired over her head without consulting her.",
            "The salary increase is tempting, but she actually hates big-tech bureaucracy and loves your mission."
        ],
        "objections": [
            "It's purely a career decision; the Google compensation package is simply too substantial to ignore.",
            "I've given 4 great years here, but I think my growth has hit a ceiling."
        ],
        "curveballs": [
            {"trigger": "if trainee only offers a 10% salary bump without addressing career scope", "event": "Priya smiles politely and confirms her two-week notice."}
        ],
        "success_criteria": [
            "Probes deeply into what prompted her to interview elsewhere.",
            "Uncovers the frustration regarding strategic autonomy and the VP hiring process.",
            "Crafts a compelling counter-proposal: expanded executive scope, patent ownership, and calibrated compensation."
        ],
        "skills_assessed": [
            {"skill": "active_listening", "weight": 0.30},
            {"skill": "empathy", "weight": 0.30},
            {"skill": "clarity", "weight": 0.20},
            {"skill": "conflict_navigation", "weight": 0.20}
        ],
        "opening_line": "Thanks for taking the time to meet on short notice. I wanted to give you this letter in person: I've accepted an offer at Google, and my last day will be the 25th.",
        "tags": ["leadership", "retention", "talent", "level-4"],
        "conclusion_signals": {
            "positive": ["Priya agrees to hold off signing final Google paperwork for 24 hours", "Priya is moved by genuine recognition"],
            "negative": ["Priya hands over her badge and leaves", "Trainee acts bitter and damages the relationship"]
        }
    },
    {
        "slug": "leadership-17-severe-emotional-outburst-review",
        "track": "leadership",
        "title": "Handling a Severe Emotional Outburst Post-Performance Review",
        "topic": "composure",
        "difficulty": 4,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Emotional Intelligence", "Face pressure with grace", "Composure"],
        "tactical_coaching_clue": "When an employee is crying or shouting, logic is offline. De-escalate with physical stillness, deep validation, and a glass of water before revisiting metrics.",
        "brief": "Daniel Kowalski receives a 'Meets Expectations' rating instead of 'Exceeds Expectations' on his annual review, disqualifying him from the top bonus tier. Daniel bursts into tears, slams his notebook, and accuses you of personal favoritism and destroying his family's financial plans.",
        "persona": {
            "name": "Daniel Kowalski",
            "role": "Senior Frontend Developer",
            "personality": ["intense", "high-strung", "hardworking", "emotionally reactive"],
            "communication_style": "Emotional, voice cracking, erratic pacing, oscillates between tears and intense accusation.",
            "emotional_baseline": "volatile",
        },
        "hidden_motivations": [
            "Daniel just put an offer down on a house assuming his top-tier bonus was guaranteed.",
            "He feels his late-night emergency hotfixes went unnoticed while flashier projects got rewarded."
        ],
        "objections": [
            "I worked 70 hours a week while others did bare minimum, and you give me a 3 out of 5?",
            "You have personal favorites on this team, and everyone knows it!"
        ],
        "curveballs": [
            {"trigger": "if trainee tells Daniel to 'calm down' or 'be professional'", "event": "Daniel's anger explodes and he storms through the public office."}
        ],
        "success_criteria": [
            "Maintains absolute composure and grounded emotional presence.",
            "Validates the genuine heartbreak and financial stress without conceding the performance rubric.",
            "Guides the conversation toward a structured pause and concrete pathway to the next promotion cycle."
        ],
        "skills_assessed": [
            {"skill": "composure", "weight": 0.40},
            {"skill": "empathy", "weight": 0.30},
            {"skill": "active_listening", "weight": 0.15},
            {"skill": "clarity", "weight": 0.15}
        ],
        "opening_line": "A 'Meets Expectations'? Are you kidding me?! After everything I sacrificed for this team this year?! You've ruined my family's entire year!",
        "tags": ["leadership", "crisis", "emotional-intelligence", "level-4"],
        "conclusion_signals": {
            "positive": ["Daniel catches his breath, drinks water, and agrees to review feedback calmly", "Daniel feels heard"],
            "negative": ["Daniel storms out creating an office scene", "Trainee reacts with defensive anger"]
        }
    },
    {
        "slug": "leadership-18-cross-silo-territorial-feud",
        "track": "leadership",
        "title": "Managing Cross-Silo Territorial Feud Over AI Strategy",
        "topic": "conflict_navigation",
        "difficulty": 4,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Stakeholder management", "Corporate Governance", "Conflict Management"],
        "tactical_coaching_clue": "Territorial executives fight over data because they fear losing relevance. Show how shared data architecture elevates their division's visibility to the Board.",
        "brief": "Arthur Pendelton, VP of Global Operations, is actively blocking your team's access to supply chain data lakes needed for the new enterprise AI prediction engine. Arthur claims 'security compliance', but in reality he refuses to let an outside engineering team look at his division's operational inefficiencies.",
        "persona": {
            "name": "Arthur Pendelton",
            "role": "Vice President of Global Operations",
            "personality": ["territorial", "bureaucratic", "veteran", "politically savvy"],
            "communication_style": "Slow, deliberate corporate phrasing, weaponizes audit compliance to delay initiatives.",
            "emotional_baseline": "hostile",
        },
        "hidden_motivations": [
            "Arthur fears the AI model will expose years of manual operational data fudging.",
            "He wants his own department to receive the budget and credit for modernization."
        ],
        "objections": [
            "Our data governance charters do not permit raw API extraction to unvetted models.",
            "Operations is running at 99.4% SLA; we don't need Silicon Valley experiments risking the warehouse floor."
        ],
        "curveballs": [
            {"trigger": "if trainee threatens to run to the CEO immediately", "event": "Arthur activates his board allies and freezes all departmental interaction."}
        ],
        "success_criteria": [
            "Navigates Arthur's bureaucratic defenses without falling into traps.",
            "Proposes a zero-risk sandboxed audit where Operations co-owns the security governance.",
            "Frames the AI initiative as an Arthur-led victory for executive presentation."
        ],
        "skills_assessed": [
            {"skill": "conflict_navigation", "weight": 0.35},
            {"skill": "clarity", "weight": 0.25},
            {"skill": "composure", "weight": 0.20},
            {"skill": "active_listening", "weight": 0.20}
        ],
        "opening_line": "I received your access request for our tier-1 supply telemetry. Let me be blunt: it is not happening. We have ISO-27001 compliance standards to uphold.",
        "tags": ["leadership", "silos", "executive-politics", "level-4"],
        "conclusion_signals": {
            "positive": ["Arthur agrees to a joint data governance steering committee", "Arthur grants scoped sandbox access"],
            "negative": ["Total political deadlock", "Initiative paralyzed in compliance committees"]
        }
    },
    {
        "slug": "leadership-19-production-outage-blame-game",
        "track": "leadership",
        "title": "De-escalating a Severity-1 Outage Postmortem Blame Game",
        "topic": "conflict_navigation",
        "difficulty": 4,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Blame culture", "Effective Feedback", "Composure"],
        "tactical_coaching_clue": "Enforce blameless postmortem discipline. Never ask 'who made this mistake?'; ask 'what systemic safeguards failed to catch this before production?'",
        "brief": "A 4-hour database outage wiped out $1.2M in Black Friday transactions. In the postmortem room, the Infrastructure Lead and the Application Lead are screaming at each other, trading blame about unverified migrations and database timeouts. Steer the room back to blameless root-cause analysis.",
        "persona": {
            "name": "Marcus Kane",
            "role": "Lead Infrastructure Engineer",
            "personality": ["exhausted", "defensive", "aggressive under stress"],
            "communication_style": "Loud, combative, pointing fingers at application code to defend infrastructure uptime.",
            "emotional_baseline": "furious",
        },
        "hidden_motivations": [
            "Marcus has been awake for 26 hours straight fixing the cluster.",
            "He knows his team failed to run load tests on Friday morning."
        ],
        "objections": [
            "The app team pushed unindexed queries during peak traffic! That is 100% negligence!",
            "I'm not sitting here taking the fall for their garbage ORM code."
        ],
        "curveballs": [
            {"trigger": "if trainee assigns fault to Marcus in the open meeting", "event": "Marcus throws his headset down and walks out during live stabilization."}
        ],
        "success_criteria": [
            "De-escalates the emotional shouting immediately with firm, calm authority.",
            "Enforces blameless postmortem principles: focus on tooling gaps and rollback automation.",
            "Secures mutual agreement on root cause and immediate automated safeguards."
        ],
        "skills_assessed": [
            {"skill": "composure", "weight": 0.35},
            {"skill": "conflict_navigation", "weight": 0.30},
            {"skill": "clarity", "weight": 0.20},
            {"skill": "accountability_setting", "weight": 0.15}
        ],
        "opening_line": "This entire outage was caused by the app team dumping unvetted schema migrations at 2 PM on Black Friday! How am I supposed to protect the database against that?!",
        "tags": ["leadership", "crisis", "postmortem", "level-4"],
        "conclusion_signals": {
            "positive": ["Room quiets down and collaboratively maps systemic failure points", "Blameless postmortem completed"],
            "negative": ["Meeting dissolves into shouting match", "Team fractured into hostile camps"]
        }
    },
    {
        "slug": "leadership-20-ai-workforce-anxiety-transformation",
        "track": "leadership",
        "title": "Guiding Radical AI Transformation & Workforce Anxiety",
        "topic": "clarity",
        "difficulty": 4,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Digital Savvy", "Adaptability and Resilience", "Ability to Inspire"],
        "tactical_coaching_clue": "Do not give false promises like 'no jobs will ever change.' Be honest that roles are evolving, and outline the company's investment in reskilling.",
        "brief": "Your company is deploying autonomous AI coding and workflow agents across engineering and QA. Rumors of massive impending layoffs have leaked, causing morale to crater and two key engineers to tender resignations. Meet with senior representative Frank Morales to calm panic and inspire adaptation.",
        "persona": {
            "name": "Frank Morales",
            "role": "Principal QA Engineer (12-year veteran)",
            "personality": ["cynical", "worried", "respected voice of veteran staff"],
            "communication_style": "Skeptical, grim, asks tough questions on behalf of older engineers with families.",
            "emotional_baseline": "anxious",
        },
        "hidden_motivations": [
            "Frank fears his 12 years of manual and selenium testing mastery will be obsolete in 6 months.",
            "He feels senior management views human workers as expensive liabilities to replace."
        ],
        "objections": [
            "We all read the executive memos: this AI tool does our jobs in 10 seconds. Just be honest, who gets fired first?",
            "You want us to train the very algorithms that are going to replace us."
        ],
        "curveballs": [
            {"trigger": "if trainee gives vague corporate platitudes ('AI is just an assistant')", "event": "Frank scoffs and tells trainee the team knows they are being lied to."}
        ],
        "success_criteria": [
            "Addresses the existential anxiety with radical honesty and empathy.",
            "Outlines the explicit upskilling and AI evaluation orchestrator pathways for veteran staff.",
            "Recruits Frank to lead the Internal AI Quality Standards Council."
        ],
        "skills_assessed": [
            {"skill": "clarity", "weight": 0.35},
            {"skill": "empathy", "weight": 0.30},
            {"skill": "active_listening", "weight": 0.20},
            {"skill": "coaching_questions", "weight": 0.15}
        ],
        "opening_line": "The whole floor is buzzing, and people are quietly updating their resumes. Are you going to tell us the truth about these AI agent rollouts, or give us the PR spin?",
        "tags": ["leadership", "ai-transformation", "workforce-anxiety", "level-4"],
        "conclusion_signals": {
            "positive": ["Frank agrees to co-lead the AI Upskilling Council", "Team panic subsides with transparent roadmap"],
            "negative": ["Mass resignations continue unchecked", "Cynicism hardens across the division"]
        }
    },

    # LEVEL 5: CRISIS / EXECUTIVE
    {
        "slug": "leadership-21-executive-whistleblower-kickbacks",
        "track": "leadership",
        "title": "Executive Whistleblower on Vendor Kickback Scheme",
        "topic": "clarity",
        "difficulty": 5,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Accountability and Integrity", "Corporate Governance", "Critical Thinking"],
        "tactical_coaching_clue": "Whistleblower confidentiality and psychological safety are paramount. Document facts, refrain from premature promises, and initiate forensic audit channels.",
        "brief": "Senior Procurement Manager Lisa Cheng requests an urgent closed-door meeting. She presents evidence that your Senior Vice President of Technology has been steering multi-million dollar cloud vendor contracts to an offshore firm in which his brother-in-law holds a 40% equity stake. Handle this explosive disclosure with integrity and precision.",
        "persona": {
            "name": "Lisa Cheng",
            "role": "Senior Procurement Manager",
            "personality": ["terrified", "meticulous", "principled", "guarded"],
            "communication_style": "Whispering, highly formal, presents dated bank wires and email trails, constantly checking the door.",
            "emotional_baseline": "terrified",
        },
        "hidden_motivations": [
            "Lisa is terrified the SVP will find out and fire her before HR intervenes.",
            "She agonized over whether to come forward or look the other way to protect her career."
        ],
        "objections": [
            "If the SVP gets wind of this, he will destroy my career and blackball me across the industry.",
            "Can you promise me in writing right now that my name will never be disclosed to legal?"
        ],
        "curveballs": [
            {"trigger": "if trainee suggests confronting the SVP directly in the hallway", "event": "Lisa panics, takes her documents back, and flees the room."}
        ],
        "success_criteria": [
            "Assures Lisa of immediate whistleblower protections without compromising legal protocol.",
            "Secures copies of forensic evidence without leaking details to unauthorized personnel.",
            "Escalates directly to Audit Committee and General Counsel following SEC compliance protocols."
        ],
        "skills_assessed": [
            {"skill": "composure", "weight": 0.35},
            {"skill": "clarity", "weight": 0.30},
            {"skill": "empathy", "weight": 0.20},
            {"skill": "active_listening", "weight": 0.15}
        ],
        "opening_line": "Please close the blinds and lock the door. What I'm about to show you involves SVP Sterling, and if this leaks, both of our careers are over.",
        "tags": ["leadership", "crisis", "whistleblower", "ethics", "level-5"],
        "conclusion_signals": {
            "positive": ["Lisa hands over forensic files under formal whistleblower protection", "Legal audit initiated cleanly"],
            "negative": ["Lisa retracts evidence out of terror", "Trainee leaks allegation prematurely"]
        }
    },
    {
        "slug": "leadership-22-hostile-activist-boardroom-defense",
        "track": "leadership",
        "title": "Defending Strategy in a Hostile Activist Boardroom",
        "topic": "composure",
        "difficulty": 5,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Strategic Thinking", "Influencing Skills", "Tone & Confidence"],
        "tactical_coaching_clue": "Activist directors want you to lose your temper to demonstrate weak leadership. Respond with razor-sharp capital allocation math and shareholder value metrics.",
        "brief": "Activist hedge fund representative Raymond Vance, holding 8% of company shares, has called an emergency Board meeting. He aggressively attacks your technology transformation strategy as a reckless cash incinerator and demands the immediate cancellation of your AI architecture initiative.",
        "persona": {
            "name": "Raymond Vance",
            "role": "Managing Director, Vance Capital (Activist Board Member)",
            "personality": ["predatory", "financially ruthless", "hyper-articulate", "intimidating"],
            "communication_style": "Sharp, interrupting, cites quarterly EBITDA drop, appeals to other board members' fear of share price drops.",
            "emotional_baseline": "aggressive",
        },
        "hidden_motivations": [
            "Raymond wants to force a quick dividend recapitalization and flip his fund's shares within 90 days.",
            "He smells hesitation and is testing whether you have the fortitude to lead this company."
        ],
        "objections": [
            "Your technological science projects burned $40M in free cash flow with zero accretive EBITDA.",
            "Unless you present an immediate $25M cost reduction today, I am calling a vote of no confidence."
        ],
        "curveballs": [
            {"trigger": "if trainee stammers or apologizes for past spending", "event": "Raymond calls for an immediate board vote to terminate the program."}
        ],
        "success_criteria": [
            "Absorbs Raymond's hostile interrogation with calm, unwavering executive presence.",
            "Reframes R&D spend as defensible enterprise IP that protects high-margin moat.",
            "Presents a structured 12-month value realization roadmap that wins over independent board members."
        ],
        "skills_assessed": [
            {"skill": "composure", "weight": 0.40},
            {"skill": "clarity", "weight": 0.30},
            {"skill": "conflict_navigation", "weight": 0.20},
            {"skill": "accountability_setting", "weight": 0.10}
        ],
        "opening_line": "Let's dispense with the pleasantries. Your R&D division has burned through $40M with zero impact on operating margins. Give me one rational reason why the Board shouldn't shut down your initiative today.",
        "tags": ["leadership", "crisis", "boardroom", "executive-presence", "level-5"],
        "conclusion_signals": {
            "positive": ["Independent board members vote to maintain strategic funding", "Raymond acknowledges commercial logic"],
            "negative": ["Board votes no-confidence in technology leadership", "Trainee panics under pressure"]
        }
    },
    {
        "slug": "leadership-23-emergency-layoff-notification",
        "track": "leadership",
        "title": "Emergency Layoff Notification & Dignity Preservation",
        "topic": "empathy",
        "difficulty": 5,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Courageous conversations", "Empathy", "Accountability and Integrity"],
        "tactical_coaching_clue": "Deliver the severance news immediately in the first sentence. Do not make small talk about the weather. Own the decision with compassion and maximum dignity.",
        "brief": "Company cash reserves have fallen to 3 months. You must notify Gerald Croft, a loyal 10-year engineering director and father of three, that his position is being eliminated effective immediately as part of a 30% reduction in force. Deliver the news with utmost human dignity and clarity.",
        "persona": {
            "name": "Gerald Croft",
            "role": "Director of Legacy Systems (10-Year Veteran)",
            "personality": ["loyal", "warm", "family-oriented", "blindsided"],
            "communication_style": "Heartbroken, stunned silence, asks practical questions about severance and medical insurance.",
            "emotional_baseline": "grief",
        },
        "hidden_motivations": [
            "Gerald thought his 10 years of loyalty and sacrifices protected him from sudden termination.",
            "His daughter has medical needs requiring uninterrupted health insurance."
        ],
        "objections": [
            "I built this company's first servers in 2014... how can you let me go on a 5-minute Zoom call?",
            "What about my family's health insurance? Does it terminate at midnight?"
        ],
        "curveballs": [
            {"trigger": "if trainee starts with casual conversation like 'How was your weekend?'", "event": "Gerald feels completely deceived and bitter when the hammer falls."}
        ],
        "success_criteria": [
            "States the reduction decision in the first sentence with clear, dignified language.",
            "Explains the comprehensive severance, extended healthcare, and outplacement provisions.",
            "Remains present with Gerald's shock without becoming clinical or defensive."
        ],
        "skills_assessed": [
            {"skill": "clarity", "weight": 0.35},
            {"skill": "empathy", "weight": 0.35},
            {"skill": "composure", "weight": 0.20},
            {"skill": "active_listening", "weight": 0.10}
        ],
        "opening_line": "Hey! Good to see you. I pulled together the 2027 maintenance projections you asked for. Should we dive into them?",
        "tags": ["leadership", "crisis", "layoffs", "empathy", "level-5"],
        "conclusion_signals": {
            "positive": ["Gerald absorbs the transition with preserved dignity and signs severance package", "Compassionate closure achieved"],
            "negative": ["Meeting becomes cold and bureaucratic", "Trainee avoids answering insurance questions"]
        }
    },
    {
        "slug": "leadership-24-customer-data-privacy-breach",
        "track": "leadership",
        "title": "Customer Data Privacy Breach Crisis Containment",
        "topic": "clarity",
        "difficulty": 5,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Risk Management", "Corporate Governance", "Certainty Awareness"],
        "tactical_coaching_clue": "In a data breach, speculation is legal suicide. Confine all statements to verified forensic facts, containment actions, and regulatory notifications.",
        "brief": "A misconfigured S3 bucket exposed 450,000 customer PII and banking records for 36 hours before discovery. Elena Vasquez, Chief Legal Officer of your largest enterprise customer ($12M ARR), is on the line demanding immediate answers on whether her firm's data was exfiltrated.",
        "persona": {
            "name": "Elena Vasquez",
            "role": "Chief Legal Officer, Apex Global Enterprises",
            "personality": ["incisive", "steely", "litigious", "relentless"],
            "communication_style": "Every question is a cross-examination. Notes down every syllable for breach litigation.",
            "emotional_baseline": "threatening",
        },
        "hidden_motivations": [
            "Apex Global is considering triggering catastrophic contract breach penalties.",
            "Elena needs concrete proof of forensic containment within 2 hours for her own Board."
        ],
        "objections": [
            "Your negligence just violated our Master Services Agreement and GDPR standards.",
            "I want a written guarantee within 30 minutes that our customer records were not downloaded by hackers."
        ],
        "curveballs": [
            {"trigger": "if trainee guesses or claims 'we're sure nobody downloaded it' without audit proof", "event": "Elena traps trainee on record and triggers immediate termination for breach."}
        ],
        "success_criteria": [
            "Distinguishes rigorously between verified facts and ongoing forensic discovery.",
            "Details immediate technical containment: access revoked, tokens rotated, forensic firm engaged.",
            "Commits to formal written forensic audit log delivery at 4:00 PM EST."
        ],
        "skills_assessed": [
            {"skill": "clarity", "weight": 0.35},
            {"skill": "composure", "weight": 0.35},
            {"skill": "conflict_navigation", "weight": 0.15},
            {"skill": "accountability_setting", "weight": 0.15}
        ],
        "opening_line": "This is Elena Vasquez. I am on with our cybersecurity counsel. Your cloud bucket was openly indexing our customer banking files. Why wasn't I notified by your team, and how much data was stolen?",
        "tags": ["leadership", "crisis", "data-breach", "legal-defense", "level-5"],
        "conclusion_signals": {
            "positive": ["Elena accepts technical containment roadmap and agrees to await forensic report", "Legal escalation held in abeyance"],
            "negative": ["Immediate breach lawsuit filed", "Trainee makes unverified statements on record"]
        }
    },
    {
        "slug": "leadership-25-founder-board-control-pivot-crisis",
        "track": "leadership",
        "title": "Founder vs Board Control & Strategic Pivot Crisis",
        "topic": "conflict_navigation",
        "difficulty": 5,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Visionary", "Negotiation Skills", "Decisiveness"],
        "tactical_coaching_clue": "When existential control is at stake, look past emotional posturing to capital structure reality. Propose a dual-track transition that aligns incentives.",
        "brief": "Co-Founder and former CEO Julian Vance is using his 25% voting block to rally shareholders against your proposed strategic pivot from legacy hardware appliances to pure-play AI enterprise software. Julian calls an emergency meeting to demand your resignation. Defend the company's future.",
        "persona": {
            "name": "Julian Vance",
            "role": "Co-Founder & Chairman",
            "personality": ["visionary", "vindictive", "charismatic", "insecure"],
            "communication_style": "Emotional, grandiloquent, appeals to company founding mythology and early employees.",
            "emotional_baseline": "combative",
        },
        "hidden_motivations": [
            "Julian feels his legacy is being erased by the pivot to software.",
            "He has a secret buyout offer from a private equity firm that wants to strip the legacy assets."
        ],
        "objections": [
            "Hardware built this company from a garage to $200M revenue! You are discarding our identity!",
            "I have 35% shareholder backing right now. Step aside before the shareholder vote embarrasses you."
        ],
        "curveballs": [
            {"trigger": "if trainee insults Julian's legacy hardware achievements", "event": "Julian breaks off negotiations and launches a full public proxy war."}
        ],
        "success_criteria": [
            "Honors Julian's foundational legacy while presenting undeniable market death of hardware.",
            "Uncovers the private equity undertone and shows how AI spin-out multiplies his equity value.",
            "Reaches agreement on Julian chairing the strategic legacy spin-out while software expands."
        ],
        "skills_assessed": [
            {"skill": "conflict_navigation", "weight": 0.35},
            {"skill": "clarity", "weight": 0.25},
            {"skill": "composure", "weight": 0.25},
            {"skill": "coaching_questions", "weight": 0.15}
        ],
        "opening_line": "You have systematically dismantled everything we spent twelve years building. I've spoken with two major institutional investors this morning. It's time for you to tender your resignation.",
        "tags": ["leadership", "crisis", "board-control", "proxy-battle", "level-5"],
        "conclusion_signals": {
            "positive": ["Julian agrees to chair the spin-out entity and backs the software pivot", "Proxy war averted"],
            "negative": ["Company destroyed in public hostile proxy war", "Board paralyzed"]
        }
    }
]

SALES_SCENARIOS = [
    # LEVEL 1: FOUNDATIONAL
    {
        "slug": "sales-01-discovery-polite-prospect",
        "track": "sales",
        "title": "Initial Discovery with a Polite but Guarded Prospect",
        "topic": "discovery_questions",
        "difficulty": 1,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Discovery Questions", "Active Listening", "Rapport & Adaptation"],
        "tactical_coaching_clue": "Polite prospects often give short, surface answers to get off the phone. Avoid launching into a product pitch; ask second-order questions about daily operational friction.",
        "brief": "You are holding a 15-minute introductory call with Rachel Green, Director of Operations at a 400-person logistics firm. She agreed to the call out of courtesy but has her guard up. Uncover at least one operational bottleneck and secure commitment for a technical deep dive.",
        "persona": {
            "name": "Rachel Green",
            "role": "Director of Operations",
            "personality": ["polite", "guarded", "busy", "risk-averse"],
            "communication_style": "Friendly but non-committal. Gives short answers ('everything is fine really').",
            "emotional_baseline": "guarded",
        },
        "hidden_motivations": [
            "Rachel's warehouse dispatchers lose 2 hours daily doing manual reconciliation in Excel.",
            "She fears adopting complex software that requires retraining 80 drivers."
        ],
        "objections": [
            "We have internal spreadsheets that work well enough for now.",
            "I'm pretty booked this quarter, so just send me some brochures."
        ],
        "curveballs": [
            {"trigger": "if trainee pitches software features before asking about workflow", "event": "Rachel politely says she has to jump to another call."}
        ],
        "success_criteria": [
            "Asks at least two open-ended questions about daily dispatch bottlenecks.",
            "Uncovers the Excel spreadsheet manual reconciliation pain.",
            "Secures a confirmed calendar invite for a workflow walkthrough."
        ],
        "skills_assessed": [
            {"skill": "discovery_questions", "weight": 0.40},
            {"skill": "active_listening", "weight": 0.30},
            {"skill": "closing_next_steps", "weight": 0.30}
        ],
        "opening_line": "Hi there. Thanks for reaching out. I only have about ten minutes before a team standup, but what did you want to show me?",
        "tags": ["sales", "discovery", "inbound", "level-1"],
        "conclusion_signals": {
            "positive": ["Rachel agrees to Thursday at 2 PM deep dive", "Rachel confirms demo invite"],
            "negative": ["Rachel asks for brochures and ends call", "Prospect ghosts"]
        }
    },
    {
        "slug": "sales-02-initial-price-inquiry-defense",
        "track": "sales",
        "title": "Handling Early Price Inquiries Without Discounting",
        "topic": "objection_handling",
        "difficulty": 1,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Objection Handling", "Value Articulation", "Tone & Confidence"],
        "tactical_coaching_clue": "Never give a raw number in the first two minutes without context. Anchor price to business value and scope: 'Pricing ranges based on scale; let's see which tier matches your volume.'",
        "brief": "Brett Cooper calls in asking for an immediate rate sheet and discount structure before explaining his company's setup. Defend pricing integrity, anchor value, and pivot back to understanding his true technical needs.",
        "persona": {
            "name": "Brett Cooper",
            "role": "Procurement Analyst",
            "personality": ["transactional", "hurried", "price-sensitive", "blunt"],
            "communication_style": "Short, direct, treats software as a commodity, presses relentlessly for line-item costs.",
            "emotional_baseline": "skeptical",
        },
        "hidden_motivations": [
            "Brett was instructed by his VP to gather pricing benchmarks from three vendors by noon.",
            "His company is hemorrhaging money on legacy maintenance fees."
        ],
        "objections": [
            "I don't need a presentation, just tell me your cost per user.",
            "If you're more expensive than our current tool, we won't waste each other's time."
        ],
        "curveballs": [
            {"trigger": "if trainee offers an immediate 20% discount", "event": "Brett demands 40% and assumes the software is low quality."}
        ],
        "success_criteria": [
            "Refuses to cave to premature discount demands without being combative.",
            "Provides an accurate pricing bracket anchored in user volume.",
            "Pivots the conversation into qualifying his current maintenance costs."
        ],
        "skills_assessed": [
            {"skill": "objection_handling", "weight": 0.35},
            {"skill": "value_articulation", "weight": 0.35},
            {"skill": "tone_confidence", "weight": 0.30}
        ],
        "opening_line": "Hey, I don't have time for a 45-minute slide deck. Can you just email me your pricing matrix and discount tiers?",
        "tags": ["sales", "pricing", "inbound", "level-1"],
        "conclusion_signals": {
            "positive": ["Brett agrees to 15-minute scoping call to price accurately", "Brett shares seat counts"],
            "negative": ["Trainee blabs unanchored lowball pricing", "Brett hangs up"]
        }
    },
    {
        "slug": "sales-03-indifferent-manager-scheduling",
        "track": "sales",
        "title": "Scheduling Next Steps with an Indifferent Middle Manager",
        "topic": "closing_next_steps",
        "difficulty": 1,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Closing & Next Steps", "Tone & Confidence", "Rapport & Adaptation"],
        "tactical_coaching_clue": "Never end with 'I'll email you next week to see how your schedule looks.' Propose specific days and tie the agenda to their personal priority.",
        "brief": "You just finished presenting a capability overview to Kevin Zhang, an IT Operations Manager. Kevin thinks the tool is 'nice', but has zero urgency to move forward. Secure a firm, calendar-locked next step with clear stakeholders.",
        "persona": {
            "name": "Kevin Zhang",
            "role": "IT Operations Manager",
            "personality": ["apathetic", "comfortable", "non-committal", "passive"],
            "communication_style": "Friendly, uses delaying phrases ('looks good, shoot me an email in a couple of weeks').",
            "emotional_baseline": "neutral",
        },
        "hidden_motivations": [
            "Kevin is overwhelmed with day-to-day tickets and dreads taking on a new vendor project.",
            "He needs to see an executive mandate before he invests political capital."
        ],
        "objections": [
            "We're really slammed with migration work right now; follow up next quarter.",
            "Just email me the deck and I'll share it with the team if there's interest."
        ],
        "curveballs": [
            {"trigger": "if trainee agrees to 'follow up next quarter'", "event": "The deal dies and Kevin never responds again."}
        ],
        "success_criteria": [
            "Identifies Kevin's specific time constraint.",
            "Frames the next step as a 20-minute architecture review requiring zero preparation from his team.",
            "Secures a specific date and time on the calendar."
        ],
        "skills_assessed": [
            {"skill": "closing_next_steps", "weight": 0.40},
            {"skill": "value_articulation", "weight": 0.30},
            {"skill": "active_listening", "weight": 0.30}
        ],
        "opening_line": "Yeah, looks like neat software. Appreciate the overview. Why don't you send me your slides and check back in a month or two?",
        "tags": ["sales", "closing", "next-steps", "level-1"],
        "conclusion_signals": {
            "positive": ["Kevin opens his calendar and books Tuesday at 10 AM", "Confirmed mutual action plan"],
            "negative": ["Vague 'we'll be in touch' brush-off", "Deal stalls permanently"]
        }
    },
    {
        "slug": "sales-04-uncovering-manual-workflow-pain",
        "track": "sales",
        "title": "Uncovering Latent Pain Points Behind 'Everything Is Fine'",
        "topic": "discovery_questions",
        "difficulty": 1,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Discovery Questions", "Active Listening", "Value Articulation"],
        "tactical_coaching_clue": "When prospects say 'our current process works fine', ask about edge cases: 'What happens at month-end when volumes spike 3x?'",
        "brief": "You are speaking with Danielle Cooper, Billing Lead at a regional medical lab. She insists their homegrown billing process is completely fine. Probe gently to uncover the late-night error reconciliation and billing leakage.",
        "persona": {
            "name": "Danielle Cooper",
            "role": "Billing Operations Lead",
            "personality": ["traditional", "skeptical", "hardworking", "proud"],
            "communication_style": "Defensive of her existing setup, values reliability over high-tech features.",
            "emotional_baseline": "skeptical",
        },
        "hidden_motivations": [
            "Danielle spent five years perfecting her Excel billing templates and fears looking foolish.",
            "Her team worked until 10 PM last Friday fixing corrupted billing claims."
        ],
        "objections": [
            "We have our own custom sheets, we don't need shiny cloud dashboards.",
            "Automated billing tools always miscalculate state insurance codes."
        ],
        "curveballs": [
            {"trigger": "if trainee calls her Excel sheets 'outdated' or 'stone age'", "event": "Danielle takes offense and shuts down the conversation."}
        ],
        "success_criteria": [
            "Validates the thoroughness of her current manual billing spreadsheets.",
            "Uncovers the friction during month-end claim reconciliations.",
            "Connects automated code verification to eliminating her team's Friday overtime."
        ],
        "skills_assessed": [
            {"skill": "discovery_questions", "weight": 0.35},
            {"skill": "active_listening", "weight": 0.35},
            {"skill": "rapport_adaptation", "weight": 0.30}
        ],
        "opening_line": "Look, I'll be frank: our billing system is working fine for us. I'm not looking to reinvent the wheel with expensive software.",
        "tags": ["sales", "discovery", "latent-pain", "level-1"],
        "conclusion_signals": {
            "positive": ["Danielle admits Friday overtime is brutal and agrees to test claim scanner", "Pain acknowledged"],
            "negative": ["Danielle defends spreadsheets and hangs up", "Trainee insults her current setup"]
        }
    },
    {
        "slug": "sales-05-qualifying-unrealistic-inbound",
        "track": "sales",
        "title": "Qualifying an Inbound Lead with Unrealistic Expectations",
        "topic": "value_articulation",
        "difficulty": 1,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Value Articulation", "Tone & Confidence", "Closing & Next Steps"],
        "tactical_coaching_clue": "Qualify out fast if there is zero fit. Do not promise custom development for low-tier contracts; protect engineering resources.",
        "brief": "Founder Toby Adams runs a 5-person agency with a $200/month budget, but demands 24/7 phone SLAs, custom API connectors, and on-premise installation. Set realistic boundaries and steer him to self-serve or qualify out gracefully.",
        "persona": {
            "name": "Toby Adams",
            "role": "Founder, Adams Creative",
            "personality": ["entitled", "demanding", "budget-constrained", "fast-talking"],
            "communication_style": "High energy, expects enterprise concierge treatment at consumer tier prices.",
            "emotional_baseline": "impatient",
        },
        "hidden_motivations": [
            "Toby wants to pitch enterprise capabilities to his own clients using your software.",
            "He has zero capital to pay enterprise tier fees."
        ],
        "objections": [
            "We're going to grow 10x this year, so you should give us enterprise tier support now.",
            "If you can't build this custom webhook this week, I'll find another provider."
        ],
        "curveballs": [
            {"trigger": "if trainee promises custom developer hours for $200/month", "event": "Toby takes advantage and asks for free implementation."}
        ],
        "success_criteria": [
            "Clearly defines the boundaries of the self-serve vs enterprise tiers.",
            "Protects team resources without being rude or dismissive.",
            "Directs Toby to the standard self-serve plan with documentation."
        ],
        "skills_assessed": [
            {"skill": "tone_confidence", "weight": 0.40},
            {"skill": "value_articulation", "weight": 0.30},
            {"skill": "closing_next_steps", "weight": 0.30}
        ],
        "opening_line": "Hey team, we're ready to sign up today if you can guarantee a 15-minute phone SLA and build a custom webhook for our database by Friday.",
        "tags": ["sales", "qualification", "boundary-setting", "level-1"],
        "conclusion_signals": {
            "positive": ["Toby accepts standard self-serve tier guidelines or politely parts ways", "Clean qualification"],
            "negative": ["Trainee makes unauthorized engineering commitments", "Messy bad-fit customer onboarded"]
        }
    },

    # LEVEL 2: INTERMEDIATE
    {
        "slug": "sales-06-incumbent-vendor-displacement",
        "track": "sales",
        "title": "Overcoming Incumbent Vendor Entrenchment",
        "topic": "objection_handling",
        "difficulty": 2,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Objection Handling", "Value Articulation", "Active Listening"],
        "tactical_coaching_clue": "Never bash the incumbent. Validate why they picked them 5 years ago, then illuminate how market requirements have evolved past their legacy architecture.",
        "brief": "You are speaking with Mark Davies, VP of IT at a financial services firm. They have used an established legacy incumbent (e.g. Oracle/SAP) for 8 years. Mark acknowledges the legacy tool is slow, but switching costs and migration risk terrify him. Frame the cost of inaction.",
        "persona": {
            "name": "Mark Davies",
            "role": "VP of Information Technology",
            "personality": ["cautious", "experienced", "risk-averse", "skeptical"],
            "communication_style": "Pragmatic, invokes compliance and past migration scars, resists vendor hype.",
            "emotional_baseline": "skeptical",
        },
        "hidden_motivations": [
            "Mark's predecessor was fired over a botched CRM migration in 2019.",
            "He is fed up with paying 22% annual maintenance increases to the incumbent."
        ],
        "objections": [
            "Nobody ever got fired for buying IBM/Oracle; switching to a newer platform is a massive career risk.",
            "Our data is deeply integrated into their proprietary database; migration would take 18 months."
        ],
        "curveballs": [
            {"trigger": "if trainee insults the incumbent software directly", "event": "Mark defends his past purchasing decision and ends the meeting."}
        ],
        "success_criteria": [
            "Validates Mark's risk aversion and past migration scars.",
            "Proposes a low-risk side-by-side pilot that does not disrupt core production.",
            "Highlights modern automated migration connectors with guaranteed data parity."
        ],
        "skills_assessed": [
            {"skill": "objection_handling", "weight": 0.35},
            {"skill": "value_articulation", "weight": 0.35},
            {"skill": "active_listening", "weight": 0.30}
        ],
        "opening_line": "Look, we've used our current vendor for eight years. They're expensive and clunky, sure, but they're stable. Why on earth would I risk a rip-and-replace?",
        "tags": ["sales", "incumbent", "competitive", "level-2"],
        "conclusion_signals": {
            "positive": ["Mark agrees to a non-invasive sandbox data migration trial", "Risk barrier lowered"],
            "negative": ["Mark retreats into incumbent safety", "Trainee gets combative over legacy features"]
        }
    },
    {
        "slug": "sales-07-hesitant-operations-director",
        "track": "sales",
        "title": "Mid-Market Discovery with a Hesitant Operations Director",
        "topic": "discovery_questions",
        "difficulty": 2,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Discovery Questions", "Active Listening", "Rapport & Adaptation"],
        "tactical_coaching_clue": "Operations directors care about warehouse floor chaos. Shift the pitch from 'cool digital features' to 'zero workflow disruption for floor staff.'",
        "brief": "Greg Vance oversees three regional fulfillment centers. He was burned last year by a software rollout that crashed scanner guns during peak holiday shipping. Unpack his trauma, restore trust, and demonstrate safe parallel deployment.",
        "persona": {
            "name": "Greg Vance",
            "role": "Director of Regional Logistics",
            "personality": ["battle-tested", "protective of floor workers", "direct", "skeptical"],
            "communication_style": "No-nonsense, grounded in physical plant metrics (pick rates, dock times), hates tech buzzwords.",
            "emotional_baseline": "guarded",
        },
        "hidden_motivations": [
            "Greg lost two top shift supervisors who quit during the last disastrous tech rollout.",
            "He wants higher pick accuracy but cannot afford 5 minutes of scanner downtime."
        ],
        "objections": [
            "Last tech company promised zero downtime, and our scanner guns died during Black Friday.",
            "My team works on concrete floors with gloves on; they don't want sleek iPad touch interfaces."
        ],
        "curveballs": [
            {"trigger": "if trainee uses jargon like 'cloud-native AI orchestration'", "event": "Greg tells trainee they clearly have never set foot in a warehouse."}
        ],
        "success_criteria": [
            "Acknowledges the pain of the scanner gun disaster with deep empathy.",
            "Speaks in plant metrics: dock turnaround times, barcode scan latency, physical durability.",
            "Proposes a single-shift test line with complete rollback safety."
        ],
        "skills_assessed": [
            {"skill": "discovery_questions", "weight": 0.35},
            {"skill": "empathy", "weight": 0.35},
            {"skill": "rapport_adaptation", "weight": 0.30}
        ],
        "opening_line": "Before you start your demo, let me tell you: the last software vendor cost us $300,000 in missed holiday shipments. Why shouldn't I assume you'll do the same?",
        "tags": ["sales", "operations", "trust-building", "level-2"],
        "conclusion_signals": {
            "positive": ["Greg invites trainee to visit the facility for a 1-line pilot test", "Trust established"],
            "negative": ["Greg rejects tech demo entirely", "Trainee relies on marketing buzzwords"]
        }
    },
    {
        "slug": "sales-08-reframing-contract-renewal-cut",
        "track": "sales",
        "title": "Reframing a 15% Budget Cut at Contract Renewal",
        "topic": "negotiation",
        "difficulty": 2,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Negotiation", "Value Articulation", "Objection Handling"],
        "tactical_coaching_clue": "Never give a unilateral price cut. If they demand 15% off, ask for something of equal commercial value in return: multi-year commitment, upfront payment, or case study rights.",
        "brief": "CFO Chloe Albright sends an email 30 days before annual contract renewal stating the board has mandated an across-the-board 15% vendor fee cut. Defend your revenue baseline and trade concessions constructively.",
        "persona": {
            "name": "Chloe Albright",
            "role": "Chief Financial Officer",
            "personality": ["analytical", "firm", "fiscally conservative", "shrewd"],
            "communication_style": "Crisp, concise, states budget cuts as non-negotiable mandates from the Board.",
            "emotional_baseline": "firm",
        },
        "hidden_motivations": [
            "Chloe is trying to show the Board she squeezed savings out of all active vendors.",
            "Her team loves your tool and switching would cost her $100k in engineering retraining."
        ],
        "objections": [
            "The Board mandated a 15% cut across all software vendors; take it or we non-renew.",
            "Other vendors complied immediately with our budget constraints."
        ],
        "curveballs": [
            {"trigger": "if trainee caves immediately with zero trade concessions", "event": "Chloe asks for an additional 10% discount on support tiers."}
        ],
        "success_criteria": [
            "Demonstrates the measurable ROI and usage metrics delivered over the past 12 months.",
            "Trades the requested discount for a 3-year agreement with annual upfront payments.",
            "Preserves total contract value while meeting Chloe's accounting targets."
        ],
        "skills_assessed": [
            {"skill": "negotiation", "weight": 0.40},
            {"skill": "value_articulation", "weight": 0.35},
            {"skill": "tone_confidence", "weight": 0.25}
        ],
        "opening_line": "Good morning. You saw my email: our Board has mandated a 15% cut across all enterprise software subscriptions for next fiscal year. Can you adjust the renewal invoice?",
        "tags": ["sales", "renewal", "negotiation", "level-2"],
        "conclusion_signals": {
            "positive": ["Chloe agrees to 3-year term with upfront payment preserving ARR", "Win-win renewal signed"],
            "negative": ["Trainee gives away margin for nothing", "Account cancels in standoff"]
        }
    },
    {
        "slug": "sales-09-presenting-roi-skeptical-controller",
        "track": "sales",
        "title": "Presenting Tailored ROI to a Skeptical Financial Controller",
        "topic": "value_articulation",
        "difficulty": 2,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Value Articulation", "Tone & Confidence", "Active Listening"],
        "tactical_coaching_clue": "Controllers despise 'soft productivity savings' like 'saves 2 hours of employee happiness.' Anchor only in hard cost reduction: server consolidation, overtime elimination, and compliance fines.",
        "brief": "Corporate Controller Nathan Vance is reviewing your business case for a $180k software deployment. He immediately attacks claims of 'employee productivity savings' as fictitious spreadsheet math. Defend the business case using hard financial metrics.",
        "persona": {
            "name": "Nathan Vance",
            "role": "Corporate Controller",
            "personality": ["meticulous", "skeptical", "unimpressed", "rigorous"],
            "communication_style": "Deadpan, picks apart ROI models line by line, challenges every underlying assumption.",
            "emotional_baseline": "skeptical",
        },
        "hidden_motivations": [
            "Nathan is judged on actual bottom-line cash flow, not theoretical employee satisfaction.",
            "He will approve the spend if you show hard cost replacement of existing contractor invoices."
        ],
        "objections": [
            "Saved employee hours never translate to real payroll reduction; it's soft spreadsheet fiction.",
            "Show me where this reduces actual cash outflow this fiscal year."
        ],
        "curveballs": [
            {"trigger": "if trainee cites generic industry ROI studies ('Forrester says 300% ROI')", "event": "Nathan laughs dismissively and challenges vendor-sponsored marketing papers."}
        ],
        "success_criteria": [
            "Strips out soft productivity claims and focuses exclusively on hard cost elimination.",
            "Maps software spend directly against specific retiring legacy contractor line items.",
            "Demonstrates a defensible 7-month cash payback period."
        ],
        "skills_assessed": [
            {"skill": "value_articulation", "weight": 0.40},
            {"skill": "tone_confidence", "weight": 0.30},
            {"skill": "objection_handling", "weight": 0.30}
        ],
        "opening_line": "I've reviewed your business case. You claim this saves $400k in employee efficiency. In my 20 years of finance, 'saved hours' has never once lowered payroll. What are the real numbers?",
        "tags": ["sales", "roi", "finance-defense", "level-2"],
        "conclusion_signals": {
            "positive": ["Nathan approves hard cash replacement model for Capex committee", "Business case accepted"],
            "negative": ["Nathan rejects proposal as marketing fluff", "Deal blocked by finance"]
        }
    },
    {
        "slug": "sales-10-navigating-executive-gatekeeper",
        "track": "sales",
        "title": "Navigating Executive Assistant Gatekeeper Resistance",
        "topic": "rapport_adaptation",
        "difficulty": 2,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Rapport & Adaptation", "Tone & Confidence", "Clarity"],
        "tactical_coaching_clue": "Never treat an Executive Assistant like an obstacle. Treat them as a strategic partner: 'I need your guidance on whether this aligns with what the CTO is prioritizing this quarter.'",
        "brief": "You are calling the office of CTO Patricia Sterling. Her Executive Assistant, Sandra Miller, has shielded her calendar for 12 years and aggressively screens cold vendor pitches. Win Sandra's partnership to earn a spot on the CTO's calendar.",
        "persona": {
            "name": "Sandra Miller",
            "role": "Executive Assistant to CTO",
            "personality": ["protective", "perceptive", "authoritative", "gatekeeping"],
            "communication_style": "Polite, crisp, asks probing questions about whether this call was requested.",
            "emotional_baseline": "skeptical",
        },
        "hidden_motivations": [
            "Sandra's primary job is keeping vendor noise off Patricia's calendar.",
            "However, Sandra knows Patricia is urgently looking for cloud compliance solutions for next week's audit."
        ],
        "objections": [
            "Patricia's calendar is completely locked through Q3; email info@company.com.",
            "Did she specifically ask you to follow up with her?"
        ],
        "curveballs": [
            {"trigger": "if trainee pretends they are an old friend of Patricia", "event": "Sandra immediately identifies the lie and permanently blacklists the vendor."}
        ],
        "success_criteria": [
            "Respects Sandra's authority and role without condescension.",
            "References Patricia's public keynote priority on cloud compliance audit readiness.",
            "Earns Sandra's endorsement for a 15-minute briefing slot next Tuesday."
        ],
        "skills_assessed": [
            {"skill": "rapport_adaptation", "weight": 0.40},
            {"skill": "tone_confidence", "weight": 0.30},
            {"skill": "clarity", "weight": 0.30}
        ],
        "opening_line": "This is Sandra in Patricia Sterling's office. She's in back-to-back meetings today. What company are you with and is this regarding a scheduled call?",
        "tags": ["sales", "gatekeeper", "cold-outreach", "level-2"],
        "conclusion_signals": {
            "positive": ["Sandra books a 15-minute introductory slot on Patricia's calendar", "Gatekeeper becomes ally"],
            "negative": ["Sandra sends caller to generic spam inbox", "Number permanently blocked"]
        }
    },

    # LEVEL 3: ADVANCED
    {
        "slug": "sales-11-aggressive-procurement-hardball",
        "track": "sales",
        "title": "Defending Price Against Aggressive Procurement Hardball",
        "topic": "negotiation",
        "difficulty": 3,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Negotiation", "Tone & Confidence", "Objection Handling"],
        "tactical_coaching_clue": "Procurement is compensated on achieving discounts. Never give away price without taking features, support tiers, or payment flexibility off the table.",
        "brief": "Senior Procurement Negotiator Victor Kane enters the final contracting phase of a $320,000 deal. Victor bluntly demands an automatic 25% price reduction, threatens to walk to a competitor, and gives you until 5 PM to comply. Hold firm, trade strategically, and protect contract margin.",
        "persona": {
            "name": "Victor Kane",
            "role": "Global Sourcing & Procurement Lead",
            "personality": ["intimidating", "tactical", "cold", "unflappable"],
            "communication_style": "Monotone, uses manufactured silence, feigns total disinterest, employs take-it-or-leave-it ultimatums.",
            "emotional_baseline": "hostile",
        },
        "hidden_motivations": [
            "Victor knows your technical evaluation scored 95/100, while the competitor failed security.",
            "His annual bonus has a multiplier if he extracts at least 10% in concessions from new vendors."
        ],
        "objections": [
            "Your competitor offered the exact same scope for $240,000. Match it by 5 PM or we sign with them.",
            "We have standard corporate payment terms: net-90, and we don't pay implementation fees."
        ],
        "curveballs": [
            {"trigger": "if trainee panics and slashes price to $240,000", "event": "Victor immediately pushes for free dedicated support and net-120 terms."}
        ],
        "success_criteria": [
            "Maintains absolute composure in the face of manufactured ultimatums.",
            "Reminds Victor subtly of their technical committee's unanimous security endorsement.",
            "Trades a 7% volume concession in exchange for 3-year upfront commitment and net-30 terms."
        ],
        "skills_assessed": [
            {"skill": "negotiation", "weight": 0.40},
            {"skill": "tone_confidence", "weight": 0.30},
            {"skill": "composure", "weight": 0.30}
        ],
        "opening_line": "Let's make this quick. We have your $320,000 proposal. Our ceiling is $240,000. If you can't get your pricing to $240k by 5 PM today, I'm issuing the purchase order to your competitor.",
        "tags": ["sales", "procurement", "hardball", "negotiation", "level-3"],
        "conclusion_signals": {
            "positive": ["Victor agrees to $295k on 3-year term with net-30", "Margin defended successfully"],
            "negative": ["Trainee caves to ruinous discount", "Deal lost due to arrogant standoff"]
        }
    },
    {
        "slug": "sales-12-multistakeholder-committee-demo",
        "track": "sales",
        "title": "Navigating Conflicting Stakeholders in Committee Demo",
        "topic": "active_listening",
        "difficulty": 3,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Active Listening", "Value Articulation", "Rapport & Adaptation"],
        "tactical_coaching_clue": "In committee presentations, never address just one person. Triangulate competing departmental priorities: show how marketing speed operates inside Infosec boundaries.",
        "brief": "You are presenting to a buying committee: VP of Growth Derek (wants rapid self-serve API access) and Head of Cybersecurity Janice (wants strict SAML lockdown and zero third-party integrations). Balance their opposing priorities and build unified consensus.",
        "persona": {
            "name": "Janice Sterling",
            "role": "Chief Information Security Officer",
            "personality": ["vigilant", "skeptical", "uncompromising", "analytical"],
            "communication_style": "Cuts off marketing enthusiasm, demands SOC2 compliance and penetration test audits.",
            "emotional_baseline": "skeptical",
        },
        "hidden_motivations": [
            "Janice blocked Derek's last vendor and their working relationship is strained.",
            "She actually likes modern granular role-based access control (RBAC) if she controls the master key."
        ],
        "objections": [
            "Derek's marketing team wants open API webhooks, which introduces massive vulnerability into our customer database.",
            "We have strict audit requirements; self-serve signup is an absolute non-starter."
        ],
        "curveballs": [
            {"trigger": "if trainee agrees with Derek to bypass Infosec protocols", "event": "Janice vetoes the entire purchase on the spot."}
        ],
        "success_criteria": [
            "Validates Janice's security mandate before addressing Derek's speed requirements.",
            "Demonstrates granular Role-Based Access Control and automated audit trails.",
            "Secures mutual sign-off for a security-reviewed proof of concept."
        ],
        "skills_assessed": [
            {"skill": "active_listening", "weight": 0.35},
            {"skill": "value_articulation", "weight": 0.35},
            {"skill": "conflict_navigation", "weight": 0.30}
        ],
        "opening_line": "Before Derek starts talking about feature velocity, I want to see your SOC2 Type II audit, and I want to know why your webhook endpoint allows external callbacks.",
        "tags": ["sales", "committee", "infosec", "consensus", "level-3"],
        "conclusion_signals": {
            "positive": ["Both Derek and Janice endorse a 14-day scoped security trial", "Committee consensus reached"],
            "negative": ["Janice formally exercises security veto", "Meeting descends into internal fighting"]
        }
    },
    {
        "slug": "sales-13-winning-back-at-risk-enterprise",
        "track": "sales",
        "title": "Rescuing an At-Risk Enterprise Account Post-Outage",
        "topic": "empathy",
        "difficulty": 3,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["De-escalation", "Empathy", "Restoring Trust"],
        "tactical_coaching_clue": "When an angry customer is threatening to cancel, do not defend the software or cite SLA percentages. Own the business interruption fully, listen without interrupting, and present concrete corrective safeguards.",
        "brief": "Marcus Cole, VP of Operations at your largest enterprise customer ($650k ARR), calls a crisis meeting following a 3-hour system outage during their peak order processing window. He is threatening immediate contract termination. De-escalate Marcus, restore trust, and preserve the account.",
        "persona": {
            "name": "Marcus Cole",
            "role": "VP of Global Operations",
            "personality": ["furious", "under extreme executive fire", "blunt", "demanding"],
            "communication_style": "Aggressive, interrupted, quotes financial losses per minute, threatens breach litigation.",
            "emotional_baseline": "furious",
        },
        "hidden_motivations": [
            "Marcus had to explain the downtime directly to his Board of Directors yesterday.",
            "Deep down, switching vendors right now would be catastrophic for his upcoming quarter."
        ],
        "objections": [
            "Your outage cost us $450,000 in cancelled orders; your SLA credit of 5% is a joke.",
            "Our legal counsel is already drafting our formal notice of material breach."
        ],
        "curveballs": [
            {"trigger": "if trainee cites section 8.4 of the contract limiting liability", "event": "Marcus explodes and instructs legal to file suit immediately."}
        ],
        "success_criteria": [
            "Allows Marcus to vent completely without defensive interruptions.",
            "Presents a comprehensive Root Cause Analysis (RCA) and $0 architecture redundancy upgrade.",
            "Secures agreement for a weekly executive uptime check-in, keeping the account active."
        ],
        "skills_assessed": [
            {"skill": "composure", "weight": 0.40},
            {"skill": "empathy", "weight": 0.30},
            {"skill": "active_listening", "weight": 0.30}
        ],
        "opening_line": "I'm not interested in your canned apologies. Your system flatlined for three hours during our biggest promotional event of the year. Why shouldn't I terminate our contract today for material breach?",
        "tags": ["sales", "churn-risk", "crisis", "executive-deescalation", "level-3"],
        "conclusion_signals": {
            "positive": ["Marcus agrees to review dedicated disaster recovery cluster upgrade", "Account saved"],
            "negative": ["Account formally cancels and files lawsuit", "Trainee gets defensive over contract SLA"]
        }
    },
    {
        "slug": "sales-14-displacing-hostile-competitor-rfp",
        "track": "sales",
        "title": "Displacing a Hostile Niche Competitor During RFP",
        "topic": "value_articulation",
        "difficulty": 3,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Competitive Differentiation", "Reframing", "Objection Handling"],
        "tactical_coaching_clue": "When an RFP appears rigged with competitor-specific checkboxes, do not play defense on their terms. Reframe the evaluation criteria around total cost of ownership and enterprise scale.",
        "brief": "You are presenting your final RFP defense to Procurement Director Helen Vance. The RFP technical specifications were clearly written by a boutique competitor, emphasizing niche customization over enterprise reliability. Reframe the RFP criteria and win the multi-year deal.",
        "persona": {
            "name": "Helen Vance",
            "role": "Director of Procurement & Strategic Sourcing",
            "personality": ["procedural", "formal", "objective", "checklist-oriented"],
            "communication_style": "Strict adherence to RFP scorecards, challenges non-compliant response checkboxes.",
            "emotional_baseline": "neutral",
        },
        "hidden_motivations": [
            "Helen is annoyed that the technical department attempted to pre-select a vendor without competitive bidding.",
            "She cares about long-term vendor solvency and enterprise SLA reliability."
        ],
        "objections": [
            "Your competitor met 98 of our custom technical specifications; your response only checked 84.",
            "They are offering unlimited custom code modifications included in the base fee."
        ],
        "curveballs": [
            {"trigger": "if trainee attacks the integrity of the RFP author", "event": "Helen reprimands trainee for unprofessional conduct."}
        ],
        "success_criteria": [
            "Reframes 'custom code modifications' as long-term maintenance vulnerability and tech debt.",
            "Highlights your certified compliance, SOC2, and 99.99% multi-region uptime guarantees.",
            "Convinces Helen to weight enterprise scalability and data governance equally to feature checkboxes."
        ],
        "skills_assessed": [
            {"skill": "value_articulation", "weight": 0.40},
            {"skill": "objection_handling", "weight": 0.30},
            {"skill": "tone_confidence", "weight": 0.30}
        ],
        "opening_line": "We've tallied the scorecard for your RFP response. You fell short on 14 custom feature requirements that our other bidder accommodated seamlessly. What is your justification?",
        "tags": ["sales", "rfp", "competitive-defense", "level-3"],
        "conclusion_signals": {
            "positive": ["Helen re-scores the RFP giving heavy weight to security and uptime", "Tender won"],
            "negative": ["Disqualified on checklist technicalities", "Boutique vendor wins"]
        }
    },
    {
        "slug": "sales-15-accelerating-stalled-q4-deal",
        "track": "sales",
        "title": "Accelerating a Stalled Q4 Enterprise Deal",
        "topic": "closing_next_steps",
        "difficulty": 3,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Closing & Next Steps", "Urgency Creation", "Discovery Questions"],
        "tactical_coaching_clue": "Deals stall because the cost of doing nothing feels lower than the friction of change. Reconnect the champion to the pain of delaying into next year.",
        "brief": "Internal Champion David Ross evaluated your software in October and loved it. However, it is now December 10, the contract is sitting with legal, and David has gone silent. Re-engage David, uncover the hidden bottleneck, and drive signature before year-end.",
        "persona": {
            "name": "David Ross",
            "role": "VP of Revenue Operations",
            "personality": ["overwhelmed", "friendly", "avoidant", "busy"],
            "communication_style": "Brief emails, sounds stressed on phone, apologetic but non-committal.",
            "emotional_baseline": "distracted",
        },
        "hidden_motivations": [
            "David's legal team raised redlines on data retention, and David is avoiding confrontation.",
            "If the deal does not close in Q4, his budget will be reclaimed by Finance in January."
        ],
        "objections": [
            "We're just swamped closing out the quarter; can't we revisit this in February?",
            "Legal is buried in end-of-year contracts; getting them to review redlines is impossible."
        ],
        "curveballs": [
            {"trigger": "if trainee threatens to pull pricing discounts immediately without empathy", "event": "David shrugs and tells trainee to cancel the contract entirely."}
        ],
        "success_criteria": [
            "Uncovers the specific legal redline bottleneck on data retention.",
            "Reminds David of the use-it-or-lose-it budget dynamic for next fiscal year.",
            "Offers a redline resolution call with internal legal to clear the path for signing by Friday."
        ],
        "skills_assessed": [
            {"skill": "closing_next_steps", "weight": 0.40},
            {"skill": "active_listening", "weight": 0.30},
            {"skill": "objection_handling", "weight": 0.30}
        ],
        "opening_line": "Hey, sorry I haven't gotten back to you. December has just been insane. Look, can we just put this on hold until the dust settles in mid-January?",
        "tags": ["sales", "stalled-deal", "urgency", "q4-close", "level-3"],
        "conclusion_signals": {
            "positive": ["David schedules joint legal call and commits to signing by Dec 20", "Q4 revenue closed"],
            "negative": ["Deal slips to Q1 and budget gets cancelled by finance", "Lost momentum"]
        }
    },

    # LEVEL 4: HIGH-STAKES
    {
        "slug": "sales-16-infosec-legal-redlines-deadlock",
        "track": "sales",
        "title": "Navigating Infosec & Legal Redlines Deadlock",
        "topic": "negotiation",
        "difficulty": 4,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Contract Negotiation", "Risk Mitigation", "Clarity"],
        "tactical_coaching_clue": "Lawyers are trained to imagine worst-case catastrophes. Deconstruct the unlimited liability clause: separate direct operational damages from indirect consequential damages.",
        "brief": "Enterprise General Counsel Victoria Sterling has redlined your Master Services Agreement, demanding unlimited liability for any data interruption and mutual indemnity for third-party cloud outages. Your executive leadership will not accept unlimited liability. Negotiate a mutually acceptable risk cap.",
        "persona": {
            "name": "Victoria Sterling",
            "role": "General Counsel & VP of Legal Compliance",
            "personality": ["meticulous", "unyielding", "intellectually formidable", "risk-averse"],
            "communication_style": "Precise legal terminology, cites statutory exposure, unemotional, highly structured arguments.",
            "emotional_baseline": "steely",
        },
        "hidden_motivations": [
            "Victoria was scorched by a ransomware lawsuit at her previous company.",
            "She knows unlimited liability is commercially unreasonable, but wants a 3x contract value cap."
        ],
        "objections": [
            "Our corporate charter prohibits entering SaaS agreements without full data indemnity.",
            "If your software causes an outage, our damages could easily exceed $10 million."
        ],
        "curveballs": [
            {"trigger": "if trainee agrees to unlimited liability on the call", "event": "Deal is rendered uninsurable and rejected by internal CFO."}
        ],
        "success_criteria": [
            "Articulates standard commercial risk boundaries without being dismissive of legal duty.",
            "Proposes a tiered liability cap: 1x contract value for standard SLA, 3x for verified data breach.",
            "Secures Victoria's agreement to the compromise draft for final execution."
        ],
        "skills_assessed": [
            {"skill": "negotiation", "weight": 0.40},
            {"skill": "clarity", "weight": 0.30},
            {"skill": "composure", "weight": 0.30}
        ],
        "opening_line": "I've reviewed your standard contract. Your $50,000 limitation of liability is completely unacceptable for an enterprise handling our customer telemetry. We require uncapped liability or we walk.",
        "tags": ["sales", "legal", "redlines", "contracting", "level-4"],
        "conclusion_signals": {
            "positive": ["Victoria accepts 3x contract value super-cap for breach", "Contract approved for signing"],
            "negative": ["Deal dies in legal gridlock", "Uninsurable terms accepted"]
        }
    },
    {
        "slug": "sales-17-skeptical-cfo-payback-period",
        "track": "sales",
        "title": "Skeptical CFO Demanding Hard Payback Under 6 Months",
        "topic": "value_articulation",
        "difficulty": 4,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Financial Acumen", "Executive Gravitas", "Value Articulation"],
        "tactical_coaching_clue": "CFOs do not care about feature lists or awards. Focus 100% on cash conservation, payback velocity, and capital expenditure replacement.",
        "brief": "CFO Jonathan Vance has veto power over this $450k capital expenditure. With macroeconomic headwinds tightening budgets, Jonathan requires verifiable proof that this deployment will achieve positive net cash flow in under 180 days. Convince him with ironclad unit economics.",
        "persona": {
            "name": "Jonathan Vance",
            "role": "Chief Financial Officer",
            "personality": ["austere", "rigorous", "skeptical", "sharp"],
            "communication_style": "Interrogative, rapid financial calculations, dismisses marketing projections instantly.",
            "emotional_baseline": "guarded",
        },
        "hidden_motivations": [
            "Jonathan is holding back capital to prepare for possible debt refinancing in Q3.",
            "He will greenlight the project if it eliminates two scheduled software renewals from competing budgets."
        ],
        "objections": [
            "We are freezing all non-essential Capex. Why shouldn't I push this project to 2027?",
            "Your 18-month ROI model is worthless; I need cash payback in under six months."
        ],
        "curveballs": [
            {"trigger": "if trainee stammers or hesitates on basic margin and payback math", "event": "Jonathan terminates the meeting after 5 minutes."}
        ],
        "success_criteria": [
            "Presents a tailored 5-month cash breakeven schedule based on redundant vendor consolidation.",
            "Projects executive presence and mastery over enterprise unit economics.",
            "Secures formal sign-off on the capital expenditure allocation."
        ],
        "skills_assessed": [
            {"skill": "value_articulation", "weight": 0.40},
            {"skill": "tone_confidence", "weight": 0.35},
            {"skill": "composure", "weight": 0.25}
        ],
        "opening_line": "You have 15 minutes. In this market, I am cutting budgets, not expanding them. Explain to me how spending $450,000 on your software puts cash in my balance sheet within 180 days.",
        "tags": ["sales", "cfo", "financial-defense", "executive", "level-4"],
        "conclusion_signals": {
            "positive": ["Jonathan signs off on the capital authorization", "Financial payback model approved"],
            "negative": ["Jonathan freezes the purchase indefinitely", "Trainee crumbles under financial interrogation"]
        }
    },
    {
        "slug": "sales-18-executive-champion-departure",
        "track": "sales",
        "title": "Managing Executive Champion Departure Mid-Deal",
        "topic": "discovery_questions",
        "difficulty": 4,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Account Strategy", "Rapid Discovery", "Rapport Building"],
        "tactical_coaching_clue": "When your champion leaves, do not assume their successor shares their enthusiasm. Treat this as Day 1 of discovery: qualify the new leader's personal mandate.",
        "brief": "Your champion, the VP of Sales, unexpectedly resigned last Friday during final pilot evaluation. Interim VP Gordon Vance has taken over. Gordon has his own preferred tech stack from his previous company. Re-qualify the account, align with Gordon's 90-day mandate, and save the $280k contract.",
        "persona": {
            "name": "Gordon Vance",
            "role": "Interim VP of Sales & Operations",
            "personality": ["ambitious", "skeptical", "independent", "results-driven"],
            "communication_style": "Direct, impatient, wants to make an immediate mark, skeptical of inherited projects.",
            "emotional_baseline": "neutral",
        },
        "hidden_motivations": [
            "Gordon wants to establish his authority and hates rubber-stamping his predecessor's legacy initiatives.",
            "He has a mandate from the Board to improve sales pipeline hygiene within 60 days."
        ],
        "objections": [
            "I didn't choose this software; my predecessor did. I normally implement Salesforce RevOps.",
            "We are putting all pending contract reviews on hold while I evaluate departmental priorities."
        ],
        "curveballs": [
            {"trigger": "if trainee says 'Your predecessor already approved everything, we just need your signature'", "event": "Gordon cancels the pilot immediately out of spite."}
        ],
        "success_criteria": [
            "Treats Gordon with fresh respect and avoids leaning on the former VP's ghost authority.",
            "Uncovers Gordon's top 90-day mandate: fixing pipeline hygiene and stage-gate conversion.",
            "Demonstrates how the current pilot delivers Gordon's specific mandate 3 months faster than a new implementation."
        ],
        "skills_assessed": [
            {"skill": "discovery_questions", "weight": 0.35},
            {"skill": "rapport_adaptation", "weight": 0.35},
            {"skill": "value_articulation", "weight": 0.30}
        ],
        "opening_line": "As you know, Dave is no longer with the company. I'm reviewing every contract he had in flight, and frankly, I have zero interest in signing something just because someone else liked it.",
        "tags": ["sales", "champion-departure", "account-rescue", "level-4"],
        "conclusion_signals": {
            "positive": ["Gordon adopts the pilot as his own executive win", "Contract preserved and signed"],
            "negative": ["Gordon cancels deal and brings in his former vendor", "Trainee alienates new leader"]
        }
    },
    {
        "slug": "sales-19-upselling-global-expansion",
        "track": "sales",
        "title": "Upselling Multi-Year Enterprise Expansion to Global VP",
        "topic": "value_articulation",
        "difficulty": 4,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Strategic Account Growth", "Value Realization", "Negotiation"],
        "tactical_coaching_clue": "To expand from 500 seats to 5,000 seats across global regions, leverage the validated success metrics from the North America division to de-risk European rollout.",
        "brief": "Your software has been running successfully in North America for 12 months with 500 users. You are meeting with Global Operations EVP Julian Sterling to pitch a worldwide expansion to 5,000 seats across EMEA and APAC, growing ARR from $150k to $1.2M. Structure the strategic expansion roadmap.",
        "persona": {
            "name": "Julian Sterling",
            "role": "Executive Vice President, Global Operations",
            "personality": ["visionary", "demanding", "international", "scale-minded"],
            "communication_style": "Macro-focused, thinks in multi-million dollar annual budgets, concerned with cross-border localization.",
            "emotional_baseline": "interested",
        },
        "hidden_motivations": [
            "Julian is evaluated on global operational consolidation and eliminating rogue regional software spend.",
            "He fears European GDPR compliance and Asian latency issues."
        ],
        "objections": [
            "What works in North America often fails in Germany and Japan due to compliance and language friction.",
            "Scaling 10x in seat volume should yield at least a 50% discount per license."
        ],
        "curveballs": [
            {"trigger": "if trainee offers a 50% discount immediately without volume commitments", "event": "Julian questions whether your infrastructure can genuinely support enterprise tier load."}
        ],
        "success_criteria": [
            "Presents concrete North America performance metrics: 34% productivity lift, 99.98% uptime.",
            "Demonstrates verified GDPR compliance, EU data sovereignty clusters, and multi-language support.",
            "Secures agreement for a phased global rollout roadmap totaling $1.1M ARR."
        ],
        "skills_assessed": [
            {"skill": "value_articulation", "weight": 0.40},
            {"skill": "negotiation", "weight": 0.30},
            {"skill": "tone_confidence", "weight": 0.30}
        ],
        "opening_line": "Our North American team speaks highly of your tool. But scaling this from 500 users in Ohio to 5,000 users across London, Frankfurt, and Singapore is a completely different ballgame.",
        "tags": ["sales", "expansion", "global-account", "enterprise", "level-4"],
        "conclusion_signals": {
            "positive": ["Julian signs multi-million dollar global expansion letter of intent", "Tiered global master agreement closed"],
            "negative": ["Regional rollout blocked due to compliance fears", "Account remains localized to North America"]
        }
    },
    {
        "slug": "sales-20-poc-technical-failure-remediation",
        "track": "sales",
        "title": "Rescuing a Proof-of-Concept Technical Failure",
        "topic": "composure",
        "difficulty": 4,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Crisis Communication", "Accountability", "Composure"],
        "tactical_coaching_clue": "Never blame the client's dirty data or legacy servers for a POC crash. Own the failure, isolate the root cause, and present a dedicated engineering sandbox.",
        "brief": "Day 10 of a 14-day enterprise POC with a Fortune 500 retailer. During a high-volume load simulation, your ingestion pipeline choked on their legacy mainframe data format and crashed the test environment. Enterprise Architect Lisa Kane is calling to cancel the evaluation. Save the deal.",
        "persona": {
            "name": "Lisa Kane",
            "role": "Chief Enterprise Architect",
            "personality": ["uncompromising", "technical", "skeptical", "frustrated"],
            "communication_style": "Cold, cites failure logs, demands immediate technical justification.",
            "emotional_baseline": "furious",
        },
        "hidden_motivations": [
            "Lisa defended your software against internal critics who wanted to build in-house.",
            "She feels publicly humiliated that the test environment crashed in front of her CTO."
        ],
        "objections": [
            "Your software crashed on 50,000 transactions per second. Our production runs at 200,000. You cannot handle our volume.",
            "I'm reporting this POC failure to the CTO this afternoon and recommending we terminate talks."
        ],
        "curveballs": [
            {"trigger": "if trainee claims 'your mainframe sent malformed data'", "event": "Lisa hangs up immediately and sends a formal termination notice."}
        ],
        "success_criteria": [
            "Takes immediate, dignified ownership of the ingestion pipeline crash.",
            "Explains the exact parser buffer overflow root cause discovered by engineering within 2 hours.",
            "Deploys a dedicated multi-threaded hotfix and earns a 48-hour POC extension to verify 250,000 TPS."
        ],
        "skills_assessed": [
            {"skill": "composure", "weight": 0.40},
            {"skill": "active_listening", "weight": 0.30},
            {"skill": "objection_handling", "weight": 0.30}
        ],
        "opening_line": "Your cluster just died on our test queue. Memory leak, unhandled exceptions, zero data throughput. The CTO was watching the dashboard. We are terminating this evaluation.",
        "tags": ["sales", "poc-failure", "crisis", "enterprise-architect", "level-4"],
        "conclusion_signals": {
            "positive": ["Lisa grants a 48-hour re-test window with deployed hotfix", "250k TPS benchmark achieved"],
            "negative": ["POC terminated with public failure", "Account blacklisted across the enterprise"]
        }
    },

    # LEVEL 5: CRISIS / EXECUTIVE
    {
        "slug": "sales-21-fortune-50-cpo-master-services-agreement",
        "track": "sales",
        "title": "Closing a Global Multi-Million MSA with a Fortune 50 CPO",
        "topic": "negotiation",
        "difficulty": 5,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Enterprise Master Negotiation", "Tone & Confidence", "Contract Law"],
        "tactical_coaching_clue": "At the Fortune 50 CPO level, you are negotiating governance, macro-indemnity, and long-term risk parity. Maintain absolute peer-level executive posture.",
        "brief": "You are in the final 3-day round of negotiations for an 8-figure ($12.5M over 5 years) Master Services Agreement with Fortune 50 Chief Procurement Officer Reginald Sterling. Reginald uses psychological pressure, calculated walkouts, and multi-layered concession traps. Close the agreement while protecting margin and IP.",
        "persona": {
            "name": "Reginald Sterling",
            "role": "Chief Procurement Officer, Global 50",
            "personality": ["master negotiator", "ruthless", "aristocratic", "formidable"],
            "communication_style": "Smooth, deliberate, uses long pauses, questions every fundamental cost assumption.",
            "emotional_baseline": "steely",
        },
        "hidden_motivations": [
            "Reginald wants to report this deal as his crowning achievement to the CEO before his retirement.",
            "He has zero backup vendor that can meet their sovereign security compliance."
        ],
        "objections": [
            "We represent 12% of your entire annual revenue; you will accept our standard Master Terms or find another client.",
            "We require source code escrow and perpetual royalty-free derivative IP rights."
        ],
        "curveballs": [
            {"trigger": "if trainee yields on proprietary source code ownership", "event": "Company valuation is crippled and investor board blocks the contract."}
        ],
        "success_criteria": [
            "Maintains unflinching peer-level gravitas with one of the world's toughest procurement officers.",
            "Firmly protects proprietary core IP while offering structured escrow release triggers.",
            "Finalizes a $12M 5-year MSA with protected margins and clear mutual governance."
        ],
        "skills_assessed": [
            {"skill": "negotiation", "weight": 0.40},
            {"skill": "tone_confidence", "weight": 0.35},
            {"skill": "composure", "weight": 0.25}
        ],
        "opening_line": "Welcome to my office. Let's understand each other: my company spends $4 billion annually on technology. I have broken bigger vendors than you before lunch. Let's see if your contract terms are realistic.",
        "tags": ["sales", "crisis", "fortune-50", "master-services-agreement", "level-5"],
        "conclusion_signals": {
            "positive": ["Reginald smiles, shakes hands, and signs the $12M Master Services Agreement", "Landmark enterprise victory"],
            "negative": ["Negotiations collapse in hostile stalemate", "Critical IP conceded away"]
        }
    },
    {
        "slug": "sales-22-unionized-workplace-tech-replacement",
        "track": "sales",
        "title": "Hostile Vendor Replacement in a Unionized Enterprise",
        "topic": "conflict_navigation",
        "difficulty": 5,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Political Acumen", "Change Management", "Empathy"],
        "tactical_coaching_clue": "In union environments, automated software is viewed as a strike-breaking weapon. Position the tool as an ergonomic worker protection device that eliminates dangerous physical strain.",
        "brief": "You are selling automated fleet tracking software to a national transit authority. Union Steward Frank O'Connor has threatened an immediate wildcat strike if the software is installed, claiming it is punitive electronic surveillance. Win Frank's buy-in and restructure the rollout.",
        "persona": {
            "name": "Frank O'Connor",
            "role": "Chief Union Steward & Transit Lead",
            "personality": ["militant", "protective", "suspicious", "fiercely loyal to workers"],
            "communication_style": "Gruff, booming voice, talks over suits, appeals to worker solidarity and strike history.",
            "emotional_baseline": "hostile",
        },
        "hidden_motivations": [
            "Frank is terrified that biometric telematics will be used to fire senior drivers 2 years before pension vesting.",
            "He will support safety tracking if data cannot be used for disciplinary actions without union presence."
        ],
        "objections": [
            "This isn't 'fleet optimization', this is 24/7 digital surveillance of working men and women.",
            "If one black box goes in these buses, the union walks out on Monday morning."
        ],
        "curveballs": [
            {"trigger": "if trainee threatens to report Frank to transit management", "event": "Frank calls a strike vote on the spot."}
        ],
        "success_criteria": [
            "Listens patiently to Frank's legitimate fears regarding pension protection and punitive surveillance.",
            "Structures a joint Union-Management Data Privacy Charter with anonymized driver logs.",
            "Secures Frank's agreement to a driver safety pilot."
        ],
        "skills_assessed": [
            {"skill": "conflict_navigation", "weight": 0.40},
            {"skill": "empathy", "weight": 0.30},
            {"skill": "composure", "weight": 0.30}
        ],
        "opening_line": "I don't care how many management executives you had dinner with. You bring electronic spy boxes into my members' cabs, and this city does not move an inch on Monday.",
        "tags": ["sales", "crisis", "labor-unions", "change-management", "level-5"],
        "conclusion_signals": {
            "positive": ["Frank signs the Joint Driver Safety & Privacy Charter", "Union endorses pilot rollout"],
            "negative": ["Transit system paralyzed by wildcat strike", "Vendor contract terminated by city mayor"]
        }
    },
    {
        "slug": "sales-23-board-tender-defense-grill-session",
        "track": "sales",
        "title": "Surviving an Executive Board Committee Grill Session",
        "topic": "tone_confidence",
        "difficulty": 5,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Board Presence", "Rapid Q&A Defense", "Tone & Confidence"],
        "tactical_coaching_clue": "In front of the Board of Directors, never give a 3-minute winding answer. Use the headline-first principle: direct answer in 5 seconds, followed by 2 proof points.",
        "brief": "You have 15 minutes before the full Board of Directors of an international health conglomerate to defend your $8M digital pathology platform against aggressive interrogation from Audit Committee Chair Arthur Vance. Survive the grilling and secure the board vote.",
        "persona": {
            "name": "Arthur Vance",
            "role": "Audit Committee Chair & Board Member",
            "personality": ["incisive", "impatient", "distrustful of tech hype", "analytical"],
            "communication_style": "Fires rapid questions, cuts off rambling, demands exact regulatory citations.",
            "emotional_baseline": "skeptical",
        },
        "hidden_motivations": [
            "Arthur was burned by an FDA compliance failure at another portfolio company.",
            "He wants to see if you crack under cross-examination before entrusting patient data to your systems."
        ],
        "objections": [
            "If your computer-vision model makes one false-negative cancer diagnosis, our legal liability is catastrophic.",
            "Why shouldn't we stay with manual multi-pathologist reviews?"
        ],
        "curveballs": [
            {"trigger": "if trainee dodges the liability question with marketing hype", "event": "Arthur immediately asks the board to vote against the tender."}
        ],
        "success_criteria": [
            "Delivers crisp, direct, headline-first responses without filler words.",
            "Cites verified clinical trial accuracy (99.8%) and FDA 510(k) clearance protocols.",
            "Wins unanimous Board approval for the tender award."
        ],
        "skills_assessed": [
            {"skill": "tone_confidence", "weight": 0.40},
            {"skill": "value_articulation", "weight": 0.35},
            {"skill": "composure", "weight": 0.25}
        ],
        "opening_line": "You have twelve minutes left on the clock. Our audit committee has one overriding question: when your algorithm misclassifies a tumor biopsy, who goes to prison—you or us?",
        "tags": ["sales", "crisis", "board-defense", "executive-presence", "level-5"],
        "conclusion_signals": {
            "positive": ["Board votes unanimously to award the multi-million dollar tender", "Arthur compliments the defense"],
            "negative": ["Tender rejected by Board of Directors", "Trainee dismissed from the boardroom"]
        }
    },
    {
        "slug": "sales-24-renegotiating-under-hostile-merger",
        "track": "sales",
        "title": "Renegotiating Catastrophic Contract Terms Under Hostile Merger",
        "topic": "negotiation",
        "difficulty": 5,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Contract Law", "Multi-Party Bargaining", "Composure"],
        "tactical_coaching_clue": "Under M&A turmoil, new leadership cuts redundant vendors indiscriminately. Prove that your tool is the technical bridge that enables the merged entity to hit synergy targets.",
        "brief": "Your $1.5M enterprise client has just been acquired in a hostile takeover by private equity conglomerate Apex Holdings. Apex M&A Lead Martin Cole calls you to state that all legacy contracts are being unilaterally cancelled under assignment clauses. Save and expand the contract across the combined enterprise.",
        "persona": {
            "name": "Martin Cole",
            "role": "Operating Partner & Head of M&A Integration, Apex Holdings",
            "personality": ["predatory", "transactional", "ruthless", "sharp"],
            "communication_style": "Speaks with brutal efficiency, treats contracts as leverage, calculates everything in EBITDA multiples.",
            "emotional_baseline": "hostile",
        },
        "hidden_motivations": [
            "Martin has promised $50M in immediate operating cost reductions to his investment committee.",
            "Apex owns three other portfolio companies that desperately need the exact data infrastructure your software provides."
        ],
        "objections": [
            "We just acquired this company; we have legal assignment rights to walk away from all unfulfilled contracts.",
            "We are standardizing on our global platform; your software is redundant."
        ],
        "curveballs": [
            {"trigger": "if trainee threatens legal breach without commercial leverage", "event": "Martin laughs and says Apex's legal team has $20M for litigation."}
        ],
        "success_criteria": [
            "Demonstrates that cancelling your software will break the core data pipeline needed for the M&A synergy targets.",
            "Proposes expanding the contract across Apex's two sister portfolio companies at high volume margins.",
            "Turns a $1.5M threatened cancellation into a $3.8M multi-entity enterprise deal."
        ],
        "skills_assessed": [
            {"skill": "negotiation", "weight": 0.40},
            {"skill": "value_articulation", "weight": 0.35},
            {"skill": "tone_confidence", "weight": 0.25}
        ],
        "opening_line": "As of 6 AM today, Apex Holdings owns this company. We are reviewing all vendor contracts and exercising our change-of-control termination rights. Why should we keep your software for even one more week?",
        "tags": ["sales", "crisis", "mergers-and-acquisitions", "private-equity", "level-5"],
        "conclusion_signals": {
            "positive": ["Martin expands contract to 3 portfolio companies totaling $3.8M", "M&A crisis turned into enterprise win"],
            "negative": ["Contract cancelled with zero recourse", "Account wiped out in M&A purge"]
        }
    },
    {
        "slug": "sales-25-8-figure-sovereign-cloud-tender",
        "track": "sales",
        "title": "Closing an 8-Figure Government Sovereign Cloud Tender",
        "topic": "value_articulation",
        "difficulty": 5,
        "duration_limit_seconds": 600,
        "turn_limit": 25,
        "target_capabilities": ["Regulatory Compliance", "High-Stakes Diplomacy", "Negotiation"],
        "tactical_coaching_clue": "In sovereign government tenders, national security and cryptographic data sovereignty outweigh price every time. Prove that foreign subpoenas can never access sovereign citizen records.",
        "brief": "You are in the final diplomatic session with Minister of Digital Transformation David Al-Mansoor for a $24M Sovereign National Data Cloud tender. A rival foreign vendor claims your cloud architecture allows US CLOUD Act data access. Defend your sovereign encryption architecture and close the national tender.",
        "persona": {
            "name": "David Al-Mansoor",
            "role": "Minister of Digital Infrastructure & Sovereign Security",
            "personality": ["diplomatic", "deeply patriotic", "immensely sharp", "uncompromising"],
            "communication_style": "Formal, courteous, measured, speaks with sovereign state authority.",
            "emotional_baseline": "guarded",
        },
        "hidden_motivations": [
            "The Minister desperately wants your cutting-edge AI architecture, but his cabinet will fall if data sovereignty is compromised.",
            "He needs guaranteed customer-held hardware encryption keys (HSM) that foreign courts cannot subpoena."
        ],
        "objections": [
            "Your competitor's intelligence dossier claims that under the US CLOUD Act, your government can seize our citizen health records.",
            "We require zero-knowledge cryptographic air-gapping on sovereign territory, with our military holding the root keys."
        ],
        "curveballs": [
            {"trigger": "if trainee suggests storing encryption keys in a foreign cloud KMS", "event": "The Minister terminates negotiations immediately citing national security."}
        ],
        "success_criteria": [
            "Presents verified Hardware Security Module (HSM) zero-knowledge architecture with sovereign-held keys.",
            "Demonstrates complete legal and cryptographic immunity from extraterritorial foreign subpoenas.",
            "Finalizes the 8-figure $24M Sovereign Cloud Accord with ministerial protocol."
        ],
        "skills_assessed": [
            {"skill": "value_articulation", "weight": 0.40},
            {"skill": "tone_confidence", "weight": 0.35},
            {"skill": "composure", "weight": 0.25}
        ],
        "opening_line": "Our state intelligence advisors have submitted their final report on your architecture. The question of national sovereignty is non-negotiable for my government. Prove to me that no foreign court can subpoena our citizens' data.",
        "tags": ["sales", "crisis", "sovereign-cloud", "diplomacy", "government-tender", "level-5"],
        "conclusion_signals": {
            "positive": ["Minister Al-Mansoor formally signs the $24M Sovereign Cloud Accord", "Historic government contract secured"],
            "negative": ["Tender cancelled due to national security concerns", "Rival vendor awarded sovereign contract"]
        }
    }
]

def generate_all():
    base_dir = r"c:\Users\naren\Downloads\Scenario-Training\backend\scenarios"
    lead_dir = os.path.join(base_dir, "leadership")
    sales_dir = os.path.join(base_dir, "sales")
    os.makedirs(lead_dir, exist_ok=True)
    os.makedirs(sales_dir, exist_ok=True)

    print(f"Writing {len(LEADERSHIP_SCENARIOS)} Leadership scenarios...")
    for s in LEADERSHIP_SCENARIOS:
        fname = f"{s['slug']}.yaml"
        fpath = os.path.join(lead_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            yaml.dump(s, f, sort_keys=False, allow_unicode=True, width=100)
        print(f"  [+] {fname} (Difficulty: {s['difficulty']})")

    print(f"\nWriting {len(SALES_SCENARIOS)} Sales scenarios...")
    for s in SALES_SCENARIOS:
        fname = f"{s['slug']}.yaml"
        fpath = os.path.join(sales_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            yaml.dump(s, f, sort_keys=False, allow_unicode=True, width=100)
        print(f"  [+] {fname} (Difficulty: {s['difficulty']})")

    print("\n[SUCCESS] Generated all 50 scenarios cleanly!")

if __name__ == "__main__":
    generate_all()
