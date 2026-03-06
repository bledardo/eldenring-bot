"""Screen capture abstraction with BetterCam (primary) and mss (fallback).

All capture regions are percentage-based for resolution independence.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from loguru import logger


@dataclass
class CaptureRegion:
    """Screen region defined as percentages (0.0-1.0) of screen dimensions.

    This ensures regions work across all resolutions.
    """

    left_pct: float
    top_pct: float
    right_pct: float
    bottom_pct: float

    def to_pixels(self, screen_width: int, screen_height: int) -> tuple[int, int, int, int]:
        """Convert percentage region to pixel coordinates.

        Args:
            screen_width: Screen width in pixels.
            screen_height: Screen height in pixels.

        Returns:
            Tuple of (left, top, right, bottom) in pixels.
        """
        return (
            int(self.left_pct * screen_width),
            int(self.top_pct * screen_height),
            int(self.right_pct * screen_width),
            int(self.bottom_pct * screen_height),
        )


# Pre-defined capture regions
# Combined region covers both boss name text and health bar
BOSS_BAR_REGION = CaptureRegion(0.15, 0.77, 0.85, 0.87)
DOUBLE_BOSS_BAR_REGION = CaptureRegion(0.15, 0.70, 0.85, 0.87)
BOSS_NAME_REGION = CaptureRegion(0.20, 0.775, 0.80, 0.815)
YOU_DIED_REGION = CaptureRegion(0.30, 0.35, 0.70, 0.55)
KILL_TEXT_REGION = CaptureRegion(0.20, 0.35, 0.80, 0.55)
COOP_REGION = CaptureRegion(0.0, 0.0, 0.15, 0.30)


class ScreenCapture:
    """Screen capture abstraction with BetterCam primary and mss fallback.

    BetterCam handles exclusive fullscreen; mss works in borderless windowed.
    Falls back transparently if primary backend fails.

    Args:
        target_fps: Target capture rate (used for frame pacing by caller).
    """

    def __init__(self, target_fps: int = 10) -> None:
        self.target_fps = target_fps
        self._screen_width: int = 1920  # default
        self._screen_height: int = 1080  # default
        self._backend: str = "none"

        # Camera/capture object
        self._camera = None
        self._sct = None

        # Try BetterCam first, then mss
        if self._init_bettercam():
            self._backend = "bettercam"
        elif self._init_mss():
            self._backend = "mss"
        else:
            logger.error("No capture backend available!")

        logger.info(
            "Screen capture initialized: {}x{} via {}",
            self._screen_width,
            self._screen_height,
            self._backend,
        )

    def _init_bettercam(self) -> bool:
        """Try to initialize BetterCam capture.

        Returns:
            True if BetterCam initialized successfully.
        """
        try:
            import bettercam

            self._camera = bettercam.create(output_idx=0, output_color="BGR")
            # Get screen resolution from camera
            if hasattr(self._camera, "width") and hasattr(self._camera, "height"):
                self._screen_width = self._camera.width
                self._screen_height = self._camera.height
            logger.debug("BetterCam initialized")
            return True
        except ImportError:
            logger.debug("BetterCam not available")
            return False
        except Exception as exc:
            logger.debug("BetterCam init failed: {}", exc)
            return False

    def _init_mss(self) -> bool:
        """Try to initialize mss capture.

        Returns:
            True if mss initialized successfully.
        """
        try:
            import mss as mss_lib

            self._sct = mss_lib.mss()
            # Get primary monitor resolution
            monitor = self._sct.monitors[1]  # Primary monitor (0 is all monitors)
            self._screen_width = monitor["width"]
            self._screen_height = monitor["height"]
            logger.debug("mss initialized")
            return True
        except ImportError:
            logger.debug("mss not available")
            return False
        except Exception as exc:
            logger.debug("mss init failed: {}", exc)
            return False

    def capture_region(self, region: CaptureRegion) -> np.ndarray | None:
        """Capture a specific screen region.

        Args:
            region: CaptureRegion with percentage-based coordinates.

        Returns:
            BGR numpy array, or None if capture fails.
        """
        left, top, right, bottom = region.to_pixels(self._screen_width, self._screen_height)

        try:
            if self._backend == "bettercam" and self._camera is not None:
                frame = self._camera.grab(region=(left, top, right, bottom))
                if frame is not None:
                    return np.array(frame)
                return None

            elif self._backend == "mss" and self._sct is not None:
                import mss as mss_lib

                monitor = {
                    "left": left,
                    "top": top,
                    "width": right - left,
                    "height": bottom - top,
                }
                screenshot = self._sct.grab(monitor)
                # mss returns BGRA, convert to BGR
                frame = np.array(screenshot)
                return frame[:, :, :3]  # Drop alpha channel

            return None

        except Exception as exc:
            logger.debug("Capture failed: {}", exc)
            return None

    def grab_full(self) -> np.ndarray | None:
        """Grab full screen once. Use crop_region() to extract sub-regions.

        BetterCam can fail when grab() is called multiple times per frame
        for different regions. Grabbing full screen once and cropping is
        more reliable and avoids this issue.

        Returns:
            BGR numpy array of the full screen, or None if capture fails.
        """
        try:
            if self._backend == "bettercam" and self._camera is not None:
                frame = self._camera.grab()
                if frame is not None:
                    return np.array(frame)
                return None

            elif self._backend == "mss" and self._sct is not None:
                monitor = self._sct.monitors[1]
                screenshot = self._sct.grab(monitor)
                frame = np.array(screenshot)
                return frame[:, :, :3]

            return None
        except Exception as exc:
            logger.debug("Full capture failed: {}", exc)
            return None

    def crop_region(self, full_frame: np.ndarray, region: CaptureRegion) -> np.ndarray:
        """Crop a region from a full-screen frame.

        Args:
            full_frame: Full-screen BGR numpy array from grab_full().
            region: CaptureRegion with percentage-based coordinates.

        Returns:
            Cropped BGR numpy array.
        """
        left, top, right, bottom = region.to_pixels(self._screen_width, self._screen_height)
        return full_frame[top:bottom, left:right]

    def capture_full(self) -> np.ndarray | None:
        """Capture full screen (used for debug screenshots).

        Returns:
            BGR numpy array of the full screen, or None if capture fails.
        """
        full_region = CaptureRegion(0.0, 0.0, 1.0, 1.0)
        return self.capture_region(full_region)

    def get_resolution(self) -> tuple[int, int]:
        """Return detected screen resolution."""
        return (self._screen_width, self._screen_height)

    def reinitialize(self) -> None:
        """Re-initialize capture backend after cleanup (e.g. watchdog restart)."""
        if self._camera is not None or self._sct is not None:
            return  # Already initialized

        self._backend = "none"
        if self._init_bettercam():
            self._backend = "bettercam"
        elif self._init_mss():
            self._backend = "mss"
        else:
            logger.error("No capture backend available on reinitialize!")

        logger.info("Screen capture re-initialized via {}", self._backend)

    def cleanup(self) -> None:
        """Release capture resources."""
        if self._camera is not None:
            try:
                del self._camera
                self._camera = None
            except Exception:
                pass

        if self._sct is not None:
            try:
                self._sct.close()
                self._sct = None
            except Exception:
                pass

        logger.debug("Screen capture resources released")
