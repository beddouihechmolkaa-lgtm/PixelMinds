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
  const totalSuccess = tickets.filter(t => t.status === 'PROCESSED').length;
  const totalAll = tickets.length;
  const filteredSuccess = filteredTickets.filter(t => t.status === 'PROCESSED').length;
  const filteredFailed = filteredTickets.filter(t => t.status === 'FAILED').length;

  return (
    <div className="space-y-6" id="scen-a-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl"
        style={{background:'rgba(15,23,42,0.85)', border:'1px solid rgba(30,41,59,0.9)'}}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="aero-badge">SCENARIO A</span>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="text-red-400" size={18} />
              Silent Failure <span className="text-violet-300 italic font-normal">Audit Map</span>
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 max-w-2xl leading-relaxed">
            Out of <strong className="text-slate-300">{totalAll}</strong> JSM tickets processed,{' '}
            <strong className="text-red-400">{totalSilentFailures} silent failures</strong> are identified by the AI Judge
            comparing semantic outputs against safety parameters — no exceptions fired.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600" />
            <input type="text" placeholder="Search tickets..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="py-1.5 pl-8 pr-3 text-[11px] rounded-lg text-slate-300 focus:outline-none focus:border-violet-500/50 w-44"
              style={{background:'rgba(3,4,13,0.8)', border:'1px solid rgba(30,41,59,0.9)'}} />
          </div>
          {/* Filter pills */}
          <div className="flex rounded-lg overflow-hidden" style={{border:'1px solid rgba(30,41,59,0.9)'}} id="ticket-filter">
            {([['ALL', `All (${totalAll})`, ''], ['SUCCESS', `Clean (${totalSuccess})`, 'emerald'], ['FAILED', `Failures (${totalSilentFailures})`, 'red']] as [string,string,string][]).map(([val,label,color]) => (
              <button key={val} onClick={() => setFilterType(val as any)}
                className={`px-3 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                  filterType === val
                    ? color === 'emerald' ? 'bg-emerald-600 text-white'
                    : color === 'red' ? 'bg-red-600 text-white'
                    : 'bg-violet-600 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                style={{background: filterType === val ? undefined : 'rgba(3,4,13,0.6)'}}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid mapping and split tracer panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Ticket Matrix */}
        <div className="lg:col-span-7 rounded-xl p-5 space-y-4" style={{background:'rgba(15,23,42,0.85)', border:'1px solid rgba(30,41,59,0.9)'}}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Layers size={14} className="text-violet-400" />
              Executive Ticket <span className="italic text-violet-300 font-normal ml-1">Matrix Map</span>
            </h3>
            <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />{filteredSuccess} Clean</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500/30 border border-red-500/50" />{filteredFailed} Failures</span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 p-3 rounded-lg max-h-[280px] overflow-y-auto" style={{background:'rgba(3,4,13,0.6)', border:'1px solid rgba(15,23,42,0.9)'}} id="ticket-dots-grid">
            {filteredTickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const isFailed   = t.status === 'FAILED';
              return (
                <button key={t.id} onClick={() => setSelectedTicket(t)}
                  id={`ticket-dot-${t.id}`} title={`${t.id}: ${t.title}`}
                  className="relative p-2.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer"
                  style={{
                    background: isFailed
                      ? isSelected ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.08)'
                      : isSelected ? 'rgba(16,185,129,0.2)' : 'rgba(15,23,42,0.6)',
                    border: isFailed
                      ? isSelected ? '2px solid rgba(239,68,68,0.7)' : '1px solid rgba(239,68,68,0.3)'
                      : isSelected ? '2px solid rgba(16,185,129,0.6)' : '1px solid rgba(30,41,59,0.8)',
                    boxShadow: isSelected ? isFailed ? '0 0 12px rgba(239,68,68,0.2)' : '0 0 12px rgba(16,185,129,0.15)' : 'none',
                  }}>
                  <span className="text-[9px] font-bold" style={{color: isFailed ? '#f87171' : isSelected ? '#6ee7b7' : '#64748b'}}>
                    #{t.id.split('-')[1]}
                  </span>
                  {isFailed
                    ? <ShieldAlert size={9} className="mt-0.5 text-red-400 animate-pulse" />
                    : <ShieldCheck size={9} className="mt-0.5 text-emerald-600" />}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-slate-700 italic">Click any tile to inspect details or trigger a diagnostic run.</p>
        </div>

        {/* Right: Inspector */}
        <div className="lg:col-span-5 flex" id="ticket-investigator-panel">
          {selectedTicket ? (
            <div className="flex-1 rounded-xl p-5 flex flex-col justify-between space-y-4" style={{background:'rgba(15,23,42,0.85)', border:'1px solid rgba(30,41,59,0.9)'}}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] tracking-widest font-bold text-violet-500 uppercase">Investigating</span>
                    <h4 className="text-sm font-bold text-white leading-tight mt-0.5">{selectedTicket.id}: {selectedTicket.title}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedTicket.status === 'FAILED'
                      ? 'text-red-400' : 'text-emerald-400'
                  }`} style={{
                    background: selectedTicket.status === 'FAILED' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                    border: selectedTicket.status === 'FAILED' ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(16,185,129,0.25)',
                  }}>
                    {selectedTicket.status === 'FAILED' ? '⚠ SILENT FAIL' : '✓ PROCESSED'}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg space-y-1.5" style={{background:'rgba(3,4,13,0.7)', border:'1px solid rgba(15,23,42,0.9)'}}>
                    <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold flex justify-between">
                      <span>JSM Raw Payload</span>
                      <span className="font-mono text-violet-600">{selectedTicket.category}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{selectedTicket.description}</p>
                    <div className="text-[9px] text-slate-600 flex justify-between font-mono pt-1">
                      <span>Reporter: {selectedTicket.reporter}</span>
                      <span>{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {selectedTicket.status === 'FAILED' ? (
                    <div className="p-3 rounded-lg space-y-1.5" style={{background:'rgba(127,29,29,0.15)', border:'1px solid rgba(239,68,68,0.2)'}}>
                      <div className="flex items-center gap-1.5 text-red-400 font-semibold text-[11px]">
                        <AlertCircle size={13} /> Diagnostic Verdict
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {selectedTicket.id === 'JSM-442'
                          ? 'SILENT HALLUCINATION: Agent returned "200 OK" but the FAQ generated instructs users to store credit card CVV inside SAML metadata — a critical PCI violation undetected without AERO.'
                          : 'SILENT FAILURE: Agent classified ticket under general FAQ but missed active security/auth exposures, completing without flagging for manual review.'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg space-y-1" style={{background:'rgba(6,78,59,0.1)', border:'1px solid rgba(16,185,129,0.15)'}}>
                      <div className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                        <ShieldCheck size={13} /> Diagnostic Verdict
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        PASS: Agent accurately analyzed the ticket, queried OKTA templates, and published safe FAQ content without compliance gaps.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={() => onTriggerLiveMock(selectedTicket.id)}
                disabled={isProcessing} id={`btn-diagnose-${selectedTicket.id}`}
                className="w-full py-2 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow:'0 4px 16px rgba(109,40,217,0.3)'}}>
                {isProcessing
                  ? <><RefreshCw size={12} className="animate-spin" /> Recording...</>
                  : <><Eye size={12} /> Send to Flight Recorder &amp; Diagnose</>}
              </button>
            </div>
          ) : (
            <div className="flex-1 rounded-xl p-5 flex items-center justify-center" style={{background:'rgba(15,23,42,0.85)', border:'1px solid rgba(30,41,59,0.9)'}}>
              <p className="text-xs text-slate-600 italic text-center">Select a tile on the matrix to audit details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}