"""
Diagnostic helpers for LiteLLM / Ollama / Mac Studio health checks.

All functions are non-destructive (read-only HTTP GET/POST to health and
inference endpoints; no writes to disk or external services).  They are
designed to be called from `runner doctor` and `runner litelm-test`.

Error taxonomy
──────────────
  NETWORK_UNREACHABLE   Cannot TCP-connect to host:port (offline / Tailscale down)
  AUTH_FAILURE          HTTP 401 / 403  (wrong LITELM_API_KEY)
  HTTP_500_PTY          HTTP 500 with PTY/process-exhaustion body from Ollama
  HTTP_500_UPSTREAM     HTTP 500 with other Ollama/model-runner error body
  HTTP_500_LITELM       HTTP 500 with LiteLLM internal error body
  HTTP_500_UNKNOWN      HTTP 500 with no interpretable body
  HTTP_OTHER            Any other non-200 status
  JSON_PARSE            Response body is not valid / expected JSON
  DIMENSION_MISMATCH    Embedding returned wrong vector length
  OK                    Successful request
"""
from __future__ import annotations

import subprocess
from enum import Enum
from typing import NamedTuple


# ── Error taxonomy ──────────────────────────────────────────────────────────

class ErrorKind(str, Enum):
    NETWORK_UNREACHABLE = "NETWORK_UNREACHABLE"
    AUTH_FAILURE        = "AUTH_FAILURE"
    HTTP_500_PTY        = "HTTP_500_PTY"
    HTTP_500_UPSTREAM   = "HTTP_500_UPSTREAM"
    HTTP_500_LITELM     = "HTTP_500_LITELM"
    HTTP_500_UNKNOWN    = "HTTP_500_UNKNOWN"
    HTTP_OTHER          = "HTTP_OTHER"
    JSON_PARSE          = "JSON_PARSE"
    DIMENSION_MISMATCH  = "DIMENSION_MISMATCH"
    HEALTH_SLOW         = "HEALTH_SLOW"   # /health timed out but /v1/models OK → service is up
    OK                  = "OK"


class DiagnosticResult(NamedTuple):
    kind:    ErrorKind
    message: str
    detail:  str = ""

    @property
    def ok(self) -> bool:
        return self.kind == ErrorKind.OK


# ── Keyword sets for response-body classification ───────────────────────────

_PTY_PHRASES = frozenset([
    "forkpty",
    "resource temporarily unavailable",
    "could not create a new process",
    "pseudo-tty",
    "open a pseudo-tty",
    "ptmx",
])

_OLLAMA_UPSTREAM_PHRASES = frozenset([
    "error starting runner",
    "no runners",
    "failed to load model",
    "out of memory",
    "model not found",
    "pull model",
    "llama runner",
])

_NETWORK_EXC_NAMES = frozenset([
    "ConnectError",
    "ConnectTimeout",
    "ReadTimeout",
    "TimeoutException",
    "NetworkError",
    "RemoteProtocolError",
    "ConnectionError",
    "ConnectionRefusedError",
])


# ── Pure classification helpers (no I/O — fully testable) ───────────────────

