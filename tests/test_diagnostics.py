"""
Tests for runner.pipeline.diagnostics — error classification helpers.

All tests are pure (no I/O, no network).  The live probe functions
(probe_health, probe_chat, probe_embedding, probe_ollama_models) are
tested via monkeypatching httpx so they never touch the network.
"""
import pytest

from runner.pipeline.diagnostics import (
    ErrorKind,
    DiagnosticResult,
    classify_http_error,
    classify_exception,
    get_process_count,
    get_pty_count,
)


# ── classify_http_error ──────────────────────────────────────────────────────

class TestClassifyHttpError:
    def test_401_returns_auth_failure(self):
        dr = classify_http_error(401, "Unauthorized")
        assert dr.kind == ErrorKind.AUTH_FAILURE
        assert not dr.ok

    def test_403_returns_auth_failure(self):
        dr = classify_http_error(403, "Forbidden")
        assert dr.kind == ErrorKind.AUTH_FAILURE

    def test_500_forkpty_returns_pty(self):
        body = '{"error": "error starting runner: forkpty: Resource temporarily unavailable"}'
        dr = classify_http_error(500, body)
        assert dr.kind == ErrorKind.HTTP_500_PTY
        assert not dr.ok

    def test_500_pty_variant_phrase(self):
        body = "Could not create a new process and open a pseudo-tty."
        dr = classify_http_error(500, body)
        assert dr.kind == ErrorKind.HTTP_500_PTY

    def test_500_ollama_error_starting_runner(self):
        body = '{"error": "error starting runner: some other error"}'
        dr = classify_http_error(500, body)
        assert dr.kind == ErrorKind.HTTP_500_UPSTREAM

    def test_500_ollama_model_not_found(self):
        body = "model not found: core-qwen"
        dr = classify_http_error(500, body)
        assert dr.kind == ErrorKind.HTTP_500_UPSTREAM

    def test_500_litelm_body(self):
        body = '{"detail": "LiteLLM proxy error: router not initialized"}'
        dr = classify_http_error(500, body)
        assert dr.kind == ErrorKind.HTTP_500_LITELM

    def test_500_unknown_body(self):
        body = "Internal Server Error"
        dr = classify_http_error(500, body)
        assert dr.kind == ErrorKind.HTTP_500_UNKNOWN

    def test_404_returns_http_other(self):
        dr = classify_http_error(404, "Not Found")
        assert dr.kind == ErrorKind.HTTP_OTHER

    def test_503_returns_http_other(self):
        dr = classify_http_error(503, "Service Unavailable")
        assert dr.kind == ErrorKind.HTTP_OTHER

    def test_connection_exc_overrides_status(self):
        """Even if a status code is passed, a connection exception wins."""
        class ConnectError(Exception):
            pass
        exc = ConnectError("connection refused")
        dr = classify_http_error(0, "", exc=exc)
        assert dr.kind == ErrorKind.NETWORK_UNREACHABLE

    def test_500_body_included_in_detail(self):
        body = "Internal Server Error — some internal state"
        dr = classify_http_error(500, body)
        assert body[:30] in dr.detail or body[:30] in dr.message

    def test_case_insensitive_pty_match(self):
        body = "FORKPTY: RESOURCE TEMPORARILY UNAVAILABLE"
        dr = classify_http_error(500, body)
        assert dr.kind == ErrorKind.HTTP_500_PTY


# ── classify_exception ───────────────────────────────────────────────────────

class TestClassifyException:
    def test_connect_error(self):
        class ConnectError(ConnectionRefusedError):
            pass
        dr = classify_exception(ConnectError("refused"))
        assert dr.kind == ErrorKind.NETWORK_UNREACHABLE

    def test_timeout_by_name(self):
        class ConnectTimeout(Exception):
            pass
        dr = classify_exception(ConnectTimeout("timed out"))
        assert dr.kind == ErrorKind.NETWORK_UNREACHABLE

    def test_generic_connection_string(self):
        dr = classify_exception(OSError("Connection timed out"))
        assert dr.kind == ErrorKind.NETWORK_UNREACHABLE

    def test_json_decode_error(self):
        import json
        try:
            json.loads("{bad}")
        except json.JSONDecodeError as exc:
            dr = classify_exception(exc)
        assert dr.kind == ErrorKind.JSON_PARSE

    def test_json_exception_by_name(self):
        class JSONDecodeError(Exception):
            pass
        dr = classify_exception(JSONDecodeError("unexpected token"))
        assert dr.kind == ErrorKind.JSON_PARSE

    def test_unknown_exception(self):
        dr = classify_exception(RuntimeError("something weird"))
        assert dr.kind == ErrorKind.HTTP_OTHER
        assert not dr.ok


# ── DiagnosticResult.ok ──────────────────────────────────────────────────────

class TestDiagnosticResultOk:
    def test_ok_kind_is_ok(self):
        dr = DiagnosticResult(ErrorKind.OK, "success")
        assert dr.ok is True

    def test_non_ok_kind_is_not_ok(self):
        for kind in ErrorKind:
            if kind != ErrorKind.OK:
                dr = DiagnosticResult(kind, "fail")
                assert dr.ok is False, f"{kind} should not be ok"


# ── System resource probes ───────────────────────────────────────────────────

class TestSystemProbes:
    def test_get_process_count_returns_int_or_none(self):
        result = get_process_count()
        assert result is None or (isinstance(result, int) and result > 0)

    def test_get_pty_count_returns_int_or_none(self):
        result = get_pty_count()
        assert result is None or (isinstance(result, int) and result >= 0)


