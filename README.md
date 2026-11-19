# RYDETECH Sovereign LHDN Tax & e-Invoicing Web Portal

A high-performance React web frontend for Malaysian enterprise tax calculation, sovereign AI audit, and automated LHDN MyInvois submission. Pre-configured for deployment on **Vercel**.

---

## 1. Quick Deploy to Vercel

### Option 1: Via Vercel CLI (Immediate)
```bash
# 1. Install Vercel CLI if not already installed
npm install -g vercel

# 2. Deploy directly from this directory
cd /root/rydetech-lhdn-frontend
vercel
```
Follow the 3 CLI prompts (Link to existing project: No, Project name: `rydetech-lhdn-portal`, Directory: `./`). Vercel will build and assign an instant production URL (e.g., `https://rydetech-lhdn-portal.vercel.app`).

### Option 2: Via GitHub + Vercel Web UI
1. Create a repository on your GitHub (e.g. `rydetech-lhdn-frontend`).
2. Push this directory:
   ```bash
   git remote add origin https://github.com/<your-username>/rydetech-lhdn-frontend.git
   git branch -M main
   git push -u origin main
   ```
3. In [Vercel Dashboard](https://vercel.com/new), click **Import Git Repository**.
4. Framework Preset will auto-detect as **Vite**. Click **Deploy**!

---

## 2. Pre-Configured Backend Connection

The frontend connects directly to the secure HTTPS reverse proxy on your server:
* **API Base URL:** `https://n8n.rydetechglobal.com/tax-api`
* **Features Included:**
  * **Invoice Ingestion & Math Check:** Computes 8% Malaysian SST, verifies line totals and discounts.
  * **Sovereign AI Verification Gate:** Cross-checks classifications with local Ollama models on `srv1302021`.
  * **Automated LHDN Submission:** Generates canonical UBL 2.1, submits to MyInvois, and issues digital QR validation receipts.
  * **LHDN Regulatory RAG Assistant:** Semantic search & query against Malaysian tax circulars and legislation.
  * **Knowledge Ingestion Form:** Allows adding new gazette orders and circulars dynamically into the vector store.
