"""Small retry helper for transient local-model HTTP failures."""
from __future__ import annotations

import time
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")

_RETRYABLE_STATUS_CODES = {408, 425, 429, 500, 502, 503, 504}


def call_with_http_retries(
    fn: Callable[[], T],
    *,
    attempts: int = 3,
    backoff_seconds: float = 1.0,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> T:
    """Run `fn` with bounded retries for transient httpx/network failures."""
    import httpx

    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            return fn()
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            if status not in _RETRYABLE_STATUS_CODES or attempt == attempts - 1:
                raise
            last_error = exc
        except (httpx.TimeoutException, httpx.NetworkError, ConnectionError, TimeoutError) as exc:
            if attempt == attempts - 1:
                raise
            last_error = exc

        sleep_fn(backoff_seconds * (2**attempt))

    if last_error:
        raise last_error
    raise RuntimeError("HTTP retry helper exhausted without a captured exception.")
