from __future__ import annotations

from types import SimpleNamespace

from runner.pipeline import embed


class _Response:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {"data": [{"embedding": [0.1, 0.2, 0.3]}]}


def test_litelm_embedding_uses_patient_retry_policy(monkeypatch):
    captured: dict = {}

    def fake_retry(fn, *, attempts=3, backoff_seconds=1.0, sleep_fn=None):
        captured["attempts"] = attempts
        captured["backoff_seconds"] = backoff_seconds
        return fn()

    def fake_post(url, *, headers, json, timeout):
        captured["url"] = url
        captured["model"] = json["model"]
        captured["timeout"] = timeout
        return _Response()

    monkeypatch.setattr(embed, "call_with_http_retries", fake_retry)
    monkeypatch.setattr(embed.httpx, "post", fake_post)

    config = SimpleNamespace(
        litelm_base_url="http://127.0.0.1:4000",
        litelm_api_key="sk-test",
        litelm_embedding_model="research-embedding",
    )

    assert embed.run_litelm("text", config) == [0.1, 0.2, 0.3]
    assert captured["url"] == "http://127.0.0.1:4000/v1/embeddings"
    assert captured["model"] == "research-embedding"
    assert captured["timeout"] == 120
    assert captured["attempts"] == 5
    assert captured["backoff_seconds"] == 5.0
