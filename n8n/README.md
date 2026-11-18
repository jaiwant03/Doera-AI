# DOERA AI — Unified n8n Master Orchestrator

This directory contains the **Master Orchestrator Workflow** blueprint for **DOERA AI**.

---

## ⚡ Unified All-In-One Architecture

Instead of having multiple disconnected workflows, **all 8 core operations of DOERA AI are consolidated into ONE Master Workflow**:

### **`DOERA AI - Master Orchestrator`** (`doera-master-orchestrator.json`)

On a single canvas, it includes all 8 automation branches:
1. **Task Execution Intake & Trigger** (`POST /webhook/task-trigger`)
2. **Email Communication & Dispatch** (`POST /webhook/email-send`)
3. **WhatsApp Communication & Messaging** (`POST /webhook/whatsapp-send`)
4. **Provider Response & Quotation Intake** (`POST /webhook/provider-response`)
5. **Smart Appointment Scheduling & Slot Coordination** (`POST /webhook/scheduling-trigger`)
6. **Automated Follow-up Reminders** (`POST /webhook/followup-reminders`)
7. **Failure Recovery & Secondary Provider Failover** (`POST /webhook/failure-recovery`)
8. **Task Completion & Verification** (`POST /webhook/task-completion-trigger`)
9. **Unified Master Router** (`POST /webhook/doera-master`)

---

## 🚀 Live in Your n8n Instance

The master workflow has already been registered directly in your n8n workspace:
- **Workflow Name**: `DOERA AI - Master Orchestrator`
- **Location**: In your n8n Dashboard (`http://localhost:5678`)
- **Status**: Published / Active

---

## 📂 Re-importing into any other n8n instance (if needed)

1. Open your n8n dashboard ([http://localhost:5678](http://localhost:5678)).
2. Click **+ Add Workflow** or open an existing canvas.
3. Drag & drop `n8n/doera-master-orchestrator.json` onto the canvas (or click **...** → **Import from file**).
4. Click **Publish** (toggle to Active) in the top-right corner.

---

## 🛡️ Standalone Native Mode (No n8n needed)

DOERA AI's backend also contains a **Native Workflow Engine** (`backend/src/workflows/nativeWorkflows.js`).
If n8n is offline or unreachable, DOERA AI automatically executes all automation workflows natively in pure Node.js with zero external dependencies.
