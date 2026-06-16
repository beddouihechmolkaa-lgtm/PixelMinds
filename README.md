# AINS Agent Flight Recorder
### Continuous Evaluation System + Deterministic Replay Engine + Autonomous Agent
**AINS Hackathon 2026 — Use Case 1 + Use Case 2 + Use Case 3 (Unified Architecture)**

---

## 🎯 Problem Statement

Enterprise teams deploy AI agents inside Atlassian tools (Jira Service Management, Confluence) to automate workflows. These agents are **non-deterministic** — the same prompt can produce different tool calls, reasoning chains, and outputs on every run.

When an agent fails silently:
- 12 out of 80 JSM tickets get mis-assigned with no error fired
- A Confluence summary agent starts producing verbose, unstructured output after a model update
- A promotion-evaluation agent approves the wrong candidate due to a semantic hallucination

**Traditional logging cannot debug this.** Running the agent again produces different behavior. There is no mechanism today to capture what the agent *actually did*, replay it deterministically, or attribute failure to a specific step.

---

## 💡 The Unified Solution

Three use cases. One coherent architecture.

```
┌─────────────────────────────────────┐
│   LAYER 1 — THE AGENT  (UC3)        │  ← Does real work in Jira / Confluence
└────────────────┬────────────────────┘
                 │ every action recorded transparently
                 ▼
┌─────────────────────────────────────┐
│   LAYER 2 — FLIGHT RECORDER (UC2)   │  ← Captures every step, enables replay
└────────────────┬────────────────────┘
                 │ trajectory passed for analysis
                 ▼
┌─────────────────────────────────────┐
│   LAYER 3 — AI JUDGE  (UC1)         │  ← Evaluates, attributes, alerts
└─────────────────────────────────────┘
```

> Remove any one layer and the system stops functioning. The AI is not a feature — it is the mechanism at every level.

---

## 🤖 Layer 1 — The Agent (Use Case 3)

**What it does:** An autonomous agent that reads closed JSM tickets and automatically generates structured FAQ pages on Confluence.

This is a task that **cannot be automated with IF/THEN rules** — it requires:
- Reading and understanding unstructured ticket descriptions
- Grouping semantically similar issues
- Generating coherent, well-structured Confluence pages
- Deciding when the quality is sufficient to publish vs. flagging for human review

This agent is also the **live target** that the Flight Recorder monitors in real time.

---

## 🖥️ Layer 2 — Flight Recorder (Use Case 2)

**What it does:** An infrastructure-level proxy that transparently intercepts and records everything the agent does during a live run.

### Recorded per run:
- Every LLM prompt and response
- Every tool call (Jira API, Confluence API) with full parameters and return values
- Full context/memory state at each step
- Latency and status per call

### Replay Mode:
- Re-execute any recorded session **step by step**
- Tool calls return **recorded responses** — no live API is touched
- Safe for debugging: no emails sent, no tickets modified
- Supports **divergence injection**: modify a prompt or tool result mid-replay to see how the agent's path changes

---

## 🧠 Layer 3 — AI Judge (Use Case 1)

**What it does:** A second AI that analyzes the recorded trajectory and produces a structured verdict.

### Evaluation Pipeline:

```
Recorded Trajectory
        │
        ├──► END-TO-END EVALUATOR    → Did the agent complete the task?
        │
        ├──► COMPONENT ATTRIBUTION   → Which exact step caused the failure?
        │
        ├──► DRIFT DETECTOR          → Has behavior shifted vs. last 30 runs?
        │
        └──► HUMAN-READABLE VERDICT  → Actionable report for engineers
```

### Evaluation Strategy (Non-Determinism Handling):
We do **not** compare outputs byte-by-byte. Instead:
- **Intent Classification**: Did the agent reach the correct decision class?
- **Trajectory Coherence Score**: Are tool calls ordered logically?
- **Statistical Drift Baseline**: Is this run statistically different from the last 30 runs?
- **Evaluator Self-Assessment**: The system reports its own confidence on each verdict

---

## 👥 Target Users

| User | Pain Point | What We Solve |
|------|-----------|---------------|
| **AI/Platform Engineers** | Cannot debug non-deterministic failures | Replay exact failed session step-by-step |
| **DevOps / SRE Teams** | No alerting for silent agent failures | Automated drift alert + failure attribution |
| **Compliance Officers** | No audit trail for AI decisions | Full preserved trajectory per run |
| **Product Managers** | Cannot measure agent quality over time | Measurable cohesion/accuracy metrics |

---

## 🗺️ The 3 AINS Scenarios — All Covered

