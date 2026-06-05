"""Tiny Mac Studio model-control service.

Runs next to Ollama on the Mac Studio and exposes only the management actions
the MacBook app needs.  It calls local Ollama at 127.0.0.1, so Ollama can stay
localhost-only while Tailscale exposes this narrow helper to the tailnet.

Example:
  MODEL_CONTROL_TOKEN=change-me \
  python3 -m runner.mac_studio_model_control --port 11555
"""
from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if length <= 0:
        return {}
    return json.loads(handler.rfile.read(length).decode("utf-8"))


def _ollama_request(base_url: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="GET" if payload is None else "POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read().decode("utf-8")
    return json.loads(raw) if raw else {}


class ModelControlHandler(BaseHTTPRequestHandler):
    server_version = "SOGICEModelControl/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"{self.address_string()} - {fmt % args}")

    @property
    def token(self) -> str:
        return getattr(self.server, "token", "")

    @property
    def ollama_url(self) -> str:
        return getattr(self.server, "ollama_url", "http://127.0.0.1:11434")

    def _authorized(self) -> bool:
        if not self.token:
            return True
        return self.headers.get("Authorization", "") == f"Bearer {self.token}"

    def _guard(self) -> bool:
        if self._authorized():
            return True
        _json_response(self, 401, {"ok": False, "error": "unauthorized"})
        return False

    def do_GET(self) -> None:
        if not self._guard():
            return
        try:
            if self.path == "/health":
                _json_response(self, 200, {"ok": True})
            elif self.path == "/api/tags":
                _json_response(self, 200, _ollama_request(self.ollama_url, "/api/tags"))
            elif self.path == "/api/ps":
                _json_response(self, 200, _ollama_request(self.ollama_url, "/api/ps"))
            else:
                _json_response(self, 404, {"ok": False, "error": "not_found"})
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            _json_response(self, 502, {"ok": False, "error": str(exc)})

    def do_POST(self) -> None:
        if not self._guard():
            return
        try:
            payload = _read_json(self)
            if self.path != "/unload":
                _json_response(self, 404, {"ok": False, "error": "not_found"})
                return
            model = str(payload.get("model", "")).strip()
            if not model:
                _json_response(self, 400, {"ok": False, "error": "model required"})
                return
            response = _ollama_request(
                self.ollama_url,
                "/api/generate",
                {"model": model, "keep_alive": 0, "stream": False},
            )
            _json_response(self, 200, {
                "ok": response.get("done_reason") == "unload",
                "model": model,
                "ollama": response,
            })
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            _json_response(self, 502, {"ok": False, "error": str(exc)})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=os.getenv("MODEL_CONTROL_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("MODEL_CONTROL_PORT", "11555")))
    parser.add_argument("--ollama-url", default=os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"))
    args = parser.parse_args()

    server = ReusableThreadingHTTPServer((args.host, args.port), ModelControlHandler)
    server.token = os.getenv("MODEL_CONTROL_TOKEN", "")
    server.ollama_url = args.ollama_url
    print(f"Model control listening on http://{args.host}:{args.port}")
    print(f"Ollama target: {args.ollama_url}")
    print("Token required: " + ("yes" if server.token else "no"))
    server.serve_forever()


if __name__ == "__main__":
    main()
