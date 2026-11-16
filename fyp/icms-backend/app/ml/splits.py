"""Train/test split helpers (stratify only when valid for sklearn)."""

from __future__ import annotations

import pandas as pd


def classification_stratify(y: pd.Series) -> pd.Series | None:
    """Return y for stratify=... or None if stratification is not valid."""
    if y is None or len(y) == 0:
        return None
    vc = y.value_counts()
    if len(vc) < 2:
        return None
    if bool((vc < 2).any()):
        return None
    return y
