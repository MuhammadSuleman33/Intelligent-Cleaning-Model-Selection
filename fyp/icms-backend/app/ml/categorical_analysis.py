"""Categorical data analysis and encoding strategy selection."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def detect_categorical_columns(
    df: pd.DataFrame, target: str | None = None, max_unique_numeric: int = 10
) -> dict[str, Any]:
    """
    Detect categorical columns using multiple strategies.
    Returns info about each column's cardinality and suggested encoding.
    """
    categorical_info = {}
    
    for col in df.columns:
        if col == target:
            continue
        
        # Skip numeric columns with high cardinality
        if pd.api.types.is_numeric_dtype(df[col]):
            # Check if numeric column actually contains categorical data (low cardinality)
            unique_count = df[col].nunique()
            if unique_count <= max_unique_numeric:
                # Treat as categorical
                unique_vals = sorted(df[col].dropna().unique().tolist())
                categorical_info[col] = {
                    "type": "numeric_categorical",
                    "dtype": str(df[col].dtype),
                    "cardinality": unique_count,
                    "unique_values": unique_vals[:20],  # Show first 20
                    "encoding": "label" if unique_count == 2 else "onehot",
                    "reason": f"Numeric column with {unique_count} unique values (≤ {max_unique_numeric})",
                }
            continue
        
        # String/object columns are categorical
        if df[col].dtype == "object" or df[col].dtype == "category":
            unique_count = df[col].nunique()
            unique_vals = sorted(df[col].dropna().astype(str).unique().tolist())
            
            categorical_info[col] = {
                "type": "string_categorical",
                "dtype": str(df[col].dtype),
                "cardinality": unique_count,
                "unique_values": unique_vals[:20],  # Show first 20
                "encoding": "label" if unique_count == 2 else "onehot",
                "reason": f"String/categorical column with {unique_count} unique values",
            }
    
    return categorical_info


def get_encoding_summary(df: pd.DataFrame, target: str | None = None) -> dict[str, Any]:
    """
    Analyze categorical data and suggest encoding strategy.
    Returns comprehensive analysis for frontend display.
    """
    cat_info = detect_categorical_columns(df, target)
    
    if not cat_info:
        return {
            "has_categorical": False,
            "total_categorical": 0,
            "columns": {},
            "summary": "No categorical columns detected.",
        }
    
    label_encoded = []
    onehot_encoded = []
    
    for col, info in cat_info.items():
        if info["encoding"] == "label":
            label_encoded.append(col)
        else:
            onehot_encoded.append(col)
    
    return {
        "has_categorical": True,
        "total_categorical": len(cat_info),
        "columns": cat_info,
        "encoding_plan": {
            "label_encoding": label_encoded,
            "onehot_encoding": onehot_encoded,
        },
        "summary": (
            f"Found {len(cat_info)} categorical column(s). "
            f"{len(label_encoded)} will use label encoding, {len(onehot_encoded)} will use one-hot encoding."
        ),
    }


def create_sample_encoding_preview(
    df: pd.DataFrame, target: str | None = None, sample_rows: int = 5
) -> dict[str, Any]:
    """
    Create a before/after preview of categorical transformations.
    Shows sample rows with original and encoded values.
    """
    cat_info = detect_categorical_columns(df, target)
    
    if not cat_info:
        return {
            "has_preview": False,
            "message": "No categorical columns to preview.",
        }
    
    # Take sample of data
    sample_df = df.sample(n=min(sample_rows, len(df)), random_state=42)
    
    preview = {
        "has_preview": True,
        "sample_size": len(sample_df),
        "original_data": {},
        "encoded_data": {},
        "transformations": {},
    }
    
    # Show original data for categorical columns
    for col in cat_info.keys():
        if col in sample_df.columns:
            preview["original_data"][col] = sample_df[col].astype(str).tolist()
    
    # Generate encoded versions
    for col, info in cat_info.items():
        if col not in sample_df.columns:
            continue
        
        if info["encoding"] == "label":
            # Label encode: map categories to integers
            unique_vals = sorted(sample_df[col].dropna().astype(str).unique().tolist())
            mapping = {val: i for i, val in enumerate(unique_vals)}
            encoded = sample_df[col].astype(str).map(mapping).fillna(-1).astype(int).tolist()
            
            preview["encoded_data"][f"{col}_label"] = encoded
            preview["transformations"][col] = {
                "encoding_type": "label_encoding",
                "mapping": mapping,
                "description": "Converts categories to integers (0, 1, 2, ...)",
            }
        else:
            # One-hot encode: show which categories are present
            unique_vals = sorted(sample_df[col].dropna().astype(str).unique().tolist())
            for cat in unique_vals[:5]:  # Show first 5 categories
                col_name = f"{col}_{cat}"
                encoded = (sample_df[col].astype(str) == cat).astype(int).tolist()
                preview["encoded_data"][col_name] = encoded
            
            preview["transformations"][col] = {
                "encoding_type": "onehot_encoding",
                "categories": unique_vals[:5],
                "total_categories": len(unique_vals),
                "description": "Creates binary columns for each category",
            }
    
    return preview


def analyze_categorical_completeness(df: pd.DataFrame, target: str | None = None) -> dict[str, Any]:
    """
    Analyze missing values and data completeness for categorical columns.
    """
    cat_info = detect_categorical_columns(df, target)
    
    completeness = {}
    for col in cat_info.keys():
        if col not in df.columns:
            continue
        
        total = len(df)
        non_null = df[col].notna().sum()
        missing = total - non_null
        missing_pct = round(100 * missing / max(total, 1), 2)
        
        completeness[col] = {
            "total": int(total),
            "non_null": int(non_null),
            "missing": int(missing),
            "missing_percentage": missing_pct,
            "strategy": "drop_missing" if missing_pct > 50 else "impute_most_frequent",
        }
    
    return {
        "categorical_columns": cat_info,
        "completeness": completeness,
        "needs_attention": [col for col, info in completeness.items() if info["missing_percentage"] > 30],
    }
