from pathlib import Path

from runner.pipeline.seed import parse_lexicon_md, parse_multilingual_variants_md


ROOT = Path(__file__).resolve().parents[1]
LEXICON = ROOT / "00_infrastructure" / "SOGICE_Lexicon_v2.1.md"


def test_gender_dysphoria_seed_entry_is_available_as_canonical_reference():
    rows = parse_lexicon_md(LEXICON)

    entry = next(row for row in rows if row["term"] == "Gender Dysphoria")

    assert entry["proposed_cluster"] == "Non-SOGICE"
    assert entry["function"] == "Unknown"
    assert "Clinical/reference term" in entry["definition"]
    assert "ROGD" in entry["related"]


def test_gender_dysphoria_multilingual_variants_share_one_canonical_id():
    variants = [
        row
        for row in parse_multilingual_variants_md(LEXICON)
        if row["canonical_term"] == "Gender Dysphoria"
    ]

    assert len(variants) == 11
    assert {row["canonical_id"] for row in variants} == {"lexicon-gender-dysphoria"}
    assert {row["language"] for row in variants} == {
        "de",
        "el",
        "es",
        "fi",
        "fr",
        "hu",
        "it",
        "mt",
        "no",
        "pl",
        "sv",
    }
    assert "dysforia płciowa" in {row["variant_term"] for row in variants}
