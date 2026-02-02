"""
Graph Builder - Convert transaction data to PyTorch Geometric format

Step 1 of GNN: Graph Construction
- Nodes = Bank accounts
- Edges = Money transfers
- Node features = Account statistics
"""

import numpy as np

try:
    import torch
    from torch_geometric.data import Data
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class TransactionGraphBuilder:
    """
    Build graph from transaction data
    
    Input: List of transactions
    Output: PyTorch Geometric Data object
    """
    
    def __init__(self):
        self.account_to_idx = {}  # Map account ID to node index
        self.idx_to_account = {}  # Map node index to account ID
        
    def build_graph(self, transactions, account_labels=None):
        """
        Build graph from list of transactions
        
        Args:
            transactions: List of transaction dicts
                [{"from": "ACC001", "to": "ACC002", "amount": 1000, ...}, ...]
            account_labels: Optional dict mapping account_id to label (0=normal, 1=fraud)
            
        Returns:
            data: PyTorch Geometric Data object
            account_info: Dict with account mappings
        """
        if not TORCH_AVAILABLE:
            raise ImportError("PyTorch is required. Install with: pip install torch")
        
        # Reset mappings
        self.account_to_idx = {}
        self.idx_to_account = {}
        
        # Step 1a: Extract unique accounts (Nodes)
        accounts = set()
        for tx in transactions:
            accounts.add(tx.get("from") or tx.get("debtor"))
            accounts.add(tx.get("to") or tx.get("creditor"))
        
        accounts = sorted(list(accounts))
        
        for idx, acc in enumerate(accounts):
            self.account_to_idx[acc] = idx
            self.idx_to_account[idx] = acc
        
        num_nodes = len(accounts)
        
        # Step 1b: Build edges from transactions
        edge_index = []
        edge_attr = []  # Edge features (amount, etc.)
        
        for tx in transactions:
            from_acc = tx.get("from") or tx.get("debtor")
            to_acc = tx.get("to") or tx.get("creditor")
            
            from_idx = self.account_to_idx[from_acc]
            to_idx = self.account_to_idx[to_acc]
            
            edge_index.append([from_idx, to_idx])
            edge_attr.append([tx.get("amount", 0)])
        
        edge_index = torch.tensor(edge_index, dtype=torch.long).t().contiguous()
        edge_attr = torch.tensor(edge_attr, dtype=torch.float)
        
        # Step 1c: Compute node features
        node_features = self._compute_node_features(accounts, transactions)
        x = torch.tensor(node_features, dtype=torch.float)
        
        # Step 1d: Add labels if provided
        if account_labels:
            y = torch.tensor([
                account_labels.get(acc, 0) for acc in accounts
            ], dtype=torch.long)
        else:
            y = torch.zeros(num_nodes, dtype=torch.long)
        
        # Create PyTorch Geometric Data object
        data = Data(
            x=x,
            edge_index=edge_index,
            edge_attr=edge_attr,
            y=y
        )
        
        account_info = {
            "account_to_idx": self.account_to_idx,
            "idx_to_account": self.idx_to_account,
            "num_nodes": num_nodes,
            "num_edges": edge_index.size(1)
        }
        
        return data, account_info
    
    def _compute_node_features(self, accounts, transactions):
        """
        Compute features for each node (account)
        
        Features:
        1. balance (normalized)
        2. transaction_count
        3. avg_transaction_amount
        4. account_age_days (normalized)
        5. unique_counterparties
        6. in_degree (incoming transfers)
        7. out_degree (outgoing transfers)
        """
        num_nodes = len(accounts)
        features = np.zeros((num_nodes, 7))
        
        # Aggregate statistics per account
        account_stats = {acc: {
            "in_amount": 0,
            "out_amount": 0,
            "in_count": 0,
            "out_count": 0,
            "counterparties": set(),
            "balance": np.random.uniform(1000, 100000),  # Simulated
            "age": np.random.randint(30, 3650)  # Simulated age in days
        } for acc in accounts}
        
        for tx in transactions:
            from_acc = tx.get("from") or tx.get("debtor")
            to_acc = tx.get("to") or tx.get("creditor")
            amount = tx.get("amount", 0)
            
            account_stats[from_acc]["out_amount"] += amount
            account_stats[from_acc]["out_count"] += 1
            account_stats[from_acc]["counterparties"].add(to_acc)
            
            account_stats[to_acc]["in_amount"] += amount
            account_stats[to_acc]["in_count"] += 1
            account_stats[to_acc]["counterparties"].add(from_acc)
        
        # Convert to feature matrix
        for i, acc in enumerate(accounts):
            stats = account_stats[acc]
            
            total_tx = stats["in_count"] + stats["out_count"]
            total_amount = stats["in_amount"] + stats["out_amount"]
            
            features[i, 0] = stats["balance"] / 100000  # Normalized balance
            features[i, 1] = total_tx  # Transaction count
            features[i, 2] = (total_amount / max(total_tx, 1)) / 10000  # Avg tx amount
            features[i, 3] = stats["age"] / 365  # Age in years
            features[i, 4] = len(stats["counterparties"])  # Unique counterparties
            features[i, 5] = stats["in_count"]  # In-degree
            features[i, 6] = stats["out_count"]  # Out-degree
        
        return features
    
    def build_adjacency_matrix(self, num_nodes, edge_index):
        """
        Build adjacency matrix from edge_index
        
        Args:
            num_nodes: Number of nodes
            edge_index: Edge connectivity tensor [2, num_edges]
            
        Returns:
            adj: Adjacency matrix [num_nodes, num_nodes]
        """
        adj = torch.zeros(num_nodes, num_nodes)
        
        for i in range(edge_index.size(1)):
            src = edge_index[0, i].item()
            dst = edge_index[1, i].item()
            adj[src, dst] = 1
        
        # Add self-loops
        adj = adj + torch.eye(num_nodes)
        
        # Normalize (D^-1 * A)
        degree = adj.sum(dim=1, keepdim=True)
        adj = adj / degree.clamp(min=1)
        
        return adj


def build_graph_from_json(json_data, labels=None):
    """
    Convenience function to build graph from JSON data
    
    Args:
        json_data: Dict containing "transactions" key
        labels: Optional account labels
        
    Returns:
        data: Graph data
        info: Account info
    """
    builder = TransactionGraphBuilder()
    transactions = json_data.get("transactions", json_data)
    
    if isinstance(transactions, dict):
        transactions = list(transactions.values())
    
    return builder.build_graph(transactions, labels)


if __name__ == "__main__":
    # Test graph building
    print("Testing Graph Builder...")
    
    sample_transactions = [
        {"from": "ACC001", "to": "ACC002", "amount": 50000},
        {"from": "ACC002", "to": "ACC003", "amount": 48000},
        {"from": "ACC003", "to": "ACC004", "amount": 45000},
        {"from": "ACC001", "to": "ACC003", "amount": 10000},
        {"from": "ACC004", "to": "ACC005", "amount": 40000},
    ]
    
    labels = {
        "ACC001": 0,  # Normal
        "ACC002": 1,  # Mule
        "ACC003": 1,  # Mule
        "ACC004": 1,  # Mule
        "ACC005": 0,  # Normal (victim)
    }
    
    builder = TransactionGraphBuilder()
    data, info = builder.build_graph(sample_transactions, labels)
    
    print(f"Nodes: {info['num_nodes']}")
    print(f"Edges: {info['num_edges']}")
    print(f"Node features shape: {data.x.shape}")
    print(f"Edge index shape: {data.edge_index.shape}")
    print(f"Labels: {data.y.tolist()}")
    print("✅ Graph Builder test passed!")
