"""EDA: summary stats, missingness, correlation, Plotly chart specs."""

from __future__ import annotations

import json
from typing import Any

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.io as pio

from app.ml.categorical_analysis import (
    analyze_categorical_completeness,
    create_sample_encoding_preview,
    detect_categorical_columns,
    get_encoding_summary,
)


def eda_report(df: pd.DataFrame, target: str | None = None, max_hist: int = 6) -> dict[str, Any]:
    numeric_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != target][:max_hist]
    summary = df.describe(include="all").replace({np.nan: None}).to_dict()
    missing = []
    for c in df.columns:
        na = int(df[c].isna().sum())
        if na:
            missing.append({"column": c, "count": na, "pct": round(100 * na / max(len(df), 1), 2)})

    corr_df = df.select_dtypes(include=[np.number])
    if target and target in corr_df.columns:
        corr_df = corr_df.drop(columns=[target], errors="ignore")
    labels = list(corr_df.columns)
    if len(labels) > 1:
        c = corr_df.corr().fillna(0.0)
        mat = c.values.astype(float).copy()
        np.fill_diagonal(mat, 1.0)
        z = mat.tolist()
    else:
        z = [[1.0]]

    histograms = []
    for c in numeric_cols:
        vals = df[c].dropna().astype(float).tolist()
        if vals:
            histograms.append({"title": c, "x": vals})

    boxplots = []
    for c in numeric_cols[:4]:
        vals = df[c].dropna().astype(float).tolist()
        if vals:
            boxplots.append({"title": c, "y": vals})

    heatmap_json = None
    if len(labels) >= 2:
        fig = go.Figure(
            data=go.Heatmap(z=z, x=labels, y=labels, colorscale="Viridis"),
            layout=dict(title="Correlation", paper_bgcolor="rgba(0,0,0,0)", font=dict(color="#e2e8f0")),
        )
        heatmap_json = json.loads(pio.to_json(fig))

    # Categorical data analysis
    categorical_info = detect_categorical_columns(df, target)
    encoding_summary = get_encoding_summary(df, target)
    encoding_preview = create_sample_encoding_preview(df, target, sample_rows=3)
    categorical_completeness = analyze_categorical_completeness(df, target)

    return {
        "summary": summary,
        "missing_values": missing,
        "correlation": {"z": z, "labels": labels},
        "histograms": histograms,
        "boxplots": boxplots,
        "plotly_correlation_figure": heatmap_json,
        "categorical": {
            "detected_columns": categorical_info,
            "encoding_summary": encoding_summary,
            "preview": encoding_preview,
            "completeness": categorical_completeness,
        },
    }
