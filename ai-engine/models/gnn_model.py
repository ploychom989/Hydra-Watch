"""
Graph Neural Network Model for Fraud Detection
Uses GraphSAGE (SAmple and aggreGatE) architecture

5 Steps of GNN:
1. Graph Construction - Done in graph_builder.py
2. Message Passing - SAGEConv layers
3. Aggregation - Mean aggregation in SAGE
4. Update - Linear transformation + activation
5. Readout - Final classification layer
"""

import torch
import torch.nn.functional as F
from torch import nn

# Try to import torch_geometric, provide fallback message if not installed
try:
    from torch_geometric.nn import SAGEConv, GCNConv, global_mean_pool
    TORCH_GEOMETRIC_AVAILABLE = True
except ImportError:
    TORCH_GEOMETRIC_AVAILABLE = False
    print("Warning: torch_geometric not installed. Please install with:")
    print("pip install torch-geometric torch-scatter torch-sparse")


class HydraGNN(nn.Module):
    """
    Graph Neural Network for detecting mule accounts (บัญชีม้า)
    
    Architecture:
    - Input: Node features (account statistics)
    - 2-3 SAGEConv layers with message passing
    - Output: Binary classification (Normal/Fraud)
    """
    
    def __init__(self, in_channels, hidden_channels=64, num_layers=2, dropout=0.3):
        """
        Initialize the GNN model
        
        Args:
            in_channels: Number of input features per node
            hidden_channels: Hidden layer dimension
            num_layers: Number of GNN layers
            dropout: Dropout probability
        """
        super(HydraGNN, self).__init__()
        
        self.num_layers = num_layers
        self.dropout = dropout
        
        # GNN layers (Message Passing)
        self.convs = nn.ModuleList()
        
        # First layer: input -> hidden
        self.convs.append(SAGEConv(in_channels, hidden_channels))
        
        # Middle layers: hidden -> hidden
        for _ in range(num_layers - 2):
            self.convs.append(SAGEConv(hidden_channels, hidden_channels))
        
        # Last conv layer: hidden -> hidden/2
        if num_layers > 1:
            self.convs.append(SAGEConv(hidden_channels, hidden_channels // 2))
        
        # Classification layer
        final_hidden = hidden_channels // 2 if num_layers > 1 else hidden_channels
        self.classifier = nn.Sequential(
            nn.Linear(final_hidden, 16),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(16, 2)  # Binary classification: Normal/Fraud
        )
        
    def forward(self, x, edge_index):
        """
        Forward pass through the GNN
        
        Step 2-4: Message Passing -> Aggregation -> Update
        
        Args:
            x: Node features [num_nodes, in_channels]
            edge_index: Edge connectivity [2, num_edges]
            
        Returns:
            out: Node predictions [num_nodes, 2]
        """
        # Message Passing through GNN layers
        for i, conv in enumerate(self.convs):
            # Step 2: Message Passing
            # Step 3: Aggregation (mean in SAGE)
            x = conv(x, edge_index)
            
            # Step 4: Update with activation
            x = F.relu(x)
            x = F.dropout(x, p=self.dropout, training=self.training)
        
        # Step 5: Readout - Classification
        out = self.classifier(x)
        
        return out
    
    def predict_proba(self, x, edge_index):
        """
        Get probability predictions
        
        Args:
            x: Node features
            edge_index: Edge connectivity
            
        Returns:
            probs: Probability of each class [num_nodes, 2]
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x, edge_index)
            probs = F.softmax(logits, dim=1)
        return probs
    
    def predict(self, x, edge_index, threshold=0.5):
        """
        Get binary predictions with risk scores
        
        Args:
            x: Node features
            edge_index: Edge connectivity
            threshold: Classification threshold
            
        Returns:
            predictions: Dict with labels and scores
        """
        probs = self.predict_proba(x, edge_index)
        fraud_probs = probs[:, 1]  # Probability of fraud
        
        predictions = []
        for i, prob in enumerate(fraud_probs):
            predictions.append({
                "node_idx": i,
                "fraud_probability": float(prob),
                "risk_score": int(prob * 100),
                "label": "fraud" if prob >= threshold else "normal",
                "is_suspicious": bool(prob >= 0.5)
            })
        
        return predictions


class SimpleFraudGNN(nn.Module):
    """
    Simplified GNN for environments without torch_geometric
    Uses basic message passing with adjacency matrix
    """
    
    def __init__(self, in_channels, hidden_channels=64, num_layers=2, dropout=0.3):
        super(SimpleFraudGNN, self).__init__()
        
        self.layers = nn.ModuleList()
        
        # First layer
        self.layers.append(nn.Linear(in_channels, hidden_channels))
        
        # Message passing layers
        for _ in range(num_layers - 1):
            self.layers.append(nn.Linear(hidden_channels * 2, hidden_channels))
        
        # Output layer
        self.classifier = nn.Sequential(
            nn.Linear(hidden_channels, 16),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(16, 2)
        )
        
        self.dropout = dropout
        
    def forward(self, x, adj_matrix):
        """
        Forward pass with adjacency matrix
        
        Args:
            x: Node features [num_nodes, in_channels]
            adj_matrix: Adjacency matrix [num_nodes, num_nodes]
        """
        # Initial transformation
        h = F.relu(self.layers[0](x))
        
        # Message passing
        for layer in self.layers[1:]:
            # Aggregate neighbor features
            neighbor_sum = torch.matmul(adj_matrix, h)
            
            # Concatenate self and neighbor features
            combined = torch.cat([h, neighbor_sum], dim=1)
            
            # Update
            h = F.relu(layer(combined))
            h = F.dropout(h, p=self.dropout, training=self.training)
        
        # Classification
        out = self.classifier(h)
        return out


def get_model(in_channels, config=None):
    """
    Factory function to get appropriate model
    
    Args:
        in_channels: Number of input features
        config: Configuration dict
        
    Returns:
        model: GNN model instance
    """
    if config is None:
        config = {
            "hidden_channels": 64,
            "num_layers": 2,
            "dropout": 0.3
        }
    
    if TORCH_GEOMETRIC_AVAILABLE:
        return HydraGNN(
            in_channels=in_channels,
            hidden_channels=config.get("hidden_channels", 64),
            num_layers=config.get("num_layers", 2),
            dropout=config.get("dropout", 0.3)
        )
    else:
        print("Using SimpleFraudGNN (torch_geometric not available)")
        return SimpleFraudGNN(
            in_channels=in_channels,
            hidden_channels=config.get("hidden_channels", 64),
            num_layers=config.get("num_layers", 2),
            dropout=config.get("dropout", 0.3)
        )


if __name__ == "__main__":
    # Test the model
    print("Testing HydraGNN...")
    
    # Create dummy data
    num_nodes = 10
    num_features = 7
    
    x = torch.randn(num_nodes, num_features)
    edge_index = torch.randint(0, num_nodes, (2, 20))
    
    # Create model
    model = get_model(in_channels=num_features)
    print(f"Model: {model.__class__.__name__}")
    print(f"Parameters: {sum(p.numel() for p in model.parameters())}")
    
    # Forward pass
    if TORCH_GEOMETRIC_AVAILABLE:
        out = model(x, edge_index)
    else:
        adj = torch.zeros(num_nodes, num_nodes)
        for i in range(edge_index.size(1)):
            adj[edge_index[0, i], edge_index[1, i]] = 1
        out = model(x, adj)
    
    print(f"Output shape: {out.shape}")
    print("✅ Model test passed!")
