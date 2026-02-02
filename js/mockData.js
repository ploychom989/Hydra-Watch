/**
 * Mock Data for Hydra Watch Dashboard
 * Simulated transaction data in ISO 20022 format
 */

// ====================================
// MOCK ACCOUNTS
// ====================================
const mockAccounts = [
  { id: 'ACC001', name: 'สมชาย มั่งมี', bank: 'SCB', type: 'normal', riskScore: 15 },
  { id: 'ACC002', name: 'สมหญิง รวยดี', bank: 'Kbank', type: 'normal', riskScore: 8 },
  { id: 'ACC003', name: 'Mule_Alpha', bank: 'TTB', type: 'mule', riskScore: 92 },
  { id: 'ACC004', name: 'Mule_Beta', bank: 'BBL', type: 'mule', riskScore: 88 },
  { id: 'ACC005', name: 'Mule_Gamma', bank: 'BAY', type: 'mule', riskScore: 95 },
  { id: 'ACC006', name: 'Boss_X', bank: 'SCB', type: 'suspect', riskScore: 78 },
  { id: 'ACC007', name: 'วิชัย ธรรมดา', bank: 'Kbank', type: 'normal', riskScore: 12 },
  { id: 'ACC008', name: 'นารี ปกติ', bank: 'TTB', type: 'normal', riskScore: 5 },
  { id: 'ACC009', name: 'Suspect_Y', bank: 'BBL', type: 'suspect', riskScore: 72 },
  { id: 'ACC010', name: 'Mule_Delta', bank: 'BAY', type: 'mule', riskScore: 85 },
  { id: 'ACC011', name: 'องค์กร_Z', bank: 'SCB', type: 'suspect', riskScore: 68 },
  { id: 'ACC012', name: 'ประชา ดี', bank: 'Kbank', type: 'normal', riskScore: 3 },
];

// ====================================
// MOCK TRANSACTIONS (ISO 20022 Format)
// ====================================
const mockTransactions = [
  {
    TxId: 'TX20260129001',
    CreDtTm: '2026-01-29T00:15:23+07:00',
    Amt: { Ccy: 'THB', Val: 150000 },
    Dbtr: { AcctId: 'ACC001', Nm: 'สมชาย มั่งมี' },
    Cdtr: { AcctId: 'ACC003', Nm: 'Mule_Alpha' },
    RiskScore: 92,
    Status: 'blocked',
    Flags: ['velocity', 'mule_network']
  },
  {
    TxId: 'TX20260129002',
    CreDtTm: '2026-01-29T00:14:55+07:00',
    Amt: { Ccy: 'THB', Val: 50000 },
    Dbtr: { AcctId: 'ACC003', Nm: 'Mule_Alpha' },
    Cdtr: { AcctId: 'ACC004', Nm: 'Mule_Beta' },
    RiskScore: 95,
    Status: 'blocked',
    Flags: ['rapid_transfer', 'mule_chain']
  },
  {
    TxId: 'TX20260129003',
    CreDtTm: '2026-01-29T00:14:52+07:00',
    Amt: { Ccy: 'THB', Val: 50000 },
    Dbtr: { AcctId: 'ACC003', Nm: 'Mule_Alpha' },
    Cdtr: { AcctId: 'ACC005', Nm: 'Mule_Gamma' },
    RiskScore: 94,
    Status: 'blocked',
    Flags: ['split_transfer', 'mule_chain']
  },
  {
    TxId: 'TX20260129004',
    CreDtTm: '2026-01-29T00:14:48+07:00',
    Amt: { Ccy: 'THB', Val: 48000 },
    Dbtr: { AcctId: 'ACC004', Nm: 'Mule_Beta' },
    Cdtr: { AcctId: 'ACC006', Nm: 'Boss_X' },
    RiskScore: 88,
    Status: 'flagged',
    Flags: ['aggregation', 'boss_account']
  },
  {
    TxId: 'TX20260129005',
    CreDtTm: '2026-01-29T00:12:30+07:00',
    Amt: { Ccy: 'THB', Val: 5000 },
    Dbtr: { AcctId: 'ACC007', Nm: 'วิชัย ธรรมดา' },
    Cdtr: { AcctId: 'ACC008', Nm: 'นารี ปกติ' },
    RiskScore: 8,
    Status: 'cleared',
    Flags: []
  },
  {
    TxId: 'TX20260129006',
    CreDtTm: '2026-01-29T00:10:15+07:00',
    Amt: { Ccy: 'THB', Val: 75000 },
    Dbtr: { AcctId: 'ACC002', Nm: 'สมหญิง รวยดี' },
    Cdtr: { AcctId: 'ACC010', Nm: 'Mule_Delta' },
    RiskScore: 78,
    Status: 'flagged',
    Flags: ['new_recipient', 'high_amount']
  },
  {
    TxId: 'TX20260129007',
    CreDtTm: '2026-01-29T00:08:42+07:00',
    Amt: { Ccy: 'THB', Val: 25000 },
    Dbtr: { AcctId: 'ACC010', Nm: 'Mule_Delta' },
    Cdtr: { AcctId: 'ACC009', Nm: 'Suspect_Y' },
    RiskScore: 72,
    Status: 'pending',
    Flags: ['suspect_link']
  },
  {
    TxId: 'TX20260129008',
    CreDtTm: '2026-01-29T00:05:20+07:00',
    Amt: { Ccy: 'THB', Val: 3500 },
    Dbtr: { AcctId: 'ACC012', Nm: 'ประชา ดี' },
    Cdtr: { AcctId: 'ACC007', Nm: 'วิชัย ธรรมดา' },
    RiskScore: 5,
    Status: 'cleared',
    Flags: []
  }
];