def classify_http_error(
    status_code: int,
    response_text: str,
    exc: Exception | None = None,
) -> DiagnosticResult:
    """Classify an HTTP error response into a DiagnosticResult.

    Parameters
    ----------
    status_code:    HTTP status code returned by the server.
    response_text:  Raw response body text.
    exc:            Optional Python exception that triggered this call
                    (used to detect connection-level failures even when a
                    status_code is supplied).
    """
    text_lower = response_text.lower()
    exc_name   = type(exc).__name__ if exc else ""

    # Connection-level failure takes priority over any status code
    if exc is not None and (
        any(s in exc_name for s in _NETWORK_EXC_NAMES)
        or "connection" in str(exc).lower()
    ):
        return DiagnosticResult(
            ErrorKind.NETWORK_UNREACHABLE,
            "Cannot reach host — connection refused or timed out",
            f"{exc_name}: {exc}",
        )

    if status_code in (401, 403):
        return DiagnosticResult(
            ErrorKind.AUTH_FAILURE,
            f"HTTP {status_code} — authentication failure",
            (
                "Check LITELM_API_KEY in runner/.env matches the "
                "master_key in LiteLLM config.yaml on Mac Studio."
            ),
        )

    if status_code == 500:
        if any(p in text_lower for p in _PTY_PHRASES):
            return DiagnosticResult(
                ErrorKind.HTTP_500_PTY,
                "HTTP 500 — macOS PTY / process-limit exhaustion on Mac Studio",
                (
                    "Ollama replied 'forkpty: Resource temporarily unavailable'. "
                    "The Mac Studio has hit the macOS pseudo-terminal (PTY) or "
                    "total-process limit.  Safe fix: restart the Mac Studio, or "
                    "restart the Ollama service manually "
                    "(see docs/MAC_STUDIO_TROUBLESHOOTING.md § PTY exhaustion)."
                ),
            )
        if any(p in text_lower for p in _OLLAMA_UPSTREAM_PHRASES):
            return DiagnosticResult(
                ErrorKind.HTTP_500_UPSTREAM,
                "HTTP 500 — Ollama / model-runner error (upstream of LiteLLM)",
                f"Body excerpt: {response_text[:300]}",
            )
        if "litellm" in text_lower or "proxy" in text_lower:
            return DiagnosticResult(
                ErrorKind.HTTP_500_LITELM,
                "HTTP 500 — LiteLLM internal error",
                f"Body excerpt: {response_text[:300]}",
            )
        return DiagnosticResult(
            ErrorKind.HTTP_500_UNKNOWN,
            "HTTP 500 — unknown server error",
            f"Body excerpt: {response_text[:300]}",
        )

    return DiagnosticResult(
        ErrorKind.HTTP_OTHER,
        f"HTTP {status_code} — unexpected status",
        response_text[:300],
    )


def classify_supabase_error(exc: Exception) -> DiagnosticResult:
    """Classify a Supabase connection exception into a DiagnosticResult.

    Handles the most common failure modes in order of frequency:
      - DNS resolution failure  → project paused (free-tier auto-pause)
      - Connection refused       → project paused or Supabase unreachable
      - Table not found          → migrate-supabase needed
      - Other                    → raw error
    """
    err = str(exc)
    err_lower = err.lower()

    if "nodename nor servname" in err or "errno 8" in err_lower or "name or service not known" in err_lower:
        return DiagnosticResult(
            ErrorKind.NETWORK_UNREACHABLE,
            "Supabase hostname did not resolve — project is likely paused",
            (
                "Free-tier Supabase projects pause after 7 days of inactivity.  "
                "Go to app.supabase.com → select the project → click 'Restore project'.  "
                "Wait 1–2 min then re-run: python -m runner doctor"
            ),
        )

    if "refused" in err_lower or ("connect" in err_lower and "error" in err_lower):
        return DiagnosticResult(
            ErrorKind.NETWORK_UNREACHABLE,
            "Supabase connection refused — project may be paused",
            "Check app.supabase.com and restore the project if it shows 'Paused'.",
        )

    if "does not exist" in err or "42p01" in err_lower:
        return DiagnosticResult(
            ErrorKind.HTTP_OTHER,
            "document_embeddings table not found",
            "Run: python -m runner migrate-supabase --confirm",
        )

    return DiagnosticResult(
        ErrorKind.HTTP_OTHER,
        f"Supabase error: {err[:120]}",
        "",
    )


def classify_exception(exc: Exception) -> DiagnosticResult:
    """Classify a Python exception (raised before any HTTP response) into a
    DiagnosticResult."""
    exc_name = type(exc).__name__
    exc_str  = str(exc).lower()

    if (
        any(s in exc_name for s in _NETWORK_EXC_NAMES)
        or "connection" in exc_str
        or "refused" in exc_str
        or "timed out" in exc_str
    ):
        return DiagnosticResult(
            ErrorKind.NETWORK_UNREACHABLE,
            "Network / connection error",
            str(exc),
        )

    if "json" in exc_name.lower() or "json" in exc_str or "decode" in exc_str:
        return DiagnosticResult(
            ErrorKind.JSON_PARSE,
            "JSON decode error",
            str(exc),
        )

    return DiagnosticResult(
        ErrorKind.HTTP_OTHER,
        f"Unexpected Python exception: {exc_name}",
        str(exc),
    )


