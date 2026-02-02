"""
Data Generator - Generate synthetic fraud transaction data for training

Creates realistic transaction patterns including:
- Normal transactions between legitimate accounts
- Mule account chains (money laundering patterns)
"""

import json
import random
import numpy as np
from datetime import datetime, timedelta


class FraudDataGenerator:
    """
    Generate synthetic fraud detection training data
    """
    
    def __init__(self, seed=42):
        random.seed(seed)
        np.random.seed(seed)
        
        # Thai bank codes
        self.banks = ["SCB", "KBANK", "TTB", "BBL", "BAY"]
        
        # Thai names for accounts
        self.first_names = [
            "สมชาย", "สมหญิง", "วิชัย", "วิภา", "ประเสริฐ",
            "สุดา", "มานะ", "นิภา", "ศรีวรรณ", "ทองดี",
            "บุญมี", "สมศรี", "วันชัย", "รัตนา", "พรชัย"
        ]
        self.last_names = [
            "รักษาทรัพย์", "มีสุข", "ใจดี", "สมบูรณ์", "ทองคำ",
            "เจริญผล", "แสงทอง", "วิบูลย์", "เพชรดี", "รักชาติ"
        ]
        
    def generate_dataset(self, num_normal=50, num_mule_chains=5, chain_length=4):
        """
        Generate a complete dataset with normal and fraudulent transactions
        
        Args:
            num_normal: Number of normal accounts
            num_mule_chains: Number of mule account chains
            chain_length: Length of each mule chain
            
        Returns:
            dict: Dataset with transactions, accounts, and labels
        """
        accounts = []
        transactions = []
        labels = {}
        
        # Generate normal accounts
        for i in range(num_normal):
            acc_id = f"NORM{i:04d}"
            bank = random.choice(self.banks)
            account = self._create_account(acc_id, bank, "normal")
            accounts.append(account)
            labels[acc_id] = 0  # Normal
        
        # Generate mule chains
        mule_accounts = []
        for chain in range(num_mule_chains):
            chain_accounts = []
            for pos in range(chain_length):
                acc_id = f"MULE{chain:02d}{pos:02d}"
                bank = random.choice(self.banks)
                account = self._create_account(acc_id, bank, "mule")
                accounts.append(account)
                chain_accounts.append(acc_id)
                labels[acc_id] = 1  # Fraud/Mule
            mule_accounts.append(chain_accounts)
        
        # Generate normal transactions (between normal accounts)
        for _ in range(num_normal * 2):
            normal_accs = [a["id"] for a in accounts if a["type"] == "normal"]
            from_acc = random.choice(normal_accs)
            to_acc = random.choice([a for a in normal_accs if a != from_acc])
            
            tx = self._create_transaction(from_acc, to_acc, "normal")
            transactions.append(tx)
        
        # Generate mule chain transactions (money laundering pattern)
        for chain in mule_accounts:
            # Initial large deposit from "victim"
            victim = random.choice([a["id"] for a in accounts if a["type"] == "normal"])
            initial_amount = random.uniform(200000, 500000)
            
            # Transfer through chain
            current_amount = initial_amount
            for i in range(len(chain) - 1):
                # Each transfer loses some money (fees, withdrawal)
                transfer_amount = current_amount * random.uniform(0.85, 0.95)
                tx = self._create_transaction(
                    chain[i] if i > 0 else victim,
                    chain[i] if i == 0 else chain[i],
                    "suspicious",
                    amount=transfer_amount
                )
                transactions.append(tx)
                
                # Transfer to next in chain
                if i < len(chain) - 1:
                    tx = self._create_transaction(
                        chain[i],
                        chain[i + 1],
                        "suspicious",
                        amount=transfer_amount * random.uniform(0.9, 0.98)
                    )
                    transactions.append(tx)
                    current_amount = transfer_amount * 0.95
        
        return {
            "accounts": accounts,
            "transactions": transactions,
            "labels": labels,
            "metadata": {
                "num_normal": num_normal,
                "num_mule_chains": num_mule_chains,
                "chain_length": chain_length,
                "total_accounts": len(accounts),
                "total_transactions": len(transactions),
                "fraud_ratio": sum(labels.values()) / len(labels)
            }
        }
    
    def _create_account(self, acc_id, bank, acc_type):
        """Create an account dictionary"""
        return {
            "id": acc_id,
            "bank": bank,
            "type": acc_type,
            "name": f"{random.choice(self.first_names)} {random.choice(self.last_names)}",
            "balance": random.uniform(1000, 100000) if acc_type == "normal" else random.uniform(0, 5000),
            "created_at": (datetime.now() - timedelta(days=random.randint(30, 3650))).isoformat()
        }
    
    def _create_transaction(self, from_acc, to_acc, tx_type, amount=None):
        """Create a transaction dictionary"""
        if amount is None:
            if tx_type == "normal":
                amount = random.uniform(100, 10000)
            else:
                amount = random.uniform(50000, 200000)
        
        return {
            "id": f"TX{random.randint(100000, 999999)}",
            "from": from_acc,
            "to": to_acc,
            "amount": round(amount, 2),
            "type": tx_type,
            "timestamp": (datetime.now() - timedelta(
                hours=random.randint(0, 168)
            )).isoformat(),
            "currency": "THB"
        }
    
    def save_dataset(self, dataset, filepath):
        """Save dataset to JSON file"""
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(dataset, f, ensure_ascii=False, indent=2)
        print(f"Dataset saved to {filepath}")
    
    def load_dataset(self, filepath):
        """Load dataset from JSON file"""
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)


if __name__ == "__main__":
    # Generate sample dataset
    generator = FraudDataGenerator()
    
    dataset = generator.generate_dataset(
        num_normal=30,
        num_mule_chains=5,
        chain_length=4
    )
    
    print(f"Generated dataset:")
    print(f"  - Accounts: {dataset['metadata']['total_accounts']}")
    print(f"  - Transactions: {dataset['metadata']['total_transactions']}")
    print(f"  - Fraud ratio: {dataset['metadata']['fraud_ratio']:.2%}")
    
    # Save to file
    import os
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(data_dir, exist_ok=True)
    
    filepath = os.path.join(data_dir, "sample_transactions.json")
    generator.save_dataset(dataset, filepath)
    
    print("✅ Sample dataset generated!")
