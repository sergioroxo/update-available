"""Mac Studio-only Streamlit console for source-offload worker packages.

Run on the Mac Studio with:

    .venv/bin/python -m streamlit run runner/mac_studio_worker_app.py

This intentionally does not load the full researcher dashboard or require the
MacBook corpus/Sanity configuration. It imports the shared worker-console render
function from ``runner.app`` so the buttons stay in one implementation.
"""
from __future__ import annotations

import streamlit as st

from runner.app import page_mac_studio_worker


def main() -> None:
    st.set_page_config(
        page_title="Mac Studio Worker",
        page_icon="🖥️",
        layout="wide",
        initial_sidebar_state="collapsed",
    )
    page_mac_studio_worker()


if __name__ == "__main__":
    main()