# ── System resource probes (macOS / local) ──────────────────────────────────

def get_process_count() -> int | None:
    """Return the number of running processes visible via `ps ax` (or None)."""
    try:
        result = subprocess.run(
            ["ps", "ax"],
            capture_output=True, text=True, timeout=5,
        )
        lines = result.stdout.strip().splitlines()
        return max(0, len(lines) - 1)   # subtract ps header line
    except Exception:
        return None


def get_pty_count() -> int | None:
    """Return the number of allocated PTY slave devices on macOS (or None).

    Each PTY appears as /dev/ttys<NNN>.  This is a heuristic — the actual
    in-kernel count may be slightly different, but it is sufficient to spot
    runaway PTY accumulation.
    """
    try:
        import glob
        return len(glob.glob("/dev/ttys*"))
    except Exception:
        return None


def get_pty_limit() -> int | None:
    """Return the kern.tty.ptmx_max sysctl value (macOS PTY hard limit).

    Returns None if the sysctl is not available (non-macOS or permission
    denied).
    """
    try:
        result = subprocess.run(
            ["sysctl", "kern.tty.ptmx_max"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            parts = result.stdout.strip().split(":")
            if len(parts) == 2:
                return int(parts[1].strip())
    except Exception:
        pass
    return None


def get_open_file_count() -> int | None:
    """Return the number of file descriptors open by this process (or None)."""
    try:
        import os
        import glob
        pid = os.getpid()
        fds = glob.glob(f"/proc/{pid}/fd/*")
        if fds:
            return len(fds)
        # macOS fallback via lsof
        result = subprocess.run(
            ["lsof", "-p", str(pid), "-F", "n"],
            capture_output=True, text=True, timeout=5,
        )
        return result.stdout.count("\n")
    except Exception:
        return None


# ── Live probes (require httpx, imported lazily) ────────────────────────────

def probe_health(
    base_url: str,
    api_key: str = "",
    timeout: int = 10,
) -> DiagnosticResult:
    """Check LiteLLM / Ollama reachability.

    Strategy (two stages):

    1. GET /v1/models  — instant model-list endpoint; does NOT ping running
       models, so it responds in milliseconds even when models are cold.
       This is the primary reachability signal.

    2. GET /health     — LiteLLM's deep health check pings every configured
       model before replying.  With large cold models (35B, 31B) this can
       take 30–60 s.  If /v1/models already confirmed reachability, a
       /health timeout is classified as HEALTH_SLOW (service is up, health
       check is just slow) rather than NETWORK_UNREACHABLE.

    Why this matters: a 10-second /health timeout on a cold LiteLLM service
    previously caused `runner doctor` to report NETWORK_UNREACHABLE and exit
    with code 1 even when the service was serving inference requests normally.
    """
    try:
        import httpx
    except ImportError:
        return DiagnosticResult(ErrorKind.HTTP_OTHER, "httpx not installed", "pip install httpx")

    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    base    = base_url.rstrip("/")

    # ── Stage 1: GET /v1/models (fast reachability probe) ──────────────────
    models_reachable = False
    try:
        r = httpx.get(f"{base}/v1/models", headers=headers, timeout=timeout)
        if r.status_code == 200:
            models_reachable = True
        elif r.status_code in (401, 403):
            return classify_http_error(r.status_code, r.text)
        # Other non-200 on /v1/models is inconclusive; fall through to /health
    except Exception:
        pass   # will surface in stage 2

    # ── Stage 2: GET /health (deeper check, may be slow) ───────────────────
    try:
        r = httpx.get(f"{base}/health", headers=headers, timeout=timeout)
    except Exception as exc:
        if models_reachable:
            # /v1/models confirmed the service is up; /health just timed out
            return DiagnosticResult(
                ErrorKind.HEALTH_SLOW,
                "Reachable — /health timed out (LiteLLM cold-start model ping)",
                (
                    "LiteLLM's /health endpoint pings every configured model before "
                    "responding.  With cold large models (35B, 31B) this can take "
                    "30–60 s and will time out at the default 10 s limit.  "
                    "The service is running normally — /v1/models returned 200.  "
                    "Run 'runner litelm-test' for a full inference test."
                ),
            )
        return classify_exception(exc)

    if r.status_code != 200:
        return classify_http_error(r.status_code, r.text)

    return DiagnosticResult(ErrorKind.OK, "Reachable — HTTP 200")


def probe_chat(
    base_url: str,
    api_key: str,
    model: str,
    prompt: str = "Reply with the single word PONG and nothing else.",
    timeout: int = 45,
) -> DiagnosticResult:
    """POST /chat/completions with a tiny request.

    Returns a DiagnosticResult.  On success, message includes the model
    reply so the caller can confirm the model is actually responding.
    """
    try:
        import httpx
    except ImportError:
        return DiagnosticResult(ErrorKind.HTTP_OTHER, "httpx not installed", "pip install httpx")

    url = base_url.rstrip("/") + "/chat/completions"
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 10,
        "temperature": 0.0,
    }
    try:
        r = httpx.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=timeout,
        )
    except Exception as exc:
        return classify_exception(exc)

    if r.status_code != 200:
        return classify_http_error(r.status_code, r.text)

    try:
        data  = r.json()
        reply = data["choices"][0]["message"]["content"].strip()
        return DiagnosticResult(ErrorKind.OK, f"Chat OK — model replied: {reply!r}")
    except (KeyError, IndexError) as exc:
        return DiagnosticResult(
            ErrorKind.JSON_PARSE,
            "Chat response parsed but structure unexpected",
            f"{exc}: {r.text[:200]}",
        )
    except ValueError as exc:
        return DiagnosticResult(ErrorKind.JSON_PARSE, "JSON decode error", str(exc))


