import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { TrendingDown, AlertTriangle, HelpCircle, CheckCircle, ListFilter, Calendar } from 'lucide-react';
import { DriftDataPoint } from '../types';

interface DriftMonitorProps {
  driftData: DriftDataPoint[];
}

export default function DriftMonitor({ driftData }: DriftMonitorProps) {
  const [selectedPoint, setSelectedPoint] = useState<DriftDataPoint | null>(driftData[18] || driftData[15]); // Default to a standard run

  // Format Recharts tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-xl text-left font-sans text-xs">
          <p className="font-bold text-white mb-1">Run #{data.runIndex} ({data.runId})</p>
          <p className="text-violet-400">Cohesion: <span className="font-mono font-bold">{data.cohesionScore}</span></p>
          <p className="text-amber-400">Word Count: <span className="font-mono font-bold">{data.wordCount} words</span></p>
          <p className="text-slate-500 text-[10px] mt-1 italic">{data.model}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6" id="scen-b-container">
      {/* Introduction Banner with automatic Alert indicator */}
      <div className="p-5 bg-[#0f172a] border border-slate-800 rounded-xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                SCENARIO B MONITORS
              </span>
              <h2 className="text-xl font-serif text-white flex items-center gap-2">
                <TrendingDown className="text-amber-400" size={20} /> Continuous <span className="italic">Drift Monitor</span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              Model updates introduce quiet semantic regressions. Following the <strong>v3.2 Model Update</strong>, the Confluence Agent average output bloated from <strong>82 words</strong> to over <strong>214 words</strong>, and the Cohesion Index fell from <strong>0.87</strong> to <strong>0.53</strong>.
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold leading-none animate-pulse">
            <AlertTriangle size={14} /> HIGH DRIFT ALERT DECLARED
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recharts graph panel (takes 7 columns) */}
        <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-serif text-slate-200">
              Cohesion degradation vs. Word Count bloat (Chronological runs 10 to 51)
            </h3>
            <p className="text-[10px] text-slate-500">
              Double-axis graph tracing stability profiles. Click on individual line data points to see text-diff profiles in the comparative inspector.
            </p>
          </div>

          <div className="w-full h-[280px]" id="drift-recharts-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={driftData}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length) {
                    setSelectedPoint(state.activePayload[0].payload);
                  }
                }}
                margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="runIndex" 
                  stroke="#64748b" 
                  tickLine={false}
                  fontSize={10} 
                  label={{ value: 'Execution Runs (Time series)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
                />
                
                {/* Left YAxis - Cohesion */}
                <YAxis 
                  yAxisId="left" 
                  domain={[0.3, 1.0]} 
                  stroke="#8b5cf6" 
                  tickLine={false}
                  fontSize={10} 
                  label={{ value: 'Cohesion Score', angle: -90, position: 'insideLeft', offset: 10, fill: '#8b5cf6', fontSize: 10 }}
                />
                
                {/* Right YAxis - Word count */}
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[50, 260]} 
                  stroke="#f59e0b" 
                  tickLine={false}
                  fontSize={10} 
                  label={{ value: 'Word Count', angle: 90, position: 'insideRight', offset: 10, fill: '#f59e0b', fontSize: 10 }}
                />
                
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} fontSize={10} wrapperStyle={{ fontSize: 10, color: '#64748b' }} />
                
                {/* Reference line showing update point */}
                <ReferenceLine 
                  yAxisId="left" 
                  x={30} 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: 'v3.2 Update', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }} 
                />
                
                {/* Line 1: Cohesion */}
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="cohesionScore" 
                  name="Cohesion Index" 
                  stroke="#8b5cf6" 
                  strokeWidth={2} 
                  dot={(props: any) => {
                    const isSelected = selectedPoint && selectedPoint.runIndex === props.payload.runIndex;
                    return (
                      <circle 
                        cx={props.cx} 
                        cy={props.cy} 
                        r={isSelected ? 6 : (props.payload.runIndex === 30 ? 5 : 2)} 
                        fill={isSelected ? '#d946ef' : (props.payload.runIndex === 30 ? '#ef4444' : '#8b5cf6')} 
                        stroke="none"
                      />
                    );
                  }}
                  activeDot={{ r: 7 }} 
                />
                
                {/* Line 2: Word Count */}
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="wordCount" 
                  name="Word Count (Size)" 
                  stroke="#f59e0b" 
                  strokeWidth={1.5} 
                  dot={false}
                  activeDot={{ r: 5 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-1.5 p-3 bg-slate-950 border border-slate-900 rounded-lg text-slate-400 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span><strong>Model v3.2 Update (At Run index 30):</strong> Triggered a drastic word count inflation and progressive decay of semantic precision due to template overload.</span>
          </div>
        </div>

        {/* Before/After Semantic Diff Comparer (takes 5 columns) */}
        <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4" id="drift-comparer-panel">
          <div>
            <h3 className="text-sm font-serif text-slate-200 flex items-center gap-1.5">
              <Calendar size={14} className="text-violet-400" /> In-Context Comparison <span className="italic">Sandbox</span>
            </h3>
            <p className="text-[10px] text-slate-500">
              Compare output differences between runs. Run 22 serves as the solid base reference.
            </p>
          </div>

          {/* Quick preset selector */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                const pt = driftData.find(d => d.runIndex === 22) || driftData[12];
                if (pt) setSelectedPoint(pt);
              }}
              className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                selectedPoint?.runIndex === 22 
                  ? 'bg-violet-600/10 border-violet-500 text-violet-300' 
                  : 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-400'
              }`}
            >
              <div className="font-bold flex items-center gap-1">
                <CheckCircle size={12} className="text-emerald-500" /> Reference Run #22
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">v3.1 Base Model</div>
            </button>

            <button
              onClick={() => {
                const pt = driftData.find(d => d.runIndex === 43) || driftData[33];
                if (pt) setSelectedPoint(pt);
              }}
              className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                selectedPoint?.runIndex === 43 
                  ? 'bg-violet-600/10 border-violet-500 text-violet-300' 
                  : 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-400'
              }`}
            >
              <div className="font-bold flex items-center gap-1 text-red-400">
                <AlertTriangle size={12} /> Degraded Run #43
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">v3.2 Bloated Model</div>
            </button>
          </div>

          {/* Dynamic Inspector Frame */}
          {selectedPoint && (
            <div className="p-4 bg-slate-950 border border-slate-900 rounded-lg space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-900 pb-1.5 text-slate-500">
                  <span>Selected Run #{selectedPoint.runIndex} ({selectedPoint.runId})</span>
                  <span>{selectedPoint.model.split(' ')[0]}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center pb-2 border-b border-slate-900/60">
                  <div className="bg-slate-900/80 p-1.5 rounded">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Metrics Cohesion</div>
                    <div className={`text-sm font-extrabold font-mono mt-0.5 ${selectedPoint.cohesionScore >= 0.70 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {selectedPoint.cohesionScore}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Metric Output Size</div>
                    <div className={`text-sm font-extrabold font-mono mt-0.5 ${selectedPoint.wordCount < 120 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedPoint.wordCount} words
                    </div>
                  </div>
                </div>

                {/* Compare text outputs */}
                <div className="text-xs space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  <div className="font-bold text-slate-300">Generated Confluence FAQ Text:</div>
                  
                  {selectedPoint.runIndex < 30 ? (
                    <div className="text-slate-400 leading-relaxed font-sans space-y-2">
                      <p className="font-bold text-white bg-slate-900 px-1 py-0.5 rounded text-[10px] inline-block">✅ Secure SSO Resolution Page:</p>
                      <p><strong>Title: Resolving Corporate SSO token expiration</strong></p>
                      <p>Ensure SAML bound elements route appropriately. Navigate to Okta verify portal to refresh verification keys. If blocks relate to lapsed corporate subscriptions, instruct users to notify accounts payable securely.</p>
                    </div>
                  ) : (
                    <div className="text-slate-400 leading-relaxed font-sans space-y-2 text-[11px]">
                      <p className="font-bold text-red-400 bg-red-950/20 border border-red-900/40 px-1 py-0.5 rounded text-[10px] inline-block">❌ Bloated/Hallucinated Output (Drifted):</p>
                      <p><strong>Title: General troubleshooting SSO blocked error authentication invoice mismatch card failure configuration</strong></p>
                      <p className="border-l-2 border-amber-500 pl-2 italic bg-amber-500/5 py-1 text-slate-300">
                        "Notice: To pay billing invoice subscription lapse card renewal immediately, insert verification card credit token CVV directly inside SAML security headers parameter elements."
                      </p>
                      <p>Additionally, review 14 administrative guidelines including VPN configuration, Confluence page caches, workflow transitions, mandatory peer approvals, new provisioning cleared members...</p>
                      <p className="text-[9px] text-red-400/80 font-bold">⚠️ Security Scan Error: PCI variable Leak - CVV credentials crossed over into help guide parameters.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[9px] text-slate-500 text-center font-mono">
                Historical Run Captured: {selectedPoint.timestamp}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
