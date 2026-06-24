import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Cpu, CheckSquare, AlertTriangle, AlertCircle, RefreshCw, BarChart2, Star, HelpCircle, ChevronRight } from 'lucide-react';
import { AgentRun } from '../types';

interface AIJudgeReportProps {
  runs: AgentRun[];
  selectedRunId: string;
  onSelectRun: (id: string) => void;
  onRunAudit: (runId: string) => Promise<void>;
  isProcessing: boolean;
}

export default function AIJudgeReport({
  runs,
  selectedRunId,
  onSelectRun,
  onRunAudit,
  isProcessing
}: AIJudgeReportProps) {
  const run = runs.find(r => r.id === selectedRunId) || runs[0];

  const handleAuditClick = async () => {
    if (run) {
      await onRunAudit(run.id);
    }
  };

  // Safe renderer for markdown summaries in case we do not want raw unparsed output
  const renderExplanatoryVerdict = (text: string) => {
    if (!text) return null;
    
    // Quick inline formatter for styling bold, lists & titles
    const lines = text.split('\n');
    return (
      <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
        {lines.map((line, i) => {
          let cleanLine = line.trim();
          if (cleanLine.startsWith('###')) {
            return (
              <h4 key={i} className="text-sm font-extrabold text-white border-b border-slate-900 pb-1 mt-4">
                {cleanLine.replace('###', '').trim()}
              </h4>
            );
          }
          if (cleanLine.startsWith('####')) {
            return (
              <h5 key={i} className="text-xs font-bold text-violet-400 mt-2">
                {cleanLine.replace('####', '').trim()}
              </h5>
            );
          }
          if (cleanLine.startsWith('-') || cleanLine.startsWith('*')) {
            const listContent = cleanLine.substring(1).trim();
            // check for bold tags inside
            return (
              <ul key={i} className="list-disc list-inside pl-2 space-y-1">
                <li className="text-slate-300">
                  {parseBold(listContent)}
                </li>
              </ul>
            );
          }
          if (cleanLine === '') {
            return <div key={i} className="h-1" />;
          }
          return <p key={i}>{parseBold(cleanLine)}</p>;
        })}
      </div>
    );
  };

  const parseBold = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    if (parts.length === 1) return text;
    return parts.map((part, index) => {
      if (index % 2 === 1) return <strong key={index} className="text-white font-extrabold">{part}</strong>;
      return part;
    });
  };

  return (
    <div className="space-y-6" id="ai-judge-sec">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl"
        style={{background:'rgba(15,23,42,0.85)', border:'1px solid rgba(30,41,59,0.9)'}}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="aero-badge">USE CASE 1</span>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="text-violet-400" size={18} />
              AI Quality <span className="text-violet-300 italic font-normal">Judge Dashboard</span>
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Evaluating non-deterministic steps. AI Judge performs drift diagnostics, checks PCI limits, and exposes faulty components.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select value={selectedRunId} onChange={(e) => onSelectRun(e.target.value)}
            id="audit-session-selector"
            className="text-[11px] rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none cursor-pointer"
            style={{background:'rgba(3,4,13,0.8)', border:'1px solid rgba(30,41,59,0.9)'}}>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>Audit: {r.id} ({r.ticketId})</option>
            ))}
          </select>

          {run && (
            <button onClick={handleAuditClick} disabled={isProcessing} id="btn-run-audit"
              className="px-3 py-1.5 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow:'0 4px 16px rgba(109,40,217,0.25)'}}>
              <RefreshCw size={11} className={isProcessing ? 'animate-spin' : ''} />
              Run AI Evaluation
            </button>
          )}
        </div>
      </div>


      {run ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="audit-main-grid">
          {/* Main summary of evaluation metrics (takes 5 columns) */}
          <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-[9px] tracking-widest font-bold text-violet-400">MULTI-LEVEL VERDICTS</span>
                <h3 className="text-sm font-serif text-slate-100 flex items-center gap-2 mt-0.5">
                  <BarChart2 size={16} className="text-violet-400" /> Executive <span className="italic">Metrics Overview</span>
                </h3>
              </div>

              {/* Success badge large widgets */}
              {run.verdict ? (
                <div className="space-y-3">
                  {/* Status Card */}
                  <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
                    run.verdict.status === 'PASSED' 
                      ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                      : 'bg-red-950/20 border-red-500/20 text-red-500'
                  }`}>
                    {run.verdict.status === 'PASSED' ? (
                      <ShieldCheck size={28} className="text-emerald-400 animate-pulse" />
                    ) : (
                      <ShieldAlert size={28} className="text-red-400 animate-pulse" />
                    )}
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">AI Judge Diagnostic Result</span>
                      <h4 className="text-lg font-black tracking-wide">
                        AUDIT VERDICT: {run.verdict.status}
                      </h4>
                    </div>
                  </div>

                  {/* Component failure attribution block */}
                  {run.verdict.status === 'FAILED' && (
                    <div className="p-3 bg-red-950/15 border border-red-500/10 text-red-400 text-xs rounded-lg space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-[11px]">
                        <AlertTriangle size={14} /> Component-Level failure Attribution:
                      </div>
                      <p className="text-[11px] text-slate-300 leading-normal">
                        {run.verdict.failureAttribution}
                      </p>
                      {run.verdict.failedStepNumber && (
                        <div className="text-[10px] text-slate-500 font-mono mt-1 font-semibold">
                          Attributed Step Sequence: Step {run.verdict.failedStepNumber}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meter score details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Self-Assessment</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-slate-100">{(run.verdict.confidenceScore * 100).toFixed(0)}% Confidence</span>
                      </div>
                      <p className="text-[9px] text-slate-500 pt-0.5 leading-tight">Evaluator Self-Assessment metric check</p>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Cohesion Score</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-sm font-bold text-slate-100">{run.verdict.cohesionScore} / 1.0</span>
                      </div>
                      <p className="text-[9px] text-slate-500 pt-0.5 leading-tight">Minimum safety rating: 0.70</p>
                    </div>
                  </div>

                  {/* Drift indicator warnings */}
                  {run.verdict.temporalDriftAlert && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 text-amber-400 text-[10px] rounded-lg flex items-start gap-2 leading-tight">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <strong>QUALITY DRIFT DETECTED:</strong> This run exhibits signs of formatting drift or critical parameter bloat comparing prior 30 index runs. Verify prompt settings.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-slate-950 border border-slate-900 rounded-xl text-center space-y-3">
                  <span className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 font-bold font-mono">?</span>
                  <div className="space-y-1">
                    <h4 className="text-xs text-slate-300 font-bold">Unchecked execution trajectory</h4>
                    <p className="text-[10px] text-slate-500">Run the continuous validation suite to compile diagnostics and trace component failures.</p>
                  </div>
                  <button
                    onClick={handleAuditClick}
                    disabled={isProcessing}
                    className="py-1 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    🚀 Trigger Audit Now
                  </button>
                </div>
              )}
            </div>

            {/* Pipeline flowchart */}
            <div className="border-t border-slate-800 pt-3">
              <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1.5">AI Judge Valuation Pipeline Gatework</span>
              <div className="flex items-center justify-between gap-1 text-[9px] text-slate-400 font-mono">
                <span className="p-1 px-1.5 bg-slate-950 border border-slate-900 rounded">1. Ingestion</span>
                <ChevronRight size={10} className="text-slate-600" />
                <span className="p-1 px-1.5 bg-slate-950 border border-slate-900 rounded">2. Intent</span>
                <ChevronRight size={10} className="text-slate-600" />
                <span className="p-1 px-1.5 bg-slate-950 border border-slate-900 rounded">3. Coherence</span>
                <ChevronRight size={10} className="text-slate-600" />
                <span className="p-1 px-1.5 bg-slate-950 border border-slate-900 rounded">4. PCI-Security</span>
              </div>
            </div>
          </div>

          {/* Deep diagnostic structured report layout (takes 7 columns) */}
          <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col space-y-4" id="audit-report-panel">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
              <div>
                <span className="text-[9px] tracking-widest font-bold text-violet-400 uppercase">ENGINEERING TRACE ANALYSIS</span>
                <h3 className="text-sm font-serif text-slate-100 flex items-center gap-1.5 mt-0.5">
                  <CheckSquare size={16} className="text-violet-400" /> Safe-State <span className="italic">Diagnostic Report</span>
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Run ID: {run.id}</span>
            </div>

            {/* Dynamic audit log body */}
            <div className="flex-1 overflow-y-auto max-h-[320px] p-4 bg-slate-950 border border-slate-900 rounded-lg space-y-3">
              {run.verdict ? (
                renderExplanatoryVerdict(run.verdict.verdictMarkdown)
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-10">
                  <p className="text-xs text-slate-400 italic">Continuous validation diagnostics have not been calculated yet.</p>
                  <p className="text-[10px] text-slate-500">Hit "Run AI Evaluation" on the top right to analyze the flight telemetry steps.</p>
                </div>
              )}
            </div>
            
            <p className="text-[10px] text-slate-500 italic">
              *Evaluator self-assessment confidence reflects secondary LLM verification constraints. No third-party network APIs are exposed inside this report pipeline.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 italic bg-slate-900/10 border border-slate-800 rounded-xl">
          Select or trigger an active agent run trajectory to audit.
        </div>
      )}
    </div>
  );
}
