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
  const [sandboxTicketId, setSandboxTicketId] = useState<string>('');
  const [sandboxPrompt, setSandboxPrompt] = useState<string>('Process this ticket carefully. Extract the core issue and generate a clear, structured Confluence FAQ article without hallucinations.');
  const [sandboxModel, setSandboxModel] = useState<string>('gemini-2.0-flash');

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

      if (runsData.status === 'success') {
        // /api/runs renvoie seulement les résumés (sans steps) — on enrichit chaque run
        const fullRuns = await Promise.all(
          runsData.runs.map(async (r: any) => {
            try {
              const detailRes  = await fetch(`/api/run/${r.id}`);
              const detailData = await detailRes.json();
              return detailData.status === 'success' ? detailData.run : r;
            } catch {
              return r; // fallback sur le résumé si le détail échoue
            }
          })
        );
        setRuns(fullRuns);
      }
      if (ticketsData.status === 'success') {
        setTickets(ticketsData.tickets);
        // Set default sandbox ticket to first real ticket
        if (ticketsData.tickets.length > 0 && !sandboxTicketId) {
          setSandboxTicketId(ticketsData.tickets[0].id);
        }
      }
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
    <div className="min-h-screen bg-[#03040d] aero-grid-bg aero-scanlines text-slate-100 relative overflow-hidden flex flex-col">

      {/* Ambient glow orbs */}
      <div className="fixed top-[-120px] left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-violet-600/10 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-80px] right-[-100px] w-[400px] h-[300px] bg-fuchsia-700/8 blur-[120px] pointer-events-none" />
      <div className="fixed top-1/3 left-[-80px] w-[300px] h-[300px] bg-blue-700/6 blur-[100px] pointer-events-none" />

      {/* ═══ PREMIUM HEADER ═══ */}
      <header className="sticky top-0 z-50 glass-card border-b border-violet-900/20 px-6 py-3 flex items-center justify-between" style={{backdropFilter:'blur(24px)'}}>

        {/* Logo + Brand */}
        <div className="flex items-center gap-3">
          <div className="aero-float shrink-0">
            <img
              src="/aero-logo.svg"
              alt="AERO Logo"
              className="h-12 w-12 object-contain drop-shadow-[0_0_16px_rgba(139,92,246,0.8)]"
              onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-[0.15em] aero-shimmer">AERO</h1>
              <span className="aero-badge">v1.2</span>
            </div>
            <p className="text-[10px] text-slate-500 tracking-[0.18em] uppercase font-medium whitespace-nowrap">Observe · Understand · Elevate</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 p-1 rounded-xl border border-slate-800/80 text-[11px] font-semibold" style={{background:'rgba(3,4,13,0.6)'}} id="main-navigation">
          {([
            { id: 'dashboard', label: 'Command Center',  icon: <Activity size={13} /> },
            { id: 'failures',  label: 'Silent Failures',  icon: <ShieldAlert size={13} /> },
            { id: 'drift',     label: 'Drift Monitor',    icon: <Cpu size={13} /> },
            { id: 'recorder',  label: 'Flight Recorder',  icon: <Layers size={13} /> },
            { id: 'judge',     label: 'AI Judge',         icon: <GitFork size={13} /> },
            { id: 'sandbox',   label: 'Sandbox',          icon: <Terminal size={13} /> },
          ] as {id:string;label:string;icon:React.ReactNode}[]).map(tab => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg border transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'nav-tab-active text-violet-200 border-violet-600/40'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-violet-400' : 'text-slate-600'}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchAllData(true)}
            id="btn-sync-refresh"
            disabled={isProcessing}
            className="p-2 rounded-lg border border-slate-800 text-slate-500 hover:text-violet-400 hover:border-violet-800/50 transition-all disabled:opacity-40 cursor-pointer"
            style={{background:'rgba(15,23,42,0.6)'}}
            title="Sync data"
          >
            <RefreshCw size={13} className={isProcessing ? 'animate-spin text-violet-400' : ''} />
          </button>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',color:'#10b981'}}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Audit
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="lg:hidden flex gap-1 px-4 pt-3 overflow-x-auto" style={{background:'rgba(3,4,13,0.8)'}}>
        {([
          { id: 'dashboard', label: '📊 Command' },
          { id: 'failures',  label: '🔍 Failures' },
          { id: 'drift',     label: '📈 Drift' },
          { id: 'recorder',  label: '🔂 Recorder' },
          { id: 'judge',     label: '🧠 Judge' },
          { id: 'sandbox',   label: '🤖 Sandbox' },
        ] as {id:string;label:string}[]).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
              activeTab === t.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Toast notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 max-w-xs aero-slide-in" id="toast-alert">
          <div className={`p-3.5 rounded-xl border shadow-2xl flex items-start gap-3 ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/25 text-emerald-300'
              : notification.type === 'error'
              ? 'bg-red-950/80 border-red-500/25 text-red-300'
              : 'bg-violet-950/80 border-violet-500/25 text-violet-300'
          }`} style={{backdropFilter:'blur(20px)'}}>
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div className="text-[11px] font-medium leading-relaxed">{notification.text}</div>
          </div>
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 space-y-6">

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
              // Pre-load the selected ticket into Sandbox and navigate there
              setSandboxTicketId(tid);
              setSandboxPrompt(`Analyze ticket ${tid} carefully. Extract the root cause and generate a professional Confluence FAQ article. Be precise and avoid hallucinations.`);
              setActiveTab('sandbox');
              notify('info', `Ticket ${tid} loaded in Sandbox. Click Launch to run the agent.`);
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
                      onChange={(e) => setSandboxTicketId(e.target.value)}
                      id="sandbox-ticket-selector"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200"
                    >
                      {tickets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id} — {t.title}
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

      {/* ═══ FOOTER ═══ */}
      <footer className="mt-auto border-t border-slate-900/60 px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/aero-logo.svg" alt="" className="h-6 w-6 object-contain opacity-60"
              onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
            <span className="text-[11px] font-bold tracking-widest text-slate-600 uppercase">AERO</span>
            <span className="text-slate-800">|</span>
            <span className="text-[10px] text-slate-700 font-mono">Automated Enterprise Recording &amp; Observability</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-700 font-mono tracking-wider">
            <span>AINS Hackathon 2026</span>
            <span className="w-1 h-1 rounded-full bg-violet-800" />
            <span>Capture · Replay · Audit · Explain</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
