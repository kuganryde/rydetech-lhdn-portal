import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Send, 
  Search, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  ExternalLink, 
  RefreshCw, 
  Settings2,
  QrCode,
  Sparkles,
  UploadCloud,
  BarChart3,
  Clock,
  Database,
  Activity,
  Check,
  Layers,
  FileCheck2,
  Sliders,
  Bell
} from 'lucide-react';

const DEFAULT_CONFIG = {
  apiBase: 'https://n8n.rydetechglobal.com/tax-api',
  webhookUrl: 'https://n8n.rydetechglobal.com/webhook/tax-invoice-ingress',
  notificationEmail: 'support@rydetechglobal.com',
  environment: 'sandbox' // sandbox | production
};

export default function App() {
  // Config & Settings State (Persisted in localStorage)
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('rydetech_tax_config');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [activeTab, setActiveTab] = useState('orchestrate'); // orchestrate | mass | track | reports | logs | rag | settings
  const [healthStatus, setHealthStatus] = useState({ online: false, checking: true });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Single Invoice Form State
  const [invoice, setInvoice] = useState({
    invoice_number: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    issue_date: new Date().toISOString().split('T')[0],
    issue_time: '12:00:00Z',
    currency: 'MYR',
    buyer: {
      name: 'PETRONAS DIGITAL SDN BHD',
      tin: 'C25893047020',
      id_type: 'BRN',
      id_value: '202101002345',
      sst_registration: 'W10-1808-32000088',
      email: 'tax.invoicing@petronas.com.my',
      phone: '+60320515000',
      address_line: 'Tower 1, PETRONAS Twin Towers, KLCC',
      city: 'Kuala Lumpur',
      state_code: '14'
    },
    items: [
      {
        classification_code: '022',
        description: 'Sovereign AI Document Automation Engine Implementation',
        quantity: 1,
        unit_price: 45000.0,
        discount_amount: 0.0,
        tax_category: '01' // 8% Service Tax
      },
      {
        classification_code: '022',
        description: 'Enterprise LHDN MyInvois Connector & Compliance Pipeline',
        quantity: 1,
        unit_price: 15000.0,
        discount_amount: 0.0,
        tax_category: '01'
      }
    ]
  });

  const [orchestrationResult, setOrchestrationResult] = useState(null);

  // 2. Mass Upload State
  const [massBatch, setMassBatch] = useState([]);
  const [massProgress, setMassProgress] = useState({ active: false, current: 0, total: 0, percent: 0 });
  const [massResults, setMassResults] = useState([]);
  const [massSummary, setMassSummary] = useState(null);

  // 3. Progress Tracker State
  const [trackQuery, setTrackQuery] = useState('INV-2026-N8N-SUCCESS-FINAL');
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);

  // 4. Reports & Analytics State
  const [reportsData, setReportsData] = useState(null);

  // 5. Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('');

  // 6. RAG State
  const [ragQuery, setRagQuery] = useState('');
  const [ragResult, setRagResult] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [kbDocs, setKbDocs] = useState([]);

  // Save config changes to localStorage
  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('rydetech_tax_config', JSON.stringify(newConfig));
    setSuccessMessage('Configurations successfully saved and synced!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Health check
  const checkHealth = async () => {
    setHealthStatus({ online: false, checking: true });
    try {
      const res = await fetch(`${config.apiBase}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthStatus({ online: true, checking: false, data });
      } else {
        setHealthStatus({ online: false, checking: false });
      }
    } catch {
      setHealthStatus({ online: false, checking: false });
    }
  };

  // Initial load
  useEffect(() => {
    checkHealth();
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'rag') fetchKbDocs();
  }, [activeTab, config.apiBase]);

  // Fetch Reports
  const fetchReports = async () => {
    try {
      const res = await fetch(`${config.apiBase}/tax/reports`);
      if (res.ok) {
        const data = await res.json();
        setReportsData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      const url = logFilter 
        ? `${config.apiBase}/tax/logs?limit=50&record_type=${logFilter}`
        : `${config.apiBase}/tax/logs?limit=50`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch KB Summary
  const fetchKbDocs = async () => {
    try {
      const res = await fetch(`${config.apiBase}/rag/knowledge-summary`);
      if (res.ok) {
        const data = await res.json();
        setKbDocs(data.documents || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Line item manipulation
  const handleAddItem = () => {
    setInvoice({
      ...invoice,
      items: [
        ...invoice.items,
        {
          classification_code: '022',
          description: '',
          quantity: 1,
          unit_price: 1000,
          discount_amount: 0,
          tax_category: '01'
        }
      ]
    });
  };

  const handleRemoveItem = (idx) => {
    setInvoice({ ...invoice, items: invoice.items.filter((_, i) => i !== idx) });
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...invoice.items];
    updated[idx][field] = (field === 'quantity' || field === 'unit_price' || field === 'discount_amount')
      ? parseFloat(val) || 0
      : val;
    setInvoice({ ...invoice, items: updated });
  };

  // Single Orchestrate
  const handleOrchestrateSingle = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${config.apiBase}/tax/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Execution failed');
      }
      const data = await res.json();
      setOrchestrationResult(data);
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Test Webhook Submission
  const handleTriggerWebhook = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
      const data = await res.json();
      setOrchestrationResult(data);
      setSuccessMessage('Webhook executed and verified by n8n backend!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e) {
      setErrorMessage(`Webhook execution error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Track Progress
  const handleTrackInvoice = async (targetNo) => {
    const q = targetNo || trackQuery;
    if (!q) return;
    setTrackLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${config.apiBase}/tax/track/${encodeURIComponent(q.trim())}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Invoice not found');
      }
      const data = await res.json();
      setTrackResult(data);
    } catch (e) {
      setErrorMessage(e.message);
      setTrackResult(null);
    } finally {
      setTrackLoading(false);
    }
  };

  // Generate Sample Mass Batch (5 realistic enterprise invoices)
  const handleGenerateSampleBatch = () => {
    const samples = [
      {
        invoice_number: `INV-2026-LOG-${Math.floor(1000 + Math.random() * 9000)}`,
        issue_date: new Date().toISOString().split('T')[0],
        issue_time: '12:00:00Z',
        currency: 'MYR',
        buyer: {
          name: 'SIME DARBY LOGISTICS BERHAD',
          tin: 'C10492817010',
          id_type: 'BRN',
          id_value: '197201000854',
          email: 'accounts@simedarby.com',
          phone: '+60378484000',
          address_line: 'Oasis Corporate Park',
          city: 'Petaling Jaya',
          state_code: '10'
        },
        items: [
          { classification_code: '022', description: 'Cross-Border Haulage Fleet Management AI', quantity: 1, unit_price: 38000, discount_amount: 0, tax_category: '01' }
        ]
      },
      {
        invoice_number: `INV-2026-CLOUD-${Math.floor(1000 + Math.random() * 9000)}`,
        issue_date: new Date().toISOString().split('T')[0],
        issue_time: '12:00:00Z',
        currency: 'MYR',
        buyer: {
          name: 'TENAGA NASIONAL BERHAD',
          tin: 'C20182910020',
          id_type: 'BRN',
          id_value: '199001009281',
          email: 'invoicing@tnb.com.my',
          phone: '+60322965566',
          address_line: 'No. 129, Jalan Bangsar',
          city: 'Kuala Lumpur',
          state_code: '14'
        },
        items: [
          { classification_code: '022', description: 'Private Cloud Sovereign Inference Cluster Hosting', quantity: 1, unit_price: 85000, discount_amount: 5000, tax_category: '01' }
        ]
      },
      {
        invoice_number: `INV-2026-FMCG-${Math.floor(1000 + Math.random() * 9000)}`,
        issue_date: new Date().toISOString().split('T')[0],
        issue_time: '12:00:00Z',
        currency: 'MYR',
        buyer: {
          name: 'NESTLE PRODUCTS SDN BHD',
          tin: 'C18294029100',
          id_type: 'BRN',
          id_value: '197901005839',
          email: 'procurement@nestle.com.my',
          phone: '+60379656000',
          address_line: '1 Powerhouse, Bandar Utama',
          city: 'Petaling Jaya',
          state_code: '10'
        },
        items: [
          { classification_code: '022', description: 'Automated Delivery Order OCR & PO Reconciler', quantity: 1, unit_price: 28000, discount_amount: 0, tax_category: '01' }
        ]
      }
    ];
    setMassBatch(samples);
  };

  // Mass Upload Execution
  const handleExecuteMassUpload = async () => {
    if (massBatch.length === 0) return;
    setMassProgress({ active: true, current: 0, total: massBatch.length, percent: 0 });
    setMassResults([]);
    setMassSummary(null);

    try {
      const res = await fetch(`${config.apiBase}/tax/batch-orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: massBatch })
      });
      if (!res.ok) {
        throw new Error('Mass orchestration endpoint failed.');
      }
      const data = await res.json();
      setMassResults(data.results || []);
      setMassSummary({
        total: data.total_processed,
        success: data.successful_count,
        held: data.held_count,
        rejected: data.rejected_count,
        netTotal: data.total_net_amount,
        taxTotal: data.total_tax_amount,
        grandTotal: data.grand_total_amount
      });
      setMassProgress({ active: false, current: data.total_processed, total: data.total_processed, percent: 100 });
      setSuccessMessage(`Mass ingestion complete! Processed ${data.total_processed} enterprise invoices.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e) {
      setErrorMessage(`Mass execution failed: ${e.message}`);
      setMassProgress({ active: false, current: 0, total: 0, percent: 0 });
    }
  };

  // CSV File Ingestion Parser
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length < 2) return;

        // Skip header
        const parsed = lines.slice(1).map((line, idx) => {
          const parts = line.split(',').map(p => p.trim());
          return {
            invoice_number: parts[0] || `INV-CSV-${Date.now()}-${idx}`,
            issue_date: parts[1] || new Date().toISOString().split('T')[0],
            issue_time: '12:00:00Z',
            currency: 'MYR',
            buyer: {
              name: parts[2] || 'ENTERPRISE BUYER SDN BHD',
              tin: parts[3] || 'C25893047020',
              id_type: 'BRN',
              id_value: parts[4] || '202101002345',
              email: parts[5] || 'invoicing@buyer.com.my',
              phone: '+60320515000',
              address_line: 'Jalan Sultan Ismail',
              city: 'Kuala Lumpur',
              state_code: '14'
            },
            items: [
              {
                classification_code: '022',
                description: parts[6] || 'Enterprise Software Automation Service',
                quantity: parseFloat(parts[7]) || 1,
                unit_price: parseFloat(parts[8]) || 10000,
                discount_amount: 0,
                tax_category: parts[9] || '01'
              }
            ]
          };
        });
        setMassBatch(parsed);
        setSuccessMessage(`Loaded ${parsed.length} invoices from CSV file.`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch {
        setErrorMessage('Failed to parse CSV. Ensure columns match: InvoiceNo, Date, BuyerName, TIN, BRN, Email, Description, Qty, Price, TaxCategory');
      }
    };
    reader.readAsText(file);
  };

  // Run RAG query
  const handleRagQuery = async (queryText) => {
    const q = queryText || ragQuery;
    if (!q) return;
    setRagLoading(true);
    try {
      const res = await fetch(`${config.apiBase}/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, top_k: 3 })
      });
      if (res.ok) {
        const data = await res.json();
        setRagResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRagLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-xl shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wide text-lg text-white">RYDETECH</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-mono uppercase">
                  {config.environment} Enclave
                </span>
              </div>
              <p className="text-xs text-slate-400">Sovereign Tax Orchestration & LHDN MyInvois Gateway</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live Status indicator */}
            <div className="flex items-center space-x-2 text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/80">
              <div className={`w-2 h-2 rounded-full ${healthStatus.online ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'}`} />
              <span className="text-slate-300">
                {healthStatus.checking ? 'Connecting...' : healthStatus.online ? 'srv1302021 (PDPA 2010)' : 'API Disconnected'}
              </span>
            </div>

            <button 
              onClick={() => setActiveTab('settings')}
              className={`p-1.5 rounded-lg border transition ${activeTab === 'settings' ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
              title="Webhook & API Configurations"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 sm:space-x-4 text-xs font-medium border-t border-slate-800/60 pt-2 overflow-x-auto">
          {[
            { id: 'orchestrate', label: 'Single Ingestion', icon: FileText },
            { id: 'mass', label: 'Mass Document Upload', icon: UploadCloud, badge: massBatch.length > 0 ? massBatch.length : null },
            { id: 'track', label: 'Progress Checker', icon: Clock },
            { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
            { id: 'logs', label: 'Audit Logs', icon: Database },
            { id: 'rag', label: 'LHDN RAG Assistant', icon: Sparkles },
            { id: 'settings', label: 'Webhook & Config', icon: Sliders }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2.5 px-2 flex items-center space-x-1.5 border-b-2 transition whitespace-nowrap ${
                  isActive ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="bg-cyan-950 text-cyan-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono border border-cyan-800">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Notifications Bar */}
      <div className="max-w-7xl w-full mx-auto px-4 pt-4">
        {errorMessage && (
          <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-200 flex items-center space-x-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-200 flex items-center space-x-3 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Main Body View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4">

        {/* TAB 1: SINGLE INVOICE INGESTION */}
        {activeTab === 'orchestrate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Manual Invoice Ingestion</span>
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">Malaysian SST (8%)</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Invoice Number</label>
                  <input 
                    type="text" 
                    value={invoice.invoice_number}
                    onChange={(e) => setInvoice({ ...invoice, invoice_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Issue Date</label>
                  <input 
                    type="date" 
                    value={invoice.issue_date}
                    onChange={(e) => setInvoice({ ...invoice, issue_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Currency</label>
                  <input type="text" value={invoice.currency} disabled className="w-full bg-slate-800/50 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 font-mono" />
                </div>
              </div>

              {/* Buyer */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">Buyer Legal Details</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <input 
                    type="text" 
                    placeholder="Registered Company Name"
                    value={invoice.buyer.name}
                    onChange={(e) => setInvoice({ ...invoice, buyer: { ...invoice.buyer, name: e.target.value } })}
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                  <input 
                    type="text" 
                    placeholder="LHDN TIN (C25893047020)"
                    value={invoice.buyer.tin}
                    onChange={(e) => setInvoice({ ...invoice, buyer: { ...invoice.buyer, tin: e.target.value } })}
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <input 
                    type="text" 
                    placeholder="BRN (12 Digits)"
                    value={invoice.buyer.id_value}
                    onChange={(e) => setInvoice({ ...invoice, buyer: { ...invoice.buyer, id_value: e.target.value } })}
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                  <input 
                    type="text" 
                    placeholder="SST Number"
                    value={invoice.buyer.sst_registration}
                    onChange={(e) => setInvoice({ ...invoice, buyer: { ...invoice.buyer, sst_registration: e.target.value } })}
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                  <input 
                    type="email" 
                    placeholder="Notification Email"
                    value={invoice.buyer.email}
                    onChange={(e) => setInvoice({ ...invoice, buyer: { ...invoice.buyer, email: e.target.value } })}
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Line Items</span>
                  <button onClick={handleAddItem} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {invoice.items.map((it, idx) => (
                    <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center space-x-2 text-xs">
                      <span className="text-slate-500 font-mono text-[11px] w-4">{idx + 1}</span>
                      <input 
                        type="text" 
                        placeholder="Description"
                        value={it.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
                      />
                      <input 
                        type="number" 
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono text-center"
                      />
                      <input 
                        type="number" 
                        placeholder="Price"
                        value={it.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                      />
                      <select 
                        value={it.tax_category}
                        onChange={(e) => handleItemChange(idx, 'tax_category', e.target.value)}
                        className="w-28 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-[11px] font-mono"
                      >
                        <option value="01">01: 8% SST (Standard)</option>
                        <option value="02">02: 6% SST (F&B)</option>
                        <option value="05">05: 0% Zero-Rated</option>
                        <option value="06">06: Tax Exempt</option>
                      </select>
                      {invoice.items.length > 1 && (
                        <button onClick={() => handleRemoveItem(idx)} className="text-slate-500 hover:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button 
                  onClick={handleTriggerWebhook}
                  disabled={loading}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl transition font-medium border border-slate-700 flex items-center space-x-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Execute via Webhook</span>
                </button>
                <button 
                  onClick={handleOrchestrateSingle}
                  disabled={loading}
                  className="flex items-center space-x-2 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white px-4 py-2 rounded-xl transition font-semibold shadow-lg shadow-cyan-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Orchestrating...' : 'Direct Submit to LHDN'}</span>
                </button>
              </div>
            </div>

            {/* Results Output */}
            <div className="lg:col-span-5 space-y-4">
              {orchestrationResult ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border flex items-center space-x-3 ${
                    orchestrationResult.status === 'SUBMITTED_AUTOMATICALLY' || orchestrationResult.status === 'SUCCESS'
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-800 text-amber-200'
                  }`}>
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider">
                        {orchestrationResult.status || orchestrationResult.orchestration_status}
                      </div>
                      <p className="text-[11px] opacity-80">
                        {orchestrationResult.lhdn_document_uuid || orchestrationResult.lhdn_submission?.document_uuid
                          ? 'Validated & Recorded with LHDN MyInvois.'
                          : 'Processed by Sovereign Orchestrator.'}
                      </p>
                    </div>
                  </div>

                  {/* Calculations */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                      <span>Total Net:</span>
                      <span className="text-white">MYR {orchestrationResult.tax_computation?.total_net_amount?.toFixed(2) || orchestrationResult.totals?.net}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800 text-cyan-400">
                      <span>8% Service Tax (SST):</span>
                      <span>MYR {orchestrationResult.tax_computation?.total_tax_amount?.toFixed(2) || orchestrationResult.totals?.sst_8_percent}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm font-bold text-white bg-slate-950 px-2.5 rounded-lg border border-slate-800">
                      <span>Grand Total:</span>
                      <span className="text-emerald-400">MYR {orchestrationResult.tax_computation?.grand_total_amount?.toFixed(2) || orchestrationResult.totals?.grand_total}</span>
                    </div>
                  </div>

                  {/* LHDN QR */}
                  {(orchestrationResult.lhdn_submission?.qr_code_url || orchestrationResult.qr_code_url) && (
                    <div className="bg-slate-900 border border-emerald-900/60 rounded-2xl p-4 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold flex items-center space-x-1">
                          <QrCode className="w-4 h-4" />
                          <span>LHDN Validation Receipt</span>
                        </span>
                        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">VALID</span>
                      </div>
                      <p className="text-slate-400 text-[11px] break-all">
                        UUID: {orchestrationResult.lhdn_submission?.document_uuid || orchestrationResult.lhdn_document_uuid}
                      </p>
                      <a 
                        href={orchestrationResult.lhdn_submission?.qr_code_url || orchestrationResult.qr_code_url}
                        target="_blank" 
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center space-x-1 text-xs pt-1"
                      >
                        <span>Verify on LHDN Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-2 min-h-[300px]">
                  <FileText className="w-8 h-8 text-slate-600" />
                  <p className="text-xs text-slate-400 max-w-xs">
                    Submit an invoice to view the real-time 8% SST calculation, AI verification score, and LHDN QR receipt.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MASS DOCUMENT UPLOAD & INGEST */}
        {activeTab === 'mass' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <UploadCloud className="w-4 h-4 text-cyan-400" />
                    <span>Mass Document Ingestion Engine</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Upload batches of invoices via CSV, JSON, or generate realistic enterprise test datasets.</p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={handleGenerateSampleBatch}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
                  >
                    + Generate 3 Sample Invoices
                  </button>
                  <label className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center space-x-1">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload CSV Batch</span>
                    <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Staged Invoices Queue */}
              {massBatch.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Queue: {massBatch.length} Document(s) Ready for Ingestion</span>
                    <button 
                      onClick={() => setMassBatch([])} 
                      className="text-rose-400 hover:underline"
                    >
                      Clear Queue
                    </button>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Invoice #</th>
                          <th className="p-2.5">Buyer</th>
                          <th className="p-2.5">TIN / BRN</th>
                          <th className="p-2.5">Items</th>
                          <th className="p-2.5">Base Net (MYR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {massBatch.map((inv, i) => (
                          <tr key={i} className="hover:bg-slate-800/30">
                            <td className="p-2.5 text-cyan-400 font-semibold">{inv.invoice_number}</td>
                            <td className="p-2.5 text-slate-200">{inv.buyer?.name}</td>
                            <td className="p-2.5 text-slate-400">{inv.buyer?.tin}</td>
                            <td className="p-2.5 text-slate-300">{inv.items[0]?.description}</td>
                            <td className="p-2.5 text-white font-semibold">
                              MYR {inv.items.reduce((s, it) => s + (it.quantity * it.unit_price), 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={handleExecuteMassUpload}
                      disabled={massProgress.active}
                      className="text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center space-x-2"
                    >
                      <Layers className="w-4 h-4" />
                      <span>{massProgress.active ? `Processing Invoices (${massProgress.percent}%)...` : `Orchestrate All (${massBatch.length}) to LHDN`}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 space-y-2">
                  <UploadCloud className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>No invoices currently queued. Click <strong>Upload CSV Batch</strong> or <strong>Generate Sample Invoices</strong> to begin.</p>
                </div>
              )}
            </div>

            {/* Mass Progress & Results */}
            {massSummary && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span>Batch Execution Summary</span>
                </h3>

                <div className="grid grid-cols-4 gap-4 text-xs font-mono">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">TOTAL INVOICES</span>
                    <span className="text-lg font-bold text-white">{massSummary.total}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-emerald-500 block text-[10px]">AUTO-SUBMITTED</span>
                    <span className="text-lg font-bold text-emerald-400">{massSummary.success}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-cyan-500 block text-[10px]">RECONCILED 8% SST</span>
                    <span className="text-lg font-bold text-cyan-400">MYR {massSummary.taxTotal?.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">BATCH GRAND TOTAL</span>
                    <span className="text-lg font-bold text-white">MYR {massSummary.grandTotal?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Per-Item Results Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden text-xs font-mono">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">8% SST</th>
                        <th className="p-2.5">Total Payable</th>
                        <th className="p-2.5">AI Score</th>
                        <th className="p-2.5">LHDN UUID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {massResults.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="p-2.5 text-cyan-400 font-semibold">{r.invoice_number}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              r.status === 'SUBMITTED_AUTOMATICALLY' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-300">MYR {r.tax_computation?.total_tax_amount?.toFixed(2)}</td>
                          <td className="p-2.5 text-white font-semibold">MYR {r.tax_computation?.grand_total_amount?.toFixed(2)}</td>
                          <td className="p-2.5 text-cyan-400">{r.ai_audit?.confidence_score}%</td>
                          <td className="p-2.5 text-[11px] text-slate-400 truncate max-w-xs">{r.lhdn_submission?.document_uuid || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROGRESS CHECKER & TRACKER */}
        {activeTab === 'track' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Invoice Progress & Validation Checker</span>
              </h2>
              <p className="text-xs text-slate-400">Track the lifecycle milestones of any invoice from intake to LHDN verification receipt.</p>

              <div className="flex space-x-2">
                <input 
                  type="text" 
                  placeholder="Enter Invoice Number or LHDN UUID (e.g., INV-2026-N8N-SUCCESS-FINAL)"
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrackInvoice()}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:border-cyan-500"
                />
                <button 
                  onClick={() => handleTrackInvoice()}
                  disabled={trackLoading}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-5 py-2 rounded-xl text-xs transition"
                >
                  {trackLoading ? 'Searching...' : 'Check Progress'}
                </button>
              </div>

              {/* Quick suggestions */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-500 text-[11px]">Quick Track:</span>
                {['INV-2026-N8N-SUCCESS-FINAL', 'INV-2026-PETRONAS-001', 'INV-CONFIRMATION-01'].map((inv, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      setTrackQuery(inv);
                      handleTrackInvoice(inv);
                    }}
                    className="text-cyan-400 font-mono text-[11px] hover:underline"
                  >
                    {inv}
                  </button>
                ))}
              </div>
            </div>

            {/* Stepper Timeline Output */}
            {trackResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">{trackResult.invoice_number}</h3>
                    <span className="text-xs text-slate-400 font-mono">Events Logged: {trackResult.audit_events_count}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full font-mono font-semibold">
                      {trackResult.overall_status}
                    </span>
                  </div>
                </div>

                {/* Progress Stepper */}
                <div className="space-y-4">
                  {trackResult.stages.map((st, i) => (
                    <div key={i} className="flex items-start space-x-3 text-xs">
                      <div className={`mt-0.5 p-1 rounded-full ${st.completed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-semibold text-slate-200">{st.stage} — {st.name}</span>
                          <span className="text-slate-500 text-[10px]">{st.timestamp || 'Pending'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* LHDN UUID Link */}
                {trackResult.lhdn_document_uuid && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-900 rounded-xl flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-slate-400 text-[11px]">Validated LHDN UUID:</span>
                      <p className="text-emerald-300 font-semibold">{trackResult.lhdn_document_uuid}</p>
                    </div>
                    {trackResult.qr_code_url && (
                      <a 
                        href={trackResult.qr_code_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center space-x-1"
                      >
                        <span>Verify Portal Receipt</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REPORTS & ANALYTICS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Malaysian Tax Financial Analytics</h2>
                <p className="text-xs text-slate-400">Aggregated statutory totals from immutable local enclave ledgers.</p>
              </div>
              <button onClick={fetchReports} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {reportsData ? (
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <span className="text-slate-500 text-[11px] block">TOTAL INVOICES INGESTED</span>
                    <span className="text-2xl font-black text-white mt-1 block">{reportsData.total_invoices_processed}</span>
                    <span className="text-[10px] text-cyan-400 mt-1 block">LHDN MyInvois Protocol</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <span className="text-slate-500 text-[11px] block">RECONCILED 8% SST</span>
                    <span className="text-2xl font-black text-cyan-400 mt-1 block">MYR {reportsData.total_sst_amount?.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">JKDM Statutory Service Tax</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <span className="text-slate-500 text-[11px] block">NET TRANSACTION VALUE</span>
                    <span className="text-2xl font-black text-white mt-1 block">MYR {reportsData.total_net_amount?.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">Pre-tax base value</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
                    <span className="text-slate-500 text-[11px] block">AUTO-APPROVAL RATE</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1 block">{reportsData.auto_approval_rate_percent}%</span>
                    <span className="text-[10px] text-emerald-500 mt-1 block">AI Confidence ≥ 95%</span>
                  </div>
                </div>

                {/* Status Breakdown Bar */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Submission Pipeline Ratio</span>
                    <span className="text-emerald-400">{reportsData.auto_approved_count} Auto-Approved / {reportsData.held_for_review_count} Held</span>
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden flex border border-slate-800">
                    <div 
                      style={{ width: `${reportsData.auto_approval_rate_percent}%` }} 
                      className="bg-emerald-500 h-full transition-all duration-500"
                    />
                    <div 
                      style={{ width: `${100 - reportsData.auto_approval_rate_percent}%` }} 
                      className="bg-amber-500 h-full transition-all duration-500"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-500">
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Direct LHDN Validations ({reportsData.auto_approved_count})</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Held for Review ({reportsData.held_for_review_count})</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 text-slate-500 text-xs font-mono">Loading financial analytics...</div>
            )}
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>Immutable Malaysian PDPA 2010 Audit Log</span>
                </h2>
                <p className="text-xs text-slate-400">Stored on host srv1302021 with zero offshore data leakage.</p>
              </div>

              <div className="flex items-center space-x-2">
                <select 
                  value={logFilter} 
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono"
                >
                  <option value="">All Record Types</option>
                  <option value="END_TO_END_ORCHESTRATION">Orchestrations</option>
                  <option value="LHDN_SUBMISSION">LHDN Submissions</option>
                  <option value="TAX_COMPUTATION">Tax Computations</option>
                  <option value="RAG_QUERY">RAG Lookups</option>
                </select>
                <button onClick={fetchLogs} className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden text-xs font-mono">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Invoice #</th>
                    <th className="p-2.5">Grand Total</th>
                    <th className="p-2.5">Action Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-slate-400 text-[11px]">{log.timestamp}</td>
                      <td className="p-2.5">
                        <span className="text-[10px] bg-slate-800 text-cyan-400 px-2 py-0.5 rounded border border-slate-700">
                          {log.record_type}
                        </span>
                      </td>
                      <td className="p-2.5 text-white font-semibold">{log.payload?.invoice_number || 'N/A'}</td>
                      <td className="p-2.5 text-slate-300">{log.payload?.grand_total ? `MYR ${log.payload.grand_total.toFixed(2)}` : 'N/A'}</td>
                      <td className="p-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          log.payload?.status === 'SUBMITTED_AUTOMATICALLY' || log.payload?.success 
                            ? 'text-emerald-400 bg-emerald-950/60' 
                            : 'text-amber-400 bg-amber-950/60'
                        }`}>
                          {log.payload?.status || (log.payload?.success ? 'SUCCESS' : 'LOGGED')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: RAG REGULATORY ASSISTANT */}
        {activeTab === 'rag' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>LHDN Sovereign Regulatory Intelligence</span>
              </h2>
              <p className="text-xs text-slate-400">
                Natural language inquiries answered with exact legal citations using local dense vectors (<code className="text-cyan-400">nomic-embed-text</code>).
              </p>

              <div className="flex space-x-2">
                <input 
                  type="text"
                  placeholder="e.g., What are the rules for the 72-hour cancellation window?"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRagQuery()}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button 
                  onClick={() => handleRagQuery()}
                  disabled={ragLoading}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-5 py-2 rounded-xl text-xs transition"
                >
                  {ragLoading ? 'Searching...' : 'Ask RAG'}
                </button>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2 text-xs">
                {['What is the 8% SST rate on IT software & digital consulting?', 'When is an e-invoice locked from cancellation under LHDN 72-hour rule?', 'Who must issue a Self-Billed e-Invoice under LHDN rules?'].map((chip, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setRagQuery(chip); handleRagQuery(chip); }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg text-[11px]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {ragResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-emerald-400 font-semibold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Statutory Compliance Guidance</span>
                  </span>
                  <span className="font-mono text-cyan-400 text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    Model: {ragResult.model_used}
                  </span>
                </div>
                <div className="whitespace-pre-line leading-relaxed text-slate-200 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                  {ragResult.answer}
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold block mb-1">Citations</span>
                  {ragResult.citations.map((c, i) => (
                    <div key={i} className="text-cyan-400 font-mono text-[11px] py-1 flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: SETTINGS & WEBHOOK CONFIGURATIONS */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Pipeline & Webhook Settings</span>
                </h2>
                <span className="text-xs text-slate-400 font-mono">Persisted Locally</span>
              </div>

              {/* Webhook Connection Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">n8n Ingress Webhook URL</label>
                <input 
                  type="text" 
                  value={config.webhookUrl}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Incoming invoices submitted via the frontend or ERP systems route through this webhook.</p>
              </div>

              {/* API Base URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">FastAPI Backend Base URL</label>
                <input 
                  type="text" 
                  value={config.apiBase}
                  onChange={(e) => setConfig({ ...config, apiBase: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Endpoint for direct calculations, RAG semantic search, and audit reporting.</p>
              </div>

              {/* Notification Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Receipt & Alert Notification Email</label>
                <input 
                  type="email" 
                  value={config.notificationEmail}
                  onChange={(e) => setConfig({ ...config, notificationEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Confirmations and human-review flags dispatch to this destination.</p>
              </div>

              {/* Environment Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">LHDN MyInvois Environment</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setConfig({ ...config, environment: 'sandbox' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono transition ${
                      config.environment === 'sandbox' ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Pre-Production Sandbox
                  </button>
                  <button 
                    type="button"
                    onClick={() => setConfig({ ...config, environment: 'production' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono transition ${
                      config.environment === 'production' ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Live Production (Real Tax)
                  </button>
                </div>
              </div>

              {/* Save & Reset */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button 
                  onClick={() => handleSaveConfig(DEFAULT_CONFIG)}
                  className="text-xs text-slate-500 hover:text-slate-300 underline font-mono"
                >
                  Reset to Defaults
                </button>
                <button 
                  onClick={() => handleSaveConfig(config)}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition"
                >
                  Save Configurations
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-3 text-center text-xs text-slate-500 font-mono">
        RYDETECH GLOBAL ENTERPRISE (IP0590987H) · Sovereign Tax Enclave srv1302021 · Malaysian PDPA 2010
      </footer>
    </div>
  );
}
