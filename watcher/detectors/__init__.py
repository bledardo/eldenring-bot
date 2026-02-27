"""Visual detectors for Elden Ring screen analysis."""

from __future__ import annotations


class ConsecutiveConfirmer:
    """Requires N consecutive positive detections before confirming.

    Prevents single-frame false positives by requiring a streak of detections.

    Args:
        required_count: Number of consecutive positive frames needed.
    """

    def __init__(self, required_count: int = 3) -> None:
        self.required = required_count
        self.count = 0

    def update(self, detected: bool) -> bool:
        """Update with a detection result.

        Args:
            detected: Whether the target was detected this frame.

        Returns:
            True if the required consecutive count is met.
        """
        if detected:
            self.count += 1
        else:
            self.count = 0
        return self.count >= self.required

    def reset(self) -> None:
        """Reset the consecutive counter."""
        self.count = 0


from watcher.detectors.health_bar import HealthBarDetector  # noqa: E402
from watcher.detectors.you_died import YouDiedDetector  # noqa: E402
from watcher.detectors.boss_name import BossNameDetector  # noqa: E402
from watcher.detectors.coop import CoopDetector  # noqa: E402
from watcher.detectors.enemy_felled import EnemyFelledDetector  # noqa: E402

__all__ = [
    "ConsecutiveConfirmer",
    "HealthBarDetector",
    "YouDiedDetector",
    "BossNameDetector",
    "CoopDetector",
    "EnemyFelledDetector",
]
