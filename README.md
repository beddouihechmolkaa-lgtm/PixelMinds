# AINS Agent Flight Recorder
### Continuous Evaluation System + Deterministic Replay Engine + Autonomous Agent
AINS Hackathon 2026 — Use Case 1 + Use Case 2 + Use Case 3 (Unified Architecture)

---

## 🎯 Problem Statement

Enterprise teams deploy AI agents inside Atlassian tools (Jira Service Management, Confluence) to automate workflows. These agents are non-deterministic — the same prompt can produce different tool calls, reasoning chains, and outputs on every run.

When an agent fails silently:
- 12 out of 80 JSM tickets get mis-assigned with no error fired
- A Confluence summary agent starts producing verbose, unstructured output after a model update
- A promotion-evaluation agent approves the wrong candidate due to a semantic hallucination

Traditional logging cannot debug this. Running the agent again produces different behavior. There is no mechanism today to capture what the agent actually did, replay it deterministically, or attribute failure to a specific step.

---

## 💡 The Unified Solution

Three use cases. One coherent architecture.

*Layer 1 — The Agent (UC3)*  
Autonomous JSM-to-Confluence FAQ generator. Does the real enterprise work.

*Layer 2 — Flight Recorder (UC2)*  
Infrastructure proxy. Records every step and enables deterministic, side-effect-free replay.

*Layer 3 — AI Judge (UC1)*  
The Auditor. Analyzes trajectories to produce structured verdicts, attribute failures, and detect drift.

**The AI is not a feature — it is the mechanism.** Remove the AI Judge, and the system loses its observability. Remove the Recorder, and you lose reproducibility. Remove the Agent, and there is no work to observe.


---

## 🤖 Layer 1 — The Agent (Use Case 3)

What it does: An autonomous agent that reads closed JSM tickets and automatically generates structured FAQ pages on Confluence.

This task cannot be automated with IF/THEN rules. It requires:
- *Semantic Reasoning*: Understanding messy, unstructured ticket descriptions.
- *Intent Classification*: Determining the core issue (Auth, Billing, Bug).
- *Synthesis*: Generating coherent, well-structured Confluence pages with Gemini 1.5 Flash.

---

## 🖥️ Layer 2 — Flight Recorder (Use Case 2)

What it does: An infrastructure-level proxy that transparently intercepts and records everything the agent does.

- *Trajectory Recording*: Captures Prompts, Tool Payloads (Jira/Conf), Memory States, and Latencies.
- *Deterministic Replay*: Re-runs sessions using cached responses. No live APIs hit. No accidental emails sent.
- *Divergence Injection*: Allows developers to modify a prompt mid-replay and see the "What If" branching trajectory.

---

## 🧠 Layer 3 — AI Judge (Use Case 1)

What it does: A second AI (The Auditor) that analyzes the recorded trajectory and produces a structured verdict.

- *Component Attribution*: Identifies the exact step (e.g., Step 4: Draft Generation) where the logic diverged.
- *Drift Detection*: Monitors statistical shifts in cohesion and length across hundreds of runs.
- *Evaluator Self-Assessment*: The judge reports its own confidence score (0.0 - 1.0) for every verdict it emits.

---

## 📐 Architecture Overview

text
ains_agent_engine/
├── src/
│   ├── components/      ← Premium "Royal Amethyst" Dashboards
│   ├── utils/           ← Mock data & Heuristic engines
│   ├── types.ts         ← Type-safe Trajectory schemas
│   └── App.tsx          ← Main Flight Recorder interface
├── server.ts            ← Core Proxy Engine + AI Judge Pipeline (Gemini-powered)
├── data/                ← Trajectory Snapshots (Persistent JSON)
└── README.md

*Tech Stack:*
- *Backend:* Node.js + Express (High-concurrency proxying)
- *AI Core:* Google Gemini 1.5 Flash (SOTA reasoning)
- *Frontend:* React + Vite + Tailwind CSS + Chart.js
- *Design System:* "Royal Amethyst & Midnight" — Dark, enterprise-grade aesthetics

---

## ✅ AINS Acceptance Criteria Mapping

### Use Case 1 — Continuous Evaluation

| Criterion | Implementation Detail | Status |
|-----------|-----------------------|--------|
| Trajectory capture | Full execution trace captured in AgentRun objects | ✅ |
| Multi-level eval | End-to-end task completion + Component-level logic check | ✅ |
| Failure attribution | Failed step identified via semantic analysis | ✅ |
| Human-readable verdict | Structured Markdown reports with confidence metrics | ✅ |
| Drift detection | Scenario B visualization (Cohesion vs Word-count) | ✅ |

### Use Case 2 — Flight Recorder

| Criterion | Implementation Detail | Status |
|-----------|-----------------------|--------|
| Record functionality | Transparent capture of LLM & Tool payloads | ✅ |
| Deterministic replay | Offline replay mode using recorded cache | ✅ |
| State inspection | Step-by-step diffing of agent memory/context | ✅ |
| Divergence editing | Branching Replay: Modify prompts mid-trajectory | ✅ |

### Use Case 3 — Autonomous Agent

| Criterion | Implementation Detail | Status |
|-----------|-----------------------|--------|
| End-to-end workflow | JSM Ticket → Semantic FAQ → Confluence Draft | ✅ |
| AI necessity verified | Semantic reasoning required for unstructured data | ✅ |
| Actionable output | Formatted, multi-section FAQ pages | ✅ |
| Evaluation metric | Cohesion Score & Hallucination Probability | ✅ |

---

## 🚀 Quick Start (Demo)

# 1. Install dependencies
npm install

# 2. Add your Gemini key to .env
# GEMINI_API_KEY=your_key_here

# 3. Launch the environment
npm run dev

Navigate: *Dashboard → Scenario A (Silent Failure) → Scenario B (Drift) → Flight Recorder (Scenario C)*

---

## 📊 Value Proposition

Standard Jira Automation handles IF/THEN rules.
*We handle the semantic gap* — the class of failures that no rule-based system can detect.

Our agent does real work. Our recorder captures every move. Our judge explains every failure.

*The AI is the mechanism — at every level.*

---
AINS Hackathon 2026 — Organised by AINS 4.0 in partnership with Vectors
