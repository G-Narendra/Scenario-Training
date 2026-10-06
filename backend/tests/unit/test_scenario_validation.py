import pytest
from fastapi import HTTPException

from backend.app.services.scenario_service import ScenarioService

VALID_YAML = """
slug: test-valid-scenario
track: sales
title: "Valid Test Scenario"
topic: objection_handling
difficulty: 3
duration_limit_seconds: 600
turn_limit: 25
brief: "This is a detailed brief for testing purposes."
persona:
  name: "Alex Vance"
  role: "Procurement Manager"
  personality: ["skeptical", "pragmatic"]
  communication_style: "Direct and demanding data."
  emotional_baseline: "guarded"
hidden_motivations:
  - "Needs to satisfy CFO cost mandates."
objections:
  - "Competitor is 15% cheaper."
curveballs:
  - trigger: "after turn 3"
    event: "States meeting must end early."
success_criteria:
  - "Uncover CFO cost target."
skills_assessed:
  - {skill: objection_handling, weight: 0.6}
  - {skill: value_articulation, weight: 0.4}
opening_line: "Hello, what do you have for me today?"
tags: [test, sales]
conclusion_signals:
  positive: ["Agrees to demo"]
  negative: ["Walks away"]
"""


def test_valid_scenario_validation():
    schema = ScenarioService.parse_and_validate_yaml(VALID_YAML)
    assert schema.slug == "test-valid-scenario"
    assert schema.difficulty == 3
    assert len(schema.skills_assessed) == 2


def test_invalid_yaml_syntax():
    with pytest.raises(HTTPException) as exc:
        ScenarioService.parse_and_validate_yaml("slug: test: invalid: [unclosed")
    assert exc.value.status_code == 400


def test_non_mapping_yaml():
    with pytest.raises(HTTPException) as exc:
        ScenarioService.parse_and_validate_yaml("- item 1\n- item 2")
    assert exc.value.status_code == 400


def test_invalid_difficulty_too_high():
    bad_yaml = VALID_YAML.replace("difficulty: 3", "difficulty: 6")
    with pytest.raises(HTTPException) as exc:
        ScenarioService.parse_and_validate_yaml(bad_yaml)
    assert exc.value.status_code == 422


def test_invalid_difficulty_too_low():
    bad_yaml = VALID_YAML.replace("difficulty: 3", "difficulty: 0")
    with pytest.raises(HTTPException) as exc:
        ScenarioService.parse_and_validate_yaml(bad_yaml)
    assert exc.value.status_code == 422


def test_invalid_weights_sum_greater_than_one():
    bad_yaml = VALID_YAML.replace("weight: 0.4", "weight: 0.9")
    with pytest.raises(HTTPException) as exc:
        ScenarioService.parse_and_validate_yaml(bad_yaml)
    assert exc.value.status_code == 422
    assert "weights must equal 1.0" in exc.value.detail


def test_invalid_weights_sum_less_than_one():
    bad_yaml = VALID_YAML.replace("weight: 0.4", "weight: 0.1")
    with pytest.raises(HTTPException) as exc:
        ScenarioService.parse_and_validate_yaml(bad_yaml)
    assert exc.value.status_code == 422
    assert "weights must equal 1.0" in exc.value.detail


def test_missing_hidden_motivations():
    bad_yaml = VALID_YAML.replace(
        'hidden_motivations:\n  - "Needs to satisfy CFO cost mandates."', "hidden_motivations: []"
    )
    with pytest.raises(HTTPException) as exc:
        ScenarioService.parse_and_validate_yaml(bad_yaml)
    assert exc.value.status_code == 422


def test_missing_objections():
    bad_yaml = VALID_YAML.replace('objections:\n  - "Competitor is 15% cheaper."', "objections: []")
    with pytest.raises(HTTPException) as exc:
        ScenarioService.parse_and_validate_yaml(bad_yaml)
    assert exc.value.status_code == 422


def test_missing_success_criteria():
    bad_yaml = VALID_YAML.replace(
        'success_criteria:\n  - "Uncover CFO cost target."', "success_criteria: []"
    )
    with pytest.raises(HTTPException) as exc:
        ScenarioService.parse_and_validate_yaml(bad_yaml)
    assert exc.value.status_code == 422


def test_missing_persona_name():
    bad_yaml = VALID_YAML.replace('name: "Alex Vance"', 'name: ""')
    with pytest.raises(HTTPException) as exc:
        ScenarioService.parse_and_validate_yaml(bad_yaml)
    assert exc.value.status_code == 422


def test_short_brief():
    bad_yaml = VALID_YAML.replace(
        'brief: "This is a detailed brief for testing purposes."', 'brief: "Too short"'
    )
    with pytest.raises(HTTPException) as exc:
        ScenarioService.parse_and_validate_yaml(bad_yaml)
    assert exc.value.status_code == 422


def test_ai_draft_generator():
    draft = ScenarioService.generate_ai_draft(topic="executive renewal", track="sales")
    assert draft.track == "sales"
    assert "draft-sales" in draft.slug
    assert sum(s.weight for s in draft.skills_assessed) == 1.0
