"""Preprocessing: missing values, duplicates, IQR outliers, encoding, scaling."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def drop_duplicates_df(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop_duplicates().reset_index(drop=True)


def clip_numeric_iqr(df: pd.DataFrame, numeric_cols: list[str], factor: float = 1.5) -> pd.DataFrame:
    out = df.copy()
    for c in numeric_cols:
        if c not in out.columns:
            continue
        s = pd.to_numeric(out[c], errors="coerce")
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        if not np.isfinite(iqr) or iqr == 0:
            continue
        low, high = q1 - factor * iqr, q3 + factor * iqr
        out[c] = s.clip(lower=low, upper=high)
    return out


def infer_feature_columns(
    df: pd.DataFrame, target: str, max_unique_numeric: int = 10
) -> tuple[list[str], list[str], list[str]]:
    """
    Infer feature columns as numeric or categorical.
    
    A numeric column with few unique values (≤ max_unique_numeric) is treated as categorical.
    This handles cases where integers represent categories (e.g., 0/1, 1-5 ratings).
    """
    cols = [c for c in df.columns if c != target]
    numeric, categorical = [], []
    
    for c in cols:
        if pd.api.types.is_numeric_dtype(df[c]):
            # Check if numeric column has low cardinality (might be categorical)
            unique_count = df[c].nunique()
            if unique_count <= max_unique_numeric:
                # Treat low-cardinality numeric columns as categorical
                categorical.append(c)
            else:
                numeric.append(c)
        else:
            # Non-numeric columns are categorical
            categorical.append(c)
    
    return cols, numeric, categorical


def get_cardinality_info(df: pd.DataFrame, categorical_cols: list[str]) -> dict[str, int]:
    """Get the number of unique values for each categorical column."""
    return {col: df[col].nunique() for col in categorical_cols if col in df.columns}


def build_sklearn_preprocessor(
    numeric_features: list[str],
    categorical_features: list[str],
    scaling: str = "standard",
) -> ColumnTransformer:
    """
    Build a preprocessing pipeline with support for different encoding strategies.
    
    - Numeric features: imputation + optional scaling
    - Categorical features: imputation + one-hot encoding (handles both binary and multi-class)
    
    Args:
        numeric_features: List of numeric column names
        categorical_features: List of categorical column names
        scaling: Scaling strategy ('standard', 'minmax', or 'none')
    """
    if scaling == "none":
        num_pipe = Pipeline([("imputer", SimpleImputer(strategy="mean"))])
    else:
        scalers: list = [("imputer", SimpleImputer(strategy="mean"))]
        if scaling == "standard":
            scalers.append(("scaler", StandardScaler()))
        elif scaling == "minmax":
            from sklearn.preprocessing import MinMaxScaler
            scalers.append(("scaler", MinMaxScaler()))
        else:
            scalers.append(("scaler", StandardScaler()))
        num_pipe = Pipeline(scalers)

    # Categorical pipeline: one-hot encoding handles both binary and multi-class
    cat_pipe = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False, max_categories=25)),
        ]
    )

    transformers: list[tuple[str, Pipeline, list[str]]] = []
    if numeric_features:
        transformers.append(("num", num_pipe, numeric_features))
    if categorical_features:
        transformers.append(("cat", cat_pipe, categorical_features))

    if not transformers:
        raise ValueError("No feature columns after excluding target.")

    return ColumnTransformer(transformers=transformers, remainder="drop", verbose_feature_names_out=False)


def prepare_xy(
    df: pd.DataFrame,
    target: str,
    options: dict[str, Any] | None = None,
) -> tuple[pd.DataFrame, pd.Series, list[str], list[str]]:
    opts = options or {}
    if target not in df.columns:
        raise ValueError(f"Target column '{target}' not found.")

    df = drop_duplicates_df(df)
    df = df.dropna(subset=[target])
    y = df[target]
    X = df.drop(columns=[target])

    _, numeric, categorical = infer_feature_columns(
        pd.concat([X, y.rename(target)], axis=1), target
    )

    if opts.get("missing_value_strategy") == "drop":
        mask = X.notna().all(axis=1)
        X = X.loc[mask]
        y = y.loc[mask]

    if opts.get("outliers", True) is not False:
        X = clip_numeric_iqr(X, numeric)

    return X, y, numeric, categorical
