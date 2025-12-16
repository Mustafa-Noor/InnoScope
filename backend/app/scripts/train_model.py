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

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
        
        # 2. Validate data
        if "feasibility_score" not in df.columns:
            logger.error("'feasibility_score' column not found in dataset")
            logger.info(f"Available columns: {list(df.columns)}")
            sys.exit(1)
        
        # 3. Check for missing values
        missing = df.isnull().sum()
        if missing.any():
            logger.warning(f"Missing values found:\n{missing[missing > 0]}")
            df = df.dropna()
            logger.info(f"Dropped rows with missing values. New shape: {df.shape}")
        
        # 4. Separate features and target
        target_col = "feasibility_score"
        X = df.drop(columns=[target_col])
        y = df[target_col]
        
        logger.info(f"Target shape: {y.shape}, Target range: {y.min():.2f} - {y.max():.2f}")
        logger.info(f"Features shape: {X.shape}")
        
        # 5. Handle categorical columns
        categorical_cols = X.select_dtypes(include=['object']).columns.tolist()
        logger.info(f"Categorical columns: {categorical_cols}")
        
        label_encoders = {}
        for col in categorical_cols:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            label_encoders[col] = le
            logger.info(f"  Encoded '{col}': {len(le.classes_)} unique values")
        
        # 6. Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        logger.info(f"Train set: {X_train.shape[0]} samples, Test set: {X_test.shape[0]} samples")
        
        # 7. Train model
        logger.info("Training RandomForestRegressor with 300 estimators...")
        model = RandomForestRegressor(
            n_estimators=300,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            verbose=1
        )
        
        model.fit(X_train, y_train)
        logger.info("Model training completed")
        
        # 8. Evaluate
        y_pred_train = model.predict(X_train)
        y_pred_test = model.predict(X_test)
        
        train_mae = mean_absolute_error(y_train, y_pred_train)
        test_mae = mean_absolute_error(y_test, y_pred_test)
        train_r2 = r2_score(y_train, y_pred_train)
        test_r2 = r2_score(y_test, y_pred_test)
        test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
        
        logger.info("=" * 50)
        logger.info("MODEL PERFORMANCE")
        logger.info("=" * 50)
        logger.info(f"Training MAE:  {train_mae:.4f}")
        logger.info(f"Testing MAE:   {test_mae:.4f}")
        logger.info(f"Training R²:   {train_r2:.4f}")
        logger.info(f"Testing R²:    {test_r2:.4f}")
        logger.info(f"Testing RMSE:  {test_rmse:.4f}")
        logger.info("=" * 50)
        
        # 9. Feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        logger.info("Top 10 Most Important Features:")
        logger.info(feature_importance.head(10).to_string(index=False))
        
        # 10. Save model
        model_dir = os.path.join(os.path.dirname(__file__), "../../model")
        os.makedirs(model_dir, exist_ok=True)
        
        model_path = os.path.join(model_dir, "feasibility_model.pkl")
        joblib.dump(model, model_path)
        logger.info(f"Model saved to {model_path}")
        
        # 11. Save encoders
        encoders_path = os.path.join(model_dir, "label_encoders.pkl")
        joblib.dump(label_encoders, encoders_path)
        logger.info(f"Label encoders saved to {encoders_path}")
        
        # 12. Save feature names for later use
        features_path = os.path.join(model_dir, "feature_names.pkl")
        joblib.dump(X.columns.tolist(), features_path)
        logger.info(f"Feature names saved to {features_path}")
        
        return model, test_r2, test_mae
        
    except Exception as e:
        logger.error(f"Error during training: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    train_model()
