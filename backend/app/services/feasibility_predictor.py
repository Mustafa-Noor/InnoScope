"""
ML-based feasibility prediction service.
Loads trained model and generates feasibility scores based on structured fields.
"""

import joblib
import os
import logging
import pandas as pd
from typing import Dict, List, Optional
from huggingface_hub import hf_hub_download
from app.schemas.feasibility_new import StructuredFeasibilityInput, FeasibilityPrediction

logger = logging.getLogger(__name__)

# HuggingFace model repository
HF_REPO_ID = "MustafaNoor/FeasibilityPredictor"


class FeasibilityPredictor:
    """Load and use trained feasibility model for predictions."""
    
    def __init__(self):
        self.model = None
        self.label_encoders = None
        self.feature_names = None
        self.load_model()
    
    def load_model(self):
        """Load the trained ML model and encoders from HuggingFace."""
        try:
            logger.info(f"Loading models from HuggingFace: {HF_REPO_ID}")
            
            # Download model files from HuggingFace Hub
            model_path = hf_hub_download(
                repo_id=HF_REPO_ID,
                filename="feasibility_model.pkl",
                repo_type="model"
            )
            
            encoders_path = hf_hub_download(
                repo_id=HF_REPO_ID,
                filename="label_encoders.pkl",
                repo_type="model"
            )
            
            features_path = hf_hub_download(
                repo_id=HF_REPO_ID,
                filename="feature_names.pkl",
                repo_type="model"
            )
            
            # Load the models
            self.model = joblib.load(model_path)
            logger.info(f"✓ Loaded feasibility model from HF")
            
            self.label_encoders = joblib.load(encoders_path)
            logger.info(f"✓ Loaded label encoders from HF")
            
            self.feature_names = joblib.load(features_path)
            logger.info(f"✓ Loaded feature names from HF")
                
        except Exception as e:
            logger.error(f"Error loading models from HuggingFace: {e}")
            logger.warning("Using fallback scoring without ML model")
            self.model = None
    
    def predict(self, input_data: StructuredFeasibilityInput) -> FeasibilityPrediction:
        """
        Predict feasibility score from structured input.
        
        Args:
            input_data: StructuredFeasibilityInput with all fields
        
        Returns:
            FeasibilityPrediction with score and confidence
        """
        if self.model is None:
            logger.warning("Model not loaded. Returning fallback scoring.")
            return self._fallback_scoring(input_data)
        
        try:
            # Convert input to DataFrame
            data_dict = input_data.dict(exclude={'project_id', 'summary', 'key_challenges', 'key_opportunities'})
            df = pd.DataFrame([data_dict])
            
            # Convert all columns to numeric where possible (except categorical)
            for col in df.columns:
                if col not in (self.label_encoders.keys() if self.label_encoders else []):
                    try:
                        df[col] = pd.to_numeric(df[col])
                    except (ValueError, TypeError):
                        # Column is not numeric, keep as-is
                        pass
            
            # Ensure features match training data
            if self.feature_names:
                for col in self.feature_names:
                    if col not in df.columns:
                        logger.warning(f"Feature {col} missing from input. Using 0.")
                        df[col] = 0
                
                # Select only features used during training
                df = df[self.feature_names]
            
            # Encode categorical features if needed
            if self.label_encoders:
                for col, encoder in self.label_encoders.items():
                    if col in df.columns:
                        try:
                            # Handle unseen categories by using the first class
                            values = df[col].astype(str)
                            encoded_values = []
                            for val in values:
                                if val in encoder.classes_:
                                    encoded_values.append(encoder.transform([val])[0])
                                else:
                                    # Use first class index (0) for unseen values
                                    logger.warning(f"Unseen category '{val}' in {col}. Using default value.")
                                    encoded_values.append(0)
                            df[col] = encoded_values
                        except Exception as e:
                            logger.warning(f"Could not encode {col}: {e}")
                            df[col] = 0
            
            # Make prediction
            prediction = self.model.predict(df)[0]
            
            # Ensure prediction is in valid range
            ml_score = max(0, min(100, float(prediction)))
            
            # Calculate confidence (simplified)
            confidence = self._calculate_confidence(input_data)
            
            # Identify risk indicators
            risk_indicators = self._identify_risks(input_data)
            
            return FeasibilityPrediction(
                project_id=input_data.project_id,
                ml_score=ml_score,
                confidence=confidence,
                risk_indicators=risk_indicators
            )
            
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            return self._fallback_scoring(input_data)
    
    def _fallback_scoring(self, input_data: StructuredFeasibilityInput) -> FeasibilityPrediction:
        """Calculate feasibility score using simple heuristics if model unavailable."""
        logger.info("Using fallback scoring method")
        
        # Simple scoring: average of technical and resource scores
        technical_avg = (
            input_data.problem_clarity_score +
            input_data.technology_maturity_score +
            input_data.data_availability_score
        ) / 3.0
        
        resource_score = input_data.resource_availability_score
        market_score = (
            input_data.unique_selling_proposition_score +
            (5 - input_data.competition_level)
        ) / 2.0
        
        # Weighted average: 40% technical, 30% resource, 30% market
        score = (technical_avg * 0.4 + resource_score * 0.3 + market_score * 0.3) * 20
        ml_score = max(0, min(100, score))
        
        risk_indicators = self._identify_risks(input_data)
        
        return FeasibilityPrediction(
            project_id=input_data.project_id,
            ml_score=ml_score,
            confidence=0.6,  # Lower confidence for fallback
            risk_indicators=risk_indicators
        )
    
    def _calculate_confidence(self, input_data: StructuredFeasibilityInput) -> float:
        """Calculate confidence in prediction based on data quality."""
        # Check if all fields are provided (not defaults)
        completeness = 0.8  # Start with 80%
        
        # Adjust based on extreme values
        if input_data.rd_cost_estimate == 0 or input_data.startup_cost_estimate == 0:
            completeness -= 0.1
        
        if input_data.target_market_size == 0:
            completeness -= 0.05
        
        return max(0.5, min(0.95, completeness))
    
    def _identify_risks(self, input_data: StructuredFeasibilityInput) -> List[str]:
        """Identify risk factors from input data."""
        risks = []
        
        # Technical risks
        if input_data.technical_complexity_score >= 4:
            risks.append("High technical complexity")
        
        if input_data.technology_maturity_score <= 2:
            risks.append("Immature technologies")
        
        if input_data.data_availability_score <= 2:
            risks.append("Limited data availability")
        
        # Resource risks
        if input_data.rd_cost_estimate > 1000000:  # > $1M
            risks.append("High R&D costs")
        
        if input_data.resource_availability_score <= 2:
            risks.append("Insufficient resources")
        
        # Market risks
        if input_data.competition_level >= 4:
            risks.append("High competition")
        
        if input_data.time_to_market_months > 24:
            risks.append("Long time to market")
        
        # Regulatory/Legal risks
        if input_data.legal_risk_flag == 1:
            risks.append("Legal risks identified")
        
        if input_data.regulatory_compliance_flag == 0:
            risks.append("Regulatory compliance gaps")
        
        # Validation risks
        if input_data.baseline_comparison_flag == 0:
            risks.append("No baseline comparison")
        
        if input_data.real_world_testing_flag == 0:
            risks.append("Lacks real-world testing")
        
        return risks


# Global instance
_predictor = None

def get_predictor() -> FeasibilityPredictor:
    """Get or create global predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = FeasibilityPredictor()
    return _predictor
