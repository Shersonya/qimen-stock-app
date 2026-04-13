from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def strength_score(stock: Dict[str, float | None]) -> Dict[str, object]:
    volume_ratio = stock.get("volume_ratio")
    speed_10m = stock.get("speed_10m")
    drive_ratio = stock.get("drive_ratio")
    seal_ratio = stock.get("seal_ratio")
    breakout_freq = stock.get("breakout_freq")

    normalized = {
        "volumeRatio": _clamp(((volume_ratio or 0.0) - 1.0) / 2.0) if volume_ratio else 0.0,
        "speed10m": _clamp((speed_10m or 0.0) / 0.08) if speed_10m else 0.0,
        "driveRatio": _clamp((drive_ratio or 0.0) / 2.0) if drive_ratio else 0.0,
        "sealRatio": _clamp((seal_ratio or 0.0) / 0.12) if seal_ratio else 0.0,
        "breakoutFreq": _clamp((breakout_freq or 0.0) / 5.0) if breakout_freq else 0.0,
    }

    score = (
        normalized["volumeRatio"] * 30
        + normalized["speed10m"] * 30
        + normalized["driveRatio"] * 25
        + normalized["sealRatio"] * 10
        + normalized["breakoutFreq"] * 5
    )

    missing = [key for key, value in {
        "volumeRatio": volume_ratio,
        "speed10m": speed_10m,
        "driveRatio": drive_ratio,
        "sealRatio": seal_ratio,
        "breakoutFreq": breakout_freq,
    }.items() if value is None]

    confidence = max(0.2, 1 - len(missing) * 0.18)

    return {
        "score": round(score, 2),
        "missingFactors": missing,
        "confidence": round(confidence, 2),
        "normalized": normalized,
    }


def position_allocation(
    new_strength: float,
    old_strength: float,
    top_strength: float,
) -> Tuple[int, int, int]:
    if new_strength >= 90:
        return (50, 30, 20)
    if new_strength < 90 and old_strength >= 85:
        return (30, 50, 20)
    if new_strength < 80 and old_strength < 80 and top_strength >= 95:
        return (0, 0, 100)
    return (0, 0, 0)


@dataclass
class TrendSwitchInput:
    new_theme_first_boards: int
    new_theme_avg_strength: float
    old_leader_strength: float
    old_leader_weak_days: int
    theme_turnover_growth_pct: float
    top_strength: float


def trend_switch_detector(payload: TrendSwitchInput) -> str:
    if (
        payload.new_theme_first_boards >= 3
        and payload.new_theme_avg_strength > 80
        and payload.old_leader_strength < 70
        and payload.old_leader_weak_days >= 2
        and payload.theme_turnover_growth_pct > 300
    ):
        return "SWITCH_OLD"
    if payload.new_theme_first_boards >= 3 and payload.new_theme_avg_strength > 80:
        return "HOLD_NEW"
    if payload.new_theme_avg_strength < 80 and payload.old_leader_strength < 80 and payload.top_strength >= 95:
        return "TOP_ONLY"
    return "STAY"
