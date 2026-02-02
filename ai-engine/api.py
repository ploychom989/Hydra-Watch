"""
Flask REST API for Hydra Watch GNN Model

Endpoints:
- POST /predict - Predict fraud scores for accounts
- GET /graph - Get graph data for visualization
- GET /status - Health check
- POST /train - Trigger model training
"""

import os
import sys
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import API_HOST, API_PORT, DEBUG, DATA_DIR, MODEL_DIR
from predict import FraudPredictor
from utils.data_generator import FraudDataGenerator
from utils.graph_builder import TransactionGraphBuilder

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Global predictor instance
predictor = None


def get_predictor():
    """Get or initialize predictor"""
    global predictor
    if predictor is None:
        predictor = FraudPredictor()
    return predictor


@app.route("/", methods=["GET"])
def home():
    """Home endpoint with API info"""
    return jsonify({
        "name": "Hydra Watch AI Engine",
        "version": "1.0.0",
        "description": "GNN-based fraud detection API",
        "endpoints": {
            "GET /": "This info",
            "GET /status": "Health check",
            "POST /predict": "Predict fraud scores",
            "GET /graph": "Get graph visualization data",
            "POST /train": "Train/retrain model"
        }
    })


@app.route("/status", methods=["GET"])
def status():
    """Health check endpoint"""
    pred = get_predictor()
    model_loaded = pred.model is not None
    
    return jsonify({
        "status": "running",
        "model_loaded": model_loaded,
        "model_path": os.path.join(MODEL_DIR, "best_model.pt"),
        "message": "Ready" if model_loaded else "Model not trained yet"
    })


@app.route("/predict", methods=["POST"])
def predict():
    """
    Predict fraud probability for accounts
    
    Request body:
    {
        "transactions": [
            {"from": "ACC001", "to": "ACC002", "amount": 50000},
            ...
        ],
        "threshold": 0.5  // optional
    }
    
    Response:
    {
        "predictions": [...],
        "high_risk": [...],
        "summary": {...}
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        transactions = data.get("transactions", [])
        threshold = data.get("threshold", 0.5)
        
        if not transactions:
            return jsonify({"error": "No transactions provided"}), 400
        
        # Get predictions
        pred = get_predictor()
        
        if pred.model is None:
            return jsonify({
                "error": "Model not trained",
                "message": "Please call POST /train first"
            }), 503
        
        predictions = pred.predict(transactions, threshold)
        high_risk = pred.get_high_risk_accounts(predictions, min_score=70)
        
        # Summary statistics
        fraud_count = sum(1 for p in predictions if p["label"] == "fraud")
        avg_risk = sum(p["risk_score"] for p in predictions) / len(predictions)
        
        return jsonify({
            "predictions": predictions,
            "high_risk": high_risk,
            "summary": {
                "total_accounts": len(predictions),
                "fraud_detected": fraud_count,
                "high_risk_count": len(high_risk),
                "average_risk_score": round(avg_risk, 1)
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/graph", methods=["GET"])
def get_graph():
    """
    Get graph data for frontend visualization
    
    Query params:
    - source: "sample" or path to JSON file
    
    Response:
    {
        "nodes": [...],
        "edges": [...],
        "predictions": [...] (if model available)
    }
    """
    try:
        source = request.args.get("source", "sample")
        
        # Load data
        if source == "sample":
            data_path = os.path.join(DATA_DIR, "sample_transactions.json")
            
            if not os.path.exists(data_path):
                # Generate sample data
                generator = FraudDataGenerator()
                dataset = generator.generate_dataset()
                generator.save_dataset(dataset, data_path)
            
            with open(data_path, 'r', encoding='utf-8') as f:
                dataset = json.load(f)
        else:
            with open(source, 'r', encoding='utf-8') as f:
                dataset = json.load(f)
        
        transactions = dataset.get("transactions", [])
        accounts = dataset.get("accounts", [])
        labels = dataset.get("labels", {})
        
        # Build graph for visualization
        builder = TransactionGraphBuilder()
        graph_data, info = builder.build_graph(transactions, labels)
        
        # Get predictions if model available
        pred = get_predictor()
        predictions = {}
        
        if pred.model is not None:
            pred_results = pred.predict(transactions)
            predictions = {p["account_id"]: p for p in pred_results}
        
        # Format nodes for frontend (vis.js format)
        nodes = []
        for acc in accounts:
            acc_id = acc["id"]
            pred_data = predictions.get(acc_id, {})
            
            node_type = acc.get("type", "normal")
            if pred_data.get("label") == "fraud":
                node_type = "mule" if pred_data["risk_score"] >= 80 else "suspect"
            
            nodes.append({
                "id": acc_id,
                "label": acc.get("name", acc_id),
                "bank": acc.get("bank", "Unknown"),
                "type": node_type,
                "riskScore": pred_data.get("risk_score", labels.get(acc_id, 0) * 100),
                "balance": acc.get("balance", 0)
            })
        
        # Format edges for frontend
        edges = []
        for tx in transactions:
            edges.append({
                "from": tx.get("from") or tx.get("debtor"),
                "to": tx.get("to") or tx.get("creditor"),
                "amount": tx.get("amount", 0),
                "id": tx.get("id", f"tx_{len(edges)}")
            })
        
        return jsonify({
            "nodes": nodes,
            "edges": edges,
            "info": {
                "num_nodes": info["num_nodes"],
                "num_edges": info["num_edges"]
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/train", methods=["POST"])
def train_model():
    """
    Train or retrain the GNN model
    
    Request body (optional):
    {
        "config": {
            "epochs": 100,
            "hidden_channels": 64,
            ...
        }
    }
    """
    try:
        # Import training function
        from train import load_or_generate_data, prepare_data, train
        
        # Get optional config
        data = request.get_json() or {}
        config = data.get("config")
        
        # Load data and train
        dataset = load_or_generate_data()
        graph_data, info, builder = prepare_data(dataset)
        
        model, metrics = train(graph_data, config)
        
        # Reload predictor
        global predictor
        predictor = FraudPredictor()
        
        return jsonify({
            "status": "success",
            "message": "Model trained successfully",
            "metrics": metrics,
            "graph_info": {
                "nodes": info["num_nodes"],
                "edges": info["num_edges"]
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/generate_data", methods=["POST"])
def generate_data():
    """
    Generate new sample training data
    
    Request body (optional):
    {
        "num_normal": 50,
        "num_mule_chains": 5,
        "chain_length": 4
    }
    """
    try:
        data = request.get_json() or {}
        
        generator = FraudDataGenerator()
        dataset = generator.generate_dataset(
            num_normal=data.get("num_normal", 50),
            num_mule_chains=data.get("num_mule_chains", 5),
            chain_length=data.get("chain_length", 4)
        )
        
        # Save to file
        data_path = os.path.join(DATA_DIR, "sample_transactions.json")
        generator.save_dataset(dataset, data_path)
        
        return jsonify({
            "status": "success",
            "message": "Sample data generated",
            "metadata": dataset["metadata"],
            "path": data_path
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def main():
    """Run the API server"""
    print("=" * 60)
    print("🚀 Hydra Watch AI Engine - API Server")
    print("=" * 60)
    print(f"Host: {API_HOST}")
    print(f"Port: {API_PORT}")
    print(f"Debug: {DEBUG}")
    print("-" * 60)
    
    # Initialize predictor
    get_predictor()
    
    # Run server
    app.run(
        host=API_HOST,
        port=API_PORT,
        debug=DEBUG
    )


if __name__ == "__main__":
    main()
