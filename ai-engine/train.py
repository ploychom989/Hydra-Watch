"""
Training Script for Hydra Watch GNN Model

Trains the Graph Neural Network on fraud detection data:
1. Load/generate training data
2. Build graph from transactions
3. Train GNN model
4. Save best checkpoint
"""

import os
import sys
import json
import torch
import torch.nn.functional as F
from torch.optim import Adam
from tqdm import tqdm

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import MODEL_CONFIG, MODEL_DIR, DATA_DIR
from models.gnn_model import get_model, TORCH_GEOMETRIC_AVAILABLE
from utils.graph_builder import TransactionGraphBuilder
from utils.data_generator import FraudDataGenerator


def load_or_generate_data():
    """Load existing data or generate new sample data"""
    data_path = os.path.join(DATA_DIR, "sample_transactions.json")
    
    if os.path.exists(data_path):
        print(f"Loading data from {data_path}")
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        print("Generating new sample data...")
        generator = FraudDataGenerator()
        dataset = generator.generate_dataset(
            num_normal=50,
            num_mule_chains=8,
            chain_length=4
        )
        generator.save_dataset(dataset, data_path)
        return dataset


def prepare_data(dataset):
    """Prepare graph data for training"""
    builder = TransactionGraphBuilder()
    
    # Build graph
    data, info = builder.build_graph(
        dataset["transactions"],
        dataset["labels"]
    )
    
    print(f"Graph built:")
    print(f"  - Nodes: {info['num_nodes']}")
    print(f"  - Edges: {info['num_edges']}")
    print(f"  - Features: {data.x.shape[1]}")
    
    # Split into train/val/test
    num_nodes = info["num_nodes"]
    indices = torch.randperm(num_nodes)
    
    train_size = int(0.6 * num_nodes)
    val_size = int(0.2 * num_nodes)
    
    train_mask = torch.zeros(num_nodes, dtype=torch.bool)
    val_mask = torch.zeros(num_nodes, dtype=torch.bool)
    test_mask = torch.zeros(num_nodes, dtype=torch.bool)
    
    train_mask[indices[:train_size]] = True
    val_mask[indices[train_size:train_size + val_size]] = True
    test_mask[indices[train_size + val_size:]] = True
    
    data.train_mask = train_mask
    data.val_mask = val_mask
    data.test_mask = test_mask
    
    return data, info, builder


def train_epoch(model, data, optimizer, device):
    """Train for one epoch"""
    model.train()
    optimizer.zero_grad()
    
    # Move data to device
    x = data.x.to(device)
    edge_index = data.edge_index.to(device)
    y = data.y.to(device)
    train_mask = data.train_mask.to(device)
    
    # Forward pass
    if TORCH_GEOMETRIC_AVAILABLE:
        out = model(x, edge_index)
    else:
        # Build adjacency matrix for simple model
        adj = torch.zeros(x.size(0), x.size(0), device=device)
        for i in range(edge_index.size(1)):
            adj[edge_index[0, i], edge_index[1, i]] = 1
        out = model(x, adj)
    
    # Compute loss (only on training nodes)
    loss = F.cross_entropy(out[train_mask], y[train_mask])
    
    # Backward pass
    loss.backward()
    optimizer.step()
    
    # Compute accuracy
    pred = out[train_mask].argmax(dim=1)
    correct = (pred == y[train_mask]).sum().item()
    acc = correct / train_mask.sum().item()
    
    return loss.item(), acc


@torch.no_grad()
def evaluate(model, data, device, mask_name="val_mask"):
    """Evaluate model on validation/test set"""
    model.eval()
    
    x = data.x.to(device)
    edge_index = data.edge_index.to(device)
    y = data.y.to(device)
    mask = getattr(data, mask_name).to(device)
    
    if TORCH_GEOMETRIC_AVAILABLE:
        out = model(x, edge_index)
    else:
        adj = torch.zeros(x.size(0), x.size(0), device=device)
        for i in range(edge_index.size(1)):
            adj[edge_index[0, i], edge_index[1, i]] = 1
        out = model(x, adj)
    
    loss = F.cross_entropy(out[mask], y[mask])
    
    pred = out[mask].argmax(dim=1)
    correct = (pred == y[mask]).sum().item()
    acc = correct / mask.sum().item()
    
    # Compute precision and recall for fraud class
    fraud_pred = (pred == 1)
    fraud_true = (y[mask] == 1)
    
    tp = (fraud_pred & fraud_true).sum().item()
    fp = (fraud_pred & ~fraud_true).sum().item()
    fn = (~fraud_pred & fraud_true).sum().item()
    
    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-6)
    
    return {
        "loss": loss.item(),
        "accuracy": acc,
        "precision": precision,
        "recall": recall,
        "f1": f1
    }


def train(data, config=None):
    """Main training function"""
    if config is None:
        config = MODEL_CONFIG
    
    # Device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Model
    in_channels = data.x.size(1)
    model = get_model(in_channels, config)
    model = model.to(device)
    
    print(f"Model: {model.__class__.__name__}")
    print(f"Parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Optimizer
    optimizer = Adam(
        model.parameters(),
        lr=config.get("learning_rate", 0.01)
    )
    
    # Training loop
    epochs = config.get("epochs", 100)
    patience = config.get("patience", 10)
    best_val_f1 = 0
    patience_counter = 0
    
    print(f"\nTraining for {epochs} epochs...")
    print("-" * 60)
    
    for epoch in range(1, epochs + 1):
        # Train
        train_loss, train_acc = train_epoch(model, data, optimizer, device)
        
        # Validate
        val_metrics = evaluate(model, data, device, "val_mask")
        
        # Print progress
        if epoch % 10 == 0 or epoch == 1:
            print(f"Epoch {epoch:3d} | "
                  f"Train Loss: {train_loss:.4f} | "
                  f"Train Acc: {train_acc:.4f} | "
                  f"Val F1: {val_metrics['f1']:.4f}")
        
        # Early stopping
        if val_metrics["f1"] > best_val_f1:
            best_val_f1 = val_metrics["f1"]
            patience_counter = 0
            
            # Save best model
            checkpoint_path = os.path.join(MODEL_DIR, "best_model.pt")
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_f1": best_val_f1,
                "config": config
            }, checkpoint_path)
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"\nEarly stopping at epoch {epoch}")
                break
    
    print("-" * 60)
    
    # Load best model and test
    checkpoint = torch.load(os.path.join(MODEL_DIR, "best_model.pt"))
    model.load_state_dict(checkpoint["model_state_dict"])
    
    test_metrics = evaluate(model, data, device, "test_mask")
    
    print(f"\n📊 Test Results:")
    print(f"  - Accuracy:  {test_metrics['accuracy']:.4f}")
    print(f"  - Precision: {test_metrics['precision']:.4f}")
    print(f"  - Recall:    {test_metrics['recall']:.4f}")
    print(f"  - F1 Score:  {test_metrics['f1']:.4f}")
    
    return model, test_metrics


def main():
    """Main entry point"""
    print("=" * 60)
    print("🔥 Hydra Watch - GNN Fraud Detection Training")
    print("=" * 60)
    
    # Load/generate data
    dataset = load_or_generate_data()
    
    # Prepare graph data
    data, info, builder = prepare_data(dataset)
    
    # Train model
    model, metrics = train(data)
    
    print("\n✅ Training complete!")
    print(f"Best model saved to: {os.path.join(MODEL_DIR, 'best_model.pt')}")
    
    return model, metrics


if __name__ == "__main__":
    main()
