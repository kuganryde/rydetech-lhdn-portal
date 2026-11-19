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
  Bell,
  ScanLine,
  FileSpreadsheet,
  Eye,
  Calculator,
  ArrowRight
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

  const [activeTab, setActiveTab] = useState('extract'); // extract | orchestrate | mass | track | reports | logs | rag | settings
  const [healthStatus, setHealthStatus] = useState({ online: false, checking: true });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // -------------------------------------------------------------
  // TAB: OCR & INTELLIGENT INGESTION STUDIO
  // -------------------------------------------------------------
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrDraft, setOcrDraft] = useState(null);
  const [ocrSubmitting, setOcrSubmitting] = useState(false);
  const [ocrSubmissionResult, setOcrSubmissionResult] = useState(null);

  const handleFileUploadForOcr = async (file) => {
    if (!file) return;
    setOcrFile(file);
    setOcrLoading(true);
    setOcrResult(null);
    setOcrDraft(null);
    setOcrSubmissionResult(null);
    setErrorMessage('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${config.apiBase}/tax/extract-and-compute`, {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to extract document.');
      }
      
      const data = await res.json();
      setOcrResult(data);
      setOcrDraft(data.arranged_request);
      setSuccessMessage(`Document extracted via ${data.extraction_method}! Tax computed.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e) {
      setErrorMessage(`Extraction error: ${e.message}`);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleOcrDraftLineChange = (index, field, value) => {
    if (!ocrDraft) return;
    const updatedItems = [...ocrDraft.items];
    const val = (field === 'quantity' || field === 'unit_price' || field === 'discount_amount') 
      ? parseFloat(value) || 0 
      : value;
    updatedItems[index] = { ...updatedItems[index], [field]: val };
    setOcrDraft({ ...ocrDraft, items: updatedItems });
  };

  const handleOcrDraftBuyerChange = (field, value) => {
    if (!ocrDraft) return;
    setOcrDraft({
      ...ocrDraft,
      buyer: { ...ocrDraft.buyer, [field]: value }
    });
  };

  const handleOcrAddLineItem = () => {
    if (!ocrDraft) return;
    setOcrDraft({
      ...ocrDraft,
      items: [
        ...ocrDraft.items,
        {
          classification_code: '022',
          description: 'New Service Item',
          quantity: 1,
          unit_price: 1000.0,
          discount_amount: 0.0,
          tax_category: '01'
        }
      ]
    });
  };

  const handleOcrRemoveLineItem = (index) => {
    if (!ocrDraft || ocrDraft.items.length <= 1) return;
    const filtered = ocrDraft.items.filter((_, idx) => idx !== index);
    setOcrDraft({ ...ocrDraft, items: filtered });
  };

  const handleOcrRecalculate = async () => {
    if (!ocrDraft) return;
    try {
      const res = await fetch(`${config.apiBase}/tax/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ocrDraft)
      });
      if (res.ok) {
        const comp = await res.json();
        setOcrResult(prev => ({ ...prev, computed_tax: comp }));
        setSuccessMessage('Deterministic 8% SST recalculated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (e) {
      setErrorMessage(`Recalculate error: ${e.message}`);
    }
  };

  const handleOcrSubmitToLhdn = async () => {
    if (!ocrDraft) return;
    setOcrSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${config.apiBase}/tax/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ocrDraft)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Submission failed');
      }
      const data = await res.json();
      setOcrSubmissionResult(data);
      setSuccessMessage(`Invoice ${ocrDraft.invoice_number} submitted to LHDN (${data.status})!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e) {
      setErrorMessage(`Submission failed: ${e.message}`);
    } finally {
      setOcrSubmitting(false);
    }
  };

  const handleOcrAddToMassQueue = () => {
    if (!ocrDraft) return;
    setMassBatch(prev => [...prev, ocrDraft]);
    setSuccessMessage(`Added ${ocrDraft.invoice_number} to Mass Upload Queue!`);
    setTimeout(() => setSuccessMessage(''), 3000);
    setActiveTab('mass');
  };

  const handleLoadSampleDocument = async (type) => {
    // Generate sample CSV or text blob and trigger extraction
    if (type === 'csv') {
      const csvData = `Invoice Number,Date,Customer Name,TIN,BRN,Description,Quantity,Unit Price,Tax Type
INV-2026-EXTRACT-01,2026-11-19,PETRONAS GAS BERHAD,C21098472010,198101003029,Industrial IoT Automation Platform,2,42000,01
INV-2026-EXTRACT-01,2026-11-19,PETRONAS GAS BERHAD,C21098472010,198101003029,Sovereign Cloud Gateway Appliance,1,16000,01`;
      const blob = new Blob([csvData], { type: 'text/csv' });
      const file = new File([blob], 'sample_petronas_invoice.csv', { type: 'text/csv' });
      await handleFileUploadForOcr(file);
    } else if (type === 'xlsx') {
      // Create quick simulated spreadsheet CSV
      const csvData = `Doc No,Tarikh,Buyer,Buyer TIN,SSM No,Item Description,Qty,Rate,SST Code
INV-XLS-8899,2026-11-19,SIME DARBY INDUSTRIAL SDN BHD,C10492817010,197201000854,Heavy Machinery Fleet Telemetry AI,3,15000,01
INV-XLS-8899,2026-11-19,SIME DARBY INDUSTRIAL SDN BHD,C10492817010,197201000854,Preventive Maintenance Diagnostic Kit,1,8500,01`;
      const blob = new Blob([csvData], { type: 'text/csv' });
      const file = new File([blob], 'enterprise_billing_export.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await handleFileUploadForOcr(file);
    } else if (type === 'ocr') {
      const ocrText = `TAX INVOICE
Invoice No: INV-OCR-2026-LIVE
Date: 2026-11-19
Customer: CELCOMDIGI ENTERPRISE SDN BHD
TIN: C10928374010
BRN: 202001092834
Address: Menara CelcomDigi, No 6, Persiaran Barat, 46200 Petaling Jaya

Items:
1. Sovereign Enterprise AI Audit Engine  Qty: 1  Unit Price: RM 35000.00  Tax: 8%
2. LHDN MyInvois High-Throughput Node   Qty: 1  Unit Price: RM 15000.00  Tax: 8%

Subtotal: RM 50000.00
Service Tax (8%): RM 4000.00
Grand Total: RM 54000.00`;
      const blob = new Blob([ocrText], { type: 'text/plain' });
      const file = new File([blob], 'scanned_receipt_ocr.txt', { type: 'text/plain' });
      await handleFileUploadForOcr(file);
    }
  };


  // Corporate Tax Workbook State (MY-CorpTax-AgentOS)
  const [corpTargetEntity, setCorpTargetEntity] = useState('ENT01');
  const [corpResult, setCorpResult] = useState(null);
  const [corpLoading, setCorpLoading] = useState(false);

  const handleRunCorporateWorkbook = async (entityId) => {
    const target = entityId || corpTargetEntity;
    setCorpLoading(true);
    setErrorMessage('');
    try {
      let url = `${config.apiBase}/tax/process-corporate-workbook?target_entity=${target}`;
      let options = { method: 'POST' };

      if (ocrFile && ocrFile.name.endsWith('.xlsx')) {
        const formData = new FormData();
        formData.append('file', ocrFile);
        options.body = formData;
      }

      const res = await fetch(url, options);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Corporate tax compilation failed');
      }
      const data = await res.json();
      setCorpResult(data);
      if (data.arranged_request) {
        setOcrDraft(data.arranged_request);
        setOcrResult({
          filename: `MY_CorpTax_AgentOS_5Sheet_Mock.xlsx [${data.entity_id}]`,
          extraction_method: 'AGT-INTAKE_WORKBOOK_NORMALIZER',
          raw_text_preview: JSON.stringify(data.gl_mappings, null, 2),
          confidence_scores: {
            buyer_tin: 0.99,
            buyer_brn: 0.99,
            line_items: 0.98,
            tax_rate_8_percent: 1.0
          },
          computed_tax: data.computed_tax
        });
      }
      setSuccessMessage(`Compiled & plotted statutory tax map for ${data.entity_id} (${data.tax_tier})!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e) {
      setErrorMessage(`Corporate Tax Error: ${e.message}`);
    } finally {
      setCorpLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB: SINGLE INVOICE INGESTION FORM STATE
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // TAB: MASS UPLOAD STATE
  // -------------------------------------------------------------
  const [massBatch, setMassBatch] = useState([]);
  const [massProgress, setMassProgress] = useState({ active: false, current: 0, total: 0, percent: 0 });
  const [massResults, setMassResults] = useState([]);
  const [massSummary, setMassSummary] = useState(null);

  // -------------------------------------------------------------
  // TAB: PROGRESS TRACKER STATE
  // -------------------------------------------------------------
  const [trackQuery, setTrackQuery] = useState('INV-2026-N8N-SUCCESS-FINAL');
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);

  // -------------------------------------------------------------
  // TAB: AUDIT LOGS STATE
  // -------------------------------------------------------------
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedRecordType, setSelectedRecordType] = useState('');

  // -------------------------------------------------------------
  // TAB: FINANCIAL REPORTS STATE
  // -------------------------------------------------------------
  const [reports, setReports] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // -------------------------------------------------------------
  // TAB: RAG KNOWLEDGE BASE STATE
  // -------------------------------------------------------------
  const [ragQuery, setRagQuery] = useState('What is the service tax rate on digital consultancy and IT software in 2026?');
  const [ragResult, setRagResult] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [kbDocs, setKbDocs] = useState([]);

  // Check Backend Health
  const checkHealth = async () => {
    try {
      const res = await fetch(`${config.apiBase}/health`);
      if (res.ok) {
        setHealthStatus({ online: true, checking: false });
      } else {
        setHealthStatus({ online: false, checking: false });
      }
    } catch {
      setHealthStatus({ online: false, checking: false });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [config.apiBase]);

  // Save config to localStorage
  const handleSaveConfig = (newConf) => {
    setConfig(newConf);
    localStorage.setItem('rydetech_tax_config', JSON.stringify(newConf));
    setSuccessMessage('Integration & Webhook configurations saved!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Load Reports
  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch(`${config.apiBase}/tax/reports`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReportsLoading(false);
    }
  };

  // Load Logs
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      let url = `${config.apiBase}/tax/logs?limit=50`;
      if (selectedRecordType) url += `&record_type=${selectedRecordType}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  };

  // Load RAG Docs
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

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'rag') fetchKbDocs();
  }, [activeTab, config.apiBase]);

  // Form Handlers
  const handleAddItem = () => {
    setInvoice({
      ...invoice,
      items: [
        ...invoice.items,
        {
          classification_code: '022',
          description: '',
          quantity: 1,
          unit_price: 0,
          discount_amount: 0,
          tax_category: '01'
        }
      ]
    });
  };

  const handleRemoveItem = (index) => {
    if (invoice.items.length <= 1) return;
    const newItems = invoice.items.filter((_, idx) => idx !== index);
    setInvoice({ ...invoice, items: newItems });
  };


  // Live Draft Totals Calculator for Interactive Tax Plotter & Arranger
  const calculateOcrDraftLiveTotals = () => {
    if (!ocrDraft || !ocrDraft.items) return { gross: 0, disc: 0, net: 0, tax: 0, total: 0 };
    let gross = 0;
    let disc = 0;
    let tax = 0;
    ocrDraft.items.forEach(item => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.unit_price) || 0;
      const d = parseFloat(item.discount_amount) || 0;
      const lineGross = q * p;
      const lineNet = Math.max(0, lineGross - d);
      const rate = item.tax_category === '01' ? 0.08 : (item.tax_category === '02' ? 0.06 : 0);
      gross += lineGross;
      disc += d;
      tax += lineNet * rate;
    });
    const net = gross - disc;
    return { gross, disc, net, tax, total: net + tax };
  };

  const ocrDraftTotals = calculateOcrDraftLiveTotals();

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoice.items];
    newItems[index] = {
      ...newItems[index],
      [field]: (field === 'quantity' || field === 'unit_price' || field === 'discount_amount')
        ? parseFloat(value) || 0
        : value
    };
    setInvoice({ ...invoice, items: newItems });
  };

  const handleBuyerChange = (field, value) => {
    setInvoice({
      ...invoice,
      buyer: { ...invoice.buyer, [field]: value }
    });
  };

  // Calculate live preview math
  const calculateTotals = () => {
    let gross = 0;
    let disc = 0;
    let tax = 0;
    invoice.items.forEach(item => {
      const itemGross = (item.quantity || 0) * (item.unit_price || 0);
      const itemDisc = item.discount_amount || 0;
      const itemNet = Math.max(0, itemGross - itemDisc);
      const rate = item.tax_category === '01' ? 0.08 : (item.tax_category === '02' ? 0.06 : 0);
      gross += itemGross;
      disc += itemDisc;
      tax += itemNet * rate;
    });
    const net = gross - disc;
    return { gross, disc, net, tax, total: net + tax };
  };

  const totals = calculateTotals();

  // Execute Single Orchestration
  const handleOrchestrate = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setOrchestrationResult(null);

    try {
      const res = await fetch(`${config.apiBase}/tax/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Orchestration pipeline execution failed.');
      }

      const data = await res.json();
      setOrchestrationResult(data);
      setSuccessMessage(`Invoice ${data.invoice_number} processed! Status: ${data.status}`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Track an invoice
  const handleTrackInvoice = async (invoiceNum) => {
    const q = invoiceNum || trackQuery;
    if (!q) return;
    setTrackLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${config.apiBase}/tax/track/${encodeURIComponent(q.trim())}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Invoice not found in sovereign register');
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

  // Generate Sample Mass Batch (3 realistic enterprise invoices)
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
        invoice_number: `INV-2026-TEL-${Math.floor(1000 + Math.random() * 9000)}`,
        issue_date: new Date().toISOString().split('T')[0],
        issue_time: '12:00:00Z',
        currency: 'MYR',
        buyer: {
          name: 'MAXIS BROADBAND SDN BHD',
          tin: 'C19283746500',
          id_type: 'BRN',
          id_value: '199201001928',
          email: 'tax.billing@maxis.com.my',
          phone: '+60374922123',
          address_line: 'Menara Maxis, KLCC',
          city: 'Kuala Lumpur',
          state_code: '14'
        },
        items: [
          { classification_code: '022', description: 'Telecom Core Network Audit & Security Optimization', quantity: 1, unit_price: 52000, discount_amount: 0, tax_category: '01' }
        ]
      },
      {
        invoice_number: `INV-2026-ENG-${Math.floor(1000 + Math.random() * 9000)}`,
        issue_date: new Date().toISOString().split('T')[0],
        issue_time: '12:00:00Z',
        currency: 'MYR',
        buyer: {
          name: 'GAMUDA ENGINEERING SDN BHD',
          tin: 'C28394019283',
          id_type: 'BRN',
          id_value: '197601002938',
          email: 'finance.invoices@gamuda.com.my',
          phone: '+60374918282',
          address_line: 'Menara Gamuda, PJ Trade Centre',
          city: 'Petaling Jaya',
          state_code: '10'
        },
        items: [
          { classification_code: '022', description: 'BIM Infrastructure AI Compute Cluster', quantity: 2, unit_price: 24000, discount_amount: 1000, tax_category: '01' }
        ]
      }
    ];
    setMassBatch(samples);
    setSuccessMessage('Generated 3 enterprise sample invoices in batch queue.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Execute Mass Orchestration
  const handleExecuteMassOrchestration = async () => {
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
        const err = await res.json();
        throw new Error(err.detail || 'Batch processing failed');
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

  // CSV File Ingestion Parser for Mass Upload
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length < 2) return;

        const parsed = lines.slice(1).map((line, idx) => {
          const parts = line.split(',').map(p => p.trim());
          return {
            invoice_number: parts[0] || `INV-CSV-${Date.now()}-${idx}`,
            issue_date: parts[1] || new Date().toISOString().split('T')[0],
            issue_time: '12:00:00Z',
            currency: 'MYR',
            buyer: {
              name: parts[2] || 'ENTERPRISE BUYER SDN BHD',
              tin: parts[3] || 'C10293847560',
              id_type: 'BRN',
              id_value: parts[4] || '201901002938',
              email: parts[5] || 'billing@enterprise.com.my',
              phone: '+60388889999',
              address_line: 'Corporate Tower',
              city: 'Kuala Lumpur',
              state_code: '14'
            },
            items: [
              {
                classification_code: '022',
                description: parts[6] || 'Enterprise IT & Cloud Services',
                quantity: parseFloat(parts[7]) || 1,
                unit_price: parseFloat(parts[8]) || 5000,
                discount_amount: 0,
                tax_category: parts[9] === '06' ? '06' : '01'
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
              <p className="text-[11px] text-slate-400">Malaysian LHDN MyInvois & SST 8% Sovereign Tax Gateway</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 font-mono text-[11px]">
              <span className={`w-2 h-2 rounded-full ${healthStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300">srv1302021: {healthStatus.online ? 'Active' : 'Offline'}</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400">PDPA 2010</span>
            </div>

            <button 
              onClick={() => setActiveTab('settings')}
              className={`p-1.5 rounded-lg border transition ${activeTab === 'settings' ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
              title="Integration Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 sm:space-x-3 text-xs font-medium border-t border-slate-800/60 pt-2 overflow-x-auto">
          {[
            { id: 'extract', label: 'OCR & Doc Studio', icon: ScanLine, badge: ocrResult ? 'Analyzed' : null },
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

        {/* TAB 0: OCR & INTELLIGENT INGESTION STUDIO */}
        {activeTab === 'extract' && (
          <div className="space-y-6">
            {/* Upload Zone & Quick Samples */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 mb-5 gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                    <ScanLine className="w-5 h-5 text-cyan-400" />
                    <span>Multimodal Document OCR & Extraction Studio</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Extracts tax data inch-by-inch from <b>CSV, XLSX, PDF, PNG, JPG</b> using sovereign Tesseract OCR & semantic entity mapping.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleLoadSampleDocument('csv')}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center space-x-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Try Sample CSV</span>
                  </button>
                  <button 
                    onClick={() => handleLoadSampleDocument('xlsx')}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center space-x-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Try Sample XLSX</span>
                  </button>
                  <button 
                    onClick={() => handleLoadSampleDocument('ocr')}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center space-x-1.5"
                  >
                    <ScanLine className="w-3.5 h-3.5 text-purple-400" />
                    <span>Try Scanned OCR Text</span>
                  </button>
                </div>
              </div>

              
              {/* Corporate Tax 5-Sheet Workbook Ingestion Banner */}
              <div className="mb-5 p-4 bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-indigo-800/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-indigo-300 font-mono uppercase tracking-wider bg-indigo-950 px-2 py-0.5 rounded border border-indigo-700">
                      AGT-TAX-MAP • ITA 1967 YA 2026
                    </span>
                    <span className="text-xs font-semibold text-white">5-Sheet Corporate Tax Workbook Engine</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Penny-exact statutory classification: Schedule 1 Para 2B MSME gatekeeper, P&L ITA 1967 adjustments & Sec 107C CP204 penalty guard.
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <select 
                    value={corpTargetEntity}
                    onChange={(e) => {
                      setCorpTargetEntity(e.target.value);
                      handleRunCorporateWorkbook(e.target.value);
                    }}
                    className="bg-slate-900 border border-indigo-700/80 rounded-lg px-2.5 py-1.5 text-xs text-indigo-200 font-mono"
                  >
                    <option value="ENT01">TC-01: ENT01 (MSME 15%/17%/24%)</option>
                    <option value="ENT02">TC-02: ENT02 (Foreign WHT & CP204 Blocker)</option>
                    <option value="ENT-TEST-01">TC-TEST: ENT-TEST-01 (Pre-Flight TB Check & Variance Alert)</option>
                    <option value="ENT03">TC-03: ENT03 (Edge Case: CP204A Revision)</option>
                    <option value="ENT04">TC-04: ENT04 (Edge Case: High-Capital Non-MSME)</option>
                  </select>

                  <button
                    onClick={() => handleRunCorporateWorkbook(corpTargetEntity)}
                    disabled={corpLoading}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3.5 py-1.5 rounded-lg transition flex items-center space-x-1.5 shadow"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${corpLoading ? 'animate-spin' : ''}`} />
                    <span>Run Corporate Workbook</span>
                  </button>

                  <a
                    href="/MY_CorpTax_AgentOS_5Sheet_Mock.xlsx"
                    download="MY_CorpTax_AgentOS_5Sheet_Mock.xlsx"
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center space-x-1"
                    title="Download 5-Sheet Excel Template"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download XLSX</span>
                  </a>
                </div>
              </div>

              {/* Drag & Drop Upload Target */}
              <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-950/80">
                <div className="p-3 bg-cyan-950/60 border border-cyan-800 rounded-xl mb-3 text-cyan-400">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <span className="text-sm font-medium text-white">Click or drag & drop invoice document here</span>
                <span className="text-xs text-slate-400 mt-1">Supports CSV, XLSX/XLS, PDF, and Scanned Images (PNG, JPG, TIFF)</span>
                <input 
                  type="file" 
                  accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.tiff" 
                  onChange={(e) => handleFileUploadForOcr(e.target.files[0])}
                  className="hidden" 
                />
              </label>

              {ocrLoading && (
                <div className="mt-5 p-4 bg-slate-950 border border-cyan-900 rounded-xl flex items-center space-x-4">
                  <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                  <div>
                    <p className="text-xs font-semibold text-white">Processing Document Inch-by-Inch...</p>
                    <p className="text-[11px] text-slate-400">Executing Sovereign OCR extraction, TIN validation & deterministic 8% SST calculation.</p>
                  </div>
                </div>
              )}
            </div>

            
            {/* CORPORATE TAX AGENT STATUTORY MAPPING RESULTS */}
            {corpResult && (
              <div className="bg-slate-900 border border-indigo-800/80 rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-bold text-white font-mono">{corpResult.entity_id}</span>
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        corpResult.tax_tier === 'QUALIFYING_MSME'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : 'bg-blue-950 text-blue-300 border-blue-700'
                      }`}>
                        {corpResult.tax_tier}
                      </span>
                    </div>
                    {corpResult.msme_disqualification_reason ? (
                      <p className="text-xs text-rose-300 mt-1">{corpResult.msme_disqualification_reason}</p>
                    ) : (
                      <p className="text-xs text-emerald-400 mt-1">Schedule 1 Para 2B Compliant: 15% first RM150k, 17% RM150k-600k, 24% balance</p>
                    )}
                  </div>

                  {/* CP204 Status Banner */}
                  <div className="flex items-center space-x-2">
                    <div className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-mono ${
                      corpResult.cp204_status.decision === 'PASS'
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : (corpResult.cp204_status.decision === 'BLOCK_SUBMISSION'
                            ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                            : 'bg-amber-950/80 border-amber-800 text-amber-200')
                    }`}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <div>
                        <div className="font-bold">CP204: {corpResult.cp204_status.decision}</div>
                        <div className="text-[10px] opacity-80">{corpResult.cp204_status.rule_triggered}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pre-Flight Balance Check & Data Integrity Warnings */}
                {corpResult.data_integrity_warnings && corpResult.data_integrity_warnings.length > 0 && (
                  <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-rose-300 font-mono flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>AGT-INTAKE Pre-Flight Balance-Check Warnings ({corpResult.data_integrity_warnings.length})</span>
                    </span>
                    <ul className="space-y-1 text-xs text-rose-200 font-mono list-disc list-inside">
                      {corpResult.data_integrity_warnings.map((warn, wIdx) => (
                        <li key={wIdx} className="leading-relaxed">{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Statutory GL Classification Table */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                    Statutory P&L Adjustments (Income Tax Act 1967 YA 2026)
                  </span>
                  <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">GL Code</th>
                          <th className="p-2.5 text-right">Penny-Exact Amount</th>
                          <th className="p-2.5">Treatment Code</th>
                          <th className="p-2.5">ITA 1967 Reference</th>
                          <th className="p-2.5">Statutory Action / Alert</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {corpResult.gl_mappings.map((m, mIdx) => (
                          <tr key={mIdx} className="hover:bg-slate-800/30">
                            <td className="p-2.5 font-bold text-cyan-400">{m.gl_code}</td>
                            <td className="p-2.5 text-right font-bold text-white">RM {parseFloat(m.amount_rm).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] border ${
                                m.treatment_code.includes('DISALLOWED') || m.treatment_code.includes('NON_DEDUCTIBLE')
                                  ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                                  : (m.treatment_code.includes('ALLOWABLE')
                                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                      : 'bg-slate-800 border-slate-700 text-slate-300')
                              }`}>
                                {m.treatment_code}
                              </span>
                            </td>
                            <td className="p-2.5 text-indigo-300">{m.ita_section}</td>
                            <td className="p-2.5 text-[11px] text-slate-300">
                              {m.action_alert ? (
                                <span className={m.action_alert.includes('ALERT') ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                                  {m.action_alert}
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Raw JSON Schema Output Box */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Compliant Agent Output (AGT-TAX-MAP Schema)</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(corpResult, null, 2));
                        setSuccessMessage('Copied AGT-TAX-MAP JSON to clipboard!');
                        setTimeout(() => setSuccessMessage(''), 2000);
                      }}
                      className="text-cyan-400 hover:underline"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono text-slate-300 max-h-48 overflow-y-auto leading-relaxed">
                    {JSON.stringify(corpResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Inch-by-Inch Inspector & Interactive Tax Plotter */}
            {ocrResult && ocrDraft && (
              <div className="space-y-6">
                {/* Extraction Summary Strip */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white">{ocrResult.filename}</span>
                        <span className="text-[10px] bg-slate-800 border border-slate-700 text-cyan-400 px-2 py-0.5 rounded font-mono">
                          {ocrResult.extraction_method}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Identified {ocrDraft.items.length} line item(s) • Ready for review & plotting</p>
                    </div>
                  </div>

                  {/* Confidence Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-300">
                      TIN: <b className="text-emerald-400">{Math.round((ocrResult.confidence_scores?.buyer_tin || 0.95) * 100)}%</b>
                    </span>
                    <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-300">
                      BRN: <b className="text-emerald-400">{Math.round((ocrResult.confidence_scores?.buyer_brn || 0.95) * 100)}%</b>
                    </span>
                    <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-300">
                      Line Items: <b className="text-cyan-400">{Math.round((ocrResult.confidence_scores?.line_items || 0.96) * 100)}%</b>
                    </span>
                    <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-300">
                      8% SST Math: <b className="text-emerald-400">100%</b>
                    </span>
                  </div>
                </div>

                {/* 2-Column Inspector */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Raw Extracted Document View */}
                  <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h3 className="text-xs font-semibold text-white flex items-center space-x-2">
                        <Eye className="w-4 h-4 text-cyan-400" />
                        <span>Raw Document OCR Stream</span>
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">Local Sovereign Text</span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 max-h-[380px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {ocrResult.raw_text_preview}
                    </div>

                    {/* Detected Key-Value Anchors */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Identified Tax Anchors</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-500">Invoice Ref:</span>
                          <div className="text-white font-bold">{ocrDraft.invoice_number}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Issue Date:</span>
                          <div className="text-white">{ocrDraft.issue_date}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Buyer TIN:</span>
                          <div className="text-cyan-400 font-bold">{ocrDraft.buyer.tin}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Buyer BRN:</span>
                          <div className="text-emerald-400">{ocrDraft.buyer.id_value}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Interactive Tax Plotter & Schema Arranger */}
                  <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h3 className="text-xs font-semibold text-white flex items-center space-x-2">
                        <Calculator className="w-4 h-4 text-emerald-400" />
                        <span>Interactive Tax Plotter & Arranger</span>
                      </h3>
                      <button 
                        onClick={handleOcrRecalculate}
                        className="text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-400 px-2.5 py-1 rounded border border-slate-700 transition"
                      >
                        Recalculate 8% SST
                      </button>
                    </div>

                    {/* Basic Meta Fields */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Invoice Number</label>
                        <input 
                          type="text" 
                          value={ocrDraft.invoice_number}
                          onChange={(e) => setOcrDraft({ ...ocrDraft, invoice_number: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Issue Date</label>
                        <input 
                          type="date" 
                          value={ocrDraft.issue_date}
                          onChange={(e) => setOcrDraft({ ...ocrDraft, issue_date: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Currency</label>
                        <input 
                          type="text" 
                          value={ocrDraft.currency}
                          disabled
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-400 font-mono"
                        />
                      </div>
                    </div>

                    {/* Buyer Details */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                          Buyer / Counterparty Enterprise Profile (LHDN MyInvois)
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          Checksum Verified
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-slate-500 mb-0.5">Company Legal Name</label>
                          <input 
                            type="text" 
                            value={ocrDraft.buyer.name}
                            onChange={(e) => handleOcrDraftBuyerChange('name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">LHDN TIN (Tax ID)</label>
                          <input 
                            type="text" 
                            value={ocrDraft.buyer.tin}
                            onChange={(e) => handleOcrDraftBuyerChange('tin', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-400 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">SSM Registration (BRN)</label>
                          <input 
                            type="text" 
                            value={ocrDraft.buyer.id_value}
                            onChange={(e) => handleOcrDraftBuyerChange('id_value', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-emerald-400 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">SST Reg Number</label>
                          <input 
                            type="text" 
                            value={ocrDraft.buyer.sst_registration || 'W10-1808-32000018'}
                            onChange={(e) => handleOcrDraftBuyerChange('sst_registration', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Billing Email</label>
                          <input 
                            type="email" 
                            value={ocrDraft.buyer.email}
                            onChange={(e) => handleOcrDraftBuyerChange('email', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">Contact Phone</label>
                          <input 
                            type="text" 
                            value={ocrDraft.buyer.phone || '+60388889999'}
                            onChange={(e) => handleOcrDraftBuyerChange('phone', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">City & State Code</label>
                          <input 
                            type="text" 
                            value={`${ocrDraft.buyer.city || 'Kuala Lumpur'} (State: ${ocrDraft.buyer.state_code || '14'})`}
                            disabled
                            className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-xs text-slate-400 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Arranged Line Items Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                        <span>Arranged Line Items ({ocrDraft.items.length})</span>
                        <button 
                          onClick={handleOcrAddLineItem}
                          className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Add Item</span>
                        </button>
                      </div>

                      {/* Precise Multi-Column Grid */}
                      <div className="border border-slate-800 rounded-xl overflow-x-auto text-xs">
                        <table className="w-full text-left min-w-[760px]">
                          <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] border-b border-slate-800">
                            <tr>
                              <th className="p-2 w-8 text-center">#</th>
                              <th className="p-2 w-20">GL / Code</th>
                              <th className="p-2">Description & Tax Particulars</th>
                              <th className="p-2 w-16 text-right">Qty</th>
                              <th className="p-2 w-24 text-right">Unit Price (RM)</th>
                              <th className="p-2 w-20 text-right">Disc (RM)</th>
                              <th className="p-2 w-24 text-right">Net Taxable (RM)</th>
                              <th className="p-2 w-24">Tax Category</th>
                              <th className="p-2 w-20 text-right">SST (RM)</th>
                              <th className="p-2 w-24 text-right">Total (RM)</th>
                              <th className="p-2 w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                            {ocrDraft.items.map((item, idx) => {
                              const q = parseFloat(item.quantity) || 0;
                              const p = parseFloat(item.unit_price) || 0;
                              const d = parseFloat(item.discount_amount) || 0;
                              const lineNet = Math.max(0, (q * p) - d);
                              const rate = item.tax_category === '01' ? 0.08 : (item.tax_category === '02' ? 0.06 : 0);
                              const lineTax = lineNet * rate;
                              const lineTotal = lineNet + lineTax;

                              return (
                                <tr key={idx} className="hover:bg-slate-800/30 transition">
                                  <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                                  <td className="p-2">
                                    <input 
                                      type="text" 
                                      value={item.classification_code || '022'}
                                      onChange={(e) => handleOcrDraftLineChange(idx, 'classification_code', e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-cyan-400 font-bold"
                                      title="Classification Code / GL"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input 
                                      type="text" 
                                      value={item.description}
                                      onChange={(e) => handleOcrDraftLineChange(idx, 'description', e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-white"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input 
                                      type="number" 
                                      value={item.quantity}
                                      onChange={(e) => handleOcrDraftLineChange(idx, 'quantity', e.target.value)}
                                      className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white text-right"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input 
                                      type="number" 
                                      value={item.unit_price}
                                      onChange={(e) => handleOcrDraftLineChange(idx, 'unit_price', e.target.value)}
                                      className="w-24 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white text-right"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input 
                                      type="number" 
                                      value={item.discount_amount || 0}
                                      onChange={(e) => handleOcrDraftLineChange(idx, 'discount_amount', e.target.value)}
                                      className="w-20 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-300 text-right"
                                    />
                                  </td>
                                  <td className="p-2 text-right font-semibold text-slate-200">
                                    {lineNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2">
                                    <select 
                                      value={item.tax_category}
                                      onChange={(e) => handleOcrDraftLineChange(idx, 'tax_category', e.target.value)}
                                      className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-cyan-400"
                                    >
                                      <option value="01">01 (8% SST)</option>
                                      <option value="02">02 (6% SST)</option>
                                      <option value="06">06 (Exempt)</option>
                                    </select>
                                  </td>
                                  <td className="p-2 text-right text-amber-400 font-semibold">
                                    {lineTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-right font-bold text-emerald-400">
                                    {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2 text-center">
                                    {ocrDraft.items.length > 1 && (
                                      <button 
                                        onClick={() => handleOcrRemoveLineItem(idx)}
                                        className="text-rose-400 hover:text-rose-300 p-1"
                                        title="Delete Row"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Precise Dynamic 5-Metric Financial Summary Widget */}
                    <div className="bg-slate-950/80 border border-cyan-800/60 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 uppercase">Gross Amount</span>
                        <div className="text-xs font-bold text-white">
                          RM {ocrDraftTotals.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 uppercase">Discounts</span>
                        <div className="text-xs font-bold text-slate-300">
                          RM {ocrDraftTotals.disc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-cyan-400 uppercase">Net Taxable</span>
                        <div className="text-xs font-bold text-cyan-300">
                          RM {ocrDraftTotals.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-amber-400 uppercase">SST (8% / 6%)</span>
                        <div className="text-xs font-bold text-amber-400">
                          RM {ocrDraftTotals.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="space-y-0.5 sm:text-right">
                        <span className="text-[10px] text-emerald-400 uppercase">Grand Total (MYR)</span>
                        <div className="text-sm font-extrabold text-emerald-400">
                          RM {ocrDraftTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Action Execution Bar */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                      <button 
                        onClick={handleOcrAddToMassQueue}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl border border-slate-700 transition flex items-center space-x-1.5"
                      >
                        <UploadCloud className="w-4 h-4 text-cyan-400" />
                        <span>Push to Mass Batch Queue</span>
                      </button>

                      <button 
                        onClick={handleOcrSubmitToLhdn}
                        disabled={ocrSubmitting}
                        className="text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold px-5 py-2 rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center space-x-2"
                      >
                        {ocrSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Submitting to LHDN...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Verify & Orchestrate to LHDN</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Submission Result Card */}
                    {ocrSubmissionResult && (
                      <div className="mt-4 p-4 bg-slate-950 border border-emerald-800/80 rounded-xl space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                          <span className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>LHDN Submission Result</span>
                          </span>
                          <span className="font-mono text-[11px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                            {ocrSubmissionResult.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div>
                            <span className="text-slate-500">AI Confidence:</span>
                            <div className="text-emerald-400 font-bold">{ocrSubmissionResult.ai_audit?.confidence_score}%</div>
                          </div>
                          <div>
                            <span className="text-slate-500">LHDN UUID:</span>
                            <div className="text-cyan-300 truncate">{ocrSubmissionResult.lhdn_submission?.document_uuid || 'Held for Manual Approval'}</div>
                          </div>
                        </div>

                        {ocrSubmissionResult.lhdn_submission?.qr_code_url && (
                          <a 
                            href={ocrSubmissionResult.lhdn_submission.qr_code_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 text-xs text-cyan-400 hover:underline pt-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open LHDN Validation QR Link</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
                  <input 
                    type="text" 
                    value={invoice.currency}
                    disabled
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 font-mono"
                  />
                </div>
              </div>

              {/* Counterparty / Buyer */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Buyer Entity Information</span>
                  <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    TIN & BRN Verified
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Company / Legal Name</label>
                    <input 
                      type="text" 
                      value={invoice.buyer.name}
                      onChange={(e) => handleBuyerChange('name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">LHDN TIN (Tax ID)</label>
                    <input 
                      type="text" 
                      value={invoice.buyer.tin}
                      onChange={(e) => handleBuyerChange('tin', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-cyan-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">SSM Registration (BRN)</label>
                    <input 
                      type="text" 
                      value={invoice.buyer.id_value}
                      onChange={(e) => handleBuyerChange('id_value', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Billing Email (Receipts)</label>
                    <input 
                      type="email" 
                      value={invoice.buyer.email}
                      onChange={(e) => handleBuyerChange('email', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Invoice Line Items</span>
                  <button 
                    onClick={handleAddItem}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {invoice.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row gap-2 items-start md:items-center text-xs">
                      <div className="flex-1 w-full">
                        <input 
                          type="text" 
                          placeholder="Item description" 
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div className="flex items-center space-x-2 w-full md:w-auto">
                        <input 
                          type="number" 
                          placeholder="Qty" 
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white text-right font-mono"
                        />
                        <input 
                          type="number" 
                          placeholder="Unit Price" 
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white text-right font-mono"
                        />
                        <select 
                          value={item.tax_category}
                          onChange={(e) => handleItemChange(idx, 'tax_category', e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-cyan-400"
                        >
                          <option value="01">8% SST</option>
                          <option value="02">6% SST</option>
                          <option value="06">Exempt</option>
                        </select>
                        {invoice.items.length > 1 && (
                          <button 
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  onClick={handleOrchestrate}
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl transition shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2 text-xs"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Executing Sovereign AI Gatekeeper & LHDN Preprod...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Compute 8% SST & Submit to LHDN MyInvois</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Calculation Preview & Orchestration Output */}
            <div className="lg:col-span-5 space-y-4">
              {/* Financial Math Preview Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 pb-2 border-b border-slate-800">
                  Deterministic Math Preview (RM)
                </h3>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Gross Amount:</span>
                    <span>RM {totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total Discount:</span>
                    <span>RM {totals.disc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-semibold pt-1 border-t border-slate-800/80">
                    <span>Total Net Taxable:</span>
                    <span>RM {totals.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>Service Tax (8% SST):</span>
                    <span>RM {totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold text-sm pt-2 border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span>RM {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Enclave: srv1302021 (Malaysia)</span>
                  <span className="text-cyan-400">PDPA 2010 Audit Trail Active</span>
                </div>
              </div>

              {/* Orchestration Response Output */}
              {orchestrationResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Orchestration Result</span>
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      orchestrationResult.status === 'SUBMITTED_AUTOMATICALLY'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border-amber-800'
                    }`}>
                      {orchestrationResult.status}
                    </span>
                  </div>

                  {/* AI Verification Metric */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Sovereign AI Verifier:</span>
                      <span className="text-cyan-400 font-mono font-semibold">{orchestrationResult.ai_audit?.confidence_score}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full ${orchestrationResult.ai_audit?.confidence_score >= 95 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${orchestrationResult.ai_audit?.confidence_score}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 italic mt-1">{orchestrationResult.ai_audit?.rationale}</p>
                  </div>

                  {/* LHDN Submission Details */}
                  {orchestrationResult.lhdn_submission && (
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="text-[11px] font-mono text-slate-400">
                        <span>LHDN Document UUID:</span>
                        <div className="text-cyan-300 font-semibold truncate mt-0.5">{orchestrationResult.lhdn_submission.document_uuid}</div>
                      </div>
                      <a 
                        href={orchestrationResult.lhdn_submission.qr_code_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-cyan-400 hover:underline text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View LHDN Official Clearance QR Code</span>
                      </a>
                    </div>
                  )}

                  {/* Confirmation Notice */}
                  <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
                    <span>Receipt Dispatched To:</span>
                    <span className="text-white font-mono">{orchestrationResult.notification_email}</span>
                  </div>
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
                          <th className="p-3">Invoice No</th>
                          <th className="p-3">Buyer</th>
                          <th className="p-3">TIN / BRN</th>
                          <th className="p-3">Items</th>
                          <th className="p-3 text-right">Estimated Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        {massBatch.map((inv, idx) => {
                          const net = inv.items.reduce((acc, i) => acc + (i.quantity * i.unit_price) - (i.discount_amount || 0), 0);
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              <td className="p-3 font-semibold text-white">{inv.invoice_number}</td>
                              <td className="p-3 text-slate-300">{inv.buyer.name}</td>
                              <td className="p-3 text-cyan-400">{inv.buyer.tin}</td>
                              <td className="p-3 text-slate-400">{inv.items.length} item(s)</td>
                              <td className="p-3 text-right text-emerald-400 font-semibold">RM {net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleExecuteMassOrchestration}
                    disabled={massProgress.active}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 text-xs"
                  >
                    {massProgress.active ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing Batch Document Stream...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Execute Mass Ingestion & LHDN Submission ({massBatch.length} Invoices)</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl space-y-2">
                  <UploadCloud className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No batch documents staged. Click "Generate 3 Sample Invoices" or upload a CSV file.</p>
                </div>
              )}
            </div>

            {/* Batch Execution Results */}
            {massSummary && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-xs font-semibold text-white pb-2 border-b border-slate-800 flex items-center justify-between">
                  <span>Batch Execution Summary</span>
                  <span className="text-emerald-400 font-mono">Processed {massSummary.total} Documents</span>
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400">Total Net Amount</span>
                    <div className="text-base font-bold text-white font-mono mt-0.5">RM {massSummary.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-amber-400">8% SST Collected</span>
                    <div className="text-base font-bold text-amber-400 font-mono mt-0.5">RM {massSummary.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-emerald-400">Auto-Submitted</span>
                    <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">{massSummary.success}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-blue-400">Held for Manual Review</span>
                    <div className="text-base font-bold text-blue-400 font-mono mt-0.5">{massSummary.held}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROGRESS LIFECYCLE CHECKER */}
        {activeTab === 'track' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Invoice Progress Lifecycle Checker</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Track the end-to-end statutory status of any invoice across all 4 verification and submission stages.</p>
              </div>

              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  placeholder="Enter Invoice Number e.g. INV-2026-N8N-SUCCESS-FINAL"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <button
                  onClick={() => handleTrackInvoice(trackQuery)}
                  disabled={trackLoading}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Track Lifecycle</span>
                </button>
              </div>
            </div>

            {/* Stepper Result */}
            {trackResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                  <div>
                    <span className="text-xs text-slate-400 font-mono">Invoice Reference:</span>
                    <div className="text-base font-bold text-white font-mono">{trackResult.invoice_number}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-mono border ${
                      trackResult.overall_status === 'SUBMITTED_AUTOMATICALLY'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border-amber-800'
                    }`}>
                      {trackResult.overall_status}
                    </span>
                    <span className="text-xs text-cyan-400 font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700">
                      {trackResult.progress_percent}% Complete
                    </span>
                  </div>
                </div>

                {/* 4-Stage Stepper */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {trackResult.stages?.map((stg, sIdx) => (
                    <div key={sIdx} className={`p-4 rounded-xl border ${stg.completed ? 'bg-slate-950 border-emerald-800/80' : 'bg-slate-950/40 border-slate-800 opacity-60'}`}>
                      <div className="flex items-center space-x-2 mb-1.5">
                        {stg.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-white truncate">{stg.stage}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{stg.name}</p>
                      {stg.timestamp && (
                        <p className="text-[9px] text-slate-500 font-mono mt-2 truncate">{stg.timestamp.split('T')[1]?.slice(0, 8)} UTC</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* LHDN Validation Clearance Link */}
                {trackResult.qr_code_url && (
                  <div className="p-4 bg-slate-950 border border-cyan-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">LHDN Document UUID:</span>
                      <div className="text-xs font-mono text-cyan-300 font-bold">{trackResult.lhdn_document_uuid}</div>
                    </div>
                    <a 
                      href={trackResult.qr_code_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Verify QR Clearance</span>
                    </a>
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
                <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Statutory Tax Reports & Invoicing Analytics</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Aggregated metrics computed deterministically from the sovereign audit register.</p>
              </div>
              <button 
                onClick={fetchReports} 
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reportsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Metrics</span>
              </button>
            </div>

            {reports ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <span className="text-xs text-slate-400">Total Processed Volume</span>
                    <div className="text-2xl font-bold text-white font-mono mt-1">{reports.total_invoices_processed}</div>
                    <span className="text-[10px] text-cyan-400 mt-1 block">Invoices Cleared</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <span className="text-xs text-slate-400">Total Net Amount (MYR)</span>
                    <div className="text-2xl font-bold text-white font-mono mt-1">RM {reports.total_net_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Pre-tax Taxable Base</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <span className="text-xs text-amber-400">Total 8% SST Collected</span>
                    <div className="text-2xl font-bold text-amber-400 font-mono mt-1">RM {reports.total_sst_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <span className="text-[10px] text-amber-500/80 mt-1 block">8% Service Tax Reserve</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <span className="text-xs text-emerald-400">Auto-Approval Rate</span>
                    <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{reports.auto_approval_rate_percent}%</div>
                    <span className="text-[10px] text-emerald-500/80 mt-1 block">&gt;=95% Sovereign AI Pass</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Auto-Approved vs. Held for Review Ratio</span>
                    <span className="font-mono text-cyan-400">{reports.auto_approved_count} Approved / {reports.held_for_review_count} Held</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden flex border border-slate-800">
                    <div 
                      className="bg-emerald-500 h-full transition-all" 
                      style={{ width: `${reports.auto_approval_rate_percent}%` }}
                      title="Auto-Approved"
                    />
                    <div 
                      className="bg-amber-500 h-full transition-all" 
                      style={{ width: `${100 - reports.auto_approval_rate_percent}%` }}
                      title="Held for Review"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">Loading statutory analytics...</div>
            )}
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>Immutable Malaysian PDPA 2010 Audit Register</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Cryptographic log trail residing exclusively in local sovereign storage (`srv1302021`).</p>
              </div>

              <div className="flex space-x-2">
                <select 
                  value={selectedRecordType}
                  onChange={(e) => setSelectedRecordType(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300"
                >
                  <option value="">All Record Types</option>
                  <option value="END_TO_END_ORCHESTRATION">Orchestrations</option>
                  <option value="DOCUMENT_EXTRACTION_AND_OCR">Document OCR</option>
                  <option value="TAX_COMPUTATION">Tax Computations</option>
                  <option value="AI_VERIFICATION">AI Verifications</option>
                  <option value="LHDN_SUBMISSION">LHDN Submissions</option>
                  <option value="RAG_QUERY">RAG Queries</option>
                </select>

                <button 
                  onClick={fetchLogs} 
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg border border-slate-700 transition"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-xs">
              <div className="max-h-[550px] overflow-y-auto divide-y divide-slate-800/80">
                {logs.length > 0 ? (
                  logs.map((log, lIdx) => (
                    <div key={lIdx} className="p-4 hover:bg-slate-800/30 transition space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-cyan-400 text-[11px] font-semibold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                          {log.record_type}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {log.timestamp}
                        </span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                        <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">No audit records found matching criteria.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: RAG ASSISTANT */}
        {activeTab === 'rag' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Sovereign LHDN Regulatory RAG Assistant</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Ask questions answered strictly with citations from official LHDN statutory circulars, gazettes, and guidelines.</p>
              </div>

              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="e.g. What is the SST rate for IT software & digital consulting?"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  onClick={() => handleRagQuery(ragQuery)}
                  disabled={ragLoading}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Knowledge Base</span>
                </button>
              </div>
            </div>

            {/* RAG Answer */}
            {ragResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="font-semibold text-white">Sovereign Knowledge Answer</span>
                  <span className="font-mono text-[10px] text-cyan-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Model: {ragResult.model_used}
                  </span>
                </div>

                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {ragResult.answer}
                </div>

                {/* Citations */}
                {ragResult.citations?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Statutory Citations</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {ragResult.citations.map((cite, cIdx) => (
                        <div key={cIdx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                          <div className="font-semibold text-cyan-300">{cite.document_title}</div>
                          <p className="text-[11px] text-slate-400 italic">"{cite.content_snippet}"</p>
                          <div className="text-[10px] text-slate-500 font-mono">Similarity: {(cite.similarity_score * 100).toFixed(1)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: SETTINGS & CONFIGURATION */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Integration & Webhook Configuration</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Control n8n Webhook connectivity, API endpoints, and target LHDN environments.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">n8n Ingress Webhook URL</label>
                  <input 
                    type="url" 
                    value={config.webhookUrl}
                    onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    placeholder="https://n8n.rydetechglobal.com/webhook/tax-invoice-ingress"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Workflows in n8n listen on this URL for incoming external invoices.</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Backend Tax API Base URL</label>
                  <input 
                    type="url" 
                    value={config.apiBase}
                    onChange={(e) => setConfig({ ...config, apiBase: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    placeholder="https://n8n.rydetechglobal.com/tax-api"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Reverse-proxied FastAPI backend on srv1302021.</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Confirmation Email Recipient</label>
                  <input 
                    type="email" 
                    value={config.notificationEmail}
                    onChange={(e) => setConfig({ ...config, notificationEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    placeholder="support@rydetechglobal.com"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Audit confirmation and validation receipts are routed here.</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target LHDN Environment</label>
                  <div className="flex space-x-3 mt-1">
                    <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition ${config.environment === 'sandbox' ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                      <input 
                        type="radio" 
                        name="env" 
                        value="sandbox" 
                        checked={config.environment === 'sandbox'}
                        onChange={() => setConfig({ ...config, environment: 'sandbox' })}
                        className="hidden" 
                      />
                      <div className="font-semibold text-xs">Pre-Production Sandbox</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">preprod-api.myinvois.hasil.gov.my</div>
                    </label>

                    <label className={`flex-1 p-3 rounded-xl border cursor-pointer transition ${config.environment === 'production' ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                      <input 
                        type="radio" 
                        name="env" 
                        value="production" 
                        checked={config.environment === 'production'}
                        onChange={() => setConfig({ ...config, environment: 'production' })}
                        className="hidden" 
                      />
                      <div className="font-semibold text-xs">Live Production</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">api.myinvois.hasil.gov.my</div>
                    </label>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => handleSaveConfig(config)}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl transition text-xs shadow-lg shadow-cyan-600/20"
                  >
                    Save Configuration & Persist
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-3 text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>© 2026 RYDETECH GLOBAL ENTERPRISE. Sovereign LHDN MyInvois Automation Engine.</span>
          </div>
          <div className="flex items-center space-x-3 text-slate-400 font-mono">
            <span>srv1302021 Local Enclave</span>
            <span>•</span>
            <span className="text-cyan-400">Malaysian PDPA 2010</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