def probe_embedding(
    base_url: str,
    api_key: str,
    model: str,
    expected_dim: int = 4096,
    timeout: int = 60,
) -> DiagnosticResult:
    """POST /embeddings with a tiny request and verify the vector dimension."""
    try:
        import httpx
    except ImportError:
        return DiagnosticResult(ErrorKind.HTTP_OTHER, "httpx not installed", "pip install httpx")

    url = base_url.rstrip("/") + "/embeddings"
    payload = {"model": model, "input": "diagnostics test"}
    try:
        r = httpx.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=timeout,
        )
    except Exception as exc:
        return classify_exception(exc)

    if r.status_code != 200:
        return classify_http_error(r.status_code, r.text)

    try:
        data = r.json()
        vec  = data["data"][0]["embedding"]
        dim  = len(vec)
        if dim == expected_dim:
            return DiagnosticResult(ErrorKind.OK, f"Embedding OK — {dim}d ✓")
        return DiagnosticResult(
            ErrorKind.DIMENSION_MISMATCH,
            f"Embedding returned {dim}d — expected {expected_dim}d",
            (
                f"Model is reporting {dim}-dimensional vectors.  "
                f"Check LITELM_EMBEDDING_MODEL in runner/.env — "
                f"it should resolve to qwen3-embedding:8b (4096d)."
            ),
        )
    except (KeyError, IndexError) as exc:
        return DiagnosticResult(
            ErrorKind.JSON_PARSE,
            "Embedding response structure unexpected",
            f"{exc}: {r.text[:200]}",
        )
    except ValueError as exc:
        return DiagnosticResult(ErrorKind.JSON_PARSE, "JSON decode error", str(exc))


def probe_ollama_models(
    base_url: str,
    timeout: int = 5,
) -> tuple[list[str], str | None]:
    """Return (model_names, error_message).  error_message is None on success."""
    try:
        import httpx
        r = httpx.get(base_url.rstrip("/") + "/api/tags", timeout=timeout)
        r.raise_for_status()
        models = [m["name"] for m in r.json().get("models", [])]
        return models, None
    except Exception as exc:
        return [], str(exc)
