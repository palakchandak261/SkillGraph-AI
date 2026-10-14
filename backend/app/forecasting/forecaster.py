"""
Time-Series Forecasting & Emerging Skills Engine for SkillGraph AI
Evaluates models using chronological splits, computes MAE/RMSE/MASE, generates prediction intervals,
and classifies emerging/declining skills.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA

logger = logging.getLogger(__name__)


class SkillForecaster:
    """Forecasting and trend analytics engine for skill demand trajectories."""

    def __init__(self, min_periods_required: int = 4):
        self.min_periods_required = min_periods_required
        self.evaluation_results: Dict[str, Any] = {}

    def aggregate_monthly_demand(
        self,
        job_postings_df: pd.DataFrame,
        job_skills_df: pd.DataFrame,
        date_column: str = "posted_date",
    ) -> pd.DataFrame:
        """Aggregate monthly demand count and demand share per skill."""
        if job_postings_df.empty or job_skills_df.empty:
            return pd.DataFrame()

        # Ensure date format
        postings = job_postings_df.copy()
        if not pd.api.types.is_datetime64_any_dtype(postings[date_column]):
            postings[date_column] = pd.to_datetime(postings[date_column], errors="coerce")

        postings = postings.dropna(subset=[date_column])
        if postings.empty:
            logger.warning("No valid dates found in job postings.")
            return pd.DataFrame()

        # Monthly period (YYYY-MM)
        postings["period"] = postings[date_column].dt.to_period("M").astype(str)

        id_col = next((c for c in postings.columns if c in ("id", "job_id", "external_id")), postings.columns[0])
        company_col = next((c for c in postings.columns if "company" in c), None)

        # Total eligible postings per month
        monthly_totals = (
            postings.groupby("period")[id_col]
            .nunique()
            .reset_index(name="total_postings")
        )

        # Merge with skills
        merge_cols = [id_col, "period"]
        if company_col and company_col in postings.columns:
            merge_cols.append(company_col)

        merged = pd.merge(
            job_skills_df,
            postings[merge_cols],
            left_on="job_id",
            right_on=id_col,
            how="inner",
        )

        if merged.empty:
            return pd.DataFrame()

        # Distinct postings per skill per period
        agg_kwargs = {"posting_count": (id_col, "nunique")}
        if company_col and company_col in merged.columns:
            agg_kwargs["unique_employers"] = (company_col, "nunique")
        else:
            agg_kwargs["unique_employers"] = (id_col, "nunique")

        skill_monthly = (
            merged.groupby(["canonical_skill", "period"])
            .agg(**agg_kwargs)
            .reset_index()
        )

        # Join total postings to calculate DemandShare(s, t)
        demand_df = pd.merge(skill_monthly, monthly_totals, on="period", how="left")
        demand_df["demand_share"] = (
            demand_df["posting_count"] / demand_df["total_postings"] * 100
        ).round(3)

        demand_df = demand_df.sort_values(["canonical_skill", "period"])
        return demand_df

    def evaluate_and_forecast_skill(
        self,
        skill_name: str,
        series_df: pd.DataFrame,
        forecast_horizon: int = 6,
    ) -> Dict[str, Any]:
        """Perform chronological train-test split, evaluate candidate models, and project future demand."""
        # Filter series for this skill
        skill_data = series_df[
            series_df["canonical_skill"].str.lower() == skill_name.lower()
        ].sort_values("period")

        periods = skill_data["period"].tolist()
        values = skill_data["demand_share"].tolist()

        n_periods = len(values)

        # Check sufficiency
        if n_periods < self.min_periods_required:
            historical_points = [
                {"period": p, "value": v} for p, v in zip(periods, values)
            ]
            return {
                "skill_name": skill_name,
                "data_sufficient": False,
                "warning": (
                    f"Insufficient historical data ({n_periods} observed periods, "
                    f"minimum {self.min_periods_required} required). Forecast unavailable."
                ),
                "historical": historical_points,
                "forecast": [],
                "model_name": "None",
                "metrics": {
                    "mae": None,
                    "rmse": None,
                    "mase": None,
                    "baseline_mae": None,
                    "baseline_rmse": None,
                },
                "historical_start": periods[0] if periods else "N/A",
                "historical_end": periods[-1] if periods else "N/A",
            }

        y = np.array(values, dtype=float)

        # Chronological train/test split: last 1-2 points for test if short, otherwise 20%
        test_size = 1 if n_periods <= 4 else max(1, int(n_periods * 0.25))
        train_y = y[:-test_size]
        test_y = y[-test_size:]

        # Baseline: Naive lag model (predict last observed value)
        naive_pred = np.full(test_size, train_y[-1])
        base_mae = float(np.mean(np.abs(test_y - naive_pred)))
        base_rmse = float(np.sqrt(np.mean((test_y - naive_pred) ** 2)))

        # Naive MASE denominator: mean absolute diff of consecutive training points
        diffs = np.abs(np.diff(train_y))
        mase_denom = float(np.mean(diffs)) if len(diffs) > 0 and np.mean(diffs) > 1e-6 else 1.0

        # Model 1: Linear Trend
        x_train = np.arange(len(train_y))
        x_test = np.arange(len(train_y), len(y))
        poly = np.polyfit(x_train, train_y, 1)
        linear_pred = np.maximum(0.0, np.polyval(poly, x_test))
        linear_mae = float(np.mean(np.abs(test_y - linear_pred)))
        linear_rmse = float(np.sqrt(np.mean((test_y - linear_pred) ** 2)))

        # Model 2: Exponential Smoothing / ARIMA
        es_pred = None
        es_mae = float("inf")
        es_rmse = float("inf")
        try:
            es_model = ExponentialSmoothing(
                train_y,
                trend="add" if len(train_y) >= 4 else None,
                seasonal=None,
                initialization_method="estimated",
            ).fit()
            es_pred = np.maximum(0.0, es_model.forecast(test_size))
            es_mae = float(np.mean(np.abs(test_y - es_pred)))
            es_rmse = float(np.sqrt(np.mean((test_y - es_pred) ** 2)))
        except Exception:
            pass

        # Select model with lowest validation MAE
        candidates = [
            ("Naive Baseline", naive_pred, base_mae, base_rmse),
            ("Linear Trend", linear_pred, linear_mae, linear_rmse),
        ]
        if es_pred is not None:
            candidates.append(("Exponential Smoothing", es_pred, es_mae, es_rmse))

        candidates.sort(key=lambda c: c[2])  # sort by MAE
        best_name, _, best_mae, best_rmse = candidates[0]
        best_mase = float(round(best_mae / mase_denom, 3))

        # Train selected model on FULL series and forecast future
        future_x = np.arange(len(y), len(y) + forecast_horizon)
        if "Linear" in best_name:
            full_poly = np.polyfit(np.arange(len(y)), y, 1)
            future_forecast = np.maximum(0.0, np.polyval(full_poly, future_x))
        elif "Exponential" in best_name:
            try:
                full_es = ExponentialSmoothing(
                    y,
                    trend="add" if len(y) >= 4 else None,
                    seasonal=None,
                    initialization_method="estimated",
                ).fit()
                future_forecast = np.maximum(0.0, full_es.forecast(forecast_horizon))
            except Exception:
                future_forecast = np.full(forecast_horizon, y[-1])
        else:
            future_forecast = np.full(forecast_horizon, y[-1])

        # Compute 95% prediction intervals from validation residuals
        residual_std = max(float(best_rmse), 0.1)
        lower_bound = np.maximum(0.0, future_forecast - 1.96 * residual_std)
        upper_bound = future_forecast + 1.96 * residual_std

        # Generate future month labels
        last_dt = datetime.strptime(periods[-1], "%Y-%m")
        future_periods = []
        cur_year, cur_month = last_dt.year, last_dt.month
        for _ in range(forecast_horizon):
            cur_month += 1
            if cur_month > 12:
                cur_month = 1
                cur_year += 1
            future_periods.append(f"{cur_year:04d}-{cur_month:02d}")

        historical_points = [
            {"period": p, "value": round(float(v), 2)}
            for p, v in zip(periods, values)
        ]
        forecast_points = [
            {
                "period": fp,
                "value": round(float(fv), 2),
                "lower_bound": round(float(lb), 2),
                "upper_bound": round(float(ub), 2),
            }
            for fp, fv, lb, ub in zip(future_periods, future_forecast, lower_bound, upper_bound)
        ]

        return {
            "skill_name": skill_name,
            "data_sufficient": True,
            "warning": None,
            "historical": historical_points,
            "forecast": forecast_points,
            "model_name": best_name,
            "metrics": {
                "mae": round(best_mae, 3),
                "rmse": round(best_rmse, 3),
                "mase": best_mase,
                "baseline_mae": round(base_mae, 3),
                "baseline_rmse": round(base_rmse, 3),
            },
            "historical_start": periods[0],
            "historical_end": periods[-1],
        }

    def identify_emerging_skills(
        self,
        demand_df: pd.DataFrame,
        min_total_postings: int = 5,
    ) -> List[Dict[str, Any]]:
        """Score and classify skills into emerging, established, and declining tiers."""
        if demand_df.empty:
            return []

        results = []
        grouped = demand_df.groupby("canonical_skill")

        for skill, group in grouped:
            sorted_g = group.sort_values("period")
            total_mentions = int(sorted_g["posting_count"].sum())
            if total_mentions < min_total_postings:
                continue

            shares = sorted_g["demand_share"].values
            n_obs = len(shares)

            if n_obs >= 2:
                # Growth rate = (latest - oldest) / (oldest + 1e-4) * 100
                oldest = shares[0]
                latest = shares[-1]
                growth_rate = round(((latest - oldest) / max(oldest, 0.05)) * 100, 1)

                # Linear slope
                slope = np.polyfit(np.arange(n_obs), shares, 1)[0]
                if slope > 0.1:
                    trend_dir = "rising"
                elif slope < -0.1:
                    trend_dir = "declining"
                else:
                    trend_dir = "stable"
            else:
                growth_rate = 0.0
                trend_dir = "stable"

            confidence = "High" if n_obs >= 4 and total_mentions >= 20 else "Medium" if n_obs >= 2 else "Low"

            results.append({
                "skill_name": skill,
                "demand_share": round(float(shares[-1]), 2),
                "posting_count": total_mentions,
                "growth_rate": growth_rate,
                "trend_direction": trend_dir,
                "confidence": confidence,
                "data_periods": n_obs,
            })

        # Sort: rising skills with highest sustained positive growth
        results.sort(key=lambda x: (1 if x["trend_direction"] == "rising" else 0, x["growth_rate"]), reverse=True)
        return results
