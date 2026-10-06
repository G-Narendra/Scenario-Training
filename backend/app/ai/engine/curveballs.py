import re
from typing import Any, Dict, List, Optional, Tuple


class CurveballManager:
    """Evaluates curveball conditions each turn and formulates private director notes."""

    @staticmethod
    def evaluate(
        curveball_definitions: List[Dict[str, Any]],
        current_turn: int,
        fired_curveballs: List[str],
        last_trainee_message: str,
        transcript_history: List[Dict[str, str]],
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Check if any curveball should be triggered.
        Returns (director_note, triggered_curveball_id_or_event) or (None, None).
        """
        msg_lower = last_trainee_message.lower()

        for cb in curveball_definitions:
            trigger_text = cb.get("trigger", "").strip()
            event_text = cb.get("event", "").strip()
            cb_id = f"{trigger_text}::{event_text}"

            if cb_id in fired_curveballs:
                continue

            trigger_lower = trigger_text.lower()
            triggered = False

            # 1. Turn number check (e.g. "turn 4", "after turn 5", "at turn 3")
            turn_match = re.search(r"turn\s*(\d+)", trigger_lower)
            if turn_match:
                target_turn = int(turn_match.group(1))
                if "after" in trigger_lower and current_turn > target_turn:
                    triggered = True
                elif current_turn >= target_turn:
                    triggered = True

            # 2. Trainee discount behavior
            if "discount" in trigger_lower:
                if any(
                    w in msg_lower
                    for w in ["discount", "drop price", "price reduction", "percent off", "cheaper"]
                ):
                    triggered = True

            # 3. Trainee vague / pitchy behavior
            if "without asking" in trigger_lower or "no question" in trigger_lower:
                if not any(q in msg_lower for q in ["?", "what", "how", "why", "who", "tell me"]):
                    if current_turn >= 3:
                        triggered = True

            # 4. Aggressive pushback or hurry
            if "push" in trigger_lower or "hurry" in trigger_lower or "time" in trigger_lower:
                if current_turn >= 5:
                    triggered = True

            if triggered:
                director_note = (
                    f"CURVEBALL TRIGGERED: {event_text}. "
                    f"Seamlessly weave this sudden dynamic or shift into your character's reaction right now."
                )
                return director_note, cb_id

        return None, None
