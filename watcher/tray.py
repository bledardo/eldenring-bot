"""System tray icon with color-coded status."""

from __future__ import annotations

from collections.abc import Callable
from enum import Enum

from loguru import logger
from PIL import Image, ImageDraw

try:
    import pystray
except ImportError:
    pystray = None  # type: ignore[assignment]
    logger.warning("pystray not available — tray icon disabled (likely not on Windows)")


class TrayStatus(Enum):
    """Color-coded tray icon status."""

    WATCHING = "watching"       # green — connected + game detected
    NO_GAME = "no_game"        # yellow — no game detected
    DISCONNECTED = "disconnected"  # orange — no server connection
    ERROR = "error"            # red — error state


_STATUS_COLORS: dict[TrayStatus, tuple[int, int, int]] = {
    TrayStatus.WATCHING: (0, 200, 0),
    TrayStatus.NO_GAME: (220, 180, 0),
    TrayStatus.DISCONNECTED: (220, 100, 0),
    TrayStatus.ERROR: (220, 0, 0),
}

_STATUS_LABELS: dict[TrayStatus, str] = {
    TrayStatus.WATCHING: "Watching",
    TrayStatus.NO_GAME: "No Game",
    TrayStatus.DISCONNECTED: "Disconnected",
    TrayStatus.ERROR: "Error",
}


def _create_icon_image(color: tuple[int, int, int], size: int = 64) -> Image.Image:
    """Create a status dot icon image.

    Args:
        color: RGB color tuple.
        size: Image size in pixels.

    Returns:
        PIL Image with a colored circle on transparent background.
    """
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    margin = 4
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=(*color, 255),
    )
    return image


class TrayApp:
    """System tray icon with dynamic color-coded status.

    Must be created from the main thread on Windows (pystray requirement).
    Use run_detached() to run the tray in a background thread.
    """

    def __init__(self, on_quit: Callable[[], None]) -> None:
        self._on_quit = on_quit
        self._status = TrayStatus.NO_GAME
        self._log_window: object | None = None  # lazy import to avoid tkinter at module level

        if pystray is None:
            self.icon = None
            logger.warning("Tray icon not available (pystray not installed)")
            return

        self.icon = pystray.Icon(
            name="EldenWatcher",
            icon=_create_icon_image(_STATUS_COLORS[self._status]),
            title=f"Elden Ring Watcher — {_STATUS_LABELS[self._status]}",
            menu=self._build_menu(),
        )

    def _build_menu(self) -> pystray.Menu | None:
        """Build the right-click context menu."""
        if pystray is None:
            return None
        return pystray.Menu(
            pystray.MenuItem(
                f"Status: {_STATUS_LABELS[self._status]}",
                action=None,
                enabled=False,
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Logs", self._toggle_logs),
            pystray.MenuItem("Quit", self._quit),
        )

    def _toggle_logs(self, icon: object = None, item: object = None) -> None:
        """Toggle the log viewer window."""
        if self._log_window is None:
            try:
                from watcher.log_window import LogWindow
                self._log_window = LogWindow()
            except Exception as exc:
                logger.warning("Failed to create log window: {}", exc)
                return
        self._log_window.toggle()

    def _quit(self, icon: object = None, item: object = None) -> None:
        """Handle quit action from tray menu."""
        logger.info("Quit requested from tray")
        if self.icon is not None:
            self.icon.stop()
        self._on_quit()

    def set_status(self, status: TrayStatus) -> None:
        """Update the tray icon color and tooltip.

        Args:
            status: New status to display.
        """
        self._status = status
        if self.icon is None:
            return
        try:
            self.icon.icon = _create_icon_image(_STATUS_COLORS[status])
            self.icon.title = f"Elden Ring Watcher — {_STATUS_LABELS[status]}"
            # Update menu to reflect new status
            self.icon.menu = self._build_menu()
        except OSError:
            logger.warning("Tray icon handle invalid — skipping status update")
            return
        logger.debug("Tray status updated: {}", status.value)

    def run(self) -> None:
        """Run the tray icon (blocking — must be on main thread for Windows)."""
        if self.icon is None:
            logger.warning("Tray icon not available, run() is a no-op")
            return
        self.icon.run()

    def run_detached(self) -> None:
        """Run the tray icon in a background thread."""
        if self.icon is None:
            logger.warning("Tray icon not available, run_detached() is a no-op")
            return
        self.icon.run_detached()
        logger.info("Tray icon running (detached)")

    def notify(self, message: str, title: str = "Elden Ring Watcher") -> None:
        """Show a Windows notification balloon from the tray icon.

        Args:
            message: Notification body text.
            title: Notification title.
        """
        if self.icon is None:
            return
        try:
            self.icon.notify(message, title)
        except Exception as exc:
            logger.debug("Tray notification failed: {}", exc)

    def stop(self) -> None:
        """Stop the tray icon."""
        if self.icon is not None:
            self.icon.stop()
            logger.info("Tray icon stopped")
