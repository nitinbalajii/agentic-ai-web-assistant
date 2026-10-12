# ⚡ MediAgent: Autonomous Clinical & Triage Web Assistant

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green?logo=node.js)](https://nodejs.org/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%201.5-blue?logo=google)](https://ai.google.dev/)
[![Express.js](https://img.shields.io/badge/Server-Express%20v4-black?logo=express)](https://expressjs.com/)
[![Zod](https://img.shields.io/badge/Validation-Zod%20Schema-3E67B1?logo=zod)](https://zod.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-ready, autonomous agentic web application designed for emergency health dispatch and clinical triage. Built with **Google Gemini 1.5**, **Node.js/Express**, and **Zod**, this project demonstrates how to move beyond static conversational chatbots to true autonomous agents equipped with function calling, dynamic tool dispatch, and runtime safety circuits.

---

## 🏗️ Architecture & Agent Execution Lifecycle

Rather than simple prompt-response completions, MediAgent operates in an **iterative reasoning loop**. It inspects user intent, selects and executes programmatic tools, parses strictly validated JSON schemas, and synthesizes clinical guidance:

```
                      ┌──────────────────────┐
                      │      User Query      │
                      └──────────┬───────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Google Gemini 1.5 LLM │
                     │   (Intent Analysis)   │
                     └──────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
        [Requires Tools]                 [Direct Response]
                 │                               │
                 ▼                               │
      ┌──────────────────────┐                   │
      │ Function Calling Bus │                   │
      └──────────┬───────────┘                   │
                 │                               │
  ┌──────────────┼──────────────┐                │
  ▼              ▼              ▼                │
fetchFirstAid  checkBeds   calculateTriage       │
  │              │              │                │
  └──────────────┬──────────────┘                │
                 │                               │
                 ▼                               │
      ┌──────────────────────┐                   │
      │ Zod Schema Validation│                   │
      └──────────┬───────────┘                   │
                 │                               │
                 ▼                               │
      ┌──────────────────────┐                   │
      │  Circuit Breaker     │                   │
      │ (Max 4 Steps Guard)  │                   │
      └──────────┬───────────┘                   │
                 │                               │
                 ▼                               ▼
       ┌───────────────────────────────────────────┐
       │   Synthesized Action Plan + Live Traces   │
       └───────────────────────────────────────────┘
```

---

## ✨ Key Engineering Highlights

- **Autonomous Tool Calling**: Gemini 1.5 autonomously chooses from external tools (`fetchFirstAidProtocol`, `checkHospitalResourceCapacity`, `calculateTriageScore`).
- **Defensive Circuit Breaker**: Prevents infinite recursion and token burn by enforcing a hard upper limit of `MAX_AGENT_STEPS = 4`.
- **Runtime Schema Guard**: All tool inputs are validated via strict **Zod** schemas, eliminating model hallucinations on argument types.
- **Trace Transparency**: Every step of the agent's thought process and programmatic invocation is surfaced in the interactive frontend debugger.
- **Graceful Offline Mode**: Out-of-the-box offline heuristic fallback when no API key is supplied, enabling zero-setup demonstrations.

---

## 🛠️ Integrated Tool Inventory

| Tool Name | Parameters | Purpose |
|:---|:---|:---|
| `fetchFirstAidProtocol` | `condition: string`, `ageGroup: enum` | Fetches verified emergency stabilization protocols (CPR, burns, heatstroke). |
| `checkHospitalResourceCapacity` | `city: string`, `specialty: enum` | Queries live emergency department bed count and estimated intake delays. |
| `calculateTriageScore` | `symptoms: string[]`, `heartRate: int`, `oxygenLevel: int` | Calculates clinical acuity tiers (Level 1 Resuscitation to Level 4 Routine). |

---

## 🚀 Quickstart Guide

### 1. Clone the repository
```bash
git clone https://github.com/nitinbalajii/agentic-ai-web-assistant.git
cd agentic-ai-web-assistant
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables (Optional)
Create a `.env` file in the root directory:
```env
PORT=4000
GEMINI_API_KEY=your_gemini_api_key_here
```
> *Note: If `GEMINI_API_KEY` is omitted, the server automatically activates high-fidelity demo mock mode.*

### 4. Run the server
```bash
npm start
```
Open [http://localhost:4000](http://localhost:4000) in your browser.

---

## 📡 API Reference

### `POST /api/chat`
Dispatches a user query to the agent loop.

**Request Payload:**
```json
{
  "message": "Patient with acute chest pain and 130 BPM heart rate",
  "conversationHistory": []
}
```

**Response Payload:**
```json
{
  "reply": "🚨 Triage Acuity Assessment: RESUSCITATION / IMMEDIATE (Level 1)...",
  "executionTraces": [
    {
      "step": 1,
      "tool": "calculateTriageScore",
      "args": { "symptoms": ["acute chest pain"], "heartRate": 130 },
      "result": { "calculatedScore": 95, "triageCategory": "RESUSCITATION / IMMEDIATE (Level 1)" }
    }
  ],
  "latencyMs": 312,
  "stepsExecuted": 1,
  "mode": "live_gemini"
}
```

---

## 👤 Author
- **Nitin Balajee**
- GitHub: [@nitinbalajii](https://github.com/nitinbalajii)
- Portfolio: [nitinbalajee.vercel.app](https://nitinbalajee.vercel.app)
- LinkedIn: [Nitin Balajee](https://www.linkedin.com/in/nitin-balajee-b283a3312/)

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
