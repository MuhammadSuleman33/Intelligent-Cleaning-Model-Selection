"""Optional SHAP explanations for tree / linear models."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def try_shap_summary(
    fitted_pipeline: Any,
    X_sample: pd.DataFrame,
    task: str,
    max_samples: int = 200,
) -> dict[str, Any] | None:
    try:
        import shap
    except ImportError:
        return None

    if fitted_pipeline is None:
        return None

    try:
        prep = fitted_pipeline.named_steps.get("prep")
        clf = fitted_pipeline.named_steps.get("clf")
        if prep is None or clf is None:
            return None
        X_t = prep.transform(X_sample.head(max_samples))
        feat_names = prep.get_feature_names_out()
        if hasattr(clf, "feature_importances_"):
            explainer = shap.TreeExplainer(clf)
            sv = explainer.shap_values(X_t)
            if isinstance(sv, list):
                sv = sv[0]
            mean_abs = np.abs(sv).mean(axis=0)
            order = np.argsort(mean_abs)[::-1][:20]
            return {
                "features": [str(feat_names[i]) for i in order],
                "values": [float(mean_abs[i]) for i in order],
            }
        if task == "regression":
            explainer = shap.LinearExplainer(clf, X_t)
            sv = explainer.shap_values(X_t)
            mean_abs = np.abs(sv).mean(axis=0)
            order = np.argsort(mean_abs)[::-1][:20]
            return {
                "features": [str(feat_names[i]) for i in order],
                "values": [float(mean_abs[i]) for i in order],
            }
    except Exception as e:
        logger.info("SHAP skipped: %s", e)
    return None
