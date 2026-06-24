import React from 'react';
import { Activity, ShieldAlert, CheckCircle2, TrendingUp, RefreshCw, Library, Play, AlertTriangle, Cpu, Zap, GitBranch } from 'lucide-react';
import { AgentRun } from '../types';

interface DashboardProps {
  runs: AgentRun[];
  onSelectRun: (id: string) => void;
  onNavigate: (tab: string) => void;
  onResetRuns: () => void;
}

export default function DashboardOverview({ runs, onSelectRun, onNavigate, onResetRuns }: DashboardProps) {
  const totalRuns   = runs.length;
  const failedRuns  = runs.filter(r => r.status === 'FAILED' || r.verdict?.status === 'FAILED').length;
  const replayRuns  = runs.filter(r => r.isReplay).length;
  const successRate = totalRuns > 0 ? (((totalRuns - failedRuns) / totalRuns) * 100).toFixed(1) : '100.0';

  const runsWithCohesion = runs.filter(r => r.verdict && r.verdict.cohesionScore > 0);
  const avgCohesion = runsWithCohesion.length > 0
    ? (runsWithCohesion.reduce((acc, r) => acc + (r.verdict?.cohesionScore || 0), 0) / runsWithCohesion.length).toFixed(2)
    : '0.84';

  return (
    <div className="space-y-6" id="overview-dashboard">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 p-8 md:p-10"
        style={{background: 'linear-gradient(135deg, rgba(109,40,217,0.18) 0%, rgba(15,23,42,0.95) 50%, rgba(10,16,40,0.98) 100%)'}}>

        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/15 rounded-full blur-[100px] -z-0 pointer-events-none" />
        <div className="absolute -bottom-10 left-0 w-60 h-60 bg-fuchsia-600/8 rounded-full blur-[80px] -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">

          {/* Logo */}
          <img
            src="/aero-logo.svg"
            alt="AERO"
            className="h-24 w-24 md:h-28 md:w-28 object-contain shrink-0 drop-shadow-[0_0_32px_rgba(139,92,246,0.7)] aero-float"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />

          <div className="space-y-4 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
                style={{background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:'#10b981'}}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Observability Engine
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
                style={{background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.25)', color:'#c4b5fd'}}>
                AINS Hackathon 2026
              </span>
            </div>

            <div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-none">
                AERO <span className="aero-shimmer">Flight Recorder</span>
              </h2>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-2xl">
                Enterprise AI agents running in Atlassian workspaces are non-deterministic. AERO
                transparently <strong className="text-violet-300">records every step</strong>, enables{' '}
                <strong className="text-violet-300">deterministic replay with divergence injection</strong>, and executes{' '}
                <strong className="text-violet-300">AI Judge evaluations</strong> to attribute silent failures to precise components.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => onNavigate('recorder')} id="btn-nav-recorder"
                className="px-4 py-2 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer aero-glow"
                style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow:'0 4px 20px rgba(109,40,217,0.35)'}}>
                <Cpu size={13} /> Launch Flight Recorder
              </button>
              <button onClick={() => onNavigate('sandbox')} id="btn-nav-sandbox"
                className="px-4 py-2 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer hover:text-white"
                style={{background:'rgba(15,23,42,0.8)', border:'1px solid rgba(139,92,246,0.3)', color:'#a78bfa'}}>
                <Zap size={13} /> Run Agent on Jira Ticket
              </button>
              <button onClick={() => onNavigate('failures')} id="btn-nav-failures"
                className="px-4 py-2 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                style={{background:'rgba(15,23,42,0.8)', border:'1px solid rgba(100,116,139,0.3)', color:'#94a3b8'}}>
                <ShieldAlert size={13} /> Silent Failures Map
              </button>
              <button onClick={onResetRuns} id="btn-reset-sessions"
                className="px-3 py-2 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                style={{background:'rgba(15,23,42,0.5)', border:'1px solid rgba(100,116,139,0.2)', color:'#64748b'}}>
                <RefreshCw size={11} /> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            id: 'stat-success', label: 'Success Rate', value: `${successRate}%`,
            sub: `${totalRuns - failedRuns}/${totalRuns} clean runs`,
            barWidth: successRate, barColor: '#10b981',
            icon: <CheckCircle2 size={16} />, iconBg: 'rgba(16,185,129,0.1)', iconColor: '#10b981',
            glowColor: 'rgba(16,185,129,0.15)',
          },
          {
            id: 'stat-failures', label: 'Silent Failures', value: String(failedRuns),
            sub: 'Requires AI verdict', barWidth: null, barColor: '',
            icon: <ShieldAlert size={16} />, iconBg: 'rgba(248,113,113,0.1)', iconColor: '#f87171',
            glowColor: 'rgba(248,113,113,0.1)',
          },
          {
            id: 'stat-cohesion', label: 'Avg Cohesion', value: avgCohesion,
            sub: 'Semantic quality index',
            barWidth: String(parseFloat(avgCohesion) * 100), barColor: '#a78bfa',
            icon: <TrendingUp size={16} />, iconBg: 'rgba(167,139,250,0.1)', iconColor: '#a78bfa',
            glowColor: 'rgba(139,92,246,0.12)',
          },
          {
            id: 'stat-replays', label: 'Recorded Replays', value: String(replayRuns),
            sub: 'Deterministic playbacks',
            barWidth: null, barColor: '',
            icon: <GitBranch size={16} />, iconBg: 'rgba(56,189,248,0.1)', iconColor: '#38bdf8',
            glowColor: 'rgba(56,189,248,0.08)',
          },
        ].map(s => (
          <div key={s.id} id={s.id}
            className="p-4 rounded-xl space-y-3 transition-all hover:scale-[1.01] cursor-default"
            style={{background:`rgba(15,23,42,0.85)`, border:'1px solid rgba(30,41,59,0.9)', boxShadow:`0 0 30px ${s.glowColor}`}}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">{s.label}</span>
              <div className="p-1.5 rounded-lg" style={{background:s.iconBg, color:s.iconColor}}>{s.icon}</div>
            </div>
            <div className="text-2xl font-black text-white tracking-tight">{s.value}</div>
            {s.barWidth !== null && (
              <div className="w-full bg-slate-800/80 h-1 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{width:`${Math.min(parseFloat(String(s.barWidth)), 100)}%`, background:s.barColor}} />
              </div>
            )}
            <p className="text-[10px] text-slate-600">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Trajectory Table ── */}
      <div className="rounded-xl overflow-hidden" style={{background:'rgba(15,23,42,0.85)', border:'1px solid rgba(30,41,59,0.9)'}}>
        <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Library size={16} className="text-violet-400" />
              Recorded Trajectory <span className="italic text-violet-300 font-normal ml-1">Flight Log</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">All captured execution sequences — replay, branch, or audit any run.</p>
          </div>
          <span className="aero-badge">{totalRuns} sessions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800/40 text-slate-600 uppercase tracking-wider text-[9px] font-bold">
                {['Session ID', 'JSM Ticket', 'Timestamp', 'Status', 'Model', 'AI Judge', 'Actions'].map(h => (
                  <th key={h} className="py-3 px-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((run, i) => (
                <tr key={run.id}
                  className="border-b border-slate-800/30 transition-all hover:bg-violet-900/8 group"
                  style={{animationDelay:`${i * 30}ms`}}>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-200 text-[10px]">{run.id}</span>
                      {run.isReplay && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest"
                          style={{background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', color:'#c4b5fd'}}>
                          REPLAY
                        </span>
                      )}
                      {run.divergedAtStep && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest"
                          style={{background:'rgba(217,70,239,0.12)', border:'1px solid rgba(217,70,239,0.3)', color:'#f0abfc'}}>
                          BRANCH
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200 text-[11px] truncate max-w-[180px]">{run.ticketTitle}</div>
                    <div className="text-[9px] text-slate-600 font-mono">{run.ticketId}</div>
                  </td>

                  <td className="py-3 px-4 text-slate-500 font-mono text-[9px] whitespace-nowrap">
                    {new Date(run.timestamp).toLocaleTimeString()}<br/>
                    <span className="text-slate-700">{new Date(run.timestamp).toLocaleDateString()}</span>
                  </td>

                  <td className="py-3 px-4">
                    {run.status === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                        style={{background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', color:'#f87171'}}>
                        <span className="w-1 h-1 rounded-full bg-red-400" />FAILED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                        style={{background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', color:'#10b981'}}>
                        <span className="w-1 h-1 rounded-full bg-emerald-400" />SUCCESS
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-600 text-[9px] max-w-[100px] truncate">{run.modelName}</td>

                  <td className="py-3 px-4">
                    {run.verdict ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        run.verdict.status === 'PASSED'
                          ? 'bg-emerald-950 border border-emerald-500/20 text-emerald-400'
                          : run.verdict.status === 'FLAGGED'
                          ? 'bg-amber-950 border border-amber-500/20 text-amber-400'
                          : 'bg-red-950 border border-red-500/20 text-red-400'
                      }`}>
                        {run.verdict.status}
                      </span>
                    ) : (
                      <span className="text-slate-700 text-[9px] font-mono">—</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onSelectRun(run.id)}
                        className="px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105"
                        style={{background:'rgba(30,41,59,0.8)', border:'1px solid rgba(51,65,85,0.8)', color:'#94a3b8'}}>
                        <Play size={9} /> Replay
                      </button>
                      <button onClick={() => { onSelectRun(run.id); onNavigate('judge'); }}
                        className="px-2 py-1 rounded text-[9px] font-bold cursor-pointer transition-all hover:scale-105"
                        style={{background:'rgba(109,40,217,0.12)', border:'1px solid rgba(109,40,217,0.3)', color:'#a78bfa'}}>
                        Audit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-600 text-xs font-mono">
                    No trajectories recorded yet — launch the agent from Sandbox to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
