/**
 * Dashboard Controller
 * Manages the main dashboard functionality
 */

// ====================================
// INITIALIZATION
// ====================================
let networkGraph = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  checkAuth();
  
  // Initialize components
  initUserInfo();
  initStats();
  initTransactions();
  initOverviewTransactions();
  initAlerts();
  initOverviewAlerts();
  initFullAlerts();
  initAccountsTable();
  initNetworkGraph();
  initEventListeners();
  
  // Start real-time simulation
  startRealTimeSimulation();
});

/**
 * Check if user is authenticated
 */
function checkAuth() {
  const session = sessionStorage.getItem('hydra_session');
  
  if (!session) {
    // For demo, allow access but show guest mode
    console.log('[Demo Mode] No session found. Running in demo mode.');
    return;
  }
  
  try {
    const user = JSON.parse(session);
    console.log('[Auth] User authenticated:', user.username);
  } catch (e) {
    console.error('[Auth] Invalid session data');
  }
}

/**
 * Initialize user info in sidebar
 */
function initUserInfo() {
  const session = sessionStorage.getItem('hydra_session');
  
  if (session) {
    try {
      const user = JSON.parse(session);
      document.getElementById('userName').textContent = user.username || 'User';
      document.getElementById('userRole').textContent = formatRole(user.role);
      document.getElementById('userAvatar').textContent = getInitials(user.username);
      
      // Show admin section if admin role
      if (user.role === 'admin') {
        document.getElementById('adminSection').style.display = 'block';
      }
    } catch (e) {
      console.error('[User] Failed to parse session');
    }
  } else {
    // Demo mode defaults
    document.getElementById('userName').textContent = 'Demo User';
    document.getElementById('userRole').textContent = 'Risk Management';
    document.getElementById('userAvatar').textContent = 'DU';
  }
}

/**
 * Format role display
 */
function formatRole(role) {
  const roleMap = {
    'risk_management': 'Risk Management',
    'admin': 'Administrator'
  };
  return roleMap[role] || role;
}

/**
 * Get initials from name
 */
