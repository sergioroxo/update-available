import json
import sqlite3
from pathlib import Path
from types import SimpleNamespace

from typer.testing import CliRunner

from runner import main
from runner.pipeline import pdf_asset_index


def _config(path: Path, roots: list[dict]) -> Path:
    path.write_text(json.dumps({"roots": roots}), encoding="utf-8")
    return path


def test_inventory_is_metadata_only_and_does_not_change_source_files(tmp_path):
    root = tmp_path / "approved"
    nested = root / "country"
    nested.mkdir(parents=True)
    pdf = nested / "source.pdf"
    original = b"not opened in inventory mode"
    pdf.write_bytes(original)
    config = _config(tmp_path / "roots.json", [{"label": "Approved", "path": str(root)}])

    result = pdf_asset_index.scan_pdf_index(config)

    assert result["pdfs"] == 1
    assert result["hashed"] == 0
    assert result["written"] is False
    assert pdf.read_bytes() == original


def test_dataless_flag_detection_is_explicit():
    assert pdf_asset_index._is_dataless(SimpleNamespace(st_flags=pdf_asset_index.SF_DATALESS))
    assert not pdf_asset_index._is_dataless(SimpleNamespace(st_flags=0))


def test_write_inventory_creates_database_only_and_tracks_missing_paths(tmp_path):
    root = tmp_path / "approved"
    root.mkdir()
    first = root / "first.pdf"
    second = root / "second.pdf"
    first.write_bytes(b"first")
    second.write_bytes(b"second")
    config = _config(tmp_path / "roots.json", [{"label": "Approved", "path": str(root)}])
    db_path = tmp_path / "index" / "assets.sqlite3"

    first_run = pdf_asset_index.scan_pdf_index(config, db_path=db_path, write=True)
    second.unlink()
    second_run = pdf_asset_index.scan_pdf_index(config, db_path=db_path, write=True)

    assert first_run["pdfs"] == 2
    assert second_run["pdfs"] == 1
    assert first.exists()
    with sqlite3.connect(db_path) as db:
        rows = dict(db.execute("SELECT filename,present FROM pdf_files").fetchall())
        runs = db.execute("SELECT COUNT(*) FROM pdf_scan_runs").fetchone()[0]
    assert rows == {"first.pdf": 1, "second.pdf": 0}
    assert runs == 2


def test_inspect_local_hashes_without_copying(tmp_path):
    root = tmp_path / "approved"
    root.mkdir()
    pdf = root / "damaged.pdf"
    pdf.write_bytes(b"pdf-like source bytes")
    config = _config(tmp_path / "roots.json", [{"label": "Approved", "path": str(root)}])

    result = pdf_asset_index.scan_pdf_index(config, inspect_local=True)
    records, _ = pdf_asset_index.inventory_roots(
        pdf_asset_index.load_roots(config), inspect_local=True,
    )

    assert result["hashed"] == 1
    assert records[0].sha256
    assert records[0].inspection_status == "inspection_failed"
    assert list(root.iterdir()) == [pdf]


def test_root_config_rejects_duplicates(tmp_path):
    root = tmp_path / "approved"
    config = _config(tmp_path / "roots.json", [
        {"label": "One", "path": str(root)},
        {"label": "Two", "path": str(root)},
    ])
    try:
        pdf_asset_index.load_roots(config)
    except ValueError as exc:
        assert "Duplicate PDF root" in str(exc)
    else:
        raise AssertionError("duplicate roots must fail closed")


def test_cli_defaults_to_dry_run(monkeypatch, tmp_path):
    root = tmp_path / "approved"
    root.mkdir()
    (root / "source.pdf").write_bytes(b"source")
    roots = _config(tmp_path / "roots.json", [{"label": "Approved", "path": str(root)}])
    exports = tmp_path / "exports"
    config = SimpleNamespace(exports_dir=exports)
    monkeypatch.setattr(main, "load_config", lambda **kwargs: config)

    result = CliRunner().invoke(main.app, ["pdf-index", "--roots", str(roots)])

    assert result.exit_code == 0
    assert "Dry run only" in result.stdout
    assert "No PDF was copied, moved, renamed, or deleted" in result.stdout
    assert not exports.exists()
