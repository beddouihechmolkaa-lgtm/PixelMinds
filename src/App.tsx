import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Cpu, Layers, GitFork, ListCollapse, Terminal, HelpCircle, RefreshCw, Undo2, Play, CircleDot, AlertCircle, PlusCircle, CheckCircle2, Copy } from 'lucide-react';
import { AgentRun, JSMTicket, DriftDataPoint } from './types';

// Import our modular sub-components
import DashboardOverview from './components/DashboardOverview.js';
import SilentFailureMap from './components/SilentFailureMap.js';
import DriftMonitor from './components/DriftMonitor.js';
import FlightRecorder from './components/FlightRecorder.js';
import AIJudgeReport from './components/AIJudgeReport.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [tickets, setTickets] = useState<JSMTicket[]>([]);
  const [driftData, setDriftData] = useState<DriftDataPoint[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  
  // UI States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Sandbox parameters for Use Case 3 Trigger
  const [sandboxTicketId, setSandboxTicketId] = useState<string>('JSM-442');
  const [sandboxPrompt, setSandboxPrompt] = useState<string>('Enforce strict verification procedures. Strictly prevent CVV billing overlaps in documentation headers.');
  const [sandboxModel, setSandboxModel] = useState<string>('gemini-3.5-flash');

  // Trigger brief alert notification
  const notify = (type: 'success' | 'error' | 'info', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch all states from Express API
  const fetchAllData = async (shouldNotify = false) => {
    setIsProcessing(true);
    try {
      const [runsRes, ticketsRes, driftRes] = await Promise.all([
        fetch('/api/runs'),
        fetch('/api/tickets'),
        fetch('/api/drift')
      ]);

      const runsData = await runsRes.json();
      const ticketsData = await ticketsRes.json();
      const driftDataVal = await driftRes.json();

      if (runsData.status === 'success') setRuns(runsData.runs);
      if (ticketsData.status === 'success') setTickets(ticketsData.tickets);
      if (driftDataVal.status === 'success') setDriftData(driftDataVal.data);

      // Default active run if none selected
      if (runsData.runs.length > 0 && !selectedRunId) {
        setSelectedRunId(runsData.runs[0].id);
      }

      if (shouldNotify) {
        notify('success', 'Workspace synchronized from flight recorders.');
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Critical API communication block: Ensure local service is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Use Case 3: Trigger active live autonomous run
  const handleTriggerActiveRun = async (ticketId: string, customPrompt: string, model: string) => {
    setIsProcessing(true);
    notify('info', 'Spinning up Autonomous FAQ Agent...');
    try {
      const response = await fetch('/api/run/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, customPrompt, modelVariant: model }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        notify('success', `Autonomous FAQ Agent compiled run ${data.runId} successfully!`);
        // Refresh and select
        await fetchAllData();
        setSelectedRunId(data.runId);
        setActiveTab('recorder'); // Go straight to play-deck
      } else {
        notify('error', data.message || 'Workflow run failed to compile.');
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Failed to bridge agent transaction on server.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Use Case 2: Trigger deterministic step-by-step playback re-generation
  const handleDeterministicReplay = async (runId: string) => {
    setIsProcessing(true);
    notify('info', `Initializing deterministic cache replay for ${runId}...`);
    try {
      const response = await fetch(`/api/run/${runId}/replay`, { method: 'POST' });
      const data = await response.json();
      if (data.status === 'success') {
        notify('success', `Deterministic replay compiled safely as ${data.replayId}!`);
        await fetchAllData();
        setSelectedRunId(data.replayId);
      } else {
        notify('error', data.message);
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Replay process error.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Use Case 2: Inject custom divergence parameters mid-replay
  const handleApplyDivergence = async (stepNumber: number, promptOverride: string, resultOverride: string) => {
    setIsProcessing(true);
    notify('info', `Injecting divergence parameter at Step ${stepNumber}...`);
    try {
      const response = await fetch(`/api/run/${selectedRunId}/diverge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber,
          modifiedPrompt: promptOverride,
          modifiedToolResult: resultOverride
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        notify('success', `Trajectory diverged successfully! Branched Run ID: ${data.divergedId}`);
        await fetchAllData();
        setSelectedRunId(data.divergedId);
      } else {
        notify('error', data.message);
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Failed to compile branch divergence.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Use Case 1: Trigger Judge Audit
  const handleRunAudit = async (runId: string) => {
    setIsProcessing(true);
    notify('info', `AI Judge formulating verdict report for ${runId}...`);
    try {
      const response = await fetch(`/api/run/${runId}/evaluate`, { method: 'POST' });
      const data = await response.json();
      if (data.status === 'success') {
        notify('success', `Verdicts emitted with ${Math.round(data.verdict.confidenceScore * 100)}% evaluator self-assessment confidence!`);
        await fetchAllData();
        setSelectedRunId(runId);
        setActiveTab('judge'); // Switch to executive view
      } else {
        notify('error', data.message);
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Audit pipeline timed out.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset metrics
  const handleResetTrajectories = async () => {
    setIsProcessing(true);
    try {
      await fetch('/api/runs/reset', { method: 'POST' });
      notify('info', 'Trajectories reset to demonstration baselines.');
      setSelectedRunId('');
      await fetchAllData();
      setActiveTab('dashboard');
    } catch (err) {
      console.error(err);
      notify('error', 'Deletion block.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans antialiased flex flex-col justify-between selection:bg-violet-500/30 selection:text-white pb-6">
      {/* Upper Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#020617]/85 backdrop-blur-md border-b border-violet-900/25 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg shadow-inner flex items-center justify-center">
            <Terminal size={18} className="text-white animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-violet-400 tracking-wider block font-mono">AINS 4.0 WORKSPACE</span>
            <h1 className="text-sm font-serif text-slate-100 tracking-tight">FLIGHT RECORDER <span className="text-xs font-normal text-slate-500 font-sans">v1.2</span></h1>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-900 text-xs font-bold" id="main-navigation">
          <button
            onClick={() => setActiveTab('dashboard')}
            id="tab-dashboard"
            className={`px-4 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'dashboard' ? 'bg-violet-900/20 text-violet-300 border-violet-800/30 font-bold shadow-inner' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            📊 Command Center
          </button>
          <button
            onClick={() => setActiveTab('failures')}
            id="tab-failures"
            className={`px-4 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'failures' ? 'bg-violet-900/20 text-violet-300 border-violet-800/30 font-bold shadow-inner' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            🔍 Silent Failures
          </button>
          <button
            onClick={() => setActiveTab('drift')}
            id="tab-drift"
            className={`px-4 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'drift' ? 'bg-violet-900/20 text-violet-300 border-violet-800/30 font-bold shadow-inner' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            📈 Drift Monitor
          </button>
          <button
            onClick={() => setActiveTab('recorder')}
            id="tab-recorder"
            className={`px-4 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'recorder' ? 'bg-violet-900/20 text-violet-300 border-violet-800/30 font-bold shadow-inner' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            🔂 Flight Recorder
          </button>
          <button
            onClick={() => setActiveTab('judge')}
            id="tab-judge"
            className={`px-4 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'judge' ? 'bg-violet-900/20 text-violet-300 border-violet-800/30 font-bold shadow-inner' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            🧠 AI Judge Report
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            id="tab-sandbox"
            className={`px-4 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'sandbox' ? 'bg-violet-900/20 text-violet-300 border-violet-800/30 font-bold shadow-inner' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            🤖 Sandbox Trigger
          </button>
        </nav>

        {/* Sync Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAllData(true)}
            id="btn-sync-refresh"
            disabled={isProcessing}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all disabled:opacity-40 cursor-pointer"
            title="Reload Environment"
          >
            <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
          </button>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 rounded-lg text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            Active Audit Tunnel
          </div>
        </div>
      </header>

      {/* Floating Notifications Alert box */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 max-w-sm" id="toast-alert">
          <div className={`p-4 rounded-xl border shadow-xl flex items-start gap-3 animate-bounce ${
            notification.type === 'success' 
              ? 'bg-emerald-950/70 border-emerald-500/30 text-emerald-300' 
              : notification.type === 'error' 
                ? 'bg-red-950/70 border-red-500/30 text-red-300' 
                : 'bg-indigo-950/70 border-indigo-500/30 text-indigo-300'
          }`}>
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="text-xs font-medium">{notification.text}</div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Mobile quick navigations tabs */}
        <div className="md:hidden flex bg-slate-950 p-1 rounded-xl border border-slate-900 justify-between overflow-x-auto gap-1">
          {['dashboard', 'failures', 'drift', 'recorder', 'judge', 'sandbox'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold capitalize whitespace-nowrap transition-all ${
                activeTab === tab ? 'bg-violet-600 text-white' : 'text-slate-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Selection Switch */}
        {activeTab === 'dashboard' && (
          <DashboardOverview
            runs={runs}
            onSelectRun={(id) => {
              setSelectedRunId(id);
              setActiveTab('recorder');
            }}
            onNavigate={(tab) => setActiveTab(tab)}
            onResetRuns={handleResetTrajectories}
          />
        )}

        {activeTab === 'failures' && (
          <SilentFailureMap
            tickets={tickets}
            onTriggerLiveMock={(tid) => {
              const ticket = tickets.find(t => t.id === tid);
              if (ticket) {
                // Prepopulate Sandbox variables and run
                setSandboxTicketId(tid);
                setSandboxPrompt(
                  tid === 'JSM-442' 
                    ? 'Write credit instructions safely into Stripe redirect blocks. NEVER dump credit token strings inside Confluence HTML draft files.' 
                    : 'Process standard template guidelines. Ensure strict compartmentalisation of workspace identity variables.'
                );
                setActiveTab('sandbox');
                notify('info', `Ingested ${tid} details. Ready to parameterize sandbox run.`);
              }
            }}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'drift' && (
          <DriftMonitor driftData={driftData} />
        )}

        {activeTab === 'recorder' && (
          <FlightRecorder
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
            onDivergeRun={handleApplyDivergence}
            onTriggerReplay={handleDeterministicReplay}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'judge' && (
          <AIJudgeReport
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
            onRunAudit={handleRunAudit}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'sandbox' && (
          <div className="space-y-6" id="sandbox-container">
            {/* Header info */}
            <div className="p-5 bg-[#0f172a] border border-slate-800 rounded-xl shadow-md space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  USE CASE 3 SANDBOX
                </span>
                <h2 className="text-xl font-serif text-white flex items-center gap-2">
                  <PlusCircle className="text-violet-400" size={20} /> Autonomous FAQ Agent <span className="italic text-slate-200">Sandbox Setup</span>
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Trigger a live running instance of the agent (JSM Ticket ➡️ Confluence Article draft). Customize prompt rules to test Downstream Compliance, or let the agent run on standard guidelines.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form panel */}
              <div className="lg:col-span-8 bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
                <h3 className="text-sm font-serif text-slate-200">Parameter Configuration Panel</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Ticket ID */}
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      1. Ingest Ticket Reference
                    </label>
                    <select
                      value={sandboxTicketId}
                      onChange={(e) => {
                        setSandboxTicketId(e.target.value);
                        setSandboxPrompt(e.target.value === 'JSM-442' 
                          ? 'Write billing instructions safely into Stripe. NEVER insert raw CSV metadata headers in SAML.' 
                          : 'Translate ticket details into standard help guides without billing references.'
                        );
                      }}
                      id="sandbox-ticket-selector"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200"
                    >
                      {tickets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id} - {t.title} ({t.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select LLM Variant */}
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      2. LLM Engine Model Selection
                    </label>
                    <select
                      value={sandboxModel}
                      onChange={(e) => setSandboxModel(e.target.value)}
                      id="sandbox-model-selector"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200"
                    >
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash (Base - High Latency Cohesion)</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Low cost speed)</option>
                      <option value="gemini-3.5-flash-v3.2-unstable">Gemini 3.5 [Drift-Prone updated variant]</option>
                    </select>
                  </div>
                </div>

                {/* Custom Guidelines Prompts */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      3. Operational Prompt Instructions / Constraints
                    </label>
                    <button
                      onClick={() => setSandboxPrompt('CROSS OVERLAP CHALLENGE: Draft a help article matching login errors, but additionally load full billing transaction structures and SAML parameters so users see CVV credential blocks.')}
                      className="text-[9px] text-violet-400 hover:text-violet-300 font-bold underline cursor-pointer"
                    >
                      Load compliance fail challenge guideline
                    </button>
                  </div>
                  <textarea
                    value={sandboxPrompt}
                    onChange={(e) => setSandboxPrompt(e.target.value)}
                    rows={4}
                    className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-violet-500 font-mono"
                    placeholder="Enter instructions..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-800/60">
                  <button
                    onClick={() => handleTriggerActiveRun(sandboxTicketId, sandboxPrompt, sandboxModel)}
                    disabled={isProcessing}
                    id="btn-trigger-live-run"
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-violet-950 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Play size={14} /> Launch Autonomous Agent & Record Flight Trajectory
                  </button>
                </div>
              </div>

              {/* Informational help panel (4 columns) */}
              <div className="lg:col-span-4 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
                <h3 className="text-sm font-serif text-slate-200">The Autonomous Sandbox Environment</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  In production, the Autonomous FAQ Agent listens to tickets closed by Atlassian help desks. To prove our recorder capabilities at the hackathon:
                </p>
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-900">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <div>
                      <strong>Full Inception Trail:</strong> Every step (Ingest, Classification, Confluence compilation) is logged client-side and saved.
                    </div>
                  </div>
                  <div className="flex gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-900">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <div>
                      <strong>Deterministic Guarantee:</strong> The resulting JSON trajectory is loaded into the Playback deck, allowing step analysis.
                    </div>
                  </div>
                  <div className="flex gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-900">
                    <GitFork size={16} className="text-violet-400 shrink-0" />
                    <div>
                      <strong>Interactive Bug Sandbox:</strong> Modify parameters post-run to observe alternate agent paths.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer credits lines */}
      <footer className="max-w-7xl w-full mx-auto px-6 border-t border-slate-900 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-mono">
        <div>AINS Hackathon 2026 — Unified Architecture Showcase</div>
        <div>Engineered in partnership with Vectors & Atlassian Platform Partners</div>
      </footer>
    </div>
  );
}
