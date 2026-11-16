import io
import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.config import get_settings


ALLOWED_EXT = {".csv", ".xlsx", ".xls"}


def validate_upload(filename: str, size_bytes: int) -> None:
    settings = get_settings()
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise ValueError(f"Unsupported format: {ext}. Use CSV or XLSX.")
    max_b = settings.MAX_UPLOAD_MB * 1024 * 1024
    if size_bytes > max_b:
        raise ValueError(f"File too large. Max {settings.MAX_UPLOAD_MB} MB.")


def _read_csv_with_fallback(abs_path: Path) -> pd.DataFrame:
    """
    Attempt to read CSV with multiple encodings.
    Tries encodings in order: utf-8, utf-8-sig, latin-1, cp1252, iso-8859-1.
    If all fail, tries with error='replace' to skip problematic bytes.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "iso-8859-1"]
    last_error: Exception | None = None
    
    for encoding in encodings:
        try:
            df = pd.read_csv(abs_path, encoding=encoding)
            logger.info(f"Successfully read CSV with encoding: {encoding}")
            return df
        except (UnicodeDecodeError, UnicodeError, LookupError) as e:
            last_error = e
            logger.debug(f"Encoding {encoding} failed: {e}")
            continue
        except Exception as e:
            # If parser fails for another reason (not encoding), stop and re-raise.
            raise
    
    # If all encodings fail, try with error='replace' to replace problematic bytes
    try:
        logger.warning(f"All standard encodings failed for {abs_path}, attempting with error='replace'")
        df = pd.read_csv(abs_path, encoding="utf-8", errors="replace")
        logger.info(f"Successfully read CSV with error='replace' fallback")
        return df
    except Exception as e:
        # Last resort: provide detailed error message
        if last_error is not None:
            raise RuntimeError(
                f"Could not read file with any encoding. Last error: {last_error}"
            ) from last_error
        raise


def _read_excel_with_fallback(abs_path: Path) -> pd.DataFrame:
    """
    Attempt to read Excel file with error handling.
    Excel files don't have explicit encoding parameters, but pandas may have issues reading them.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Try default Excel reading
        df = pd.read_excel(abs_path)
        logger.info(f"Successfully read Excel file: {abs_path.name}")
        return df
    except Exception as e:
        logger.warning(f"Failed to read Excel file with default method: {e}")
        # Try with different engine
        try:
            df = pd.read_excel(abs_path, engine='openpyxl')
            logger.info(f"Successfully read Excel file with openpyxl engine")
            return df
        except Exception as e2:
            logger.warning(f"Failed with openpyxl: {e2}")
            # Try xlrd engine for older Excel formats
            try:
                df = pd.read_excel(abs_path, engine='xlrd')
                logger.info(f"Successfully read Excel file with xlrd engine")
                return df
            except Exception as e3:
                raise RuntimeError(
                    f"Could not read Excel file {abs_path.name}. Tried: default (error: {e}), "
                    f"openpyxl (error: {e2}), xlrd (error: {e3})"
                ) from e


def load_dataframe(abs_path: Path) -> pd.DataFrame:
    """
    Load dataframe from CSV or Excel file with robust error handling.
    Automatically tries multiple encodings and engines.
    """
    ext = abs_path.suffix.lower()
    if ext == ".csv":
        return _read_csv_with_fallback(abs_path)
    elif ext in (".xlsx", ".xls"):
        return _read_excel_with_fallback(abs_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}. Supported: CSV, XLSX, XLS")


def build_schema_preview(df: pd.DataFrame, max_rows: int = 8) -> dict[str, Any]:
    """Build schema preview with optimized data type detection."""
    columns = []
    for col in df.columns:
        s = df[col]
        # Optimize type detection with early exits
        dtype = "string"  # default
        
        if pd.api.types.is_numeric_dtype(s):
            dtype = "numeric"
            # Check if all numeric values are integers
            non_null = s.dropna()
            if len(non_null) > 0 and non_null.apply(lambda x: float(x).is_integer()).all():
                dtype = "numeric"  # Keep as numeric (could be categorical)
        
        columns.append({"name": str(col), "dataType": dtype})
    
    # Use only first max_rows for sample to improve performance
    sample = df.head(max_rows).replace({pd.NA: None}).to_dict(orient="records")
    
    # Optimize JSON serialization for large datasets
    row_count = int(len(df))
    for row in sample:
        for k, v in list(row.items()):
            # Fast type checking
            if hasattr(v, "item"):
                row[k] = v.item()
            if pd.isna(v):
                row[k] = None
            elif isinstance(v, (float, np.floating)):
                # Truncate very large numbers
                if abs(v) > 1e15:
                    row[k] = float('inf') if v > 0 else float('-inf')
    
    return {"columns": columns, "sample_rows": sample, "row_count": row_count}
