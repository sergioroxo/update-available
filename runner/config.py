from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv
import os

_RUNNER_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _RUNNER_DIR.parent


@dataclass(frozen=True)
class FactoryConfig:
    to_studio: Path | None
    from_studio: Path | None
    state_root: Path | None
    job_root: Path | None
    host_role: str
    dry_run_only: bool
    enabled: bool
    problems: tuple[str, ...]
    production_canary_enabled: bool = False
    maximum_copied_text_bytes: int = 1_048_576
    macbook_signing_private_key: Path | None = None
    studio_command_public_keys: tuple[Path, ...] = ()
    studio_receipt_signing_private_key: Path | None = None
    macbook_receipt_public_keys: tuple[Path, ...] = ()
    service_log_root: Path | None = None
    service_poll_seconds: float = 5.0
    launch_agent_label: str = "org.survivingsogice.factory"
    launch_agent_plist_output: Path | None = None
    production_ready: bool = False
    production_problems: tuple[str, ...] = ()


def _paths_overlap(left: Path, right: Path) -> bool:
    a, b = left.expanduser().resolve(), right.expanduser().resolve()
    try:
        a.relative_to(b)
        return True
    except ValueError:
        try:
            b.relative_to(a)
            return True
        except ValueError:
            return False


def load_factory_config(source: dict[str, str] | None = None) -> FactoryConfig:
    """Load an opt-in synthetic factory boundary without discovering live data."""
    if source is None:
        _refresh_dotenv()
    env = os.environ if source is None else source
    names = (
        "SOGICE_FACTORY_TO_STUDIO", "SOGICE_FACTORY_FROM_STUDIO",
        "SOGICE_FACTORY_STATE_ROOT", "SOGICE_FACTORY_JOB_ROOT",
    )
    values = [env.get(name, "").strip() for name in names]
    paths = [Path(value).expanduser() if value else None for value in values]
    role = env.get("SOGICE_FACTORY_HOST_ROLE", "").strip().lower()
    dry = env.get("SOGICE_FACTORY_DRY_RUN_ONLY", "").strip().lower() in {
        "1", "true", "yes", "on",
    }
    production_enabled = env.get(
        "SOGICE_FACTORY_PRODUCTION_CANARY_ENABLED", "",
    ).strip().lower() in {"1", "true", "yes", "on"}
    problems: list[str] = []
    if role not in {"macbook", "mac-studio", "synthetic"}:
        problems.append("Choose this machine's factory role.")
    if any(path is None for path in paths):
        problems.append("Configure all four factory folders.")
    if not dry and not production_enabled:
        problems.append("Dry-run-only protection must be enabled.")
    concrete = [path for path in paths if path is not None]
    for shared in concrete[:2]:
        for local in concrete[2:]:
            if _paths_overlap(shared, local):
                problems.append("Shared and Studio-local folders must not overlap.")
    if len(concrete) >= 2 and _paths_overlap(concrete[0], concrete[1]):
        problems.append("The two directional shared folders must not overlap.")
    try:
        maximum_bytes = int(env.get(
            "SOGICE_FACTORY_MAX_COPIED_TEXT_BYTES", "1048576",
        ).strip())
        if not 1 <= maximum_bytes <= 16 * 1024 * 1024:
            raise ValueError
    except ValueError:
        maximum_bytes = 1_048_576
        problems.append("Copied-text size limit must be between 1 byte and 16 MiB.")

    def absolute_optional(name: str) -> Path | None:
        value = env.get(name, "").strip()
        if not value:
            return None
        candidate = Path(value).expanduser()
        if not candidate.is_absolute():
            problems.append(f"{name} must be an absolute host-local path.")
        return candidate

    def absolute_list(name: str) -> tuple[Path, ...]:
        values = tuple(item.strip() for item in env.get(name, "").split(",") if item.strip())
        result = tuple(Path(item).expanduser() for item in values)
        if any(not item.is_absolute() for item in result):
            problems.append(f"{name} must contain only absolute host-local paths.")
        return result

    macbook_private = absolute_optional("SOGICE_FACTORY_MACBOOK_SIGNING_PRIVATE_KEY")
    studio_public = absolute_list("SOGICE_FACTORY_STUDIO_COMMAND_PUBLIC_KEYS")
    studio_private = absolute_optional("SOGICE_FACTORY_STUDIO_RECEIPT_SIGNING_PRIVATE_KEY")
    macbook_public = absolute_list("SOGICE_FACTORY_MACBOOK_RECEIPT_PUBLIC_KEYS")
    service_log_root = absolute_optional("SOGICE_FACTORY_SERVICE_LOG_ROOT")
    launch_output = absolute_optional("SOGICE_FACTORY_LAUNCH_AGENT_PLIST_OUTPUT")
    try:
        poll_seconds = float(env.get("SOGICE_FACTORY_SERVICE_POLL_SECONDS", "5").strip())
        if not 0.1 <= poll_seconds <= 300:
            raise ValueError
    except ValueError:
        poll_seconds = 5.0
        problems.append("Factory service polling must be between 0.1 and 300 seconds.")
    launch_label = env.get(
        "SOGICE_FACTORY_LAUNCH_AGENT_LABEL", "org.survivingsogice.factory",
    ).strip()
    if (
        not launch_label or len(launch_label) > 200
        or any(character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-" for character in launch_label)
    ):
        problems.append("Factory LaunchAgent label is invalid.")

    production_problems: list[str] = []
    if not production_enabled:
        production_problems.append("Copied-text canary support is not enabled.")
    if role in {"macbook", "synthetic"}:
        if macbook_private is None:
            production_problems.append("MacBook command signing key is not configured.")
        if not macbook_public:
            production_problems.append("MacBook receipt verification keys are not configured.")
    if role in {"mac-studio", "synthetic"}:
        if not studio_public:
            production_problems.append("Mac Studio command verification keys are not configured.")
        if studio_private is None:
            production_problems.append("Mac Studio receipt signing key is not configured.")
        if service_log_root is None:
            production_problems.append("Mac Studio service log folder is not configured.")
    shared_roots = tuple(path for path in paths[:2] if path is not None)
    local_sensitive = tuple(
        path for path in (
            macbook_private, studio_private, service_log_root, launch_output,
            *studio_public, *macbook_public,
        ) if path is not None
    )
    for sensitive in local_sensitive:
        if any(_paths_overlap(sensitive, shared) for shared in shared_roots):
            production_problems.append("Keys, logs, and service files must remain outside shared folders.")
    for private in (macbook_private, studio_private):
        if private is not None:
            if not private.exists():
                production_problems.append("Configured private key file does not exist.")
            elif private.is_symlink() or not private.is_file() or private.stat().st_mode & 0o077:
                production_problems.append("Configured private key must be a regular 0600 host-local file.")
    for public in (*studio_public, *macbook_public):
        if not public.exists() or public.is_symlink() or not public.is_file():
            production_problems.append("Configured public verification key file does not exist.")
    return FactoryConfig(
        to_studio=paths[0], from_studio=paths[1], state_root=paths[2],
        job_root=paths[3], host_role=role or "unconfigured",
        dry_run_only=dry, enabled=not problems, problems=tuple(dict.fromkeys(problems)),
        production_canary_enabled=production_enabled,
        maximum_copied_text_bytes=maximum_bytes,
        macbook_signing_private_key=macbook_private,
        studio_command_public_keys=studio_public,
        studio_receipt_signing_private_key=studio_private,
        macbook_receipt_public_keys=macbook_public,
        service_log_root=service_log_root,
        service_poll_seconds=poll_seconds,
        launch_agent_label=launch_label,
        launch_agent_plist_output=launch_output,
        production_ready=bool(production_enabled and not production_problems and not problems),
        production_problems=tuple(dict.fromkeys(production_problems)),
    )


def _refresh_dotenv() -> None:
    """Reload project env files so Streamlit reruns pick up edits.

    ``runner/.env`` is the normal local configuration file for this project.
    Streamlit keeps one Python process alive across reruns, so relying on a
    module-import-time ``load_dotenv()`` leaves old LaunchAgent/shell values in
    place after the user edits ``runner/.env``. Refreshing here makes the app
    reflect the file on reload. During pytest, monkeypatched environment values
    should stay authoritative.
    """
    if "PYTEST_CURRENT_TEST" in os.environ:
        return
    load_dotenv(_PROJECT_ROOT / ".env", override=False)
    load_dotenv(_RUNNER_DIR / ".env", override=True)


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
    sanity_read_token: str = ""        # optional read-only Sanity token for GROQ queries
    litelm_ollama_base_url: str = ""        # optional direct Ollama URL for model unloads
    mac_studio_model_control_url: str = ""  # optional tiny control service for safe unloads
    mac_studio_model_control_token: str = "" # optional bearer token for the control service
    litelm_ollama_triage_model: str = "gemma4:12b-mlx" # actual Ollama model behind triage
    litelm_ollama_embedding_model: str = "qwen3-embedding:8b" # actual Ollama model behind research-embedding
    litelm_ollama_analysis_model: str = "qwen3.6:35b-mlx"
    litelm_ollama_analysis_model_heavy: str = "gemma4:31b-mlx"
    litelm_ollama_analysis_model_reasoning: str = "qwen3.6:27b-mlx"

    # Truncation limits (chars). Claude default is conservative due to API cost.
    # Local models have large context windows so LOCAL_TRUNCATION_LIMIT can be
    # set much higher (e.g. 200000) for full SRT / book ingestion.
    truncation_limit: int = 24000
    truncation_limit_local: int = 1000000
    # End-aware truncation head/tail sizes (chars). When a document exceeds the
    # truncation_limit, the pipeline preserves the first head_chars and last
    # tail_chars with a [TRUNCATED MIDDLE] marker between them.
    truncation_head_chars: int = 16000
    truncation_tail_chars: int = 6000
    local_context_tokens: int = 262144
    local_output_tokens: int = 16384
    claude_output_tokens: int = 8192
    media_collect_comments: bool = False
    media_max_comments: int = 50
    media_allow_whisper: bool = True
    wayback_enabled: bool = True

    @property
    def sanity_api_base(self) -> str:
        return f"https://{self.sanity_project_id}.api.sanity.io/v2024-01-01/data/mutate/{self.sanity_dataset}"

    @property
    def source_queue_db_path(self) -> Path:
        """SQLite queue DB — adjacent to the corpus directory."""
        return self.corpus_dir.parent / "source_queue.db"

    def __repr__(self) -> str:
        return (
            "Config("
            f"sanity_project_id={self.sanity_project_id!r}, "
            f"sanity_dataset={self.sanity_dataset!r}, "
            f"corpus_dir={self.corpus_dir!r}, "
            f"exports_dir={self.exports_dir!r}"
            ")"
        )


def load_config(llm: str | None = None, require_services: bool = True) -> Config:
    """Load config. Only validates LLM-specific keys when llm is set.
    upload-doc / status / export never need an LLM key — pass llm=None.
    Local review commands can pass require_services=False to avoid requiring
    Sanity/Supabase credentials for purely filesystem work."""

    _refresh_dotenv()

    always_required = ["SANITY_PROJECT_ID", "SANITY_DATASET",
                       "SANITY_WRITE_TOKEN", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]
    needs_claude     = llm in ("claude", "prefer-claude", "both")
    needs_openrouter = llm == "openrouter"
    needs_litelm     = llm is not None and llm.startswith("litelm")

    missing = []
    if require_services:
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
        sanity_project_id=os.getenv("SANITY_PROJECT_ID", ""),
        sanity_dataset=os.getenv("SANITY_DATASET", ""),
        sanity_write_token=os.getenv("SANITY_WRITE_TOKEN", ""),
        sanity_read_token=os.getenv("SANITY_READ_TOKEN", ""),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_service_key=os.getenv("SUPABASE_SERVICE_KEY", ""),
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
        mac_studio_model_control_url=os.getenv("MAC_STUDIO_MODEL_CONTROL_URL", ""),
        mac_studio_model_control_token=os.getenv("MAC_STUDIO_MODEL_CONTROL_TOKEN", ""),
        litelm_ollama_triage_model=os.getenv("LITELM_OLLAMA_TRIAGE_MODEL", "gemma4:12b-mlx"),
        litelm_ollama_embedding_model=os.getenv("LITELM_OLLAMA_EMBEDDING_MODEL", "qwen3-embedding:8b"),
        litelm_ollama_analysis_model=os.getenv("LITELM_OLLAMA_ANALYSIS_MODEL", "qwen3.6:35b-mlx"),
        litelm_ollama_analysis_model_heavy=os.getenv("LITELM_OLLAMA_ANALYSIS_MODEL_HEAVY", "gemma4:31b-mlx"),
        litelm_ollama_analysis_model_reasoning=os.getenv("LITELM_OLLAMA_ANALYSIS_MODEL_REASONING", "qwen3.6:27b-mlx"),
        truncation_limit=int(os.getenv("TRUNCATION_LIMIT", "24000")),
        truncation_limit_local=int(os.getenv("TRUNCATION_LIMIT_LOCAL", "1000000")),
        truncation_head_chars=int(os.getenv("TRUNCATION_HEAD_CHARS", "16000")),
        truncation_tail_chars=int(os.getenv("TRUNCATION_TAIL_CHARS", "6000")),
        local_context_tokens=int(os.getenv("LOCAL_CONTEXT_TOKENS", "262144")),
        local_output_tokens=int(os.getenv("LOCAL_OUTPUT_TOKENS", "16384")),
        claude_output_tokens=int(os.getenv("CLAUDE_OUTPUT_TOKENS", "8192")),
        media_collect_comments=os.getenv("MEDIA_COLLECT_COMMENTS", "").lower() in {"1", "true", "yes"},
        media_max_comments=int(os.getenv("MEDIA_MAX_COMMENTS", "50")),
        media_allow_whisper=os.getenv("MEDIA_ALLOW_WHISPER", "true").lower() not in {"0", "false", "no"},
        wayback_enabled=os.getenv("WAYBACK_ENABLED", "true").lower() not in ("false", "0", "no"),
    )