# ── probe_* functions (network mocked) ──────────────────────────────────────

class TestProbeHealth:
    def test_ok_on_200(self, monkeypatch):
        from runner.pipeline import diagnostics

        class _Resp:
            status_code = 200
            text = '{"status": "healthy"}'
            def raise_for_status(self): pass

        class _FakeHttpx:
            @staticmethod
            def get(url, headers=None, timeout=10):
                return _Resp()

        monkeypatch.setattr(diagnostics, "_probe_health_httpx", None, raising=False)
        import sys
        import types
        fake_httpx = types.ModuleType("httpx")
        fake_httpx.get = _FakeHttpx.get

        # We import httpx inside probe_health, so patch via sys.modules
        original = sys.modules.get("httpx")
        sys.modules["httpx"] = fake_httpx
        try:
            dr = diagnostics.probe_health("http://localhost:4000")
        finally:
            if original is not None:
                sys.modules["httpx"] = original
            else:
                del sys.modules["httpx"]

        assert dr.ok

    def test_connection_error_returns_network_unreachable(self, monkeypatch):
        from runner.pipeline import diagnostics
        import sys, types

        class ConnectError(Exception):
            pass

        fake_httpx = types.ModuleType("httpx")
        fake_httpx.get = staticmethod(lambda *a, **kw: (_ for _ in ()).throw(ConnectError("refused")))

        original = sys.modules.get("httpx")
        sys.modules["httpx"] = fake_httpx
        try:
            dr = diagnostics.probe_health("http://localhost:4000")
        finally:
            if original is not None:
                sys.modules["httpx"] = original
            else:
                del sys.modules["httpx"]

        assert dr.kind == ErrorKind.NETWORK_UNREACHABLE

    def test_500_pty_classified_correctly(self, monkeypatch):
        from runner.pipeline import diagnostics
        import sys, types

        class _Resp:
            status_code = 500
            text = "forkpty: Resource temporarily unavailable"
            def raise_for_status(self): pass

        fake_httpx = types.ModuleType("httpx")
        fake_httpx.get = staticmethod(lambda *a, **kw: _Resp())

        original = sys.modules.get("httpx")
        sys.modules["httpx"] = fake_httpx
        try:
            dr = diagnostics.probe_health("http://localhost:4000")
        finally:
            if original is not None:
                sys.modules["httpx"] = original
            else:
                del sys.modules["httpx"]

        assert dr.kind == ErrorKind.HTTP_500_PTY


class TestProbeEmbedding:
    def _fake_httpx_post(self, status, body_dict=None, exc=None):
        import sys, types
        import json as _json
        from runner.pipeline import diagnostics

        _body_str = _json.dumps(body_dict) if body_dict else ""
        _body_obj = body_dict or {}

        class _Resp:
            status_code = status
            text = _body_str
            def json(self): return _body_obj

        fake_httpx = types.ModuleType("httpx")
        if exc:
            fake_httpx.post = staticmethod(lambda *a, **kw: (_ for _ in ()).throw(exc))
        else:
            fake_httpx.post = staticmethod(lambda *a, **kw: _Resp())

        original = sys.modules.get("httpx")
        sys.modules["httpx"] = fake_httpx
        try:
            dr = diagnostics.probe_embedding("http://localhost:4000", "", "research-embedding")
        finally:
            if original is not None:
                sys.modules["httpx"] = original
            else:
                del sys.modules["httpx"]
        return dr

    def test_correct_dimension_returns_ok(self):
        body = {"data": [{"embedding": [0.1] * 4096}]}
        dr = self._fake_httpx_post(200, body)
        assert dr.ok

    def test_wrong_dimension_returns_mismatch(self):
        body = {"data": [{"embedding": [0.1] * 2560}]}
        dr = self._fake_httpx_post(200, body)
        assert dr.kind == ErrorKind.DIMENSION_MISMATCH

    def test_500_pty_classified(self):
        import sys, types
        from runner.pipeline import diagnostics

        class _Resp:
            status_code = 500
            text = "forkpty: Resource temporarily unavailable"
            def json(self): return {}

        fake_httpx = types.ModuleType("httpx")
        fake_httpx.post = staticmethod(lambda *a, **kw: _Resp())

        original = sys.modules.get("httpx")
        sys.modules["httpx"] = fake_httpx
        try:
            dr = diagnostics.probe_embedding("http://localhost:4000", "", "research-embedding")
        finally:
            if original is not None:
                sys.modules["httpx"] = original
            else:
                del sys.modules["httpx"]
        assert dr.kind == ErrorKind.HTTP_500_PTY

    def test_auth_failure(self):
        import sys, types
        from runner.pipeline import diagnostics

        class _Resp:
            status_code = 401
            text = "Unauthorized"
            def json(self): return {}

        fake_httpx = types.ModuleType("httpx")
        fake_httpx.post = staticmethod(lambda *a, **kw: _Resp())

        original = sys.modules.get("httpx")
        sys.modules["httpx"] = fake_httpx
        try:
            dr = diagnostics.probe_embedding("http://localhost:4000", "", "research-embedding")
        finally:
            if original is not None:
                sys.modules["httpx"] = original
            else:
                del sys.modules["httpx"]
        assert dr.kind == ErrorKind.AUTH_FAILURE
