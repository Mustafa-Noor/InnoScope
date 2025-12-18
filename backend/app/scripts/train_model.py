import pandas as pd
import joblib
import os
import sys
import logging
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
import numpy as np

# ------------------------------------------------------------------------------
# Setup logging
# ------------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------------------
# Training Function
# ------------------------------------------------------------------------------
def train_model():
    try:
        # 1. Load dataset
        dataset_path = os.path.join(os.path.dirname(__file__), "../../data/dataset.csv")

        if not os.path.exists(dataset_path):
            logger.error(f"Dataset not found at {dataset_path}")
            sys.exit(1)

        logger.info(f"Loading dataset from {dataset_path}")
        df = pd.read_csv(dataset_path)

        logger.info(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
        logger.info(f"Columns: {list(df.columns)}")

        # 2. Validate target
        target_col = "feasibility_score"
        if target_col not in df.columns:
            logger.error("'feasibility_score' column not found in dataset")
            sys.exit(1)

        # 3. Drop rows with missing values
        missing = df.isnull().sum()
        if missing.any():
            logger.warning(f"Missing values found:\n{missing[missing > 0]}")
            df = df.dropna()
            logger.info(f"Dropped rows with missing values. New shape: {df.shape}")

        # 4. Drop non-predictive identifiers
        if "project_id" in df.columns:
            logger.info("Dropping non-predictive column: project_id")
            df = df.drop(columns=["project_id"])

        # 5. Separate features and target
        X = df.drop(columns=[target_col])
        y = df[target_col]

        logger.info(f"Target shape: {y.shape}, Range: {y.min():.2f} - {y.max():.2f}")
        logger.info(f"Features shape: {X.shape}")

        # 6. Handle categorical features
        categorical_cols = X.select_dtypes(include=["object"]).columns.tolist()
        logger.info(f"Categorical columns: {categorical_cols}")

        label_encoders = {}
        for col in categorical_cols:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            label_encoders[col] = le
            logger.info(f"Encoded '{col}' ({len(le.classes_)} unique values)")

        # 7. Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        logger.info(f"Train samples: {X_train.shape[0]}, Test samples: {X_test.shape[0]}")

        # 8. Train RandomForest model
        logger.info("Training RandomForestRegressor...")
        model = RandomForestRegressor(
            n_estimators=300,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )

        model.fit(X_train, y_train)
        logger.info("Model training completed")

        # 9. Evaluation
        y_pred_train = model.predict(X_train)
        y_pred_test = model.predict(X_test)

        metrics = {
            "train_mae": mean_absolute_error(y_train, y_pred_train),
            "test_mae": mean_absolute_error(y_test, y_pred_test),
            "train_r2": r2_score(y_train, y_pred_train),
            "test_r2": r2_score(y_test, y_pred_test),
            "test_rmse": np.sqrt(mean_squared_error(y_test, y_pred_test))
        }

        logger.info("=" * 55)
        logger.info("MODEL PERFORMANCE")
        logger.info("=" * 55)
        logger.info(f"Training MAE:  {metrics['train_mae']:.4f}")
        logger.info(f"Testing MAE:   {metrics['test_mae']:.4f}")
        logger.info(f"Training R²:   {metrics['train_r2']:.4f}")
        logger.info(f"Testing R²:    {metrics['test_r2']:.4f}")
        logger.info(f"Testing RMSE:  {metrics['test_rmse']:.4f}")
        logger.info("=" * 55)

        # 10. Feature importance
        feature_importance = pd.DataFrame({
            "feature": X.columns,
            "importance": model.feature_importances_
        }).sort_values(by="importance", ascending=False)

        logger.info("Top 10 Most Important Features:")
        logger.info(feature_importance.head(10).to_string(index=False))

        # 11. Save artifacts
        model_dir = os.path.join(os.path.dirname(__file__), "../model")
        os.makedirs(model_dir, exist_ok=True)

        joblib.dump(model, os.path.join(model_dir, "feasibility_model.pkl"))
        joblib.dump(label_encoders, os.path.join(model_dir, "label_encoders.pkl"))
        joblib.dump(X.columns.tolist(), os.path.join(model_dir, "feature_names.pkl"))

        logger.info("Model, encoders, and feature names saved successfully")

        return model, metrics

    except Exception as e:
        logger.error("Error during training", exc_info=True)
        sys.exit(1)


# ------------------------------------------------------------------------------
# Entry point
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    train_model()
