import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Search, Filter, AlertCircle, ArrowRight, Eye, RefreshCw, Layers } from 'lucide-react';
import { JSMTicket } from '../types';

interface SilentFailureMapProps {
  tickets: JSMTicket[];
  onTriggerLiveMock: (ticketId: string) => void;
  isProcessing: boolean;
}

export default function SilentFailureMap({ tickets, onTriggerLiveMock, isProcessing }: SilentFailureMapProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<JSMTicket | null>(tickets.find(t => t.id === 'JSM-442') || tickets[4]);

  // Handle filtering
  const filteredTickets = tickets.filter(t => {
    const matchesFilter = 
      filterType === 'ALL' || 
      (filterType === 'SUCCESS' && t.status === 'PROCESSED') || 
      (filterType === 'FAILED' && t.status === 'FAILED');
      
    const matchesSearch = 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const totalSilentFailures = tickets.filter(t => t.status === 'FAILED').length;

  return (
    <div className="space-y-6" id="scen-a-container">
      {/* Intro info and filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-[#0f172a]/80 border border-slate-800 rounded-xl shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
              SCENARIO A DEMO
            </span>
            <h2 className="text-xl font-serif text-white flex items-center gap-2">
              <ShieldAlert className="text-red-400" size={20} /> Silent Failure <span className="italic">Audit Map</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            AI Agents approve requests or draft FAQ templates with zero exceptions fired. Out of 80 mock JSM tickets processed, 12 silent failures are identified here by the AI Judge comparing semantic outputs against safety parameters.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search SSO, LDAP, VPN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="py-1.5 pl-8 pr-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-violet-500/50 w-full sm:w-48"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800" id="ticket-filter">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${filterType === 'ALL' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All (80)
            </button>
            <button
              onClick={() => setFilterType('SUCCESS')}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${filterType === 'SUCCESS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Success (68)
            </button>
            <button
              onClick={() => setFilterType('FAILED')}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${filterType === 'FAILED' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Silent Failures (12)
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid mapping and split tracer panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: 80-item interactive grid (takes 7 columns) */}
        <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif text-slate-200 flex items-center gap-1.5">
              <Layers size={14} className="text-violet-400" /> Executive Ticket <span className="italic text-white">Matrix Map</span>
            </h3>
            <div className="flex items-center gap-4 text-[10px] font-medium text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500/20 border border-emerald-500/50 rounded-sm" /> 68 Normal</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500/20 border border-red-500/50 rounded-sm" /> 12 Silent Failures</span>
            </div>
          </div>

          {/* Grid Box */}
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 p-3 bg-slate-950/80 border border-slate-900 rounded-lg max-h-[300px] overflow-y-auto" id="ticket-dots-grid">
            {filteredTickets.map((t) => {
              const itemIdx = tickets.indexOf(t);
              const isSelected = selectedTicket?.id === t.id;
              const isFailed = t.status === 'FAILED';

              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  id={`ticket-dot-${t.id}`}
                  title={`${t.id}: ${t.title}`}
                  className={`relative p-2.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isFailed 
                      ? isSelected 
                        ? 'bg-red-500/45 border-2 border-red-400 text-red-100 shadow-lg shadow-red-950/40' 
                        : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400' 
                      : isSelected 
                        ? 'bg-emerald-500/35 border-2 border-emerald-400 text-emerald-100' 
                        : 'bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-slate-400'
                  }`}
                >
                  <span className="text-[9px] font-bold tracking-tight">#{t.id.split('-')[1]}</span>
                  {isFailed ? (
                    <ShieldAlert size={10} className="mt-1 text-red-400 animate-pulse" />
                  ) : (
                    <ShieldCheck size={10} className="mt-1 text-emerald-500" />
                  )}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-500 italic max-w-md">
            Tip: Click on any matrix grid tile above to inspect details, view the semantic evaluation trace, or trigger a diagnostic sandbox run.
          </p>
        </div>

        {/* Right column: Ticket Investigator Split Panel (takes 5 columns) */}
        <div className="lg:col-span-5 flex" id="ticket-investigator-panel">
          {selectedTicket ? (
            <div className="flex-1 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] tracking-widest font-bold text-violet-400 uppercase">INVESTIGATING</span>
                    <h4 className="text-base font-bold text-white leading-tight flex items-center gap-1.5 mt-0.5">
                      {selectedTicket.id}: {selectedTicket.title}
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedTicket.status === 'FAILED' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  }`}>
                    {selectedTicket.status === 'FAILED' ? 'FAILED' : 'PROCESSED'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex justify-between">
                      <span>JSM Raw Payload</span>
                      <span className="font-mono">{selectedTicket.category}</span>
                    </div>
                    <p className="text-slate-300 font-medium">{selectedTicket.description}</p>
                    <div className="text-[9px] text-slate-500 pt-1 flex justify-between font-mono">
                      <span>Reporter: {selectedTicket.reporter}</span>
                      <span>Created: {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {selectedTicket.status === 'FAILED' ? (
                    <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg space-y-1.5">
                      <div className="flex items-center gap-1.5 text-red-400 font-semibold text-[11px]">
                        <AlertCircle size={14} /> Diagnostic Verdict
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {selectedTicket.id === 'JSM-442' 
                          ? 'SILENT HALLUCINATION: The agent successfully processed the ticket with status "200 OK". However, the FAQ generated contains a dangerous semantic crossover: instructing corporate users to store sensitive credit card CVV metrics inside SAML Identity metadata configuration blocks, which violates PCI constraints.'
                          : 'SILENT OVERVIEW FAILURE: Agent classified this ticket under general documentation page creation but missed active security keys or authentication exposures, concluding work without flagging for manual team audit.'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-950/10 border border-emerald-500/10 rounded-lg space-y-1">
                      <div className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                        <ShieldCheck size={14} /> Diagnostic Verdict
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        PASS: The agent accurately analyzed variables, queried the appropriate OKTA-template document, and pushed safe FAQ materials to the Confluence draft repository without warnings or compliance gaps.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Run triggering */}
              <div className="pt-2">
                <button
                  onClick={() => onTriggerLiveMock(selectedTicket.id)}
                  disabled={isProcessing}
                  id={`btn-diagnose-${selectedTicket.id}`}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-violet-950 hover:shadow-violet-900/40 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Recording Live Execution...
                    </>
                  ) : (
                    <>
                      <Eye size={12} /> Inject to Flight Recorder & Troubleshoot
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-center">
              <p className="text-xs text-slate-500 italic text-center">Select an execution dot on the left map to audit details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