function getInitials(name) {
  if (!name) return 'U';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// ====================================
// STATS
// ====================================

/**
 * Initialize statistics cards
 */
function initStats() {
  const stats = HydraData.stats;
  
  document.getElementById('statTransactions').textContent = stats.transactionsToday.toLocaleString();
  document.getElementById('statTxChange').textContent = `${stats.transactionsChange}%`;
  
  document.getElementById('statAlerts').textContent = stats.activeAlerts;
  document.getElementById('statAlertChange').textContent = `${Math.abs(stats.alertsChange)}%`;
  
  document.getElementById('statBlocked').textContent = stats.blockedAccounts;
  document.getElementById('statBlockedChange').textContent = `${stats.blockedChange}%`;
  
  document.getElementById('statRisk').textContent = stats.avgRiskScore.toFixed(1);
  document.getElementById('statRiskChange').textContent = `${Math.abs(stats.riskChange)}%`;
}

// ====================================
// TRANSACTIONS TABLE
// ====================================

/**
 * Initialize transactions table
 */
function initTransactions() {
  const tbody = document.getElementById('transactionTableBody');
  tbody.innerHTML = '';
  
  HydraData.transactions.forEach(tx => {
    const row = createTransactionRow(tx);
    tbody.appendChild(row);
  });
}

/**
 * Create a transaction table row
 */
function createTransactionRow(tx) {
  const row = document.createElement('tr');
  
  const riskLevel = HydraData.getRiskLevel(tx.RiskScore);
  
  row.innerHTML = `
    <td>${HydraData.formatTime(tx.CreDtTm)}</td>
    <td class="tx-id">${tx.TxId}</td>
    <td>${tx.Dbtr.Nm}</td>
    <td>${tx.Cdtr.Nm}</td>
    <td class="tx-amount debit">${HydraData.formatCurrency(tx.Amt.Val)}</td>
    <td>
      <span class="risk-badge ${riskLevel}">${tx.RiskScore}%</span>
    </td>
    <td>
      <span class="status-badge ${tx.Status}">
        <span class="status-dot"></span>
        ${tx.Status}
      </span>
    </td>
  `;
  
  return row;
}

/**
 * Add new transaction to table (simulation)
 */
function addNewTransaction(tx) {
  const tbody = document.getElementById('transactionTableBody');
  const row = createTransactionRow(tx);
  
  // Add animation
  row.style.opacity = '0';
  row.style.transform = 'translateY(-10px)';
  tbody.insertBefore(row, tbody.firstChild);
  
  // Animate in
  requestAnimationFrame(() => {
    row.style.transition = 'all 0.3s ease';
    row.style.opacity = '1';
    row.style.transform = 'translateY(0)';
  });
  
  // Remove oldest if too many rows
  if (tbody.children.length > 10) {
    const lastRow = tbody.lastChild;
    lastRow.style.opacity = '0';
    setTimeout(() => lastRow.remove(), 300);
  }
  
  // Update stats
  const statEl = document.getElementById('statTransactions');
  const current = parseInt(statEl.textContent.replace(/,/g, ''));
  statEl.textContent = (current + 1).toLocaleString();
}

// ====================================
// OVERVIEW PAGE
// ====================================

/**
 * Initialize overview transactions (shortened view)
 */
function initOverviewTransactions() {
  const tbody = document.getElementById('overviewTransactionBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  // Show only first 5 transactions
  const recentTx = HydraData.transactions.slice(0, 5);
  
  recentTx.forEach(tx => {
    const row = document.createElement('tr');
    const riskLevel = HydraData.getRiskLevel(tx.RiskScore);
    
    row.innerHTML = `
      <td>${HydraData.formatTime(tx.CreDtTm)}</td>
      <td class="tx-id">${tx.TxId}</td>
      <td>${tx.Dbtr.Nm.split(' ')[0]} → ${tx.Cdtr.Nm.split(' ')[0]}</td>
      <td class="tx-amount debit">${HydraData.formatCurrency(tx.Amt.Val)}</td>
      <td>
        <span class="risk-badge ${riskLevel}">${tx.RiskScore}%</span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Initialize overview alerts (shortened view)
 */
function initOverviewAlerts() {
  const container = document.getElementById('overviewAlertsList');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Show only first 3 alerts
  const recentAlerts = HydraData.alerts.slice(0, 3);
  
  recentAlerts.forEach(alert => {
    const alertEl = createAlertElement(alert);
    container.appendChild(alertEl);
  });
}

/**
 * Initialize full alerts list (all alerts)
 */
function initFullAlerts() {
  const container = document.getElementById('fullAlertsList');
  if (!container) return;
  
  container.innerHTML = '';
  
  HydraData.alerts.forEach(alert => {
    const alertEl = createAlertElement(alert);
    container.appendChild(alertEl);
  });
}

/**
 * Initialize accounts table
 */
function initAccountsTable() {
  const tbody = document.getElementById('accountsTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  HydraData.nodes.forEach(node => {
    const row = document.createElement('tr');
    const typeClass = node.type === 'mule' ? 'blocked' : 
                      node.type === 'suspect' ? 'flagged' : 'cleared';
    const riskLevel = HydraData.getRiskLevel(node.riskScore);
    
    row.innerHTML = `
      <td class="tx-id">${node.id}</td>
      <td>${node.label}</td>
      <td>${node.bank}</td>
      <td>
        <span class="status-badge ${typeClass}">${node.type}</span>
      </td>
      <td>
        <span class="risk-badge ${riskLevel}">${node.riskScore}%</span>
      </td>
      <td>
        <span class="status-badge ${node.type === 'mule' ? 'blocked' : 'cleared'}">
          ${node.type === 'mule' ? 'Blocked' : 'Active'}
        </span>
      </td>
      <td>
        <button class="panel-btn" onclick="showPage('graph'); setTimeout(() => networkGraph?.selectNode('${node.id}'), 500);">View Graph</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ====================================
// ALERTS
// ====================================

/**
 * Initialize alerts panel (for alerts badge count)
 */
function initAlerts() {
  // Update badge count
  document.getElementById('alertCount').textContent = HydraData.alerts.length;
}

/**
 * Create an alert element
 */
function createAlertElement(alert) {
  const div = document.createElement('div');
  div.className = `alert-item ${alert.type === 'warning' ? 'warning' : ''}`;
  
  div.innerHTML = `
    <div class="alert-icon">
      ${alert.type === 'critical' ? '🚨' : '⚠️'}
    </div>
    <div class="alert-content">
      <div class="alert-title">${alert.title}</div>
      <div class="alert-desc">${alert.description}</div>
      <div class="alert-meta">
        <span>🏦 ${alert.accounts.join(', ')}</span>
        <span>⏰ ${HydraData.formatRelativeTime(alert.timestamp)}</span>
      </div>
    </div>
    <div class="alert-actions">
      <button class="alert-action-btn" onclick="investigateAlert('${alert.id}')">Investigate</button>
      <button class="alert-action-btn block" onclick="blockAccounts('${alert.id}')">Block</button>
    </div>
  `;
  
  return div;
}

/**
 * Investigate alert action
 */
function investigateAlert(alertId) {
  console.log('[Alert] Investigating:', alertId);
  
  // Find the alert
  const alert = HydraData.alerts.find(a => a.id === alertId);
  if (!alert) return;
  
  // Focus on the accounts in the graph
  if (networkGraph && alert.accounts.length > 0) {
    networkGraph.focusOnNode(alert.accounts[0]);
    networkGraph.selectNode(alert.accounts[0]);
  }
  
  showNotification(`Investigating alert ${alertId}`, 'info');
}

/**
 * Block accounts action
 */
function blockAccounts(alertId) {
  console.log('[Alert] Blocking accounts for:', alertId);
  
  const alert = HydraData.alerts.find(a => a.id === alertId);
  if (!alert) return;
  
  // Update alert status
  alert.status = 'resolved';
  
  // Update blocked count
  const statEl = document.getElementById('statBlocked');
  const current = parseInt(statEl.textContent);
  statEl.textContent = current + alert.accounts.length;
  
  showNotification(`Blocked ${alert.accounts.length} accounts`, 'success');
  
  // Re-render alerts
  initAlerts();
}

// ====================================
// NETWORK GRAPH
// ====================================

/**
 * Initialize the network graph
 */
function initNetworkGraph() {
  networkGraph = new NetworkGraph('network-graph');
  networkGraph.init(HydraData.nodes, HydraData.edges);
}

// ====================================
// EVENT LISTENERS
// ====================================

/**
 * Initialize all event listeners
 */
function initEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateToPage(page);
    });
  });
  
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  
  // Refresh
  document.getElementById('refreshBtn')?.addEventListener('click', refresh);
  
  // Export
  document.getElementById('exportBtn')?.addEventListener('click', exportData);
  
  // Graph controls
  document.getElementById('zoomIn')?.addEventListener('click', () => networkGraph?.zoomIn());
  document.getElementById('zoomOut')?.addEventListener('click', () => networkGraph?.zoomOut());
  document.getElementById('fitAll')?.addEventListener('click', () => networkGraph?.fitAll());
  document.getElementById('highlightSuspicious')?.addEventListener('click', () => networkGraph?.highlightSuspiciousPath());
  document.getElementById('resetGraph')?.addEventListener('click', () => networkGraph?.reset());
  document.getElementById('closeNodeDetails')?.addEventListener('click', () => networkGraph?.deselectNode());
  
  // Transaction filter buttons
  document.querySelectorAll('.panel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const parent = e.target.closest('.panel-actions');
      parent?.querySelectorAll('.panel-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  });
}

/**
 * Navigate to page (SPA simulation)
 */
function navigateToPage(page) {
  console.log('[Nav] Navigating to:', page);
  showPage(page);
}

/**
 * Show a specific page
 */
function showPage(page) {
  // Update active nav state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  
  // Hide all pages, show target page
  document.querySelectorAll('.page-content').forEach(pageEl => {
    pageEl.classList.remove('active');
  });
  
  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  // Update title and subtitle
  const pageInfo = {
    overview: { title: 'Dashboard Overview', subtitle: 'Real-time fraud detection & network analysis' },
    transactions: { title: 'Transaction Monitor', subtitle: 'Track and analyze all banking transactions' },
    graph: { title: 'Network Analysis', subtitle: 'Visualize connections between accounts with Link Analysis' },
    alerts: { title: 'Alert Management', subtitle: 'Review and respond to fraud alerts' },
    accounts: { title: 'Account Database', subtitle: 'View all accounts and their risk profiles' },
    gnn: { title: 'GNN Analysis', subtitle: 'Understanding how our AI detects fraud' },
    reports: { title: 'Reports & Analytics', subtitle: 'Performance metrics and fraud statistics' },
    users: { title: 'User Management', subtitle: 'Manage system users and permissions' },
    settings: { title: 'System Settings', subtitle: 'Configure thresholds and notifications' }
  };
  
  const info = pageInfo[page] || { title: 'Dashboard', subtitle: '' };
  document.getElementById('pageTitle').textContent = info.title;
  document.getElementById('pageSubtitle').textContent = info.subtitle;
  
  // Initialize graph when graph page is shown
  if (page === 'graph' && networkGraph) {
    setTimeout(() => networkGraph.fitAll(), 100);
  }
}

/**
 * Logout handler
 */
function logout() {
  sessionStorage.removeItem('hydra_session');
  window.location.href = 'index.html';
}

/**
 * Refresh data
 */
function refresh() {
  showNotification('Refreshing data...', 'info');
  
  // Simulate refresh
  setTimeout(() => {
    initStats();
    initTransactions();
    initAlerts();
    showNotification('Data refreshed', 'success');
  }, 1000);
}

/**
 * Export data
 */
function exportData() {
  const data = {
    exportDate: new Date().toISOString(),
    transactions: HydraData.transactions,
    alerts: HydraData.alerts,
    stats: HydraData.stats
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `hydra-export-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showNotification('Data exported', 'success');
}

// ====================================
// NOTIFICATIONS
// ====================================

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
    font-size: 14px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 300px;
  `;
  
  const colors = {
    info: { bg: 'rgba(0, 245, 255, 0.9)', color: '#0a0a0f' },
    success: { bg: 'rgba(0, 255, 136, 0.9)', color: '#0a0a0f' },
    error: { bg: 'rgba(255, 0, 128, 0.9)', color: '#ffffff' },
    warning: { bg: 'rgba(255, 255, 0, 0.9)', color: '#0a0a0f' }
  };
  
  const style = colors[type] || colors.info;
  notification.style.background = style.bg;
  notification.style.color = style.color;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ====================================
// REAL-TIME SIMULATION
// ====================================

/**
 * Simulate real-time transaction updates
 */
function startRealTimeSimulation() {
  // Add new transaction every 5-15 seconds
  setInterval(() => {
    const newTx = HydraData.generateRandomTransaction();
    addNewTransaction(newTx);
    
    // If high risk, also add as alert
    if (newTx.RiskScore >= 80) {
      const newAlert = {
        id: `ALT${Date.now()}`,
        type: 'critical',
        title: 'Auto-Blocked Transaction',
        description: `High-risk transfer of ${HydraData.formatCurrency(newTx.Amt.Val)} automatically blocked.`,
        accounts: [newTx.Cdtr.AcctId],
        timestamp: new Date().toISOString(),
        status: 'active'
      };
      
      HydraData.alerts.unshift(newAlert);
      initAlerts();
      
      showNotification(`🚨 High-risk transaction blocked!`, 'warning');
    }
  }, Math.random() * 10000 + 5000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  .risk-critical { color: #ff00ff !important; }
  .risk-high { color: #ff6400 !important; }
  .risk-medium { color: #ffff00 !important; }
  .risk-low { color: #00ff88 !important; }
`;
document.head.appendChild(style);
