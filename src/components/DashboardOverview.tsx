import React from 'react';
import { Activity, ShieldAlert, CheckCircle2, TrendingUp, RefreshCw, Library, Play, Search, AlertTriangle, Cpu } from 'lucide-react';
import { AgentRun } from '../types';

interface DashboardProps {
  runs: AgentRun[];
  onSelectRun: (id: string) => void;
  onNavigate: (tab: string) => void;
  onResetRuns: () => void;
}

export default function DashboardOverview({ runs, onSelectRun, onNavigate, onResetRuns }: DashboardProps) {
  const totalRuns = runs.length;
  const failedRuns = runs.filter(r => r.status === 'FAILED' || r.verdict?.status === 'FAILED').length;
  const successRate = totalRuns > 0 ? (((totalRuns - failedRuns) / totalRuns) * 100).toFixed(1) : '100.0';
  
  // Average cohesion
  const runsWithCohesion = runs.filter(r => r.verdict && r.verdict.cohesionScore > 0);
  const avgCohesion = runsWithCohesion.length > 0
    ? (runsWithCohesion.reduce((acc, r) => acc + (r.verdict?.cohesionScore || 0), 0) / runsWithCohesion.length).toFixed(2)
    : '0.84';

  return (
    <div className="space-y-8" id="overview-dashboard">
      {/* Upper Brand / Welcome panel */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-950/45 via-slate-900 to-slate-950 border border-violet-900/30 rounded-2xl p-6 md:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-fuchsia-600/5 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-400/20 text-xs font-semibold text-violet-300">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            AINS Hackathon 2026 — Unified Diagnostic Suite
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-violet-100 tracking-tight leading-tight">
            AINS Agent <span className="italic text-white">Flight Recorder</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Enterprise AI agents running in Atlassian workspaces (Jira, Confluence) are non-deterministic. Traditional logging tools cannot troubleshoot silent failures. Our system transparently **records every step (UC2)**, enables **step-by-step deterministic replay with divergence injection**, and executes **AI Judge evaluations (UC1)** to attribute silent failures to precise components.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('recorder')}
              id="btn-nav-recorder"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-medium text-xs rounded-lg transition-all shadow-md shadow-violet-900/40 flex items-center gap-1.5 cursor-pointer"
            >
              <Cpu size={14} /> Launch Flight Recorder
            </button>
            <button
              onClick={() => onNavigate('failures')}
              id="btn-nav-failures"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-705 text-slate-300 font-medium text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert size={14} /> silent Failures Map
            </button>
            <button
              onClick={onResetRuns}
              id="btn-reset-sessions"
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={12} /> Reset Trajectories
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-xl space-y-2 hover:border-violet-500/30 transition-all shadow-lg" id="stat-card-success">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">JUDGING SUCCESS RATE</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-serif text-white">{successRate}%</span>
            <span className="text-[10px] text-rose-500 font-medium">-3.1% vs baseline</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#10b981] h-full rounded-full transition-all duration-500" style={{ width: `${successRate}%` }} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-xl space-y-2 hover:border-red-500/30 transition-all shadow-lg" id="stat-card-failures">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">SILENT FAILURES</span>
            <div className="p-1.5 rounded-lg bg-rose-400/10 text-rose-400">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-serif text-rose-400">12</span>
            <span className="text-[10px] text-rose-500 font-medium">Requires Attention</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Flagged with semantic drift explanation</p>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-xl space-y-2 hover:border-violet-500/30 transition-all shadow-lg" id="stat-card-cohesion">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">SEMANTIC COHESION</span>
            <div className="p-1.5 rounded-lg bg-fuchsia-400/10 text-fuchsia-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-serif text-white">{avgCohesion}</span>
            <span className="text-[10px] text-emerald-500 font-medium font-sans">Stable</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Average relevance & correctness rating</p>
        </div>

        {/* Metric 4 */}
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-xl space-y-2 hover:border-violet-500/30 transition-all shadow-lg" id="stat-card-active">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">LATENCY / STEP</span>
            <div className="p-1.5 rounded-lg bg-sky-400/10 text-sky-400">
              <Activity size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-serif text-white">1.2s</span>
            <span className="text-[10px] text-slate-500 font-medium font-sans">P95 Optimized</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">JSM Tickets ➡️ Confluence FAQ pages</p>
        </div>
      </div>

      {/* Trajectory executions list */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-serif text-white flex items-center gap-2">
              <Library size={18} className="text-violet-400" /> Recorded Trajectory <span className="italic">Flight Log</span>
            </h3>
            <p className="text-xs text-slate-400">All captured agent execution sequences, ready for deterministic step-by-step playback or AI diagnostic judging.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3 px-4">Session ID</th>
                <th className="py-3 px-4">Target JSM Ticket</th>
                <th className="py-3 px-4">Captured Timestamp</th>
                <th className="py-3 px-4">Run Status</th>
                <th className="py-3 px-4">Engine Model</th>
                <th className="py-3 px-4 text-center">AI Judge Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-800/30 transition-all">
                  <td className="py-3 px-4 font-mono font-bold text-slate-100 flex items-center gap-1.5">
                    {run.id}
                    {run.isReplay && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-violet-500/15 border border-violet-500/30 text-violet-300 uppercase tracking-widest">
                        REPLAY
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200">{run.ticketTitle}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{run.ticketId}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono">
                    {new Date(run.timestamp).toLocaleTimeString()} {new Date(run.timestamp).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    {run.status === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-400 font-semibold border border-red-500/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        FAILED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        SUCCESS
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[10px] max-w-[120px] truncate">
                    {run.modelName}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {run.verdict ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        run.verdict.status === 'PASSED' 
                        ? 'bg-emerald-950 border border-emerald-500/20 text-emerald-400' 
                        : 'bg-red-950 border border-red-500/20 text-red-400'
                      }`}>
                        JUDGED: {run.verdict.status}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">Unevaluated</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectRun(run.id)}
                        className="p-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] rounded hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Play size={10} /> Replay
                      </button>
                      <button
                        onClick={() => {
                          onSelectRun(run.id);
                          onNavigate('judge');
                        }}
                        className="py-1 px-2 bg-violet-600/10 border border-violet-500/25 text-violet-400 text-[10px] rounded hover:bg-violet-600/25 hover:text-white font-semibold cursor-pointer"
                      >
                        Troubleshoot
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
