from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()


@dataclass
class Config:
    anthropic_api_key: str
    sanity_project_id: str
    sanity_dataset: str
    sanity_write_token: str
    supabase_url: str
    supabase_service_key: str

    corpus_dir: Path
    exports_dir: Path

    ollama_base_url: str
    embedding_model: str
    local_analysis_model: str           # default / quick  (--llm local)
    local_analysis_model_heavy: str     # long docs / rich interpretation (--llm local-heavy)
    local_analysis_model_reasoning: str # ambiguous docs / confidence (--llm local-reasoning)
    claude_model: str
    openrouter_api_key: str
    openrouter_model: str

    # LiteLLM proxy (Mac Studio M2 Ultra via Tailscale)
    litelm_base_url: str
    litelm_api_key: str
    litelm_analysis_model: str         # (--llm litelm)       default: core-qwen
    litelm_analysis_model_heavy: str   # (--llm litelm-heavy) default: core-gemma
    litelm_analysis_model_reasoning: str # (--llm litelm-reasoning) default: review-qwen
    litelm_embedding_model: str        # used when --llm litelm*
    litelm_enrichment_model: str       # Stage 3c lexicon/enrichment model
    litelm_enrichment_model_alt: str   # optional second-opinion enrichment model
    litelm_ollama_base_url: str        # optional direct Ollama URL for model unloads
    litelm_ollama_embedding_model: str # actual Ollama model behind research-embedding
    litelm_ollama_analysis_model: str
    litelm_ollama_analysis_model_heavy: str
    litelm_ollama_analysis_model_reasoning: str

    # Truncation limits (chars). Claude default is conservative due to API cost.
    # Local models have large context windows so LOCAL_TRUNCATION_LIMIT can be
    # set much higher (e.g. 200000) for full SRT / book ingestion.
    truncation_limit: int
    truncation_limit_local: int
    local_context_tokens: int
    local_output_tokens: int

    @property
    def sanity_api_base(self) -> str:
        return f"https://{self.sanity_project_id}.api.sanity.io/v2024-01-01/data/mutate/{self.sanity_dataset}"


def load_config(llm: str | None = None) -> Config:
    """Load config. Only validates LLM-specific keys when llm is set.
    upload-doc / status / export never need an LLM key — pass llm=None."""

    always_required = ["SANITY_PROJECT_ID", "SANITY_DATASET",
                       "SANITY_WRITE_TOKEN", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]
    needs_claude     = llm in ("claude", "prefer-claude", "both")
    needs_openrouter = llm == "openrouter"
    needs_litelm     = llm is not None and llm.startswith("litelm")

    missing = []
    for key in always_required:
        if not os.getenv(key):
            missing.append(key)
    if needs_claude and not os.getenv("ANTHROPIC_API_KEY"):
        missing.append("ANTHROPIC_API_KEY")
    if needs_openrouter and not os.getenv("OPENROUTER_API_KEY"):
        missing.append("OPENROUTER_API_KEY")
    if needs_litelm and not os.getenv("LITELM_BASE_URL"):
        missing.append("LITELM_BASE_URL")

    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            "Copy runner/.env.example to runner/.env and fill in your keys."
        )

    corpus_dir = Path(os.getenv("CORPUS_DIR", "~/Documents/surviving-sogice-corpus")).expanduser()
    exports_dir = Path(os.getenv("EXPORTS_DIR", "~/Documents/surviving-sogice-exports")).expanduser()
    corpus_dir.mkdir(parents=True, exist_ok=True)
    exports_dir.mkdir(parents=True, exist_ok=True)

    return Config(
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        sanity_project_id=os.environ["SANITY_PROJECT_ID"],
        sanity_dataset=os.environ["SANITY_DATASET"],
        sanity_write_token=os.environ["SANITY_WRITE_TOKEN"],
        supabase_url=os.environ["SUPABASE_URL"],
        supabase_service_key=os.environ["SUPABASE_SERVICE_KEY"],
        corpus_dir=corpus_dir,
        exports_dir=exports_dir,
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        embedding_model=os.getenv("EMBEDDING_MODEL", "qwen3-embedding:8b"),
        local_analysis_model=os.getenv("LOCAL_ANALYSIS_MODEL", "qwen3.5:9b"),
        local_analysis_model_heavy=os.getenv("LOCAL_ANALYSIS_MODEL_HEAVY", "gemma-4-26B-A4B-it"),
        local_analysis_model_reasoning=os.getenv("LOCAL_ANALYSIS_MODEL_REASONING", "Ministral-3-14B-Reasoning-2512"),
        claude_model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6"),
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY", ""),
        openrouter_model=os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),
        litelm_base_url=os.getenv("LITELM_BASE_URL", ""),
        litelm_api_key=os.getenv("LITELM_API_KEY", ""),
        litelm_analysis_model=os.getenv("LITELM_ANALYSIS_MODEL", "core-qwen"),
        litelm_analysis_model_heavy=os.getenv("LITELM_ANALYSIS_MODEL_HEAVY", "core-gemma"),
        litelm_analysis_model_reasoning=os.getenv("LITELM_ANALYSIS_MODEL_REASONING", "review-qwen"),
        litelm_embedding_model=os.getenv("LITELM_EMBEDDING_MODEL", "research-embedding"),
        litelm_enrichment_model=os.getenv("LITELM_ENRICHMENT_MODEL", "lexicon-llm"),
        litelm_enrichment_model_alt=os.getenv("LITELM_ENRICHMENT_MODEL_ALT", "core-gemma"),
        litelm_ollama_base_url=os.getenv("LITELM_OLLAMA_BASE_URL", "") or os.getenv("MAC_STUDIO_OLLAMA_URL", ""),
        litelm_ollama_embedding_model=os.getenv("LITELM_OLLAMA_EMBEDDING_MODEL", "qwen3-embedding:8b"),
        litelm_ollama_analysis_model=os.getenv("LITELM_OLLAMA_ANALYSIS_MODEL", "qwen3.6:35b-a3b"),
        litelm_ollama_analysis_model_heavy=os.getenv("LITELM_OLLAMA_ANALYSIS_MODEL_HEAVY", "gemma4:31b"),
        litelm_ollama_analysis_model_reasoning=os.getenv("LITELM_OLLAMA_ANALYSIS_MODEL_REASONING", "qwen3.6:27b"),
        truncation_limit=int(os.getenv("TRUNCATION_LIMIT", "24000")),
        truncation_limit_local=int(os.getenv("TRUNCATION_LIMIT_LOCAL", "1000000")),
        local_context_tokens=int(os.getenv("LOCAL_CONTEXT_TOKENS", "262144")),
        local_output_tokens=int(os.getenv("LOCAL_OUTPUT_TOKENS", "16384")),
    )
