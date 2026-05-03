from dataclasses import dataclass

from runner.clients import supabase
from runner.models.document import AnalysisResult


@dataclass
class _Config:
    embedding_model: str = "qwen3-embedding:8b"


class _Execute:
    def execute(self):
        return None


class _FakeTable:
    def __init__(self):
        self.payload = None

    def upsert(self, payload):
        self.payload = payload
        return _Execute()


class _FakeClient:
    def __init__(self):
        self.table_name = None
        self.table_obj = _FakeTable()
        self.rpc_name = None
        self.rpc_params = None

    def table(self, name):
        self.table_name = name
        return self.table_obj

    def rpc(self, name, params):
        self.rpc_name = name
        self.rpc_params = params
        return _Execute()


def _analysis() -> AnalysisResult:
    return AnalysisResult.model_validate(
        {
            "type": "Anti-SOGICE",
            "format": "Blog-Post",
            "evidence": ["The document discusses opposition to conversion therapy."],
            "scope": "Core",
            "narrative_register": "Legal-Policy",
            "summary": "A short summary.",
        }
    )


def test_upsert_embedding_uses_4096_table_payload(monkeypatch):
    client = _FakeClient()
    monkeypatch.setattr(supabase, "_client", lambda _config: client)

    supabase.upsert_embedding(
        "doc-1",
        [0.1, 0.2],
        _analysis(),
        _Config(),
        tier="2",
        language="en",
        embedding_model="custom-embedding",
    )

    assert client.table_name == "document_embeddings"
    assert client.table_obj.payload == {
        "doc_id": "doc-1",
        "embedding": [0.1, 0.2],
        "doc_type": "Anti-SOGICE",
        "scope": "Core",
        "tier": "2",
        "language": "en",
        "embedding_model": "custom-embedding",
    }


def test_migrate_document_embeddings_uses_exec_sql_rpc(monkeypatch):
    client = _FakeClient()
    monkeypatch.setattr(supabase, "_client", lambda _config: client)

    supabase.migrate_document_embeddings(_Config())

    assert client.rpc_name == "exec_sql"
    assert client.rpc_params["sql"] == supabase.MIGRATE_DOCUMENT_EMBEDDINGS_SQL
    assert "vector(4096)" in client.rpc_params["sql"]
