"""
Prediction/Inference Module for Hydra Watch GNN

Load trained model and make predictions on new data
"""

import os
import sys
import json
import torch

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import MODEL_DIR, DATA_DIR
from models.gnn_model import get_model, TORCH_GEOMETRIC_AVAILABLE
from utils.graph_builder import TransactionGraphBuilder


class FraudPredictor:
    """
    Load trained GNN model and make predictions
    """
    
    def __init__(self, model_path=None):
        """
        Initialize predictor with trained model
        
        Args:
            model_path: Path to model checkpoint
        """
        if model_path is None:
            model_path = os.path.join(MODEL_DIR, "best_model.pt")
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.graph_builder = TransactionGraphBuilder()
        
        if os.path.exists(model_path):
            self.load_model(model_path)
        else:
            print(f"Warning: Model not found at {model_path}")
            print("Please run train.py first to train the model")
    
    def load_model(self, model_path):
        """Load model from checkpoint"""
        print(f"Loading model from {model_path}")
        
        checkpoint = torch.load(model_path, map_location=self.device)
        config = checkpoint.get("config", {})
        
        # We need to know input channels - use default 7 features
        in_channels = 7
        
        self.model = get_model(in_channels, config)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model = self.model.to(self.device)
        self.model.eval()
        
        print(f"Model loaded (trained for {checkpoint.get('epoch', '?')} epochs)")
    
    def predict(self, transactions, threshold=0.5):
        """
        Predict fraud probability for all accounts in transactions
        
        Args:
            transactions: List of transaction dicts
            threshold: Classification threshold
            
        Returns:
            List of prediction dicts
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Run train.py first.")
        
        # Build graph
        data, info = self.graph_builder.build_graph(transactions)
        
        x = data.x.to(self.device)
        edge_index = data.edge_index.to(self.device)
        
        # Get predictions
        self.model.eval()
        with torch.no_grad():
            if TORCH_GEOMETRIC_AVAILABLE:
                logits = self.model(x, edge_index)
            else:
                adj = torch.zeros(x.size(0), x.size(0), device=self.device)
                for i in range(edge_index.size(1)):
                    adj[edge_index[0, i], edge_index[1, i]] = 1
                logits = self.model(x, adj)
            
            probs = torch.softmax(logits, dim=1)
            fraud_probs = probs[:, 1].cpu().numpy()
        
        # Build result
        results = []
        for idx, acc_id in info["idx_to_account"].items():
            prob = float(fraud_probs[idx])
            results.append({
                "account_id": acc_id,
                "fraud_probability": prob,
                "risk_score": int(prob * 100),
                "label": "fraud" if prob >= threshold else "normal",
                "is_suspicious": prob >= 0.5
            })
        
        # Sort by fraud probability
        results.sort(key=lambda x: x["fraud_probability"], reverse=True)
        
        return results
    
    def predict_from_json(self, json_path, threshold=0.5):
        """
        Predict from JSON file
        
        Args:
            json_path: Path to JSON file with transactions
            threshold: Classification threshold
            
        Returns:
            List of prediction dicts
        """
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        transactions = data.get("transactions", data)
        return self.predict(transactions, threshold)
    
    def get_high_risk_accounts(self, predictions, min_score=70):
        """
        Filter predictions to get high-risk accounts
        
        Args:
            predictions: List of prediction dicts
            min_score: Minimum risk score (0-100)
            
        Returns:
            List of high-risk accounts
        """
        return [p for p in predictions if p["risk_score"] >= min_score]


def main():
    """Demo prediction"""
    print("=" * 60)
    print("🔍 Hydra Watch - Fraud Prediction Demo")
    print("=" * 60)
    
    # Sample transactions for testing
    sample_transactions = [
        {"from": "ACC001", "to": "ACC002", "amount": 100000},
        {"from": "ACC002", "to": "ACC003", "amount": 95000},
        {"from": "ACC003", "to": "ACC004", "amount": 90000},
        {"from": "ACC004", "to": "ACC005", "amount": 85000},
        {"from": "ACC006", "to": "ACC007", "amount": 5000},
        {"from": "ACC007", "to": "ACC008", "amount": 3000},
        {"from": "ACC001", "to": "ACC006", "amount": 2000},
    ]
    
    # Initialize predictor
    predictor = FraudPredictor()
    
    if predictor.model is None:
        print("\n⚠️  No trained model found. Training a new model...")
        from train import main as train_main
        train_main()
        predictor = FraudPredictor()
    
    # Make predictions
    print("\nMaking predictions...")
    predictions = predictor.predict(sample_transactions)
    
    print("\n📊 Prediction Results:")
    print("-" * 60)
    for pred in predictions:
        risk = pred["risk_score"]
        label = pred["label"]
        emoji = "🚨" if label == "fraud" else "✅"
        
        print(f"{emoji} {pred['account_id']:10s} | "
              f"Risk: {risk:3d}% | "
              f"Label: {label:6s}")
    
    # Get high risk accounts
    high_risk = predictor.get_high_risk_accounts(predictions, min_score=50)
    
    if high_risk:
        print(f"\n⚠️  High Risk Accounts ({len(high_risk)}):")
        for acc in high_risk:
            print(f"   - {acc['account_id']}: {acc['risk_score']}% risk")


if __name__ == "__main__":
    main()
