import httpx
import pytest

from runner.pipeline.http_retry import call_with_http_retries


def _status_error(status_code: int) -> httpx.HTTPStatusError:
    request = httpx.Request("POST", "https://example.test/model")
    response = httpx.Response(status_code, request=request)
    return httpx.HTTPStatusError("boom", request=request, response=response)


def test_call_with_http_retries_recovers_from_transient_503():
    calls = {"count": 0}
    sleeps = []

    def work():
        calls["count"] += 1
        if calls["count"] < 3:
            raise _status_error(503)
        return "ok"

    assert call_with_http_retries(work, sleep_fn=sleeps.append) == "ok"
    assert calls["count"] == 3
    assert sleeps == [1.0, 2.0]


def test_call_with_http_retries_does_not_retry_terminal_400():
    calls = {"count": 0}

    def work():
        calls["count"] += 1
        raise _status_error(400)

    with pytest.raises(httpx.HTTPStatusError):
        call_with_http_retries(work, sleep_fn=lambda _seconds: None)
    assert calls["count"] == 1


def test_call_with_http_retries_retries_timeout_then_succeeds():
    calls = {"count": 0}

    def work():
        calls["count"] += 1
        if calls["count"] == 1:
            raise httpx.ReadTimeout("slow model")
        return {"ok": True}

    assert call_with_http_retries(work, sleep_fn=lambda _seconds: None) == {"ok": True}
    assert calls["count"] == 2
