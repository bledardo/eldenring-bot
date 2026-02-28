"""Tkinter-based log viewer window, controlled from the system tray."""

from __future__ import annotations

import queue
import threading
import tkinter as tk
from tkinter import scrolledtext

from loguru import logger

# Thread-safe queue for log messages
_log_queue: queue.Queue[str] = queue.Queue(maxsize=5000)

# Loguru sink that feeds the queue
def _queue_sink(message: str) -> None:
    """Loguru sink that pushes formatted messages to the log queue."""
    text = message.strip()
    try:
        _log_queue.put_nowait(text)
    except queue.Full:
        # Drop oldest message and retry
        try:
            _log_queue.get_nowait()
            _log_queue.put_nowait(text)
        except queue.Empty:
            pass


def install_sink(level: str = "DEBUG") -> int:
    """Install the queue-based loguru sink.

    Args:
        level: Minimum log level to capture.

    Returns:
        Loguru sink ID (for removal if needed).
    """
    return logger.add(
        _queue_sink,
        level=level,
        format="{time:HH:mm:ss} | {level: <8} | {message}",
    )


class LogWindow:
    """Tkinter log viewer that runs in its own thread."""

    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._root: tk.Tk | None = None
        self._visible = False

    def toggle(self) -> None:
        """Show or hide the log window."""
        if self._root is None or not self._visible:
            self._show()
        else:
            self._hide()

    def _show(self) -> None:
        """Show the log window (start thread if needed)."""
        if self._thread is None or not self._thread.is_alive():
            self._visible = True
            self._thread = threading.Thread(target=self._run, daemon=True)
            self._thread.start()
        elif self._root is not None:
            self._visible = True
            self._root.after(0, self._root.deiconify)

    def _hide(self) -> None:
        """Hide the log window."""
        self._visible = False
        if self._root is not None:
            self._root.after(0, self._root.withdraw)

    def _run(self) -> None:
        """Tkinter mainloop (runs in dedicated thread)."""
        root = tk.Tk()
        self._root = root
        root.title("Elden Ring Watcher — Logs")
        root.geometry("800x450")
        root.configure(bg="#1a1a1a")

        # Dark theme text area
        text = scrolledtext.ScrolledText(
            root,
            wrap=tk.WORD,
            bg="#1a1a1a",
            fg="#cccccc",
            insertbackground="#cccccc",
            font=("Consolas", 9),
            state=tk.DISABLED,
            borderwidth=0,
            highlightthickness=0,
        )
        text.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        # Color tags for log levels
        text.tag_configure("DEBUG", foreground="#666666")
        text.tag_configure("INFO", foreground="#cccccc")
        text.tag_configure("WARNING", foreground="#e8a838")
        text.tag_configure("ERROR", foreground="#e84038")
        text.tag_configure("SUCCESS", foreground="#38c838")

        def _get_tag(line: str) -> str:
            for level in ("ERROR", "WARNING", "SUCCESS", "DEBUG"):
                if f"| {level}" in line:
                    return level
            return "INFO"

        def _poll_queue() -> None:
            """Drain the queue and append to the text widget."""
            count = 0
            while count < 100:  # Batch up to 100 messages per poll
                try:
                    msg = _log_queue.get_nowait()
                except queue.Empty:
                    break
                tag = _get_tag(msg)
                text.configure(state=tk.NORMAL)
                text.insert(tk.END, msg + "\n", tag)
                text.configure(state=tk.DISABLED)
                count += 1

            # Auto-scroll to bottom
            if count > 0:
                text.see(tk.END)

            # Limit buffer to ~2000 lines
            line_count = int(text.index("end-1c").split(".")[0])
            if line_count > 2500:
                text.configure(state=tk.NORMAL)
                text.delete("1.0", f"{line_count - 2000}.0")
                text.configure(state=tk.DISABLED)

            root.after(200, _poll_queue)

        def _on_close() -> None:
            self._visible = False
            root.withdraw()

        root.protocol("WM_DELETE_WINDOW", _on_close)
        root.after(200, _poll_queue)

        root.mainloop()
        self._root = None
        self._visible = False
