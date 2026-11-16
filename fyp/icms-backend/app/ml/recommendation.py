"""Pick best model and build explanation JSON."""

from __future__ import annotations

from typing import Any, Literal


def recommend(
    leaderboard: list[dict[str, Any]],
    task: Literal["classification", "regression"],
) -> dict[str, Any]:
    if not leaderboard:
        return {"best_model": None, "reason": "No models trained successfully."}

    if task == "classification":
        best = max(leaderboard, key=lambda r: (r.get("f1") or 0))
        reason = (
            f"Selected {best['model']} with highest weighted F1 ({best.get('f1', 0):.4f}) "
            f"and accuracy {best.get('accuracy', 0):.4f} on the hold-out set."
        )
    else:
        best = min(leaderboard, key=lambda r: (r.get("rmse") is None, r.get("rmse") or 1e9))
        reason = (
            f"Selected {best['model']} with lowest RMSE ({best.get('rmse', 0):.4f}) "
            f"and R² {best.get('r2', 0):.4f} on the hold-out set."
        )

    return {"best_model": best["model"], "reason": reason, "model": best["model"]}
