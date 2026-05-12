from dataclasses import dataclass

from runner.pipeline import sanity_reads


@dataclass
class _Config:
    sanity_project_id: str = "project"
    sanity_dataset: str = "dataset"
    sanity_read_token: str = ""


class _Response:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_sanity_read_headers_uses_read_token_only():
    assert sanity_reads.sanity_read_headers(_Config()) == {}
    assert sanity_reads.sanity_read_headers(_Config(sanity_read_token="read-token")) == {
        "Authorization": "Bearer read-token"
    }


def test_fetch_active_lexicon_terms_uses_cache_and_read_token(monkeypatch):
    sanity_reads.clear_lexicon_cache()
    calls = []

    def fake_get(url, params, headers, timeout):
        calls.append({"url": url, "params": params, "headers": headers, "timeout": timeout})
        return _Response({"result": [{"term": "pastoral care"}]})

    import httpx

    monkeypatch.setattr(httpx, "get", fake_get)
    config = _Config(sanity_read_token="read-token")

    first = sanity_reads.fetch_active_lexicon_terms(config)
    second = sanity_reads.fetch_active_lexicon_terms(config)

    assert first == [{"term": "pastoral care"}]
    assert second == first
    assert len(calls) == 1
    assert calls[0]["headers"] == {"Authorization": "Bearer read-token"}
