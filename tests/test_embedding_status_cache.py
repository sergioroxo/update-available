"""Tests for P3 — _EmbeddingStatusCache TTL cache."""
import time as _time

from runner.pipeline.upload import _EmbeddingStatusCache


def test_embedding_status_cache_hit():
    """A value set in the cache is returned on the next get within TTL."""
    cache = _EmbeddingStatusCache()
    key = "/corpus/doc-1"
    cache.set(key, {"ok": True})
    result = cache.get(key)
    assert result == {"ok": True}


def test_embedding_status_cache_miss_after_ttl():
    """A value set in the cache is not returned after TTL has expired."""
    cache = _EmbeddingStatusCache()
    key = "/corpus/doc-1"
    cache.set(key, {"ok": True})

    # Manually rewind the stored timestamp past TTL
    ts, val = cache._store[key]
    cache._store[key] = (ts - (cache._TTL + 1), val)

    result = cache.get(key)
    assert result is None