### Scenario A — Silent Failure Detection
> 80 JSM tickets processed. 12 mis-assigned silently. Our system flags all 12 with per-ticket divergence explanation.

**Demo:** Interactive ticket map → click any red dot → see exact failure trace.

### Scenario B — Drift After Model Update
> Confluence FAQ agent drifted from avg 82 words (cohesion 0.87) to 214 words (cohesion 0.53) after model v3.2 update. Drift alert surfaces automatically.

**Demo:** 90-day cohesion/word-count chart with model update marked. Before/after page comparison.

### Scenario C — Component-Level Failure Attribution
> Agent incorrectly generated a FAQ page merging two unrelated issues. End verdict: "FAILED". Root cause: Step 4 — semantic clustering grouped a billing issue with a login issue due to surface-level keyword overlap.

**Demo:** Full trajectory trace in Flight Recorder. Red node at Step 4. Deterministic replay without touching Confluence.

---

## 📐 Architecture Overview

```
ains_agent_engine/
├── public/
│   ├── dashboard.html       ← Command Center (all 3 scenarios)
│   ├── scenario_a.html      ← Silent Failure visualization
│   ├── scenario_b.html      ← Drift detection + Chart.js graphs
│   ├── index.html           ← Flight Recorder (Scenario C)
│   └── evaluation.html      ← Metrics & Evaluation Report
├── src/
│   └── Engine/
│       ├── Recorder.php     ← Core proxy + trajectory storage engine
│       ├── Agent.php        ← JSM-to-Confluence FAQ agent (UC3)
│       └── Evaluator.php    ← AI Judge pipeline (UC1)
├── data/
│   └── trajectories/        ← JSON session snapshots
│       ├── JSM-REPLAY-DEMO-001.json  (failed session)
│       └── JSM-REPLAY-DEMO-002.json  (success session)
└── README.md
```

**Tech Stack:**
- **Backend:** PHP 8.x — lightweight, no framework overhead, fast proxying
- **Frontend:** Vanilla HTML/CSS/JS + Bootstrap 5 + Chart.js
- **Storage:** JSON-based trajectory snapshots (portable, auditable)
- **AI:** LLM-as-judge pattern for evaluation + autonomous agent for UC3
- **Design System:** "Royal Amethyst & Midnight" — dark, premium, enterprise-grade

---

## ✅ AINS Acceptance Criteria Mapping

### Use Case 1 — Continuous Evaluation

| Criterion | Priority | Status |
|-----------|----------|--------|
| Trajectory capture — full execution trace | MUST | ✅ Implemented |
| Multi-level evaluation (end-to-end + component) | MUST | ✅ Implemented |
| Failure attribution — specific component flagged | MUST | ✅ Step-level attribution |
| Human-readable structured verdict | MUST | ✅ Verdict node in trace |
| Drift detection across 2+ runs | SHOULD | ✅ Scenario B (Chart.js) |
| Non-determinism addressed | SHOULD | ✅ Intent classification strategy |
| Evaluator self-assessment metric | SHOULD | ✅ Evaluation Report page |

### Use Case 2 — Flight Recorder

| Criterion | Priority | Status |
|-----------|----------|--------|
| Record functionality — LLM call + tool call captured | MUST | ✅ Implemented |
| Deterministic replay without live API | MUST | ✅ Implemented |
| State inspection at each step | MUST | ✅ Implemented |
| Divergence editing during replay | SHOULD | ✅ Supported |

### Use Case 3 — Autonomous Agent

| Criterion | Priority | Status |
|-----------|----------|--------|
| End-to-end workflow completes autonomously | MUST | ✅ JSM → Confluence FAQ |
| AI necessity verified | MUST | ✅ Semantic reasoning required |
| Actionable structured output produced | MUST | ✅ Formatted Confluence pages |
| Evaluation metric defined | SHOULD | ✅ Cohesion score + word count |

---

## 🚀 Quick Start (Demo)

```bash
# No server needed — open directly in browser
open public/dashboard.html
```

Navigate: **Dashboard → Scenario A → Scenario B → Flight Recorder → Evaluation Report**

---

## 📊 Value Proposition

> Standard Jira Automation handles IF/THEN rules.
> **We handle the semantic gap** — the class of failures that no rule-based system can detect.
>
> Our agent does real work. Our recorder captures every move. Our judge explains every failure.
>
> Remove any one of the three layers, and the system cannot function.
> **The AI is the mechanism — at every level.**

---

*AINS Hackathon 2026 — Organised by AINS 4.0 in partnership with Vectors*
*"Engineering the next layer of intelligent enterprise systems"*