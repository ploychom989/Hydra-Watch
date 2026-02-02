"""
Hydra Watch AI Engine - Configuration
"""
import os

# Model Configuration
MODEL_CONFIG = {
    "hidden_channels": 64,
    "num_layers": 2,
    "dropout": 0.3,
    "learning_rate": 0.01,
    "epochs": 100,
    "patience": 10  # Early stopping
}

# Node Feature Configuration
NODE_FEATURES = [
    "balance",
    "transaction_count",
    "avg_transaction_amount",
    "account_age_days",
    "unique_counterparties",
    "in_degree",
    "out_degree"
]

# Labels
LABELS = {
    0: "normal",
    1: "fraud"
}

# API Configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 5000))
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "checkpoints")

# Create directories if they don't exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)
