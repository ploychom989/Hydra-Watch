# Hydra-Watch

**Hydra-Watch** is a next-generation, cyber-themed dashboard integrated with an advanced AI engine for data analysis and visualization. It combines a high-performance frontend with a robust Python-based AI backend.

## 🚀 Features

- **Cyber-Themed Reporting Dashboard**: A visually striking, responsive interface designed with a futuristic "Cyber" aesthetic.
- **Real-time Analytics**: Interactive charts and data visualization.
- **AI Integration**: Powered by a custom Python AI engine for advanced data processing.
- **Authentication**: Secure login and registration flows.
- **GNN Analysis**: Graph Neural Network capabilities for complex data relationship modeling.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Cyber Theme), JavaScript (Vanilla)
- **Backend / AI**: Python 3.x, PyTorch (Assumed for GNN), Flask/FastAPI (Implied for API)

## 📂 Project Structure

```
Hydra-Watch/
├── ai-engine/          # Python AI backend and models
│   ├── models/         # Machine learning models
│   ├── utils/          # Utility scripts
│   ├── api.py          # Backend API entry point
│   └── train.py        # Model training script
├── css/                # Stylesheets (cyber.css)
├── js/                 # Client-side logic (auth.js, mockData.js)
├── index.html          # Landing / Login page
├── dashboard.html      # Main dashboard interface
├── register.html       # User registration page
└── README.md           # Project documentation
```

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ploychom989/Hydra-Watch.git
cd Hydra-Watch
```

### 2. Set up the AI Engine

Navigate to the AI engine directory and install dependencies (ensure you have Python installed).

```bash
cd ai-engine
# Install dependencies (Example - adjust based on actual requirements.txt)
# pip install -r requirements.txt
```

### 3. Run the Application

- **Frontend**: Simply open `index.html` in your web browser or live server.
- **Backend**: Run the API server.
  ```bash
  python api.py
  ```
