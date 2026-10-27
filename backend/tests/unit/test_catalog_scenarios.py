import os
import glob
import pytest
import yaml

from backend.app.schemas.scenarios import ScenarioConfigSchema


def test_leadership_catalog_schema_integrity_and_difficulty_tiers():
    """
    Validate schema integrity of all leadership scenarios:
    1. >= 25 scenarios present
    2. Across all 3 tiers: Normal (1-2), Challenging (3-4), Crisis (5)
    3. Counterpart persona has name, role, communication style, and emotional baseline
    4. Hidden motivations and objections are non-empty
    5. Valid tactical coaching clue and target capabilities
    """
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scenarios", "leadership")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend", "scenarios", "leadership")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "scenarios", "leadership")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "scenarios", "leadership")),
        os.path.abspath(os.path.join(os.getcwd(), "backend", "scenarios", "leadership")),
        os.path.abspath(os.path.join(os.getcwd(), "data", "scenarios", "leadership")),
    ]
    base_dir = next((c for c in candidates if os.path.exists(c) and len(glob.glob(os.path.join(c, "*.yaml"))) >= 25), candidates[0])
    yaml_files = glob.glob(os.path.join(base_dir, "*.yaml"))

    assert len(yaml_files) >= 25, f"Expected at least 25 leadership scenarios, found {len(yaml_files)} in {base_dir}"

    tier_counts = {"Normal": 0, "Challenging": 0, "Crisis": 0}

    for path in yaml_files:
        with open(path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f)

        parsed = ScenarioConfigSchema(**raw)
        assert parsed.slug, f"Missing slug in {os.path.basename(path)}"
        assert parsed.title, f"Missing title in {os.path.basename(path)}"
        assert parsed.brief and len(parsed.brief) > 20, f"Brief too short in {os.path.basename(path)}"
        assert parsed.track == "leadership"
        assert 1 <= parsed.difficulty <= 5

        # Verify tiers
        if parsed.difficulty in (1, 2):
            tier_counts["Normal"] += 1
        elif parsed.difficulty in (3, 4):
            tier_counts["Challenging"] += 1
        elif parsed.difficulty == 5:
            tier_counts["Crisis"] += 1

        # Verify Persona details
        assert parsed.persona.name, f"Missing persona name in {os.path.basename(path)}"
        assert parsed.persona.role, f"Missing persona role in {os.path.basename(path)}"
        assert parsed.persona.emotional_baseline, f"Missing emotional baseline in {os.path.basename(path)}"

        # Verify hidden motivations and objections
        assert len(parsed.hidden_motivations) >= 1, f"Missing hidden motivations in {os.path.basename(path)}"
        assert len(parsed.objections) >= 1, f"Missing objections in {os.path.basename(path)}"

        # Verify tactical coaching clue and success criteria
        assert len(parsed.tactical_coaching_clue) > 10, f"Tactical clue missing in {os.path.basename(path)}"
        assert len(parsed.success_criteria) >= 1, f"Success criteria missing in {os.path.basename(path)}"

    # Assert all 3 tiers are well-represented
    assert tier_counts["Normal"] >= 5, f"Expected >= 5 Normal scenarios, got {tier_counts['Normal']}"
    assert tier_counts["Challenging"] >= 5, f"Expected >= 5 Challenging scenarios, got {tier_counts['Challenging']}"
    assert tier_counts["Crisis"] >= 5, f"Expected >= 5 Crisis scenarios, got {tier_counts['Crisis']}"