// ====================================
// MOCK NETWORK GRAPH DATA
// ====================================
const mockNetworkNodes = [
  { id: 'ACC001', label: 'สมชาย\nมั่งมี', type: 'normal', bank: 'SCB', riskScore: 15 },
  { id: 'ACC002', label: 'สมหญิง\nรวยดี', type: 'normal', bank: 'Kbank', riskScore: 8 },
  { id: 'ACC003', label: 'Mule\nAlpha', type: 'mule', bank: 'TTB', riskScore: 92 },
  { id: 'ACC004', label: 'Mule\nBeta', type: 'mule', bank: 'BBL', riskScore: 88 },
  { id: 'ACC005', label: 'Mule\nGamma', type: 'mule', bank: 'BAY', riskScore: 95 },
  { id: 'ACC006', label: 'Boss\nX', type: 'suspect', bank: 'SCB', riskScore: 78 },
  { id: 'ACC007', label: 'วิชัย\nธรรมดา', type: 'normal', bank: 'Kbank', riskScore: 12 },
  { id: 'ACC008', label: 'นารี\nปกติ', type: 'normal', bank: 'TTB', riskScore: 5 },
  { id: 'ACC009', label: 'Suspect\nY', type: 'suspect', bank: 'BBL', riskScore: 72 },
  { id: 'ACC010', label: 'Mule\nDelta', type: 'mule', bank: 'BAY', riskScore: 85 },
  { id: 'ACC011', label: 'องค์กร\nZ', type: 'suspect', bank: 'SCB', riskScore: 68 },
  { id: 'ACC012', label: 'ประชา\nดี', type: 'normal', bank: 'Kbank', riskScore: 3 },
];

const mockNetworkEdges = [
  { from: 'ACC001', to: 'ACC003', amount: 150000, suspicious: true },
  { from: 'ACC003', to: 'ACC004', amount: 50000, suspicious: true },
  { from: 'ACC003', to: 'ACC005', amount: 50000, suspicious: true },
  { from: 'ACC004', to: 'ACC006', amount: 48000, suspicious: true },
  { from: 'ACC005', to: 'ACC006', amount: 48000, suspicious: true },
  { from: 'ACC002', to: 'ACC010', amount: 75000, suspicious: true },
  { from: 'ACC010', to: 'ACC009', amount: 25000, suspicious: true },
  { from: 'ACC009', to: 'ACC011', amount: 20000, suspicious: false },
  { from: 'ACC007', to: 'ACC008', amount: 5000, suspicious: false },
  { from: 'ACC012', to: 'ACC007', amount: 3500, suspicious: false },
];

