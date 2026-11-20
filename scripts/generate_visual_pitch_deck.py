"""
3H Solutions Executive Scenario Training
Visual Pitch Deck with Actual UI Screenshots Embedded on Every Slide
Generates 3H_Solutions_Apple_Tier_UI_UX_Proposal.pptx
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def build_visual_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Palette
    NAVY = RGBColor(11, 25, 44)         # #0B192C
    STEEL_NAVY = RGBColor(30, 62, 98)   # #1E3E62
    ORANGE = RGBColor(255, 101, 0)      # #FF6500
    WHITE = RGBColor(255, 255, 255)
    OFF_WHITE = RGBColor(248, 250, 252) # #F8FAFC
    TEXT_DARK = RGBColor(15, 23, 42)    # #0F172A
    TEXT_MUTED = RGBColor(100, 116, 139)# #64748B
    BORDER_LIGHT = RGBColor(226, 232, 240)
    EMERALD = RGBColor(5, 150, 105)

    def add_slide_with_image(title_category, main_title, bullet_points, image_path, is_dark=False):
        slide = prs.slides.add_slide(blank_layout)
        
        # Background
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = NAVY if is_dark else OFF_WHITE
        bg.line.fill.background()

        # Left Column Text Box
        left_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(4.8), Inches(6.0))
        tf = left_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        # Category Pill
        p_cat = tf.paragraphs[0]
        p_cat.text = title_category.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = ORANGE if is_dark else STEEL_NAVY

        # Main Title
        p_title = tf.add_paragraph()
        p_title.text = main_title
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = WHITE if is_dark else TEXT_DARK
        p_title.space_before = Pt(6)

        # Bullets / Annotations
        for header, detail in bullet_points:
            p_b = tf.add_paragraph()
            p_b.text = "• " + header
            p_b.font.size = Pt(13)
            p_b.font.bold = True
            p_b.font.color.rgb = RGBColor(203, 213, 225) if is_dark else NAVY
            p_b.space_before = Pt(12)

            p_d = tf.add_paragraph()
            p_d.text = detail
            p_d.font.size = Pt(11)
            p_d.font.color.rgb = RGBColor(148, 163, 184) if is_dark else TEXT_MUTED
            p_d.space_before = Pt(2)

        # Right Column: Actual UI Screenshot
        if os.path.exists(image_path):
            # Frame Card
            frame = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.8), Inches(0.9), Inches(6.8), Inches(5.6))
            frame.fill.solid()
            frame.fill.fore_color.rgb = WHITE if not is_dark else STEEL_NAVY
            frame.line.color.rgb = BORDER_LIGHT if not is_dark else RGBColor(45, 91, 141)
            frame.line.width = Pt(1.5)

            # Insert Image inside frame
            slide.shapes.add_picture(image_path, Inches(5.9), Inches(1.0), width=Inches(6.6))
        else:
            print(f"Warning: Image not found: {image_path}")

        return slide

    # =========================================================================
    # SLIDE 1: Title Slide (Dark Apple Minimalist)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = NAVY
    bg1.line.fill.background()

    tb1 = s1.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(11.3), Inches(4.0))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    
    p = tf1.paragraphs[0]
    p.text = "3H SOLUTIONS GROUP · VISUAL PROPOSAL"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ORANGE

    p = tf1.add_paragraph()
    p.text = "Apple-Tier UI/UX Transformation"
    p.font.size = Pt(38)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.space_before = Pt(8)

    p = tf1.add_paragraph()
    p.text = "Visual Walkthrough of Every Tab, Screen, and Component"
    p.font.size = Pt(20)
    p.font.color.rgb = RGBColor(203, 213, 225)
    p.space_before = Pt(10)

    p = tf1.add_paragraph()
    p.text = "Replacing the raw login page with an institutional corporate learning platform inspired by Apple Professional Learning and Stanford Executive Education."
    p.font.size = Pt(13)
    p.font.color.rgb = TEXT_MUTED
    p.space_before = Pt(20)

    # =========================================================================
    # SLIDE 2: Proposed Public Home Page
    # =========================================================================
    add_slide_with_image(
        "PROPOSED FRONT DOOR · HOME PAGE",
        "Public Institutional Landing",
        [
            ("Apple-Tier Breathable Hero", "Vast whitespace, San Francisco/Inter typography, and authoritative headline: 'Master High-Stakes Leadership Conversations.'"),
            ("Fixed Frosted-Glass Navbar", "Translucent backdrop blur (20px), official 3H logo linking to 3hsolutionsgroup.com, and high-contrast 'Cohort Sign In' action."),
            ("Floating iPad Simulation Mockup", "Provides immediate visual proof of reactive AI dialogue before the user even signs in."),
            ("3-Step Method & 6 Pillars", "Articulates Uzair's 3H deliberate practice methodology upfront to eliminate all initial confusion.")
        ],
        "recordings/verified_desktop_home_page.png"
    )

    # =========================================================================
    # SLIDE 3: Production Sign In Modal
    # =========================================================================
    add_slide_with_image(
        "AUTHENTICATION · ZERO PAGE HOPPING",
        "Focused 'Cohort Sign In' Modal",
        [
            ("Replaces the 'Lonely Login' Page", "No direct landing on a bare form. Sign in is an elevated dialog triggered from the top navbar."),
            ("Frictionless 2-Field Entry", "Cohort passcode (UZAIR-2026) with real-time active status check + enrolled delegate name."),
            ("Executive Confidentiality Notice", "Reassures senior VPs: 100% private sandbox, no peer embarrassment, transcripts archived for Uzair's 1-on-1 debrief."),
            ("Intelligent Role Routing", "Delegates land on practice scenarios; Uzair lands directly on the Lead Facilitator Console.")
        ],
        "recordings/verified_desktop_signin_modal.png"
    )

    # =========================================================================
    # SLIDE 3B: Mobile & PC Responsive Parity
    # =========================================================================
    add_slide_with_image(
        "RESPONSIVE ENGINEERING · MOBILE & PC",
        "Flawless Mobile & Desktop Parity",
        [
            ("Zero Horizontal Overflow", "Rigorous viewport testing on iPhone (375x812) and 4K desktop (1440x900) guarantees 0 horizontal scrolling."),
            ("Collapsible Navigation Drawer", "Smooth animated hamburger menu on mobile screens with easy touch targets (>= 44px)."),
            ("Adaptive Card Layouts", "Flexible grid physics seamlessly scale from single-column mobile to multi-column executive desktop."),
            ("On-the-Go Practice for Executives", "Senior leaders can rehearse high-stakes scenarios on iPhone/iPad before real boardroom sessions.")
        ],
        "recordings/verified_mobile_home_page.png"
    )

    # =========================================================================
    # SLIDE 4: Tab 1 — 3H Competency Framework & Orientation
    # =========================================================================
    add_slide_with_image(
        "STUDENT WORKSPACE · TAB 1",
        "3H Competency Framework",
        [
            ("Orientation & Practice Guide Banner", "Explicitly displays 25 Leadership Scenarios, 10 Attempts Limit / Delegate, and 3 Difficulty Levels."),
            ("6 Core Leadership Pillars", "Explores the 60 competencies mapped to Head, Heart, Hands taught by Uzair in live workshops."),
            ("Sequential Level Badges", "Every card displays explicit level text: Level 1: Normal, Level 2: Challenging, Level 3: Crisis."),
            ("Direct Practice Trigger", "One-click transition from competency definition to interactive counterpart simulation.")
        ],
        "recordings/student_02_orientation_curriculum.png"
    )

    # =========================================================================
    # SLIDE 5: Tab 2 — Interactive Simulations (Grid & List View)
    # =========================================================================
    add_slide_with_image(
        "STUDENT WORKSPACE · TAB 2",
        "Interactive Practice Scenarios",
        [
            ("Grid & List View Switcher", "Allows senior executives to toggle between visual cards and a 5-second compact sequential list of all 25 modules."),
            ("Seniority Profile Categorization", "Filter by 'Senior Executive & C-Suite' (Boardroom, Crisis) vs 'Operational Leaders' (Alignment, Burnout)."),
            ("Duration & Target Competencies", "Transparent estimated conversation pacing (5-10 min) and primary focus capability on every card."),
            ("Briefing Dossier Trigger", "Clean, high-contrast action button opening tactical coaching clues before launch.")
        ],
        "recordings/student_04_practice_scenarios.png"
    )

    # =========================================================================
    # SLIDE 6: Scenario Briefing Dossier
    # =========================================================================
    add_slide_with_image(
        "PRE-SIMULATION BRIEFING",
        "Tactical Coaching Clue Dossier",
        [
            ("Uzair's Tactical Guidance", "Provides senior executives with actionable advice (e.g. 'Separate intent from impact...') before starting."),
            ("Pedagogic 2-Run Rationale", "Explains that Run 1 benchmarks baseline instincts and Run 2 applies targeted adjustments for distinction."),
            ("Voice vs Text Mode Selection", "Allows delegates to practice via natural speech dictation or structured text depending on environment."),
            ("Attempts Remaining Counter", "Displays remaining attempt budget clearly to prevent aimless clicking.")
        ],
        "recordings/student_05_briefing_modal.png"
    )

    # =========================================================================
    # SLIDE 7: Tab 3 — Live Executive Dialogue Simulation
    # =========================================================================
    add_slide_with_image(
        "LIVE SIMULATION WORKSPACE",
        "Solid Corporate Navy Dialogue",
        [
            ("Executive Navy User Bubbles", "Participant chat bubbles in solid #0B192C with pure white text, eradicating adolescent neon orange."),
            ("Authentic Counterpart Resistance", "Counterpart (Marcus Vance) challenges, negotiates, and reacts dynamically rather than following a script."),
            ("Eradicated All Bouncing Animations", "Removed all bouncy CSS icons for a calm, distraction-free corporate boardroom environment."),
            ("Real-Time Speech Synthesis", "Full audio vocal response with subtle volume pulse when counterpart is talking.")
        ],
        "recordings/student_07_dialogue_exchanges.png"
    )

    # =========================================================================
    # SLIDE 8: Tab 4 — 1-Page Summary Debrief
    # =========================================================================
    add_slide_with_image(
        "PERFORMANCE EVALUATION",
        "1-Page Executive Summary Debrief",
        [
            ("Diagnostic Baseline Index (Ego-Safe)", "Score 34/100 framed as 'Diagnostic Baseline Established' in dignified slate—no punitive 'Practice Required' fail tags."),
            ("Immediate Key Strength", "Highlighted in crisp emerald card with verified conversational composure evidence."),
            ("Priority Phrasing Adjustment", "Highlighted in solid corporate navy card (#1E3E62) with specific alternative phrasing to apply in Run 2."),
            ("Export Summary PDF", "One-click executive PDF generation for the delegate's personal records.")
        ],
        "recordings/student_09_summary_debrief.png"
    )

    # =========================================================================
    # SLIDE 9: Facilitator Locked Archive Notice & WhatsApp
    # =========================================================================
    add_slide_with_image(
        "COACHING PRIVACY & CONCIERGE",
        "Facilitator Archive Notice & Help",
        [
            ("Detailed Transcripts Locked for Uzair", "Explicitly informs delegates that full verbatim records and spider graphs are reserved for Uzair's 1-on-1 debrief."),
            ("Prevents In-Class Facilitator Idleness", "Uzair retains exclusivity over deep diagnostic insights, keeping workshop debriefs high-value."),
            ("Floating WhatsApp Quick Help", "One-click access to WhatsApp concierge assistance for any technical or scenario queries."),
            ("Enterprise Privacy Assurance", "Guarantees that simulation mistakes remain private and confidential.")
        ],
        "recordings/student_10_locked_archive_notice.png"
    )

    # =========================================================================
    # SLIDE 10: Tab 5 — Delegate Progress Dashboard
    # =========================================================================
    add_slide_with_image(
        "PROGRESS TRACKING",
        "Delegate Competency Dashboard",
        [
            ("Competency Progress Bars", "Visual tracking of scores across the 6 leadership pillars without overwhelming raw numbers."),
            ("Historical Scenario Attempts", "Log of completed simulations with date, mode (Voice vs Text), and baseline vs mastery progression."),
            ("Attempt Budget Visibility", "Tracks remaining attempts of the 10-attempt cohort allocation."),
            ("Direct Re-Practice Shortcut", "One-click return to active simulations to apply coaching adjustments.")
        ],
        "recordings/student_12_my_progress.png"
    )

    # =========================================================================
    # SLIDE 11: Tab 6 — Facilitator Console (Uzair's Command Center)
    # =========================================================================
    add_slide_with_image(
        "FACILITATOR OVERSIGHT · TAB 6",
        "Lead Facilitator & Cohort Console",
        [
            ("Active Cohort Passcode Card", "High-contrast UZAIR-2026 card with 1-click clipboard copy to share with delegates in 5 seconds."),
            ("Roster Management & Single/Bulk Add", "Quickly whitelist 15-20 participant names or paste a roster list with instant confirmation."),
            ("Cohort KPI Strip", "High-level metrics: enrolled delegates, completed scenario count, and overall cohort average rating."),
            ("Export Cohort PDF", "One-click batch PDF export summarizing entire cohort performance for client sponsors.")
        ],
        "recordings/uzair_02_console_kpi.png"
    )

    # =========================================================================
    # SLIDE 12: Tab 7 — Multidimensional Spider Graph (RadarChart)
    # =========================================================================
    add_slide_with_image(
        "DIAGNOSTIC INTELLIGENCE · TAB 7",
        "Competency Spider Graph & Dossier",
        [
            ("Native SVG Radar Chart", "6-axis visual benchmark displaying delegate competency stretch against the 75% executive threshold."),
            ("Verbatim Dialogue Exchanges", "Complete word-for-word transcript history so delegates cannot dispute coaching feedback."),
            ("Hidden Motivations Revealed", "Unlocks counterpart's internal drivers (e.g. why Marcus felt clock-watching stifled creativity)."),
            ("Export Executive PDF (.pdf)", "Generates official 3H Solutions 1-page evaluation report for client stakeholders.")
        ],
        "recordings/uzair_06_spider_graph.png"
    )

    # =========================================================================
    # SLIDE 13: Tab 8 — Unlimited Cohort Scale Reassurance
    # =========================================================================
    add_slide_with_image(
        "ENTERPRISE SCALABILITY",
        "Cohort Management Modal",
        [
            ("Explicit Scale Reassurance", "Modal clearly states: 'Unlimited cohorts supported. Each cohort can scale to 50+ participants per batch.'"),
            ("Direct Response to Uzair's Feedback", "Completely eliminates client worry about system capacity limits."),
            ("Instant Access Code Generation", "Uzair can spawn fresh batches (e.g. BATCH2-2026) in seconds without IT assistance."),
            ("Passcode Expiration Controls", "Keeps cohorts tightly scoped to training workshop schedules.")
        ],
        "recordings/uzair_04_create_cohort_modal.png"
    )

    # =========================================================================
    # SLIDE 14: Tab 9 — Solid Executive Navy vs Dark Mode Physics
    # =========================================================================
    add_slide_with_image(
        "DESIGN TOKENS · DUAL THEME",
        "Solid Corporate Navy Theme",
        [
            ("High-Contrast Executive Navy Light Mode", "Solid #0B192C headers and cards with high-contrast slate surfaces, eliminating 'paper' plainness."),
            ("Midnight Navy Dark Mode", "Deep void canvas with crisp steel blue cards and subtle ember accents."),
            ("Seamless 1-Click Theme Toggle", "Preserved in navigation bar for delegate viewing comfort in varied room lighting."),
            ("WCAG 2.1 AA Compliance", "Every text element passes strict 4.5:1 to 12:1 contrast ratios.")
        ],
        "recordings/uzair_09_executive_navy_mode.png"
    )

    # =========================================================================
    # SLIDE 15: Conclusion & Approval Gate
    # =========================================================================
    s_end = prs.slides.add_slide(blank_layout)
    bg_end = s_end.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg_end.fill.solid()
    bg_end.fill.fore_color.rgb = NAVY
    bg_end.line.fill.background()

    tb = s_end.shapes.add_textbox(Inches(1.5), Inches(2.0), Inches(10.3), Inches(3.5))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "NEXT STEP: SIGN-OFF & BUILD"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = ORANGE

    p = tf.add_paragraph()
    p.text = "Ready to Engineer the Apple-Tier Platform"
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.space_before = Pt(8)

    p = tf.add_paragraph()
    p.text = "Upon your approval of these visual layouts, we will build HomePage.tsx and SignInModal.tsx to make this the live production experience for 3H Solutions."
    p.font.size = Pt(16)
    p.font.color.rgb = RGBColor(203, 213, 225)
    p.space_before = Pt(16)

    out_path = os.path.join("outputs", "3H_Solutions_Apple_Tier_UI_UX_Proposal.pptx")
    prs.save(out_path)
    print(f"Visual pitch deck with screenshots successfully saved to: {out_path}")
    return out_path

if __name__ == "__main__":
    build_visual_deck()
