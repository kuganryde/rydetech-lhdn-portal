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
  Sparkles
} from 'lucide-react';

const DEFAULT_API_BASE = 'https://n8n.rydetechglobal.com/tax-api';

export default function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [activeTab, setActiveTab] = useState('orchestrate'); // orchestrate | rag | kb
  const [healthStatus, setHealthStatus] = useState({ online: false, checking: true });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Invoice Form State
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

  // Results State
  const [orchestrationResult, setOrchestrationResult] = useState(null);

  // RAG State
  const [ragQuery, setRagQuery] = useState('');
  const [ragResult, setRagResult] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);

  // Knowledge Base State
  const [kbDocs, setKbDocs] = useState([]);
  const [newDoc, setNewDoc] = useState({
    id: `LHDN-NEW-${Date.now().toString().slice(-4)}`,
    title: '',
    category: 'STATUTORY_UPDATE',
    effective_date: new Date().toISOString().split('T')[0],
    legal_reference: '',
    content: ''
  });

  // Check Backend Health
  const checkHealth = async () => {
    setHealthStatus({ online: false, checking: true });
    try {
      const res = await fetch(`${apiBase}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthStatus({ online: true, checking: false, data });
      } else {
        setHealthStatus({ online: false, checking: false });
      }
    } catch (e) {
      setHealthStatus({ online: false, checking: false });
    }
  };

  useEffect(() => {
    checkHealth();
    fetchKbSummary();
  }, [apiBase]);

  const fetchKbSummary = async () => {
    try {
      const res = await fetch(`${apiBase}/rag/knowledge-summary`);
      if (res.ok) {
        const data = await res.json();
        setKbDocs(data.documents || []);
      }
    } catch (e) {
      console.warn('Failed to fetch KB summary', e);
    }
  };

  // Add Line Item
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

  const handleRemoveItem = (index) => {
    const updated = invoice.items.filter((_, i) => i !== index);
    setInvoice({ ...invoice, items: updated });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...invoice.items];
    updated[index][field] = field === 'quantity' || field === 'unit_price' || field === 'discount_amount' 
      ? parseFloat(value) || 0 
      : value;
    setInvoice({ ...invoice, items: updated });
  };

  // Compute Tax Preview
  const handleComputePreview = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${apiBase}/tax/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Tax calculation failed');
      }
      const data = await res.json();
      setOrchestrationResult({ tax_computation: data, status: 'PREVIEW' });
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Full End-to-End Orchestrate
  const handleOrchestrate = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${apiBase}/tax/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Orchestration execution failed');
      }
      const data = await res.json();
      setOrchestrationResult(data);
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Run RAG Query
  const handleRagQuery = async (queryToRun) => {
    const q = queryToRun || ragQuery;
    if (!q) return;
    setRagLoading(true);
    try {
      const res = await fetch(`${apiBase}/rag/query`, {
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

  // Ingest New Document into KB
  const handleIngestDoc = async (e) => {
    e.preventDefault();
    if (!newDoc.title || !newDoc.content) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/rag/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });
      if (res.ok) {
        alert('Document successfully vectorized and indexed into LHDN RAG store!');
        setNewDoc({
          id: `LHDN-NEW-${Date.now().toString().slice(-4)}`,
          title: '',
          category: 'STATUTORY_UPDATE',
          effective_date: new Date().toISOString().split('T')[0],
          legal_reference: '',
          content: ''
        });
        fetchKbSummary();
      }
    } catch (e) {
      alert(`Ingestion failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wide text-lg text-white">RYDETECH</span>
                <span className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">LHDN SOVEREIGN</span>
              </div>
              <p className="text-xs text-slate-400">Enterprise Malaysian Tax Computing & Auto-Submission</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
              <div className={`w-2 h-2 rounded-full ${healthStatus.online ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'}`} />
              <span className="text-slate-300">
                {healthStatus.checking ? 'Connecting...' : healthStatus.online ? 'srv1302021 (PDPA 2010 ENCLAVE)' : 'Offline / Check API'}
              </span>
            </div>

            <a 
              href="https://n8n.rydetechglobal.com/workflow/3jRap95odWzR4V3q?projectId=jiLlU0sGWmkFEKKx" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center space-x-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition font-medium"
            >
              <span>View n8n Pipeline</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="max-w-7xl mx-auto px-4 flex space-x-6 text-sm font-medium border-t border-slate-800/60 pt-2">
          <button 
            onClick={() => setActiveTab('orchestrate')}
            className={`pb-2.5 flex items-center space-x-2 border-b-2 transition ${activeTab === 'orchestrate' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <FileText className="w-4 h-4" />
            <span>Invoice Ingestion & Auto-Submit</span>
          </button>
          <button 
            onClick={() => setActiveTab('rag')}
            className={`pb-2.5 flex items-center space-x-2 border-b-2 transition ${activeTab === 'rag' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Sparkles className="w-4 h-4" />
            <span>LHDN Regulatory RAG Assistant</span>
          </button>
          <button 
            onClick={() => setActiveTab('kb')}
            className={`pb-2.5 flex items-center space-x-2 border-b-2 transition ${activeTab === 'kb' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Knowledge Base & Circular Ingestion ({kbDocs.length})</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-200 flex items-center space-x-3 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: INVOICE INGESTION & SUBMISSION */}
        {activeTab === 'orchestrate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Form: Ingestion Details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                  <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Malaysian Tax Invoice Ingress</span>
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">LHDN MyInvois UBL 2.1</span>
                </div>

                {/* Header Inputs */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Invoice Number</label>
                    <input 
                      type="text" 
                      value={invoice.invoice_number}
                      onChange={(e) => setInvoice({ ...invoice, invoice_number: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Issue Date</label>
                    <input 
                      type="date" 
                      value={invoice.issue_date}
                      onChange={(e) => setInvoice({ ...invoice, issue_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Currency</label>
                    <input 
                      type="text" 
                      value={invoice.currency} 
                      disabled
                      className="w-full bg-slate-800/50 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-400 font-mono"
                    />
                  </div>
                </div>

                {/* Buyer Information Section */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 mb-4">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Buyer Compliance Data (LHDN Taxpayer)</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Buyer Registered Name</label>
                      <input 
                        type="text" 
                        value={invoice.buyer.name}
                        onChange={(e) => setInvoice({ ...invoice, buyer: { ...invoice.buyer, name: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">LHDN TIN (C-prefix for Corporate)</label>
                      <input 
                        type="text" 
                        value={invoice.buyer.tin}
                        onChange={(e) => setInvoice({ ...invoice, buyer: { ...invoice.buyer, tin: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">BRN (12 Digits)</label>
                      <input 
                        type="text" 
                        value={invoice.buyer.id_value}
                        onChange={(e) => setInvoice({ ...invoice, buyer: { ...invoice.buyer, id_value: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">SST Reg Number</label>
                      <input 
                        type="text" 
                        value={invoice.buyer.sst_registration}
                        onChange={(e) => setInvoice({ ...invoice, buyer: { ...invoice.buyer, sst_registration: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Email Contact</label>
                      <input 
                        type="email" 
                        value={invoice.buyer.email}
                        onChange={(e) => setInvoice({ ...invoice, buyer: { ...invoice.buyer, email: e.target.value } })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Line Items & SST Classification</h3>
                    <button 
                      onClick={handleAddItem}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {invoice.items.map((item, idx) => (
                      <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex items-center space-x-2 text-xs">
                        <span className="text-slate-500 font-mono text-[11px] w-4">{idx + 1}</span>
                        <input 
                          type="text" 
                          placeholder="Item Description"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
                        />
                        <div className="w-16">
                          <input 
                            type="number" 
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                        <div className="w-24">
                          <input 
                            type="number" 
                            placeholder="Unit Price"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                        <div className="w-28">
                          <select 
                            value={item.tax_category}
                            onChange={(e) => handleItemChange(idx, 'tax_category', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono text-[11px]"
                          >
                            <option value="01">01: 8% SST (Standard)</option>
                            <option value="02">02: 6% SST (F&B/Log)</option>
                            <option value="03">03: 10% Sales Tax</option>
                            <option value="05">05: 0% Zero-Rated</option>
                            <option value="06">06: Tax Exempt</option>
                          </select>
                        </div>
                        {invoice.items.length > 1 && (
                          <button 
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button 
                    onClick={handleComputePreview}
                    disabled={loading}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl transition font-medium border border-slate-700"
                  >
                    Compute 8% SST Preview
                  </button>
                  <button 
                    onClick={handleOrchestrate}
                    disabled={loading}
                    className="flex items-center space-x-2 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl transition font-semibold shadow-lg shadow-cyan-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{loading ? 'Orchestrating Sovereign Pipeline...' : 'End-to-End Orchestrate & Submit LHDN'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel: Real-Time Results & LHDN QR */}
            <div className="lg:col-span-5 space-y-6">
              {orchestrationResult ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-2xl border flex items-center space-x-3 ${
                    orchestrationResult.status === 'SUBMITTED_AUTOMATICALLY'
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : orchestrationResult.status === 'HELD_FOR_MANUAL_REVIEW'
                      ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}>
                    {orchestrationResult.status === 'SUBMITTED_AUTOMATICALLY' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wider">
                        {orchestrationResult.status}
                      </div>
                      <p className="text-xs opacity-80">
                        {orchestrationResult.status === 'SUBMITTED_AUTOMATICALLY' 
                          ? 'Passed AI Verification (≥95%) and validated against LHDN MyInvois.'
                          : 'Flagged for Human Review before LHDN transmission.'}
                      </p>
                    </div>
                  </div>

                  {/* Financial Computation Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Reconciled Tax Computation (MYR)</h3>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Total Net Amount:</span>
                        <span className="text-white font-semibold">
                          MYR {orchestrationResult.tax_computation?.total_net_amount?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-cyan-400">Malaysian SST (8%):</span>
                        <span className="text-cyan-400 font-semibold">
                          MYR {orchestrationResult.tax_computation?.total_tax_amount?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 text-sm font-bold text-white bg-slate-950 px-3 rounded-lg border border-slate-800">
                        <span>Grand Total Payable:</span>
                        <span className="text-emerald-400">
                          MYR {orchestrationResult.tax_computation?.grand_total_amount?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Audit Verdict */}
                  {orchestrationResult.ai_audit && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sovereign Ollama AI Audit</h3>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
                          Score: {orchestrationResult.ai_audit.confidence_score}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mb-2 italic">
                        "{orchestrationResult.ai_audit.rationale}"
                      </p>
                      <div className="flex space-x-2 text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Risk: {orchestrationResult.ai_audit.risk_level}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Model: {orchestrationResult.ai_audit.model_used}</span>
                      </div>
                    </div>
                  )}

                  {/* LHDN Validation Receipt & QR */}
                  {orchestrationResult.lhdn_submission && (
                    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-900/60 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                          <QrCode className="w-4 h-4" />
                          <span>LHDN Validation Receipt</span>
                        </h3>
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">VALID</span>
                      </div>

                      <div className="space-y-1.5 text-xs font-mono mb-4">
                        <div>
                          <span className="text-slate-500 text-[11px]">LHDN UUID:</span>
                          <p className="text-slate-200 text-xs break-all">{orchestrationResult.lhdn_submission.document_uuid}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px]">Submission UID:</span>
                          <p className="text-slate-300 text-xs">{orchestrationResult.lhdn_submission.submission_uid}</p>
                        </div>
                      </div>

                      {orchestrationResult.lhdn_submission.qr_code_url && (
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                          <a 
                            href={orchestrationResult.lhdn_submission.qr_code_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-cyan-400 hover:underline flex items-center space-x-1 font-mono"
                          >
                            <span>Verify on MyInvois Portal</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <span className="text-[10px] text-slate-500 font-mono">PDPA 2010 Signed</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3 min-h-[380px]">
                  <ShieldCheck className="w-10 h-10 text-slate-600" />
                  <p className="text-sm text-slate-400 max-w-xs">
                    Fill in the invoice parameters and click <strong>End-to-End Orchestrate</strong> to compute SST, verify via local AI, and submit to LHDN.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LHDN REGULATORY RAG ASSISTANT */}
        {activeTab === 'rag' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2 mb-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>LHDN Sovereign Regulatory Intelligence</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Ask questions regarding Malaysian e-Invoicing deadlines, 8% Service Tax scope, exemptions, and compliance penalties. Grounded with 768-dim <code className="text-cyan-400">nomic-embed-text</code> vectors.
              </p>

              {/* Search Bar */}
              <div className="flex space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input 
                    type="text"
                    placeholder="e.g., What is the tax rate and rule for software consulting under the 2024 SST revision?"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRagQuery()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-cyan-500"
                  />
                </div>
                <button 
                  onClick={() => handleRagQuery()}
                  disabled={ragLoading}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-xs transition"
                >
                  {ragLoading ? 'Searching...' : 'Ask RAG'}
                </button>
              </div>

              {/* Pre-built Suggested Questions */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-slate-500 text-[11px] self-center">Suggested:</span>
                {[
                  'What is the 8% SST rate on IT software & digital consulting?',
                  'When is an e-invoice locked from cancellation under LHDN 72-hour rule?',
                  'Who must issue a Self-Billed e-Invoice under LHDN rules?'
                ].map((chip, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      setRagQuery(chip);
                      handleRagQuery(chip);
                    }}
                    className="bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 px-2.5 py-1 rounded-lg transition text-[11px]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* RAG Answer Output */}
            {ragResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Statutory Compliance Guidance</span>
                  </h3>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    Model: {ragResult.model_used}
                  </span>
                </div>

                <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  {ragResult.answer}
                </div>

                {/* Citations */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Legal References & Citations</h4>
                  <div className="space-y-1.5">
                    {ragResult.citations.map((cite, i) => (
                      <div key={i} className="text-xs font-mono text-cyan-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80 flex items-center space-x-2">
                        <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                        <span>{cite}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: KNOWLEDGE BASE CATALOG & INGESTION */}
        {activeTab === 'kb' && (
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Indexed Circulars List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Indexed LHDN Regulatory Knowledge Base</h2>
                  <p className="text-xs text-slate-400">Stored locally on srv1302021 with zero cloud data exposure.</p>
                </div>
                <button 
                  onClick={fetchKbSummary}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {kbDocs.map((doc, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                        {doc.id}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{doc.effective_date}</span>
                    </div>
                    <h3 className="font-semibold text-slate-200">{doc.title}</h3>
                    <p className="text-slate-400 font-mono text-[11px] truncate">Ref: {doc.legal_reference}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingest New Law / Circular Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-semibold text-white mb-1">Ingest New LHDN Circular or Gazette Order</h2>
              <p className="text-xs text-slate-400 mb-4">Automatically vectorize and incorporate new tax legislation into the sovereign RAG pipeline.</p>

              <form onSubmit={handleIngestDoc} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Document Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g., LHDN Circular on Digital Services Expansion 2026"
                      value={newDoc.title}
                      onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Legal Reference (Gazette Order / Act Section)</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Service Tax (Rate of Tax) Order P.U. (A) 123"
                      value={newDoc.legal_reference}
                      onChange={(e) => setNewDoc({ ...newDoc, legal_reference: e.target.value })}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Regulatory Text / Rules Content</label>
                  <textarea 
                    rows="4"
                    placeholder="Paste the statutory guideline, rule updates, or tax exemption provisions here..."
                    value={newDoc.content}
                    onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl transition text-xs flex items-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{loading ? 'Vectorizing via nomic-embed-text...' : 'Vectorize & Add to Knowledge Base'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        RYDETECH GLOBAL ENTERPRISE (IP0590987H) · Sovereign LHDN e-Invoicing Enclave · Malaysian PDPA 2010 Compliant
      </footer>
    </div>
  );
}
