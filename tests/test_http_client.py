"""Tests for WatcherHttpClient API contract."""
import tempfile
import shutil
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from watcher.event_queue import EventQueue
from watcher.http_client import WatcherHttpClient


@pytest.fixture
def tmp_queue_dir():
    d = tempfile.mkdtemp()
    yield Path(d)
    shutil.rmtree(d)


@pytest.fixture
def client(tmp_queue_dir):
    queue = EventQueue(tmp_queue_dir)
    return WatcherHttpClient("http://localhost:3000", "test-key", queue)


def test_send_event_uses_bearer_auth(client):
    with patch.object(client._session, "post") as mock_post:
        mock_post.return_value = MagicMock(ok=True)
        client.send_event({"type": "boss_encounter", "event_id": "uuid-1"})
        _, kwargs = mock_post.call_args
        assert kwargs["headers"]["Authorization"] == "Bearer test-key"
        assert "X-API-Key" not in kwargs["headers"]


def test_send_event_posts_to_api_events(client):
    with patch.object(client._session, "post") as mock_post:
        mock_post.return_value = MagicMock(ok=True)
        client.send_event({"type": "boss_encounter", "event_id": "uuid-1"})
        args, _ = mock_post.call_args
        assert args[0] == "http://localhost:3000/api/events"


def test_send_event_no_api_key_in_body(client):
    with patch.object(client._session, "post") as mock_post:
        mock_post.return_value = MagicMock(ok=True)
        client.send_event({"type": "boss_encounter", "event_id": "uuid-1"})
        _, kwargs = mock_post.call_args
        assert "api_key" not in kwargs["json"]


def test_send_event_includes_event_id(client):
    with patch.object(client._session, "post") as mock_post:
        mock_post.return_value = MagicMock(ok=True)
        client.send_event({"type": "boss_encounter", "event_id": "uuid-42"})
        _, kwargs = mock_post.call_args
        assert kwargs["json"]["event_id"] == "uuid-42"


def test_flush_queue_uses_bearer_auth(client):
    client._queue.enqueue({"type": "test", "event_id": "q-1"})
    with patch.object(client._session, "post") as mock_post:
        mock_post.return_value = MagicMock(ok=True)
        client.flush_queue()
        args, kwargs = mock_post.call_args
        assert kwargs["headers"]["Authorization"] == "Bearer test-key"
        assert args[0] == "http://localhost:3000/api/events"
        assert "api_key" not in kwargs["json"]
