/**
 * Graph Visualization Module
 * Interactive network graph for Link Analysis using vis.js
 */

class NetworkGraph {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.network = null;
    this.nodes = null;
    this.edges = null;
    this.selectedNode = null;
  }

  /**
   * Initialize the network graph
   */
  init(nodesData, edgesData) {
    // Transform nodes for vis.js
    this.nodes = new vis.DataSet(nodesData.map(node => ({
      id: node.id,
      label: node.label,
      title: `${node.label}\nBank: ${node.bank}\nRisk: ${node.riskScore}%`,
      color: this.getNodeStyle(node.type, node.riskScore),
      font: {
        color: '#ffffff',
        size: 12,
        face: 'Rajdhani'
      },
      borderWidth: 2,
      shadow: {
        enabled: true,
        color: this.getShadowColor(node.type),
        size: 15,
        x: 0,
        y: 0
      },
      // Custom data
      nodeType: node.type,
      bank: node.bank,
      riskScore: node.riskScore
    })));

    // Transform edges for vis.js
    this.edges = new vis.DataSet(edgesData.map((edge, index) => ({
      id: `edge_${index}`,
      from: edge.from,
      to: edge.to,
      label: this.formatEdgeLabel(edge.amount),
      color: {
        color: edge.suspicious ? '#ff00ff' : '#00f5ff',
        opacity: edge.suspicious ? 0.8 : 0.4,
        highlight: '#ffffff'
      },
      width: Math.max(1, Math.log10(edge.amount / 1000)),
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.5
        }
      },
      font: {
        color: '#a0a0b0',
        size: 10,
        face: 'Rajdhani',
        strokeWidth: 0,
        background: 'rgba(10, 10, 20, 0.8)'
      },
      smooth: {
        type: 'curvedCW',
        roundness: 0.2
      },
      // Custom data
      amount: edge.amount,
      suspicious: edge.suspicious
    })));

    // Network options
    const options = {
      nodes: {
        shape: 'dot',
        size: 25,
        borderWidthSelected: 3
      },
      edges: {
        smooth: {
          type: 'curvedCW',
          forceDirection: 'none',
          roundness: 0.2
        }
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 150,
          springConstant: 0.08,
          damping: 0.4
        },
        stabilization: {
          enabled: true,
          iterations: 200,
          fit: true
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
        navigationButtons: false,
        keyboard: {
          enabled: true
        }
      },
      layout: {
        improvedLayout: true,
        randomSeed: 42
      }
    };

    // Create the network
    const data = { nodes: this.nodes, edges: this.edges };
    this.network = new vis.Network(this.container, data, options);

    // Bind events
    this.bindEvents();

    // Initial zoom
    this.network.once('stabilizationIterationsDone', () => {
      this.network.fit({
        animation: {
          duration: 1000,
          easingFunction: 'easeInOutQuad'
        }
      });
    });
  }

  /**
   * Get node style based on type
   */
  getNodeStyle(type, riskScore) {
    const baseStyles = {
      mule: {
        background: '#ff00ff',
        border: '#ff66ff',
        highlight: { background: '#ff33ff', border: '#ffffff' },
        hover: { background: '#ff33ff', border: '#ffffff' }
      },
      suspect: {
        background: '#ffff00',
        border: '#ffff66',
        highlight: { background: '#ffff33', border: '#ffffff' },
        hover: { background: '#ffff33', border: '#ffffff' }
      },
      normal: {
        background: '#00f5ff',
        border: '#66ffff',
        highlight: { background: '#33ffff', border: '#ffffff' },
        hover: { background: '#33ffff', border: '#ffffff' }
      }
    };

    return baseStyles[type] || baseStyles.normal;
  }

  /**
   * Get shadow color for glow effect
   */
  getShadowColor(type) {
    switch (type) {
      case 'mule': return 'rgba(255, 0, 255, 0.6)';
      case 'suspect': return 'rgba(255, 255, 0, 0.6)';
      default: return 'rgba(0, 245, 255, 0.6)';
    }
  }

  /**
   * Format edge label (amount)
   */
  formatEdgeLabel(amount) {
    if (amount >= 1000000) return `฿${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `฿${(amount / 1000).toFixed(0)}K`;
    return `฿${amount}`;
  }

  /**
   * Bind network events
   */
  bindEvents() {
    // Click event
    this.network.on('click', (params) => {
      if (params.nodes.length > 0) {
        this.selectNode(params.nodes[0]);
      } else {
        this.deselectNode();
      }
    });

    // Double-click to focus
    this.network.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        this.focusOnNode(params.nodes[0]);
      }
    });

    // Hover events
    this.network.on('hoverNode', (params) => {
      this.container.style.cursor = 'pointer';
    });

    this.network.on('blurNode', () => {
      this.container.style.cursor = 'default';
    });
  }

  /**
   * Select a node and show details
   */
  selectNode(nodeId) {
    this.selectedNode = nodeId;
    const node = this.nodes.get(nodeId);
    
    // Highlight connected nodes
    const connectedNodes = this.network.getConnectedNodes(nodeId);
    const connectedEdges = this.network.getConnectedEdges(nodeId);

    // Update node details panel
    this.showNodeDetails(node, connectedNodes, connectedEdges);

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('nodeSelected', { 
      detail: { node, connectedNodes, connectedEdges } 
    }));
  }

  /**
   * Deselect node
   */
  deselectNode() {
    this.selectedNode = null;
    this.hideNodeDetails();
    
    window.dispatchEvent(new CustomEvent('nodeDeselected'));
  }

  /**
   * Focus on a specific node
   */
  focusOnNode(nodeId) {
    this.network.focus(nodeId, {
      scale: 1.5,
      animation: {
        duration: 500,
        easingFunction: 'easeInOutQuad'
      }
    });
  }

  /**
   * Show node details panel
   */
  showNodeDetails(node, connectedNodes, connectedEdges) {
    const panel = document.getElementById('nodeDetails');
    if (!panel) return;

    // Calculate total flow
    let inflow = 0, outflow = 0;
    connectedEdges.forEach(edgeId => {
      const edge = this.edges.get(edgeId);
      if (edge.to === node.id) {
        inflow += edge.amount;
      } else {
        outflow += edge.amount;
      }
    });

    // Update panel content
    document.getElementById('nodeId').textContent = node.id;
    document.getElementById('nodeBank').textContent = node.bank;
    document.getElementById('nodeRisk').textContent = `${node.riskScore}%`;
    document.getElementById('nodeRisk').className = `node-detail-value risk-${HydraData.getRiskLevel(node.riskScore)}`;
    document.getElementById('nodeConnections').textContent = connectedNodes.length;
    document.getElementById('nodeInflow').textContent = HydraData.formatCurrency(inflow);
    document.getElementById('nodeOutflow').textContent = HydraData.formatCurrency(outflow);

    panel.classList.add('active');
  }

  /**
   * Hide node details panel
   */
  hideNodeDetails() {
    const panel = document.getElementById('nodeDetails');
    if (panel) {
      panel.classList.remove('active');
    }
  }

  /**
   * Zoom controls
   */
  zoomIn() {
    const scale = this.network.getScale() * 1.3;
    this.network.moveTo({ scale, animation: { duration: 300 } });
  }

  zoomOut() {
    const scale = this.network.getScale() / 1.3;
    this.network.moveTo({ scale, animation: { duration: 300 } });
  }

  fitAll() {
    this.network.fit({
      animation: { duration: 500, easingFunction: 'easeInOutQuad' }
    });
  }

  /**
   * Highlight suspicious path
   */
  highlightSuspiciousPath() {
    const muleNodes = HydraData.nodes
      .filter(n => n.type === 'mule' || n.type === 'suspect')
      .map(n => n.id);

    this.network.selectNodes(muleNodes, true);
  }

  /**
   * Reset view
   */
  reset() {
    this.network.unselectAll();
    this.deselectNode();
    this.fitAll();
  }

  /**
   * Add a new node dynamically
   */
  addNode(node) {
    this.nodes.add({
      id: node.id,
      label: node.label,
      color: this.getNodeStyle(node.type, node.riskScore),
      font: { color: '#ffffff', size: 12, face: 'Rajdhani' },
      borderWidth: 2,
      shadow: {
        enabled: true,
        color: this.getShadowColor(node.type),
        size: 15
      },
      nodeType: node.type,
      bank: node.bank,
      riskScore: node.riskScore
    });
  }

  /**
   * Add a new edge dynamically
   */
  addEdge(edge) {
    this.edges.add({
      id: `edge_${Date.now()}`,
      from: edge.from,
      to: edge.to,
      label: this.formatEdgeLabel(edge.amount),
      color: {
        color: edge.suspicious ? '#ff00ff' : '#00f5ff',
        opacity: edge.suspicious ? 0.8 : 0.4
      },
      width: Math.max(1, Math.log10(edge.amount / 1000)),
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      font: {
        color: '#a0a0b0',
        size: 10,
        background: 'rgba(10, 10, 20, 0.8)'
      },
      amount: edge.amount,
      suspicious: edge.suspicious
    });
  }

  /**
   * Update node risk level
   */
  updateNodeRisk(nodeId, newRiskScore, newType) {
    this.nodes.update({
      id: nodeId,
      color: this.getNodeStyle(newType, newRiskScore),
      shadow: { color: this.getShadowColor(newType) },
      nodeType: newType,
      riskScore: newRiskScore
    });
  }
}

// Export
window.NetworkGraph = NetworkGraph;
