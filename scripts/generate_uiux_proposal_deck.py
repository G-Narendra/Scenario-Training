"""
3H Solutions Executive Scenario Training
Apple-Tier UI/UX Transformation Proposal Deck Generator
Generates a 16:9 executive presentation deck for client review and sign-off.
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def build_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Colors
    NAVY = RGBColor(11, 25, 44)       # #0B192C
    STEEL_NAVY = RGBColor(30, 62, 98) # #1E3E62
    ORANGE = RGBColor(255, 101, 0)    # #FF6500
    WHITE = RGBColor(255, 255, 255)
    OFF_WHITE = RGBColor(248, 250, 252) # #F8FAFC
    CARD_BG = RGBColor(255, 255, 255)
    TEXT_DARK = RGBColor(15, 23, 42)  # #0F172A
    TEXT_MUTED = RGBColor(100, 116, 139) # #64748B
    BORDER_LIGHT = RGBColor(226, 232, 240)
    EMERALD = RGBColor(5, 150, 105)

    def add_header(slide, title_text, category="3H SOLUTIONS · APPLE-TIER UI/UX PROPOSAL", is_dark=False):
        tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(1.2))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        
        p0 = tf.paragraphs[0]
        p0.text = category.upper()
        p0.font.size = Pt(10)
        p0.font.bold = True
        p0.font.color.rgb = ORANGE if is_dark else STEEL_NAVY

        p1 = tf.add_paragraph()
        p1.text = title_text
        p1.font.size = Pt(24)
        p1.font.bold = True
        p1.font.color.rgb = WHITE if is_dark else TEXT_DARK
        p1.space_before = Pt(4)

    def create_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=BORDER_LIGHT):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1.5)
        return shape

    # =========================================================================
    # SLIDE 1: Title Slide (Dark Apple Minimalist)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = NAVY
    bg1.line.fill.background()

    tb1 = s1.shapes.add_textbox(Inches(1.0), Inches(2.0), Inches(11.3), Inches(3.5))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    
    p = tf1.paragraphs[0]
    p.text = "3H SOLUTIONS GROUP · EXECUTIVE LEARNING"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ORANGE

    p = tf1.add_paragraph()
    p.text = "Reimagining the Platform Experience"
    p.font.size = Pt(40)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.space_before = Pt(10)

    p = tf1.add_paragraph()
    p.text = "An Apple-Inspired Design Architecture for Senior Executive Deliberate Practice"
    p.font.size = Pt(20)
    p.font.color.rgb = RGBColor(203, 213, 225)
    p.space_before = Pt(12)

    p = tf1.add_paragraph()
    p.text = "A transformation from a raw utilitarian login screen to a premier, world-class corporate academy."
    p.font.size = Pt(14)
    p.font.color.rgb = TEXT_MUTED
    p.space_before = Pt(24)

    # =========================================================================
    # SLIDE 2: The Core Problem (The "Lonely Login" Trap)
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header(s2, "The Diagnosis: Why the Current UX Falls Short", "AUDIT & FIRST-PRINCIPLES ANALYSIS")

    # Card 1: The Problem
    create_card(s2, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0))
    tb = s2.shapes.add_textbox(Inches(1.1), Inches(2.1), Inches(5.0), Inches(4.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "CRITICAL GAP: THE 'LONELY LOGIN' TRAP"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = RGBColor(225, 29, 72)
    
    p = tf.add_paragraph()
    p.text = "Current State: Direct Entry to a Form"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    p.space_before = Pt(8)

    points = [
        "Empty Initial Experience: Visitors are dropped directly into a bare login box with zero context on what 3H Solutions is.",
        "Zero Institutional Gravitas: Does not look like a prestigious leadership academy (Stanford, McKinsey Academy, Apple Education).",
        "Ego Friction for Senior Leaders: Managing Directors and VPs don't know what they are about to experience before typing credentials.",
        "Disconnected Brand: No showcase of Uzair's 3H framework (Head, Heart, Hands) or the 60 core competencies."
    ]
    for pt in points:
        p = tf.add_paragraph()
        p.text = "• " + pt
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(10)

    # Card 2: The Benchmark
    create_card(s2, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0), bg_color=RGBColor(240, 253, 244), border_color=RGBColor(187, 247, 208))
    tb = s2.shapes.add_textbox(Inches(7.1), Inches(2.1), Inches(5.0), Inches(4.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "BENCHMARK STANDARD: APPLE & GOOGLE LEARNING"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = EMERALD

    p = tf.add_paragraph()
    p.text = "World-Class Platforms Build Trust First"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    p.space_before = Pt(8)

    benchmarks = [
        "Inspiring Public Front Door: A breathtaking home page that articulates the methodology and pedagogy upfront.",
        "Subtle, Non-Intrusive Auth: A sleek 'Cohort Sign In' button in the navigation bar opening a focused modal overlay.",
        "Visualizing Value Before Login: Showcases real simulation cards, interactive preview teasers, and the 6 leadership pillars.",
        "Respecting Executive Time: Minimalist visual hierarchy, generous whitespace, zero clutter or AI slop."
    ]
    for pt in benchmarks:
        p = tf.add_paragraph()
        p.text = "✓ " + pt
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_DARK
        p.space_before = Pt(10)

    # =========================================================================
    # SLIDE 3: Apple Design Philosophy Applied to 3H Solutions
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_header(s3, "Design Philosophy: If Apple Designed 3H Solutions", "DESIGN SYSTEM TOKENS & CRAFT")

    pillars_design = [
        ("01. Breathtaking Negative Space", "Eradicate cramped, box-heavy interfaces. Content breathes with 80-120px vertical rhythm, creating an aura of executive exclusivity and calm."),
        ("02. Typography as Brand Hierarchy", "Large, authoritative headlines with tight letter spacing (Display 48px/36px). High contrast Slate-900 on pure white surfaces with zero washed-out grays."),
        ("03. Restrained, Bespoke Color Physics", "Solid Corporate Navy (#0B192C) is the dominant surface. Brand Ember (#FF6500) is strictly a micro-indicator (never loud orange blocks)."),
        ("04. Tactile Micro-Interactions", "Smooth, purposeful transitions (150-250ms). Zero erratic bouncing animations, zero decorative fluff—every motion explains a state change.")
    ]

    for i, (head, desc) in enumerate(pillars_design):
        col = i % 2
        row = i // 2
        left = Inches(0.8 + col * 5.9)
        top = Inches(1.8 + row * 2.5)
        create_card(s3, left, top, Inches(5.6), Inches(2.2))
        
        tb = s3.shapes.add_textbox(left + Inches(0.3), top + Inches(0.25), Inches(5.0), Inches(1.7))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = head
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = NAVY

        p = tf.add_paragraph()
        p.text = desc
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(8)

    # =========================================================================
    # SLIDE 4: Architecture & User Journey
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_header(s4, "The New Architecture: End-to-End User Journey", "INFORMATION ARCHITECTURE")

    steps = [
        ("STAGE 1: Public Front Door", "Home Page (3H Brand)", "Hero Section with iPad Simulation Mockup, 3-Step Deliberate Practice Method, and 6 Pillars Showcase."),
        ("STAGE 2: Frictionless Sign In", "Frosted Glass Auth Modal", "Triggered from top navbar. Enters cohort passcode (UZAIR-2026) + delegate name in an elegant modal overlay."),
        ("STAGE 3: Student Workspace", "Practice & Simulations", "25 Scenarios sorted by 3 Difficulty Levels, Seniority profile toggle, and compact List/Grid scanning."),
        ("STAGE 4: Diagnostic Debrief", "1-Page Executive Summary", "Immediate Key Strength + Priority Adjustment + Diagnostic Baseline Index (protecting delegate ego)."),
        ("STAGE 5: Facilitator Console", "Uzair's Command Center", "Full diagnostic dossiers, Multidimensional Spider Graphs (RadarChart), verbatim dialogue, and PDF export.")
    ]

    for i, (phase, title, desc) in enumerate(steps):
        left = Inches(0.8 + i * 2.38)
        top = Inches(2.0)
        card = create_card(s4, left, top, Inches(2.25), Inches(4.7))
        
        tb = s4.shapes.add_textbox(left + Inches(0.15), top + Inches(0.2), Inches(1.95), Inches(4.3))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = f"0{i+1}"
        p.font.size = Pt(20)
        p.font.bold = True
        p.font.color.rgb = ORANGE

        p = tf.add_paragraph()
        p.text = phase
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = STEEL_NAVY
        p.space_before = Pt(4)

        p = tf.add_paragraph()
        p.text = title
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = TEXT_DARK
        p.space_before = Pt(8)

        p = tf.add_paragraph()
        p.text = desc
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(8)

    # =========================================================================
    # SLIDE 5: The Public Home Page Wireframe (Section by Section)
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_header(s5, "Public Landing Page: Section-by-Section Anatomy", "WIREFRAME & CONTENT ARCHITECTURE")

    sections = [
        ("1. Frosted Navigation Bar", "3H Solutions Monogram Logo (links to 3hsolutionsgroup.com) · Curriculum · Methodology · Scenarios · 'Cohort Sign In' Button"),
        ("2. Hero & Value Proposition", "Display Headline: 'Master High-Stakes Leadership Conversations.' Subtitle: 'AI Deliberate Practice for Senior Executives.' Elevated Simulation Mockup."),
        ("3. The 3-Step Practice Method", "01. Choose Scenario (25 curated leadership challenges) → 02. Roleplay (Speech/Text dialogue) → 03. 1-Page Diagnostic Debrief."),
        ("4. The 3H Leadership Framework", "Head, Heart, Hands mapped to the 6 Core Pillars (60 competencies taught by Uzair). Interactive pillar accordion preview."),
        ("5. Live Simulation Interactive Sandbox", "Try 1 public teaser exchange (e.g., Marcus Vance pushing back on lateness) to demonstrate reactive AI dialogue before login."),
        ("6. Enterprise Security & Confidentiality", "Reassuring VPs: 100% confidential private practice. No peer embarrassment. Facilitator locked archive for Uzair's 1-on-1 coaching."),
        ("7. Executive Footer", "Official 3H Solutions credentials, Dubai UAE contact, WhatsApp quick concierge line, privacy policy, and cohort terms.")
    ]

    for i, (title, content) in enumerate(sections):
        top = Inches(1.7 + i * 0.75)
        create_card(s5, Inches(0.8), top, Inches(11.7), Inches(0.68))
        
        tb = s5.shapes.add_textbox(Inches(1.0), top + Inches(0.1), Inches(11.3), Inches(0.5))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = NAVY

        p = tf.add_paragraph()
        p.text = content
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(2)

    # =========================================================================
    # SLIDE 6: Navigation & Authentication Modal
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_header(s6, "Navigation & Frictionless Cohort Authentication", "AUTHENTICATION WORKFLOW")

    # Left: The Navbar
    create_card(s6, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0))
    tb = s6.shapes.add_textbox(Inches(1.1), Inches(2.1), Inches(5.0), Inches(4.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "THE APPLE-INSPIRED BLUR NAVBAR"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = STEEL_NAVY

    p = tf.add_paragraph()
    p.text = "Fixed Top Header (Backdrop Blur 20px)"
    p.font.size = Pt(17)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    p.space_before = Pt(6)

    nav_features = [
        "Left: 3H Solutions official logo with interactive link to 3hsolutionsgroup.com.",
        "Center: Navigation links ('Curriculum', 'Practice Scenarios', 'Methodology', 'Facilitator').",
        "Right: Theme Toggle (Dark/Light) + High-contrast Navy 'Cohort Sign In' CTA button.",
        "Zero Clutter: Clean, translucent frosted glass border separating header from content."
    ]
    for nf in nav_features:
        p = tf.add_paragraph()
        p.text = "• " + nf
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(10)

    # Right: The Sign-In Modal
    create_card(s6, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0))
    tb = s6.shapes.add_textbox(Inches(7.1), Inches(2.1), Inches(5.0), Inches(4.4))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "FOCUSED MODAL OVERLAY (NO PAGE HOPPING)"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = ORANGE

    p = tf.add_paragraph()
    p.text = "Elevated 2-Step Sign In Dialog"
    p.font.size = Pt(17)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    p.space_before = Pt(6)

    modal_features = [
        "Overlay Physics: Subtle darkened backdrop blur focusing 100% of attention on login.",
        "Passcode Field: Formatted uppercase box (e.g. UZAIR-2026) with instant validation.",
        "Enrolled Name: Clean input field matching the cohort roster pre-configured by Uzair.",
        "Auto-Routing Intelligence: Facilitators land instantly in Admin Console; delegates land in their practice curriculum."
    ]
    for mf in modal_features:
        p = tf.add_paragraph()
        p.text = "• " + mf
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(10)

    # =========================================================================
    # SLIDE 7: The Post-Login Student Simulation Workspace
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_header(s7, "Post-Login Workspace: Senior Leader Simulation Environment", "STUDENT DELIBERATE PRACTICE")

    workspace_pillars = [
        ("Sequential Difficulty Catalog", "Filter scenarios by Level 1 (Normal), Level 2 (Challenging), or Level 3 (Crisis). Toggle between Rich Card Grid and Executive 5-Second List View.", Inches(0.8), Inches(1.8)),
        ("Seniority Profile Selector", "One-click filter: 'Senior Executive & C-Suite' (Boardroom, M&A, Layoffs) vs 'Operational Leaders' (Punctuality, Burnout, Feedback).", Inches(6.8), Inches(1.8)),
        ("Solid Corporate Navy Dialogue", "Participant chat bubbles in solid Executive Navy (#0B192C) with pure white text. Counterparts in structured crisp white cards.", Inches(0.8), Inches(4.4)),
        ("Voice-First & Zero Bouncing", "Calm speech-to-text dictation and synthesized vocal responses. Eradicated all bouncing CSS animations for focused executive immersion.", Inches(6.8), Inches(4.4))
    ]

    for title, desc, l, t in workspace_pillars:
        create_card(s7, l, t, Inches(5.6), Inches(2.3))
        tb = s7.shapes.add_textbox(l + Inches(0.3), t + Inches(0.25), Inches(5.0), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = NAVY

        p = tf.add_paragraph()
        p.text = desc
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(8)

    # =========================================================================
    # SLIDE 8: The 1-Page Executive Debrief & Score Framing
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_header(s8, "Performance Debrief: Protecting Executive Ego & Providing Clarity", "EVALUATION & FEEDBACK ARCHITECTURE")

    create_card(s8, Inches(0.8), Inches(1.8), Inches(3.7), Inches(5.0))
    tb = s8.shapes.add_textbox(Inches(1.0), Inches(2.0), Inches(3.3), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "DIAGNOSTIC INDEX"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = STEEL_NAVY

    p = tf.add_paragraph()
    p.text = "Ego-Safe Framing"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    p.space_before = Pt(6)

    p = tf.add_paragraph()
    p.text = "No 'Failed' or 'Practice Required' red badges. Run 1 is framed as 'Diagnostic Baseline Established' in calm slate, setting a baseline benchmark for Run 2."
    p.font.size = Pt(12)
    p.font.color.rgb = TEXT_MUTED
    p.space_before = Pt(10)

    create_card(s8, Inches(4.8), Inches(1.8), Inches(3.7), Inches(5.0))
    tb = s8.shapes.add_textbox(Inches(5.0), Inches(2.0), Inches(3.3), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "MICRO-DEBRIEF"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = EMERALD

    p = tf.add_paragraph()
    p.text = "1 Strength + 1 Fix"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    p.space_before = Pt(6)

    p = tf.add_paragraph()
    p.text = "Delivers immediate instant gratification without cognitive overload: exactly one concrete strength and one priority adjustment with verbatim phrasing."
    p.font.size = Pt(12)
    p.font.color.rgb = TEXT_MUTED
    p.space_before = Pt(10)

    create_card(s8, Inches(8.8), Inches(1.8), Inches(3.7), Inches(5.0))
    tb = s8.shapes.add_textbox(Inches(9.0), Inches(2.0), Inches(3.3), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "FACILITATOR LOCK"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = ORANGE

    p = tf.add_paragraph()
    p.text = "Archived for Uzair"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = TEXT_DARK
    p.space_before = Pt(6)

    p = tf.add_paragraph()
    p.text = "Informs delegates that detailed transcripts and radar spider graphs are reserved for Uzair's 1-on-1 debrief. Prevents Uzair from sitting idly during live classes."
    p.font.size = Pt(12)
    p.font.color.rgb = TEXT_MUTED
    p.space_before = Pt(10)

    # =========================================================================
    # SLIDE 9: Facilitator Command Console (Uzair's Tooling)
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    add_header(s9, "Facilitator Intelligence Console: Lead Coach Oversight", "ADMINISTRATIVE ENGINE")

    features_admin = [
        ("Active Passcode & Quick Whitelist", "Prominent UZAIR-2026 passcode card with 1-click clipboard copy. Single and bulk enrollment (paste 15-20 names) ready in seconds.", Inches(0.8), Inches(1.8)),
        ("Multidimensional Spider Graph", "Native SVG Radar Chart plotting delegate competency benchmarks across all 6 core leadership pillars against the 75% executive threshold.", Inches(6.8), Inches(1.8)),
        ("Verbatim Dialogue Transcripts", "Word-for-word conversation records with coachable moments, giving Uzair definitive evidence so delegates cannot dispute feedback.", Inches(0.8), Inches(4.4)),
        ("One-Click Executive PDF Export", "Download polished cohort rosters and individualized 1-page dossiers with 3H branding, ready to print or email to corporate clients.", Inches(6.8), Inches(4.4))
    ]

    for title, desc, l, t in features_admin:
        create_card(s9, l, t, Inches(5.6), Inches(2.3))
        tb = s9.shapes.add_textbox(l + Inches(0.3), t + Inches(0.25), Inches(5.0), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = NAVY

        p = tf.add_paragraph()
        p.text = desc
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_before = Pt(8)

    # =========================================================================
    # SLIDE 10: Implementation Roadmap & Approval Checklist
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    bg10 = s10.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg10.fill.solid()
    bg10.fill.fore_color.rgb = NAVY
    bg10.line.fill.background()

    add_header(s10, "Implementation Plan & Approval Gate", "NEXT STEPS & ROADMAP", is_dark=True)

    roadmap_steps = [
        ("PHASE 1: Landing Page Build", "Engineer the public 3H Solutions Home Page: Hero section with iPad simulation preview, 3-step practice method, 6 leadership pillars, and customer proof.", Inches(0.8)),
        ("PHASE 2: Frosted Glass Navbar & Modal", "Implement the Apple-inspired fixed blur navbar and frictionless 'Cohort Sign In' modal with passcode + name input, retiring the raw login page.", Inches(4.8)),
        ("PHASE 3: Seamless Integration & Verification", "Connect landing page seamlessly to the existing 25 simulation scenarios, student assessment engine, and Uzair's Facilitator Console. Run full audit.", Inches(8.8))
    ]

    for title, desc, l in roadmap_steps:
        card = create_card(s10, l, Inches(2.2), Inches(3.7), Inches(4.2), bg_color=STEEL_NAVY, border_color=RGBColor(45, 91, 141))
        tb = s10.shapes.add_textbox(l + Inches(0.25), Inches(2.5), Inches(3.2), Inches(3.6))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = WHITE

        p = tf.add_paragraph()
        p.text = desc
        p.font.size = Pt(12)
        p.font.color.rgb = RGBColor(203, 213, 225)
        p.space_before = Pt(12)

    output_dir = "outputs"
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, "3H_Solutions_Apple_Tier_UI_UX_Proposal.pptx")
    prs.save(out_path)
    print(f"Presentation deck saved to: {out_path}")
    return out_path

if __name__ == "__main__":
    build_presentation()