// ====================================
// MOCK ALERTS
// ====================================
const mockAlerts = [
  {
    id: 'ALT001',
    type: 'critical',
    title: 'Mule Network Detected',
    description: 'Rapid fund splitting pattern detected. 3 accounts transferring ฿150,000 within 30 seconds.',
    accounts: ['ACC003', 'ACC004', 'ACC005'],
    timestamp: '2026-01-29T00:15:25+07:00',
    status: 'active'
  },
  {
    id: 'ALT002',
    type: 'critical',
    title: 'Boss Account Aggregation',
    description: 'Account ACC006 receiving funds from multiple mule accounts.',
    accounts: ['ACC006'],
    timestamp: '2026-01-29T00:14:50+07:00',
    status: 'active'
  },
  {
    id: 'ALT003',
    type: 'warning',
    title: 'High-Risk Transfer',
    description: 'Large transfer (฿75,000) to account with high risk score.',
    accounts: ['ACC002', 'ACC010'],
    timestamp: '2026-01-29T00:10:17+07:00',
    status: 'investigating'
  },
  {
    id: 'ALT004',
    type: 'warning',
    title: 'Suspect Network Link',
    description: 'Transaction detected between flagged accounts.',
    accounts: ['ACC010', 'ACC009'],
    timestamp: '2026-01-29T00:08:45+07:00',
    status: 'active'
  }
];

// ====================================
// DASHBOARD STATISTICS
// ====================================
const mockStats = {
  transactionsToday: 1247,
  transactionsChange: 12.5,
  activeAlerts: 4,
  alertsChange: -8.3,
  blockedAccounts: 23,
  blockedChange: 15.2,
  avgRiskScore: 34.7,
  riskChange: -5.1
};

// ====================================
// HELPER FUNCTIONS
// ====================================

/**
 * Get risk level from score
 */
function getRiskLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Format currency
 */
function formatCurrency(amount, currency = 'THB') {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Format timestamp
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Get node color by type
 */
function getNodeColor(type) {
  switch (type) {
    case 'mule': return '#ff00ff';      // Magenta
    case 'suspect': return '#ffff00';   // Yellow
    default: return '#00f5ff';          // Cyan
  }
}

/**
 * Generate random transaction for simulation
 */
function generateRandomTransaction() {
  const senders = mockAccounts.filter(a => a.type === 'normal');
  const receivers = mockAccounts;
  
  const sender = senders[Math.floor(Math.random() * senders.length)];
  const receiver = receivers[Math.floor(Math.random() * receivers.length)];
  
  const amount = Math.floor(Math.random() * 100000) + 1000;
  const riskScore = receiver.type === 'mule' ? 80 + Math.floor(Math.random() * 20) :
                   receiver.type === 'suspect' ? 60 + Math.floor(Math.random() * 20) :
                   Math.floor(Math.random() * 30);
  
  return {
    TxId: `TX${Date.now()}`,
    CreDtTm: new Date().toISOString(),
    Amt: { Ccy: 'THB', Val: amount },
    Dbtr: { AcctId: sender.id, Nm: sender.name },
    Cdtr: { AcctId: receiver.id, Nm: receiver.name },
    RiskScore: riskScore,
    Status: riskScore >= 80 ? 'blocked' : riskScore >= 60 ? 'flagged' : 'pending',
    Flags: riskScore >= 80 ? ['auto_block'] : []
  };
}

// Export for use in other modules
window.HydraData = {
  accounts: mockAccounts,
  transactions: mockTransactions,
  nodes: mockNetworkNodes,
  edges: mockNetworkEdges,
  alerts: mockAlerts,
  stats: mockStats,
  getRiskLevel,
  formatCurrency,
  formatTime,
  formatRelativeTime,
  getNodeColor,
  generateRandomTransaction
};
