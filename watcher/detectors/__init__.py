"""Visual detectors for Elden Ring screen analysis."""

from __future__ import annotations


class ConsecutiveConfirmer:
    """Requires N consecutive positive detections before confirming.

    Prevents single-frame false positives by requiring a streak of detections.
    Tolerates brief flicker gaps via ``grace_frames``: a single missed frame
    only decrements the counter instead of resetting it to zero.

    Args:
        required_count: Number of consecutive positive frames needed.
        grace_frames: Number of consecutive misses tolerated before full reset.
            With grace_frames=1, a single miss decrements the counter by 1
            but a second consecutive miss resets to 0.
    """

    def __init__(self, required_count: int = 3, grace_frames: int = 0) -> None:
        self.required = required_count
        self.grace_frames = grace_frames
        self.count = 0
        self._miss_streak = 0

    def update(self, detected: bool) -> bool:
        """Update with a detection result.

        Args:
            detected: Whether the target was detected this frame.

        Returns:
            True if the required consecutive count is met.
        """
        if detected:
            self.count += 1
            self._miss_streak = 0
        else:
            self._miss_streak += 1
            if self._miss_streak > self.grace_frames:
                self.count = 0
            else:
                self.count = max(0, self.count - 1)
        return self.count >= self.required

    def reset(self) -> None:
        """Reset the consecutive counter."""
        self.count = 0
        self._miss_streak = 0


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
